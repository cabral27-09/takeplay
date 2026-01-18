import { useRef } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { motion } from 'framer-motion';
import { MovieWithGenres } from '@/types/movie';
import { MovieCard } from './MovieCard';
import { cn } from '@/lib/utils';

interface MovieRowProps {
  title: string;
  movies: MovieWithGenres[];
  variant?: 'default' | 'featured' | 'compact';
}

export const MovieRow = ({ title, movies, variant = 'default' }: MovieRowProps) => {
  const scrollRef = useRef<HTMLDivElement>(null);

  const scroll = (direction: 'left' | 'right') => {
    if (scrollRef.current) {
      const scrollAmount = scrollRef.current.clientWidth * 0.8;
      scrollRef.current.scrollBy({
        left: direction === 'left' ? -scrollAmount : scrollAmount,
        behavior: 'smooth',
      });
    }
  };

  if (movies.length === 0) return null;

  return (
    <section className="py-6 md:py-8">
      <div className="container">
        <motion.h2
          initial={{ opacity: 0, x: -20 }}
          whileInView={{ opacity: 1, x: 0 }}
          viewport={{ once: true }}
          className="text-xl md:text-2xl font-semibold text-foreground mb-4 md:mb-6"
        >
          {title}
        </motion.h2>
      </div>

      <div className="relative group">
        {/* Scroll Buttons */}
        <button
          onClick={() => scroll('left')}
          className={cn(
            'absolute left-2 top-1/2 -translate-y-1/2 z-10',
            'flex h-10 w-10 items-center justify-center rounded-full',
            'bg-card/90 backdrop-blur-sm text-foreground',
            'opacity-0 group-hover:opacity-100 transition-opacity duration-300',
            'hover:bg-secondary disabled:opacity-50'
          )}
        >
          <ChevronLeft className="h-5 w-5" />
        </button>

        <button
          onClick={() => scroll('right')}
          className={cn(
            'absolute right-2 top-1/2 -translate-y-1/2 z-10',
            'flex h-10 w-10 items-center justify-center rounded-full',
            'bg-card/90 backdrop-blur-sm text-foreground',
            'opacity-0 group-hover:opacity-100 transition-opacity duration-300',
            'hover:bg-secondary disabled:opacity-50'
          )}
        >
          <ChevronRight className="h-5 w-5" />
        </button>

        {/* Movies Scroll Container */}
        <div
          ref={scrollRef}
          className="flex gap-4 overflow-x-auto scroll-smooth px-4 md:px-6 pb-4 scrollbar-hide"
          style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
        >
          {movies.map((movie, index) => (
            <div
              key={movie.id}
              className={cn(
                'flex-shrink-0',
                variant === 'featured' ? 'w-[320px] md:w-[400px]' : 
                variant === 'compact' ? 'w-[140px] md:w-[180px]' : 
                'w-[200px] md:w-[240px]'
              )}
            >
              <MovieCard movie={movie} index={index} variant={variant} />
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};
