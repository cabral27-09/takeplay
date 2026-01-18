import { useState, useMemo } from 'react';
import { motion } from 'framer-motion';
import { Search as SearchIcon, X } from 'lucide-react';
import { Layout } from '@/components/layout/Layout';
import { MovieCard } from '@/components/movies/MovieCard';
import { useMovies } from '@/hooks/useMovies';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';

const Search = () => {
  const [query, setQuery] = useState('');
  const { data: allMovies = [], isLoading } = useMovies();

  const searchResults = useMemo(() => {
    if (!query.trim()) return [];
    
    const searchTerm = query.toLowerCase();
    return allMovies.filter(movie => 
      movie.title.toLowerCase().includes(searchTerm) ||
      (movie.synopsis && movie.synopsis.toLowerCase().includes(searchTerm)) ||
      movie.genres.some(g => g.name.toLowerCase().includes(searchTerm)) ||
      (movie.producer_name && movie.producer_name.toLowerCase().includes(searchTerm))
    );
  }, [query, allMovies]);

  return (
    <Layout>
      <title>Buscar - IndieFlix</title>
      <meta name="description" content="Busque por filmes, gêneros ou produtores em nossa coleção de cinema independente." />

      <div className="pt-24 pb-16 min-h-screen">
        <div className="container">
          {/* Search Header */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="mb-8 md:mb-12"
          >
            <h1 className="text-3xl md:text-4xl font-bold text-foreground mb-6">
              Buscar
            </h1>
            
            {/* Search Input */}
            <div className="relative max-w-2xl">
              <SearchIcon className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
              <Input
                type="text"
                placeholder="Busque por título, gênero ou produtor..."
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                className="h-14 pl-12 pr-12 text-lg bg-secondary border-0 rounded-xl focus-visible:ring-primary"
                autoFocus
              />
              {query && (
                <button
                  onClick={() => setQuery('')}
                  className="absolute right-4 top-1/2 -translate-y-1/2 h-8 w-8 flex items-center justify-center rounded-full hover:bg-muted transition-colors"
                >
                  <X className="h-4 w-4 text-muted-foreground" />
                </button>
              )}
            </div>
          </motion.div>

          {/* Loading State */}
          {isLoading && query.trim() && (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4 md:gap-6">
              {[1, 2, 3, 4, 5, 6].map((i) => (
                <Skeleton key={i} className="aspect-[2/3] rounded-xl" />
              ))}
            </div>
          )}

          {/* Results */}
          {!isLoading && query.trim() && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.1 }}
            >
              <p className="text-muted-foreground mb-6">
                {searchResults.length} {searchResults.length === 1 ? 'resultado' : 'resultados'} para "{query}"
              </p>

              {searchResults.length > 0 ? (
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4 md:gap-6">
                  {searchResults.map((movie, index) => (
                    <MovieCard key={movie.id} movie={movie} index={index} />
                  ))}
                </div>
              ) : (
                <div className="text-center py-16">
                  <p className="text-xl text-muted-foreground mb-2">
                    Nenhum filme encontrado
                  </p>
                  <p className="text-muted-foreground">
                    Tente buscar por outro termo
                  </p>
                </div>
              )}
            </motion.div>
          )}

          {/* Empty State */}
          {!query.trim() && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="text-center py-16"
            >
              <SearchIcon className="h-16 w-16 mx-auto text-muted-foreground/50 mb-4" />
              <p className="text-xl text-muted-foreground">
                Digite para buscar filmes
              </p>
            </motion.div>
          )}
        </div>
      </div>
    </Layout>
  );
};

export default Search;
