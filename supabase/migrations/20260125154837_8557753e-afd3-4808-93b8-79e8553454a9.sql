-- Add series_id column to link episodes to their parent series
ALTER TABLE public.movies ADD COLUMN series_id UUID REFERENCES public.movies(id) ON DELETE CASCADE;

-- Create index for better performance when querying episodes
CREATE INDEX idx_movies_series_id ON public.movies(series_id);

-- Comment for clarity
COMMENT ON COLUMN public.movies.series_id IS 'References the parent series for episodes. NULL means this is a standalone movie or parent series.';