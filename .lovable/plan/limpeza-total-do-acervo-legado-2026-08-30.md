# Limpeza total do acervo legado

Apagar todo o conteúdo antigo (vídeos, imagens e cadastros) para recomeçar o envio manual pelo próprio site.

## O que será apagado

1. **Bucket `videos`** (deste projeto): tudo — `movies/`, `_tmp/`, `temp/` (~46 GB no total).
2. **Bucket `movie-images`**: todas as capas e backdrops (84 arquivos).
3. **Cadastros de conteúdo no banco**: todos os filmes/séries/episódios da tabela `movies`, junto com os registros ligados a eles:
   - `movie_genres` (gêneros vinculados a cada título)
   - `video_views` (histórico de visualizações)

## O que NÃO será tocado

- Usuários, perfis, papéis (admin/produtor/espectador) e assinaturas.
- Lista de gêneros cadastrados (`genres`) — continua disponível para os novos cadastros.
- Pagamentos e histórico financeiro.
- Bucket externo `manivela_filmes` (fica como está; nada é copiado para lá).

## Como será feito

- Uma limpeza de armazenamento que lista e remove em lote todos os objetos dos dois buckets, em páginas, até esvaziá-los (inclui os restos de uploads interrompidos).
- Uma operação no banco removendo, nesta ordem: `video_views` → `movie_genres` → `movies`.
- Ao final, confirmação com a contagem de arquivos restantes (deve ser zero) e de filmes restantes (zero).

## Depois da limpeza

O site fica com o catálogo vazio e você recadastra cada título pelo painel, enviando vídeo e capa normalmente pelo fluxo de upload atual.

## Aviso

Esta ação é irreversível: os arquivos e cadastros apagados não podem ser recuperados.
