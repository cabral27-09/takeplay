import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { motion } from 'framer-motion';
import { ArrowLeft, Save, Loader2, Clock, CheckCircle, XCircle, Film, Upload, Info } from 'lucide-react';
import { Layout } from '@/components/layout/Layout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { VideoUploader } from '@/components/admin/VideoUploader';
import { ImageUploader } from '@/components/admin/ImageUploader';
import { UploadGate } from '@/components/producer/UploadGate';
import { useAuth } from '@/contexts/AuthContext';
import { useMovie, useCreateMovie, useUpdateMovie } from '@/hooks/useMovies';
import { useGenresByContentType } from '@/hooks/useGenres';
import { useProducerPurchase } from '@/hooks/useProducerPurchase';
import { useProducerSeriesList, useSeriesParent } from '@/hooks/useSeriesEpisodes';
import { useToast } from '@/hooks/use-toast';
import { Navigate, Link } from 'react-router-dom';
import type { MovieFormData, MovieStatus, AgeRating, ContentLanguage, ContentType } from '@/types/movie';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

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
  const createMovie = useCreateMovie();
  const updateMovie = useUpdateMovie();
  const { purchaseInfo, recordUpload } = useProducerPurchase();
  const { toast } = useToast();

  // Series mode: 'new' = create new series parent, 'existing' = add episode to existing series
  const [seriesMode, setSeriesMode] = useState<'new' | 'existing'>('new');
  const [selectedSeriesId, setSelectedSeriesId] = useState<string | null>(null);

  const [formData, setFormData] = useState<MovieFormData>({
    title: '',
    synopsis: '',
    year: new Date().getFullYear(),
    duration: 90,
    rating: 0,
    status: 'pending_review',
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
    age_rating: 'L',
    language: 'portugues',
    series_id: null,
  });

  // Episode-specific fields (only used when adding episode to existing series)
  const [episodeTitle, setEpisodeTitle] = useState('');
  const [episodeDuration, setEpisodeDuration] = useState(30);
  const [episodeThumbnail, setEpisodeThumbnail] = useState('');

  const { data: genres, isLoading: genresLoading } = useGenresByContentType(formData.content_type);
  const { data: producerSeries, isLoading: producerSeriesLoading } = useProducerSeriesList(profile?.full_name);
  const { data: selectedSeriesData, isLoading: seriesParentLoading } = useSeriesParent(
    seriesMode === 'existing' ? selectedSeriesId || undefined : undefined
  );

  // Determine if we're in "create series parent" mode (no video needed)
  const isCreatingSeriesParent = formData.content_type === 'serie' && seriesMode === 'new' && !isEditing;
  // Determine if we're adding an episode to existing series
  const isAddingEpisode = formData.content_type === 'serie' && seriesMode === 'existing' && !isEditing;
  const isExistingSeriesSelected = isAddingEpisode && !!selectedSeriesData;

  // Set producer name from profile
  useEffect(() => {
    if (profile?.full_name && !isEditing) {
      setFormData(prev => ({ ...prev, producer_name: profile.full_name || '' }));
    }
  }, [profile, isEditing]);

  // Auto-fill form when selecting an existing series
  useEffect(() => {
    if (selectedSeriesData && seriesMode === 'existing') {
      setFormData(prev => ({
        ...prev,
        content_type: selectedSeriesData.content_type || 'serie',
        series_id: selectedSeriesData.id,
        title: selectedSeriesData.title,
        synopsis: selectedSeriesData.synopsis || '',
        year: selectedSeriesData.year || new Date().getFullYear(),
        duration: selectedSeriesData.duration || 90,
        rating: selectedSeriesData.rating || 0,
        age_rating: selectedSeriesData.age_rating || 'L',
        language: selectedSeriesData.language || 'portugues',
        thumbnail_url: selectedSeriesData.thumbnail_url || '',
        backdrop_url: selectedSeriesData.backdrop_url || '',
        trailer_url: selectedSeriesData.trailer_url || '',
        genre_ids: selectedSeriesData.genres?.map(g => g.id) || [],
        total_seasons: selectedSeriesData.total_seasons || null,
        total_episodes: selectedSeriesData.total_episodes || null,
        min_tier: selectedSeriesData.min_tier || 'free',
        producer_type: selectedSeriesData.producer_type || 'individual',
        producer_name: selectedSeriesData.producer_name || prev.producer_name,
      }));
    }
  }, [selectedSeriesData, seriesMode, selectedSeriesId]);

  // Reset series fields when switching modes
  useEffect(() => {
    if (seriesMode === 'new') {
      setSelectedSeriesId(null);
      setFormData(prev => ({ ...prev, series_id: null }));
      setEpisodeTitle('');
      setEpisodeDuration(30);
      setEpisodeThumbnail('');
    }
  }, [seriesMode]);

  // Populate form when editing
  useEffect(() => {
    if (movie && isEditing) {
      const allowedStatuses: MovieStatus[] = ['draft', 'pending_review', 'rejected'];
      if (!allowedStatuses.includes(movie.status)) {
        toast({ title: 'Acesso negado', description: 'Este conteúdo não pode mais ser editado.', variant: 'destructive' });
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
        age_rating: movie.age_rating || 'L',
        language: movie.language || 'portugues',
        series_id: movie.series_id || null,
      });
    }
  }, [movie, isEditing, navigate, toast]);

  // Redirect non-producers
  if (!authLoading && !hasRole('producer') && !hasRole('admin')) {
    return <Navigate to="/" replace />;
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Validation for creating series parent
    if (isCreatingSeriesParent) {
      if (!formData.title.trim()) {
        toast({ title: 'Erro de validação', description: 'O título da série é obrigatório.', variant: 'destructive' });
        return;
      }
      if (!formData.total_seasons || formData.total_seasons < 1) {
        toast({ title: 'Erro de validação', description: 'Informe quantas temporadas tem a série.', variant: 'destructive' });
        return;
      }
    }
    // Validation for adding episode
    else if (isAddingEpisode) {
      if (!episodeTitle.trim()) {
        toast({ title: 'Erro de validação', description: 'O título do episódio é obrigatório.', variant: 'destructive' });
        return;
      }
      if (!formData.video_url) {
        toast({ title: 'Erro de validação', description: 'O vídeo do episódio é obrigatório.', variant: 'destructive' });
        return;
      }
      if (!formData.season_number || formData.season_number < 1) {
        toast({ title: 'Erro de validação', description: 'Informe qual temporada é este episódio.', variant: 'destructive' });
        return;
      }
      if (!formData.current_episode || formData.current_episode < 1) {
        toast({ title: 'Erro de validação', description: 'Informe o número do episódio.', variant: 'destructive' });
        return;
      }
    }
    // Validation for filme/espetaculo
    else if (!isEditing) {
      if (!formData.title.trim()) {
        toast({ title: 'Erro de validação', description: 'O título é obrigatório.', variant: 'destructive' });
        return;
      }
      if (!formData.video_url) {
        toast({ title: 'Erro de validação', description: 'O vídeo é obrigatório.', variant: 'destructive' });
        return;
      }
    }
    // Editing validation
    else {
      if (!formData.title.trim()) {
        toast({ title: 'Erro de validação', description: 'O título é obrigatório.', variant: 'destructive' });
        return;
      }
    }

    try {
      if (isCreatingSeriesParent) {
        // Create series parent record (no video)
        const submitData: MovieFormData = {
          ...formData,
          status: 'pending_review',
          producer_name: profile?.full_name || formData.producer_name,
          video_url: '', // No video for series parent
          series_id: null,
        };
        const newMovie = await createMovie.mutateAsync(submitData);
        if (newMovie?.id) {
          await recordUpload(newMovie.id);
        }
        toast({ title: 'Série criada!', description: 'A série foi criada. Agora você pode adicionar episódios a ela.' });
      } else if (isAddingEpisode) {
        // Create episode record linked to series parent
        const submitData: MovieFormData = {
          ...formData,
          title: episodeTitle, // Episode has its own title
          duration: episodeDuration,
          thumbnail_url: episodeThumbnail || formData.thumbnail_url, // Episode can have its own cover
          status: 'pending_review',
          producer_name: profile?.full_name || formData.producer_name,
        };
        const newMovie = await createMovie.mutateAsync(submitData);
        if (newMovie?.id) {
          await recordUpload(newMovie.id);
        }
        toast({ title: 'Episódio enviado!', description: 'O episódio foi enviado para avaliação.' });
      } else if (isEditing && id) {
        const submitData: MovieFormData = {
          ...formData,
          status: 'pending_review',
          producer_name: profile?.full_name || formData.producer_name,
        };
        await updateMovie.mutateAsync({ id, formData: submitData });
        toast({ title: 'Conteúdo atualizado', description: 'Enviado para avaliação.' });
      } else {
        // Filme or Espetáculo
        const submitData: MovieFormData = {
          ...formData,
          status: 'pending_review',
          producer_name: profile?.full_name || formData.producer_name,
        };
        const newMovie = await createMovie.mutateAsync(submitData);
        if (newMovie?.id) {
          await recordUpload(newMovie.id);
        }
        toast({ title: 'Conteúdo enviado!', description: 'Enviado para avaliação.' });
      }
      navigate('/producer/movies');
    } catch (error) {
      console.error('Error saving:', error);
      toast({ title: 'Erro ao salvar', description: 'Não foi possível salvar. Tente novamente.', variant: 'destructive' });
    }
  };

  const handleSaveDraft = async () => {
    if (!formData.title.trim() && !episodeTitle.trim()) {
      toast({ title: 'Erro de validação', description: 'O título é obrigatório para salvar como rascunho.', variant: 'destructive' });
      return;
    }

    try {
      const title = isAddingEpisode ? episodeTitle : formData.title;
      const draftData: MovieFormData = {
        ...formData,
        title: title,
        ...(isAddingEpisode ? { duration: episodeDuration, thumbnail_url: episodeThumbnail || formData.thumbnail_url } : {}),
        status: 'draft',
        producer_name: profile?.full_name || formData.producer_name,
        ...(isCreatingSeriesParent ? { video_url: '' } : {}),
      };

      if (isEditing && id) {
        await updateMovie.mutateAsync({ id, formData: draftData });
        toast({ title: 'Rascunho salvo' });
      } else {
        await createMovie.mutateAsync(draftData);
        toast({ title: 'Rascunho criado' });
      }
      navigate('/producer/movies');
    } catch (error) {
      console.error('Error saving draft:', error);
      toast({ title: 'Erro ao salvar', description: 'Não foi possível salvar o rascunho.', variant: 'destructive' });
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

  const isLoading = authLoading || (isEditing && movieLoading) || genresLoading || producerSeriesLoading;
  const isSaving = createMovie.isPending || updateMovie.isPending;
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

  const getHeaderTitle = () => {
    if (isEditing) {
      return `Editar ${formData.content_type === 'serie' ? 'Série/Episódio' : formData.content_type === 'espetaculo' ? 'Espetáculo' : 'Filme'}`;
    }
    if (isCreatingSeriesParent) return 'Criar Nova Série';
    if (isAddingEpisode) return 'Adicionar Episódio';
    if (formData.content_type === 'espetaculo') return 'Novo Espetáculo';
    return 'Novo Filme';
  };

  const content = (
    <Layout>
      <div className="container py-8 max-w-4xl">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="space-y-6"
        >
          {/* Header */}
          <div className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-4">
              <Link to="/producer/movies">
                <Button variant="ghost" size="icon">
                  <ArrowLeft className="h-5 w-5" />
                </Button>
              </Link>
              <div>
                <div className="flex items-center gap-3">
                  <h1 className="text-2xl font-bold">{getHeaderTitle()}</h1>
                  {currentStatus && (
                    <Badge variant={currentStatus.variant} className="gap-1">
                      <currentStatus.icon className="h-3 w-3" />
                      {currentStatus.label}
                    </Badge>
                  )}
                </div>
                <p className="text-muted-foreground">
                  {isCreatingSeriesParent
                    ? 'Cadastre os dados da série. Os episódios serão adicionados depois.'
                    : isAddingEpisode
                      ? 'Envie um episódio para uma série existente.'
                      : 'Preencha os dados para enviar seu conteúdo para avaliação'}
                </p>
              </div>
            </div>
            {!isEditing && purchaseInfo.hasActivePurchase && (
              <Badge variant="outline" className="gap-1 text-sm">
                <Upload className="h-3 w-3" />
                {purchaseInfo.uploadsRemaining} uploads restantes
              </Badge>
            )}
          </div>

          {/* Rejection reason */}
          {movie?.status === 'rejected' && (
            <div className="p-4 rounded-lg border border-destructive/50 bg-destructive/10">
              <p className="text-sm text-destructive font-medium">
                Seu conteúdo foi recusado. Faça as correções e envie novamente.
              </p>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-8">
            {/* Content Type Selector */}
            <div className="space-y-4">
              <h2 className="text-lg font-semibold border-b border-border pb-2">Tipo de Conteúdo</h2>
              <div className="space-y-2">
                <Label htmlFor="content_type">Selecione o tipo *</Label>
                <Select
                  value={formData.content_type}
                  onValueChange={(value: ContentType) =>
                    setFormData(prev => ({
                      ...prev,
                      content_type: value,
                      total_seasons: value === 'serie' ? prev.total_seasons : null,
                      total_episodes: value === 'serie' ? prev.total_episodes : null,
                      season_number: value === 'serie' ? prev.season_number : null,
                      current_episode: value === 'serie' ? prev.current_episode : null,
                      genre_ids: [],
                    }))
                  }
                  disabled={isEditing}
                >
                  <SelectTrigger className="max-w-md">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="filme">
                      <div className="flex flex-col items-start">
                        <span>Filme</span>
                        <span className="text-xs text-muted-foreground">Conteúdo de longa-metragem único</span>
                      </div>
                    </SelectItem>
                    <SelectItem value="serie">
                      <div className="flex flex-col items-start">
                        <span>Série</span>
                        <span className="text-xs text-muted-foreground">Conteúdo episódico com temporadas</span>
                      </div>
                    </SelectItem>
                    <SelectItem value="espetaculo">
                      <div className="flex flex-col items-start">
                        <span>Espetáculo</span>
                        <span className="text-xs text-muted-foreground">Teatro, circo, musicais, shows</span>
                      </div>
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* ===== SÉRIE FLOW ===== */}
            {formData.content_type === 'serie' && !isEditing && (
              <div className="space-y-4 p-4 rounded-lg border-2 border-primary/30 bg-primary/5">
                <h2 className="text-lg font-semibold border-b border-border pb-2">Fluxo da Série</h2>

                {/* Mode selection */}
                {producerSeries && producerSeries.length > 0 && (
                  <div className="space-y-4">
                    <Label>O que deseja fazer?</Label>
                    <RadioGroup
                      value={seriesMode}
                      onValueChange={(value: 'new' | 'existing') => setSeriesMode(value)}
                      className="flex gap-4"
                    >
                      <div className="flex items-center space-x-2">
                        <RadioGroupItem value="new" id="series-new" />
                        <Label htmlFor="series-new" className="cursor-pointer font-normal">Criar nova série</Label>
                      </div>
                      <div className="flex items-center space-x-2">
                        <RadioGroupItem value="existing" id="series-existing" />
                        <Label htmlFor="series-existing" className="cursor-pointer font-normal">Adicionar episódio a série existente</Label>
                      </div>
                    </RadioGroup>
                  </div>
                )}

                {/* ---- NEW SERIES: structure fields ---- */}
                {seriesMode === 'new' && (
                  <div className="grid gap-4 md:grid-cols-2">
                    <div className="space-y-2">
                      <Label htmlFor="total_seasons">Quantas temporadas? *</Label>
                      <Input
                        id="total_seasons"
                        type="number"
                        min={1}
                        max={100}
                        value={formData.total_seasons || ''}
                        onChange={(e) => setFormData(prev => ({ ...prev, total_seasons: parseInt(e.target.value) || null }))}
                        placeholder="Ex: 3"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="total_episodes">Total de episódios (todas temporadas)</Label>
                      <Input
                        id="total_episodes"
                        type="number"
                        min={1}
                        max={9999}
                        value={formData.total_episodes || ''}
                        onChange={(e) => setFormData(prev => ({ ...prev, total_episodes: parseInt(e.target.value) || null }))}
                        placeholder="Ex: 24"
                      />
                    </div>
                  </div>
                )}

                {/* ---- EXISTING SERIES: select + episode fields ---- */}
                {seriesMode === 'existing' && (
                  <div className="space-y-4">
                    <div className="space-y-2">
                      <Label>Selecione a série *</Label>
                      <Select
                        value={selectedSeriesId || ''}
                        onValueChange={(value) => setSelectedSeriesId(value)}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Escolha uma série..." />
                        </SelectTrigger>
                        <SelectContent>
                          {producerSeries?.map((series) => (
                            <SelectItem key={series.id} value={series.id}>{series.title}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    {/* Inherited data preview */}
                    {selectedSeriesData && (
                      <div className="p-4 rounded-lg bg-muted/50 border border-border space-y-2">
                        <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
                          <Info className="h-4 w-4" />
                          Dados herdados da série
                        </div>
                        <div className="grid gap-2 text-sm">
                          <div className="flex items-center gap-2">
                            <span className="text-muted-foreground">Gêneros:</span>
                            <div className="flex gap-1 flex-wrap">
                              {selectedSeriesData.genres.map(g => (
                                <Badge key={g.id} variant="secondary" className="text-xs">{g.name}</Badge>
                              ))}
                              {selectedSeriesData.genres.length === 0 && (
                                <span className="text-muted-foreground italic">Nenhum gênero</span>
                              )}
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            <span className="text-muted-foreground">Classificação:</span>
                            <span>{selectedSeriesData.age_rating} anos</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <span className="text-muted-foreground">Nível:</span>
                            <span className="capitalize">{selectedSeriesData.min_tier === 'free' ? 'Grátis' : selectedSeriesData.min_tier}</span>
                          </div>
                        </div>
                        <p className="text-xs text-muted-foreground mt-2">
                          ✓ Esses dados serão usados automaticamente para o episódio
                        </p>
                      </div>
                    )}

                    {seriesParentLoading && (
                      <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <Loader2 className="h-4 w-4 animate-spin" />
                        Carregando dados da série...
                      </div>
                    )}

                    {/* Episode-specific fields */}
                    {isExistingSeriesSelected && (
                      <div className="space-y-4 p-4 rounded-lg border border-border bg-card">
                        <h3 className="text-md font-semibold">Dados do Episódio</h3>

                        <div className="grid gap-4 md:grid-cols-2">
                          <div className="space-y-2 md:col-span-2">
                            <Label htmlFor="episode_title">Título do Episódio *</Label>
                            <Input
                              id="episode_title"
                              value={episodeTitle}
                              onChange={(e) => setEpisodeTitle(e.target.value)}
                              placeholder="Ex: O Começo de Tudo"
                              required
                            />
                          </div>

                          <div className="space-y-2">
                            <Label htmlFor="season_number">Temporada *</Label>
                            <Input
                              id="season_number"
                              type="number"
                              min={1}
                              max={formData.total_seasons || 100}
                              value={formData.season_number || ''}
                              onChange={(e) => setFormData(prev => ({ ...prev, season_number: parseInt(e.target.value) || null }))}
                              placeholder="Ex: 1"
                            />
                          </div>

                          <div className="space-y-2">
                            <Label htmlFor="current_episode">Episódio nº *</Label>
                            <Input
                              id="current_episode"
                              type="number"
                              min={1}
                              max={999}
                              value={formData.current_episode || ''}
                              onChange={(e) => setFormData(prev => ({ ...prev, current_episode: parseInt(e.target.value) || null }))}
                              placeholder="Ex: 1"
                            />
                          </div>

                          <div className="space-y-2">
                            <Label htmlFor="episode_duration">Duração (minutos) *</Label>
                            <Input
                              id="episode_duration"
                              type="number"
                              min={1}
                              max={600}
                              value={episodeDuration}
                              onChange={(e) => setEpisodeDuration(parseInt(e.target.value) || 0)}
                              placeholder="Ex: 45"
                            />
                          </div>
                        </div>

                        <div className="space-y-2">
                          <Label>Capa do Episódio (opcional — usa a da série se vazio)</Label>
                          <ImageUploader
                            value={episodeThumbnail}
                            onChange={(url) => setEpisodeThumbnail(url)}
                            aspectRatio="thumbnail"
                          />
                        </div>

                        <div className="space-y-2">
                          <Label>Vídeo do Episódio *</Label>
                          <VideoUploader
                            value={formData.video_url}
                            onChange={(url) => setFormData(prev => ({ ...prev, video_url: url }))}
                          />
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}

            {/* ===== BASIC INFO (for non-episode flows) ===== */}
            {!isAddingEpisode && (
              <>
                <div className="space-y-4">
                  <h2 className="text-lg font-semibold border-b border-border pb-2">Informações Básicas</h2>
                  <div className="grid gap-4 md:grid-cols-2">
                    <div className="space-y-2 md:col-span-2">
                      <Label htmlFor="title">
                        {formData.content_type === 'serie' ? 'Nome da Série *' : 'Título *'}
                      </Label>
                      <Input
                        id="title"
                        value={formData.title}
                        onChange={(e) => setFormData(prev => ({ ...prev, title: e.target.value }))}
                        placeholder={formData.content_type === 'serie' ? 'Nome da série' : formData.content_type === 'espetaculo' ? 'Nome do espetáculo' : 'Nome do filme'}
                        required
                      />
                    </div>

                    <div className="space-y-2 md:col-span-2">
                      <Label htmlFor="synopsis">Sinopse *</Label>
                      <Textarea
                        id="synopsis"
                        value={formData.synopsis}
                        onChange={(e) => setFormData(prev => ({ ...prev, synopsis: e.target.value }))}
                        placeholder="Descrição do conteúdo..."
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
                      <Label htmlFor="producer_name">Produtora *</Label>
                      <Input
                        id="producer_name"
                        value={formData.producer_name}
                        onChange={(e) => setFormData(prev => ({ ...prev, producer_name: e.target.value }))}
                        placeholder="Nome da produtora ou produtor"
                        required
                      />
                    </div>

                    {/* Duration - only for filme/espetaculo, not series parent */}
                    {!isCreatingSeriesParent && (
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
                    )}

                    <div className="space-y-2">
                      <Label htmlFor="age_rating">Classificação Etária *</Label>
                      <Select
                        value={formData.age_rating}
                        onValueChange={(value: AgeRating) => setFormData(prev => ({ ...prev, age_rating: value }))}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="L">L - Livre para todos</SelectItem>
                          <SelectItem value="10">10 anos</SelectItem>
                          <SelectItem value="12">12 anos</SelectItem>
                          <SelectItem value="14">14 anos</SelectItem>
                          <SelectItem value="16">16 anos</SelectItem>
                          <SelectItem value="18">18 anos</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="language">Idioma do Áudio *</Label>
                      <Select
                        value={formData.language}
                        onValueChange={(value: ContentLanguage) => setFormData(prev => ({ ...prev, language: value }))}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="portugues">Português</SelectItem>
                          <SelectItem value="ingles">Inglês</SelectItem>
                          <SelectItem value="espanhol">Espanhol</SelectItem>
                          <SelectItem value="outro">Outro</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                </div>

                {/* Genres */}
                <div className="space-y-4">
                  <h2 className="text-lg font-semibold border-b border-border pb-2">Gêneros</h2>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                    {genres?.map((genre) => (
                      <label key={genre.id} className="flex items-center gap-2 cursor-pointer">
                        <Checkbox
                          checked={formData.genre_ids.includes(genre.id)}
                          onCheckedChange={() => handleGenreToggle(genre.id)}
                        />
                        <span className="text-sm">{genre.name}</span>
                      </label>
                    ))}
                  </div>
                </div>

                {/* Access Level */}
                <div className="space-y-4">
                  <h2 className="text-lg font-semibold border-b border-border pb-2">Quem pode assistir?</h2>
                  <div className="max-w-xs">
                    <Select
                      value={formData.min_tier}
                      onValueChange={(value) => setFormData(prev => ({ ...prev, min_tier: value as 'free' | 'standard' | 'premium' }))}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="free">Grátis</SelectItem>
                        <SelectItem value="standard">Standard</SelectItem>
                        <SelectItem value="premium">Premium</SelectItem>
                      </SelectContent>
                    </Select>
                    <p className="text-xs text-muted-foreground mt-1">
                      Define qual plano é necessário para assistir este conteúdo.
                    </p>
                  </div>
                </div>

                {/* Media */}
                <div className="space-y-4">
                  <h2 className="text-lg font-semibold border-b border-border pb-2">Mídia</h2>

                  <div className="grid gap-6 md:grid-cols-2">
                    <div className="space-y-2">
                      <Label>Capa (2:3) *</Label>
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

                  {/* Video - NOT shown when creating series parent */}
                  {!isCreatingSeriesParent && (
                    <div className="space-y-2">
                      <Label>
                        {formData.content_type === 'espetaculo' ? 'Vídeo do Espetáculo *' : 'Vídeo do Filme *'}
                      </Label>
                      <VideoUploader
                        value={formData.video_url}
                        onChange={(url) => setFormData(prev => ({ ...prev, video_url: url }))}
                      />
                    </div>
                  )}

                  {isCreatingSeriesParent && (
                    <div className="p-4 rounded-lg bg-muted/50 border border-border">
                      <div className="flex items-start gap-3">
                        <Info className="h-5 w-5 text-muted-foreground mt-0.5" />
                        <div>
                          <p className="font-medium">Sem vídeo nesta etapa</p>
                          <p className="text-sm text-muted-foreground">
                            Ao criar a série, você cadastra apenas os dados gerais. Os vídeos serão adicionados depois como episódios individuais.
                          </p>
                        </div>
                      </div>
                    </div>
                  )}

                  <div className="space-y-2">
                    <Label htmlFor="trailer_url">URL do Trailer (YouTube Embed)</Label>
                    <Input
                      id="trailer_url"
                      value={formData.trailer_url}
                      onChange={(e) => setFormData(prev => ({ ...prev, trailer_url: e.target.value }))}
                      placeholder="https://www.youtube.com/embed/..."
                    />
                    <p className="text-xs text-muted-foreground">Opcional: link do YouTube para o trailer</p>
                  </div>
                </div>
              </>
            )}

            {/* ===== EDITING SERIES EPISODE (existing record) ===== */}
            {isEditing && formData.series_id && (
              <div className="p-4 rounded-lg bg-muted/50 border border-border">
                <p className="text-sm text-muted-foreground">
                  <Info className="h-4 w-4 inline mr-1" />
                  Este é um episódio vinculado a uma série. Alguns dados são herdados.
                </p>
              </div>
            )}

            {/* Approval Info */}
            <div className="p-4 rounded-lg bg-muted/50 border border-border">
              <div className="flex items-start gap-3">
                <Clock className="h-5 w-5 text-muted-foreground mt-0.5" />
                <div>
                  <p className="font-medium">Processo de Aprovação</p>
                  <p className="text-sm text-muted-foreground">
                    {isCreatingSeriesParent
                      ? 'Após criar a série, ela será revisada. Você poderá adicionar episódios a ela.'
                      : 'Após enviar, seu conteúdo será revisado pela equipe.'}
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
                    Salvando...
                  </>
                ) : (
                  <>
                    <Save className="h-4 w-4 mr-2" />
                    {isEditing
                      ? 'Reenviar para Avaliação'
                      : isCreatingSeriesParent
                        ? 'Criar Série'
                        : isAddingEpisode
                          ? 'Enviar Episódio'
                          : 'Enviar para Avaliação'}
                  </>
                )}
              </Button>
              <Button type="button" variant="secondary" disabled={isSaving} onClick={handleSaveDraft}>
                Salvar como Rascunho
              </Button>
              <Link to="/producer/movies">
                <Button type="button" variant="outline">Cancelar</Button>
              </Link>
            </div>
          </form>
        </motion.div>
      </div>
    </Layout>
  );

  if (isEditing) return content;
  return <UploadGate>{content}</UploadGate>;
}
