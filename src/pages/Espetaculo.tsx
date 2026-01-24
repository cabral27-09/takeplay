import { useState, useMemo } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Layout } from '@/components/layout/Layout';
import { MovieCard } from '@/components/movies/MovieCard';
import { useMovies } from '@/hooks/useMovies';
import { useGenres } from '@/hooks/useGenres';
import { Skeleton } from '@/components/ui/skeleton';
import { Theater } from 'lucide-react';
import { motion } from 'framer-motion';

const Espetaculo = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const generoParam = searchParams.get('genero');
  
  const { data: movies = [], isLoading: isLoadingMovies } = useMovies();
  const { data: genres = [] } = useGenres('espetaculo');

  // Filter movies by content_type = 'espetaculo' and optionally by genre
  const filteredEspetaculos = useMemo(() => {
    let result = movies.filter(m => m.content_type === 'espetaculo');
    
    if (generoParam) {
      result = result.filter(m => 
        m.genres.some(g => g.slug === generoParam)
      );
    }
    
    return result;
  }, [movies, generoParam]);

  const selectedGenreName = generoParam 
    ? genres.find(g => g.slug === generoParam)?.name || generoParam
    : null;

  const handleGenreSelect = (slug: string | null) => {
    if (slug) {
      setSearchParams({ genero: slug });
    } else {
      setSearchParams({});
    }
  };

  return (
    <Layout>
      <title>Espetáculos - TieFlix</title>
      <meta name="description" content="Teatro, circo, musicais e shows. Os melhores espetáculos ao vivo em sua tela." />

      <div className="container pt-24 md:pt-28 pb-16">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-8"
        >
          <div className="flex items-center gap-3 mb-2">
            <Theater className="h-8 w-8 text-primary" />
            <h1 className="text-3xl md:text-4xl font-bold">
              {selectedGenreName ? `Espetáculos: ${selectedGenreName}` : 'Espetáculos'}
            </h1>
          </div>
          <p className="text-muted-foreground">
            Teatro, circo, musicais e shows ao vivo
          </p>
        </motion.div>

        {/* Genre Filters */}
        <div className="flex flex-wrap gap-2 mb-8">
          <button
            onClick={() => handleGenreSelect(null)}
            className={`px-4 py-2 rounded-full text-sm font-medium transition-colors ${
              !generoParam
                ? 'bg-primary text-primary-foreground'
                : 'bg-secondary text-muted-foreground hover:text-foreground'
            }`}
          >
            Todos
          </button>
          {genres.map((genre) => (
            <button
              key={genre.id}
              onClick={() => handleGenreSelect(genre.slug)}
              className={`px-4 py-2 rounded-full text-sm font-medium transition-colors ${
                generoParam === genre.slug
                  ? 'bg-primary text-primary-foreground'
                  : 'bg-secondary text-muted-foreground hover:text-foreground'
              }`}
            >
              {genre.name}
            </button>
          ))}
        </div>

        {/* Espetáculos Grid */}
        {isLoadingMovies ? (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
            {[...Array(12)].map((_, i) => (
              <Skeleton key={i} className="aspect-[2/3] rounded-xl" />
            ))}
          </div>
        ) : filteredEspetaculos.length > 0 ? (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
            {filteredEspetaculos.map((espetaculo, index) => (
              <MovieCard key={espetaculo.id} movie={espetaculo} index={index} />
            ))}
          </div>
        ) : (
          <div className="text-center py-16">
            <Theater className="h-16 w-16 mx-auto text-muted-foreground/50 mb-4" />
            <p className="text-muted-foreground text-lg">
              {generoParam 
                ? `Nenhum espetáculo encontrado para o gênero "${selectedGenreName}"`
                : 'Nenhum espetáculo disponível no momento'
              }
            </p>
          </div>
        )}
      </div>
    </Layout>
  );
};

export default Espetaculo;
