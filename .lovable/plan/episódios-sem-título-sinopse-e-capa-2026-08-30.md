# Episódios sem título, sinopse e capa

Confirmação: o Bottom Sheet já está como pedido — capa, título e sinopse aparecem só da série, e os episódios são apenas botões "Episódio 1", "Episódio 2"... Nada muda ali.

As duas mudanças a fazer são no cadastro e nas listagens.

## 1. Cadastro de episódios (painel admin)

No formulário de upload, quando o tipo for "episódio de série":

- Remover os campos Título do Episódio, Sinopse do Episódio e a imagem de capa do episódio.
- O episódio passa a ser salvo automaticamente como:
  - título: "Episódio N" (N = número informado em Episódio)
  - sinopse: vazia
  - capa: a mesma capa da série selecionada
- Continuam obrigatórios: série, temporada, número do episódio e o vídeo.

## 2. Listagens do catálogo

Garantir que episódios nunca apareçam como cards soltos no catálogo — só a série aparece, e os episódios são acessados pelo Bottom Sheet.

Páginas a ajustar (hoje ainda podem exibir episódios avulsos):

- Início (destaques e carrosséis)
- Explorar / Browse
- Busca
- Gêneros
- Trailers (quando aplicável)

A página de Séries já filtra corretamente e serve de referência.

## Detalhes técnicos

- `src/pages/admin/UploadVideo.tsx`: no ramo `isEpisode`, ocultar inputs `ep_title`, `ep_synopsis` e o `ImageUploader` do episódio; no insert usar `title: \`Episódio ${currentEpisode}\``, `synopsis: null`, `thumbnail_url: selectedSeriesData?.thumbnail_url`. Ajustar validação (não exigir mais título).
- Filtro de episódios: aplicar `content_type !== 'serie' || !series_id` (mesma regra de `Series.tsx`) nas listagens de `Index.tsx`, `Browse.tsx`, `Search.tsx`, `Genres.tsx`, `Trailers.tsx` e nos destaques do `HeroSection`. Preferência por centralizar o filtro em um helper reutilizável em `src/lib` usado por essas páginas.
- Nenhuma mudança de schema, de estilo visual ou no player.
