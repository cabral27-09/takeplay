# Por que falhou agora

O upload dos 458 chunks (2,4GB) chegou a 100%. O erro veio na etapa de **finalização**: a Edge Function `finalize-video-upload` baixa todos os chunks e faz **um único PUT de 2,4GB** para o Storage. Essa conexão HTTP/2 caiu no meio (`stream error: unspecific protocol error`) — é exatamente o tipo de coisa que acontece com upload gigante via Edge Function (limite de tempo/memória, instabilidade de stream longo, reciclagem do worker).

Ou seja: o vídeo subiu, mas foi jogado fora na hora de remontar. Continuar nesse caminho vai falhar de novo, porque o gargalo é o "reenvio" no servidor.

# Solução: subir direto para o destino final via S3 Multipart

O Supabase Storage tem endpoint S3-compatível. Vamos usar **S3 Multipart Upload** apontando direto para o arquivo final em `videos/movies/...`. Cada parte de 5–10MB vai **direto do navegador para o S3**, com URL pré-assinada gerada pela Edge Function. Não há reenvio, não há limite de Edge Function no caminho dos bytes, não há TUS, não há 413.

## Fluxo

```text
Browser                          Edge Functions                S3 (Storage)
  |  start-multipart  ----------> valida papel ---------------> CreateMultipartUpload
  |  <----- uploadId, key --------------------------------------|
  |
  |  para cada parte i:
  |    sign-part(i)  ------------> presign PUT --------------->|
  |    <----- url ---------------------------------------------|
  |    PUT parte i (binário cru) -----------------------------> S3
  |    <----- ETag i ------------------------------------------|
  |
  |  complete-multipart(parts[]) -> CompleteMultipartUpload -->|
  |  <----- filePath final ------------------------------------|
```

Pausar = parar de pedir próximas partes. Retomar = continuar do índice. Cancelar = `AbortMultipartUpload`.

# Mudanças

## Backend (Edge Functions novas)

1. `s3-multipart-start` — valida JWT + papel admin/producer, gera `key = movies/<timestamp>-<rand>.<ext>`, chama `CreateMultipartUpload`, retorna `{ uploadId, key }`.
2. `s3-multipart-sign-part` — recebe `{ uploadId, key, partNumber }`, retorna URL pré-assinada (PUT) válida por ~1h para aquela parte.
3. `s3-multipart-complete` — recebe `{ uploadId, key, parts: [{PartNumber, ETag}] }`, chama `CompleteMultipartUpload`, retorna `{ filePath: key }`.
4. `s3-multipart-abort` — recebe `{ uploadId, key }`, chama `AbortMultipartUpload`.

Usam o endpoint S3 do Storage: `https://<ref>.supabase.co/storage/v1/s3` no bucket `videos`, autenticando com o **service role** (já presente em `SUPABASE_SERVICE_ROLE_KEY`). Assinatura SigV4 feita com `aws4fetch` (lib leve, roda no Deno via `esm.sh`).

Sem novos segredos: o Storage S3 aceita `access_key_id = <project_ref>` e `secret_access_key = <service_role_key>` (padrão do Supabase Storage S3).

## Frontend (`src/contexts/UploadContext.tsx`)

Reescrever a lógica de upload:
- Partes de **8MB** (mínimo S3 = 5MB, exceto a última).
- Loop: pedir URL assinada → `fetch(PUT, body=chunk)` → guardar ETag retornado no header.
- Progresso real por bytes enviados (mantém UI atual: %, velocidade, pausar/retomar/cancelar).
- Pausar/Retomar funciona naturalmente (apenas para/continua o loop).
- Cancelar chama `s3-multipart-abort` para não deixar lixo cobrado.
- Ao final, chama `complete` e devolve `filePath` (compatível com `VideoUploader`/registro de filme — mesmo formato `movies/<arquivo>`).

## Remover

- `supabase/functions/upload-video-chunk` (não usado mais)
- `supabase/functions/finalize-video-upload` (não usado mais)
- Migration: remover `application/octet-stream` da whitelist de MIME do bucket `videos` (não é mais necessário). Manter limite de 6GB.

# Por que isso resolve de vez

- Os bytes nunca passam por uma Edge Function — só pequenos JSONs de coordenação.
- Sem PUT único de 2,4GB em lugar nenhum: o S3 já recebe parte por parte e monta nativamente no `Complete`.
- Sem o endpoint `/upload/resumable` (causa do 413 original).
- Retomar uma parte que falhar custa só re-enviar 8MB.
- É o padrão usado por qualquer serviço de upload de vídeo grande (YouTube, Vimeo, Mux usam o mesmo conceito).

# Riscos / pontos de atenção

- Precisa confirmar que o endpoint S3 do Storage está habilitado no projeto (vem por padrão). Se não estiver, ativamos antes.
- CORS no endpoint S3 do Storage costuma estar liberado por padrão; se houver bloqueio, ajustamos.
- Após o `Complete`, o objeto fica no caminho final imediatamente — o registro do filme pode usar `filePath` igual hoje.
