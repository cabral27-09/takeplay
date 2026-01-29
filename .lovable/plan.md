
# Plano: Solução Completa para Sincronização de Assinaturas Stripe

## Diagnóstico do Problema

### Problema Principal
Quando uma pessoa paga pelo plano Standard no Stripe, o sistema **não está atualizando automaticamente o acesso dela no app**. A cliente pagou, recebeu o recibo do Stripe, mas continua aparecendo como "Grátis" no TakePlay.

### Causa Raiz Identificada
1. **Email diferente no Stripe vs Supabase**: O sistema `check-subscription` busca pelo email do usuário logado no Supabase e procura um customer com esse email no Stripe. Se o email usado no checkout foi diferente, a sincronização falha.

2. **Checkout não vincula ao customer**: Quando um usuário novo faz checkout, o Stripe cria um customer com o email do Supabase, mas se o email já existia no Stripe (ex: outro account), pode haver mismatch.

3. **Modal mostra tier incorreto**: O modal de sucesso exibe antes da sincronização confirmar, causando confusão.

---

## Solução em 3 Frentes

### Frente 1: Corrigir Sincronização Imediata (Já implementado, mas precisa melhorar)

O código atual já tem retry logic, mas precisa ser mais agressivo e informar melhor o usuário.

**Melhorias:**
- Aumentar retries de 5 para 10
- Reduzir intervalo inicial para 1s (progressivo)
- Adicionar logs visíveis para debug
- Melhorar mensagem quando sync falha

### Frente 2: Configurar Recibos Automáticos no Stripe

O Stripe **já envia recibos automaticamente** quando configurado corretamente. Precisamos garantir que:
1. O checkout session tenha `payment_method_options.card.setup_future_usage` 
2. O customer tenha email configurado
3. A configuração de "Customer emails" esteja ativada no Stripe Dashboard

**Configuração necessária no Stripe Dashboard:**
- Settings → Customer emails → Enable "Successful payments"
- Settings → Customer emails → Enable "Subscriptions"

### Frente 3: Adicionar Botão "Baixar Recibo" no App

Após o pagamento, mostrar um botão para o usuário acessar o portal do Stripe onde pode baixar faturas/recibos.

---

## Detalhes Técnicos

### Arquivo 1: `src/pages/Pricing.tsx`

**Alterações:**
- Aumentar MAX_SYNC_RETRIES de 5 para 10
- Adicionar lógica de intervalo progressivo (1s, 2s, 3s...)
- Melhorar mensagem de fallback
- Adicionar botão "Ver minha fatura" no modal de sucesso

### Arquivo 2: `src/components/subscription/PaymentSuccessModal.tsx`

**Alterações:**
- Adicionar botão para abrir Customer Portal (faturas)
- Melhorar mensagens de loading/confirmação
- Mostrar informação sobre recibo por email

### Arquivo 3: `supabase/functions/check-subscription/index.ts`

**Alterações (opcional, para debug):**
- Adicionar mais logs detalhados
- Retornar email do customer Stripe para verificação de mismatch

### Arquivo 4: `supabase/functions/create-checkout/index.ts`

**Alterações:**
- Adicionar `invoice_creation.enabled` para gerar faturas
- Garantir que o email está sendo passado corretamente

---

## Fluxo Corrigido

```text
1. Usuario clica "Assinar Standard"
2. App redireciona para Stripe Checkout (mesma aba)
3. Usuario paga → Stripe envia recibo automaticamente por email
4. Stripe redireciona para /pricing?success=true
5. App mostra modal com loading "Confirmando pagamento..."
6. App tenta sincronizar (até 10x com intervalo progressivo)
7. Se sucesso: Modal mostra "Standard ativado!" + botão "Ver Fatura"
8. Se falha após 10 tentativas: Modal mostra instrução para contato + link para portal
9. Header atualiza badge para "Standard"
```

---

## Ação Imediata para a Cliente Atual

Para a mulher que já pagou e não foi ativada:
1. Você pode ativá-la manualmente no painel Admin → Usuários
2. Encontre ela pelo nome/data de cadastro
3. Clique em "Definir Plano" → Standard

**Porém, preciso do email dela** para confirmar se há mismatch entre Supabase e Stripe.

---

## Arquivos a Modificar

| Arquivo | Alteração |
|---------|-----------|
| `src/pages/Pricing.tsx` | Retry mais agressivo + melhor feedback |
| `src/components/subscription/PaymentSuccessModal.tsx` | Botão "Ver Fatura" + mensagem sobre email |
| `supabase/functions/create-checkout/index.ts` | Adicionar invoice_creation para garantir recibo |

---

## Resultado Esperado

1. **Recibo por email**: O Stripe já envia, mas vamos garantir configuração correta
2. **Sincronização robusta**: Até 10 tentativas com intervalo progressivo
3. **Feedback claro**: Modal mostra estado real da sincronização
4. **Acesso a faturas**: Botão para ver/baixar recibos no portal
5. **Fallback manual**: Se tudo falhar, instruções claras para contato

---

## Configuração Necessária no Stripe (sua ação)

Para garantir que os recibos sejam enviados automaticamente:

1. Acesse: https://dashboard.stripe.com/settings/emails
2. Em "Customer emails", ative:
   - ✅ Successful payments
   - ✅ Subscription renewals
   - ✅ Failed payments
3. Em "Invoices", ative:
   - ✅ Email invoices automatically

