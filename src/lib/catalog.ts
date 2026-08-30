import type { MovieWithGenres } from '@/types/movie';

/** An episode is a serie entry linked to a parent series. */
export function isEpisode(movie: Pick<MovieWithGenres, 'content_type' | 'series_id'>) {
  return movie.content_type === 'serie' && !!movie.series_id;
}

/**
 * Episodes must never appear as standalone cards in the catalog —
 * they are reached through the series bottom sheet.
 */
export function excludeEpisodes<T extends Pick<MovieWithGenres, 'content_type' | 'series_id'>>(
  movies: T[],
): T[] {
  return movies.filter((m) => !isEpisode(m));
}
