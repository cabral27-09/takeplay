

## Correção: URL do endpoint TUS

### Problema
O código atual usa:
```
https://frakvusemijynkcfsywj.supabase.co/storage/v1/upload/resumable
```

A documentação oficial do Supabase exige o **hostname direto do storage**:
```
https://frakvusemijynkcfsywj.storage.supabase.co/storage/v1/upload/resumable
```

O gateway da API (`supabase.co`) rejeita o JWT com "Invalid Compact JWS" porque o proxy Kong processa a autenticação de forma diferente do endpoint direto de storage.

### Correção

**Arquivo:** `src/contexts/UploadContext.tsx`

1. Extrair o project ref da URL do Supabase
2. Construir o endpoint TUS correto usando `https://{projectRef}.storage.supabase.co/storage/v1/upload/resumable`

```typescript
const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;
const PROJECT_REF = import.meta.env.VITE_SUPABASE_PROJECT_ID;
// Endpoint direto do storage (obrigatório para TUS)
const TUS_ENDPOINT = `https://${PROJECT_REF}.storage.supabase.co/storage/v1/upload/resumable`;
```

E na criação do upload TUS, trocar:
```typescript
// DE:
endpoint: `${SUPABASE_URL}/storage/v1/upload/resumable`,
// PARA:
endpoint: TUS_ENDPOINT,
```

### Nenhuma outra alteração necessária
- As políticas RLS do bucket `videos` já permitem upload para admin e producer
- O resto da configuração TUS (headers, metadata, callbacks) está correto

