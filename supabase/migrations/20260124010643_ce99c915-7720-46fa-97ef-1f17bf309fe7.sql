-- Criar enum para classificação etária (padrão brasileiro)
CREATE TYPE age_rating AS ENUM ('L', '10', '12', '14', '16', '18');

-- Criar enum para idiomas
CREATE TYPE content_language AS ENUM ('portugues', 'ingles', 'espanhol', 'outro');

-- Adicionar colunas na tabela movies
ALTER TABLE public.movies ADD COLUMN age_rating age_rating DEFAULT 'L';
ALTER TABLE public.movies ADD COLUMN language content_language DEFAULT 'portugues';