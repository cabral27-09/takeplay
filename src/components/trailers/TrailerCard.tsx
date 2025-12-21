import { useState } from 'react';
import { Play, Star, Clock, X } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { Movie } from '@/data/mockMovies';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent } from '@/components/ui/dialog';

interface TrailerCardProps {
  movie: Movie;
  index?: number;
}

export const TrailerCard = ({ movie, index = 0 }: TrailerCardProps) => {
  const [isHovered, setIsHovered] = useState(false);
  const [isPlayerOpen, setIsPlayerOpen] = useState(false);

  return (
    <>
      <motion.div
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: index * 0.1 }}
        className="group relative rounded-xl overflow-hidden cursor-pointer"
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
        onClick={() => setIsPlayerOpen(true)}
      >
        {/* Thumbnail */}
        <div className="relative aspect-video overflow-hidden">
          <img
            src={movie.backdrop}
            alt={movie.title}
            className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110"
          />
          
          {/* Gradient overlay */}
          <div className="absolute inset-0 bg-gradient-to-t from-background via-background/40 to-transparent" />
          
          {/* Play button */}
          <motion.div
            className="absolute inset-0 flex items-center justify-center"
            initial={{ opacity: 0.7 }}
            animate={{ opacity: isHovered ? 1 : 0.7 }}
          >
            <motion.div
              className="w-16 h-16 md:w-20 md:h-20 rounded-full bg-primary/90 flex items-center justify-center backdrop-blur-sm"
              animate={{ 
                scale: isHovered ? 1.1 : 1,
                boxShadow: isHovered 
                  ? '0 0 40px hsl(var(--primary) / 0.5)' 
                  : '0 0 20px hsl(var(--primary) / 0.3)'
              }}
              transition={{ duration: 0.3 }}
            >
              <Play className="w-7 h-7 md:w-8 md:h-8 text-primary-foreground fill-current ml-1" />
            </motion.div>
          </motion.div>

          {/* Duration badge */}
          <div className="absolute top-3 right-3">
            <Badge variant="secondary" className="bg-background/80 backdrop-blur-sm">
              <Clock className="w-3 h-3 mr-1" />
              {Math.floor(movie.duration / 60)}h {movie.duration % 60}min
            </Badge>
          </div>
        </div>

        {/* Content */}
        <div className="absolute bottom-0 left-0 right-0 p-4 md:p-5">
          <div className="flex items-start justify-between gap-3">
            <div className="flex-1 min-w-0">
              <h3 className="text-lg md:text-xl font-semibold text-foreground line-clamp-1 group-hover:text-primary transition-colors">
                {movie.title}
              </h3>
              <div className="flex items-center gap-2 mt-1 text-sm text-muted-foreground">
                <span>{movie.year}</span>
                <span className="w-1 h-1 rounded-full bg-muted-foreground" />
                <span>{movie.genre[0]}</span>
              </div>
            </div>
            <div className="flex items-center gap-1 text-primary shrink-0">
              <Star className="w-4 h-4 fill-current" />
              <span className="font-medium">{movie.rating}</span>
            </div>
          </div>
          
          <AnimatePresence>
            {isHovered && (
              <motion.p
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                className="text-sm text-muted-foreground mt-2 line-clamp-2"
              >
                {movie.synopsis}
              </motion.p>
            )}
          </AnimatePresence>
        </div>
      </motion.div>

      {/* Video Player Dialog */}
      <Dialog open={isPlayerOpen} onOpenChange={setIsPlayerOpen}>
        <DialogContent className="max-w-5xl w-[95vw] p-0 bg-background border-border overflow-hidden">
          <div className="relative">
            {/* Close button */}
            <button
              onClick={() => setIsPlayerOpen(false)}
              className="absolute top-4 right-4 z-10 w-10 h-10 rounded-full bg-background/80 backdrop-blur-sm flex items-center justify-center text-foreground hover:bg-background transition-colors"
            >
              <X className="w-5 h-5" />
            </button>

            {/* Video Player */}
            <div className="aspect-video w-full bg-background">
              {movie.trailerUrl ? (
                <iframe
                  src={`${movie.trailerUrl}?autoplay=1`}
                  title={`Trailer - ${movie.title}`}
                  className="w-full h-full"
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                  allowFullScreen
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center text-muted-foreground">
                  <p>Trailer não disponível</p>
                </div>
              )}
            </div>

            {/* Movie info */}
            <div className="p-5 md:p-6">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <h2 className="text-xl md:text-2xl font-bold text-foreground">{movie.title}</h2>
                  <div className="flex items-center gap-3 mt-2 text-sm text-muted-foreground">
                    <span>{movie.year}</span>
                    <span className="w-1 h-1 rounded-full bg-muted-foreground" />
                    <span>{movie.duration} min</span>
                    <span className="w-1 h-1 rounded-full bg-muted-foreground" />
                    <div className="flex items-center gap-1 text-primary">
                      <Star className="w-4 h-4 fill-current" />
                      <span>{movie.rating}</span>
                    </div>
                  </div>
                </div>
                <div className="flex gap-2 flex-wrap">
                  {movie.genre.map((g) => (
                    <Badge key={g} variant="secondary">
                      {g}
                    </Badge>
                  ))}
                </div>
              </div>
              <p className="mt-4 text-muted-foreground leading-relaxed">{movie.synopsis}</p>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
};
