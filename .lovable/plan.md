

## Plan: Ajustar nome do secret nas Edge Functions

Alterar a referência `MP_ACCESS_TOKEN` para `MP_ACESS_TOKEN` nas 3 Edge Functions:

### Arquivos a editar

1. **supabase/functions/create-checkout/index.ts** — linha que lê `Deno.env.get("MP_ACCESS_TOKEN")` → `Deno.env.get("MP_ACESS_TOKEN")`
2. **supabase/functions/create-producer-checkout/index.ts** — mesma alteração
3. **supabase/functions/mp-webhook/index.ts** — mesma alteração

Cada arquivo tem exatamente 1 ocorrência para trocar.

