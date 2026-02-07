import { useState, useCallback, useRef } from 'react';
import * as tus from 'tus-js-client';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Upload, X, Video, AlertCircle, Pause, Play } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface VideoUploaderProps {
  value: string;
  onChange: (url: string) => void;
  disabled?: boolean;
}

const SUPABASE_PROJECT_ID = import.meta.env.VITE_SUPABASE_PROJECT_ID;
const TUS_ENDPOINT = `https://${SUPABASE_PROJECT_ID}.storage.supabase.co/storage/v1/upload/resumable`;

export function VideoUploader({ value, onChange, disabled }: VideoUploaderProps) {
  const [isUploading, setIsUploading] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [progress, setProgress] = useState(0);
  const [uploadSpeed, setUploadSpeed] = useState<string>('');
  const [error, setError] = useState<{ title: string; description: string } | null>(null);
  const [selectedFile, setSelectedFile] = useState<{ name: string; size: number } | null>(null);
  const { toast } = useToast();
  
  const uploadRef = useRef<tus.Upload | null>(null);
  const lastProgressRef = useRef<{ bytes: number; time: number }>({ bytes: 0, time: Date.now() });

  const startUpload = useCallback(async (file: File) => {
    setError(null);
    
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) {
      const errorInfo = {
        title: 'Não autenticado',
        description: 'Você precisa estar logado para fazer upload de vídeos.',
      };
      setError(errorInfo);
      toast({ ...errorInfo, variant: 'destructive' });
      return;
    }

    const fileExt = file.name.split('.').pop();
    const filePath = `movies/${Date.now()}-${Math.random().toString(36).substring(2)}.${fileExt}`;

    setIsUploading(true);
    setIsPaused(false);
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
      chunkSize: 6 * 1024 * 1024, // 6MB - required by Supabase
      onError: (err) => {
        console.error('TUS upload error:', err);
        const errorMessage = err.message || 'Erro desconhecido no upload';
        setError({
          title: 'Erro no upload',
          description: errorMessage,
        });
        toast({
          title: 'Erro no upload',
          description: errorMessage,
          variant: 'destructive',
        });
        setIsUploading(false);
        setIsPaused(false);
      },
      onProgress: (bytesUploaded, bytesTotal) => {
        const percentage = Math.round((bytesUploaded / bytesTotal) * 100);
        setProgress(percentage);
        
        // Calculate speed
        const now = Date.now();
        const timeDiff = (now - lastProgressRef.current.time) / 1000;
        if (timeDiff > 0.5) {
          const bytesDiff = bytesUploaded - lastProgressRef.current.bytes;
          const speed = bytesDiff / timeDiff;
          
          if (speed >= 1024 * 1024) {
            setUploadSpeed(`${(speed / (1024 * 1024)).toFixed(1)} MB/s`);
          } else {
            setUploadSpeed(`${(speed / 1024).toFixed(0)} KB/s`);
          }
          
          lastProgressRef.current = { bytes: bytesUploaded, time: now };
        }
      },
      onSuccess: () => {
        setProgress(100);
        setIsUploading(false);
        setIsPaused(false);
        onChange(filePath);
        toast({ title: 'Upload concluído', description: 'O vídeo foi enviado com sucesso.' });
      },
    });

    uploadRef.current = upload;

    // Check for previous uploads to resume
    try {
      const previousUploads = await upload.findPreviousUploads();
      if (previousUploads.length > 0) {
        upload.resumeFromPreviousUpload(previousUploads[0]);
        toast({
          title: 'Upload retomado',
          description: 'Continuando upload anterior...',
        });
      }
    } catch (e) {
      console.log('No previous uploads found');
    }

    upload.start();
  }, [onChange, toast]);

  const handleUpload = useCallback(async (file: File) => {
    if (!file) return;

    setSelectedFile({ name: file.name, size: file.size });
    setError(null);

    // Validate file type
    const validTypes = ['video/mp4', 'video/webm', 'video/quicktime'];
    if (!validTypes.includes(file.type)) {
      const errorInfo = {
        title: 'Formato inválido',
        description: `O arquivo "${file.name}" não é um formato aceito. Use MP4, WebM ou MOV.`,
      };
      setError(errorInfo);
      toast({ ...errorInfo, variant: 'destructive' });
      return;
    }

    // Validate file size (6GB max)
    const maxSize = 6 * 1024 * 1024 * 1024;
    if (file.size > maxSize) {
      const fileSizeGB = file.size / (1024 * 1024 * 1024);
      const errorInfo = {
        title: 'Arquivo muito grande',
        description: `O arquivo tem ${fileSizeGB.toFixed(2)}GB. O limite máximo é 6GB.`,
      };
      setError(errorInfo);
      setSelectedFile(null);
      toast({ ...errorInfo, variant: 'destructive' });
      return;
    }

    await startUpload(file);
  }, [startUpload, toast]);

  const handlePause = useCallback(() => {
    if (uploadRef.current) {
      uploadRef.current.abort();
      setIsPaused(true);
      toast({ title: 'Upload pausado', description: 'Clique em continuar quando quiser.' });
    }
  }, [toast]);

  const handleResume = useCallback(() => {
    if (uploadRef.current) {
      uploadRef.current.start();
      setIsPaused(false);
      toast({ title: 'Upload retomado' });
    }
  }, [toast]);

  const handleCancel = useCallback(() => {
    if (uploadRef.current) {
      uploadRef.current.abort();
    }
    setIsUploading(false);
    setIsPaused(false);
    setProgress(0);
    setSelectedFile(null);
    setUploadSpeed('');
    uploadRef.current = null;
    toast({ title: 'Upload cancelado' });
  }, [toast]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      handleUpload(file);
    }
    e.target.value = '';
  };

  const handleRemove = () => {
    onChange('');
    setError(null);
    setSelectedFile(null);
  };

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    if (bytes < 1024 * 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
    return `${(bytes / (1024 * 1024 * 1024)).toFixed(2)} GB`;
  };

  if (value) {
    return (
      <div className="relative rounded-lg border border-border bg-card p-4">
        <div className="flex items-center gap-3">
          <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-primary/10">
            <Video className="h-6 w-6 text-primary" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium truncate">Vídeo enviado</p>
            <p className="text-xs text-muted-foreground truncate">{value}</p>
          </div>
          <Button
            type="button"
            variant="ghost"
            size="icon"
            onClick={handleRemove}
            disabled={disabled}
          >
            <X className="h-4 w-4" />
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <label
        className={`
          flex flex-col items-center justify-center
          rounded-lg border-2 border-dashed
          ${error ? 'border-destructive bg-destructive/5' : 'border-border bg-card/50'}
          p-8 cursor-pointer
          hover:bg-card hover:border-primary/50
          transition-colors
          ${(isUploading || disabled) ? 'opacity-50 cursor-not-allowed' : ''}
        `}
      >
        <input
          type="file"
          accept="video/mp4,video/webm,video/quicktime"
          onChange={handleFileChange}
          disabled={isUploading || disabled}
          className="sr-only"
        />
        <Upload className={`h-10 w-10 mb-3 ${error ? 'text-destructive' : 'text-muted-foreground'}`} />
        <p className="text-sm font-medium text-foreground">
          Clique para fazer upload
        </p>
        <p className="text-xs text-muted-foreground mt-1">
          MP4, WebM ou MOV (máx. 6GB) • Upload resumível
        </p>
      </label>

      {/* Selected file info */}
      {selectedFile && !isUploading && !value && (
        <div className={`flex items-center gap-2 text-sm ${error ? 'text-destructive' : 'text-muted-foreground'}`}>
          <Video className="h-4 w-4" />
          <span className="truncate flex-1">{selectedFile.name}</span>
          <span className="font-medium">{formatFileSize(selectedFile.size)}</span>
        </div>
      )}

      {/* Error alert */}
      {error && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>{error.title}</AlertTitle>
          <AlertDescription>{error.description}</AlertDescription>
        </Alert>
      )}

      {/* Uploading state */}
      {isUploading && (
        <div className="space-y-3 p-4 rounded-lg border border-border bg-card">
          <div className="flex items-center gap-2">
            <Video className="h-4 w-4 text-primary" />
            <span className="text-sm font-medium truncate flex-1">
              {selectedFile?.name}
            </span>
            <span className="text-xs text-muted-foreground">
              {selectedFile && formatFileSize(selectedFile.size)}
            </span>
          </div>
          
          <Progress value={progress} className="h-2" />
          
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <span className="font-medium text-foreground">{progress}%</span>
              {uploadSpeed && <span>• {uploadSpeed}</span>}
              {isPaused && <span className="text-yellow-500">• Upload pausado</span>}
            </div>
            
            <div className="flex items-center gap-1">
              {isPaused ? (
                <Button
                  type="button"
                  variant="default"
                  size="sm"
                  onClick={handleResume}
                  className="h-7 px-3"
                >
                  <Play className="h-3 w-3 mr-1" />
                  Continuar
                </Button>
              ) : (
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={handlePause}
                  className="h-7 px-2"
                >
                  <Pause className="h-3 w-3 mr-1" />
                  Pausar
                </Button>
              )}
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={handleCancel}
                className="h-7 px-2 text-destructive hover:text-destructive"
              >
                <X className="h-3 w-3 mr-1" />
                Cancelar
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
