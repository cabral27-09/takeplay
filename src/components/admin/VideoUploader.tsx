import { useCallback, useEffect } from 'react';
import { useUpload } from '@/contexts/UploadContext';
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

export function VideoUploader({ value, onChange, disabled }: VideoUploaderProps) {
  const { upload, startUpload, pauseUpload, resumeUpload, cancelUpload, registerOnComplete } = useUpload();
  const { toast } = useToast();

  const isActive = upload.status === 'uploading' || upload.status === 'paused';

  // Register onChange as completion callback whenever this component is mounted
  useEffect(() => {
    registerOnComplete(onChange);
    return () => registerOnComplete(null);
  }, [onChange, registerOnComplete]);

  // If upload completed while we're mounted, clear the completed state visually
  useEffect(() => {
    if (upload.status === 'completed' && upload.filePath && !value) {
      onChange(upload.filePath);
    }
  }, [upload.status, upload.filePath, value, onChange]);

  const handleFileChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      startUpload(file, onChange);
    }
    e.target.value = '';
  }, [startUpload, onChange]);

  const handleRemove = () => {
    onChange('');
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
          <Button type="button" variant="ghost" size="icon" onClick={handleRemove} disabled={disabled}>
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
          ${upload.status === 'error' ? 'border-destructive bg-destructive/5' : 'border-border bg-card/50'}
          p-8 cursor-pointer
          hover:bg-card hover:border-primary/50
          transition-colors
          ${(isActive || disabled) ? 'opacity-50 cursor-not-allowed' : ''}
        `}
      >
        <input
          type="file"
          accept="video/mp4,video/webm,video/quicktime"
          onChange={handleFileChange}
          disabled={isActive || disabled}
          className="sr-only"
        />
        <Upload className={`h-10 w-10 mb-3 ${upload.status === 'error' ? 'text-destructive' : 'text-muted-foreground'}`} />
        <p className="text-sm font-medium text-foreground">
          Clique para fazer upload
        </p>
        <p className="text-xs text-muted-foreground mt-1">
          MP4, WebM ou MOV (máx. 6GB) • Upload resumível
        </p>
      </label>

      {/* Error alert */}
      {upload.status === 'error' && upload.error && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Erro no upload</AlertTitle>
          <AlertDescription>{upload.error}</AlertDescription>
        </Alert>
      )}

      {/* Uploading state (inline mirror of global indicator) */}
      {isActive && (
        <div className="space-y-3 p-4 rounded-lg border border-border bg-card">
          <div className="flex items-center gap-2">
            <Video className="h-4 w-4 text-primary" />
            <span className="text-sm font-medium truncate flex-1">{upload.fileName}</span>
            <span className="text-xs text-muted-foreground">{formatFileSize(upload.fileSize)}</span>
          </div>
          
          <Progress value={upload.progress} className="h-2" />
          
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <span className="font-medium text-foreground">{upload.progress}%</span>
              {upload.speed && upload.status === 'uploading' && <span>• {upload.speed}</span>}
              {upload.status === 'paused' && <span className="text-yellow-500">• Upload pausado</span>}
            </div>
            
            <div className="flex items-center gap-1">
              {upload.status === 'paused' ? (
                <Button type="button" variant="default" size="sm" onClick={resumeUpload} className="h-7 px-3">
                  <Play className="h-3 w-3 mr-1" /> Continuar
                </Button>
              ) : (
                <Button type="button" variant="ghost" size="sm" onClick={pauseUpload} className="h-7 px-2">
                  <Pause className="h-3 w-3 mr-1" /> Pausar
                </Button>
              )}
              <Button type="button" variant="ghost" size="sm" onClick={cancelUpload} className="h-7 px-2 text-destructive hover:text-destructive">
                <X className="h-3 w-3 mr-1" /> Cancelar
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
