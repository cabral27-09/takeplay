-- Criar enum para tipos de conteúdo
CREATE TYPE content_type AS ENUM ('filme', 'serie', 'espetaculo');

-- Adicionar coluna content_type na tabela movies
ALTER TABLE movies ADD COLUMN content_type content_type NOT NULL DEFAULT 'filme';

-- Campos específicos para séries
ALTER TABLE movies ADD COLUMN total_episodes integer;
ALTER TABLE movies ADD COLUMN total_seasons integer;
ALTER TABLE movies ADD COLUMN current_episode integer;
ALTER TABLE movies ADD COLUMN season_number integer;

-- Adicionar categoria aos gêneros (para separar por tipo de conteúdo)
ALTER TABLE genres ADD COLUMN category text NOT NULL DEFAULT 'geral';

-- Inserir novos gêneros para Espetáculos
INSERT INTO genres (name, slug, category) VALUES 
  ('Teatro', 'teatro', 'espetaculo'),
  ('Circo', 'circo', 'espetaculo'),
  ('Musicais', 'musicais', 'espetaculo'),
  ('Shows', 'shows', 'espetaculo');

-- Atualizar gêneros existentes para categoria geral (filmes e séries)
UPDATE genres SET category = 'geral' WHERE category = 'geral' AND slug NOT IN ('teatro', 'circo', 'musicais', 'shows');