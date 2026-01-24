import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import type { Genre, ContentType } from '@/types/movie';

export function useGenres(category?: 'geral' | 'espetaculo') {
  return useQuery({
    queryKey: ['genres', category],
    queryFn: async (): Promise<Genre[]> => {
      let query = supabase
        .from('genres')
        .select('*')
        .order('name');
      
      if (category) {
        query = query.eq('category', category);
      }
      
      const { data, error } = await query;
      
      if (error) throw error;
      return data as Genre[];
    },
    staleTime: 1000 * 60 * 60, // 1 hour - genres rarely change
  });
}

export function useGenresByContentType(contentType: ContentType) {
  const category = contentType === 'espetaculo' ? 'espetaculo' : 'geral';
  return useGenres(category);
}
