-- 1. PERFIS: Adicionar política para admins verem todos os perfis
CREATE POLICY "Admins can view all profiles"
ON public.profiles
FOR SELECT
TO authenticated
USING (has_role(auth.uid(), 'admin'::app_role));

-- 2. FILMES: Remover políticas RESTRICTIVE e recriar como PERMISSIVE

-- Remover políticas SELECT existentes
DROP POLICY IF EXISTS "Admins can read all movies" ON public.movies;
DROP POLICY IF EXISTS "Anyone can read published movies" ON public.movies;
DROP POLICY IF EXISTS "Producers can view own movies" ON public.movies;

-- Recriar como PERMISSIVE (padrão)
CREATE POLICY "Admins can read all movies" 
ON public.movies 
FOR SELECT 
TO authenticated
USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Anyone can read published movies" 
ON public.movies 
FOR SELECT 
USING (status = 'published'::movie_status);

CREATE POLICY "Producers can view own movies" 
ON public.movies 
FOR SELECT 
TO authenticated
USING (
  has_role(auth.uid(), 'producer'::app_role) 
  AND producer_name = (SELECT full_name FROM public.profiles WHERE id = auth.uid())
);

-- INSERT
DROP POLICY IF EXISTS "Admins can insert movies" ON public.movies;
DROP POLICY IF EXISTS "Producers can insert movies" ON public.movies;

CREATE POLICY "Admins can insert movies" 
ON public.movies 
FOR INSERT 
TO authenticated
WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Producers can insert movies" 
ON public.movies 
FOR INSERT 
TO authenticated
WITH CHECK (has_role(auth.uid(), 'producer'::app_role));

-- UPDATE
DROP POLICY IF EXISTS "Admins can update movies" ON public.movies;
DROP POLICY IF EXISTS "Producers can update own movies" ON public.movies;

CREATE POLICY "Admins can update movies" 
ON public.movies 
FOR UPDATE 
TO authenticated
USING (has_role(auth.uid(), 'admin'::app_role))
WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Producers can update own movies" 
ON public.movies 
FOR UPDATE 
TO authenticated
USING (
  has_role(auth.uid(), 'producer'::app_role) 
  AND producer_name = (SELECT full_name FROM public.profiles WHERE id = auth.uid())
  AND status IN ('draft', 'pending_review', 'rejected')
)
WITH CHECK (
  has_role(auth.uid(), 'producer'::app_role)
  AND status IN ('draft', 'pending_review')
);

-- DELETE
DROP POLICY IF EXISTS "Admins can delete movies" ON public.movies;
DROP POLICY IF EXISTS "Producers can delete own movies" ON public.movies;

CREATE POLICY "Admins can delete movies" 
ON public.movies 
FOR DELETE 
TO authenticated
USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Producers can delete own movies" 
ON public.movies 
FOR DELETE 
TO authenticated
USING (
  has_role(auth.uid(), 'producer'::app_role) 
  AND producer_name = (SELECT full_name FROM public.profiles WHERE id = auth.uid())
  AND status IN ('draft', 'rejected')
);