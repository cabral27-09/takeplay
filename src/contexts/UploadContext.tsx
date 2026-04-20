import React, { createContext, useContext, useState, useRef, useCallback } from 'react';
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

const CHUNK_SIZE = 5 * 1024 * 1024; // 5MB por chunk
const MAX_RETRIES = 4;

function makeUploadId() {
  return `${Date.now()}-${Math.random().toString(36).substring(2, 10)}`;
}

async function sleep(ms: number) {
  return new Promise((r) => setTimeout(r, ms));
}

export function UploadProvider({ children }: { children: React.ReactNode }) {
  const [state, setState] = useState<UploadState>(initialState);
  const onCompleteRef = useRef<((filePath: string) => void) | null>(null);

  // Controle do loop de upload
  const fileRef = useRef<File | null>(null);
  const uploadIdRef = useRef<string | null>(null);
  const nextChunkRef = useRef<number>(0);
  const totalChunksRef = useRef<number>(0);
  const pausedRef = useRef<boolean>(false);
  const cancelledRef = useRef<boolean>(false);
  const runningRef = useRef<boolean>(false);
  const lastProgressRef = useRef({ bytes: 0, time: Date.now() });

  const registerOnComplete = useCallback((cb: ((filePath: string) => void) | null) => {
    onCompleteRef.current = cb;
  }, []);

  const runLoop = useCallback(async () => {
    if (runningRef.current) return;
    runningRef.current = true;

    const file = fileRef.current!;
    const uploadId = uploadIdRef.current!;
    const totalChunks = totalChunksRef.current;

    try {
      while (nextChunkRef.current < totalChunks) {
        if (pausedRef.current || cancelledRef.current) break;

        const i = nextChunkRef.current;
        const start = i * CHUNK_SIZE;
        const end = Math.min(start + CHUNK_SIZE, file.size);
        const blob = file.slice(start, end);

        const form = new FormData();
        form.append('uploadId', uploadId);
        form.append('chunkIndex', String(i));
        form.append('totalChunks', String(totalChunks));
        form.append('chunk', blob, `${i}.part`);

        let attempt = 0;
        let lastErr: any = null;
        while (attempt <= MAX_RETRIES) {
          if (cancelledRef.current) break;
          const { data, error } = await supabase.functions.invoke('upload-video-chunk', {
            body: form,
          });
          if (!error && data?.ok) {
            lastErr = null;
            break;
          }
          lastErr = error || new Error(data?.error || 'Falha no chunk');
          attempt++;
          if (attempt > MAX_RETRIES) break;
          await sleep(1000 * attempt);
        }

        if (cancelledRef.current) break;
        if (lastErr) throw lastErr;

        nextChunkRef.current = i + 1;

        // Progresso e velocidade
        const bytesUploaded = Math.min((i + 1) * CHUNK_SIZE, file.size);
        const now = Date.now();
        const dt = (now - lastProgressRef.current.time) / 1000;
        let speedStr = '';
        if (dt > 0.5) {
          const db = bytesUploaded - lastProgressRef.current.bytes;
          const sp = db / dt;
          speedStr = sp >= 1024 * 1024
            ? `${(sp / (1024 * 1024)).toFixed(1)} MB/s`
            : `${(sp / 1024).toFixed(0)} KB/s`;
          lastProgressRef.current = { bytes: bytesUploaded, time: now };
        }
        const pct = Math.min(99, Math.round((bytesUploaded / file.size) * 100));
        setState((prev) => ({
          ...prev,
          progress: pct,
          ...(speedStr ? { speed: speedStr } : {}),
        }));
      }

      if (cancelledRef.current) {
        runningRef.current = false;
        return;
      }

      if (pausedRef.current) {
        runningRef.current = false;
        return;
      }

      // Finaliza
      setState((prev) => ({ ...prev, speed: 'Finalizando...' }));
      const { data, error } = await supabase.functions.invoke('finalize-video-upload', {
        body: {
          uploadId,
          totalChunks,
          fileName: file.name,
          contentType: file.type,
        },
      });

      if (error || !data?.filePath) {
        throw error || new Error(data?.error || 'Falha ao finalizar upload');
      }

      const filePath = data.filePath as string;
      setState((prev) => ({ ...prev, status: 'completed', progress: 100, filePath, speed: '' }));
      toast({ title: 'Upload concluído', description: 'O vídeo foi enviado com sucesso.' });
      onCompleteRef.current?.(filePath);
    } catch (e: any) {
      console.error('[Upload] erro', e);
      const raw = e?.message || 'Erro desconhecido no upload';
      let message = raw;
      if (/unauthorized|invalid token|jwt/i.test(raw)) {
        message = 'Sessão expirada. Faça login novamente e tente outra vez.';
      } else if (/forbidden/i.test(raw)) {
        message = 'Sem permissão para enviar vídeos.';
      } else if (/network|failed to fetch/i.test(raw)) {
        message = 'Falha de rede durante o upload. Verifique sua conexão.';
      } else if (/chunk/i.test(raw)) {
        message = 'Falha ao enviar parte do arquivo após várias tentativas.';
      } else if (/finaliz/i.test(raw)) {
        message = 'Falha ao finalizar o vídeo no servidor.';
      }
      setState((prev) => ({ ...prev, status: 'error', error: message, speed: '' }));
      toast({ title: 'Erro no upload', description: message, variant: 'destructive' });
    } finally {
      runningRef.current = false;
    }
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

    fileRef.current = file;
    uploadIdRef.current = makeUploadId();
    nextChunkRef.current = 0;
    totalChunksRef.current = Math.ceil(file.size / CHUNK_SIZE);
    pausedRef.current = false;
    cancelledRef.current = false;
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

    runLoop();
  }, [runLoop]);

  const pauseUpload = useCallback(() => {
    if (state.status !== 'uploading') return;
    pausedRef.current = true;
    setState((prev) => ({ ...prev, status: 'paused' }));
    toast({ title: 'Upload pausado' });
  }, [state.status]);

  const resumeUpload = useCallback(() => {
    if (state.status !== 'paused') return;
    pausedRef.current = false;
    setState((prev) => ({ ...prev, status: 'uploading' }));
    toast({ title: 'Upload retomado' });
    runLoop();
  }, [state.status, runLoop]);

  const cancelUpload = useCallback(() => {
    cancelledRef.current = true;
    pausedRef.current = false;
    const uploadId = uploadIdRef.current;
    // Limpeza no servidor (best effort)
    if (uploadId) {
      supabase.functions.invoke('finalize-video-upload', {
        body: { uploadId, abort: true },
      }).catch(() => {});
    }
    fileRef.current = null;
    uploadIdRef.current = null;
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
