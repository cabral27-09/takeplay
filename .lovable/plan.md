Vou aplicar uma correção no backend para o upload voltar a aceitar vídeos grandes.

Plano:
1. Atualizar a configuração do bucket privado `videos` para aceitar arquivos de até 6GB.
2. Garantir que os tipos de vídeo comuns sejam aceitos: MP4, WebM, MOV/QuickTime, AVI, MPEG e MKV.
3. Não alterar o frontend de upload agora, porque o erro atual acontece antes do envio dos chunks: o backend rejeita o tamanho total declarado.
4. Depois da alteração, testar novamente o upload pelo fluxo atual.

Detalhe técnico:
- O erro `413 Maximum size exceeded` vem do limite `file_size_limit` do bucket.
- O TUS envia o tamanho total no header `Upload-Length` ao criar o upload; se esse valor passa do limite do bucket, o backend bloqueia antes de começar o envio.
- A correção é uma atualização de configuração em `storage.buckets`, não uma mudança visual nem de lógica de tela.