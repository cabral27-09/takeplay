import { useState, useCallback, useRef, useEffect } from 'react';
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

const CHUNK_SIZE = 50 * 1024 * 1024; // 50MB chunks
const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;

interface UploadState {
  uploadId: string;
  currentChunk: number;
  totalChunks: number;
  fileName: string;
  fileSize: number;
  fileType: string;
  finalPath: string;
}

const STORAGE_KEY = 'video_upload_state';

function generateUploadId(): string {
  return `${Date.now()}-${Math.random().toString(36).substring(2, 15)}`;
}

function saveUploadState(state: UploadState): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
}

function loadUploadState(): UploadState | null {
  const stored = localStorage.getItem(STORAGE_KEY);
  if (!stored) return null;
  try {
    return JSON.parse(stored);
  } catch {
    return null;
  }
}

function clearUploadState(): void {
  localStorage.removeItem(STORAGE_KEY);
}

export function VideoUploader({ value, onChange, disabled }: VideoUploaderProps) {
  const [isUploading, setIsUploading] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [progress, setProgress] = useState(0);
  const [uploadSpeed, setUploadSpeed] = useState<string>('');
  const [error, setError] = useState<{ title: string; description: string } | null>(null);
  const [selectedFile, setSelectedFile] = useState<{ name: string; size: number } | null>(null);
  const [currentChunkInfo, setCurrentChunkInfo] = useState<string>('');
  const { toast } = useToast();
  
  const fileRef = useRef<File | null>(null);
  const uploadStateRef = useRef<UploadState | null>(null);
  const abortControllerRef = useRef<AbortController | null>(null);
  const lastProgressRef = useRef<{ bytes: number; time: number }>({ bytes: 0, time: Date.now() });

  // Check for resumable upload on mount
  useEffect(() => {
    const savedState = loadUploadState();
    if (savedState) {
      setIsPaused(true);
      setSelectedFile({ name: savedState.fileName, size: savedState.fileSize });
      setProgress(Math.round((savedState.currentChunk / savedState.totalChunks) * 100));
      setCurrentChunkInfo(`Chunk ${savedState.currentChunk}/${savedState.totalChunks} - Upload pausado`);
      uploadStateRef.current = savedState;
      toast({
        title: 'Upload encontrado',
        description: `Upload de "${savedState.fileName}" pode ser retomado.`,
      });
    }
  }, [toast]);

  const uploadChunk = async (
    file: File,
    chunkIndex: number,
    totalChunks: number,
    uploadId: string,
    accessToken: string
  ): Promise<boolean> => {
    const start = chunkIndex * CHUNK_SIZE;
    const end = Math.min(start + CHUNK_SIZE, file.size);
    const chunk = file.slice(start, end);

    const formData = new FormData();
    formData.append('upload_id', uploadId);
    formData.append('chunk_index', chunkIndex.toString());
    formData.append('total_chunks', totalChunks.toString());
    formData.append('chunk', chunk);

    const response = await fetch(`${SUPABASE_URL}/functions/v1/upload-video-chunk`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
      },
      body: formData,
      signal: abortControllerRef.current?.signal,
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.error || `Chunk upload failed: ${response.status}`);
    }

    return true;
  };

  const finalizeUpload = async (
    uploadId: string,
    totalChunks: number,
    finalPath: string,
    contentType: string,
    accessToken: string
  ): Promise<void> => {
    const response = await fetch(`${SUPABASE_URL}/functions/v1/finalize-video-upload`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        upload_id: uploadId,
        total_chunks: totalChunks,
        final_path: finalPath,
        content_type: contentType,
      }),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.error || `Finalization failed: ${response.status}`);
    }
  };

  const startUpload = useCallback(async (file: File, resumeState?: UploadState) => {
    setError(null);
    
    // Get session for auth
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

    const accessToken = session.access_token;
    const totalChunks = Math.ceil(file.size / CHUNK_SIZE);
    
    // Generate or resume upload state
    const uploadId = resumeState?.uploadId || generateUploadId();
    const startChunk = resumeState?.currentChunk || 0;
    const fileExt = file.name.split('.').pop();
    const finalPath = resumeState?.finalPath || `movies/${uploadId}.${fileExt}`;

    const state: UploadState = {
      uploadId,
      currentChunk: startChunk,
      totalChunks,
      fileName: file.name,
      fileSize: file.size,
      fileType: file.type,
      finalPath,
    };

    uploadStateRef.current = state;
    fileRef.current = file;
    abortControllerRef.current = new AbortController();

    setIsUploading(true);
    setIsPaused(false);
    lastProgressRef.current = { bytes: startChunk * CHUNK_SIZE, time: Date.now() };

    try {
      // Upload chunks sequentially
      for (let i = startChunk; i < totalChunks; i++) {
        // Check if paused or cancelled
        if (abortControllerRef.current?.signal.aborted) {
          return;
        }

        setCurrentChunkInfo(`Enviando chunk ${i + 1}/${totalChunks}...`);
        
        const chunkStartTime = Date.now();
        await uploadChunk(file, i, totalChunks, uploadId, accessToken);
        const chunkEndTime = Date.now();

        // Update progress
        const uploadedBytes = (i + 1) * CHUNK_SIZE;
        const percentage = Math.round(((i + 1) / totalChunks) * 100);
        setProgress(percentage);

        // Calculate speed
        const chunkDuration = (chunkEndTime - chunkStartTime) / 1000;
        const chunkSize = Math.min(CHUNK_SIZE, file.size - i * CHUNK_SIZE);
        const speed = chunkSize / chunkDuration;
        
        if (speed >= 1024 * 1024) {
          setUploadSpeed(`${(speed / (1024 * 1024)).toFixed(1)} MB/s`);
        } else {
          setUploadSpeed(`${(speed / 1024).toFixed(0)} KB/s`);
        }

        // Save state for resume
        state.currentChunk = i + 1;
        saveUploadState(state);
      }

      // All chunks uploaded, finalize
      setCurrentChunkInfo('Finalizando upload...');
      await finalizeUpload(uploadId, totalChunks, finalPath, file.type, accessToken);

      // Success
      setProgress(100);
      setIsUploading(false);
      setCurrentChunkInfo('');
      clearUploadState();
      onChange(finalPath);
      toast({ title: 'Upload concluído', description: 'O vídeo foi enviado com sucesso.' });

    } catch (err) {
      // Handle abort (pause or cancel)
      if (err instanceof Error && err.name === 'AbortError') {
        return;
      }

      console.error('Upload error:', err);
      const errorMessage = err instanceof Error ? err.message : 'Erro desconhecido';
      
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
    }
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

    fileRef.current = file;
    await startUpload(file);
  }, [startUpload, toast]);

  const handlePauseResume = useCallback(async () => {
    if (isPaused) {
      // Resume upload
      const savedState = uploadStateRef.current || loadUploadState();
      const file = fileRef.current;
      
      if (!file || !savedState) {
        toast({
          title: 'Erro ao retomar',
          description: 'Arquivo não encontrado. Selecione o arquivo novamente.',
          variant: 'destructive',
        });
        return;
      }

      await startUpload(file, savedState);
    } else {
      // Pause upload
      setIsPaused(true);
      abortControllerRef.current?.abort();
      toast({ title: 'Upload pausado', description: 'Clique em continuar quando quiser.' });
    }
  }, [isPaused, startUpload, toast]);

  const handleCancel = useCallback(() => {
    abortControllerRef.current?.abort();
    setIsUploading(false);
    setIsPaused(false);
    setProgress(0);
    setSelectedFile(null);
    setCurrentChunkInfo('');
    clearUploadState();
    uploadStateRef.current = null;
    fileRef.current = null;
    toast({ title: 'Upload cancelado' });
  }, [toast]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      // If there's a saved state for a different file, clear it
      const savedState = loadUploadState();
      if (savedState && savedState.fileName !== file.name) {
        clearUploadState();
        uploadStateRef.current = null;
      }
      handleUpload(file);
    }
    e.target.value = '';
  };

  const handleRemove = () => {
    onChange('');
    setError(null);
    setSelectedFile(null);
    clearUploadState();
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

  const showResumePrompt = isPaused && !isUploading && uploadStateRef.current;

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
          ${(isUploading || disabled) && !showResumePrompt ? 'opacity-50 cursor-not-allowed' : ''}
        `}
      >
        <input
          type="file"
          accept="video/mp4,video/webm,video/quicktime"
          onChange={handleFileChange}
          disabled={(isUploading || disabled) && !showResumePrompt}
          className="sr-only"
        />
        <Upload className={`h-10 w-10 mb-3 ${error ? 'text-destructive' : 'text-muted-foreground'}`} />
        <p className="text-sm font-medium text-foreground">
          {showResumePrompt ? 'Selecione o arquivo para retomar ou clique em Continuar' : 'Clique para fazer upload'}
        </p>
        <p className="text-xs text-muted-foreground mt-1">
          MP4, WebM ou MOV (máx. 6GB) • Upload em chunks de 50MB
        </p>
      </label>

      {/* Selected file info */}
      {selectedFile && !isUploading && !value && !showResumePrompt && (
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

      {/* Resume prompt */}
      {showResumePrompt && (
        <div className="space-y-3 p-4 rounded-lg border border-yellow-500/50 bg-yellow-500/10">
          <div className="flex items-center gap-2">
            <Video className="h-4 w-4 text-yellow-500" />
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
              <span className="text-yellow-500">• Upload pausado</span>
            </div>
            
            <div className="flex items-center gap-1">
              <Button
                type="button"
                variant="default"
                size="sm"
                onClick={handlePauseResume}
                className="h-7 px-3"
              >
                <Play className="h-3 w-3 mr-1" />
                Continuar
              </Button>
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

      {/* Uploading state */}
      {isUploading && !isPaused && (
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
              {currentChunkInfo && <span>• {currentChunkInfo}</span>}
            </div>
            
            <div className="flex items-center gap-1">
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={handlePauseResume}
                className="h-7 px-2"
              >
                <Pause className="h-3 w-3 mr-1" />
                Pausar
              </Button>
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
