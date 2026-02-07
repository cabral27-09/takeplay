

# Plano: Corrigir Erro de MIME Type no Upload de Vídeo em Chunks

## Problema Identificado

O bucket `videos` está configurado para aceitar apenas estes tipos MIME:
- `video/mp4`
- `video/webm`
- `video/quicktime`

Mas a Edge Function `upload-video-chunk` está tentando salvar os chunks com `contentType: 'application/octet-stream'`, que **não está na lista de tipos permitidos**.

Erro exato:
```
StorageApiError: mime type application/octet-stream is not supported
```

## Solução Escolhida

**Adicionar `application/octet-stream` à lista de tipos MIME permitidos no bucket.**

Esta é a solução mais simples e correta porque:
1. Os chunks são dados binários temporários, não vídeos completos
2. A função `finalize-video-upload` já faz upload do arquivo final com o tipo correto (`video/mp4`, etc.)
3. Os chunks são deletados após a concatenação

---

## Alteração Necessária

### Migration SQL

```sql
UPDATE storage.buckets 
SET allowed_mime_types = ARRAY['video/mp4', 'video/webm', 'video/quicktime', 'application/octet-stream']
WHERE id = 'videos';
```

---

## Fluxo de Upload (sem alterações)

```text
┌─────────────────────────────────────────────────────────────────┐
│  1. upload-video-chunk                                          │
│     ↓ Salva chunks com contentType: application/octet-stream    │
│     ↓ Caminho: temp/{uploadId}/chunk_00001.bin                  │
├─────────────────────────────────────────────────────────────────┤
│  2. finalize-video-upload                                       │
│     ↓ Concatena todos os chunks                                 │
│     ↓ Salva arquivo final com contentType: video/mp4            │
│     ↓ Caminho: movies/{uploadId}.mp4                            │
│     ↓ Deleta chunks temporários                                 │
└─────────────────────────────────────────────────────────────────┘
```

---

## Resultado Esperado

1. Upload de chunks funcionará normalmente
2. Arquivos temporários serão aceitos com `application/octet-stream`
3. Arquivo final será salvo com o tipo MIME correto do vídeo
4. O fluxo de upload de vídeos grandes (como o de 1.70 GB) será concluído com sucesso

