import React, { createContext, useContext, useState, useRef, useCallback } from 'react';
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
const BUCKET = 'videos';
const CHUNK_SIZE = 6 * 1024 * 1024; // 6MB (exigido pelo TUS do Storage)

function makeKey(file: File) {
  const ext = (file.name.split('.').pop() || 'mp4').toLowerCase();
  return `movies/${Date.now()}-${Math.random().toString(36).substring(2, 10)}.${ext}`;
}

export function UploadProvider({ children }: { children: React.ReactNode }) {
  const [state, setState] = useState<UploadState>(initialState);
  const onCompleteRef = useRef<((filePath: string) => void) | null>(null);

  const tusRef = useRef<tus.Upload | null>(null);
  const cancelledRef = useRef<boolean>(false);
  const lastProgressRef = useRef({ bytes: 0, time: Date.now() });

  const registerOnComplete = useCallback((cb: ((filePath: string) => void) | null) => {
    onCompleteRef.current = cb;
  }, []);

  const startUpload = useCallback(async (file: File, onComplete?: (filePath: string) => void) => {
    const validTypes = ['video/mp4', 'video/webm', 'video/quicktime'];
    if (!validTypes.includes(file.type)) {
      toast({ title: 'Formato inválido', description: 'Use MP4, WebM ou MOV.', variant: 'destructive' });
      return;
    }
    const maxSize = 6 * 1024 * 1024 * 1024; // 6GB
    if (file.size > maxSize) {
      toast({ title: 'Arquivo muito grande', description: 'O limite máximo é 6GB.', variant: 'destructive' });
      return;
    }

    await supabase.auth.refreshSession();
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) {
      toast({ title: 'Não autenticado', description: 'Faça login para enviar vídeos.', variant: 'destructive' });
      return;
    }

    if (onComplete) onCompleteRef.current = onComplete;

    cancelledRef.current = false;
    lastProgressRef.current = { bytes: 0, time: Date.now() };

    const key = makeKey(file);

    setState({
      status: 'uploading',
      fileName: file.name,
      fileSize: file.size,
      progress: 0,
      speed: 'Iniciando upload...',
      error: null,
      filePath: null,
    });

    try {
      await new Promise<void>((resolve, reject) => {
        const upload = new tus.Upload(file, {
          endpoint: `${SUPABASE_URL}/storage/v1/upload/resumable`,
          retryDelays: [0, 3000, 5000, 10000, 20000],
          headers: {
            authorization: `Bearer ${session.access_token}`,
            'x-upsert': 'false',
            apikey: SUPABASE_PUBLISHABLE_KEY,
          },
          uploadDataDuringCreation: true,
          removeFingerprintOnSuccess: true,
          metadata: {
            bucketName: BUCKET,
            objectName: key,
            contentType: file.type || 'video/mp4',
            cacheControl: '3600',
          },
          chunkSize: CHUNK_SIZE,
          onError: (err) => reject(err),
          onProgress: (bytesUploaded, bytesTotal) => {
            const now = Date.now();
            const dt = (now - lastProgressRef.current.time) / 1000;
            let speedStr = '';
            if (dt > 0.5) {
              const db = bytesUploaded - lastProgressRef.current.bytes;
              const sp = db / dt;
              if (sp > 0) {
                speedStr = sp >= 1024 * 1024
                  ? `${(sp / (1024 * 1024)).toFixed(1)} MB/s`
                  : `${(sp / 1024).toFixed(0)} KB/s`;
              }
              lastProgressRef.current = { bytes: bytesUploaded, time: now };
            }
            const pct = Math.min(99, Math.round((bytesUploaded / bytesTotal) * 100));
            setState((prev) => ({
              ...prev,
              progress: pct,
              ...(speedStr ? { speed: speedStr } : {}),
            }));
          },
          onSuccess: () => resolve(),
        });

        tusRef.current = upload;
        upload.start();
      });

      if (cancelledRef.current) return;

      setState((prev) => ({
        ...prev,
        status: 'completed',
        progress: 100,
        filePath: key,
        speed: '',
      }));
      toast({ title: 'Upload concluído', description: 'O vídeo foi enviado com sucesso.' });
      onCompleteRef.current?.(key);
    } catch (e: any) {
      if (cancelledRef.current) return;
      console.error('[Upload] erro', e);
      const raw = e?.message || e?.originalResponse?.getBody?.() || e?.name || 'Erro desconhecido no upload';
      let message = String(raw);
      if (/403|AccessDenied|Forbidden/i.test(message)) {
        message = 'Sem permissão para enviar vídeos. Verifique se sua conta tem papel de admin ou produtor.';
      } else if (/401|Unauthorized|jwt|token/i.test(message)) {
        message = 'Sessão expirada. Faça login novamente e tente outra vez.';
      } else if (/NetworkError|Failed to fetch|network/i.test(message)) {
        message = 'Falha de rede durante o upload. Verifique sua conexão e tente novamente.';
      }
      setState((prev) => ({ ...prev, status: 'error', error: message, speed: '' }));
      toast({ title: 'Erro no upload', description: message, variant: 'destructive' });
    } finally {
      tusRef.current = null;
    }
  }, []);

  const pauseUpload = useCallback(() => {
    const u = tusRef.current;
    if (u) {
      u.abort();
      setState((prev) => ({ ...prev, status: 'paused', speed: '' }));
    }
  }, []);

  const resumeUpload = useCallback(() => {
    const u = tusRef.current;
    if (u) {
      lastProgressRef.current = { bytes: 0, time: Date.now() };
      u.start();
      setState((prev) => ({ ...prev, status: 'uploading' }));
    }
  }, []);

  const cancelUpload = useCallback(() => {
    cancelledRef.current = true;
    const u = tusRef.current;
    if (u) {
      u.abort(true).catch(() => {});
    }
    tusRef.current = null;
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
