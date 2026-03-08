

# Migração de Stripe para Mercado Pago (Checkout Pro)

## Resumo

Substituir toda a integração Stripe por Mercado Pago usando **Checkout Pro** (redirect) para ambos os fluxos: assinaturas de viewers e pagamentos avulsos de produtores.

O Mercado Pago Checkout Pro não suporta assinaturas recorrentes nativas no modo redirect — ele funciona como pagamento único. Para recorrência (Standard/Premium), usaremos a **API de Preapproval (assinaturas)** do Mercado Pago, que também faz redirect para o usuário autorizar o pagamento recorrente.

---

## Arquivos impactados

### Edge Functions a REESCREVER:
1. **`supabase/functions/create-checkout/index.ts`** → Criar preferência de assinatura (Preapproval) no Mercado Pago para viewers
2. **`supabase/functions/create-producer-checkout/index.ts`** → Criar preferência de pagamento único no Mercado Pago para produtores
3. **`supabase/functions/check-subscription/index.ts`** → Verificar assinatura via API do Mercado Pago (em vez de Stripe)
4. **`supabase/functions/check-producer-purchase/index.ts`** → Verificar pagamento via API do Mercado Pago (em vez de Stripe)
5. **`supabase/functions/customer-portal/index.ts`** → Remover (Mercado Pago não tem portal equivalente ao Stripe)

### Frontend a ATUALIZAR:
6. **`src/lib/subscription-tiers.ts`** → Trocar `priceId`/`productId` do Stripe por IDs do Mercado Pago (plan IDs para assinaturas, preference IDs para avulsos)
7. **`src/pages/Pricing.tsx`** → Remover referência ao customer-portal, ajustar fluxo de sucesso
8. **`src/pages/producer/Pricing.tsx`** → Atualizar texto "Stripe" → "Mercado Pago"
9. **`src/components/subscription/SubscriptionGate.tsx`** → Sem mudanças estruturais (já chama `create-checkout`)
10. **`src/components/subscription/PaymentSuccessModal.tsx`** → Remover botão "Ver Fatura" (portal Stripe)
11. **`src/contexts/AuthContext.tsx`** → Sem mudanças (já chama `check-subscription`)

### Config:
12. **`supabase/config.toml`** → Adicionar novas functions se necessário

---

## Passo a passo

### 1. Configurar secret do Mercado Pago
- Usar `add_secret` para solicitar o **Access Token** de produção do Mercado Pago (`MP_ACCESS_TOKEN`)
- A Public Key não é necessária no backend (só seria usada para Checkout Bricks no frontend)

### 2. Criar produtos/planos no Mercado Pago
- Antes de codificar, você precisará criar os planos de assinatura no painel do Mercado Pago (ou via API) para Standard e Premium
- Para produtores (pagamento único), usaremos a API de Preferências do Mercado Pago

### 3. Reescrever `create-checkout` (Assinaturas de Viewers)
- Usar a API de Preapproval do Mercado Pago (`POST /preapproval`) para criar assinaturas recorrentes
- Mapear Standard → plan_id do MP, Premium → plan_id do MP
- Retornar `init_point` (URL de redirect) ao frontend

### 4. Reescrever `create-producer-checkout` (Pagamentos Avulsos)
- Usar a API de Preferências (`POST /checkout/preferences`) para pagamento único
- Configurar `items` com preço e título do plano de produtor
- Retornar `init_point` ao frontend

### 5. Reescrever `check-subscription` (Verificar Assinatura)
- Manter prioridade de `admin_subscriptions` (sem mudança)
- Substituir consulta ao Stripe por consulta à API do Mercado Pago: buscar assinaturas ativas do usuário via `GET /preapproval/search?payer_email={email}&status=authorized`
- Retornar tier baseado no plan_id encontrado

### 6. Reescrever `check-producer-purchase`
- Manter consulta local ao `producer_purchases` (sem mudança)
- Substituir fallback Stripe por consulta ao Mercado Pago: buscar pagamentos aprovados via `GET /v1/payments/search?payer.email={email}&status=approved`
- Sincronizar com `producer_purchases` como já faz hoje

### 7. Remover `customer-portal`
- Deletar a edge function (Mercado Pago não tem equivalente)
- Remover referências no `PaymentSuccessModal.tsx` e `Pricing.tsx`

### 8. Atualizar frontend
- Trocar IDs de preço/produto do Stripe por IDs do Mercado Pago em `subscription-tiers.ts`
- Remover botão "Gerenciar Assinatura" (customer portal) do `Pricing.tsx`
- Remover botão "Ver Fatura" do `PaymentSuccessModal.tsx`
- Atualizar textos de "Stripe" para "Mercado Pago" no `producer/Pricing.tsx`

---

## Pré-requisitos antes de implementar

Precisarei de você:
1. **Access Token de produção** do Mercado Pago
2. **Plan IDs** para os planos Standard e Premium (se já criou no painel do MP), ou se quer que eu crie via API durante a implementação

