import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { getAllLocalProgress } from '@/lib/episodeProgress';

export interface EpisodeProgressInfo {
  /** 0 - 100 */
  percent: number;
  completed: boolean;
}

export type EpisodeProgressMap = Record<string, EpisodeProgressInfo>;

/**
 * Combines watched history saved by the player (video_views) with the local
 * playback position stored in the browser, returning a 0-100 percentage per episode.
 * `durations` maps episode id -> duration in minutes (from the movies table).
 */
export function useEpisodeProgress(
  episodeIds: string[],
  durations: Record<string, number | null>,
) {
  const { user } = useAuth();
  const idsKey = [...episodeIds].sort().join(',');

  return useQuery({
    queryKey: ['episode-progress', user?.id ?? 'anon', idsKey],
    queryFn: async (): Promise<EpisodeProgressMap> => {
      const map: EpisodeProgressMap = {};

      const applyPercent = (id: string, seconds: number, totalSeconds: number, completed = false) => {
        if (completed) {
          map[id] = { percent: 100, completed: true };
          return;
        }
        if (!totalSeconds || totalSeconds <= 0 || seconds <= 0) return;
        const percent = Math.max(0, Math.min(100, (seconds / totalSeconds) * 100));
        const existing = map[id];
        if (!existing || percent > existing.percent) {
          map[id] = { percent, completed: percent >= 98 };
        }
      };

      if (user && episodeIds.length > 0) {
        const { data, error } = await supabase
          .from('video_views')
          .select('movie_id, watched_seconds, completed')
          .eq('user_id', user.id)
          .in('movie_id', episodeIds);

        if (error) {
          console.error('[useEpisodeProgress] error:', error);
        } else {
          for (const row of data || []) {
            const totalSeconds = (durations[row.movie_id] || 0) * 60;
            applyPercent(row.movie_id, row.watched_seconds || 0, totalSeconds, !!row.completed);
          }
        }
      }

      // Local playback position (immediate feedback, may be ahead of the server)
      const local = getAllLocalProgress();
      for (const id of episodeIds) {
        const entry = local[id];
        if (!entry) continue;
        const totalSeconds = entry.duration > 0 ? entry.duration : (durations[id] || 0) * 60;
        applyPercent(id, entry.position, totalSeconds);
      }

      return map;
    },
    enabled: episodeIds.length > 0,
    staleTime: 30_000,
  });
}
