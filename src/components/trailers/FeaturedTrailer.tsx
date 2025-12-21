import { useState } from 'react';
import { Play, Star, Info } from 'lucide-react';
import { motion } from 'framer-motion';
import { Link } from 'react-router-dom';
import { Movie } from '@/data/mockMovies';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent } from '@/components/ui/dialog';

interface FeaturedTrailerProps {
  movie: Movie;
}

export const FeaturedTrailer = ({ movie }: FeaturedTrailerProps) => {
  const [isPlayerOpen, setIsPlayerOpen] = useState(false);

  return (
    <>
      <div className="relative w-full h-[70vh] md:h-[80vh] overflow-hidden">
        {/* Background Image */}
        <div className="absolute inset-0">
          <img
            src={movie.backdrop}
            alt={movie.title}
            className="w-full h-full object-cover"
          />
          {/* Gradient overlays */}
          <div className="absolute inset-0 bg-gradient-to-t from-background via-background/60 to-transparent" />
          <div className="absolute inset-0 bg-gradient-to-r from-background via-transparent to-transparent" />
        </div>

        {/* Content */}
        <div className="relative z-10 h-full container flex items-end pb-16 md:pb-24">
          <motion.div
            initial={{ opacity: 0, y: 40 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, delay: 0.2 }}
            className="max-w-2xl"
          >
            {/* Featured Badge */}
            <Badge className="mb-4 bg-primary/20 text-primary border-primary/30">
              Em Destaque
            </Badge>

            {/* Title */}
            <h1 className="text-4xl md:text-6xl font-bold text-foreground mb-4 leading-tight">
              {movie.title}
            </h1>

            {/* Meta info */}
            <div className="flex items-center gap-4 text-sm md:text-base text-muted-foreground mb-4">
              <div className="flex items-center gap-1 text-primary">
                <Star className="w-5 h-5 fill-current" />
                <span className="font-semibold">{movie.rating}</span>
              </div>
              <span>{movie.year}</span>
              <span>{movie.duration} min</span>
              <div className="flex gap-2">
                {movie.genre.slice(0, 2).map((g) => (
                  <Badge key={g} variant="outline" className="border-border/50">
                    {g}
                  </Badge>
                ))}
              </div>
            </div>

            {/* Synopsis */}
            <p className="text-muted-foreground text-base md:text-lg leading-relaxed mb-6 line-clamp-3">
              {movie.synopsis}
            </p>

            {/* Actions */}
            <div className="flex items-center gap-4">
              <Button
                size="lg"
                className="gap-2 text-base"
                onClick={() => setIsPlayerOpen(true)}
              >
                <Play className="w-5 h-5 fill-current" />
                Assistir Trailer
              </Button>
              <Button
                variant="outline"
                size="lg"
                className="gap-2 text-base border-border/50 hover:bg-secondary"
                asChild
              >
                <Link to={`/movie/${movie.id}`}>
                  <Info className="w-5 h-5" />
                  Mais Detalhes
                </Link>
              </Button>
            </div>
          </motion.div>
        </div>
      </div>

      {/* Video Player Dialog */}
      <Dialog open={isPlayerOpen} onOpenChange={setIsPlayerOpen}>
        <DialogContent className="max-w-5xl w-[95vw] p-0 bg-background border-border overflow-hidden">
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
        </DialogContent>
      </Dialog>
    </>
  );
};
