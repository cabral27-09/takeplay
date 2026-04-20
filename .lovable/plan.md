

## Corrigir validação de JWT nas edge functions de upload

### Problema
`supabaseAuth.auth.getClaims(token)` não existe nessa versão do SDK. Todo chunk retorna 500 e o progresso fica em 0%.

### Correção
Trocar `getClaims` por `getUser(token)` (API estável e disponível) em:

- `supabase/functions/upload-video-chunk/index.ts`
- `supabase/functions/finalize-video-upload/index.ts`

Padrão novo:

```ts
const { data: userData, error: authErr } = await supabaseAuth.auth.getUser(token);
if (authErr || !userData?.user?.id) {
  return new Response(JSON.stringify({ error: "Invalid token" }), { status: 401, headers: ... });
}
const userId = userData.user.id;
```

### Redeploy
Ambas as funções serão redeployadas automaticamente.

### Validação
1. Subir o vídeo de 2.4GB em `/admin/upload`
2. Confirmar que progresso sai de 0% e avança
3. Conferir logs de `upload-video-chunk` e `finalize-video-upload` sem erros
4. Confirmar `filePath` retornado e gravação no bucket `videos/movies/...`

### Sem outras mudanças
Frontend, bucket, RLS e `config.toml` continuam como estão.

