import React, { createContext, useCallback, useContext, useRef, useState } from 'react';
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
const CHUNK_SIZE = 5 * 1024 * 1024; // 5MB por parte, sem TUS e abaixo do limite do backend
const MAX_RETRIES = 3;

const validTypes = new Set([
  'video/mp4',
  'video/webm',
  'video/quicktime',
  'video/x-msvideo',
  'video/mpeg',
  'video/x-matroska',
]);

function makeUploadId() {
  if (crypto?.randomUUID) return crypto.randomUUID().replace(/-/g, '');
  return `${Date.now()}${Math.random().toString(36).slice(2)}`;
}

function formatSpeed(bytesPerSecond: number) {
  if (bytesPerSecond >= 1024 * 1024) return `${(bytesPerSecond / (1024 * 1024)).toFixed(1)} MB/s`;
  return `${Math.max(1, Math.round(bytesPerSecond / 1024))} KB/s`;
}

async function responseError(response: Response) {
  const text = await response.text().catch(() => '');
  try {
    const json = JSON.parse(text);
    return json?.error || text || `HTTP ${response.status}`;
  } catch {
    return text || `HTTP ${response.status}`;
  }
}

export function UploadProvider({ children }: { children: React.ReactNode }) {
  const [state, setState] = useState<UploadState>(initialState);
  const onCompleteRef = useRef<((filePath: string) => void) | null>(null);
  const abortControllerRef = useRef<AbortController | null>(null);
  const cancelledRef = useRef(false);
  const pausedRef = useRef(false);
  const pauseResolverRef = useRef<(() => void) | null>(null);
  const activeUploadRef = useRef<{ uploadId: string; token: string } | null>(null);
  const lastProgressRef = useRef({ bytes: 0, time: Date.now() });

  const registerOnComplete = useCallback((cb: ((filePath: string) => void) | null) => {
    onCompleteRef.current = cb;
  }, []);

  const waitWhilePaused = useCallback(async () => {
    if (!pausedRef.current) return;
    await new Promise<void>((resolve) => {
      pauseResolverRef.current = resolve;
    });
  }, []);

  const invokeUploadChunk = useCallback(async (args: {
    file: File;
    uploadId: string;
    chunkIndex: number;
    token: string;
    signal: AbortSignal;
  }) => {
    const start = args.chunkIndex * CHUNK_SIZE;
    const end = Math.min(args.file.size, start + CHUNK_SIZE);
    const chunk = args.file.slice(start, end);
    const formData = new FormData();
    formData.append('uploadId', args.uploadId);
    formData.append('chunkIndex', String(args.chunkIndex));
    formData.append('chunk', chunk, `${String(args.chunkIndex).padStart(6, '0')}.part`);

    const response = await fetch(`${SUPABASE_URL}/functions/v1/upload-video-chunk`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${args.token}`,
        apikey: SUPABASE_PUBLISHABLE_KEY,
      },
      body: formData,
      signal: args.signal,
    });

    if (!response.ok) {
      throw new Error(await responseError(response));
    }

    return chunk.size;
  }, []);

  const invokeFinalize = useCallback(async (args: {
    uploadId: string;
    totalChunks: number;
    fileName: string;
    contentType: string;
    token: string;
    signal?: AbortSignal;
    abort?: boolean;
  }) => {
    const response = await fetch(`${SUPABASE_URL}/functions/v1/finalize-video-upload`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${args.token}`,
        apikey: SUPABASE_PUBLISHABLE_KEY,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        uploadId: args.uploadId,
        totalChunks: args.totalChunks,
        fileName: args.fileName,
        contentType: args.contentType,
        abort: args.abort,
      }),
      signal: args.signal,
    });

    if (!response.ok) {
      throw new Error(await responseError(response));
    }

    return response.json();
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

    if (onComplete) onCompleteRef.current = onComplete;

    const uploadId = makeUploadId();
    const totalChunks = Math.ceil(file.size / CHUNK_SIZE);
    let bytesUploaded = 0;
    let chunkIndex = 0;

    cancelledRef.current = false;
    pausedRef.current = false;
    pauseResolverRef.current = null;
    activeUploadRef.current = { uploadId, token: session.access_token };
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

    try {
      while (chunkIndex < totalChunks) {
        await waitWhilePaused();
        if (cancelledRef.current) return;

        let uploadedThisChunk = false;
        for (let attempt = 1; attempt <= MAX_RETRIES && !uploadedThisChunk; attempt += 1) {
          await waitWhilePaused();
          if (cancelledRef.current) return;

          const controller = new AbortController();
          abortControllerRef.current = controller;

          try {
            const chunkBytes = await invokeUploadChunk({
              file,
              uploadId,
              chunkIndex,
              token: session.access_token,
              signal: controller.signal,
            });

            bytesUploaded += chunkBytes;
            chunkIndex += 1;
            uploadedThisChunk = true;

            const now = Date.now();
            const elapsed = Math.max(0.1, (now - lastProgressRef.current.time) / 1000);
            const speed = formatSpeed((bytesUploaded - lastProgressRef.current.bytes) / elapsed);
            lastProgressRef.current = { bytes: bytesUploaded, time: now };

            setState((prev) => ({
              ...prev,
              progress: Math.min(99, Math.round((bytesUploaded / file.size) * 100)),
              speed,
            }));
          } catch (error: any) {
            if (cancelledRef.current) return;
            if (pausedRef.current && error?.name === 'AbortError') break;
            if (attempt === MAX_RETRIES) throw error;
            await new Promise((resolve) => window.setTimeout(resolve, 1000 * attempt));
          } finally {
            abortControllerRef.current = null;
          }
        }
      }

      if (cancelledRef.current) return;

      setState((prev) => ({ ...prev, progress: 99, speed: 'Finalizando vídeo...' }));
      const controller = new AbortController();
      abortControllerRef.current = controller;
      const result = await invokeFinalize({
        uploadId,
        totalChunks,
        fileName: file.name,
        contentType: normalizedType,
        token: session.access_token,
        signal: controller.signal,
      });

      if (cancelledRef.current) return;

      const filePath = result?.filePath;
      if (!filePath) throw new Error('Upload finalizado sem caminho do vídeo.');

      setState((prev) => ({
        ...prev,
        status: 'completed',
        progress: 100,
        filePath,
        speed: '',
      }));
      toast({ title: 'Upload concluído', description: 'O vídeo foi enviado com sucesso.' });
      onCompleteRef.current?.(filePath);
    } catch (e: any) {
      if (cancelledRef.current) return;
      console.error('[Upload] erro', e);
      let message = String(e?.message || e?.name || 'Erro desconhecido no upload');
      if (/413|Maximum size|Payload Too Large/i.test(message)) {
        message = 'Uma parte do vídeo foi recusada por tamanho. O upload agora usa partes menores; tente novamente.';
      } else if (/403|AccessDenied|Forbidden/i.test(message)) {
        message = 'Sem permissão para enviar vídeos. Verifique se sua conta tem papel de admin ou produtor.';
      } else if (/401|Unauthorized|jwt|token/i.test(message)) {
        message = 'Sessão expirada. Faça login novamente e tente outra vez.';
      } else if (/NetworkError|Failed to fetch|network|AbortError/i.test(message)) {
        message = 'Falha de rede durante o upload. Verifique sua conexão e tente novamente.';
      }
      setState((prev) => ({ ...prev, status: 'error', error: message, speed: '' }));
      toast({ title: 'Erro no upload', description: message, variant: 'destructive' });
    } finally {
      abortControllerRef.current = null;
      activeUploadRef.current = null;
    }
  }, [invokeFinalize, invokeUploadChunk, waitWhilePaused]);

  const pauseUpload = useCallback(() => {
    if (state.status !== 'uploading') return;
    pausedRef.current = true;
    abortControllerRef.current?.abort();
    setState((prev) => ({ ...prev, status: 'paused', speed: '' }));
  }, [state.status]);

  const resumeUpload = useCallback(() => {
    if (state.status !== 'paused') return;
    pausedRef.current = false;
    pauseResolverRef.current?.();
    pauseResolverRef.current = null;
    lastProgressRef.current = { bytes: lastProgressRef.current.bytes, time: Date.now() };
    setState((prev) => ({ ...prev, status: 'uploading', speed: 'Retomando upload...' }));
  }, [state.status]);

  const cancelUpload = useCallback(() => {
    cancelledRef.current = true;
    pausedRef.current = false;
    pauseResolverRef.current?.();
    pauseResolverRef.current = null;
    abortControllerRef.current?.abort();

    const activeUpload = activeUploadRef.current;
    if (activeUpload) {
      invokeFinalize({
        uploadId: activeUpload.uploadId,
        totalChunks: 0,
        fileName: '',
        contentType: 'video/mp4',
        token: activeUpload.token,
        abort: true,
      }).catch(() => {});
    }

    abortControllerRef.current = null;
    activeUploadRef.current = null;
    onCompleteRef.current = null;
    setState(initialState);
    toast({ title: 'Upload cancelado' });
  }, [invokeFinalize]);

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
