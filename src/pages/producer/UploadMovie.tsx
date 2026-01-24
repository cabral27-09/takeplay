import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { motion } from 'framer-motion';
import { ArrowLeft, Save, Loader2, Clock, CheckCircle, XCircle, Film } from 'lucide-react';
import { Layout } from '@/components/layout/Layout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import { VideoUploader } from '@/components/admin/VideoUploader';
import { ImageUploader } from '@/components/admin/ImageUploader';
import { useAuth } from '@/contexts/AuthContext';
import { useMovie, useCreateMovie, useUpdateMovie } from '@/hooks/useMovies';
import { useGenres } from '@/hooks/useGenres';
import { useToast } from '@/hooks/use-toast';
import { Navigate, Link } from 'react-router-dom';
import type { MovieFormData, MovieStatus } from '@/types/movie';

const STATUS_CONFIG: Record<MovieStatus, { label: string; icon: React.ComponentType<any>; variant: 'default' | 'secondary' | 'destructive' | 'outline' }> = {
  draft: { label: 'Rascunho', icon: Film, variant: 'secondary' },
  pending_review: { label: 'Em Avaliação', icon: Clock, variant: 'default' },
  published: { label: 'No Ar', icon: CheckCircle, variant: 'outline' },
  rejected: { label: 'Recusado', icon: XCircle, variant: 'destructive' },
};

export default function ProducerUploadMovie() {
  const { id } = useParams();
  const navigate = useNavigate();
  const isEditing = !!id;
  
  const { user, profile, hasRole, isLoading: authLoading } = useAuth();
  const { data: movie, isLoading: movieLoading } = useMovie(id);
  const { data: genres, isLoading: genresLoading } = useGenres();
  const createMovie = useCreateMovie();
  const updateMovie = useUpdateMovie();
  const { toast } = useToast();

  const [formData, setFormData] = useState<MovieFormData>({
    title: '',
    synopsis: '',
    year: new Date().getFullYear(),
    duration: 90,
    rating: 0,
    status: 'pending_review', // Producers always submit as pending_review
    featured: false,
    min_tier: 'free',
    thumbnail_url: '',
    backdrop_url: '',
    video_url: '',
    trailer_url: '',
    producer_name: '',
    producer_type: 'individual',
    genre_ids: [],
    content_type: 'filme',
    total_episodes: null,
    total_seasons: null,
    current_episode: null,
    season_number: null,
  });

  // Set producer name from profile
  useEffect(() => {
    if (profile?.full_name && !isEditing) {
      setFormData(prev => ({ ...prev, producer_name: profile.full_name || '' }));
    }
  }, [profile, isEditing]);

  // Load movie data for editing
  useEffect(() => {
    if (movie && isEditing) {
      // Only allow editing if it's the producer's movie and in allowed status
      const allowedStatuses: MovieStatus[] = ['draft', 'pending_review', 'rejected'];
      if (!allowedStatuses.includes(movie.status)) {
        toast({
          title: 'Acesso negado',
          description: 'Este filme não pode mais ser editado.',
          variant: 'destructive',
        });
        navigate('/producer/movies');
        return;
      }

      setFormData({
        title: movie.title,
        synopsis: movie.synopsis || '',
        year: movie.year || new Date().getFullYear(),
        duration: movie.duration || 90,
        rating: movie.rating || 0,
        status: movie.status,
        featured: movie.featured,
        min_tier: movie.min_tier,
        thumbnail_url: movie.thumbnail_url || '',
        backdrop_url: movie.backdrop_url || '',
        video_url: movie.video_url || '',
        trailer_url: movie.trailer_url || '',
        producer_name: movie.producer_name || '',
        producer_type: movie.producer_type || 'individual',
        genre_ids: movie.genres.map(g => g.id),
        content_type: movie.content_type || 'filme',
        total_episodes: movie.total_episodes,
        total_seasons: movie.total_seasons,
        current_episode: movie.current_episode,
        season_number: movie.season_number,
      });
    }
  }, [movie, isEditing, navigate, toast]);

  // Redirect non-producers
  if (!authLoading && !hasRole('producer') && !hasRole('admin')) {
    return <Navigate to="/" replace />;
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.title.trim()) {
      toast({
        title: 'Erro de validação',
        description: 'O título é obrigatório.',
        variant: 'destructive',
      });
      return;
    }

    if (!formData.video_url) {
      toast({
        title: 'Erro de validação',
        description: 'O vídeo é obrigatório.',
        variant: 'destructive',
      });
      return;
    }

    try {
      // Always set status to pending_review when producer submits
      const submitData: MovieFormData = {
        ...formData,
        status: 'pending_review',
        producer_name: profile?.full_name || formData.producer_name,
      };

      if (isEditing && id) {
        await updateMovie.mutateAsync({ id, formData: submitData });
        toast({
          title: 'Filme atualizado',
          description: 'Seu filme foi enviado para avaliação.',
        });
      } else {
        await createMovie.mutateAsync(submitData);
        toast({
          title: 'Filme enviado!',
          description: 'Seu filme foi enviado para avaliação. Você receberá uma notificação quando for aprovado.',
        });
      }
      navigate('/producer/movies');
    } catch (error) {
      console.error('Error saving movie:', error);
      toast({
        title: 'Erro ao salvar',
        description: 'Não foi possível salvar o filme. Tente novamente.',
        variant: 'destructive',
      });
    }
  };

  const handleSaveDraft = async () => {
    if (!formData.title.trim()) {
      toast({
        title: 'Erro de validação',
        description: 'O título é obrigatório para salvar como rascunho.',
        variant: 'destructive',
      });
      return;
    }

    try {
      const draftData: MovieFormData = {
        ...formData,
        status: 'draft',
        producer_name: profile?.full_name || formData.producer_name,
      };

      if (isEditing && id) {
        await updateMovie.mutateAsync({ id, formData: draftData });
        toast({
          title: 'Rascunho salvo',
          description: 'Seu rascunho foi salvo com sucesso.',
        });
      } else {
        await createMovie.mutateAsync(draftData);
        toast({
          title: 'Rascunho criado',
          description: 'Seu rascunho foi salvo. Você pode continuar editando depois.',
        });
      }
      navigate('/producer/movies');
    } catch (error) {
      console.error('Error saving draft:', error);
      toast({
        title: 'Erro ao salvar',
        description: 'Não foi possível salvar o rascunho. Tente novamente.',
        variant: 'destructive',
      });
    }
  };

  const handleGenreToggle = (genreId: string) => {
    setFormData(prev => ({
      ...prev,
      genre_ids: prev.genre_ids.includes(genreId)
        ? prev.genre_ids.filter(id => id !== genreId)
        : [...prev.genre_ids, genreId],
    }));
  };

  const isLoading = authLoading || (isEditing && movieLoading) || genresLoading;
  const isSaving = createMovie.isPending || updateMovie.isPending;

  // Show current status if editing
  const currentStatus = isEditing && movie ? STATUS_CONFIG[movie.status] : null;

  if (isLoading) {
    return (
      <Layout>
        <div className="container py-20 flex items-center justify-center">
          <div className="h-8 w-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="container py-8 max-w-4xl">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="space-y-6"
        >
          {/* Header */}
          <div className="flex items-center gap-4">
            <Link to="/producer/movies">
              <Button variant="ghost" size="icon">
                <ArrowLeft className="h-5 w-5" />
              </Button>
            </Link>
            <div className="flex-1">
              <div className="flex items-center gap-3">
                <h1 className="text-2xl font-bold">
                  {isEditing ? 'Editar Filme' : 'Enviar Novo Filme'}
                </h1>
                {currentStatus && (
                  <Badge variant={currentStatus.variant} className="gap-1">
                    <currentStatus.icon className="h-3 w-3" />
                    {currentStatus.label}
                  </Badge>
                )}
              </div>
              <p className="text-muted-foreground">
                {isEditing
                  ? 'Atualize as informações do seu filme'
                  : 'Preencha os dados para enviar seu filme para avaliação'}
              </p>
            </div>
          </div>

          {/* Rejection reason if applicable */}
          {movie?.status === 'rejected' && (
            <div className="p-4 rounded-lg border border-destructive/50 bg-destructive/10">
              <p className="text-sm text-destructive font-medium">
                Seu filme foi recusado. Por favor, faça as correções necessárias e envie novamente.
              </p>
            </div>
          )}

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-8">
            {/* Basic Info */}
            <div className="space-y-4">
              <h2 className="text-lg font-semibold border-b border-border pb-2">
                Informações Básicas
              </h2>
              
              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2 md:col-span-2">
                  <Label htmlFor="title">Título *</Label>
                  <Input
                    id="title"
                    value={formData.title}
                    onChange={(e) => setFormData(prev => ({ ...prev, title: e.target.value }))}
                    placeholder="Nome do filme"
                    required
                  />
                </div>

                <div className="space-y-2 md:col-span-2">
                  <Label htmlFor="synopsis">Sinopse *</Label>
                  <Textarea
                    id="synopsis"
                    value={formData.synopsis}
                    onChange={(e) => setFormData(prev => ({ ...prev, synopsis: e.target.value }))}
                    placeholder="Descrição do filme..."
                    rows={4}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="year">Ano de Produção</Label>
                  <Input
                    id="year"
                    type="number"
                    min={1900}
                    max={2100}
                    value={formData.year}
                    onChange={(e) => setFormData(prev => ({ ...prev, year: parseInt(e.target.value) || 0 }))}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="duration">Duração (minutos)</Label>
                  <Input
                    id="duration"
                    type="number"
                    min={1}
                    max={600}
                    value={formData.duration}
                    onChange={(e) => setFormData(prev => ({ ...prev, duration: parseInt(e.target.value) || 0 }))}
                  />
                </div>
              </div>
            </div>

            {/* Genres */}
            <div className="space-y-4">
              <h2 className="text-lg font-semibold border-b border-border pb-2">
                Gêneros
              </h2>
              
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                {genres?.map((genre) => (
                  <label
                    key={genre.id}
                    className="flex items-center gap-2 cursor-pointer"
                  >
                    <Checkbox
                      checked={formData.genre_ids.includes(genre.id)}
                      onCheckedChange={() => handleGenreToggle(genre.id)}
                    />
                    <span className="text-sm">{genre.name}</span>
                  </label>
                ))}
              </div>
            </div>

            {/* Media */}
            <div className="space-y-4">
              <h2 className="text-lg font-semibold border-b border-border pb-2">
                Mídia
              </h2>
              
              <div className="grid gap-6 md:grid-cols-2">
                <div className="space-y-2">
                  <Label>Capa do Filme (2:3) *</Label>
                  <ImageUploader
                    value={formData.thumbnail_url}
                    onChange={(url) => setFormData(prev => ({ ...prev, thumbnail_url: url }))}
                    aspectRatio="thumbnail"
                  />
                </div>

                <div className="space-y-2">
                  <Label>Banner (16:9)</Label>
                  <ImageUploader
                    value={formData.backdrop_url}
                    onChange={(url) => setFormData(prev => ({ ...prev, backdrop_url: url }))}
                    aspectRatio="backdrop"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label>Vídeo do Filme *</Label>
                <VideoUploader
                  value={formData.video_url}
                  onChange={(url) => setFormData(prev => ({ ...prev, video_url: url }))}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="trailer_url">URL do Trailer (YouTube Embed)</Label>
                <Input
                  id="trailer_url"
                  value={formData.trailer_url}
                  onChange={(e) => setFormData(prev => ({ ...prev, trailer_url: e.target.value }))}
                  placeholder="https://www.youtube.com/embed/..."
                />
                <p className="text-xs text-muted-foreground">
                  Opcional: adicione um link do YouTube para o trailer do filme
                </p>
              </div>
            </div>

            {/* Info Box */}
            <div className="p-4 rounded-lg bg-muted/50 border border-border">
              <div className="flex items-start gap-3">
                <Clock className="h-5 w-5 text-muted-foreground mt-0.5" />
                <div>
                  <p className="font-medium">Processo de Aprovação</p>
                  <p className="text-sm text-muted-foreground">
                    Após enviar seu filme, ele será revisado pela nossa equipe. 
                    Você receberá uma notificação quando o status for atualizado.
                  </p>
                </div>
              </div>
            </div>

            {/* Submit */}
            <div className="flex flex-wrap items-center gap-4 pt-4 border-t border-border">
              <Button type="submit" disabled={isSaving} className="min-w-32">
                {isSaving ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Enviando...
                  </>
                ) : (
                  <>
                    <Save className="h-4 w-4 mr-2" />
                    {isEditing ? 'Reenviar para Avaliação' : 'Enviar para Avaliação'}
                  </>
                )}
              </Button>
              <Button 
                type="button" 
                variant="secondary"
                disabled={isSaving}
                onClick={handleSaveDraft}
              >
                Salvar como Rascunho
              </Button>
              <Link to="/producer/movies">
                <Button type="button" variant="outline">
                  Cancelar
                </Button>
              </Link>
            </div>
          </form>
        </motion.div>
      </div>
    </Layout>
  );
}
