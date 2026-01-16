-- Adicionar novos valores ao enum movie_status
ALTER TYPE public.movie_status ADD VALUE IF NOT EXISTS 'pending_review';
ALTER TYPE public.movie_status ADD VALUE IF NOT EXISTS 'rejected';