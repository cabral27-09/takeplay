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

const SUPABASE_PROJECT_ID = import.meta.env.VITE_SUPABASE_PROJECT_ID;
const TUS_ENDPOINT = `https://${SUPABASE_PROJECT_ID}.storage.supabase.co/storage/v1/upload/resumable`;

export function UploadProvider({ children }: { children: React.ReactNode }) {
  const [state, setState] = useState<UploadState>(initialState);
  const tusRef = useRef<tus.Upload | null>(null);
  const lastProgressRef = useRef({ bytes: 0, time: Date.now() });
  const onCompleteRef = useRef<((filePath: string) => void) | null>(null);

  const registerOnComplete = useCallback((cb: ((filePath: string) => void) | null) => {
    onCompleteRef.current = cb;
  }, []);

  const startUpload = useCallback(async (file: File, onComplete?: (filePath: string) => void) => {
    // Validate
    const validTypes = ['video/mp4', 'video/webm', 'video/quicktime'];
    if (!validTypes.includes(file.type)) {
      toast({ title: 'Formato inválido', description: 'Use MP4, WebM ou MOV.', variant: 'destructive' });
      return;
    }
    const maxSize = 6 * 1024 * 1024 * 1024;
    if (file.size > maxSize) {
      toast({ title: 'Arquivo muito grande', description: 'O limite máximo é 6GB.', variant: 'destructive' });
      return;
    }

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

    setState({
      status: 'uploading',
      fileName: file.name,
      fileSize: file.size,
      progress: 0,
      speed: '',
      error: null,
      filePath: null,
    });
    lastProgressRef.current = { bytes: 0, time: Date.now() };

    const upload = new tus.Upload(file, {
      endpoint: TUS_ENDPOINT,
      retryDelays: [0, 3000, 5000, 10000, 20000],
      headers: {
        authorization: `Bearer ${session.access_token}`,
        'x-upsert': 'true',
      },
      uploadDataDuringCreation: true,
      removeFingerprintOnSuccess: true,
      metadata: {
        bucketName: 'videos',
        objectName: filePath,
        contentType: file.type,
        cacheControl: '3600',
      },
      chunkSize: 6 * 1024 * 1024,
      onError: (err) => {
        console.error('TUS upload error:', err);
        setState(prev => ({ ...prev, status: 'error', error: err.message || 'Erro no upload' }));
        toast({ title: 'Erro no upload', description: err.message || 'Erro desconhecido', variant: 'destructive' });
      },
      onProgress: (bytesUploaded, bytesTotal) => {
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
          progress: percentage,
          ...(speedStr ? { speed: speedStr } : {}),
        }));
      },
      onSuccess: () => {
        setState(prev => ({ ...prev, status: 'completed', progress: 100, filePath }));
        toast({ title: 'Upload concluído', description: 'O vídeo foi enviado com sucesso.' });
        onCompleteRef.current?.(filePath);
      },
    });

    tusRef.current = upload;

    try {
      const previousUploads = await upload.findPreviousUploads();
      if (previousUploads.length > 0) {
        upload.resumeFromPreviousUpload(previousUploads[0]);
        toast({ title: 'Upload retomado', description: 'Continuando upload anterior...' });
      }
    } catch {
      // No previous uploads
    }

    upload.start();
  }, []);

  const pauseUpload = useCallback(() => {
    tusRef.current?.abort();
    setState(prev => ({ ...prev, status: 'paused' }));
    toast({ title: 'Upload pausado' });
  }, []);

  const resumeUpload = useCallback(() => {
    tusRef.current?.start();
    setState(prev => ({ ...prev, status: 'uploading' }));
    toast({ title: 'Upload retomado' });
  }, []);

  const cancelUpload = useCallback(() => {
    tusRef.current?.abort();
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
