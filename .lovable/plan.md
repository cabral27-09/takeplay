
# Plano: Sistema de Views com Anti-Fraude

## Resumo

Criar a tabela `video_views`, uma Edge Function `record-view` para registro seguro, um hook `useVideoViews` no player, e exibir contagem de views nas paginas Admin e Producer com permissoes diferentes:

- **Admin**: ve views de todos os conteudos
- **Producer**: ve views somente dos seus conteudos

---

## 1. Migracao SQL - Tabela `video_views`

```sql
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

-- RLS: Somente service_role pode inserir/atualizar (via Edge Function)
-- Nenhuma policy de INSERT/UPDATE para authenticated = bloqueado

-- Trigger updated_at
CREATE TRIGGER set_video_views_updated_at
  BEFORE UPDATE ON public.video_views
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();
```

## 2. Edge Function `record-view`

**Arquivo**: `supabase/functions/record-view/index.ts`

**Config** em `supabase/config.toml`:
```toml
[functions.record-view]
verify_jwt = false
```

**Logica**:
- Recebe `{ movieId, watchedSeconds }` via POST
- Valida autenticacao (Bearer token)
- Busca dados do filme (`producer_name`) e do usuario (`full_name`)
- Detecta `is_own_view` comparando `producer_name == full_name`
- Usa UPSERT com constraint `(user_id, movie_id, view_date)`:
  - Se ja existe registro hoje, atualiza `watched_seconds` e `updated_at`
  - Se nao existe, insere novo
- Rate limit: conta views do usuario hoje; se > 20, rejeita
- Marca `counted = true` se `watched_seconds >= 60` e `is_own_view = false`
- Marca `completed = true` se assistiu > 90% da duracao do filme

## 3. Hook `src/hooks/useVideoViews.ts`

- `startView(movieId)`: chama Edge Function com `watchedSeconds = 0`
- `updateView(movieId, seconds)`: chama Edge Function com segundos acumulados
- Usa `useRef` para acumular tempo e enviar a cada 30 segundos
- No `useEffect cleanup`, envia o tempo final via `navigator.sendBeacon` ou `fetch` com `keepalive: true`

## 4. Integracao no `VideoPlayer.tsx`

- Importar e usar `useVideoViews`
- Ao iniciar reproducao: `startView(movieId)`
- No loop RAF existente: acumular `watchedSeconds` e enviar a cada 30s
- No cleanup do componente: enviar tempo final

## 5. Exibir Views na Tabela Admin (`src/pages/admin/Movies.tsx`)

- Criar hook `useMovieViewCounts()` que faz query agrupada:
  ```sql
  SELECT movie_id, COUNT(*) as total_views, 
         COUNT(*) FILTER (WHERE counted) as valid_views
  FROM video_views GROUP BY movie_id
  ```
- Adicionar coluna "Views" na tabela com badge mostrando o total
- Admin ve views de todos os filmes (RLS ja permite)

## 6. Exibir Views na Tabela Producer (`src/pages/producer/Movies.tsx`)

- Reutilizar `useMovieViewCounts()` - RLS garante que produtor so ve views dos seus conteudos
- Adicionar coluna "Views" na tabela do produtor
- Adicionar card de estatisticas com total de views

## Arquivos Criados/Alterados

| Arquivo | Acao |
|---------|------|
| Migracao SQL | Criar tabela `video_views` |
| `supabase/config.toml` | Adicionar config `record-view` |
| `supabase/functions/record-view/index.ts` | Criar Edge Function |
| `src/hooks/useVideoViews.ts` | Criar hook de tracking |
| `src/hooks/useMovieViewCounts.ts` | Criar hook de contagem |
| `src/components/video/VideoPlayer.tsx` | Integrar tracking |
| `src/pages/admin/Movies.tsx` | Adicionar coluna Views |
| `src/pages/producer/Movies.tsx` | Adicionar coluna Views + card |

## Seguranca

- Clientes nao podem inserir direto na tabela (sem policy INSERT para authenticated)
- Toda insercao passa pela Edge Function com service_role
- Produtor ve somente views dos seus conteudos (RLS por `producer_name`)
- Admin ve tudo
- Views do proprio produtor sao marcadas e nao contam para royalties
- Rate limit de 20 views validas por dia por usuario
- Deduplicacao: 1 view por usuario por filme por dia
