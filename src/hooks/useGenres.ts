import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import type { Genre } from '@/types/movie';

export function useGenres() {
  return useQuery({
    queryKey: ['genres'],
    queryFn: async (): Promise<Genre[]> => {
      const { data, error } = await supabase
        .from('genres')
        .select('*')
        .order('name');
      
      if (error) throw error;
      return data as Genre[];
    },
    staleTime: 1000 * 60 * 60, // 1 hour - genres rarely change
  });
}
