

## Corrigir OOM na finalização do upload (falha em 99%)

### Causa raiz
`finalize-video-upload` carrega todos os chunks num único `Uint8Array` em memória. Para 2.4 GB isso excede o limite de RAM da edge function e mata o processo na concatenação — exatamente quando o frontend chega a 99% e chama o finalize.

### Solução: streaming sem buffer total
Reescrever `finalize-video-upload` para NUNCA materializar o arquivo inteiro:

1. Construir um `ReadableStream` que itera pelos chunks (`000000.part`, `000001.part`, ...), baixa um por vez do Storage, faz `enqueue` do `Uint8Array` e libera a referência antes de baixar o próximo.
2. Fazer o upload final via `fetch` direto pro endpoint REST do Storage (`POST /storage/v1/object/videos/movies/<file>`) usando o `ReadableStream` como `body`, com `duplex: 'half'`. Headers: `Authorization: Bearer <SERVICE_ROLE>`, `Content-Type`, `x-upsert: false`.
3. Após sucesso, deletar a pasta `_tmp/<userId>/<uploadId>/`.
4. Retornar `{ filePath, size }` no mesmo formato atual.

Isso mantém o pico de memória em ~5MB (1 chunk por vez) em vez de 2.4 GB.

### Arquivo alterado
- `supabase/functions/finalize-video-upload/index.ts`

### Sem mudança
- `upload-video-chunk` (já funciona)
- Frontend (`UploadContext`) — protocolo finalize idêntico
- Bucket, RLS, `config.toml`

### Validação
1. Subir o mesmo vídeo de 2.4 GB
2. Confirmar progresso até 100% e finalize sem erro
3. Conferir nos logs `[finalize]` execução sem OOM
4. Verificar arquivo em `videos/movies/...` e que `_tmp/<uploadId>/` foi limpa

