import { useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Upload, X, Video, AlertCircle } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface VideoUploaderProps {
  value: string;
  onChange: (url: string) => void;
  disabled?: boolean;
}

export function VideoUploader({ value, onChange, disabled }: VideoUploaderProps) {
  const [isUploading, setIsUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState<{ title: string; description: string } | null>(null);
  const [selectedFile, setSelectedFile] = useState<{ name: string; size: number } | null>(null);
  const { toast } = useToast();

  const handleUpload = useCallback(async (file: File) => {
    if (!file) return;

    // Store selected file info for display
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
      toast({
        title: errorInfo.title,
        description: errorInfo.description,
        variant: 'destructive',
      });
      return;
    }

    // Validate file size (5GB max)
    const maxSize = 5 * 1024 * 1024 * 1024;
    if (file.size > maxSize) {
      const errorInfo = {
        title: 'Arquivo muito grande',
        description: `O arquivo selecionado tem ${formatFileSize(file.size)}. O tamanho máximo permitido é 5GB.`,
      };
      setError(errorInfo);
      toast({
        title: errorInfo.title,
        description: errorInfo.description,
        variant: 'destructive',
      });
      return;
    }

    setIsUploading(true);
    setProgress(0);

    try {
      const fileExt = file.name.split('.').pop();
      const fileName = `${Date.now()}-${Math.random().toString(36).substring(7)}.${fileExt}`;
      const filePath = `movies/${fileName}`;

      // Simulate progress since Supabase doesn't provide upload progress
      const progressInterval = setInterval(() => {
        setProgress(prev => Math.min(prev + 10, 90));
      }, 500);

      const { error: uploadError } = await supabase.storage
        .from('videos')
        .upload(filePath, file, {
          cacheControl: '3600',
          upsert: false,
        });

      clearInterval(progressInterval);

      if (uploadError) throw uploadError;

      // Get public URL
      const { data: { publicUrl } } = supabase.storage
        .from('videos')
        .getPublicUrl(filePath);

      setProgress(100);
      onChange(publicUrl);

      toast({
        title: 'Upload concluído',
        description: 'O vídeo foi enviado com sucesso.',
      });
    } catch (error) {
      console.error('Upload error:', error);
      toast({
        title: 'Erro no upload',
        description: 'Não foi possível enviar o vídeo. Tente novamente.',
        variant: 'destructive',
      });
    } finally {
      setIsUploading(false);
      setProgress(0);
    }
  }, [onChange, toast]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      handleUpload(file);
    }
    // Reset input to allow selecting the same file again
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
          ${isUploading || disabled ? 'opacity-50 cursor-not-allowed' : ''}
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
          MP4, WebM ou MOV (máx. 5GB)
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

      {isUploading && (
        <div className="space-y-2">
          <Progress value={progress} className="h-2" />
          <p className="text-xs text-muted-foreground text-center">
            Enviando... {progress}%
          </p>
        </div>
      )}
    </div>
  );
}
