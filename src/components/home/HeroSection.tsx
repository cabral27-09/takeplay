import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Play, Info, Star } from 'lucide-react';
import { MovieWithGenres } from '@/types/movie';
import { Button } from '@/components/ui/button';

interface HeroSectionProps {
  movie: MovieWithGenres;
}

export const HeroSection = ({ movie }: HeroSectionProps) => {
  const backdrop = movie.backdrop_url || movie.thumbnail_url || '/placeholder.svg';

  return (
    <section className="relative h-[85vh] min-h-[600px] w-full overflow-hidden">
      {/* Background Image */}
      <div className="absolute inset-0">
        <img
          src={backdrop}
          alt={movie.title}
          className="h-full w-full object-cover"
        />
        {/* Multiple gradient overlays for depth */}
        <div className="absolute inset-0 bg-gradient-to-r from-cinema-black via-cinema-black/70 to-transparent" />
        <div className="absolute inset-0 bg-gradient-to-t from-cinema-black via-transparent to-cinema-black/30" />
        <div className="absolute inset-0 bg-cinema-black/20" />
      </div>

      {/* Content */}
      <div className="container relative z-10 flex h-full items-center">
        <div className="max-w-2xl pt-20">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
          >
            {/* Featured Badge */}
            <div className="mb-4 flex items-center gap-2">
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-primary/20 text-primary text-sm font-medium border border-primary/30">
                <Star className="h-3.5 w-3.5 fill-primary" />
                Em Destaque
              </span>
            </div>

            {/* Title */}
            <h1 className="text-4xl md:text-6xl lg:text-7xl font-bold text-foreground leading-tight mb-4">
              {movie.title}
            </h1>

            {/* Meta Info */}
            <div className="flex flex-wrap items-center gap-4 text-muted-foreground mb-6">
              {movie.rating && (
                <span className="flex items-center gap-1.5">
                  <Star className="h-4 w-4 fill-primary text-primary" />
                  <span className="font-medium text-foreground">{movie.rating}</span>
                </span>
              )}
              {movie.year && <span>{movie.year}</span>}
              {movie.duration && (
                <span>{Math.floor(movie.duration / 60)}h {movie.duration % 60}min</span>
              )}
              <div className="flex gap-2">
                {movie.genres.map((g) => (
                  <span
                    key={g.id}
                    className="px-2.5 py-0.5 rounded-full bg-secondary text-secondary-foreground text-sm"
                  >
                    {g.name}
                  </span>
                ))}
              </div>
            </div>

            {/* Synopsis */}
            {movie.synopsis && (
              <p className="text-lg text-muted-foreground leading-relaxed mb-8 max-w-xl">
                {movie.synopsis}
              </p>
            )}

            {/* Producer */}
            {movie.producer_name && (
              <p className="text-sm text-muted-foreground mb-8">
                Por <span className="text-foreground font-medium">{movie.producer_name}</span>
              </p>
            )}

            {/* Action Buttons */}
            <div className="flex flex-wrap gap-4">
              <Link to={movie.content_type === 'serie' && !movie.series_id 
                ? `/movie/${movie.id}` 
                : `/watch/${movie.id}`
              }>
                <Button size="lg" className="gap-2 text-base px-8">
                  <Play className="h-5 w-5 fill-current" />
                  {movie.content_type === 'serie' && !movie.series_id ? 'Ver Episódios' : 'Assistir'}
                </Button>
              </Link>
              <Link to={`/movie/${movie.id}`}>
                <Button variant="secondary" size="lg" className="gap-2 text-base px-8">
                  <Info className="h-5 w-5" />
                  Mais Detalhes
                </Button>
              </Link>
            </div>
          </motion.div>
        </div>
      </div>

      {/* Bottom Fade */}
      <div className="absolute bottom-0 left-0 right-0 h-32 bg-gradient-to-t from-cinema-black to-transparent" />
    </section>
  );
};
