import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Play, Star } from 'lucide-react';
import { Movie } from '@/data/mockMovies';
import { cn } from '@/lib/utils';

interface MovieCardProps {
  movie: Movie;
  index?: number;
  variant?: 'default' | 'featured' | 'compact';
}

export const MovieCard = ({ movie, index = 0, variant = 'default' }: MovieCardProps) => {
  const isFeatured = variant === 'featured';
  const isCompact = variant === 'compact';

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
          src={isFeatured ? movie.backdrop : movie.thumbnail}
          alt={movie.title}
          className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
          loading="lazy"
        />

        {/* Overlay Gradient */}
        <div className="absolute inset-0 bg-gradient-to-t from-cinema-black via-cinema-black/40 to-transparent opacity-80" />

        {/* Play Button Overlay */}
        <div className="absolute inset-0 flex items-center justify-center opacity-0 transition-opacity duration-300 group-hover:opacity-100">
          <div className="flex h-14 w-14 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-lg transition-transform duration-300 group-hover:scale-110">
            <Play className="h-6 w-6 fill-current" />
          </div>
        </div>

        {/* Content */}
        <div className="absolute inset-x-0 bottom-0 p-4">
          <div className="flex items-center gap-2 mb-2">
            {movie.genre.slice(0, 2).map((g) => (
              <span
                key={g}
                className="px-2 py-0.5 text-xs font-medium rounded-full bg-secondary/80 text-secondary-foreground backdrop-blur-sm"
              >
                {g}
              </span>
            ))}
          </div>
          
          <h3 className="text-lg font-semibold text-foreground line-clamp-1 group-hover:text-primary transition-colors">
            {movie.title}
          </h3>
          
          <div className="mt-1 flex items-center gap-3 text-sm text-muted-foreground">
            <span>{movie.year}</span>
            <span className="flex items-center gap-1">
              <Star className="h-3.5 w-3.5 fill-primary text-primary" />
              {movie.rating}
            </span>
            <span>{Math.floor(movie.duration / 60)}h {movie.duration % 60}m</span>
          </div>

          {isFeatured && (
            <p className="mt-2 text-sm text-muted-foreground line-clamp-2">
              {movie.synopsis}
            </p>
          )}
        </div>
      </Link>
    </motion.div>
  );
};
