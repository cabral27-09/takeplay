import React, { createContext, useCallback, useContext, useRef, useState } from 'react';
import * as tus from 'tus-js-client';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';

export type UploadStatus = 'idle' | 'uploading' | 'paused' | 'completed' | 'error';

interface UploadState {
  status: UploadStatus;
  fileName: string;
  fileSize: number;
  progress: number;
  speed: string;
  error: string | null;
  filePath: string | null;
}

interface UploadContextType {
  upload: UploadState;
  startUpload: (file: File, onComplete?: (filePath: string) => void) => Promise<void>;
  pauseUpload: () => void;
  resumeUpload: () => void;
  cancelUpload: () => void;
  registerOnComplete: (cb: ((filePath: string) => void) | null) => void;
}

const initialState: UploadState = {
  status: 'idle',
  fileName: '',
  fileSize: 0,
  progress: 0,
  speed: '',
  error: null,
  filePath: null,
};

const UploadContext = createContext<UploadContextType | null>(null);

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL as string;
const SUPABASE_PUBLISHABLE_KEY = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY as string;
const MAX_FILE_SIZE = 6 * 1024 * 1024 * 1024; // 6GB
const CHUNK_SIZE = 6 * 1024 * 1024; // 6MB — exigido pelo endpoint TUS do Supabase

const validTypes = new Set([
  'video/mp4',
  'video/webm',
  'video/quicktime',
  'video/x-msvideo',
  'video/mpeg',
  'video/x-matroska',
]);

function formatSpeed(bytesPerSecond: number) {
  if (bytesPerSecond >= 1024 * 1024) return `${(bytesPerSecond / (1024 * 1024)).toFixed(1)} MB/s`;
  return `${Math.max(1, Math.round(bytesPerSecond / 1024))} KB/s`;
}

function translateError(raw: string): string {
  if (/413|Payload Too Large|Maximum size/i.test(raw)) {
    return 'O arquivo excede o limite permitido.';
  }
  if (/403|AccessDenied|Forbidden|row-level security/i.test(raw)) {
    return 'Sem permissão para enviar vídeos. Verifique se sua conta tem papel de admin ou produtor.';
  }
  if (/401|Unauthorized|jwt|token/i.test(raw)) {
    return 'Sessão expirada. Faça login novamente e tente outra vez.';
  }
  if (/NetworkError|Failed to fetch|network|ECONN|ETIMEDOUT/i.test(raw)) {
    return 'Falha de rede durante o upload. Verifique sua conexão e tente novamente.';
  }
  return raw || 'Erro desconhecido no upload';
}

export function UploadProvider({ children }: { children: React.ReactNode }) {
  const [state, setState] = useState<UploadState>(initialState);
  const onCompleteRef = useRef<((filePath: string) => void) | null>(null);
  const uploadRef = useRef<tus.Upload | null>(null);
  const lastProgressRef = useRef({ bytes: 0, time: Date.now() });

  const registerOnComplete = useCallback((cb: ((filePath: string) => void) | null) => {
    onCompleteRef.current = cb;
  }, []);

  const startUpload = useCallback(async (file: File, onComplete?: (filePath: string) => void) => {
    const normalizedType = file.type || 'video/mp4';
    if (!validTypes.has(normalizedType)) {
      toast({ title: 'Formato inválido', description: 'Use MP4, WebM, MOV, AVI, MPEG ou MKV.', variant: 'destructive' });
      return;
    }
    if (file.size > MAX_FILE_SIZE) {
      toast({ title: 'Arquivo muito grande', description: 'O limite máximo é 6GB.', variant: 'destructive' });
      return;
    }

    await supabase.auth.refreshSession();
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) {
      toast({ title: 'Não autenticado', description: 'Faça login para enviar vídeos.', variant: 'destructive' });
      return;
    }

    // Get external storage config (URL + anon key for the manivela_filmes project)
    let extUrl = '';
    let extKey = '';
    let bucketName = 'manivela_filmes';
    try {
      const { data, error } = await supabase.functions.invoke('get-upload-config');
      if (error || !data?.url || !data?.anonKey) throw error || new Error('config inválida');
      extUrl = String(data.url).replace(/\/+$/, '');
      extKey = String(data.anonKey);
      bucketName = String(data.bucket || 'manivela_filmes');
    } catch (e) {
      console.error('[Upload] get-upload-config falhou', e);
      toast({ title: 'Configuração indisponível', description: 'Não foi possível obter as credenciais de upload.', variant: 'destructive' });
      return;
    }

    if (onComplete) onCompleteRef.current = onComplete;

    const ext = (file.name.split('.').pop() || 'mp4').toLowerCase();
    const rand = (crypto?.randomUUID?.() || `${Math.random().toString(36).slice(2)}`).replace(/-/g, '');
    const objectName = `movies/${Date.now()}-${rand}.${ext}`;

    lastProgressRef.current = { bytes: 0, time: Date.now() };

    setState({
      status: 'uploading',
      fileName: file.name,
      fileSize: file.size,
      progress: 0,
      speed: 'Iniciando upload...',
      error: null,
      filePath: null,
    });


    const tusUpload = new tus.Upload(file, {
      endpoint: `${extUrl}/storage/v1/upload/resumable`,
      retryDelays: [0, 1000, 3000, 5000, 10000],
      headers: {
        authorization: `Bearer ${extKey}`,
        apikey: extKey,
        'x-upsert': 'true',
      },
      uploadDataDuringCreation: true,
      removeFingerprintOnSuccess: true,
      metadata: {
        bucketName,
        objectName,
        contentType: normalizedType,
        cacheControl: '3600',
      },
      chunkSize: CHUNK_SIZE,
      onError: (error) => {
        const message = translateError(String((error as any)?.message || error));
        console.error('[Upload TUS] erro', error);
        setState((prev) => ({ ...prev, status: 'error', error: message, speed: '' }));
        toast({ title: 'Erro no upload', description: message, variant: 'destructive' });
        uploadRef.current = null;
      },
      onProgress: (bytesUploaded, bytesTotal) => {
        const now = Date.now();
        const elapsed = Math.max(0.1, (now - lastProgressRef.current.time) / 1000);
        const speed = formatSpeed((bytesUploaded - lastProgressRef.current.bytes) / elapsed);
        lastProgressRef.current = { bytes: bytesUploaded, time: now };
        setState((prev) => ({
          ...prev,
          progress: Math.min(99, Math.round((bytesUploaded / bytesTotal) * 100)),
          speed,
        }));
      },
      onSuccess: () => {
        setState((prev) => ({
          ...prev,
          status: 'completed',
          progress: 100,
          filePath: objectName,
          speed: '',
        }));
        toast({ title: 'Upload concluído', description: 'O vídeo foi enviado com sucesso.' });
        onCompleteRef.current?.(objectName);
        uploadRef.current = null;
      },
    });

    uploadRef.current = tusUpload;

    // Tenta retomar de uploads anteriores (mesmo arquivo) — TUS guarda fingerprint no localStorage
    try {
      const previousUploads = await tusUpload.findPreviousUploads();
      if (previousUploads.length > 0) {
        tusUpload.resumeFromPreviousUpload(previousUploads[0]);
      }
    } catch (e) {
      console.warn('[Upload TUS] findPreviousUploads falhou', e);
    }

    tusUpload.start();
  }, []);

  const pauseUpload = useCallback(() => {
    if (!uploadRef.current) return;
    uploadRef.current.abort().catch(() => {});
    setState((prev) => (prev.status === 'uploading' ? { ...prev, status: 'paused', speed: '' } : prev));
  }, []);

  const resumeUpload = useCallback(() => {
    if (!uploadRef.current) return;
    lastProgressRef.current = { bytes: lastProgressRef.current.bytes, time: Date.now() };
    setState((prev) => (prev.status === 'paused' ? { ...prev, status: 'uploading', speed: 'Retomando upload...' } : prev));
    uploadRef.current.start();
  }, []);

  const cancelUpload = useCallback(() => {
    const current = uploadRef.current;
    uploadRef.current = null;
    if (current) {
      // true = também apaga o upload incompleto no servidor
      current.abort(true).catch(() => {});
    }
    onCompleteRef.current = null;
    setState(initialState);
    toast({ title: 'Upload cancelado' });
  }, []);

  return (
    <UploadContext.Provider value={{ upload: state, startUpload, pauseUpload, resumeUpload, cancelUpload, registerOnComplete }}>
      {children}
    </UploadContext.Provider>
  );
}

export function useUpload() {
  const ctx = useContext(UploadContext);
  if (!ctx) throw new Error('useUpload must be used within UploadProvider');
  return ctx;
}
