import { useParams, Link, useNavigate } from 'react-router-dom';
import { useMovie } from '@/hooks/useMovies';
import { SubscriptionGate } from '@/components/subscription/SubscriptionGate';
import { VideoPlayer } from '@/components/video/VideoPlayer';
import { Button } from '@/components/ui/button';
import { Film } from 'lucide-react';
import type { MovieWithGenres } from '@/types/movie';

const PREVIEW_DURATION = 60; // 1 minute in seconds

interface WatchContentProps {
  movie: MovieWithGenres;
  previewMode?: boolean;
  movieId?: string;
}

const WatchContent = ({ movie, previewMode = false, movieId }: WatchContentProps) => {
  const navigate = useNavigate();

  // If no video URL, show unavailable message
  if (!movie.video_url) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-cinema-black">
        <div className="text-center p-8 max-w-md">
          <div className="flex justify-center mb-6">
            <div className="p-4 rounded-full bg-muted">
              <Film className="h-12 w-12 text-muted-foreground" />
            </div>
          </div>
          <h2 className="text-xl font-semibold text-foreground mb-2">
            Vídeo Indisponível
          </h2>
          <p className="text-muted-foreground mb-6">
            Este filme ainda não possui um vídeo disponível para reprodução.
          </p>
          <Button onClick={() => navigate(-1)}>
            Voltar
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="h-screen w-screen bg-cinema-black">
      <VideoPlayer 
        movieId={movieId || movie.id}
        poster={movie.backdrop_url || undefined}
        title={movie.title}
        onBack={() => navigate(-1)}
        previewMode={previewMode}
        previewDuration={PREVIEW_DURATION}
      />
    </div>
  );
};

const Watch = () => {
  const { id } = useParams<{ id: string }>();
  const { data: movie, isLoading, error } = useMovie(id);

  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-cinema-black">
        <div className="animate-pulse text-muted-foreground">Carregando...</div>
      </div>
    );
  }

  if (!movie || error) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-cinema-black">
        <div className="text-center">
          <h1 className="text-2xl font-semibold text-foreground mb-4">Filme não encontrado</h1>
          <Link to="/" className="text-primary hover:underline">
            Voltar ao Início
          </Link>
        </div>
      </div>
    );
  }

  return (
    <SubscriptionGate 
      movieTitle={movie.title}
      movieTier={movie.min_tier as 'free' | 'standard' | 'premium'}
    >
      {(previewMode) => (
        <WatchContent movie={movie} previewMode={previewMode} movieId={movie.id} />
      )}
    </SubscriptionGate>
  );
};

export default Watch;
