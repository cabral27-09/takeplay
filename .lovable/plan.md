

## Diagnóstico real (finalmente)

Inspecionei o JWT que está sendo enviado nas requests (network logs) e o banco:

**JWT atual do usuário logado:**
```json
{
  "email": "paulo_snt12@hotmail.com",
  "user_metadata": { "role": "viewer" },
  "sub": "0658d242-a4c2-4567-8067-bace5f0fcc6c"
}
```

**Política RLS do bucket `videos` (INSERT):**
```sql
bucket_id = 'videos' AND (
  has_role(auth.uid(), 'admin') OR 
  has_role(auth.uid(), 'producer')
)
```

O usuário **não tem role admin nem producer** na tabela `user_roles`. Por isso o storage rejeita o upload.

## Por que o erro parecia ser de JWT

O Supabase Storage retorna a mensagem genérica `"Invalid Compact JWS"` para várias falhas de autorização, incluindo quando o JWT é válido mas a RLS nega a operação. Isso desviou todas as tentativas anteriores (chunk size, apikey, refresh, fingerprints) — nada disso era o problema. O código TUS está correto desde a última revisão.

## Verificação necessária

Preciso confirmar com você qual conta deveria fazer este upload, porque há dois caminhos possíveis:

**Opção A — Conta errada:** Você fez login com uma conta `viewer` por engano. A solução é fazer logout e entrar com uma conta admin/producer existente.

**Opção B — Conta certa, role faltando:** A conta `paulo_snt12@hotmail.com` deveria ter role `admin` ou `producer`, mas não tem. Solução: rodar uma migration adicionando a role.

## Plano de correção

1. Confirmar com você qual é o caso (pergunta abaixo)
2. Se for **Opção B**, executar migration:
   ```sql
   INSERT INTO public.user_roles (user_id, role)
   VALUES ('0658d242-a4c2-4567-8067-bace5f0fcc6c', 'admin')
   ON CONFLICT DO NOTHING;
   ```
3. Você faz logout/login para o novo JWT carregar a role
4. Tenta o upload de 2.4GB novamente

## Nada a mudar no código

`UploadContext.tsx` está correto. O problema sempre foi de permissão, mascarado pela mensagem de erro enganosa do Supabase Storage.

