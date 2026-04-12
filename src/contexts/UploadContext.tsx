import React, { createContext, useContext, useState, useRef, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';
import { S3Client, CreateMultipartUploadCommand, UploadPartCommand, CompleteMultipartUploadCommand, AbortMultipartUploadCommand } from '@aws-sdk/client-s3';

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

const PART_SIZE = 10 * 1024 * 1024; // 10MB per part
const BUCKET = 'videos';
const PROJECT_REF = import.meta.env.VITE_SUPABASE_PROJECT_ID;
const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;
const ANON_KEY = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;

function createS3Client(accessToken: string) {
  return new S3Client({
    forcePathStyle: true,
    region: 'us-east-1',
    endpoint: `${SUPABASE_URL}/storage/v1/s3`,
    credentials: {
      accessKeyId: PROJECT_REF,
      secretAccessKey: ANON_KEY,
      sessionToken: accessToken,
    },
  });
}

export function UploadProvider({ children }: { children: React.ReactNode }) {
  const [state, setState] = useState<UploadState>(initialState);
  const cancelledRef = useRef(false);
  const pausedRef = useRef(false);
  const resumeResolverRef = useRef<(() => void) | null>(null);
  const lastProgressRef = useRef({ bytes: 0, time: Date.now() });
  const onCompleteRef = useRef<((filePath: string) => void) | null>(null);
  const s3UploadIdRef = useRef<string | null>(null);
  const s3ClientRef = useRef<S3Client | null>(null);
  const filePathRef = useRef<string | null>(null);

  const registerOnComplete = useCallback((cb: ((filePath: string) => void) | null) => {
    onCompleteRef.current = cb;
  }, []);

  const waitIfPaused = useCallback(() => {
    if (!pausedRef.current) return Promise.resolve();
    return new Promise<void>((resolve) => {
      resumeResolverRef.current = resolve;
    });
  }, []);

  const abortS3Upload = useCallback(async () => {
    if (s3UploadIdRef.current && s3ClientRef.current && filePathRef.current) {
      try {
        await s3ClientRef.current.send(new AbortMultipartUploadCommand({
          Bucket: BUCKET,
          Key: filePathRef.current,
          UploadId: s3UploadIdRef.current,
        }));
      } catch (e) {
        console.warn('Failed to abort S3 multipart upload:', e);
      }
    }
    s3UploadIdRef.current = null;
    s3ClientRef.current = null;
    filePathRef.current = null;
  }, []);

  const startUpload = useCallback(async (file: File, onComplete?: (filePath: string) => void) => {
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
    filePathRef.current = filePath;
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

    const s3 = createS3Client(session.access_token);
    s3ClientRef.current = s3;

    try {
      // 1. Initiate multipart upload
      setState(prev => ({ ...prev, speed: 'Iniciando upload...' }));
      const createRes = await s3.send(new CreateMultipartUploadCommand({
        Bucket: BUCKET,
        Key: filePath,
        ContentType: file.type,
      }));
      const uploadId = createRes.UploadId;
      if (!uploadId) throw new Error('Falha ao iniciar upload multipart');
      s3UploadIdRef.current = uploadId;
      console.log(`S3 multipart initiated: ${uploadId} for ${filePath}`);

      // 2. Upload parts
      const totalParts = Math.ceil(file.size / PART_SIZE);
      const parts: Array<{ PartNumber: number; ETag: string }> = [];
      let uploadedBytes = 0;

      for (let i = 0; i < totalParts; i++) {
        if (cancelledRef.current) { await abortS3Upload(); return; }
        await waitIfPaused();
        if (cancelledRef.current) { await abortS3Upload(); return; }

        // Refresh token if needed
        const { data: { session: freshSession } } = await supabase.auth.getSession();
        if (freshSession && freshSession.access_token !== session.access_token) {
          const newS3 = createS3Client(freshSession.access_token);
          s3ClientRef.current = newS3;
        }
        const currentS3 = s3ClientRef.current!;

        const start = i * PART_SIZE;
        const end = Math.min(start + PART_SIZE, file.size);
        const partNumber = i + 1;

        // Retry logic
        let attempts = 0;
        const maxAttempts = 3;
        let partETag: string | null = null;

        while (attempts < maxAttempts && !partETag) {
          if (cancelledRef.current) { await abortS3Upload(); return; }
          attempts++;

          try {
            const chunk = file.slice(start, end);
            const chunkBuffer = await chunk.arrayBuffer();

            const partRes = await currentS3.send(new UploadPartCommand({
              Bucket: BUCKET,
              Key: filePath,
              UploadId: uploadId,
              PartNumber: partNumber,
              Body: new Uint8Array(chunkBuffer),
            }));

            if (!partRes.ETag) throw new Error(`Sem ETag para parte ${partNumber}`);
            partETag = partRes.ETag;
          } catch (err) {
            console.error(`Part ${partNumber} attempt ${attempts} failed:`, err);
            if (attempts >= maxAttempts) {
              throw new Error(`Falha ao enviar parte ${partNumber}/${totalParts} após ${maxAttempts} tentativas`);
            }
            await new Promise(r => setTimeout(r, 2000 * attempts));
          }
        }

        parts.push({ PartNumber: partNumber, ETag: partETag! });
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
          progress: Math.min(percentage, 99),
          ...(speedStr ? { speed: speedStr } : {}),
        }));
      }

      if (cancelledRef.current) { await abortS3Upload(); return; }

      // 3. Complete multipart upload
      setState(prev => ({ ...prev, speed: 'Finalizando...' }));
      await s3ClientRef.current!.send(new CompleteMultipartUploadCommand({
        Bucket: BUCKET,
        Key: filePath,
        UploadId: uploadId,
        MultipartUpload: {
          Parts: parts.map(p => ({ PartNumber: p.PartNumber, ETag: p.ETag })),
        },
      }));

      console.log(`S3 multipart completed: ${filePath}, size: ${file.size}`);
      s3UploadIdRef.current = null;
      s3ClientRef.current = null;
      filePathRef.current = null;

      setState(prev => ({ ...prev, status: 'completed', progress: 100, filePath }));
      toast({ title: 'Upload concluído', description: 'O vídeo foi enviado com sucesso.' });
      onCompleteRef.current?.(filePath);

    } catch (err: unknown) {
      if (cancelledRef.current) return;
      const message = err instanceof Error ? err.message : 'Erro desconhecido no upload';
      console.error('Upload error:', err);
      await abortS3Upload();
      setState(prev => ({ ...prev, status: 'error', error: message }));
      toast({ title: 'Erro no upload', description: message, variant: 'destructive' });
    }
  }, [waitIfPaused, abortS3Upload]);

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

  const cancelUpload = useCallback(async () => {
    cancelledRef.current = true;
    pausedRef.current = false;
    resumeResolverRef.current?.();
    resumeResolverRef.current = null;
    await abortS3Upload();
    onCompleteRef.current = null;
    setState(initialState);
    toast({ title: 'Upload cancelado' });
  }, [abortS3Upload]);

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
