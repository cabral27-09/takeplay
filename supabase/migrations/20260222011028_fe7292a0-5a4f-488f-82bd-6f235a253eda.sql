
CREATE TABLE public.video_views (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  movie_id uuid NOT NULL REFERENCES public.movies(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  producer_name text,
  watched_seconds integer NOT NULL DEFAULT 0,
  completed boolean NOT NULL DEFAULT false,
  counted boolean NOT NULL DEFAULT false,
  is_own_view boolean NOT NULL DEFAULT false,
  flagged boolean NOT NULL DEFAULT false,
  view_date date NOT NULL DEFAULT CURRENT_DATE,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(user_id, movie_id, view_date)
);

ALTER TABLE public.video_views ENABLE ROW LEVEL SECURITY;

-- Indices
CREATE INDEX idx_video_views_movie ON public.video_views(movie_id);
CREATE INDEX idx_video_views_producer_date ON public.video_views(producer_name, created_at);
CREATE INDEX idx_video_views_user_date ON public.video_views(user_id, view_date);

-- RLS: Admins podem ler tudo
CREATE POLICY "Admins can read all views"
  ON public.video_views FOR SELECT
  USING (public.has_role(auth.uid(), 'admin'));

-- RLS: Usuarios podem ler suas proprias views
CREATE POLICY "Users can read own views"
  ON public.video_views FOR SELECT
  USING (auth.uid() = user_id);

-- RLS: Produtores podem ler views dos seus conteudos
CREATE POLICY "Producers can read views of own content"
  ON public.video_views FOR SELECT
  USING (
    public.has_role(auth.uid(), 'producer') AND
    producer_name = (SELECT full_name FROM public.profiles WHERE id = auth.uid())
  );

-- Trigger updated_at
CREATE TRIGGER set_video_views_updated_at
  BEFORE UPDATE ON public.video_views
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();
