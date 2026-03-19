import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { ArrowLeft, Save, Loader2 } from 'lucide-react';
import { Layout } from '@/components/layout/Layout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { ImageUploader } from '@/components/admin/ImageUploader';
import { useAuth } from '@/contexts/AuthContext';
import { useCreateMovie } from '@/hooks/useMovies';
import { useGenresByContentType } from '@/hooks/useGenres';
import { useToast } from '@/hooks/use-toast';
import { Navigate, Link } from 'react-router-dom';
import type { AgeRating } from '@/types/movie';

export default function CreateSeries() {
  const navigate = useNavigate();
  const { hasRole, isLoading: authLoading } = useAuth();
  const createMovie = useCreateMovie();
  const { toast } = useToast();

  const [title, setTitle] = useState('');
  const [synopsis, setSynopsis] = useState('');
  const [year, setYear] = useState(new Date().getFullYear());
  const [producerName, setProducerName] = useState('');
  const [thumbnailUrl, setThumbnailUrl] = useState('');
  const [backdropUrl, setBackdropUrl] = useState('');
  const [ageRating, setAgeRating] = useState<AgeRating>('L');
  const [totalEpisodes, setTotalEpisodes] = useState<number | null>(null);
  const [totalSeasons, setTotalSeasons] = useState<number | null>(null);
  const [genreIds, setGenreIds] = useState<string[]>([]);

  const { data: genres, isLoading: genresLoading } = useGenresByContentType('serie');

  if (!authLoading && !hasRole('admin')) {
    return <Navigate to="/" replace />;
  }

  const handleGenreToggle = (genreId: string) => {
    setGenreIds(prev =>
      prev.includes(genreId) ? prev.filter(id => id !== genreId) : [...prev, genreId]
    );
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!title.trim()) {
      toast({ title: 'Erro', description: 'O nome da série é obrigatório.', variant: 'destructive' });
      return;
    }
    if (!producerName.trim()) {
      toast({ title: 'Erro', description: 'A produtora é obrigatória.', variant: 'destructive' });
      return;
    }

    try {
      await createMovie.mutateAsync({
        title,
        synopsis,
        year,
        duration: 0,
        rating: 0,
        status: 'published',
        featured: false,
        min_tier: 'free',
        thumbnail_url: thumbnailUrl,
        backdrop_url: backdropUrl,
        video_url: '',
        trailer_url: '',
        producer_name: producerName,
        producer_type: 'studio',
        genre_ids: genreIds,
        content_type: 'serie',
        total_episodes: totalEpisodes,
        total_seasons: totalSeasons,
        current_episode: null,
        season_number: null,
        age_rating: ageRating,
        language: 'portugues',
        series_id: null,
      });

      toast({ title: 'Série criada', description: 'A série foi criada com sucesso. Agora você pode adicionar episódios.' });
      navigate('/admin/movies');
    } catch (error) {
      console.error('Error creating series:', error);
      toast({ title: 'Erro ao criar série', description: 'Tente novamente.', variant: 'destructive' });
    }
  };

  const isLoading = authLoading || genresLoading;
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
              <h1 className="text-2xl font-bold">Criar Série</h1>
              <p className="text-muted-foreground">Defina os dados da série. Depois, adicione episódios em "Subir Vídeos".</p>
            </div>
          </div>

          <form onSubmit={handleSubmit} className="space-y-8">
            {/* Nome e Sinopse */}
            <div className="space-y-4">
              <h2 className="text-lg font-semibold border-b border-border pb-2">Informações da Série</h2>

              <div className="space-y-2">
                <Label htmlFor="title">Nome da Série *</Label>
                <Input id="title" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Ex: O Papo Faz Curva" required />
              </div>

              <div className="space-y-2">
                <Label htmlFor="synopsis">Sinopse</Label>
                <Textarea id="synopsis" value={synopsis} onChange={(e) => setSynopsis(e.target.value)} placeholder="Descrição geral da série..." rows={4} />
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="year">Ano</Label>
                  <Input id="year" type="number" min={1900} max={2100} value={year} onChange={(e) => setYear(parseInt(e.target.value) || 0)} />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="producer_name">Produtora *</Label>
                  <Input id="producer_name" value={producerName} onChange={(e) => setProducerName(e.target.value)} placeholder="Nome da produtora" required />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="age_rating">Classificação Etária</Label>
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
                  <Label htmlFor="total_seasons">Temporadas</Label>
                  <Input id="total_seasons" type="number" min={1} max={100} value={totalSeasons || ''} onChange={(e) => setTotalSeasons(parseInt(e.target.value) || null)} placeholder="Ex: 3" />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="total_episodes">Total de Episódios</Label>
                  <Input id="total_episodes" type="number" min={1} max={9999} value={totalEpisodes || ''} onChange={(e) => setTotalEpisodes(parseInt(e.target.value) || null)} placeholder="Ex: 24" />
                </div>
              </div>
            </div>

            {/* Gêneros */}
            <div className="space-y-4">
              <h2 className="text-lg font-semibold border-b border-border pb-2">Gêneros</h2>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                {genres?.map((genre) => (
                  <label key={genre.id} className="flex items-center gap-2 cursor-pointer">
                    <Checkbox checked={genreIds.includes(genre.id)} onCheckedChange={() => handleGenreToggle(genre.id)} />
                    <span className="text-sm">{genre.name}</span>
                  </label>
                ))}
              </div>
            </div>

            {/* Capas */}
            <div className="space-y-4">
              <h2 className="text-lg font-semibold border-b border-border pb-2">Capas</h2>
              <div className="grid gap-6 md:grid-cols-2">
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

            {/* Submit */}
            <div className="flex items-center gap-4 pt-4 border-t border-border">
              <Button type="submit" disabled={isSaving} className="min-w-32">
                {isSaving ? (
                  <><Loader2 className="h-4 w-4 mr-2 animate-spin" />Criando...</>
                ) : (
                  <><Save className="h-4 w-4 mr-2" />Criar Série</>
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
