import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Play, Clock, ChevronDown } from 'lucide-react';
import { useSeriesEpisodes, type SeasonData } from '@/hooks/useSeriesEpisodes';
import { Skeleton } from '@/components/ui/skeleton';
import { Button } from '@/components/ui/button';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion';

interface SeasonEpisodeListProps {
  seriesId: string;
  seriesTitle: string;
}

export function SeasonEpisodeList({ seriesId, seriesTitle }: SeasonEpisodeListProps) {
  const { data: seasons, isLoading, error } = useSeriesEpisodes(seriesId);

  if (isLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-8 w-48" />
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-24 w-full rounded-xl" />
          ))}
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-center py-8 text-muted-foreground">
        Erro ao carregar episódios. Tente novamente.
      </div>
    );
  }

  if (!seasons || seasons.length === 0) {
    return (
      <div className="text-center py-8">
        <p className="text-muted-foreground mb-4">
          Nenhum episódio disponível ainda.
        </p>
      </div>
    );
  }

  const totalEpisodes = seasons.reduce((acc, s) => acc + s.episodes.length, 0);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold text-foreground">
          Episódios
        </h2>
        <span className="text-muted-foreground">
          {seasons.length} {seasons.length === 1 ? 'Temporada' : 'Temporadas'} • {totalEpisodes} Episódios
        </span>
      </div>

      {/* Seasons Accordion */}
      <Accordion 
        type="single" 
        collapsible 
        defaultValue={`season-${seasons[0]?.seasonNumber}`}
        className="space-y-3"
      >
        {seasons.map((season) => (
          <SeasonAccordion 
            key={season.seasonNumber} 
            season={season} 
            seriesTitle={seriesTitle}
          />
        ))}
      </Accordion>
    </div>
  );
}

interface SeasonAccordionProps {
  season: SeasonData;
  seriesTitle: string;
}

function SeasonAccordion({ season, seriesTitle }: SeasonAccordionProps) {
  return (
    <AccordionItem 
      value={`season-${season.seasonNumber}`}
      className="border border-border rounded-xl overflow-hidden bg-card/50"
    >
      <AccordionTrigger className="px-6 py-4 hover:no-underline hover:bg-secondary/50 transition-colors">
        <div className="flex items-center gap-3">
          <span className="text-lg font-semibold">
            Temporada {season.seasonNumber}
          </span>
          <span className="text-sm text-muted-foreground">
            ({season.episodes.length} {season.episodes.length === 1 ? 'episódio' : 'episódios'})
          </span>
        </div>
      </AccordionTrigger>
      <AccordionContent className="pb-0">
        <div className="divide-y divide-border">
          {season.episodes.map((episode, index) => (
            <EpisodeCard 
              key={episode.id} 
              episode={episode} 
              seriesTitle={seriesTitle}
              index={index}
            />
          ))}
        </div>
      </AccordionContent>
    </AccordionItem>
  );
}

interface EpisodeCardProps {
  episode: {
    id: string;
    title: string;
    synopsis: string | null;
    duration: number | null;
    current_episode: number;
    thumbnail_url: string | null;
    backdrop_url: string | null;
  };
  seriesTitle: string;
  index: number;
}

function EpisodeCard({ episode, seriesTitle, index }: EpisodeCardProps) {
  const thumbnail = episode.thumbnail_url || episode.backdrop_url || '/placeholder.svg';
  
  // Extract episode-specific title if it matches pattern "SeriesName - T1E1" or similar
  const episodeTitle = episode.title.includes(' - ') 
    ? episode.title.split(' - ').slice(1).join(' - ')
    : episode.title !== seriesTitle 
      ? episode.title 
      : `Episódio ${episode.current_episode}`;

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.05 }}
    >
      <Link 
        to={`/watch/${episode.id}`}
        className="group flex gap-4 p-4 hover:bg-secondary/30 transition-colors"
      >
        {/* Episode Number */}
        <div className="flex-shrink-0 w-8 flex items-center justify-center">
          <span className="text-2xl font-bold text-muted-foreground">
            {episode.current_episode}
          </span>
        </div>

        {/* Thumbnail */}
        <div className="relative flex-shrink-0 w-32 md:w-40 aspect-video rounded-lg overflow-hidden bg-secondary">
          <img
            src={thumbnail}
            alt={episodeTitle}
            className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
          />
          {/* Play overlay */}
          <div className="absolute inset-0 flex items-center justify-center bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity">
            <div className="w-10 h-10 rounded-full bg-primary flex items-center justify-center">
              <Play className="h-5 w-5 fill-primary-foreground text-primary-foreground" />
            </div>
          </div>
        </div>

        {/* Info */}
        <div className="flex-1 min-w-0 py-1">
          <h4 className="font-medium text-foreground group-hover:text-primary transition-colors line-clamp-1">
            {episodeTitle}
          </h4>
          {episode.synopsis && (
            <p className="text-sm text-muted-foreground line-clamp-2 mt-1">
              {episode.synopsis}
            </p>
          )}
          {episode.duration && (
            <div className="flex items-center gap-1.5 mt-2 text-xs text-muted-foreground">
              <Clock className="h-3.5 w-3.5" />
              <span>{episode.duration} min</span>
            </div>
          )}
        </div>

        {/* Play button on hover - desktop */}
        <div className="hidden md:flex items-center">
          <Button 
            variant="ghost" 
            size="icon"
            className="opacity-0 group-hover:opacity-100 transition-opacity"
          >
            <Play className="h-5 w-5" />
          </Button>
        </div>
      </Link>
    </motion.div>
  );
}
