import { useParams, Link, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Play, ArrowLeft, Star, Clock, Calendar, Film, User } from 'lucide-react';
import { Layout } from '@/components/layout/Layout';
import { Button } from '@/components/ui/button';
import { MovieRow } from '@/components/movies/MovieRow';
import { useMovie, useMovies } from '@/hooks/useMovies';
import { Skeleton } from '@/components/ui/skeleton';
import { ShareButton } from '@/components/share/ShareButton';

const MovieDetail = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { data: movie, isLoading: isLoadingMovie } = useMovie(id);
  const { data: allMovies = [] } = useMovies();

  if (isLoadingMovie) {
    return (
      <Layout>
        <div className="min-h-[70vh] bg-secondary animate-pulse" />
        <div className="container py-8">
          <Skeleton className="h-8 w-48 mb-4" />
          <div className="flex gap-4">
            {[1, 2, 3, 4, 5].map((j) => (
              <Skeleton key={j} className="w-[200px] aspect-[2/3] rounded-xl" />
            ))}
          </div>
        </div>
      </Layout>
    );
  }

  if (!movie) {
    return (
      <Layout>
        <div className="container flex min-h-screen items-center justify-center">
          <div className="text-center">
            <h1 className="text-2xl font-semibold text-foreground mb-4">Filme não encontrado</h1>
            <Link to="/">
              <Button variant="secondary">Voltar ao Início</Button>
            </Link>
          </div>
        </div>
      </Layout>
    );
  }

  // Get similar movies (same genre)
  const similarMovies = allMovies
    .filter(m => m.id !== movie.id && m.genres.some(g => movie.genres.some(mg => mg.name === g.name)))
    .slice(0, 8);

  const backdrop = movie.backdrop_url || movie.thumbnail_url || '/placeholder.svg';
  const thumbnail = movie.thumbnail_url || movie.backdrop_url || '/placeholder.svg';

  return (
    <Layout>
      {/* SEO */}
      <title>{movie.title} - IndieFlix</title>
      <meta name="description" content={movie.synopsis || ''} />

      {/* Hero Background */}
      <section className="relative min-h-[70vh] w-full overflow-hidden">
        <div className="absolute inset-0">
          <img
            src={backdrop}
            alt={movie.title}
            className="h-full w-full object-cover"
          />
          <div className="absolute inset-0 bg-gradient-to-r from-cinema-black via-cinema-black/80 to-cinema-black/50" />
          <div className="absolute inset-0 bg-gradient-to-t from-cinema-black via-transparent to-cinema-black/40" />
        </div>

        {/* Back Button */}
        <div className="container relative z-10 pt-24">
          <button
            onClick={() => navigate(-1)}
            className="flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors"
          >
            <ArrowLeft className="h-5 w-5" />
            <span>Voltar</span>
          </button>
        </div>

        {/* Content */}
        <div className="container relative z-10 flex items-end pb-16 min-h-[60vh]">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="flex flex-col md:flex-row gap-8 items-start"
          >
            {/* Poster */}
            <div className="hidden md:block w-64 flex-shrink-0">
              <img
                src={thumbnail}
                alt={movie.title}
                className="w-full rounded-xl shadow-2xl"
              />
            </div>

            {/* Info */}
            <div className="flex-1 max-w-2xl">
              {/* Title */}
              <h1 className="text-4xl md:text-5xl font-bold text-foreground mb-4">
                {movie.title}
              </h1>

              {/* Meta */}
              <div className="flex flex-wrap items-center gap-4 text-muted-foreground mb-6">
                {movie.rating && (
                  <span className="flex items-center gap-1.5">
                    <Star className="h-4 w-4 fill-primary text-primary" />
                    <span className="font-medium text-foreground">{movie.rating}</span>
                  </span>
                )}
                {movie.year && (
                  <span className="flex items-center gap-1.5">
                    <Calendar className="h-4 w-4" />
                    {movie.year}
                  </span>
                )}
                {movie.duration && (
                  <span className="flex items-center gap-1.5">
                    <Clock className="h-4 w-4" />
                    {Math.floor(movie.duration / 60)}h {movie.duration % 60}min
                  </span>
                )}
              </div>

              {/* Genres */}
              <div className="flex flex-wrap gap-2 mb-6">
                {movie.genres.map((g) => (
                  <span
                    key={g.id}
                    className="px-3 py-1 rounded-full bg-secondary text-secondary-foreground text-sm font-medium"
                  >
                    {g.name}
                  </span>
                ))}
              </div>

              {/* Synopsis */}
              {movie.synopsis && (
                <p className="text-lg text-muted-foreground leading-relaxed mb-6">
                  {movie.synopsis}
                </p>
              )}

              {/* Producer */}
              {movie.producer_name && (
                <div className="flex items-center gap-2 text-muted-foreground mb-8">
                  {movie.producer_type === 'studio' ? (
                    <Film className="h-4 w-4" />
                  ) : (
                    <User className="h-4 w-4" />
                  )}
                  <span>
                    {movie.producer_type === 'studio' ? 'Produtora' : 'Produtor'}:
                  </span>
                  <span className="text-foreground font-medium">
                    {movie.producer_name}
                  </span>
                </div>
              )}

              {/* Action Buttons */}
              <div className="flex items-center gap-4">
                <Link to={`/watch/${movie.id}`}>
                  <Button size="xl" className="gap-3">
                    <Play className="h-6 w-6 fill-current" />
                    Assistir Agora
                  </Button>
                </Link>
                <ShareButton 
                  movieId={movie.id} 
                  movieTitle={movie.title}
                />
              </div>
            </div>
          </motion.div>
        </div>
      </section>

      {/* Similar Movies */}
      {similarMovies.length > 0 && (
        <div className="pb-16">
          <MovieRow title="Você Também Pode Gostar" movies={similarMovies} />
        </div>
      )}
    </Layout>
  );
};

export default MovieDetail;
