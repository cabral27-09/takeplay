import { useState } from 'react';
import { motion } from 'framer-motion';
import { Layout } from '@/components/layout/Layout';
import { MovieCard } from '@/components/movies/MovieCard';
import { getPublishedMovies, genres } from '@/data/mockMovies';
import { cn } from '@/lib/utils';

const Browse = () => {
  const [selectedGenre, setSelectedGenre] = useState<string | null>(null);
  const allMovies = getPublishedMovies();

  const filteredMovies = selectedGenre
    ? allMovies.filter(m => m.genre.includes(selectedGenre))
    : allMovies;

  return (
    <Layout>
      <title>Explorar Filmes - IndieFlix</title>
      <meta name="description" content="Explore nossa coleção de filmes independentes. Dramas, documentários, comédias e muito mais." />

      <div className="pt-24 pb-16">
        <div className="container">
          {/* Header */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="mb-8"
          >
            <h1 className="text-3xl md:text-4xl font-bold text-foreground mb-2">
              Explorar Filmes
            </h1>
            <p className="text-muted-foreground">
              Descubra histórias únicas do cinema independente
            </p>
          </motion.div>

          {/* Genre Filters */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="flex flex-wrap gap-2 mb-8"
          >
            <button
              onClick={() => setSelectedGenre(null)}
              className={cn(
                'px-4 py-2 rounded-full text-sm font-medium transition-all',
                selectedGenre === null
                  ? 'bg-primary text-primary-foreground'
                  : 'bg-secondary text-secondary-foreground hover:bg-secondary/80'
              )}
            >
              Todos
            </button>
            {genres.map((genre) => (
              <button
                key={genre.id}
                onClick={() => setSelectedGenre(genre.name)}
                className={cn(
                  'px-4 py-2 rounded-full text-sm font-medium transition-all',
                  selectedGenre === genre.name
                    ? 'bg-primary text-primary-foreground'
                    : 'bg-secondary text-secondary-foreground hover:bg-secondary/80'
                )}
              >
                {genre.name}
              </button>
            ))}
          </motion.div>

          {/* Movies Grid */}
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4 md:gap-6">
            {filteredMovies.map((movie, index) => (
              <MovieCard key={movie.id} movie={movie} index={index} />
            ))}
          </div>

          {filteredMovies.length === 0 && (
            <div className="text-center py-16">
              <p className="text-muted-foreground">
                Nenhum filme encontrado nesta categoria
              </p>
            </div>
          )}
        </div>
      </div>
    </Layout>
  );
};

export default Browse;
