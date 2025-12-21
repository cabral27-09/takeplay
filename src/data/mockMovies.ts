export interface Movie {
  id: string;
  title: string;
  synopsis: string;
  year: number;
  duration: number; // in minutes
  genre: string[];
  thumbnail: string;
  backdrop: string;
  producer: {
    id: string;
    name: string;
    type: 'individual' | 'studio';
  };
  rating: number;
  vimeoId?: string;
  status: 'draft' | 'in_review' | 'published' | 'rejected' | 'suspended';
  featured?: boolean;
}

export interface Genre {
  id: string;
  name: string;
  slug: string;
}

export const genres: Genre[] = [
  { id: '1', name: 'Drama', slug: 'drama' },
  { id: '2', name: 'Documentário', slug: 'documentario' },
  { id: '3', name: 'Comédia', slug: 'comedia' },
  { id: '4', name: 'Romance', slug: 'romance' },
  { id: '5', name: 'Suspense', slug: 'suspense' },
  { id: '6', name: 'Ficção Científica', slug: 'ficcao-cientifica' },
  { id: '7', name: 'Animação', slug: 'animacao' },
  { id: '8', name: 'Terror', slug: 'terror' },
];

export const movies: Movie[] = [
  {
    id: '1',
    title: 'A Última Luz',
    synopsis: 'Em um mundo onde a escuridão domina, uma jovem descobre que carrega dentro de si a última esperança da humanidade. Uma jornada épica de autodescoberta e redenção.',
    year: 2024,
    duration: 118,
    genre: ['Drama', 'Ficção Científica'],
    thumbnail: 'https://images.unsplash.com/photo-1536440136628-849c177e76a1?w=400&h=600&fit=crop',
    backdrop: 'https://images.unsplash.com/photo-1536440136628-849c177e76a1?w=1920&h=1080&fit=crop',
    producer: { id: 'p1', name: 'Aurora Filmes', type: 'studio' },
    rating: 4.8,
    status: 'published',
    featured: true,
  },
  {
    id: '2',
    title: 'Silêncio nas Montanhas',
    synopsis: 'Um alpinista solitário confronta seus demônios internos enquanto escala o pico mais perigoso do mundo. Um retrato íntimo sobre perda e superação.',
    year: 2023,
    duration: 95,
    genre: ['Documentário', 'Drama'],
    thumbnail: 'https://images.unsplash.com/photo-1464822759023-fed622ff2c3b?w=400&h=600&fit=crop',
    backdrop: 'https://images.unsplash.com/photo-1464822759023-fed622ff2c3b?w=1920&h=1080&fit=crop',
    producer: { id: 'p2', name: 'Carlos Mendes', type: 'individual' },
    rating: 4.6,
    status: 'published',
  },
  {
    id: '3',
    title: 'Amor em Câmera Lenta',
    synopsis: 'Quando um fotógrafo encontra suas antigas fotos de um amor perdido, ele embarca em uma viagem pelo tempo através de memórias esquecidas.',
    year: 2024,
    duration: 102,
    genre: ['Romance', 'Drama'],
    thumbnail: 'https://images.unsplash.com/photo-1518173946687-a4c036bc6d74?w=400&h=600&fit=crop',
    backdrop: 'https://images.unsplash.com/photo-1518173946687-a4c036bc6d74?w=1920&h=1080&fit=crop',
    producer: { id: 'p3', name: 'Estúdio Lua Nova', type: 'studio' },
    rating: 4.4,
    status: 'published',
  },
  {
    id: '4',
    title: 'O Riso Escondido',
    synopsis: 'Uma comédia sensível sobre um comediante de stand-up que perdeu a capacidade de rir. Quando um encontro inesperado muda tudo.',
    year: 2023,
    duration: 89,
    genre: ['Comédia', 'Drama'],
    thumbnail: 'https://images.unsplash.com/photo-1527224538127-2104bb71c51b?w=400&h=600&fit=crop',
    backdrop: 'https://images.unsplash.com/photo-1527224538127-2104bb71c51b?w=1920&h=1080&fit=crop',
    producer: { id: 'p4', name: 'Risada Produções', type: 'studio' },
    rating: 4.2,
    status: 'published',
  },
  {
    id: '5',
    title: 'Sombras do Passado',
    synopsis: 'Um detetive aposentado recebe uma carta misteriosa que reacende um caso de 30 anos. O que ele descobre vai mudar tudo que ele sabia sobre sua própria família.',
    year: 2024,
    duration: 127,
    genre: ['Suspense', 'Drama'],
    thumbnail: 'https://images.unsplash.com/photo-1509347528160-9a9e33742cdb?w=400&h=600&fit=crop',
    backdrop: 'https://images.unsplash.com/photo-1509347528160-9a9e33742cdb?w=1920&h=1080&fit=crop',
    producer: { id: 'p5', name: 'Noir Studios', type: 'studio' },
    rating: 4.7,
    status: 'published',
    featured: true,
  },
  {
    id: '6',
    title: 'Além do Horizonte',
    synopsis: 'Em 2150, a humanidade enfrenta sua maior crise. Uma equipe de cientistas descobre um portal para um universo paralelo, mas a que custo?',
    year: 2024,
    duration: 143,
    genre: ['Ficção Científica', 'Drama'],
    thumbnail: 'https://images.unsplash.com/photo-1419242902214-272b3f66ee7a?w=400&h=600&fit=crop',
    backdrop: 'https://images.unsplash.com/photo-1419242902214-272b3f66ee7a?w=1920&h=1080&fit=crop',
    producer: { id: 'p6', name: 'Cosmos Filmes', type: 'studio' },
    rating: 4.9,
    status: 'published',
  },
  {
    id: '7',
    title: 'Pequenos Mundos',
    synopsis: 'Uma animação encantadora sobre uma formiga que sonha em conhecer o oceano. Uma jornada de amizade e descoberta para todas as idades.',
    year: 2023,
    duration: 78,
    genre: ['Animação', 'Comédia'],
    thumbnail: 'https://images.unsplash.com/photo-1534447677768-be436bb09401?w=400&h=600&fit=crop',
    backdrop: 'https://images.unsplash.com/photo-1534447677768-be436bb09401?w=1920&h=1080&fit=crop',
    producer: { id: 'p7', name: 'Animação Brasileira', type: 'studio' },
    rating: 4.5,
    status: 'published',
  },
  {
    id: '8',
    title: 'A Casa no Fim da Rua',
    synopsis: 'Uma família se muda para uma casa antiga no interior. Logo descobrem que não estão sozinhos, e o horror começa quando as luzes se apagam.',
    year: 2024,
    duration: 108,
    genre: ['Terror', 'Suspense'],
    thumbnail: 'https://images.unsplash.com/photo-1505253716362-afaea1d3d1af?w=400&h=600&fit=crop',
    backdrop: 'https://images.unsplash.com/photo-1505253716362-afaea1d3d1af?w=1920&h=1080&fit=crop',
    producer: { id: 'p8', name: 'Medo Films', type: 'studio' },
    rating: 4.3,
    status: 'published',
  },
  {
    id: '9',
    title: 'Vozes da Amazônia',
    synopsis: 'Um documentário poderoso sobre as comunidades indígenas que lutam para preservar a floresta. Suas histórias, suas vozes, sua resistência.',
    year: 2024,
    duration: 92,
    genre: ['Documentário'],
    thumbnail: 'https://images.unsplash.com/photo-1516026672322-bc52d61a55d5?w=400&h=600&fit=crop',
    backdrop: 'https://images.unsplash.com/photo-1516026672322-bc52d61a55d5?w=1920&h=1080&fit=crop',
    producer: { id: 'p9', name: 'Verde Produções', type: 'studio' },
    rating: 4.8,
    status: 'published',
    featured: true,
  },
  {
    id: '10',
    title: 'Encontro às Cegas',
    synopsis: 'Dois desconhecidos são forçados a passar 24 horas juntos em um elevador preso. O que começa como desastre se transforma em algo inesperado.',
    year: 2023,
    duration: 96,
    genre: ['Romance', 'Comédia'],
    thumbnail: 'https://images.unsplash.com/photo-1517457373958-b7bdd4587205?w=400&h=600&fit=crop',
    backdrop: 'https://images.unsplash.com/photo-1517457373958-b7bdd4587205?w=1920&h=1080&fit=crop',
    producer: { id: 'p10', name: 'Coração Produções', type: 'studio' },
    rating: 4.1,
    status: 'published',
  },
];

export const getMoviesByGenre = (genreSlug: string): Movie[] => {
  const genre = genres.find(g => g.slug === genreSlug);
  if (!genre) return [];
  return movies.filter(m => m.genre.includes(genre.name) && m.status === 'published');
};

export const getFeaturedMovies = (): Movie[] => {
  return movies.filter(m => m.featured && m.status === 'published');
};

export const getPublishedMovies = (): Movie[] => {
  return movies.filter(m => m.status === 'published');
};

export const getMovieById = (id: string): Movie | undefined => {
  return movies.find(m => m.id === id);
};
