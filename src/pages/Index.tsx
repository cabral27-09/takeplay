import { Layout } from '@/components/layout/Layout';
import { HeroSection } from '@/components/home/HeroSection';
import { MovieRow } from '@/components/movies/MovieRow';
import { useMovies, useFeaturedMovies } from '@/hooks/useMovies';
import { useGenres } from '@/hooks/useGenres';
import { Skeleton } from '@/components/ui/skeleton';

const Index = () => {
  const { data: allMovies = [], isLoading: isLoadingMovies } = useMovies();
  const { data: featuredMovies = [], isLoading: isLoadingFeatured } = useFeaturedMovies();
  const { data: genres = [] } = useGenres();

  const heroMovie = featuredMovies[0] || allMovies[0];

  // Group movies by genre
  const moviesByGenre = genres.map(genre => ({
    genre,
    movies: allMovies.filter(m => m.genres.some(g => g.name === genre.name))
  })).filter(g => g.movies.length > 0);

  const isLoading = isLoadingMovies || isLoadingFeatured;

  if (isLoading) {
    return (
      <Layout>
        <div className="h-[85vh] min-h-[600px] bg-secondary animate-pulse" />
        <div className="container py-8 space-y-8">
          {[1, 2, 3].map((i) => (
            <div key={i}>
              <Skeleton className="h-8 w-48 mb-4" />
              <div className="flex gap-4">
                {[1, 2, 3, 4, 5].map((j) => (
                  <Skeleton key={j} className="w-[200px] aspect-[2/3] rounded-xl" />
                ))}
              </div>
            </div>
          ))}
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      {/* SEO Meta Tags */}
      <title>Manivela Filmes - Cinema Independente</title>
      <meta name="description" content="Descubra os melhores filmes independentes. Streaming sem anúncios, sem interrupções. Apenas cinema de qualidade." />

      {/* Hero Section */}
      {heroMovie && <HeroSection movie={heroMovie} />}

      {/* Movie Sections */}
      <div className="pb-16 space-y-4">
        {/* Featured Row */}
        {featuredMovies.length > 0 && (
          <MovieRow 
            title="Destaques" 
            movies={featuredMovies} 
            variant="featured" 
          />
        )}

        {/* Trending */}
        {allMovies.length > 0 && (
          <MovieRow 
            title="Populares Esta Semana" 
            movies={allMovies.slice(0, 6)} 
          />
        )}

        {/* Movies by Genre */}
        {moviesByGenre.slice(0, 4).map(({ genre, movies }) => (
          <MovieRow 
            key={genre.id} 
            title={genre.name} 
            movies={movies} 
          />
        ))}

        {/* Recent Additions */}
        {allMovies.length > 0 && (
          <MovieRow 
            title="Adicionados Recentemente" 
            movies={[...allMovies].reverse().slice(0, 8)} 
          />
        )}
      </div>
    </Layout>
  );
};

export default Index;
