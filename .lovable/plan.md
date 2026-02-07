
# Plano: Corrigir Endpoint TUS para Upload de Vídeos

## Problema Identificado

O erro **400 Bad Request** está ocorrendo porque o endpoint TUS está incorreto.

**Endpoint atual (ERRADO):**
```
https://frakvusemijynkcfsywj.supabase.co/storage/v1/upload/resumable
```

**Endpoint correto (conforme documentação Supabase):**
```
https://frakvusemijynkcfsywj.storage.supabase.co/storage/v1/upload/resumable
```

A diferença é o subdomínio `.storage.` que precisa ser adicionado.

---

## Solução

Modificar a linha 17 do arquivo `src/components/admin/VideoUploader.tsx`:

**De:**
```typescript
const TUS_ENDPOINT = `https://${SUPABASE_PROJECT_ID}.supabase.co/storage/v1/upload/resumable`;
```

**Para:**
```typescript
const TUS_ENDPOINT = `https://${SUPABASE_PROJECT_ID}.storage.supabase.co/storage/v1/upload/resumable`;
```

---

## Arquivo a Modificar

| Arquivo | Alteração |
|---------|-----------|
| `src/components/admin/VideoUploader.tsx` | Corrigir endpoint TUS (adicionar `.storage.` no subdomínio) |

---

## Por Que o Erro Aconteceu

O Supabase tem dois endpoints diferentes:
- **API principal:** `https://[PROJECT_ID].supabase.co` → Para autenticação, banco, funções
- **Storage direto:** `https://[PROJECT_ID].storage.supabase.co` → Para uploads TUS

O upload TUS precisa ir diretamente para o servidor de Storage, não para a API principal.

---

## Resultado Esperado

Após a correção:
1. O upload TUS iniciará corretamente
2. O progresso será exibido
3. Arquivos de até 6GB poderão ser enviados
4. Pause/resume funcionará nativamente
