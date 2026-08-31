# Modal centralizado de temporadas e episódios

## O que muda

O painel de séries deixa de subir pela parte de baixo da tela e passa a ser um **modal centralizado**:

- Aparece no centro da tela, com fundo escurecido atrás, cantos arredondados e largura máxima confortável (rola internamente se tiver muitos episódios).
- **Header do modal**: a linha de botões de temporada ("TEMPORADA 1", "TEMPORADA 2"...), funcionando como abas. A ativa fica amarela; as outras com contorno.
- **Corpo do modal**: grade de botões "EPISÓDIO 1", "EPISÓDIO 2"..., somente texto.
- Cada botão de episódio mantém a barrinha de progresso amarela semitransparente, preenchida conforme o quanto já foi assistido.
- Botão de fechar (X) no canto e fechar clicando fora.
- Clicar num episódio fecha o modal e vai para o player.

Comportamento igual no desktop e no celular (no celular o modal ocupa quase toda a largura).

## Detalhes técnicos

- `src/components/series/SeriesBottomSheet.tsx`: trocar `Sheet`/`SheetContent side="bottom"` pelo `Dialog`/`DialogContent` já existente em `src/components/ui/dialog.tsx` (centralizado por padrão), com `sm:max-w-3xl`, `max-h-[85vh]` e `overflow-y-auto`.
- Header vira `DialogHeader` contendo o `DialogTitle` (nome da série, discreto) e a fileira de botões de temporada; grade de episódios no corpo.
- Nenhuma mudança em `useSeriesEpisodes`, `useEpisodeProgress`, banco, policies ou navegação. Chamadas em `HeroSection` e `MovieCard` continuam iguais (mesmas props `open`/`onOpenChange`).
