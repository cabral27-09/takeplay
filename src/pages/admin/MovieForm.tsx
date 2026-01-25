import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { motion } from 'framer-motion';
import { ArrowLeft, Save, Loader2 } from 'lucide-react';
import { Layout } from '@/components/layout/Layout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { VideoUploader } from '@/components/admin/VideoUploader';
import { ImageUploader } from '@/components/admin/ImageUploader';
import { useAuth } from '@/contexts/AuthContext';
import { useMovie, useCreateMovie, useUpdateMovie } from '@/hooks/useMovies';
import { useSeriesListAdmin } from '@/hooks/useSeriesEpisodes';
import { useGenresByContentType } from '@/hooks/useGenres';
import { useToast } from '@/hooks/use-toast';
import { Navigate, Link } from 'react-router-dom';
import type { MovieFormData, SubscriptionTier, MovieStatus, AgeRating, ContentLanguage, ContentType } from '@/types/movie';

export default function MovieForm() {
  const { id } = useParams();
  const navigate = useNavigate();
  const isEditing = !!id;
  
  const { hasRole, isLoading: authLoading } = useAuth();
  const { data: movie, isLoading: movieLoading } = useMovie(id);
  const createMovie = useCreateMovie();
  const updateMovie = useUpdateMovie();
  const { toast } = useToast();

  const [formData, setFormData] = useState<MovieFormData>({
    title: '',
    synopsis: '',
    year: new Date().getFullYear(),
    duration: 90,
    rating: 0,
    status: 'draft',
    featured: false,
    min_tier: 'free',
    thumbnail_url: '',
    backdrop_url: '',
    video_url: '',
    trailer_url: '',
    producer_name: '',
    producer_type: 'studio',
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
  
  // Fetch available series for linking episodes
  const { data: seriesList, isLoading: seriesLoading } = useSeriesListAdmin();

  // Load movie data for editing
  useEffect(() => {
    if (movie && isEditing) {
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
        producer_type: movie.producer_type || 'studio',
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
  }, [movie, isEditing]);

  // Redirect non-admins
  if (!authLoading && !hasRole('admin')) {
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

    try {
      if (isEditing && id) {
        await updateMovie.mutateAsync({ id, formData });
        toast({
          title: 'Filme atualizado',
          description: 'As alterações foram salvas com sucesso.',
        });
      } else {
        await createMovie.mutateAsync(formData);
        toast({
          title: 'Filme criado',
          description: 'O filme foi cadastrado com sucesso.',
        });
      }
      navigate('/admin/movies');
    } catch (error) {
      console.error('Error saving movie:', error);
      toast({
        title: 'Erro ao salvar',
        description: 'Não foi possível salvar o filme. Tente novamente.',
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

  const isLoading = authLoading || (isEditing && movieLoading) || genresLoading || seriesLoading;
  const isSaving = createMovie.isPending || updateMovie.isPending;

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
            <Link to="/admin/movies">
              <Button variant="ghost" size="icon">
                <ArrowLeft className="h-5 w-5" />
              </Button>
            </Link>
            <div>
              <h1 className="text-2xl font-bold">
                {isEditing 
                  ? `Editar ${formData.content_type === 'serie' ? 'Série' : formData.content_type === 'espetaculo' ? 'Espetáculo' : 'Filme'}`
                  : 'Novo Conteúdo'
                }
              </h1>
              <p className="text-muted-foreground">
                {isEditing
                  ? 'Atualize as informações do conteúdo'
                  : 'Preencha os dados para cadastrar um novo conteúdo'}
              </p>
            </div>
          </div>

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
                      total_seasons: value === 'serie' ? prev.total_seasons : null,
                      total_episodes: value === 'serie' ? prev.total_episodes : null,
                      season_number: value === 'serie' ? prev.season_number : null,
                      current_episode: value === 'serie' ? prev.current_episode : null,
                      genre_ids: [],
                    }))
                  }
                >
                  <SelectTrigger className="max-w-md">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="filme">Filme</SelectItem>
                    <SelectItem value="serie">Série</SelectItem>
                    <SelectItem value="espetaculo">Espetáculo</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Series Info */}
            {formData.content_type === 'serie' && (
              <div className="space-y-4 p-4 rounded-lg border-2 border-primary/30 bg-primary/5">
                <h2 className="text-lg font-semibold border-b border-border pb-2">
                  Informações da Série
                </h2>
                
                {/* Series Parent Selector */}
                <div className="space-y-2">
                  <Label htmlFor="series_id">Vincular a uma Série Existente</Label>
                  <p className="text-sm text-muted-foreground mb-2">
                    Deixe vazio para criar uma nova série principal, ou selecione uma série para adicionar este conteúdo como episódio.
                  </p>
                  <Select
                    value={formData.series_id || 'none'}
                    onValueChange={(value) => 
                      setFormData(prev => ({ 
                        ...prev, 
                        series_id: value === 'none' ? null : value 
                      }))
                    }
                  >
                    <SelectTrigger className="max-w-md">
                      <SelectValue placeholder="Criar nova série (não vincular)" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">➕ Criar nova série principal</SelectItem>
                      {seriesList?.filter(s => s.id !== id).map((series) => (
                        <SelectItem key={series.id} value={series.id}>
                          {series.title} {series.status !== 'published' && `(${series.status})`}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* Episode fields - only show when linking to a series */}
                {formData.series_id && (
                  <div className="grid gap-4 md:grid-cols-2 pt-4 border-t border-border/50">
                    <div className="space-y-2">
                      <Label htmlFor="season_number">Qual temporada é este episódio?</Label>
                      <Input
                        id="season_number"
                        type="number"
                        min={1}
                        max={100}
                        value={formData.season_number || ''}
                        onChange={(e) => setFormData(prev => ({ ...prev, season_number: parseInt(e.target.value) || null }))}
                        placeholder="Ex: 1"
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="current_episode">Qual episódio?</Label>
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
                  </div>
                )}

                {/* Series metadata - only show for parent series */}
                {!formData.series_id && (
                  <div className="grid gap-4 md:grid-cols-2 pt-4 border-t border-border/50">
                    <div className="space-y-2">
                      <Label htmlFor="total_seasons">Quantas temporadas tem a série?</Label>
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
                      <Label htmlFor="total_episodes">Total de episódios (opcional)</Label>
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
              </div>
            )}

            {/* Basic Info */}
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
                  <Label htmlFor="synopsis">Sinopse</Label>
                  <Textarea
                    id="synopsis"
                    value={formData.synopsis}
                    onChange={(e) => setFormData(prev => ({ ...prev, synopsis: e.target.value }))}
                    placeholder="Descrição do filme..."
                    rows={4}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="year">Ano</Label>
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
                  <Label htmlFor="duration">Duração (min)</Label>
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
                  <Label htmlFor="age_rating">Classificação Etária</Label>
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
                      <SelectItem value="L">L - Livre</SelectItem>
                      <SelectItem value="10">10 anos</SelectItem>
                      <SelectItem value="12">12 anos</SelectItem>
                      <SelectItem value="14">14 anos</SelectItem>
                      <SelectItem value="16">16 anos</SelectItem>
                      <SelectItem value="18">18 anos</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="language">Idioma</Label>
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

                <div className="space-y-2">
                  <Label htmlFor="rating">Avaliação (0-5)</Label>
                  <Input
                    id="rating"
                    type="number"
                    min={0}
                    max={5}
                    step={0.1}
                    value={formData.rating}
                    onChange={(e) => setFormData(prev => ({ ...prev, rating: parseFloat(e.target.value) || 0 }))}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="producer_name">Produtor / Estúdio</Label>
                  <Input
                    id="producer_name"
                    value={formData.producer_name}
                    onChange={(e) => setFormData(prev => ({ ...prev, producer_name: e.target.value }))}
                    placeholder="Nome do produtor ou estúdio"
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
                  <Label>Thumbnail (2:3)</Label>
                  <ImageUploader
                    value={formData.thumbnail_url}
                    onChange={(url) => setFormData(prev => ({ ...prev, thumbnail_url: url }))}
                    aspectRatio="thumbnail"
                  />
                </div>

                <div className="space-y-2">
                  <Label>Backdrop (16:9)</Label>
                  <ImageUploader
                    value={formData.backdrop_url}
                    onChange={(url) => setFormData(prev => ({ ...prev, backdrop_url: url }))}
                    aspectRatio="backdrop"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label>
                  {formData.content_type === 'serie' 
                    ? 'Vídeo do Episódio' 
                    : formData.content_type === 'espetaculo' 
                      ? 'Vídeo do Espetáculo' 
                      : 'Vídeo do Filme'}
                </Label>
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
              </div>
            </div>

            {/* Access & Status */}
            <div className="space-y-4">
              <h2 className="text-lg font-semibold border-b border-border pb-2">
                Acesso e Publicação
              </h2>
              
              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="min_tier">Tier Mínimo</Label>
                  <Select
                    value={formData.min_tier}
                    onValueChange={(value: SubscriptionTier) => 
                      setFormData(prev => ({ ...prev, min_tier: value }))
                    }
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
                </div>

                <div className="space-y-2">
                  <Label htmlFor="status">Status</Label>
                  <Select
                    value={formData.status}
                    onValueChange={(value: MovieStatus) => 
                      setFormData(prev => ({ ...prev, status: value }))
                    }
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="draft">Rascunho</SelectItem>
                      <SelectItem value="published">Publicado</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="flex items-center gap-3 p-4 rounded-lg border border-border">
                <Switch
                  id="featured"
                  checked={formData.featured}
                  onCheckedChange={(checked) => 
                    setFormData(prev => ({ ...prev, featured: checked }))
                  }
                />
                <Label htmlFor="featured" className="cursor-pointer">
                  Filme em destaque (aparece na seção principal)
                </Label>
              </div>
            </div>

            {/* Submit */}
            <div className="flex items-center gap-4 pt-4 border-t border-border">
              <Button type="submit" disabled={isSaving} className="min-w-32">
                {isSaving ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Salvando...
                  </>
                ) : (
                  <>
                    <Save className="h-4 w-4 mr-2" />
                    {isEditing ? 'Salvar Alterações' : 'Criar Filme'}
                  </>
                )}
              </Button>
              <Link to="/admin/movies">
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
