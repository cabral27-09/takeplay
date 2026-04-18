

## Diagnóstico final

Confirmei no banco: o usuário JÁ TEM as 3 roles (`viewer`, `admin`, `producer`). As policies do bucket `videos` permitem upload para admin/producer. Então **não é problema de permissão**.

O bug real está em `src/contexts/UploadContext.tsx`:

### Problema 1: Header `authorization` lowercase
Na config inicial do TUS (linha 102) está `authorization` em minúsculo. O Supabase é case-sensitive aqui em alguns casos e o tus-js-client trata o objeto inicial como literal — quando o `onBeforeRequest` (linha 114) sobrescreve com `Authorization` (maiúsculo), pode resultar em **dois headers duplicados** (`authorization` + `Authorization`), e o backend do Supabase Storage rejeita pegando o errado/vazio → "Invalid Compact JWS".

### Problema 2: `onBeforeRequest` é assíncrono mas o tus-js-client não aguarda corretamente em todos os casos
A primeira request POST (criação) pode sair com o token original do `headers:` antes do `onBeforeRequest` rodar. Se houver qualquer corrupção (header duplicado), falha.

### Problema 3: Falta o header `apikey`
Apesar da remoção anterior, o endpoint `https://<ref>.storage.supabase.co/storage/v1/upload/resumable` **exige** o header `apikey` com a anon key. Sem isso, o gateway do Supabase rejeita antes mesmo de validar o JWT, retornando o mesmo erro genérico "Invalid Compact JWS".

## Plano de correção

**Arquivo:** `src/contexts/UploadContext.tsx`

1. Remover o header `authorization` minúsculo do objeto `headers` inicial. Deixar SOMENTE `x-upsert` ali.
2. Mover toda a lógica de auth para `onBeforeRequest`, setando **`Authorization`** (maiúsculo) E **`apikey`** com `VITE_SUPABASE_PUBLISHABLE_KEY` em TODA request.
3. Garantir que o `onBeforeRequest` retorna uma Promise resolvida corretamente (já é async, ok).
4. Adicionar log dentro do `onBeforeRequest` mostrando o método/URL e os primeiros 20 chars do token, para confirmar no console que cada request leva o JWT certo.
5. Manter `removeFingerprintOnSuccess: true` e NÃO chamar `findPreviousUploads()` (já está correto).

### Resultado esperado
A primeira request POST de criação vai sair com `Authorization: Bearer <jwt>` + `apikey: <anon>`, sem header duplicado, e o Supabase Storage vai aceitar.

### Se ainda falhar após isso
Próximo passo seria limpar manualmente `localStorage` (chaves começando com `tus::`) — vou orientar você a fazer isso também antes do teste.

