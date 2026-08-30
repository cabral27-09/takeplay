# Seleção de séries em Bottom Sheet

## O que muda

Ao clicar no card de uma série (conteúdo com `content_type = serie` e sem série-pai), em vez de navegar para a página de detalhe, abre um Bottom Sheet sobreposto à tela atual:

- Cabeçalho: imagem de capa, título e sinopse da série, e abaixo os botões de temporada (Temporada 1, 2, 3...), no estilo dos botões já usados nos filtros do site.
- Corpo: grade de botões de episódio, apenas com o texto "EPISÓDIO 1", "EPISÓDIO 2", etc. Sem miniatura, sem duração, sem sinopse.
- Cada botão de episódio funciona também como barra de progresso: um preenchimento no fundo do botão mostra quanto daquele episódio o usuário já assistiu (metade assistida = metade preenchida). Episódio concluído aparece totalmente preenchido.
- Trocar de temporada atualiza a grade instantaneamente.
- Clicar no botão leva direto para o player daquele episódio (`/watch/:id`).

Filmes e espetáculos continuam abrindo a página de detalhe normalmente. Nenhuma outra parte do sistema muda.

## Progresso assistido

O progresso vem do histórico já gravado pelo player (segundos assistidos por episódio) e é combinado com um registro local no navegador, para que a barra apareça imediatamente mesmo antes da sincronização. Percentual = segundos assistidos ÷ duração do episódio, limitado a 100%.

## Detalhes técnicos

- Novo componente `src/components/series/SeriesBottomSheet.tsx` usando o `Sheet` existente (`side="bottom"`), com `useSeriesEpisodes` para temporadas/episódios e `Skeleton` no carregamento.
- Novo hook `src/hooks/useEpisodeProgress.ts`: lê `video_views` do próprio usuário (SELECT já permitido pelas policies) para os episódios da série e mescla com progresso salvo em `localStorage`; nenhuma mudança de banco, policy ou edge function.
- O player (`Watch`) passa a salvar também a posição atual em `localStorage` por episódio — única alteração fora do fluxo do sheet, necessária para a barra refletir paradas no meio.
- `src/components/movies/MovieCard.tsx`: quando o item for uma série, o card abre o sheet em vez de usar `Link`; visual do card inalterado.
- Sem redesign: cores, tipografia, botões e espaçamentos são os tokens/componentes já existentes.
