import { motion } from 'framer-motion';
import { cn } from '@/lib/utils';
import { genres } from '@/data/mockMovies';

interface TrailerFiltersProps {
  selectedGenre: string | null;
  onGenreChange: (genre: string | null) => void;
}

export const TrailerFilters = ({ selectedGenre, onGenreChange }: TrailerFiltersProps) => {
  return (
    <div className="flex items-center gap-2 overflow-x-auto pb-2 scrollbar-hide">
      <motion.button
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.95 }}
        onClick={() => onGenreChange(null)}
        className={cn(
          'px-4 py-2 rounded-full text-sm font-medium whitespace-nowrap transition-all',
          selectedGenre === null
            ? 'bg-primary text-primary-foreground'
            : 'bg-secondary text-muted-foreground hover:text-foreground'
        )}
      >
        Todos
      </motion.button>
      {genres.map((genre) => (
        <motion.button
          key={genre.id}
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          onClick={() => onGenreChange(genre.name)}
          className={cn(
            'px-4 py-2 rounded-full text-sm font-medium whitespace-nowrap transition-all',
            selectedGenre === genre.name
              ? 'bg-primary text-primary-foreground'
              : 'bg-secondary text-muted-foreground hover:text-foreground'
          )}
        >
          {genre.name}
        </motion.button>
      ))}
    </div>
  );
};
