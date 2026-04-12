
Sim — agora eu sei exatamente onde está o problema, e ele é corrigível.

## Diagnóstico confirmado

O upload de 2.4GB não está falhando mais por causa do limite de 6GB no bucket. O que acontece hoje é:

- Os chunks pequenos estão funcionando
- O upload chega a 99% porque todos os chunks sobem com sucesso
- A falha acontece só na etapa final, quando o backend tenta montar o arquivo final

Eu confirmei isso pelos logs:
- `upload-video-chunk`: último chunk foi enviado com sucesso
- `finalize-video-upload`: erro exato
  - `InvalidSignature`
  - `Unsupported authorization type`

Ou seja: o endpoint S3 do storage está recebendo uma autenticação errada na finalização. O código atual tenta usar `Authorization: Bearer ...` no endpoint S3, mas esse endpoint exige autenticação S3 compatível, não bearer token simples.

## O que vou corrigir

### 1. Corrigir a função `finalize-video-upload`
Vou reescrever a autenticação da etapa final para usar o método correto de upload multipart compatível com o storage S3.

Hoje o problema está aqui:
- `supabase/functions/finalize-video-upload/index.ts`

Mudança:
- remover o `fetch` manual com header bearer para o endpoint S3
- usar autenticação S3 correta para:
  1. iniciar multipart upload
  2. enviar cada part
  3. completar o multipart upload
  4. abortar/limpar em caso de erro

### 2. Manter o envio por chunks do frontend
Essa parte já está funcionando e não é o gargalo principal.

Arquivos que devem continuar quase iguais:
- `src/contexts/UploadContext.tsx`
- `supabase/functions/upload-video-chunk/index.ts`

### 3. Melhorar a mensagem de erro no app
Hoje a interface mostra só:
- `Edge Function returned a non-2xx status code`

Vou trocar isso por mensagens úteis, por exemplo:
- erro na finalização do vídeo
- erro de autenticação do storage
- falha ao montar o arquivo final

Assim, se algo der errado de novo, você vai ver o ponto real da falha.

### 4. Validar o fluxo inteiro
Depois da correção, vou validar o fluxo esperado:
1. upload dos chunks
2. finalização sem erro no 99%
3. gravação do caminho final do vídeo
4. reprodução normal via URL assinada

## Arquivos envolvidos

### Alteração principal
- `supabase/functions/finalize-video-upload/index.ts`

### Ajustes secundários
- `src/contexts/UploadContext.tsx`
- `src/components/admin/VideoUploader.tsx`
- `src/components/upload/GlobalUploadIndicator.tsx`

## Detalhes técnicos

```text
Browser
  -> envia chunks de 5MB
  -> upload-video-chunk salva em temp/

finalize-video-upload
  -> lê chunks temporários
  -> faz multipart upload com autenticação S3 correta
  -> completa arquivo final em videos/movies/...
  -> remove temp/
```

Ponto mais importante:
- o problema atual não é mais “limite de 6GB”
- o problema real é “finalização com autenticação errada no endpoint S3”

## Resultado esperado após a correção

- o vídeo de 2.4GB para de falhar em 99%
- o erro 413 deixa de ser irrelevante nesse fluxo
- o upload grande passa a concluir de verdade
- você mantém upload resumível e compatível com arquivos grandes

## Observação importante

Se, depois de corrigir a autenticação, a finalização ainda ficar longa demais para uma execução única, eu deixarei a etapa final preparada para um fluxo assíncrono. Mas pelo que vi agora, o bloqueio atual é objetivo e imediato: a autenticação S3 está errada.

## Próxima implementação

Vou aplicar a correção primeiro no backend de finalização e depois revisar a interface para mostrar erros reais em vez da mensagem genérica.
