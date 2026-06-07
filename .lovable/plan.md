## Objetivo

Eliminar o gargalo das Edge Functions de upload (`upload-video-chunk` + `finalize-video-upload`) — que hoje recebem os chunks no servidor e depois rebaixam/reenviam o arquivo inteiro pro Storage, estourando o limite de 150s. Em vez disso, o navegador envia o arquivo direto pro Supabase Storage usando o protocolo TUS (resumable upload nativo), em apenas 2 passos:

```text
[Browser tus-js-client]  ──►  [Supabase Storage /upload/resumable]
```

Não há mais Edge Function no caminho do upload. Pausa/retomada/retry/progresso passam a ser nativos do TUS.

## Como vai funcionar

1. **Cliente pega o JWT da sessão** (`supabase.auth.getSession()`).
2. **Cria um `tus.Upload`** apontando pra `${SUPABASE_URL}/storage/v1/upload/resumable`, com:
   - `Authorization: Bearer <jwt>` + `apikey: <anon>` + `x-upsert: true`
   - `metadata`: `bucketName=videos`, `objectName=movies/{timestamp}-{rand}.{ext}`, `contentType`, `cacheControl=3600`
   - `chunkSize: 6 * 1024 * 1024` (recomendado pelo Supabase; **obrigatório** ser fixo)
   - `removeFingerprintOnSuccess: true`
   - Callbacks: `onError`, `onProgress`, `onSuccess` → chama `onComplete(filePath)`
3. **Pausa/retomada** usam `upload.abort()` e `upload.start()` — o `tus-js-client` guarda o offset no `localStorage` (fingerprint) e retoma de onde parou, inclusive depois de refresh da página.
4. **Cancelamento** chama `upload.abort(true)` (descarta o upload no servidor) e limpa o fingerprint.
5. **Autorização**: a permissão pra escrever em `videos/movies/...` continua sendo controlada por **RLS na tabela `storage.objects`**. Precisa existir uma policy que permita `INSERT` no bucket `videos` para usuários `authenticated` que tenham papel `admin` ou `producer` (via `has_role`). Se já existir, não mexer; se não, criar via migration.

## Arquivos a alterar

### `package.json`
- Adicionar dependência: `tus-js-client` (^4).

### `src/contexts/UploadContext.tsx` (reescrito)
- Remover `invokeUploadChunk`, `invokeFinalize`, `CHUNK_SIZE`, `MAX_RETRIES`, lógica de loop manual, `pauseResolverRef`, `activeUploadRef` baseado em `uploadId`.
- Manter a mesma API pública: `startUpload`, `pauseUpload`, `resumeUpload`, `cancelUpload`, `registerOnComplete`, `upload` (mesmos campos: `status`, `fileName`, `fileSize`, `progress`, `speed`, `error`, `filePath`).
- Internamente guardar `uploadRef = useRef<tus.Upload | null>(null)`.
- `startUpload`:
  - validar tipo/tamanho (mesmas regras),
  - `refreshSession` + `getSession`,
  - gerar `objectName = movies/${Date.now()}-${rand}.${ext}`,
  - instanciar `tus.Upload(file, { endpoint, headers, metadata, chunkSize: 6MB, removeFingerprintOnSuccess: true, onProgress, onSuccess, onError })`,
  - calcular `speed` no `onProgress` usando timestamp + bytes anteriores (igual hoje),
  - no `onSuccess` setar `filePath = objectName` e disparar `onCompleteRef.current?.(filePath)`.
- `pauseUpload`: `uploadRef.current?.abort()` + status `'paused'`.
- `resumeUpload`: `uploadRef.current?.start()` + status `'uploading'`.
- `cancelUpload`: `uploadRef.current?.abort(true)` (true = também apaga no servidor), resetar state.
- Mensagens de erro traduzidas mantêm o mesmo formato (sessão expirada, sem permissão, rede, etc.).

### `supabase/config.toml`
- Remover blocos `[functions.upload-video-chunk]` e `[functions.finalize-video-upload]`.

### Edge Functions (deletar)
- `supabase/functions/upload-video-chunk/` (pasta inteira)
- `supabase/functions/finalize-video-upload/` (pasta inteira)

### `src/components/admin/VideoUploader.tsx` e `GlobalUploadIndicator.tsx`
- **Não mudam.** Consomem só a API do `useUpload`, que continua idêntica.

## Storage / RLS (verificar antes de buildar)

Bucket `videos` já existe e é privado — OK. Vou conferir se as policies em `storage.objects` permitem `INSERT` pro role autorizado no prefixo `movies/`. Se faltar, criar migration:

```sql
CREATE POLICY "Admins e producers podem enviar vídeos"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (
  bucket_id = 'videos'
  AND (public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'producer'))
);
```

(A policy de leitura via `get-video-url` com service role continua funcionando do mesmo jeito.)

## Detalhes técnicos importantes

- **chunkSize fixo é obrigatório** no endpoint do Supabase TUS — não usar `Infinity`.
- **Header `x-upsert`** vai como `uploadDataDuringCreation`-friendly metadata? Não: o Supabase aceita como **header** na request inicial. `tus-js-client` permite via `headers`.
- **Retomada após refresh**: como `removeFingerprintOnSuccess: true` + storage padrão `localStorage`, basta o usuário escolher o mesmo arquivo de novo — o tus reconhece pelo fingerprint e continua. (Não precisa UI nova; é opcional documentar.)
- **Progresso**: `onProgress(bytesUploaded, bytesTotal)` → `progress = round(bytesUploaded/bytesTotal*100)` e cálculo de velocidade igual hoje.
- **CORS**: o endpoint `/storage/v1/upload/resumable` já tem CORS liberado pelo Supabase, sem ação necessária.
- **Limite de 6GB** continua valendo via `storage.file_size_limit = "6GiB"` no `config.toml` (já configurado).

## Resultado

- Upload de qualquer tamanho (até 6GB) sem timeout de Edge Function.
- Pausa, retomada e retry nativos e mais robustos.
- Menos código pra manter (2 Edge Functions a menos, ~300 linhas removidas).
- Sem custo de execução de Edge Function por chunk.
