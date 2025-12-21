import { useState, useMemo } from 'react';
import { motion } from 'framer-motion';
import { Film } from 'lucide-react';
import { Layout } from '@/components/layout/Layout';
import { FeaturedTrailer } from '@/components/trailers/FeaturedTrailer';
import { TrailerCard } from '@/components/trailers/TrailerCard';
import { TrailerFilters } from '@/components/trailers/TrailerFilters';
import { getMoviesWithTrailers, getFeaturedMovies } from '@/data/mockMovies';

const Trailers = () => {
  const [selectedGenre, setSelectedGenre] = useState<string | null>(null);
  
  const allTrailers = getMoviesWithTrailers();
  const featuredMovie = getFeaturedMovies()[0];
  
  const filteredTrailers = useMemo(() => {
    if (!selectedGenre) return allTrailers;
    return allTrailers.filter((movie) => movie.genre.includes(selectedGenre));
  }, [selectedGenre, allTrailers]);

  // Remove featured from the grid
  const gridTrailers = filteredTrailers.filter((m) => m.id !== featuredMovie?.id);

  return (
    <Layout>
      {/* Featured Trailer Hero */}
      {featuredMovie && !selectedGenre && (
        <FeaturedTrailer movie={featuredMovie} />
      )}

      {/* Trailers Grid Section */}
      <section className={`container py-12 md:py-16 ${selectedGenre ? 'pt-28 md:pt-32' : ''}`}>
        {/* Section Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex flex-col md:flex-row md:items-end justify-between gap-6 mb-8"
        >
          <div>
            <div className="flex items-center gap-3 mb-2">
              <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                <Film className="w-5 h-5 text-primary" />
              </div>
              <h2 className="text-2xl md:text-3xl font-bold text-foreground">
                Trailers
              </h2>
            </div>
            <p className="text-muted-foreground">
              Assista aos trailers dos melhores filmes disponíveis na plataforma
            </p>
          </div>

          {/* Filters */}
          <TrailerFilters
            selectedGenre={selectedGenre}
            onGenreChange={setSelectedGenre}
          />
        </motion.div>

        {/* Trailers Grid */}
        {gridTrailers.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {gridTrailers.map((movie, index) => (
              <TrailerCard key={movie.id} movie={movie} index={index} />
            ))}
          </div>
        ) : (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="text-center py-16"
          >
            <Film className="w-16 h-16 text-muted-foreground mx-auto mb-4" />
            <h3 className="text-xl font-semibold text-foreground mb-2">
              Nenhum trailer encontrado
            </h3>
            <p className="text-muted-foreground">
              Não há trailers disponíveis para o gênero selecionado
            </p>
          </motion.div>
        )}
      </section>
    </Layout>
  );
};

export default Trailers;
