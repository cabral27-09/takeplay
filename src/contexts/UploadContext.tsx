import React, { createContext, useContext, useState, useRef, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';
import * as tus from 'tus-js-client';

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

const PROJECT_REF = import.meta.env.VITE_SUPABASE_PROJECT_ID;
const TUS_ENDPOINT = `https://${PROJECT_REF}.storage.supabase.co/storage/v1/upload/resumable`;
const CHUNK_SIZE = 6 * 1024 * 1024; // 6MB - obrigatório pelo Supabase TUS

console.log('[Upload] TUS endpoint:', TUS_ENDPOINT, '| chunk:', CHUNK_SIZE);

export function UploadProvider({ children }: { children: React.ReactNode }) {
  const [state, setState] = useState<UploadState>(initialState);
  const onCompleteRef = useRef<((filePath: string) => void) | null>(null);
  const tusUploadRef = useRef<tus.Upload | null>(null);
  const lastProgressRef = useRef({ bytes: 0, time: Date.now() });
  const filePathRef = useRef<string | null>(null);

  const registerOnComplete = useCallback((cb: ((filePath: string) => void) | null) => {
    onCompleteRef.current = cb;
  }, []);

  const startUpload = useCallback(async (file: File, onComplete?: (filePath: string) => void) => {
    const validTypes = ['video/mp4', 'video/webm', 'video/quicktime'];
    if (!validTypes.includes(file.type)) {
      toast({ title: 'Formato inválido', description: 'Use MP4, WebM ou MOV.', variant: 'destructive' });
      return;
    }
    const maxSize = 5 * 1024 * 1024 * 1024; // 5GB for TUS
    if (file.size > maxSize) {
      toast({ title: 'Arquivo muito grande', description: 'O limite máximo é 5GB.', variant: 'destructive' });
      return;
    }

    // Força refresh do token antes de iniciar para garantir JWT fresco na criação do upload
    await supabase.auth.refreshSession();
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) {
      toast({ title: 'Não autenticado', description: 'Faça login para enviar vídeos.', variant: 'destructive' });
      return;
    }

    if (onComplete) {
      onCompleteRef.current = onComplete;
    }

    const fileExt = file.name.split('.').pop();
    const filePath = `movies/${Date.now()}-${Math.random().toString(36).substring(2)}.${fileExt}`;
    filePathRef.current = filePath;

    setState({
      status: 'uploading',
      fileName: file.name,
      fileSize: file.size,
      progress: 0,
      speed: 'Iniciando upload...',
      error: null,
      filePath: null,
    });
    lastProgressRef.current = { bytes: 0, time: Date.now() };

    const upload = new tus.Upload(file, {
      endpoint: TUS_ENDPOINT,
      retryDelays: [0, 3000, 6000, 12000, 24000],
      chunkSize: CHUNK_SIZE,
      uploadDataDuringCreation: true,
      removeFingerprintOnSuccess: true,
      headers: {
        'x-upsert': 'true',
      },
      metadata: {
        bucketName: 'videos',
        objectName: filePath,
        contentType: file.type,
        cacheControl: '3600',
      },
      onBeforeRequest: async (req) => {
        const { data: { session: freshSession } } = await supabase.auth.getSession();
        const token = freshSession?.access_token;
        if (token) {
          req.setHeader('Authorization', `Bearer ${token}`);
          req.setHeader('apikey', import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY);
          console.log('[TUS] req', req.getMethod(), req.getURL(), 'jwt:', token.slice(0, 20) + '...');
        } else {
          console.warn('[TUS] no session token available for request');
        }
      },
      onProgress: (bytesUploaded: number, bytesTotal: number) => {
        const percentage = Math.round((bytesUploaded / bytesTotal) * 100);
        const now = Date.now();
        const timeDiff = (now - lastProgressRef.current.time) / 1000;
        let speedStr = '';

        if (timeDiff > 0.5) {
          const bytesDiff = bytesUploaded - lastProgressRef.current.bytes;
          const speed = bytesDiff / timeDiff;
          speedStr = speed >= 1024 * 1024
            ? `${(speed / (1024 * 1024)).toFixed(1)} MB/s`
            : `${(speed / 1024).toFixed(0)} KB/s`;
          lastProgressRef.current = { bytes: bytesUploaded, time: now };
        }

        setState(prev => ({
          ...prev,
          progress: Math.min(percentage, 99),
          ...(speedStr ? { speed: speedStr } : {}),
        }));
      },
      onSuccess: () => {
        console.log(`TUS upload completed: ${filePath}, size: ${file.size}`);
        tusUploadRef.current = null;
        setState(prev => ({ ...prev, status: 'completed', progress: 100, filePath }));
        toast({ title: 'Upload concluído', description: 'O vídeo foi enviado com sucesso.' });
        onCompleteRef.current?.(filePath);
      },
      onError: (error: Error) => {
        console.error('TUS upload error:', error);
        tusUploadRef.current = null;
        const message = error.message || 'Erro desconhecido no upload';
        setState(prev => ({ ...prev, status: 'error', error: message }));
        toast({ title: 'Erro no upload', description: message, variant: 'destructive' });
      },
    });

    tusUploadRef.current = upload;

    // NÃO retomar uploads anteriores — fingerprints antigos restauram URLs com JWT expirado
    // causando "Invalid Compact JWS". Sempre criar upload novo.
    upload.start();
  }, []);

  const pauseUpload = useCallback(() => {
    if (tusUploadRef.current) {
      tusUploadRef.current.abort();
      setState(prev => ({ ...prev, status: 'paused' }));
      toast({ title: 'Upload pausado' });
    }
  }, []);

  const resumeUpload = useCallback(() => {
    if (tusUploadRef.current) {
      tusUploadRef.current.start();
      setState(prev => ({ ...prev, status: 'uploading' }));
      toast({ title: 'Upload retomado' });
    }
  }, []);

  const cancelUpload = useCallback(() => {
    if (tusUploadRef.current) {
      tusUploadRef.current.abort();
      tusUploadRef.current = null;
    }
    onCompleteRef.current = null;
    filePathRef.current = null;
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
