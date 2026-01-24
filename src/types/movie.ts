export type SubscriptionTier = 'free' | 'standard' | 'premium';
export type MovieStatus = 'draft' | 'pending_review' | 'published' | 'rejected';
export type ContentType = 'filme' | 'serie' | 'espetaculo';

export interface Genre {
  id: string;
  name: string;
  slug: string;
  category?: string;
  created_at?: string;
}

export interface Movie {
  id: string;
  title: string;
  synopsis: string | null;
  year: number | null;
  duration: number | null;
  rating: number | null;
  status: MovieStatus;
  featured: boolean;
  min_tier: SubscriptionTier;
  thumbnail_url: string | null;
  backdrop_url: string | null;
  video_url: string | null;
  trailer_url: string | null;
  producer_name: string | null;
  producer_type: string | null;
  content_type: ContentType;
  total_episodes: number | null;
  total_seasons: number | null;
  current_episode: number | null;
  season_number: number | null;
  created_at: string;
  updated_at: string;
}

export interface MovieWithGenres extends Movie {
  genres: Genre[];
}

export interface MovieGenre {
  id: string;
  movie_id: string;
  genre_id: string;
  created_at?: string;
}

export interface MovieFormData {
  title: string;
  synopsis: string;
  year: number;
  duration: number;
  rating: number;
  status: MovieStatus;
  featured: boolean;
  min_tier: SubscriptionTier;
  thumbnail_url: string;
  backdrop_url: string;
  video_url: string;
  trailer_url: string;
  producer_name: string;
  producer_type: string;
  genre_ids: string[];
  content_type: ContentType;
  total_episodes: number | null;
  total_seasons: number | null;
  current_episode: number | null;
  season_number: number | null;
}
