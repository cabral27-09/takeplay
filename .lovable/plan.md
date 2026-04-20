

## Voltar o upload para fluxo via Edge Functions do Lovable Cloud

Confirmado: o caminho que funcionava era enviar chunks para edge functions do projeto, que gravam no bucket `videos`. Vamos restaurar esse fluxo e abandonar o TUS direto do Storage que está sendo bloqueado em 0%.

## O que será construído

### 1. Edge Function `upload-video-chunk`
Recebe chunks autenticados do navegador e acumula no Storage:
- Valida JWT via `getClaims` (admin ou producer)
- Recebe `uploadId`, `chunkIndex`, `totalChunks`, `fileName`, `contentType` e o blob do chunk
- Grava cada chunk como objeto temporário em `videos/_tmp/<uploadId>/<chunkIndex>.part`
- Usa service role para escrever no bucket privado
- Retorna `{ ok: true, received: chunkIndex }`

### 2. Edge Function `finalize-video-upload`
Monta o arquivo final:
- Valida JWT e papel
- Lê todos os chunks de `_tmp/<uploadId>/`
- Concatena em ordem e faz upload do arquivo final como `movies/<timestamp>-<rand>.<ext>` no bucket `videos`
- Apaga a pasta `_tmp/<uploadId>/`
- Retorna `{ filePath }` no mesmo formato que o `UploadContext` já entrega para os formulários

### 3. Refatorar `src/contexts/UploadContext.tsx`
Trocar o cliente TUS por loop de chunks próprio:
- `chunkSize`: 5 MB (seguro pro limite de payload de edge function)
- Para cada chunk: `supabase.functions.invoke('upload-video-chunk', { body: FormData })` com retry exponencial
- Atualiza `progress`, `speed` e `fileName` igual hoje
- Pausa = parar o loop após o chunk atual; Retomar = continuar do próximo `chunkIndex`
- Cancelar = parar e chamar `finalize-video-upload` com flag `abort` (ou nova função `cancel-video-upload`) para limpar `_tmp`
- Ao terminar todos os chunks, chama `finalize-video-upload` e dispara `onCompleteRef.current(filePath)`
- Mantém validação local de 6GB e tipos MP4/WebM/MOV
- Mantém `registerOnComplete` para continuar funcionando com `VideoUploader` global

### 4. Mensagens de erro
Substituir o texto atual de "limite global do painel" por mensagens reais do novo fluxo:
- chunk falhou após retries
- sessão expirada
- erro ao finalizar
- arquivo acima de 6GB (validação local)

### 5. `supabase/config.toml`
Já contém `[functions.upload-video-chunk]` e `[functions.finalize-video-upload]` com `verify_jwt = false`. Nenhuma alteração necessária — JWT é validado em código.

## Arquivos envolvidos

**Backend (novos):**
- `supabase/functions/upload-video-chunk/index.ts`
- `supabase/functions/finalize-video-upload/index.ts`

**Frontend (refatorar):**
- `src/contexts/UploadContext.tsx`

**Sem alteração:**
- `src/components/admin/VideoUploader.tsx`
- `src/components/upload/GlobalUploadIndicator.tsx`
- `src/pages/admin/UploadVideo.tsx`
- `src/pages/producer/UploadMovie.tsx`
- bucket `videos`, `get-video-url`, RLS

## Resultado esperado

- Upload de 2.4 GB começa a subir, contornando o bloqueio do endpoint TUS
- UI global de progresso, pausa e cancelamento continuam idênticas
- `VideoUploader` recebe `filePath` no mesmo formato → formulários de admin e produtor funcionam sem mudar
- Produtores seguem com upload ilimitado

## Detalhes técnicos

- Chunks de 5 MB ficam confortavelmente dentro do limite de payload das edge functions e evitam timeouts
- Acúmulo em `videos/_tmp/<uploadId>/` permite retomar e cancelar com limpeza
- Concatenação final é feita no servidor com service role e gravada no caminho `movies/...` que `get-video-url` já entende
- Não dependemos mais do endpoint `/storage/v1/upload/resumable` que está bloqueando os uploads atualmente

