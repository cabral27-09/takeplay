

## Nova arquitetura de upload usando TUS (Resumable Upload)

Com o plano Pro do Supabase, a melhor abordagem é abandonar completamente o S3 Client e usar o **protocolo TUS** que o Supabase Storage suporta nativamente. É mais simples, confiável, e feito para uploads grandes e resumíveis.

### Por que TUS em vez de S3 Multipart?

- O S3 Client no browser tem problemas crônicos de autenticação com o endpoint do Supabase
- TUS é o protocolo oficial recomendado pelo Supabase para uploads grandes
- Suporta **resume nativo** (se a conexão cair, retoma de onde parou)
- Progresso em tempo real sem cálculo manual
- Pro plan suporta até **5GB por arquivo** via TUS
- Não precisa de edge function nenhuma para o upload

### O que muda

**Remover:**
- Dependência `@aws-sdk/client-s3` do package.json
- Toda a lógica S3 do `UploadContext.tsx`
- Edge functions `upload-video-chunk` e `finalize-video-upload` ficam obsoletas

**Adicionar:**
- Dependência `tus-js-client`
- Upload direto via TUS para `https://[project-ref].supabase.co/storage/v1/upload/resumable`

**Reescrever:**
- `src/contexts/UploadContext.tsx` — lógica completa usando `tus-js-client`

### Como funciona o novo fluxo

```text
Browser
  -> tus-js-client envia direto para Supabase Storage
  -> arquivo final criado em videos/movies/xxx.mp4
  -> sem temp/, sem chunks, sem edge function
  -> progresso real, pause/resume nativos
```

### Implementação do UploadContext

```typescript
import * as tus from 'tus-js-client';

// Upload resumível direto
const upload = new tus.Upload(file, {
  endpoint: `${SUPABASE_URL}/storage/v1/upload/resumable`,
  retryDelays: [0, 3000, 6000, 12000, 24000],
  headers: {
    authorization: `Bearer ${session.access_token}`,
    'x-upsert': 'true',
  },
  uploadDataDuringCreation: true,
  removeFingerprintOnSuccess: true,
  metadata: {
    bucketName: 'videos',
    objectName: filePath,
    contentType: file.type,
    cacheControl: '3600',
  },
  chunkSize: 50 * 1024 * 1024, // 50MB chunks
  onProgress: (bytesUploaded, bytesTotal) => { ... },
  onSuccess: () => { ... },
  onError: (error) => { ... },
});

upload.start();
// Para pausar: upload.abort()
// Para retomar: upload.start() (retoma de onde parou)
```

### Funcionalidades mantidas
- Progresso em tempo real com velocidade
- Pause / Resume / Cancel
- Callback de conclusão
- Indicador global de upload
- Validação de tipo e tamanho (até 5GB)

### Arquivos alterados
1. `src/contexts/UploadContext.tsx` — reescrita completa com tus-js-client
2. `package.json` — trocar `@aws-sdk/client-s3` por `tus-js-client`

### Arquivos que não mudam
- `src/components/admin/VideoUploader.tsx` — mesma interface
- `src/components/upload/GlobalUploadIndicator.tsx` — mesma interface
- Todo o resto do app continua igual

### Detalhes técnicos
- TUS faz retry automático com backoff configurável
- O token JWT é refreshed antes de cada retry pelo próprio client
- Chunk size de 50MB = ~48 partes para 2.4GB
- Se a aba fechar e reabrir, o TUS pode retomar o upload anterior via fingerprint

