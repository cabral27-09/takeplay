import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import type { Movie, MovieWithGenres, Genre, MovieFormData, MovieStatus } from '@/types/movie';

// Fetch all movies with their genres
export function useMovies(includeUnpublished = false) {
  return useQuery({
    queryKey: ['movies', includeUnpublished],
    queryFn: async (): Promise<MovieWithGenres[]> => {
      // Fetch all movies
      let query = supabase.from('movies').select('*');
      
      if (!includeUnpublished) {
        query = query.eq('status', 'published');
      }
      
      const { data: movies, error: moviesError } = await query.order('created_at', { ascending: false });
      
      if (moviesError) throw moviesError;
      if (!movies || movies.length === 0) return [];

      // Fetch movie_genres for all movies
      const movieIds = movies.map(m => m.id);
      const { data: movieGenres, error: mgError } = await supabase
        .from('movie_genres')
        .select('movie_id, genre_id')
        .in('movie_id', movieIds);
      
      if (mgError) throw mgError;

      // Fetch all genres
      const { data: genres, error: genresError } = await supabase
        .from('genres')
        .select('*');
      
      if (genresError) throw genresError;

      // Map genres to movies
      const genresMap = new Map<string, Genre>();
      genres?.forEach(g => genresMap.set(g.id, g as Genre));

      const moviesWithGenres: MovieWithGenres[] = movies.map(movie => {
        const movieGenreIds = movieGenres
          ?.filter(mg => mg.movie_id === movie.id)
          .map(mg => mg.genre_id) || [];
        
        const movieGenresList = movieGenreIds
          .map(id => genresMap.get(id))
          .filter((g): g is Genre => g !== undefined);

        return {
          ...movie,
          genres: movieGenresList,
        } as MovieWithGenres;
      });

      return moviesWithGenres;
    },
  });
}

// Fetch a single movie by ID
export function useMovie(id: string | undefined) {
  return useQuery({
    queryKey: ['movie', id],
    queryFn: async (): Promise<MovieWithGenres | null> => {
      if (!id) return null;

      const { data: movie, error: movieError } = await supabase
        .from('movies')
        .select('*')
        .eq('id', id)
        .maybeSingle();
      
      if (movieError) throw movieError;
      if (!movie) return null;

      // Fetch genres for this movie
      const { data: movieGenres, error: mgError } = await supabase
        .from('movie_genres')
        .select('genre_id')
        .eq('movie_id', id);
      
      if (mgError) throw mgError;

      const genreIds = movieGenres?.map(mg => mg.genre_id) || [];
      
      let genres: Genre[] = [];
      if (genreIds.length > 0) {
        const { data: genresData, error: genresError } = await supabase
          .from('genres')
          .select('*')
          .in('id', genreIds);
        
        if (genresError) throw genresError;
        genres = (genresData || []) as Genre[];
      }

      return {
        ...movie,
        genres,
      } as MovieWithGenres;
    },
    enabled: !!id,
  });
}

// Fetch featured movies
export function useFeaturedMovies() {
  return useQuery({
    queryKey: ['movies', 'featured'],
    queryFn: async (): Promise<MovieWithGenres[]> => {
      const { data: movies, error: moviesError } = await supabase
        .from('movies')
        .select('*')
        .eq('status', 'published')
        .eq('featured', true)
        .order('created_at', { ascending: false });
      
      if (moviesError) throw moviesError;
      if (!movies || movies.length === 0) return [];

      // Fetch movie_genres
      const movieIds = movies.map(m => m.id);
      const { data: movieGenres } = await supabase
        .from('movie_genres')
        .select('movie_id, genre_id')
        .in('movie_id', movieIds);

      const { data: genres } = await supabase.from('genres').select('*');

      const genresMap = new Map<string, Genre>();
      genres?.forEach(g => genresMap.set(g.id, g as Genre));

      return movies.map(movie => ({
        ...movie,
        genres: movieGenres
          ?.filter(mg => mg.movie_id === movie.id)
          .map(mg => genresMap.get(mg.genre_id))
          .filter((g): g is Genre => g !== undefined) || [],
      })) as MovieWithGenres[];
    },
  });
}

// Create a new movie
export function useCreateMovie() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (formData: MovieFormData) => {
      const { genre_ids, ...movieData } = formData;
      
      // Insert movie
      const { data: movie, error: movieError } = await supabase
        .from('movies')
        .insert(movieData)
        .select()
        .single();
      
      if (movieError) throw movieError;

      // Insert movie_genres
      if (genre_ids.length > 0) {
        const movieGenres = genre_ids.map(genre_id => ({
          movie_id: movie.id,
          genre_id,
        }));
        
        const { error: mgError } = await supabase
          .from('movie_genres')
          .insert(movieGenres);
        
        if (mgError) throw mgError;
      }

      return movie;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['movies'] });
    },
  });
}

// Update a movie
export function useUpdateMovie() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (data: { id: string; formData?: MovieFormData; status?: MovieStatus }) => {
      const { id, formData, status } = data;
      
      // If only updating status
      if (status && !formData) {
        const { data: movie, error } = await supabase
          .from('movies')
          .update({ status: status as any })
          .eq('id', id)
          .select()
          .single();
        
        if (error) throw error;
        return movie;
      }
      
      // Full update with formData
      if (formData) {
        const { genre_ids, ...movieData } = formData;
        
        // Update movie
        const { data: movie, error: movieError } = await supabase
          .from('movies')
          .update(movieData)
          .eq('id', id)
          .select()
          .single();
        
        if (movieError) throw movieError;

        // Delete existing movie_genres
        await supabase.from('movie_genres').delete().eq('movie_id', id);

        // Insert new movie_genres
        if (genre_ids.length > 0) {
          const movieGenres = genre_ids.map(genre_id => ({
            movie_id: id,
            genre_id,
          }));
          
          await supabase.from('movie_genres').insert(movieGenres);
        }

        return movie;
      }
      
      throw new Error('Either formData or status must be provided');
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['movies'] });
      queryClient.invalidateQueries({ queryKey: ['movie', variables.id] });
    },
  });
}

// Delete a movie
export function useDeleteMovie() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('movies').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['movies'] });
    },
  });
}
