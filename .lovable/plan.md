

## Problema

O webhook do Mercado Pago **nunca é chamado** porque as funções `create-checkout` e `create-producer-checkout` não incluem o campo `notification_url` na preferência enviada ao Mercado Pago. Sem esse campo, o Mercado Pago não sabe para onde enviar a notificação de pagamento aprovado, e a tabela `admin_subscriptions` nunca é atualizada.

Evidência: logs do `mp-webhook` estão vazios e a tabela `payments` está vazia.

## Solução

### 1. Adicionar `notification_url` nas preferências de checkout

Nas duas Edge Functions (`create-checkout` e `create-producer-checkout`), adicionar o campo `notification_url` apontando para a Edge Function `mp-webhook`:

```typescript
notification_url: `${Deno.env.get("SUPABASE_URL")}/functions/v1/mp-webhook`,
```

Isso vai dentro do body do `JSON.stringify()` enviado à API de preferências do Mercado Pago, ao lado de `back_urls`, `auto_return`, etc.

### 2. Adicionar fallback no retorno de sucesso (Pricing page)

Quando o usuário retorna com `?success=true` e o webhook ainda não processou, adicionar um fallback que tenta ativar a assinatura diretamente consultando o pagamento no Mercado Pago. Criar uma nova Edge Function `sync-payment-status` que:

- Recebe o `user_id` autenticado
- Busca a preferência mais recente do usuário no Mercado Pago (via `external_reference`)
- Se encontrar pagamento aprovado, faz o mesmo upsert na `admin_subscriptions`

**Alternativa mais simples** (recomendada): Em vez de criar uma nova função, apenas garantir que o `notification_url` funcione corretamente. O webhook do Mercado Pago geralmente é enviado em poucos segundos após o pagamento.

### Arquivos a editar

1. **`supabase/functions/create-checkout/index.ts`** — adicionar `notification_url` no body da preferência
2. **`supabase/functions/create-producer-checkout/index.ts`** — adicionar `notification_url` no body da preferência

### Detalhe técnico

A URL do webhook será construída usando `SUPABASE_URL` (já disponível como variável de ambiente nas Edge Functions):

```
https://frakvusemijynkcfsywj.supabase.co/functions/v1/mp-webhook
```

O `mp-webhook` já está configurado com `verify_jwt = false` no `config.toml`, então aceitará chamadas externas do Mercado Pago sem autenticação JWT.

