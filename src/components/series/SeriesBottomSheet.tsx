import { useMemo, useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Skeleton } from '@/components/ui/skeleton';
import { useSeriesEpisodes } from '@/hooks/useSeriesEpisodes';
import { useEpisodeProgress } from '@/hooks/useEpisodeProgress';
import { cn } from '@/lib/utils';
import type { MovieWithGenres } from '@/types/movie';

interface SeriesBottomSheetProps {
  series: MovieWithGenres;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function SeriesBottomSheet({ series, open, onOpenChange }: SeriesBottomSheetProps) {
  const navigate = useNavigate();
  const { data: seasons, isLoading } = useSeriesEpisodes(open ? series.id : undefined);
  const [selectedSeason, setSelectedSeason] = useState<number | null>(null);

  useEffect(() => {
    if (seasons && seasons.length > 0 && selectedSeason === null) {
      setSelectedSeason(seasons[0].seasonNumber);
    }
  }, [seasons, selectedSeason]);

  const activeSeason = useMemo(
    () => seasons?.find((s) => s.seasonNumber === selectedSeason) ?? seasons?.[0],
    [seasons, selectedSeason],
  );

  const episodes = activeSeason?.episodes ?? [];
  const episodeIds = useMemo(() => episodes.map((e) => e.id), [episodes]);
  const durations = useMemo(
    () => Object.fromEntries(episodes.map((e) => [e.id, e.duration])),
    [episodes],
  );
  const { data: progress } = useEpisodeProgress(episodeIds, durations);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[85vh] overflow-y-auto rounded-2xl border-2 border-primary/70 sm:max-w-3xl">
        <DialogHeader className="sr-only">
          <DialogTitle>{series.title}</DialogTitle>
          <DialogDescription>Temporadas e episódios de {series.title}</DialogDescription>
        </DialogHeader>

        {/* Temporadas */}
        {isLoading ? (
          <div className="space-y-6 py-4">
            <div className="flex gap-3">
              {[1, 2, 3].map((i) => (
                <Skeleton key={i} className="h-11 w-40 rounded-md" />
              ))}
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-6 gap-4">
              {[...Array(12)].map((_, i) => (
                <Skeleton key={i} className="h-11 rounded-md" />
              ))}
            </div>
          </div>
        ) : !seasons || seasons.length === 0 ? (
          <p className="py-10 text-center text-muted-foreground">
            Nenhum episódio disponível ainda.
          </p>
        ) : (
          <div className="py-4">
            <div className="flex flex-wrap gap-3">
              {seasons.map((season) => (
                <button
                  key={season.seasonNumber}
                  onClick={() => setSelectedSeason(season.seasonNumber)}
                  className={cn(
                    'rounded-md border-2 px-6 py-2.5 text-base font-medium uppercase tracking-wide transition-colors',
                    activeSeason?.seasonNumber === season.seasonNumber
                      ? 'border-primary bg-primary text-primary-foreground'
                      : 'border-foreground/70 text-foreground hover:border-primary hover:text-primary',
                  )}
                >
                  Temporada {season.seasonNumber}
                </button>
              ))}
            </div>

            {/* Episódios */}
            <div className="mt-6 grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-6 gap-4 pb-4">
              {episodes.map((episode, index) => {
                const percent = progress?.[episode.id]?.percent ?? 0;
                return (
                  <button
                    key={episode.id}
                    onClick={() => {
                      onOpenChange(false);
                      navigate(`/watch/${episode.id}`);
                    }}
                    className="relative overflow-hidden rounded-md border-2 border-foreground/70 px-3 py-2.5 text-sm font-medium uppercase tracking-wide text-foreground transition-colors hover:border-primary hover:text-primary"
                  >
                    {/* Barra de progresso */}
                    <span
                      aria-hidden
                      className="absolute inset-y-0 left-0 bg-primary/30 transition-[width] duration-300"
                      style={{ width: `${percent}%` }}
                    />
                    <span className="relative z-10">
                      Episódio {episode.current_episode || index + 1}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}

