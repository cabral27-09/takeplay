# Upload de episódio: só o essencial

Quando o conteúdo for um episódio vinculado a uma série, o formulário mostra hoje título, sinopse, capa do episódio, duração, gêneros, imagens, trailer, tier, ano, classificação etc. Tudo isso sai.

## Como fica

Ao selecionar uma série existente, o formulário exibe apenas:

- Série (seleção)
- Temporada
- Número do episódio
- Vídeo
- Botão "Adicionar Episódio"

Observação: mantenho o campo Temporada porque as abas de temporada no Bottom Sheet dependem dele. Se preferir, posso fixar sempre em 1 e remover o campo.

Tudo o mais é herdado automaticamente da série: título vira "Episódio N", sinopse vazia, capa/backdrop, gêneros, ano, produtora, classificação, idioma, tier, status publicado. A duração passa a ser detectada/salva como o valor padrão, sem campo visível.

## Onde aplicar

- `src/pages/admin/MovieForm.tsx` — ramo `content_type === 'serie'` com `series_id` preenchido: remover os inputs de título, sinopse, duração e capa do episódio; esconder as seções Informações Básicas, Gêneros, Mídia (imagens/trailer) e Acesso/Publicação quando `isAddingEpisode`.
- `src/pages/producer/UploadMovie.tsx` — mesmo tratamento no bloco de episódio.
- `src/pages/admin/UploadVideo.tsx` — já está enxuto; apenas remover o campo Duração para ficar idêntico aos demais.

## Detalhes técnicos

No submit, quando `isAddingEpisode`: `title = \`Episódio ${current_episode}\``, `synopsis = ''`, e demais campos preenchidos a partir de `selectedSeriesData` (thumbnail, backdrop, genre_ids, year, age_rating, language, min_tier, producer_name), `status = 'published'`. Validação exige apenas série, temporada, número do episódio e vídeo. Sem mudança de schema nem de estilo visual.
