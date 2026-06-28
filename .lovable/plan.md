Apontar os uploads e a reprodução de vídeos para o **projeto Supabase externo** (bucket `manivela_filmes`), usando os secrets `EXTERNAL_VIDEO_SUPABASE_URL` e `EXTERNAL_VIDEO_SUPABASE_ANON_KEY` que você acabou de atualizar.

## Arquivos alterados

### 1. `src/contexts/UploadContext.tsx` (upload TUS → projeto externo)
- Adicionar `VITE_EXTERNAL_VIDEO_SUPABASE_URL` e `VITE_EXTERNAL_VIDEO_SUPABASE_ANON_KEY` em `.env` (cópias públicas necessárias porque o upload acontece no navegador).
- Trocar o endpoint TUS de `${SUPABASE_URL}/storage/v1/upload/resumable` para `${EXTERNAL_URL}/storage/v1/upload/resumable`.
- Trocar os headers `authorization` e `apikey` para usar a anon key do projeto externo (não há sessão de usuário no projeto externo — o acesso será controlado por policy de bucket).
- Manter `bucketName: 'manivela_filmes'`, mesmo objectName, mesmo fluxo de progresso/pause/resume.

### 2. `supabase/functions/get-video-url/index.ts` (signed URLs → projeto externo)
- Criar um segundo client Supabase usando `EXTERNAL_VIDEO_SUPABASE_URL` + `EXTERNAL_VIDEO_SUPABASE_ANON_KEY`.
- Quando o path do filme estiver no bucket `manivela_filmes` (ou for um path novo `movies/...`), assinar a URL pelo client externo.
- Manter o client antigo (projeto atual) como fallback para filmes já cadastrados no bucket `videos`, para não quebrar nada que já existe.

### 3. Edge function `migrate-video`
- Já está usando os secrets externos corretamente; nenhuma mudança de código necessária. Só vai voltar a funcionar quando você quiser migrar os filmes antigos (depois que a policy estiver no lugar).

## O que VOCÊ precisa fazer no projeto externo

O projeto externo tem auth próprio e o navegador vai chamar o TUS como `anon`. Para o upload funcionar, rode este SQL no SQL Editor do **projeto externo** (onde está o bucket `manivela_filmes`):

```sql
-- Permite upload anônimo SOMENTE no bucket manivela_filmes
CREATE POLICY "anon upload manivela_filmes"
ON storage.objects FOR INSERT TO anon
WITH CHECK (bucket_id = 'manivela_filmes');

-- Permite leitura anônima (necessária para signed URL / play)
CREATE POLICY "anon read manivela_filmes"
ON storage.objects FOR SELECT TO anon
USING (bucket_id = 'manivela_filmes');
```

> Observação: isso libera upload anônimo nesse bucket. Como o site só expõe o uploader para admins/produtores logados aqui no app, na prática só eles veem o botão. Se você quiser restringir de verdade no servidor externo, depois a gente troca para um esquema com Edge Function assinando uploads (mais complexo, mas mais seguro).

## O que NÃO vou mexer

- Não vou alterar nada na base do projeto atual.
- Não vou apagar o bucket `videos` nem os filmes antigos.
- Não vou tocar em auth, RLS de outras tabelas, ou no `supabase/config.toml`.

Quando você aprovar, eu já aplico as 3 mudanças de código. A migração dos filmes antigos para o novo bucket fica para um passo separado, quando você quiser.