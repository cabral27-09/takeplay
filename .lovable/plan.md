
# Plano: Sincronização Automática de Assinaturas e Feedback Visual

## Diagnóstico do Problema

O sistema atual **já funciona tecnicamente**, mas tem algumas falhas de experiência:

1. **O checkout abre em nova aba** (`window.open(data.url, '_blank')`) - Quando o usuário volta, precisa manualmente atualizar ou aguardar o `visibilitychange`
2. **O modal de sucesso pode mostrar "Premium" mesmo quando comprou "Standard"** - Porque `tierName` usa o valor antes da sincronização
3. **Race condition na detecção** - O `checkSubscription()` é chamado, mas o modal já está aberto com dados desatualizados
4. **Sem loading state durante verificação** - O usuário não sabe se está sincronizando

## Solução Proposta

### Fase 1: Melhorar Fluxo de Checkout

**Opção A: Redirecionar na mesma aba (recomendado)**
- Mudar de `window.open(url, '_blank')` para `window.location.href = url`
- O Stripe redireciona de volta para `/pricing?success=true`
- Mais confiável para sincronização automática

**Opção B: Manter nova aba com polling**
- Quando o usuário volta à aba, fazer múltiplas tentativas de sincronização
- Adicionar um intervalo de polling até detectar assinatura ativa

### Fase 2: Sincronização com Loading State

1. **Adicionar `isSubscriptionLoading` no estado**
   - Mostrar skeleton/spinner enquanto verifica
   - Prevenir decisões de acesso com dados desatualizados

2. **Retry logic no `checkSubscription`**
   - Se voltar de `success=true` e ainda for `free`, aguardar 2s e tentar novamente
   - Máximo de 3 tentativas

### Fase 3: Modal de Sucesso Inteligente

1. **Aguardar sincronização antes de exibir**
   - Mostrar loading no modal enquanto verifica
   - Só exibir o tier correto após confirmação

2. **Fallback se sync falhar**
   - Mostrar mensagem genérica "Assinatura ativada"
   - Orientar usuário a recarregar a página se necessário

---

## Detalhes Técnicos

### Arquivo: `src/pages/Pricing.tsx`

Mudanças:
- Trocar `window.open(data.url, '_blank')` para `window.location.href = data.url`
- Adicionar retry logic no useEffect de success
- Aguardar `checkSubscription()` completar antes de mostrar modal

```text
// Fluxo atual:
Usuario clica -> Abre nova aba -> Paga -> Volta manualmente -> Precisa dar refresh

// Fluxo proposto:
Usuario clica -> Redireciona -> Paga -> Volta automaticamente -> Sync automático -> Modal
```

### Arquivo: `src/contexts/AuthContext.tsx`

Mudanças:
- Adicionar `isSubscriptionLoading` state
- Retornar o resultado de `checkSubscription` para permitir `await`
- Opcional: adicionar retry interno

### Arquivo: `src/components/subscription/PaymentSuccessModal.tsx`

Mudanças:
- Aceitar prop `isLoading` para mostrar estado de verificação
- Mostrar skeleton animado enquanto confirma tier
- Exibir tier correto apenas após sincronização

### Arquivo: `src/components/subscription/SubscriptionGate.tsx` (se existir)

Verificar:
- Usa `isSubscriptionLoading` para prevenir bloqueios falsos

---

## Arquivos a Modificar

| Arquivo | Alteração |
|---------|-----------|
| `src/pages/Pricing.tsx` | Mudar para redirect na mesma aba + retry logic |
| `src/contexts/AuthContext.tsx` | Adicionar `isSubscriptionLoading` e melhorar `checkSubscription` |
| `src/components/subscription/PaymentSuccessModal.tsx` | Adicionar loading state |

---

## Resultado Esperado

1. Usuario clica em "Assinar" -> é redirecionado para Stripe
2. Paga com sucesso -> Stripe redireciona de volta para `/pricing?success=true`
3. App detecta `success=true` e inicia verificação com loading
4. Sincroniza com Stripe e obtém tier correto
5. Modal abre mostrando "Pagamento Confirmado - Standard" (tier correto)
6. Header atualiza badge para "Standard"
7. Usuario pode assistir conteúdo imediatamente

---

## Alternativa: Stripe Webhooks

Se quiser uma solução mais robusta para o futuro, podemos implementar webhooks do Stripe que:
- Escutam eventos `checkout.session.completed` e `customer.subscription.created`
- Salvam a assinatura no banco de dados Supabase
- Tornam a verificação instantânea sem depender de chamadas à API do Stripe

Isso seria uma melhoria de fase 2, mas o plano acima resolve o problema imediato.
