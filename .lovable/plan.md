

## Plano: Card inteiro clicável com hover e feedback visual

### O que muda

Transformar o `motion.div` do `PricingCard` em um elemento clicável inteiro, com:

1. **Cursor pointer** no card (exceto quando é o plano atual)
2. **Hover sutil** — leve elevação de borda e brilho ao passar o mouse (`hover:border-primary/50 hover:shadow-md`)
3. **Active state** — mudança de cor ao clicar (`active:bg-primary/10`)
4. **onClick no card** — chama a mesma `handleAction` que o botão já usa
5. **Transição suave** — `transition-all duration-200`

### Arquivo: `src/components/pricing/PricingCard.tsx`

- Adicionar `onClick={handleAction}` no `motion.div` raiz
- Adicionar classes condicionais de hover/active/cursor (desabilitado se `isCurrentPlan` ou `isLoading`)
- O botão interno permanece para manter a affordance visual, mas o card inteiro será clicável

### Comportamento

- Plano atual: card **não** clicável, sem cursor pointer
- Outros planos: card clicável, hover com brilho sutil, click leva ao checkout
- Usuário não logado: click redireciona para login (mesmo comportamento atual)

