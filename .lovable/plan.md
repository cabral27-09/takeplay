## Diagnóstico

Verifiquei o banco e a lógica de acesso:

- Os **5 usuários promovidos hoje** têm registros corretos em `admin_subscriptions` (`is_active=true`, `tier=premium`) — sem duplicatas.
- **Todos os filmes publicados têm `min_tier='free'`** — nenhum é premium. Ou seja: a checagem de assinatura no `SubscriptionGate` e no `get-video-url` nem entra em jogo. Qualquer usuário logado tem acesso "full".
- O erro relatado ("não foi possível carregar esse vídeo") vem do `useVideoUrl.ts` quando a função `get-video-url` retorna erro OU falha na assinatura da URL.

Como o problema afeta **todos os vídeos** dos usuários testados e o filtro por tier não interfere (todo conteúdo é free), o gargalo real é o **`createSignedUrl` no bucket externo `manivela_filmes`** — usado por todos os vídeos com path `movies/...`. A hipótese mais provável:

- A policy de leitura do bucket `manivela_filmes` no projeto externo não está aplicada corretamente para a `anon key`, então o `createSignedUrl` do cliente externo falha silenciosamente.
- O motivo dos "premium antigos" funcionarem é apenas coincidência (não tentaram assistir hoje, ou já tinham URL assinada em cache).

## Plano de correção

### 1. Logs detalhados no `get-video-url`
Melhorar o log de erro do `createSignedUrl` para gravar o objeto de erro completo (status, mensagem) nos logs da edge function, para que a próxima falha apareça em `edge_function_logs`.

### 2. Usar service_role do projeto externo para assinar
Assinar URLs com o `service_role` do projeto externo (não com a anon key). Service role bypassa RLS e é o padrão correto para signed URLs em edge functions. Precisarei do secret:

- `EXTERNAL_VIDEO_SUPABASE_SERVICE_ROLE_KEY` — a service role key do projeto externo (Supabase → Project Settings → API → `service_role` secret)

Se estiver disponível, substituo o `extKey` do signing por essa chave (mantendo o anon key só para uploads TUS, que precisam ir como `authenticated` ou `anon` com policy de INSERT).

### 3. Confirmar as policies no projeto externo
As policies enviadas antes precisavam ser rodadas no SQL editor do projeto externo:

```sql
CREATE POLICY "anon upload manivela_filmes" ON storage.objects
  FOR INSERT TO anon WITH CHECK (bucket_id = 'manivela_filmes');
CREATE POLICY "anon read manivela_filmes" ON storage.objects
  FOR SELECT TO anon USING (bucket_id = 'manivela_filmes');
```

Se você já rodou, ótimo. Se não, precisamos rodar antes de qualquer nova tentativa.

### 4. Não mexer
- Nada do fluxo de assinatura / `admin_subscriptions` / `check-subscription` (já está correto).
- Nada do frontend `SubscriptionGate` / `AuthContext`.
- Nada do bucket local `videos` nem dos vídeos antigos.

## O que preciso de você

1. Confirmar se **rodou as duas policies acima no projeto externo**.
2. Pegar a **service_role key** do projeto externo para eu adicionar como secret `EXTERNAL_VIDEO_SUPABASE_SERVICE_ROLE_KEY`.
3. Assim que aprovar o plano, quando um usuário afetado tentar assistir de novo, os logs vão mostrar o erro real do storage e conseguiremos confirmar a causa em vez de adivinhar.
