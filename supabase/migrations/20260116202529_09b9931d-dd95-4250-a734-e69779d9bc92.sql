-- Create subscription_tier enum
CREATE TYPE public.subscription_tier AS ENUM ('free', 'standard', 'premium');

-- Create movie_status enum
CREATE TYPE public.movie_status AS ENUM ('draft', 'published');

-- Create genres table
CREATE TABLE public.genres (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  slug TEXT NOT NULL UNIQUE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Insert default genres
INSERT INTO public.genres (name, slug) VALUES
  ('Drama', 'drama'),
  ('Documentário', 'documentario'),
  ('Comédia', 'comedia'),
  ('Romance', 'romance'),
  ('Suspense', 'suspense'),
  ('Ficção Científica', 'ficcao-cientifica'),
  ('Animação', 'animacao'),
  ('Terror', 'terror');

-- Enable RLS for genres
ALTER TABLE public.genres ENABLE ROW LEVEL SECURITY;

-- Everyone can read genres
CREATE POLICY "Anyone can read genres"
ON public.genres FOR SELECT
USING (true);

-- Only admins can manage genres
CREATE POLICY "Admins can manage genres"
ON public.genres FOR ALL
TO authenticated
USING (public.has_role(auth.uid(), 'admin'))
WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- Create movies table
CREATE TABLE public.movies (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  title TEXT NOT NULL,
  synopsis TEXT,
  year INTEGER,
  duration INTEGER, -- in minutes
  rating DECIMAL(2,1) DEFAULT 0,
  status public.movie_status NOT NULL DEFAULT 'draft',
  featured BOOLEAN NOT NULL DEFAULT false,
  min_tier public.subscription_tier NOT NULL DEFAULT 'free',
  thumbnail_url TEXT,
  backdrop_url TEXT,
  video_url TEXT,
  trailer_url TEXT,
  producer_name TEXT,
  producer_type TEXT DEFAULT 'studio',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS for movies
ALTER TABLE public.movies ENABLE ROW LEVEL SECURITY;

-- Published movies are readable by everyone
CREATE POLICY "Anyone can read published movies"
ON public.movies FOR SELECT
USING (status = 'published');

-- Admins can read all movies
CREATE POLICY "Admins can read all movies"
ON public.movies FOR SELECT
TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

-- Admins can insert movies
CREATE POLICY "Admins can insert movies"
ON public.movies FOR INSERT
TO authenticated
WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- Admins can update movies
CREATE POLICY "Admins can update movies"
ON public.movies FOR UPDATE
TO authenticated
USING (public.has_role(auth.uid(), 'admin'))
WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- Admins can delete movies
CREATE POLICY "Admins can delete movies"
ON public.movies FOR DELETE
TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

-- Create updated_at trigger for movies
CREATE TRIGGER update_movies_updated_at
BEFORE UPDATE ON public.movies
FOR EACH ROW
EXECUTE FUNCTION public.handle_updated_at();

-- Create movie_genres junction table
CREATE TABLE public.movie_genres (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  movie_id UUID NOT NULL REFERENCES public.movies(id) ON DELETE CASCADE,
  genre_id UUID NOT NULL REFERENCES public.genres(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(movie_id, genre_id)
);

-- Enable RLS for movie_genres
ALTER TABLE public.movie_genres ENABLE ROW LEVEL SECURITY;

-- Everyone can read movie_genres
CREATE POLICY "Anyone can read movie_genres"
ON public.movie_genres FOR SELECT
USING (true);

-- Admins can manage movie_genres
CREATE POLICY "Admins can manage movie_genres"
ON public.movie_genres FOR ALL
TO authenticated
USING (public.has_role(auth.uid(), 'admin'))
WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- Create storage buckets for videos and images
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES 
  ('videos', 'videos', true, 5368709120, ARRAY['video/mp4', 'video/webm', 'video/quicktime']),
  ('movie-images', 'movie-images', true, 10485760, ARRAY['image/jpeg', 'image/png', 'image/webp', 'image/gif']);

-- Storage policies for videos bucket
CREATE POLICY "Anyone can view videos"
ON storage.objects FOR SELECT
USING (bucket_id = 'videos');

CREATE POLICY "Admins can upload videos"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'videos' AND public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can update videos"
ON storage.objects FOR UPDATE
TO authenticated
USING (bucket_id = 'videos' AND public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can delete videos"
ON storage.objects FOR DELETE
TO authenticated
USING (bucket_id = 'videos' AND public.has_role(auth.uid(), 'admin'));

-- Storage policies for movie-images bucket
CREATE POLICY "Anyone can view movie images"
ON storage.objects FOR SELECT
USING (bucket_id = 'movie-images');

CREATE POLICY "Admins can upload movie images"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'movie-images' AND public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can update movie images"
ON storage.objects FOR UPDATE
TO authenticated
USING (bucket_id = 'movie-images' AND public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can delete movie images"
ON storage.objects FOR DELETE
TO authenticated
USING (bucket_id = 'movie-images' AND public.has_role(auth.uid(), 'admin'));