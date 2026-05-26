Vou ser direto: não dá para armazenar vídeos de GB “dentro do código do projeto” como se fosse uma pasta local, porque o app publicado é estático e não tem disco persistente para receber uploads. Também não é possível remover o Lovable Cloud depois de ativado. O que dá para fazer — e é o caminho correto aqui — é parar de usar o endpoint S3/AWS SDK que está gerando esse erro e voltar a gravar no armazenamento do próprio projeto usando o protocolo nativo resumível.

## Plano

1. Remover o fluxo S3 Multipart do frontend
   - Retirar `@aws-sdk/client-s3` e `@aws-sdk/lib-storage` do upload.
   - Remover uso de `S3Client`, `Upload`, `AbortMultipartUploadCommand`, credenciais S3 e endpoint `/storage/v1/s3`.
   - Isso elimina o erro “The specified upload does not exist”, que vem do multipart S3.

2. Implementar upload resumível nativo do armazenamento do projeto
   - Usar upload direto do navegador para o bucket `videos`, sem Edge Function para juntar partes.
   - Usar protocolo resumível TUS, próprio para arquivos grandes e instáveis.
   - Arquivos continuarão indo para `movies/...`, como hoje.
   - Limite mantido em 6GB.

3. Manter autenticação e permissões existentes
   - Antes do upload, validar sessão do usuário.
   - Manter a exigência de conta admin/produtor via regras atuais do bucket e do app.
   - Não abrir o bucket publicamente.

4. Restaurar controle real de cancelamento
   - Cancelar o upload em andamento no cliente.
   - Limpar estado visual corretamente.
   - Evitar tentativa de abortar multipart inexistente.

5. Remover dependências e código morto
   - Remover pacotes AWS do `package.json`/lockfile.
   - Deixar as Edge Functions antigas sem uso por enquanto, ou remover depois se você confirmar; elas não serão chamadas nesse novo fluxo.

## Resultado esperado

- Upload de vídeo grande sem etapa de “finalização” em Edge Function.
- Sem concatenação em memória.
- Sem S3 Multipart.
- Sem erro de upload ID inexistente.
- Progresso chega a 100% quando o arquivo já estiver gravado no armazenamento do projeto.