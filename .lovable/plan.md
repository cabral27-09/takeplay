
# Plano: Implementar Upload com TUS Protocol

## Problema Atual

A Edge Function `finalize-video-upload` estoura a memória (~150MB limite) ao tentar baixar e concatenar 1.70GB de chunks. Este é um limite técnico impossível de contornar com a abordagem atual.

## Solução: Upload Direto via TUS

O protocolo TUS permite upload resumível diretamente do navegador para o Supabase Storage, sem passar por Edge Functions.

```text
ANTES (quebrado):
┌─────────┐      ┌────────────────────┐      ┌─────────┐
│ Browser │ ──▶ │ Edge Function      │ ──▶ │ Storage │
│         │      │ (baixa TUDO na RAM)│      │         │
└─────────┘      └────────────────────┘      └─────────┘
                        ⬆️ ESTOURA

DEPOIS (funciona):
┌─────────┐                                   ┌─────────┐
│ Browser │ ─────── TUS Protocol ──────────▶ │ Storage │
│         │                                   │         │
└─────────┘                                   └─────────┘
```

---

## Arquivo a Modificar

| Arquivo | Alteração |
|---------|-----------|
| `src/components/admin/VideoUploader.tsx` | Reescrever usando `tus-js-client` |

---

## Mudanças Detalhadas

### 1. Importar tus-js-client

```typescript
import * as tus from 'tus-js-client';
```

### 2. Configurar Endpoint TUS

```typescript
const SUPABASE_PROJECT_ID = import.meta.env.VITE_SUPABASE_PROJECT_ID;
const TUS_ENDPOINT = `https://${SUPABASE_PROJECT_ID}.supabase.co/storage/v1/upload/resumable`;
```

### 3. Nova Lógica de Upload

```typescript
const startUpload = async (file: File) => {
  const { data: { session } } = await supabase.auth.getSession();
  if (!session) return; // handle error

  const fileExt = file.name.split('.').pop();
  const filePath = `movies/${Date.now()}-${Math.random().toString(36).substring(2)}.${fileExt}`;

  const upload = new tus.Upload(file, {
    endpoint: TUS_ENDPOINT,
    retryDelays: [0, 3000, 5000, 10000, 20000],
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
    chunkSize: 6 * 1024 * 1024, // 6MB - obrigatório pelo Supabase
    onError: (error) => {
      setError({ title: 'Erro no upload', description: error.message });
      setIsUploading(false);
    },
    onProgress: (bytesUploaded, bytesTotal) => {
      setProgress(Math.round((bytesUploaded / bytesTotal) * 100));
      // calcular velocidade...
    },
    onSuccess: () => {
      onChange(filePath);
      toast({ title: 'Upload concluído' });
    },
  });

  uploadRef.current = upload;

  // Verificar uploads anteriores para retomar automaticamente
  const previousUploads = await upload.findPreviousUploads();
  if (previousUploads.length > 0) {
    upload.resumeFromPreviousUpload(previousUploads[0]);
  }

  upload.start();
};
```

### 4. Pausar e Retomar

```typescript
const handlePause = () => {
  uploadRef.current?.abort();
  setIsPaused(true);
};

const handleResume = () => {
  uploadRef.current?.start();
  setIsPaused(false);
};
```

---

## O Que Será Removido

- Função `uploadChunk()` - não mais necessária
- Função `finalizeUpload()` - não mais necessária  
- Estado manual no localStorage (`video_upload_state`) - TUS gerencia automaticamente
- Constante `CHUNK_SIZE = 50MB` - TUS usa 6MB obrigatório

---

## Benefícios

| Antes | Depois |
|-------|--------|
| Limite de ~1GB (memória da Edge Function) | Suporta até 6GB (limite do bucket) |
| Precisa de 2 Edge Functions | Upload direto, sem Edge Functions |
| Pausa/retomada manual via localStorage | Pausa/retomada nativa do TUS |
| ~250 linhas de código | ~100 linhas de código |

---

## UI Mantida

A interface visual permanece igual:
- Área de drag & drop
- Barra de progresso
- Velocidade de upload
- Botões Pausar/Continuar/Cancelar
- Validação de tipo e tamanho
