import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { ArrowLeft, Save, Loader2, Upload } from 'lucide-react';
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
import { useCreateMovie } from '@/hooks/useMovies';
import { useSeriesListAdmin, useSeriesParent } from '@/hooks/useSeriesEpisodes';
import { useGenresByContentType } from '@/hooks/useGenres';
import { useToast } from '@/hooks/use-toast';
import { Navigate, Link } from 'react-router-dom';
import type { ContentType, AgeRating, SubscriptionTier } from '@/types/movie';

type VideoType = 'filme' | 'espetaculo' | 'episodio';

export default function UploadVideo() {
  const navigate = useNavigate();
  const { hasRole, isLoading: authLoading } = useAuth();
  const createMovie = useCreateMovie();
  const { toast } = useToast();

  // What type of video
  const [videoType, setVideoType] = useState<VideoType>('filme');

  // Series linking (for episodes)
  const [selectedSeriesId, setSelectedSeriesId] = useState<string | null>(null);
  const { data: seriesList, isLoading: seriesLoading } = useSeriesListAdmin();
  const { data: selectedSeriesData } = useSeriesParent(selectedSeriesId || undefined);

  // Episode fields
  const [episodeTitle, setEpisodeTitle] = useState('');
  const [episodeSynopsis, setEpisodeSynopsis] = useState('');
  const [episodeDuration, setEpisodeDuration] = useState<number>(30);
  const [episodeThumbnail, setEpisodeThumbnail] = useState('');
  const [seasonNumber, setSeasonNumber] = useState<number | null>(1);
  const [currentEpisode, setCurrentEpisode] = useState<number | null>(1);

  // Standalone video fields (filme / espetaculo)
  const [title, setTitle] = useState('');
  const [synopsis, setSynopsis] = useState('');
  const [year, setYear] = useState(new Date().getFullYear());
  const [duration, setDuration] = useState(90);
  const [producerName, setProducerName] = useState('');
  const [thumbnailUrl, setThumbnailUrl] = useState('');
  const [backdropUrl, setBackdropUrl] = useState('');
  const [ageRating, setAgeRating] = useState<AgeRating>('L');
  const [minTier, setMinTier] = useState<SubscriptionTier>('free');
  const [genreIds, setGenreIds] = useState<string[]>([]);

  // Video file
  const [videoUrl, setVideoUrl] = useState('');

  const contentTypeForGenres: ContentType = videoType === 'episodio' ? 'serie' : videoType;
  const { data: genres, isLoading: genresLoading } = useGenresByContentType(contentTypeForGenres);

  if (!authLoading && !hasRole('admin')) {
    return <Navigate to="/" replace />;
  }

  const isEpisode = videoType === 'episodio';

  const handleGenreToggle = (genreId: string) => {
    setGenreIds(prev =>
      prev.includes(genreId) ? prev.filter(id => id !== genreId) : [...prev, genreId]
    );
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!videoUrl) {
      toast({ title: 'Erro', description: 'O vídeo é obrigatório.', variant: 'destructive' });
      return;
    }

    if (isEpisode) {
      if (!selectedSeriesId) {
        toast({ title: 'Erro', description: 'Selecione a série para vincular o episódio.', variant: 'destructive' });
        return;
      }
      if (!episodeTitle.trim()) {
        toast({ title: 'Erro', description: 'O título do episódio é obrigatório.', variant: 'destructive' });
        return;
      }

      try {
        await createMovie.mutateAsync({
          title: episodeTitle,
          synopsis: episodeSynopsis,
          year: selectedSeriesData?.year || year,
          duration: episodeDuration,
          rating: 0,
          status: 'published',
          featured: false,
          min_tier: selectedSeriesData?.min_tier || 'free',
          thumbnail_url: episodeThumbnail || selectedSeriesData?.thumbnail_url || '',
          backdrop_url: selectedSeriesData?.backdrop_url || '',
          video_url: videoUrl,
          trailer_url: '',
          producer_name: selectedSeriesData?.producer_name || '',
          producer_type: selectedSeriesData?.producer_type || 'studio',
          genre_ids: selectedSeriesData?.genres?.map(g => g.id) || [],
          content_type: 'serie',
          total_episodes: selectedSeriesData?.total_episodes || null,
          total_seasons: selectedSeriesData?.total_seasons || null,
          current_episode: currentEpisode,
          season_number: seasonNumber,
          age_rating: selectedSeriesData?.age_rating || 'L',
          language: selectedSeriesData?.language || 'portugues',
          series_id: selectedSeriesId,
        });

        toast({ title: 'Episódio adicionado', description: `"${episodeTitle}" foi vinculado à série com sucesso.` });
        navigate('/admin/movies');
      } catch (error) {
        console.error('Error adding episode:', error);
        toast({ title: 'Erro', description: 'Não foi possível adicionar o episódio.', variant: 'destructive' });
      }
    } else {
      // Standalone video (filme or espetaculo)
      if (!title.trim()) {
        toast({ title: 'Erro', description: 'O título é obrigatório.', variant: 'destructive' });
        return;
      }

      try {
        await createMovie.mutateAsync({
          title,
          synopsis,
          year,
          duration,
          rating: 0,
          status: 'published',
          featured: false,
          min_tier: minTier,
          thumbnail_url: thumbnailUrl,
          backdrop_url: backdropUrl,
          video_url: videoUrl,
          trailer_url: '',
          producer_name: producerName,
          producer_type: 'studio',
          genre_ids: genreIds,
          content_type: videoType as ContentType,
          total_episodes: null,
          total_seasons: null,
          current_episode: null,
          season_number: null,
          age_rating: ageRating,
          language: 'portugues',
          series_id: null,
        });

        const label = videoType === 'espetaculo' ? 'Espetáculo' : 'Filme';
        toast({ title: `${label} criado`, description: `"${title}" foi cadastrado com sucesso.` });
        navigate('/admin/movies');
      } catch (error) {
        console.error('Error creating content:', error);
        toast({ title: 'Erro', description: 'Não foi possível salvar.', variant: 'destructive' });
      }
    }
  };

  const isLoading = authLoading || seriesLoading || genresLoading;
  const isSaving = createMovie.isPending;

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
      <div className="container py-8 max-w-3xl">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
          {/* Header */}
          <div className="flex items-center gap-4">
            <Link to="/admin/movies">
              <Button variant="ghost" size="icon"><ArrowLeft className="h-5 w-5" /></Button>
            </Link>
            <div>
              <h1 className="text-2xl font-bold">Subir Vídeo</h1>
              <p className="text-muted-foreground">Envie um vídeo e vincule a um conteúdo.</p>
            </div>
          </div>

          <form onSubmit={handleSubmit} className="space-y-8">
            {/* Step 1: What type */}
            <div className="space-y-4">
              <h2 className="text-lg font-semibold border-b border-border pb-2">Tipo do Vídeo</h2>
              <div className="space-y-2">
                <Label>Este vídeo é de:</Label>
                <Select value={videoType} onValueChange={(v: VideoType) => setVideoType(v)}>
                  <SelectTrigger className="max-w-md"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="filme">Filme</SelectItem>
                    <SelectItem value="espetaculo">Espetáculo</SelectItem>
                    <SelectItem value="episodio">Episódio de Série</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Episode: select series */}
            {isEpisode && (
              <div className="space-y-4 p-4 rounded-lg border-2 border-primary/30 bg-primary/5">
                <h2 className="text-lg font-semibold border-b border-border pb-2">Vincular à Série</h2>

                <div className="space-y-2">
                  <Label>Qual série? *</Label>
                  <Select value={selectedSeriesId || 'none'} onValueChange={(v) => setSelectedSeriesId(v === 'none' ? null : v)}>
                    <SelectTrigger className="max-w-md"><SelectValue placeholder="Selecione a série" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none" disabled>Selecione a série</SelectItem>
                      {seriesList?.map((s) => (
                        <SelectItem key={s.id} value={s.id}>{s.title}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {seriesList?.length === 0 && (
                    <p className="text-sm text-muted-foreground">Nenhuma série encontrada. <Link to="/admin/series/new" className="text-primary underline">Crie uma série primeiro.</Link></p>
                  )}
                </div>

                {selectedSeriesId && (
                  <div className="space-y-4 pt-4 border-t border-border/50">
                    <h3 className="text-md font-semibold">Dados do Episódio</h3>

                    <div className="space-y-2">
                      <Label htmlFor="ep_title">Título do Episódio *</Label>
                      <Input id="ep_title" value={episodeTitle} onChange={(e) => setEpisodeTitle(e.target.value)} placeholder="Ex: A Ilha" required />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="ep_synopsis">Sinopse do Episódio</Label>
                      <Textarea id="ep_synopsis" value={episodeSynopsis} onChange={(e) => setEpisodeSynopsis(e.target.value)} placeholder="Descrição deste episódio..." rows={3} />
                    </div>

                    <div className="grid gap-4 md:grid-cols-3">
                      <div className="space-y-2">
                        <Label htmlFor="ep_season">Temporada *</Label>
                        <Input id="ep_season" type="number" min={1} max={100} value={seasonNumber || ''} onChange={(e) => setSeasonNumber(parseInt(e.target.value) || null)} placeholder="1" />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="ep_number">Episódio *</Label>
                        <Input id="ep_number" type="number" min={1} max={999} value={currentEpisode || ''} onChange={(e) => setCurrentEpisode(parseInt(e.target.value) || null)} placeholder="1" />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="ep_duration">Duração (min) *</Label>
                        <Input id="ep_duration" type="number" min={1} max={600} value={episodeDuration} onChange={(e) => setEpisodeDuration(parseInt(e.target.value) || 0)} placeholder="45" />
                      </div>
                    </div>

                    <div className="space-y-2">
                      <Label>Capa do Episódio (opcional)</Label>
                      <ImageUploader value={episodeThumbnail} onChange={setEpisodeThumbnail} aspectRatio="backdrop" />
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Standalone video fields */}
            {!isEpisode && (
              <div className="space-y-4">
                <h2 className="text-lg font-semibold border-b border-border pb-2">
                  Informações do {videoType === 'espetaculo' ? 'Espetáculo' : 'Filme'}
                </h2>

                <div className="space-y-2">
                  <Label htmlFor="title">Título *</Label>
                  <Input id="title" value={title} onChange={(e) => setTitle(e.target.value)} placeholder={`Nome do ${videoType === 'espetaculo' ? 'espetáculo' : 'filme'}`} required />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="synopsis">Sinopse</Label>
                  <Textarea id="synopsis" value={synopsis} onChange={(e) => setSynopsis(e.target.value)} placeholder="Descrição..." rows={4} />
                </div>

                <div className="grid gap-4 md:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="year">Ano</Label>
                    <Input id="year" type="number" min={1900} max={2100} value={year} onChange={(e) => setYear(parseInt(e.target.value) || 0)} />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="duration">Duração (min)</Label>
                    <Input id="duration" type="number" min={1} max={600} value={duration} onChange={(e) => setDuration(parseInt(e.target.value) || 0)} />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="producer">Produtora</Label>
                    <Input id="producer" value={producerName} onChange={(e) => setProducerName(e.target.value)} placeholder="Nome da produtora" />
                  </div>
                  <div className="space-y-2">
                    <Label>Classificação Etária</Label>
                    <Select value={ageRating} onValueChange={(v: AgeRating) => setAgeRating(v)}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
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
                    <Label>Tier Mínimo</Label>
                    <Select value={minTier} onValueChange={(v: SubscriptionTier) => setMinTier(v)}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="free">Grátis</SelectItem>
                        <SelectItem value="standard">Standard</SelectItem>
                        <SelectItem value="premium">Premium</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                {/* Genres */}
                <div className="space-y-2 pt-4">
                  <Label>Gêneros</Label>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                    {genres?.map((genre) => (
                      <label key={genre.id} className="flex items-center gap-2 cursor-pointer">
                        <Checkbox checked={genreIds.includes(genre.id)} onCheckedChange={() => handleGenreToggle(genre.id)} />
                        <span className="text-sm">{genre.name}</span>
                      </label>
                    ))}
                  </div>
                </div>

                {/* Images */}
                <div className="grid gap-6 md:grid-cols-2 pt-4">
                  <div className="space-y-2">
                    <Label>Thumbnail (2:3)</Label>
                    <ImageUploader value={thumbnailUrl} onChange={setThumbnailUrl} aspectRatio="thumbnail" />
                  </div>
                  <div className="space-y-2">
                    <Label>Backdrop (16:9)</Label>
                    <ImageUploader value={backdropUrl} onChange={setBackdropUrl} aspectRatio="backdrop" />
                  </div>
                </div>
              </div>
            )}

            {/* Video Upload - always shown */}
            <div className="space-y-4">
              <h2 className="text-lg font-semibold border-b border-border pb-2">Vídeo *</h2>
              <VideoUploader value={videoUrl} onChange={setVideoUrl} />
            </div>

            {/* Submit */}
            <div className="flex items-center gap-4 pt-4 border-t border-border">
              <Button type="submit" disabled={isSaving} className="min-w-32">
                {isSaving ? (
                  <><Loader2 className="h-4 w-4 mr-2 animate-spin" />Salvando...</>
                ) : (
                  <><Upload className="h-4 w-4 mr-2" />{isEpisode ? 'Adicionar Episódio' : videoType === 'espetaculo' ? 'Criar Espetáculo' : 'Criar Filme'}</>
                )}
              </Button>
              <Link to="/admin/movies">
                <Button type="button" variant="outline">Cancelar</Button>
              </Link>
            </div>
          </form>
        </motion.div>
      </div>
    </Layout>
  );
}
