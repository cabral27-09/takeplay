import { useMemo, useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from '@/components/ui/sheet';
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

  const cover = series.thumbnail_url || series.backdrop_url || '/placeholder.svg';

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side="bottom"
        className="max-h-[85vh] overflow-y-auto rounded-t-2xl border-border"
      >
        <SheetHeader className="text-left">
          <div className="flex gap-4">
            <img
              src={cover}
              alt={series.title}
              className="h-28 w-20 flex-shrink-0 rounded-lg object-cover bg-secondary"
              loading="lazy"
            />
            <div className="min-w-0">
              <SheetTitle className="text-xl">{series.title}</SheetTitle>
              {series.synopsis && (
                <SheetDescription className="line-clamp-3 mt-1">
                  {series.synopsis}
                </SheetDescription>
              )}
            </div>
          </div>
        </SheetHeader>

        {/* Temporadas */}
        {isLoading ? (
          <div className="mt-6 space-y-4">
            <div className="flex gap-2">
              {[1, 2, 3].map((i) => (
                <Skeleton key={i} className="h-9 w-28 rounded-full" />
              ))}
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
              {[...Array(8)].map((_, i) => (
                <Skeleton key={i} className="h-12 rounded-lg" />
              ))}
            </div>
          </div>
        ) : !seasons || seasons.length === 0 ? (
          <p className="mt-8 text-center text-muted-foreground">
            Nenhum episódio disponível ainda.
          </p>
        ) : (
          <>
            <div className="mt-6 flex flex-wrap gap-2">
              {seasons.map((season) => (
                <button
                  key={season.seasonNumber}
                  onClick={() => setSelectedSeason(season.seasonNumber)}
                  className={cn(
                    'px-4 py-2 rounded-full text-sm font-medium transition-colors',
                    activeSeason?.seasonNumber === season.seasonNumber
                      ? 'bg-primary text-primary-foreground'
                      : 'bg-secondary text-muted-foreground hover:text-foreground',
                  )}
                >
                  Temporada {season.seasonNumber}
                </button>
              ))}
            </div>

            {/* Episódios */}
            <div className="mt-5 grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3 pb-4">
              {episodes.map((episode, index) => {
                const percent = progress?.[episode.id]?.percent ?? 0;
                return (
                  <button
                    key={episode.id}
                    onClick={() => {
                      onOpenChange(false);
                      navigate(`/watch/${episode.id}`);
                    }}
                    className="relative overflow-hidden rounded-lg bg-secondary px-3 py-3 text-sm font-semibold uppercase tracking-wide text-secondary-foreground transition-colors hover:bg-secondary/70 hover:text-primary"
                  >
                    {/* Barra de progresso */}
                    <span
                      aria-hidden
                      className="absolute inset-y-0 left-0 bg-primary/25"
                      style={{ width: `${percent}%` }}
                    />
                    <span className="relative">
                      Episódio {episode.current_episode || index + 1}
                    </span>
                  </button>
                );
              })}
            </div>
          </>
        )}
      </SheetContent>
    </Sheet>
  );
}
