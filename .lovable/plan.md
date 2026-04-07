

## Diagnóstico

O problema é claro: o protocolo TUS envia o tamanho total do arquivo (`Upload-Length`) no `POST` inicial, e o servidor rejeita com `413` porque o **limite global do storage** (não o do bucket) está abaixo de 2.4GB. A configuração `[storage] file_size_limit = "6GiB"` no `config.toml` só se aplica ao desenvolvimento local — ela **não altera** o limite global do projeto hospedado.

O bucket `videos` já tem 6GB de limite (confirmado via SQL), mas o limite global prevalece sobre o bucket e bloqueia o TUS antes do primeiro byte.

## Solução

Trocar o mecanismo de upload de **TUS direto** para **upload por chunks via edge functions**, que já existem no projeto (`upload-video-chunk` e `finalize-video-upload`). Cada chunk individual é pequeno (~5MB), passando por qualquer limite global. A montagem final é feita server-side com o service role key.

### Problema com a implementação atual do `finalize-video-upload`
A edge function atual baixa **todos os chunks na memória**, concatena num único `Uint8Array`, e faz upload do arquivo final. Isso falha por dois motivos:
- Edge functions têm limite de memória (~150-512MB) — não suportam 2.4GB em RAM
- O `supabase.storage.upload()` final também será rejeitado pelo limite global

### Correção: Upload via S3 Multipart
O Supabase Storage suporta o protocolo S3, que permite uploads de até 50GB via multipart. A edge function `finalize-video-upload` será reescrita para:
1. Iniciar um S3 multipart upload
2. Fazer upload de cada chunk como uma "part" do S3 (streaming, sem carregar tudo em memória)
3. Completar o multipart upload — o storage monta o arquivo final server-side

## Arquivos afetados

### 1. `src/contexts/UploadContext.tsx` — Reescrever para upload por chunks
- Remover dependência do `tus-js-client`
- Implementar lógica de fatiar o arquivo em chunks de ~5MB
- Enviar cada chunk para a edge function `upload-video-chunk`
- Após todos os chunks, chamar `finalize-video-upload`
- Manter progress bar, velocidade, pausa/resume e cancelamento
- Manter a mesma interface pública (`startUpload`, `pauseUpload`, `resumeUpload`, `cancelUpload`)

### 2. `supabase/functions/finalize-video-upload/index.ts` — Reescrever com S3 multipart
- Usar o SDK AWS S3 (ou fetch direto) para iniciar um multipart upload no endpoint S3 do Supabase (`https://<project_ref>.supabase.co/storage/v1/s3`)
- Para cada chunk, fazer download do storage temporário e upload como S3 part (streaming, um por vez)
- Completar o multipart upload
- Limpar os chunks temporários

### 3. `supabase/functions/upload-video-chunk/index.ts` — Manter como está
- Já funciona corretamente, cada chunk é pequeno e usa service role

### 4. `package.json` — Remover `tus-js-client`
- Não será mais necessário

## Detalhes técnicos

```text
┌─────────┐   chunks (5MB)   ┌──────────────────┐   storage   ┌─────────┐
│ Browser  │ ──────────────►  │ upload-video-chunk│ ─────────► │ videos/ │
│          │                  │ (edge function)   │            │ temp/   │
└─────────┘                  └──────────────────┘            └─────────┘
     │                                                            │
     │ POST finalize                                              │
     ▼                                                            ▼
┌──────────────────────┐     S3 multipart      ┌─────────────────────┐
│ finalize-video-upload│ ───────────────────►   │ videos/movies/final │
│ (edge function)      │  (stream each chunk   │                     │
│                      │   as S3 part)         │                     │
└──────────────────────┘                       └─────────────────────┘
```

- Cada chunk de 5MB passa por qualquer limite global (mesmo 50MB)
- O S3 multipart bypassa o limite de arquivo único porque cada part é pequena
- A memória da edge function não ultrapassa ~10MB por vez (um chunk de cada vez)
- Pause/resume funciona naturalmente: basta parar de enviar chunks e retomar do último confirmado

