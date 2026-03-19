

## Plan: Habilitar PIX no Checkout de Assinatura

### Diagnóstico

O código atual da Edge Function `create-checkout` já usa o Checkout Pro do Mercado Pago com `excluded_payment_types: []` (nenhum método excluído), o que teoricamente permite PIX. Porém, o campo `installments: 1` pode estar restringindo os métodos exibidos. Vamos ajustar a configuração para garantir que PIX apareça explicitamente.

### Alteração

**Arquivo:** `supabase/functions/create-checkout/index.ts`

Atualizar o bloco `payment_methods` para:
- Remover a restrição de `installments: 1` (PIX não usa parcelamento)
- Garantir que o tipo `bank_transfer` (que inclui PIX) não esteja excluído
- Adicionar `default_payment_method_id: "pix"` para priorizar PIX como opção visível

```typescript
payment_methods: {
  excluded_payment_types: [],
  default_payment_method_id: "pix",
},
```

Isso remove a limitação de parcelamento que pode estar escondendo PIX e configura PIX como método padrão na tela de checkout do Mercado Pago.

### Nota importante

Se após essa alteração o PIX ainda não aparecer, o problema pode estar na configuração da conta do Mercado Pago (a chave PIX precisa estar cadastrada no painel do Mercado Pago).

