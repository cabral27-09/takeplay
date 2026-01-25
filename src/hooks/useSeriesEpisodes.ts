import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import type { Movie, ContentType } from '@/types/movie';

export interface Episode extends Omit<Movie, 'series_id'> {
  series_id: string;
  season_number: number;
  current_episode: number;
}

export interface SeasonData {
  seasonNumber: number;
  episodes: Episode[];
}

// Fetch all episodes for a series, grouped by season
export function useSeriesEpisodes(seriesId: string | undefined) {
  return useQuery({
    queryKey: ['series-episodes', seriesId],
    queryFn: async (): Promise<SeasonData[]> => {
      if (!seriesId) return [];

      const { data, error } = await supabase
        .from('movies')
        .select('*')
        .eq('series_id', seriesId)
        .eq('status', 'published')
        .order('season_number', { ascending: true })
        .order('current_episode', { ascending: true });

      if (error) throw error;
      if (!data || data.length === 0) return [];

      // Group episodes by season
      const episodesBySeasons = data.reduce((acc, episode) => {
        const seasonNum = episode.season_number || 1;
        if (!acc[seasonNum]) {
          acc[seasonNum] = [];
        }
        acc[seasonNum].push({
          ...episode,
          content_type: (episode.content_type || 'serie') as ContentType,
        } as Episode);
        return acc;
      }, {} as Record<number, Episode[]>);

      // Convert to array format
      const seasons: SeasonData[] = Object.entries(episodesBySeasons)
        .map(([seasonNum, episodes]) => ({
          seasonNumber: parseInt(seasonNum),
          episodes,
        }))
        .sort((a, b) => a.seasonNumber - b.seasonNumber);

      return seasons;
    },
    enabled: !!seriesId,
  });
}

// Fetch all series (parent entries without series_id)
export function useSeriesList() {
  return useQuery({
    queryKey: ['series-list'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('movies')
        .select('id, title')
        .eq('content_type', 'serie')
        .is('series_id', null)
        .eq('status', 'published')
        .order('title', { ascending: true });

      if (error) throw error;
      return data || [];
    },
  });
}

// Fetch all series for admin (including unpublished)
export function useSeriesListAdmin() {
  return useQuery({
    queryKey: ['series-list-admin'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('movies')
        .select('id, title, status')
        .eq('content_type', 'serie')
        .is('series_id', null)
        .order('title', { ascending: true });

      if (error) throw error;
      return data || [];
    },
  });
}
