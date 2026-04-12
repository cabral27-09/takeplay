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

const CHUNK_SIZE = 5 * 1024 * 1024; // 5MB per chunk

export function UploadProvider({ children }: { children: React.ReactNode }) {
  const [state, setState] = useState<UploadState>(initialState);
  const cancelledRef = useRef(false);
  const pausedRef = useRef(false);
  const resumeResolverRef = useRef<(() => void) | null>(null);
  const lastProgressRef = useRef({ bytes: 0, time: Date.now() });
  const onCompleteRef = useRef<((filePath: string) => void) | null>(null);
  // Track current upload to allow cancel/pause
  const uploadIdRef = useRef<string | null>(null);

  const registerOnComplete = useCallback((cb: ((filePath: string) => void) | null) => {
    onCompleteRef.current = cb;
  }, []);

  const waitIfPaused = useCallback(() => {
    if (!pausedRef.current) return Promise.resolve();
    return new Promise<void>((resolve) => {
      resumeResolverRef.current = resolve;
    });
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
    const uploadId = `${Date.now()}-${Math.random().toString(36).substring(2)}`;
    uploadIdRef.current = uploadId;
    cancelledRef.current = false;
    pausedRef.current = false;

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

    const totalChunks = Math.ceil(file.size / CHUNK_SIZE);
    let uploadedBytes = 0;

    try {
      // Upload chunks sequentially
      for (let i = 0; i < totalChunks; i++) {
        // Check cancel
        if (cancelledRef.current) return;

        // Wait if paused
        await waitIfPaused();
        if (cancelledRef.current) return;

        const start = i * CHUNK_SIZE;
        const end = Math.min(start + CHUNK_SIZE, file.size);
        const chunk = file.slice(start, end);

        const formData = new FormData();
        formData.append('upload_id', uploadId);
        formData.append('chunk_index', String(i));
        formData.append('total_chunks', String(totalChunks));
        formData.append('chunk', chunk, `chunk_${i}.bin`);

        // Retry logic for each chunk
        let attempts = 0;
        const maxAttempts = 3;
        let success = false;

        while (attempts < maxAttempts && !success) {
          if (cancelledRef.current) return;
          attempts++;

          try {
            const { data, error } = await supabase.functions.invoke('upload-video-chunk', {
              body: formData,
            });

            if (error) {
              throw new Error(error.message || 'Erro no upload do chunk');
            }

            if (data?.error) {
              throw new Error(data.error);
            }

            success = true;
          } catch (err) {
            if (attempts >= maxAttempts) throw err;
            // Wait before retry
            await new Promise(r => setTimeout(r, 2000 * attempts));
          }
        }

        uploadedBytes += (end - start);
        const percentage = Math.round((uploadedBytes / file.size) * 100);

        // Speed calculation
        const now = Date.now();
        const timeDiff = (now - lastProgressRef.current.time) / 1000;
        let speedStr = '';
        if (timeDiff > 0.5) {
          const bytesDiff = uploadedBytes - lastProgressRef.current.bytes;
          const speed = bytesDiff / timeDiff;
          speedStr = speed >= 1024 * 1024
            ? `${(speed / (1024 * 1024)).toFixed(1)} MB/s`
            : `${(speed / 1024).toFixed(0)} KB/s`;
          lastProgressRef.current = { bytes: uploadedBytes, time: now };
        }

        setState(prev => ({
          ...prev,
          progress: Math.min(percentage, 99), // Reserve 100% for finalization
          ...(speedStr ? { speed: speedStr } : {}),
        }));
      }

      if (cancelledRef.current) return;

      // Finalize: call finalize-video-upload to assemble via S3 multipart
      setState(prev => ({ ...prev, speed: 'Finalizando...' }));

      const { data: finalData, error: finalError } = await supabase.functions.invoke('finalize-video-upload', {
        body: {
          upload_id: uploadId,
          total_chunks: totalChunks,
          final_path: filePath,
          content_type: file.type,
        },
      });

      if (finalError) {
        const errMsg = finalError.message || 'Erro na finalização';
        console.error('Finalize error details:', finalError);
        throw new Error(`Erro na finalização do vídeo: ${errMsg}`);
      }

      if (finalData?.error) {
        console.error('Finalize data error:', finalData.error);
        throw new Error(`Erro ao montar arquivo final: ${finalData.error}`);
      }

      setState(prev => ({ ...prev, status: 'completed', progress: 100, filePath }));
      toast({ title: 'Upload concluído', description: 'O vídeo foi enviado com sucesso.' });
      onCompleteRef.current?.(filePath);

    } catch (err: unknown) {
      if (cancelledRef.current) return;
      const message = err instanceof Error ? err.message : 'Erro desconhecido';
      console.error('Upload error:', err);
      setState(prev => ({ ...prev, status: 'error', error: message }));
      toast({ title: 'Erro no upload', description: message, variant: 'destructive' });
    }
  }, [waitIfPaused]);

  const pauseUpload = useCallback(() => {
    pausedRef.current = true;
    setState(prev => ({ ...prev, status: 'paused' }));
    toast({ title: 'Upload pausado' });
  }, []);

  const resumeUpload = useCallback(() => {
    pausedRef.current = false;
    resumeResolverRef.current?.();
    resumeResolverRef.current = null;
    setState(prev => ({ ...prev, status: 'uploading' }));
    toast({ title: 'Upload retomado' });
  }, []);

  const cancelUpload = useCallback(() => {
    cancelledRef.current = true;
    pausedRef.current = false;
    resumeResolverRef.current?.();
    resumeResolverRef.current = null;
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
