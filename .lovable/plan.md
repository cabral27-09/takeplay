

# Plano: Adicionar Gerenciamento Manual de Uploads para Produtores

## Problema Identificado

Atualmente, a área de gerenciamento de usuários permite:
- ✅ Conceder roles (viewer, producer, admin)
- ✅ Conceder assinaturas de visualização (Grátis, Standard, Premium)
- ❌ **NÃO permite conceder uploads de produtor manualmente**

O sistema `UploadGate` verifica a tabela `producer_purchases`, que só é populada via pagamentos no Stripe. Você precisa de uma forma de conceder uploads manualmente para produtores específicos.

## Solução

Adicionar na página de Gerenciamento de Usuários (Admin → Users) uma nova seção para **conceder uploads de produtor** manualmente, similar ao que já existe para assinaturas de visualização.

---

## Arquivos a Modificar

| Arquivo | Alteração |
|---------|-----------|
| `src/pages/admin/Users.tsx` | Adicionar UI para gerenciar uploads de produtores |
| `src/hooks/useAdminSubscriptions.ts` | Adicionar funções para gerenciar `producer_purchases` manualmente |
| `supabase/functions/check-producer-purchase/index.ts` | Verificar também compras concedidas por admin |

---

## Detalhes da Implementação

### 1. Nova Coluna na Tabela de Usuários

Adicionar uma coluna "Uploads de Produtor" na tabela de usuários que mostra:
- Quantidade de uploads restantes
- Se foi concedido manualmente pelo admin ou via Stripe

### 2. Menu de Ações Expandido

No dropdown de ações de cada usuário (com role `producer`), adicionar:
- **Conceder Uploads** → Abre dialog para definir quantidade (1, 5, 10, ou personalizado)
- **Visualizar Compras** → Mostra histórico de compras/concessões
- **Revogar Uploads** → Remove uploads concedidos manualmente

### 3. Dialog de Concessão de Uploads

Um modal para definir:
- Quantidade de uploads (1, 5, 10, ou input customizado)
- Data de expiração (opcional)
- Motivo da concessão

### 4. Modificação na Tabela `producer_purchases`

Os registros criados manualmente terão:
- `stripe_payment_intent_id`: valor especial como `admin_grant_{timestamp}` para indicar que foi manual
- `tier`: valor como `admin_grant` para diferenciar de compras normais

---

## Fluxo Visual

```text
┌─────────────────────────────────────────────────────────────────┐
│  Gerenciar Usuários (Admin)                                     │
├─────────────────────────────────────────────────────────────────┤
│  Usuário     │ Roles      │ Assinatura  │ Uploads    │ Ações   │
├──────────────┼────────────┼─────────────┼────────────┼─────────┤
│  João Silva  │ Produtor   │ Stripe      │ 5 restam   │   ⋮     │
│              │            │             │ (Admin)    │         │
├──────────────┼────────────┼─────────────┼────────────┼─────────┤
│  Maria       │ Espectador │ Premium     │ -          │   ⋮     │
│              │            │ (Admin)     │            │         │
└─────────────────────────────────────────────────────────────────┘

                              │
                              ▼ (Clica em ⋮ do produtor)

         ┌────────────────────────────────────┐
         │  Adicionar Role                    │
         │  ─────────────────────────────     │
         │  Remover Role                      │
         │  ─────────────────────────────     │
         │  Assinatura                        │
         │  ─────────────────────────────     │
         │  🆕 Uploads de Produtor        ▶   │──▶ Conceder Uploads
         │                                    │    Visualizar Histórico
         │                                    │    Revogar Uploads
         └────────────────────────────────────┘
```

---

## Hook Atualizado

O `useAdminSubscriptions.ts` será expandido para incluir:

```typescript
// Novas funções para producer_purchases
grantProducerUploads: ({ userId, uploadsAllowed, expiresAt, reason }) => void
revokeProducerUploads: (purchaseId) => void
```

---

## Edge Function Atualizada

A função `check-producer-purchase` já verifica a tabela `producer_purchases`, então registros criados manualmente pelo admin serão automaticamente reconhecidos.

---

## Resultado Esperado

1. Admin pode conceder uploads para qualquer produtor sem precisar de pagamento no Stripe
2. Uploads concedidos aparecem marcados como "(Admin)" na interface
3. Sistema de upload (`UploadGate`) reconhece automaticamente os uploads concedidos
4. Histórico completo de concessões fica registrado para auditoria

