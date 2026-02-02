

# Plano: Corrigir Constraint para Permitir Concessões Manuais

## Problema Identificado

A tabela `producer_purchases` possui uma constraint CHECK que valida o campo `tier`:

```sql
CHECK (tier = ANY (ARRAY['produtor_anual', 'produtor_semestral', 'produtor_avulso']))
```

Quando o admin tenta conceder uploads manualmente com `tier: 'admin_grant'`, a constraint rejeita a inserção.

## Solução

Alterar a constraint para incluir o valor `admin_grant` na lista de valores permitidos.

---

## Alteração no Banco de Dados

### Migration SQL

```sql
-- Remover a constraint existente
ALTER TABLE producer_purchases DROP CONSTRAINT producer_purchases_tier_check;

-- Recriar com o novo valor permitido
ALTER TABLE producer_purchases ADD CONSTRAINT producer_purchases_tier_check 
  CHECK (tier = ANY (ARRAY['produtor_anual', 'produtor_semestral', 'produtor_avulso', 'admin_grant']));
```

---

## Resultado Esperado

1. O admin poderá conceder uploads manualmente sem erro
2. Os registros manuais serão salvos com `tier: 'admin_grant'`
3. Todas as outras validações continuam funcionando normalmente

---

## Observação Técnica

O valor `admin_grant` foi escolhido propositalmente para:
- Diferenciar concessões manuais de compras via Stripe
- Facilitar auditoria e relatórios
- Manter compatibilidade com a lógica existente no `check-producer-purchase`

