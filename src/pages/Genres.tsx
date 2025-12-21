import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Layout } from '@/components/layout/Layout';
import { genres, getPublishedMovies } from '@/data/mockMovies';

const genreImages: Record<string, string> = {
  'Drama': 'https://images.unsplash.com/photo-1485846234645-a62644f84728?w=600&h=400&fit=crop',
  'Documentário': 'https://images.unsplash.com/photo-1492691527719-9d1e07e534b4?w=600&h=400&fit=crop',
  'Comédia': 'https://images.unsplash.com/photo-1527224538127-2104bb71c51b?w=600&h=400&fit=crop',
  'Romance': 'https://images.unsplash.com/photo-1518173946687-a4c036bc6d74?w=600&h=400&fit=crop',
  'Suspense': 'https://images.unsplash.com/photo-1509347528160-9a9e33742cdb?w=600&h=400&fit=crop',
  'Ficção Científica': 'https://images.unsplash.com/photo-1419242902214-272b3f66ee7a?w=600&h=400&fit=crop',
  'Animação': 'https://images.unsplash.com/photo-1534447677768-be436bb09401?w=600&h=400&fit=crop',
  'Terror': 'https://images.unsplash.com/photo-1505253716362-afaea1d3d1af?w=600&h=400&fit=crop',
};

const Genres = () => {
  const allMovies = getPublishedMovies();

  const genresWithCount = genres.map(genre => ({
    ...genre,
    count: allMovies.filter(m => m.genre.includes(genre.name)).length
  })).filter(g => g.count > 0);

  return (
    <Layout>
      <title>Gêneros - IndieFlix</title>
      <meta name="description" content="Explore filmes por gênero. Drama, documentário, comédia, romance, suspense e muito mais." />

      <div className="pt-24 pb-16">
        <div className="container">
          {/* Header */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="mb-8"
          >
            <h1 className="text-3xl md:text-4xl font-bold text-foreground mb-2">
              Gêneros
            </h1>
            <p className="text-muted-foreground">
              Encontre filmes por categoria
            </p>
          </motion.div>

          {/* Genres Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 md:gap-6">
            {genresWithCount.map((genre, index) => (
              <motion.div
                key={genre.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.05 }}
              >
                <Link
                  to={`/browse?genre=${genre.slug}`}
                  className="group relative block aspect-[3/2] overflow-hidden rounded-xl"
                >
                  <img
                    src={genreImages[genre.name] || 'https://images.unsplash.com/photo-1485846234645-a62644f84728?w=600&h=400&fit=crop'}
                    alt={genre.name}
                    className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-110"
                    loading="lazy"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-cinema-black/90 via-cinema-black/50 to-transparent" />
                  <div className="absolute inset-0 bg-primary/0 group-hover:bg-primary/10 transition-colors duration-300" />
                  
                  <div className="absolute inset-x-0 bottom-0 p-6">
                    <h3 className="text-2xl font-bold text-foreground mb-1 group-hover:text-primary transition-colors">
                      {genre.name}
                    </h3>
                    <p className="text-muted-foreground">
                      {genre.count} {genre.count === 1 ? 'filme' : 'filmes'}
                    </p>
                  </div>
                </Link>
              </motion.div>
            ))}
          </div>
        </div>
      </div>
    </Layout>
  );
};

export default Genres;
