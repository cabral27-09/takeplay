# Modal de episódios no formato da referência

## O que muda

Ao clicar em "ASSISTIR" (destaque da home) ou no card de uma série, o painel sobreposto passa a seguir o layout enviado:

- Linha superior: botões retangulares "TEMPORADA 1", "TEMPORADA 2"... funcionando como abas. O selecionado fica destacado em amarelo; os demais ficam com contorno.
- Abaixo: grade de botões "EPISÓDIO 1", "EPISÓDIO 2"... somente texto, sem capa, sem duração, sem sinopse.
- Sem capa/título/sinopse ocupando o topo do painel — o foco é só temporadas e episódios (título curto da série fica apenas como referência acessível).
- Cantos arredondados no painel, espaçamento generoso entre os botões, como na imagem.

## Barra de progresso com memória

- Cada botão de episódio tem um preenchimento amarelo semitransparente que cresce da esquerda para a direita conforme o quanto já foi assistido.
- Parou na metade: fica metade preenchido. Terminou: preenchido por inteiro.
- A transparência é calibrada para o texto do episódio continuar legível sobre a parte preenchida.
- A memória vem do que já existe: o player grava a posição do episódio (histórico de visualização + registro local no navegador), então ao reabrir o painel as barras já aparecem no ponto certo, inclusive logo depois de sair do player.

## Detalhes técnicos

- `src/components/series/SeriesBottomSheet.tsx`: remover o bloco de capa/título/sinopse do cabeçalho, trocar as pills de temporada por botões retangulares (`rounded-md`, borda `border-border`, ativo em `bg-primary/`+texto contrastante) e ajustar a grade de episódios para botões com borda e rótulo em caixa alta.
- Preenchimento: `span` absoluto com `bg-primary/30` e `width: {percent}%`, texto em camada acima (`relative z-10`) para manter a leitura.
- Progresso continua vindo de `useEpisodeProgress` (video_views + `localStorage` via `src/lib/episodeProgress.ts`); sem mudanças de banco, policies ou edge functions.
- Nenhuma alteração em navegação: clicar no episódio fecha o painel e vai para `/watch/:id`.
