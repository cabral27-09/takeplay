
Diagnóstico confirmado:
- O erro continua porque a correção anterior ainda usa autenticação S3 errada no `finalize-video-upload`.
- O código atual assina o endpoint S3 com `SUPABASE_SERVICE_ROLE_KEY` como `sessionToken`, mas o S3 espera o JWT real do usuário autenticado.
- Ele também está usando o host `...supabase.co/storage/v1/s3` em vez do host direto `...storage.supabase.co/storage/v1/s3`.
- Resultado: `SignatureDoesNotMatch` logo no início da finalização, antes de montar o arquivo. Por isso você continua recebendo o mesmo erro genérico de “non-2xx”.

O que vou fazer agora:
1. Parar de depender desse fluxo quebrado de “subir chunk -> edge function -> montar no backend”.
   - Reescrever o `UploadContext` para fazer Multipart Upload direto do navegador para o storage privado.
   - Usar a sessão autenticada atual, o project ref e o endpoint direto de storage.
   - Manter progresso, pausa, retomada, cancelamento e callback final como já existem hoje.

2. Deixar o upload realmente viável para arquivo grande.
   - Enviar as partes direto para o arquivo final `movies/...` em vez de criar centenas de arquivos temporários e depois copiar tudo outra vez.
   - Ajustar o tamanho das partes para reduzir o número de requisições e manter retry por parte.

3. Corrigir o feedback de erro.
   - Mostrar erro por etapa: iniciar multipart, enviar parte X/Y, concluir upload, abortar.
   - Parar de depender da mensagem genérica de edge function.

4. Tratar o fluxo antigo.
   - Remover do cliente o uso de `upload-video-chunk` e `finalize-video-upload`.
   - Se eu mantiver essas funções por compatibilidade, vou endurecer a autenticação e deixar claro que não são mais o caminho principal.

Arquivos principais:
- `src/contexts/UploadContext.tsx`
- `src/components/admin/VideoUploader.tsx`
- `src/components/upload/GlobalUploadIndicator.tsx`
- `supabase/functions/upload-video-chunk/index.ts`
- `supabase/functions/finalize-video-upload/index.ts`

Detalhes técnicos:
```text
Hoje
browser -> edge function por chunk -> bucket temp/
       -> edge function final -> baixa tudo -> reenvia tudo -> falha

Novo fluxo
browser -> storage multipart direto -> movies/arquivo-final.mp4
```

Validação obrigatória:
- não basta responder 2xx
- o upload precisa chegar a 100%
- o arquivo final precisa existir no bucket privado com tamanho coerente
- o caminho salvo precisa funcionar no fluxo de reprodução
- se falhar, a UI precisa mostrar a etapa exata da falha

Observações:
- Não precisa mudar banco nem o limite de 6GB.
- O problema agora não é o limite; é a arquitetura atual de upload/finalização.
- Eu não vou insistir em outro remendo pequeno no `finalize-video-upload` como solução principal, porque mesmo corrigindo a assinatura ele continua sendo um caminho frágil para 2.4GB.

Depois da aprovação, eu implemento.
