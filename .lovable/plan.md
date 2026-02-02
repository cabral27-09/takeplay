
# Plano: Corrigir Endpoint do TUS Upload

## Problema Identificado

O upload está falhando com o erro:
```
tus: failed to create upload, caused by [object ProgressEvent]
url: https://frakvusemijynkcfsywj.storage.supabase.co/upload/resumable
response code: n/a
```

O **response code: n/a** indica que a requisição nunca chegou ao servidor - a URL está incorreta.

## Causa Raiz

Ao comparar com a documentação oficial do Supabase, encontrei o problema:

| Atual (incorreto) | Correto (documentação) |
|-------------------|------------------------|
| `${projectId}.storage.supabase.co/upload/resumable` | `${projectId}.storage.supabase.co/storage/v1/upload/resumable` |

**Está faltando `/storage/v1/` no caminho da URL!**

## Solução

Corrigir a linha 86 do arquivo `src/components/admin/VideoUploader.tsx`:

```typescript
// ANTES (incorreto - falta /storage/v1/)
const directEndpoint = `https://${projectId}.storage.supabase.co/upload/resumable`;

// DEPOIS (correto - de acordo com documentação oficial)
const directEndpoint = `https://${projectId}.storage.supabase.co/storage/v1/upload/resumable`;
```

## Arquivo a Modificar

| Arquivo | Linha | Alteração |
|---------|-------|-----------|
| `src/components/admin/VideoUploader.tsx` | 86 | Adicionar `/storage/v1/` no endpoint |

## Resultado Esperado

Após esta correção:
1. O upload de vídeos de 3.49GB+ deve funcionar
2. O endpoint correto contornará os limites de proxy da URL principal
3. A requisição chegará corretamente ao servidor de storage
