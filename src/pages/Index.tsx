import { Layout } from '@/components/layout/Layout';
import { HeroSection } from '@/components/home/HeroSection';
import { MovieRow } from '@/components/movies/MovieRow';
import { 
  movies, 
  genres,
  getFeaturedMovies, 
  getPublishedMovies 
} from '@/data/mockMovies';

const Index = () => {
  const featuredMovies = getFeaturedMovies();
  const allMovies = getPublishedMovies();
  const heroMovie = featuredMovies[0] || allMovies[0];

  // Group movies by genre
  const moviesByGenre = genres.map(genre => ({
    genre,
    movies: allMovies.filter(m => m.genre.includes(genre.name))
  })).filter(g => g.movies.length > 0);

  return (
    <Layout>
      {/* SEO Meta Tags */}
      <title>IndieFlix - Cinema Independente</title>
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
        <MovieRow 
          title="Populares Esta Semana" 
          movies={allMovies.slice(0, 6)} 
        />

        {/* Movies by Genre */}
        {moviesByGenre.slice(0, 4).map(({ genre, movies }) => (
          <MovieRow 
            key={genre.id} 
            title={genre.name} 
            movies={movies} 
          />
        ))}

        {/* Recent Additions */}
        <MovieRow 
          title="Adicionados Recentemente" 
          movies={[...allMovies].reverse().slice(0, 8)} 
        />
      </div>
    </Layout>
  );
};

export default Index;
