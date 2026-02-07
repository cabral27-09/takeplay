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

  // Series mode: 'new' = create new series, 'existing' = add episode to existing series
  const [seriesMode, setSeriesMode] = useState<'new' | 'existing'>('new');
  const [selectedSeriesId, setSelectedSeriesId] = useState<string | null>(null);

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
    age_rating: 'L',
    language: 'portugues',
    series_id: null,
  });

  // Fetch genres based on content type - must be after formData declaration
  const { data: genres, isLoading: genresLoading } = useGenresByContentType(formData.content_type);
  
  // Fetch producer's series list for the dropdown
  const { data: producerSeries, isLoading: producerSeriesLoading } = useProducerSeriesList(profile?.full_name);
  
  // Fetch selected series data for auto-fill
  const { data: selectedSeriesData, isLoading: seriesParentLoading } = useSeriesParent(
    seriesMode === 'existing' ? selectedSeriesId || undefined : undefined
  );

  // Set producer name from profile
  useEffect(() => {
    if (profile?.full_name && !isEditing) {
      setFormData(prev => ({ ...prev, producer_name: profile.full_name || '' }));
    }
  }, [profile, isEditing]);

  // Auto-fill form when selecting an existing series - inherit ALL fields from parent
  useEffect(() => {
    if (selectedSeriesData && seriesMode === 'existing') {
      console.log('Auto-filling from series:', selectedSeriesData);
      setFormData(prev => ({
        ...prev,
        // Tipo de conteúdo (sempre série quando vem da série pai)
        content_type: selectedSeriesData.content_type || 'serie',
        
        // Identificação
        series_id: selectedSeriesData.id,
        title: selectedSeriesData.title,
        
        // Detalhes
        synopsis: selectedSeriesData.synopsis || '',
        year: selectedSeriesData.year || new Date().getFullYear(),
        duration: selectedSeriesData.duration || 90,
        rating: selectedSeriesData.rating || 0,
        
        // Classificação
        age_rating: selectedSeriesData.age_rating || 'L',
        language: selectedSeriesData.language || 'portugues',
        
        // Mídia
        thumbnail_url: selectedSeriesData.thumbnail_url || '',
        backdrop_url: selectedSeriesData.backdrop_url || '',
        trailer_url: selectedSeriesData.trailer_url || '',
        
        // Gêneros - herda diretamente da série pai
        genre_ids: selectedSeriesData.genres?.map(g => g.id) || [],
        
        // Estrutura da série
        total_seasons: selectedSeriesData.total_seasons || null,
        total_episodes: selectedSeriesData.total_episodes || null,
        
        // Tier e produtor
        min_tier: selectedSeriesData.min_tier || 'free',
        producer_type: selectedSeriesData.producer_type || 'individual',
        producer_name: selectedSeriesData.producer_name || prev.producer_name,
      }));
    }
  }, [selectedSeriesData, seriesMode]);

  // Reset series fields when switching modes
  useEffect(() => {
    if (seriesMode === 'new') {
      setSelectedSeriesId(null);
      // Only reset series_id, keep other fields
      setFormData(prev => ({ ...prev, series_id: null }));
    }
  }, [seriesMode]);
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

    // Validate series-specific fields
    if (formData.content_type === 'serie') {
      if (!formData.total_seasons || formData.total_seasons < 1) {
        toast({
          title: 'Erro de validação',
          description: 'Informe quantas temporadas tem a série.',
          variant: 'destructive',
        });
        return;
      }
      if (!formData.season_number || formData.season_number < 1) {
        toast({
          title: 'Erro de validação',
          description: 'Informe qual temporada é este episódio.',
          variant: 'destructive',
        });
        return;
      }
      if (!formData.current_episode || formData.current_episode < 1) {
        toast({
          title: 'Erro de validação',
          description: 'Informe qual é o número do episódio.',
          variant: 'destructive',
        });
        return;
      }
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
        // Create movie first
        const newMovie = await createMovie.mutateAsync(submitData);
        
        // Record the upload to decrement quota
        if (newMovie?.id) {
          await recordUpload(newMovie.id);
        }
        
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

  const isLoading = authLoading || (isEditing && movieLoading) || genresLoading || producerSeriesLoading;
  const isSaving = createMovie.isPending || updateMovie.isPending;
  const isExistingSeriesSelected = seriesMode === 'existing' && !!selectedSeriesData;

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

  // For new uploads, wrap with UploadGate
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
                  <h1 className="text-2xl font-bold">
                    {isEditing 
                      ? `Editar ${formData.content_type === 'serie' ? 'Série' : formData.content_type === 'espetaculo' ? 'Espetáculo' : 'Filme'}`
                      : `Enviar ${formData.content_type === 'serie' ? 'Nova Série' : formData.content_type === 'espetaculo' ? 'Novo Espetáculo' : 'Novo Filme'}`
                    }
                  </h1>
                  {currentStatus && (
                    <Badge variant={currentStatus.variant} className="gap-1">
                      <currentStatus.icon className="h-3 w-3" />
                      {currentStatus.label}
                    </Badge>
                  )}
                </div>
                <p className="text-muted-foreground">
                  Preencha os dados para enviar seu conteúdo para avaliação
                </p>
              </div>
            </div>
            {/* Show remaining uploads for new content */}
            {!isEditing && purchaseInfo.hasActivePurchase && (
              <Badge variant="outline" className="gap-1 text-sm">
                <Upload className="h-3 w-3" />
                {purchaseInfo.uploadsRemaining} uploads restantes
              </Badge>
            )}
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
            {/* Content Type Selector */}
            <div className="space-y-4">
              <h2 className="text-lg font-semibold border-b border-border pb-2">
                Tipo de Conteúdo
              </h2>
              
              <div className="space-y-2">
                <Label htmlFor="content_type">Selecione o tipo *</Label>
                <Select
                  value={formData.content_type}
                  onValueChange={(value: ContentType) => 
                    setFormData(prev => ({ 
                      ...prev, 
                      content_type: value,
                      // Reset series fields when changing type
                      total_seasons: value === 'serie' ? prev.total_seasons : null,
                      total_episodes: value === 'serie' ? prev.total_episodes : null,
                      season_number: value === 'serie' ? prev.season_number : null,
                      current_episode: value === 'serie' ? prev.current_episode : null,
                      // Clear genres when changing type (different categories)
                      genre_ids: [],
                    }))
                  }
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

            {/* Series Info - Only shown when content_type is 'serie' */}
            {formData.content_type === 'serie' && (
              <div className="space-y-4 p-4 rounded-lg border-2 border-primary/30 bg-primary/5">
                <h2 className="text-lg font-semibold border-b border-border pb-2">
                  Informações da Série
                </h2>
                
                {/* Series Mode Selection - Only for new content, not editing */}
                {!isEditing && producerSeries && producerSeries.length > 0 && (
                  <div className="space-y-4">
                    <Label>É uma série nova ou já existente?</Label>
                    <RadioGroup
                      value={seriesMode}
                      onValueChange={(value: 'new' | 'existing') => setSeriesMode(value)}
                      className="flex gap-4"
                    >
                      <div className="flex items-center space-x-2">
                        <RadioGroupItem value="new" id="series-new" />
                        <Label htmlFor="series-new" className="cursor-pointer font-normal">
                          Criar nova série
                        </Label>
                      </div>
                      <div className="flex items-center space-x-2">
                        <RadioGroupItem value="existing" id="series-existing" />
                        <Label htmlFor="series-existing" className="cursor-pointer font-normal">
                          Adicionar episódio a série existente
                        </Label>
                      </div>
                    </RadioGroup>
                  </div>
                )}

                {/* Existing Series Selector */}
                {seriesMode === 'existing' && !isEditing && (
                  <div className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="existing_series">Selecione a série *</Label>
                      <Select
                        value={selectedSeriesId || ''}
                        onValueChange={(value) => setSelectedSeriesId(value)}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Escolha uma série..." />
                        </SelectTrigger>
                        <SelectContent>
                          {producerSeries?.map((series) => (
                            <SelectItem key={series.id} value={series.id}>
                              {series.title}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    {/* Show inherited data preview */}
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
                                <Badge key={g.id} variant="secondary" className="text-xs">
                                  {g.name}
                                </Badge>
                              ))}
                              {selectedSeriesData.genres.length === 0 && (
                                <span className="text-muted-foreground italic">Nenhum gênero definido</span>
                              )}
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            <span className="text-muted-foreground">Classificação:</span>
                            <span>{selectedSeriesData.age_rating} anos</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <span className="text-muted-foreground">Idioma:</span>
                            <span className="capitalize">{selectedSeriesData.language}</span>
                          </div>
                          {selectedSeriesData.thumbnail_url && (
                            <div className="flex items-start gap-2">
                              <span className="text-muted-foreground">Thumbnail:</span>
                              <img 
                                src={selectedSeriesData.thumbnail_url} 
                                alt="Thumbnail da série" 
                                className="h-16 w-auto rounded border"
                              />
                            </div>
                          )}
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
                  </div>
                )}
                
                {/* Episode fields - Always shown for series */}
                <div className="grid gap-4 md:grid-cols-2">
                  {/* Only show total_seasons for new series */}
                  {(seriesMode === 'new' || isEditing) && (
                    <div className="space-y-2 md:col-span-2">
                      <Label htmlFor="total_seasons">Quantas temporadas tem a série? *</Label>
                      <Input
                        id="total_seasons"
                        type="number"
                        min={1}
                        max={100}
                        value={formData.total_seasons || ''}
                        onChange={(e) => setFormData(prev => ({ ...prev, total_seasons: parseInt(e.target.value) || null }))}
                        placeholder="Ex: 3"
                        disabled={isExistingSeriesSelected}
                      />
                    </div>
                  )}

                  <div className="space-y-2">
                    <Label htmlFor="season_number">Qual temporada é este vídeo? *</Label>
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
                    <Label htmlFor="current_episode">Qual episódio? *</Label>
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

                  {/* Only show total_episodes for new series */}
                  {(seriesMode === 'new' || isEditing) && (
                    <div className="space-y-2 md:col-span-2">
                      <Label htmlFor="total_episodes">Total de episódios da série (opcional)</Label>
                      <Input
                        id="total_episodes"
                        type="number"
                        min={1}
                        max={9999}
                        value={formData.total_episodes || ''}
                        onChange={(e) => setFormData(prev => ({ ...prev, total_episodes: parseInt(e.target.value) || null }))}
                        placeholder="Ex: 24"
                        disabled={isExistingSeriesSelected}
                      />
                      <p className="text-xs text-muted-foreground">
                        Informe o total de episódios considerando todas as temporadas
                      </p>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Basic Info - Hidden fields when existing series selected */}
            {!isExistingSeriesSelected && (
              <div className="space-y-4">
                <h2 className="text-lg font-semibold border-b border-border pb-2">
                  Informações Básicas
                </h2>
                
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

                  <div className="space-y-2">
                    <Label htmlFor="age_rating">Classificação Etária *</Label>
                    <Select
                      value={formData.age_rating}
                      onValueChange={(value: AgeRating) => 
                        setFormData(prev => ({ ...prev, age_rating: value }))
                      }
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="L">L - Livre para todos</SelectItem>
                        <SelectItem value="10">10 - Não recomendado para menores de 10 anos</SelectItem>
                        <SelectItem value="12">12 - Não recomendado para menores de 12 anos</SelectItem>
                        <SelectItem value="14">14 - Não recomendado para menores de 14 anos</SelectItem>
                        <SelectItem value="16">16 - Não recomendado para menores de 16 anos</SelectItem>
                        <SelectItem value="18">18 - Não recomendado para menores de 18 anos</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="language">Idioma do Áudio *</Label>
                    <Select
                      value={formData.language}
                      onValueChange={(value: ContentLanguage) => 
                        setFormData(prev => ({ ...prev, language: value }))
                      }
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
            )}

            {/* Genres - Hidden when existing series selected */}
            {!isExistingSeriesSelected && (
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
            )}

            {/* Media */}
            <div className="space-y-4">
              <h2 className="text-lg font-semibold border-b border-border pb-2">
                {isExistingSeriesSelected ? 'Vídeo do Episódio' : 'Mídia'}
              </h2>
              
              {/* Thumbnail and Backdrop - Hidden when existing series selected */}
              {!isExistingSeriesSelected && (
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
              )}

              <div className="space-y-2">
                <Label>
                  {formData.content_type === 'serie' 
                    ? 'Vídeo do Episódio *' 
                    : formData.content_type === 'espetaculo' 
                      ? 'Vídeo do Espetáculo *' 
                      : 'Vídeo do Filme *'}
                </Label>
                <VideoUploader
                  value={formData.video_url}
                  onChange={(url) => setFormData(prev => ({ ...prev, video_url: url }))}
                />
              </div>

              {/* Trailer - Hidden when existing series selected */}
              {!isExistingSeriesSelected && (
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
              )}
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

  // For editing, show content directly; for new uploads, wrap with UploadGate
  if (isEditing) {
    return content;
  }

  return <UploadGate>{content}</UploadGate>;
}
