
# Plano: Criar Edge Function Proxy para Upload de Vídeos Grandes

## Problema Confirmado

O erro 413 está ocorrendo mesmo com arquivo de 3.49GB (abaixo do limite de 6GB) porque:

1. O protocolo TUS envia o header `Upload-Length` com o tamanho total antes de iniciar
2. Um proxy/load balancer na infraestrutura está rejeitando baseado nesse header
3. Isso acontece antes mesmo dos chunks serem enviados

## Solução: Upload em Chunks via Storage API

A solução mais robusta é **usar a API de upload padrão do Supabase em chunks menores**, em vez do protocolo TUS que está sendo bloqueado.

### Abordagem: Upload Multipart Direto

Vamos modificar o uploader para:

1. **Dividir o arquivo em chunks de 50MB** no browser
2. **Fazer upload de cada chunk** usando a API padrão do Supabase Storage
3. **Concatenar os chunks** no servidor após todos serem enviados
4. **Manter a funcionalidade de pausa/retomada** usando localStorage para tracking

---

## Arquivos a Criar/Modificar

### 1. Nova Edge Function: `upload-video-chunk`

Esta função recebe chunks de vídeo e faz upload direto para o storage.

```text
supabase/functions/upload-video-chunk/index.ts
```

**Responsabilidades:**
- Receber chunk de vídeo (máximo 50MB)
- Fazer upload para uma pasta temporária no bucket
- Retornar confirmação de sucesso

### 2. Nova Edge Function: `finalize-video-upload`

Esta função concatena todos os chunks em um arquivo final.

```text
supabase/functions/finalize-video-upload/index.ts
```

**Responsabilidades:**
- Receber lista de chunks
- Baixar e concatenar todos os chunks
- Salvar arquivo final no caminho correto
- Limpar chunks temporários

### 3. Modificar VideoUploader.tsx

Trocar a implementação TUS por upload em chunks manual.

```text
src/components/admin/VideoUploader.tsx
```

**Mudanças:**
- Implementar divisão do arquivo em chunks de 50MB
- Fazer upload sequencial de cada chunk via fetch
- Mostrar progresso baseado em chunks completados
- Suportar pausa/retomada salvando estado no localStorage
- Chamar edge function de finalização após todos os chunks

---

## Fluxo do Upload

```text
┌─────────────────┐     ┌─────────────────────────────────────────────────────────┐
│   BROWSER       │     │  LOVABLE CLOUD BACKEND                                  │
│                 │     │                                                         │
│  Arquivo 3.5GB  │     │  ┌─────────────────────┐    ┌─────────────────────────┐│
│       │         │     │  │ upload-video-chunk  │    │ Storage Bucket: videos  ││
│       ▼         │     │  │                     │    │                         ││
│  Divide em      │     │  │ - Recebe chunk      │    │ temp/{upload_id}/       ││
│  70 chunks      │────▶│  │ - Upload para temp  │───▶│   chunk_0.bin          ││
│  de 50MB        │     │  │ - Retorna OK        │    │   chunk_1.bin          ││
│       │         │     │  └─────────────────────┘    │   chunk_2.bin          ││
│       │         │     │                             │   ...                   ││
│       ▼         │     │  ┌─────────────────────┐    │   chunk_69.bin         ││
│  Após último    │     │  │finalize-video-upload│    │                         ││
│  chunk          │────▶│  │                     │───▶│ movies/                 ││
│                 │     │  │ - Concatena chunks  │    │   video_final.mp4      ││
│                 │     │  │ - Deleta temp       │    │                         ││
└─────────────────┘     │  └─────────────────────┘    └─────────────────────────┘│
                        └─────────────────────────────────────────────────────────┘
```

---

## Detalhes Técnicos

### Edge Function: upload-video-chunk

```typescript
// Recebe: FormData com chunk de vídeo (max 50MB)
// - upload_id: ID único do upload
// - chunk_index: Número do chunk (0, 1, 2...)
// - chunk: Blob do chunk

// Faz upload para: videos/temp/{upload_id}/chunk_{index}.bin
// Retorna: { success: true, chunk_index }
```

### Edge Function: finalize-video-upload

```typescript
// Recebe: JSON
// - upload_id: ID único do upload
// - total_chunks: Número total de chunks
// - final_path: Caminho final do arquivo (ex: movies/video.mp4)
// - content_type: MIME type do vídeo

// Processo:
// 1. Baixa todos os chunks em sequência
// 2. Concatena em um único buffer/stream
// 3. Faz upload do arquivo final
// 4. Deleta pasta temp/{upload_id}
// Retorna: { success: true, path: final_path }
```

### VideoUploader - Novo Fluxo

1. **Início**: Gera `upload_id` único
2. **Para cada chunk de 50MB**:
   - Extrai slice do arquivo
   - Envia para edge function
   - Atualiza progresso
   - Salva estado no localStorage
3. **Finalização**: Chama edge function para concatenar
4. **Pausa**: Salva `upload_id` e `current_chunk` no localStorage
5. **Retomada**: Carrega estado e continua do último chunk

---

## Vantagens desta Abordagem

| Aspecto | TUS (atual) | Chunks via Edge Function |
|---------|-------------|--------------------------|
| Limite de tamanho | Bloqueado por proxy | Sem limite (50MB por request) |
| Compatibilidade | Problemas com infraestrutura | Funciona com qualquer setup |
| Controle | Depende de biblioteca | Total controle do código |
| Debug | Difícil | Fácil (logs nas edge functions) |

---

## Resultado Esperado

1. Upload de vídeos de 3.49GB+ funciona sem erro 413
2. Barra de progresso mostra avanço por chunk
3. Pausa/retomada funciona salvando estado local
4. Logs detalhados nas edge functions para debug
