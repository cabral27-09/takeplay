import { useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Upload, X, Image as ImageIcon } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface ImageUploaderProps {
  value: string;
  onChange: (url: string) => void;
  disabled?: boolean;
  aspectRatio?: 'thumbnail' | 'backdrop';
}

export function ImageUploader({ 
  value, 
  onChange, 
  disabled,
  aspectRatio = 'thumbnail' 
}: ImageUploaderProps) {
  const [isUploading, setIsUploading] = useState(false);
  const { toast } = useToast();

  const aspectClass = aspectRatio === 'backdrop' 
    ? 'aspect-video' 
    : 'aspect-[2/3]';

  const handleUpload = useCallback(async (file: File) => {
    if (!file) return;

    // Validate file type
    const validTypes = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];
    if (!validTypes.includes(file.type)) {
      toast({
        title: 'Formato inválido',
        description: 'Apenas arquivos JPEG, PNG, WebP ou GIF são aceitos.',
        variant: 'destructive',
      });
      return;
    }

    // Validate file size (10MB max)
    const maxSize = 10 * 1024 * 1024;
    if (file.size > maxSize) {
      toast({
        title: 'Arquivo muito grande',
        description: 'O tamanho máximo é 10MB.',
        variant: 'destructive',
      });
      return;
    }

    setIsUploading(true);

    try {
      const fileExt = file.name.split('.').pop();
      const fileName = `${Date.now()}-${Math.random().toString(36).substring(7)}.${fileExt}`;
      const folder = aspectRatio === 'backdrop' ? 'backdrops' : 'thumbnails';
      const filePath = `${folder}/${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from('movie-images')
        .upload(filePath, file, {
          cacheControl: '3600',
          upsert: false,
        });

      if (uploadError) throw uploadError;

      // Get public URL
      const { data: { publicUrl } } = supabase.storage
        .from('movie-images')
        .getPublicUrl(filePath);

      onChange(publicUrl);

      toast({
        title: 'Upload concluído',
        description: 'A imagem foi enviada com sucesso.',
      });
    } catch (error) {
      console.error('Upload error:', error);
      toast({
        title: 'Erro no upload',
        description: 'Não foi possível enviar a imagem. Tente novamente.',
        variant: 'destructive',
      });
    } finally {
      setIsUploading(false);
    }
  }, [onChange, toast, aspectRatio]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      handleUpload(file);
    }
  };

  const handleRemove = () => {
    onChange('');
  };

  if (value) {
    return (
      <div className={`relative rounded-lg overflow-hidden border border-border ${aspectClass}`}>
        <img
          src={value}
          alt="Preview"
          className="w-full h-full object-cover"
        />
        <Button
          type="button"
          variant="destructive"
          size="icon"
          className="absolute top-2 right-2"
          onClick={handleRemove}
          disabled={disabled}
        >
          <X className="h-4 w-4" />
        </Button>
      </div>
    );
  }

  return (
    <label
      className={`
        flex flex-col items-center justify-center
        rounded-lg border-2 border-dashed border-border
        bg-card/50 cursor-pointer
        hover:bg-card hover:border-primary/50
        transition-colors
        ${aspectClass}
        ${isUploading || disabled ? 'opacity-50 cursor-not-allowed' : ''}
      `}
    >
      <input
        type="file"
        accept="image/jpeg,image/png,image/webp,image/gif"
        onChange={handleFileChange}
        disabled={isUploading || disabled}
        className="sr-only"
      />
      {isUploading ? (
        <div className="flex flex-col items-center">
          <div className="h-8 w-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
          <p className="text-xs text-muted-foreground mt-2">Enviando...</p>
        </div>
      ) : (
        <>
          <ImageIcon className="h-8 w-8 text-muted-foreground mb-2" />
          <p className="text-xs text-muted-foreground text-center px-4">
            {aspectRatio === 'backdrop' ? 'Backdrop (16:9)' : 'Thumbnail (2:3)'}
          </p>
        </>
      )}
    </label>
  );
}
