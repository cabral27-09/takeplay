import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Play, Star } from 'lucide-react';
import { MovieWithGenres } from '@/types/movie';
import { cn } from '@/lib/utils';
import { ShareButton } from '@/components/share/ShareButton';

interface MovieCardProps {
  movie: MovieWithGenres;
  index?: number;
  variant?: 'default' | 'featured' | 'compact';
}

export const MovieCard = ({ movie, index = 0, variant = 'default' }: MovieCardProps) => {
  const isFeatured = variant === 'featured';
  const isCompact = variant === 'compact';

  const thumbnail = isFeatured 
    ? (movie.backdrop_url || movie.thumbnail_url || '/placeholder.svg')
    : (movie.thumbnail_url || movie.backdrop_url || '/placeholder.svg');

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.05, duration: 0.4 }}
    >
      <Link
        to={`/movie/${movie.id}`}
        className={cn(
          'group relative block overflow-hidden rounded-xl bg-card transition-all duration-300',
          'hover:ring-2 hover:ring-primary/50 hover:shadow-glow',
          isFeatured ? 'aspect-[16/9]' : isCompact ? 'aspect-[3/4]' : 'aspect-[2/3]'
        )}
      >
        {/* Thumbnail */}
        <img
          src={thumbnail}
          alt={movie.title}
          className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
          loading="lazy"
        />

        {/* Overlay Gradient */}
        <div className="absolute inset-0 bg-gradient-to-t from-cinema-black via-cinema-black/40 to-transparent opacity-80" />

        {/* Share Button - Top Right */}
        <div className="absolute top-2 right-2 z-10 opacity-0 group-hover:opacity-100 transition-opacity duration-300">
          <ShareButton 
            movieId={movie.id} 
            movieTitle={movie.title} 
            variant="icon"
            className="bg-black/50 hover:bg-black/70 backdrop-blur-sm"
          />
        </div>

        {/* Play Button Overlay */}
        <div className="absolute inset-0 flex items-center justify-center opacity-0 transition-opacity duration-300 group-hover:opacity-100">
          <div className="flex h-14 w-14 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-lg transition-transform duration-300 group-hover:scale-110">
            <Play className="h-6 w-6 fill-current" />
          </div>
        </div>

        {/* Content */}
        <div className="absolute inset-x-0 bottom-0 p-4">
          <div className="flex items-center gap-2 mb-2">
            {movie.genres.slice(0, 2).map((g) => (
              <span
                key={g.id}
                className="px-2 py-0.5 text-xs font-medium rounded-full bg-secondary/80 text-secondary-foreground backdrop-blur-sm"
              >
                {g.name}
              </span>
            ))}
          </div>
          
          <h3 className="text-lg font-semibold text-foreground line-clamp-1 group-hover:text-primary transition-colors">
            {movie.title}
          </h3>
          
          <div className="mt-1 flex items-center gap-3 text-sm text-muted-foreground">
            {movie.year && <span>{movie.year}</span>}
            {movie.rating && (
              <span className="flex items-center gap-1">
                <Star className="h-3.5 w-3.5 fill-primary text-primary" />
                {movie.rating}
              </span>
            )}
            {movie.duration && (
              <span>{Math.floor(movie.duration / 60)}h {movie.duration % 60}m</span>
            )}
          </div>

          {isFeatured && movie.synopsis && (
            <p className="mt-2 text-sm text-muted-foreground line-clamp-2">
              {movie.synopsis}
            </p>
          )}
        </div>
      </Link>
    </motion.div>
  );
};
