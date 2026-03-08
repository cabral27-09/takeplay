

## Diagnóstico: Botão "Criar Pix" desativado no Mercado Pago

### Causa raiz identificada

O botão "Criar Pix" está desativado porque **você está testando com a mesma conta do Mercado Pago que é dona da integração (collector)**. O Mercado Pago **não permite que você pague para si mesmo**. Isso não é um bug no código — é uma restrição da plataforma.

Para testar, use uma conta de comprador diferente (outro e-mail/CPF no Mercado Pago).

### Problemas adicionais encontrados

Mesmo que o pagamento funcione com outra conta, existem dois problemas críticos que impedirão o sistema de funcionar corretamente:

**1. `check-subscription` ainda busca preapprovals (assinaturas recorrentes)**
- O checkout agora cria pagamentos avulsos via Preferences API, mas o `check-subscription` busca `preapproval/search?status=authorized` — que nunca encontrará pagamentos feitos via Checkout Pro.
- Resultado: mesmo após pagar, o usuário continuará como "free".

**2. `check-producer-purchase` ainda usa Stripe**
- A função importa o SDK do Stripe e busca `paymentIntents` via Stripe, mas o checkout do produtor agora usa Mercado Pago.
- Resultado: compras de produtor via Mercado Pago nunca serão detectadas.

### Plano de correção

#### Tarefa 1: Criar webhook do Mercado Pago
Criar uma Edge Function `mp-webhook` que recebe notificações de pagamento do Mercado Pago. Quando um pagamento é aprovado:
- Extrair `external_reference` (formato: `userId|tier`)
- Para tiers de viewer (`standard`/`premium`): inserir/atualizar registro na tabela `admin_subscriptions` com `is_active=true` e validade de 30 dias
- Para tiers de produtor: inserir registro na tabela `producer_purchases` com os uploads e validade corretos

#### Tarefa 2: Atualizar `check-subscription`
Alterar para buscar assinaturas na tabela `admin_subscriptions` (ou nova tabela `subscriptions`) em vez de consultar a API de preapprovals do Mercado Pago. O webhook já terá gravado o pagamento no banco.

#### Tarefa 3: Atualizar `check-producer-purchase`
Remover dependência do Stripe. Buscar apenas na tabela `producer_purchases` local, que será populada pelo webhook.

#### Tarefa 4: Criar tabela de pagamentos (se necessário)
Criar uma tabela `payments` para registrar todos os pagamentos recebidos via webhook, servindo como audit log.

### Detalhes técnicos

```text
Fluxo atual (quebrado):
  User → Checkout Pro → Paga → Volta ao site → check-subscription busca preapproval → não encontra → "free"

Fluxo corrigido:
  User → Checkout Pro → Paga → MP envia webhook → mp-webhook grava no DB → check-subscription lê do DB → tier correto
```

A URL do webhook será: `https://frakvusemijynkcfsywj.supabase.co/functions/v1/mp-webhook`
Essa URL precisará ser configurada nas notificações do Mercado Pago (painel do MP → Integrações → Notificações IPN/Webhooks).

