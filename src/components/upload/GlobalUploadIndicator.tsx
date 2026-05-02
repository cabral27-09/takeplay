import { useState } from 'react';
import { useUpload } from '@/contexts/UploadContext';
import { Progress } from '@/components/ui/progress';
import { Button } from '@/components/ui/button';
import { Upload, Pause, Play, X, Minimize2, Maximize2, CheckCircle2 } from 'lucide-react';

export function GlobalUploadIndicator() {
  const { upload, pauseUpload, resumeUpload, cancelUpload } = useUpload();
  const [minimized, setMinimized] = useState(false);

  if (upload.status === 'idle') return null;

  const formatSize = (bytes: number) => {
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    if (bytes < 1024 * 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
    return `${(bytes / (1024 * 1024 * 1024)).toFixed(2)} GB`;
  };

  const isActive = upload.status === 'uploading' || upload.status === 'paused';
  const isCompleted = upload.status === 'completed';

  if (minimized) {
    return (
      <button
        onClick={() => setMinimized(false)}
        className="fixed bottom-4 right-4 z-50 flex h-12 w-12 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-lg hover:opacity-90 transition-opacity"
      >
        {isCompleted ? (
          <CheckCircle2 className="h-5 w-5" />
        ) : (
          <div className="relative">
            <Upload className="h-5 w-5" />
            <span className="absolute -top-1 -right-1 text-[10px] font-bold">{upload.progress}%</span>
          </div>
        )}
      </button>
    );
  }

  return (
    <div className="fixed bottom-4 right-4 z-50 w-80 rounded-lg border border-border bg-card shadow-xl">
      {/* Header */}
      <div className="flex items-center justify-between px-3 py-2 border-b border-border">
        <div className="flex items-center gap-2 text-sm font-medium">
          {isCompleted ? (
            <CheckCircle2 className="h-4 w-4 text-green-500" />
          ) : (
            <Upload className="h-4 w-4 text-primary" />
          )}
          <span>{isCompleted ? 'Upload concluído' : 'Enviando vídeo...'}</span>
        </div>
        <div className="flex items-center gap-1">
          <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => setMinimized(true)}>
            <Minimize2 className="h-3 w-3" />
          </Button>
          {(isCompleted || upload.status === 'error') && (
            <Button variant="ghost" size="icon" className="h-6 w-6" onClick={cancelUpload}>
              <X className="h-3 w-3" />
            </Button>
          )}
        </div>
      </div>

      {/* Body */}
      <div className="p-3 space-y-2">
        <div className="flex items-center justify-between text-xs text-muted-foreground">
          <span className="truncate max-w-[180px]">{upload.fileName}</span>
          <span>{formatSize(upload.fileSize)}</span>
        </div>

        <Progress value={upload.progress} className="h-2" />

        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <span className="font-medium text-foreground">{upload.progress}%</span>
            {upload.speed && upload.status === 'uploading' && <span>• {upload.speed}</span>}
            {upload.status === 'paused' && <span className="text-yellow-500">• Pausado</span>}
            {upload.status === 'error' && <span className="text-destructive">• Erro</span>}
          </div>

          {isActive && (
            <div className="flex items-center gap-1">
              <Button variant="ghost" size="sm" className="h-6 px-2 text-xs text-destructive hover:text-destructive" onClick={cancelUpload}>
                <X className="h-3 w-3" />
              </Button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
