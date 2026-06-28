Vou apenas trocar o bucket de destino dos vídeos de `videos` para `manivela_filmes` (que você já criou). Sem mudar lógica de upload, sem mexer em RLS, sem migrations.

## Arquivos alterados

### `src/contexts/UploadContext.tsx`
- Linha 131: `bucketName: 'videos'` → `bucketName: 'manivela_filmes'`.
- Nenhuma outra mudança no fluxo TUS.

### `supabase/functions/get-video-url/index.ts`
- Linha 101 e 236: `.from("videos")` → `.from("manivela_filmes")` ao gerar signed URL.
- Linhas 77–78: adicionar reconhecimento de URLs antigas com `/storage/v1/object/public/manivela_filmes/` e `/storage/v1/object/sign/manivela_filmes/`, mantendo também os padrões antigos `/videos/` para compatibilidade com filmes já cadastrados no bucket anterior.

## Observações importantes

- **Vídeos antigos**: os filmes que já estão no bucket `videos` deixarão de tocar, porque a função vai procurá-los em `manivela_filmes`. Para corrigir, você precisa mover os arquivos antigos para o novo bucket (ou manter os dois — me avise se quiser que eu faça a função tentar primeiro o novo e cair pro antigo como fallback).
- **RLS do novo bucket**: confirme que `manivela_filmes` já tem policies em `storage.objects` permitindo `INSERT` para admins/produtores. Se não tiver, o upload vai falhar com 403 e eu adiciono uma migration. Diga se quer que eu já crie essas policies.
- **Limite de 6GB**: o limite global em `supabase/config.toml` (`file_size_limit = "6GiB"`) continua valendo para qualquer bucket, então não precisa configurar nada extra.

Não vou criar bucket, não vou apagar nada, não vou tocar em outras funções nem no schema do banco.