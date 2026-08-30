# Seleção de séries em Bottom Sheet

## O que muda

Ao clicar no card de uma série (conteúdo com `content_type = serie` e sem série-pai), em vez de navegar para a página de detalhe, abre um Bottom Sheet sobreposto à tela atual:

- Topo: nome da série e as temporadas como abas horizontais (Temporada 1, 2, 3...).
- Abaixo: lista dos episódios da temporada selecionada, nomeados "Episódio 1", "Episódio 2", etc., com miniatura, duração e sinopse quando existirem.
- Trocar de aba atualiza a lista instantaneamente, sem recarregar nem abrir página.
- Clicar num episódio leva direto ao player (`/watch/:id`), como já acontece hoje.

Filmes e espetáculos continuam abrindo a página de detalhe normalmente. Nenhuma outra parte do sistema muda.

## Detalhes técnicos

- Novo componente `src/components/series/SeriesBottomSheet.tsx` usando o `Sheet` existente (`side="bottom"`), reaproveitando o hook `useSeriesEpisodes` e os componentes `Tabs`, `Skeleton` e `Button` já presentes.
- A lista de episódios reutiliza o mesmo layout de item já existente em `SeasonEpisodeList` (miniatura + título + duração), apenas com o rótulo "Episódio N".
- `src/components/movies/MovieCard.tsx`: quando o item for uma série, o card passa a abrir o sheet (botão com o mesmo visual atual) em vez de usar `Link`; o restante do card fica idêntico.
- Sem mudanças de banco, backend, rotas ou tokens de design.
