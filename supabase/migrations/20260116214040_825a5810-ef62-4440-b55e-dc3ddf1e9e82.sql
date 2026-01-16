-- Criar policy para produtores verem seus próprios filmes (independente do status)
CREATE POLICY "Producers can view own movies" 
ON public.movies 
FOR SELECT 
USING (
  has_role(auth.uid(), 'producer'::app_role) 
  AND producer_name = (SELECT full_name FROM public.profiles WHERE id = auth.uid())
);

-- Criar policy para produtores inserirem filmes
DROP POLICY IF EXISTS "Producers can insert movies" ON public.movies;
CREATE POLICY "Producers can insert movies" 
ON public.movies 
FOR INSERT 
WITH CHECK (has_role(auth.uid(), 'producer'::app_role));

-- Criar policy para produtores atualizarem seus próprios filmes (apenas draft, pending_review e rejected)
DROP POLICY IF EXISTS "Producers can update own movies" ON public.movies;
CREATE POLICY "Producers can update own movies" 
ON public.movies 
FOR UPDATE 
USING (
  has_role(auth.uid(), 'producer'::app_role) 
  AND producer_name = (SELECT full_name FROM public.profiles WHERE id = auth.uid())
  AND status IN ('draft', 'pending_review', 'rejected')
)
WITH CHECK (
  has_role(auth.uid(), 'producer'::app_role)
  AND status IN ('draft', 'pending_review')
);

-- Criar policy para produtores deletarem seus próprios filmes (apenas draft e rejected)
DROP POLICY IF EXISTS "Producers can delete own movies" ON public.movies;
CREATE POLICY "Producers can delete own movies" 
ON public.movies 
FOR DELETE 
USING (
  has_role(auth.uid(), 'producer'::app_role) 
  AND producer_name = (SELECT full_name FROM public.profiles WHERE id = auth.uid())
  AND status IN ('draft', 'rejected')
);