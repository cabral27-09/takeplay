import React, { createContext, useContext, useState, useRef, useCallback } from 'react';
import { S3Client, AbortMultipartUploadCommand } from '@aws-sdk/client-s3';
import { Upload } from '@aws-sdk/lib-storage';
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
const SUPABASE_PROJECT_ID = import.meta.env.VITE_SUPABASE_PROJECT_ID as string;
const SUPABASE_PUBLISHABLE_KEY = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY as string;
const BUCKET = 'videos';
const PART_SIZE = 16 * 1024 * 1024; // 16MB

function makeKey(file: File) {
  const ext = (file.name.split('.').pop() || 'mp4').toLowerCase();
  return `movies/${Date.now()}-${Math.random().toString(36).substring(2, 10)}.${ext}`;
}

export function UploadProvider({ children }: { children: React.ReactNode }) {
  const [state, setState] = useState<UploadState>(initialState);
  const onCompleteRef = useRef<((filePath: string) => void) | null>(null);

  const uploaderRef = useRef<Upload | null>(null);
  const s3Ref = useRef<S3Client | null>(null);
  const cancelledRef = useRef<boolean>(false);
  const lastProgressRef = useRef({ bytes: 0, time: Date.now() });
  const currentKeyRef = useRef<string | null>(null);
  const currentUploadIdRef = useRef<string | null>(null);

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
    currentKeyRef.current = key;
    currentUploadIdRef.current = null;

    setState({
      status: 'uploading',
      fileName: file.name,
      fileSize: file.size,
      progress: 0,
      speed: 'Iniciando upload...',
      error: null,
      filePath: null,
    });

    // S3 endpoint do Storage. Usa subdomínio storage para melhor performance em arquivos grandes.
    const endpoint = `https://${SUPABASE_PROJECT_ID}.storage.supabase.co/storage/v1/s3`;

    const s3 = new S3Client({
      forcePathStyle: true,
      region: 'us-east-1',
      endpoint,
      credentials: {
        accessKeyId: SUPABASE_PROJECT_ID,
        secretAccessKey: SUPABASE_PUBLISHABLE_KEY,
        sessionToken: session.access_token,
      },
    });
    s3Ref.current = s3;

    try {
      const uploader = new Upload({
        client: s3,
        params: {
          Bucket: BUCKET,
          Key: key,
          Body: file,
          ContentType: file.type || 'video/mp4',
          CacheControl: '3600',
        },
        partSize: PART_SIZE,
        queueSize: 4,
        leavePartsOnError: false,
      });

      uploaderRef.current = uploader;

      // Captura o uploadId quando criado, para poder abortar depois
      // @ts-ignore - evento interno
      uploader.on?.('httpUploadProgress', (p: { loaded?: number; total?: number; part?: number; Key?: string; UploadId?: string }) => {
        if (p.UploadId && !currentUploadIdRef.current) {
          currentUploadIdRef.current = p.UploadId;
        }
        const loaded = p.loaded || 0;
        const total = p.total || file.size;
        const now = Date.now();
        const dt = (now - lastProgressRef.current.time) / 1000;
        let speedStr = '';
        if (dt > 0.5) {
          const db = loaded - lastProgressRef.current.bytes;
          const sp = db / dt;
          if (sp > 0) {
            speedStr = sp >= 1024 * 1024
              ? `${(sp / (1024 * 1024)).toFixed(1)} MB/s`
              : `${(sp / 1024).toFixed(0)} KB/s`;
          }
          lastProgressRef.current = { bytes: loaded, time: now };
        }
        const pct = Math.min(99, Math.round((loaded / total) * 100));
        setState((prev) => ({
          ...prev,
          progress: pct,
          ...(speedStr ? { speed: speedStr } : {}),
        }));
      });

      await uploader.done();

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
      const raw = e?.message || e?.name || 'Erro desconhecido no upload';
      let message = raw;
      if (/AccessDenied|Forbidden/i.test(raw)) {
        message = 'Sem permissão para enviar vídeos. Verifique se sua conta tem papel de admin ou produtor.';
      } else if (/SignatureDoesNotMatch|InvalidAccessKeyId|Unauthorized|jwt/i.test(raw)) {
        message = 'Sessão expirada. Faça login novamente e tente outra vez.';
      } else if (/NetworkError|Failed to fetch|network/i.test(raw)) {
        message = 'Falha de rede durante o upload. Verifique sua conexão e tente novamente.';
      }
      setState((prev) => ({ ...prev, status: 'error', error: message, speed: '' }));
      toast({ title: 'Erro no upload', description: message, variant: 'destructive' });
    } finally {
      uploaderRef.current = null;
    }
  }, []);

  // Pausar/Resumir não é suportado de forma confiável neste fluxo; manter o status atual.
  const pauseUpload = useCallback(() => {
    toast({ title: 'Pausa indisponível', description: 'Este upload não pode ser pausado. Aguarde a conclusão ou cancele.' });
  }, []);

  const resumeUpload = useCallback(() => {
    // no-op
  }, []);

  const cancelUpload = useCallback(() => {
    cancelledRef.current = true;
    const uploader = uploaderRef.current;
    if (uploader) {
      uploader.abort().catch(() => {});
    }
    // Aborta multipart no servidor se já tivermos o UploadId
    const s3 = s3Ref.current;
    const key = currentKeyRef.current;
    const uploadId = currentUploadIdRef.current;
    if (s3 && key && uploadId) {
      s3.send(new AbortMultipartUploadCommand({ Bucket: BUCKET, Key: key, UploadId: uploadId })).catch(() => {});
    }
    uploaderRef.current = null;
    s3Ref.current = null;
    currentKeyRef.current = null;
    currentUploadIdRef.current = null;
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
