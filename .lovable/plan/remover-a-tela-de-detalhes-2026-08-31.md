# Remover a tela de detalhes

A página de detalhes repete o que já aparece na home e no card, então ela sai do site.

## O que muda

- A rota `/movie/:id` deixa de existir e a página de detalhes é apagada.
- Clicar no card de um filme (não série) leva direto para o player.
- Clicar no card de uma série continua abrindo o modal de temporadas e episódios.
- No destaque da home, o botão "Mais Detalhes" é removido; fica só "ASSISTIR".
- No painel do produtor, o botão que abria os detalhes de um título passa a abrir o player.

## Detalhes técnicos

- `src/App.tsx`: remover o import de `MovieDetail` e a rota `/movie/:id`.
- Apagar `src/pages/MovieDetail.tsx`.
- `src/components/movies/MovieCard.tsx`: trocar `Link to={/movie/:id}` por `Link to={/watch/:id}` no caso não-série.
- `src/components/home/HeroSection.tsx`: remover o bloco do botão "Mais Detalhes" (e o import de `Info` se ficar sem uso).
- `src/pages/producer/Movies.tsx`: trocar o link `/movie/:id` por `/watch/:id`.
- `src/components/series/SeasonEpisodeList.tsx` fica sem uso após a remoção; apagar o arquivo.
- Sem mudanças de banco, policies ou edge functions.
