import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

interface ViewCount {
  movie_id: string;
  total_views: number;
  valid_views: number;
}

export function useMovieViewCounts() {
  return useQuery({
    queryKey: ['movie-view-counts'],
    queryFn: async (): Promise<Record<string, ViewCount>> => {
      // Fetch all views the current user has access to (RLS handles filtering)
      const { data, error } = await supabase
        .from('video_views')
        .select('movie_id, counted');

      if (error) {
        console.error('Error fetching view counts:', error);
        return {};
      }

      // Group by movie_id
      const counts: Record<string, ViewCount> = {};
      for (const row of data || []) {
        if (!counts[row.movie_id]) {
          counts[row.movie_id] = { movie_id: row.movie_id, total_views: 0, valid_views: 0 };
        }
        counts[row.movie_id].total_views++;
        if (row.counted) {
          counts[row.movie_id].valid_views++;
        }
      }
      return counts;
    },
    staleTime: 60000, // 1 min cache
  });
}
