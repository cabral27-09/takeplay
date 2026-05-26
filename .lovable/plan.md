O limite do bucket `videos` já está em 6GB e o backend está saudável. Como o TUS continua recebendo `413 Maximum size exceeded` na criação do upload, a solução mais segura é parar de usar esse endpoint para vídeos grandes e voltar para o fluxo multipart direto em S3, que era a arquitetura prevista do projeto.

Plano de implementação:

1. Restaurar o upload direto para S3 multipart
- Trocar o fluxo atual em `UploadContext.tsx`, que usa `tus-js-client` + `/storage/v1/upload/resumable`, por upload multipart em partes.
- O frontend não enviará o vídeo inteiro de uma vez; ele enviará partes menores, com progresso real.
- Manter pausa/cancelamento/progresso no indicador global.

2. Criar/usar funções de backend para assinatura segura
- Criar funções de backend para:
  - iniciar upload multipart;
  - gerar URLs assinadas para cada parte;
  - concluir upload multipart;
  - abortar upload quando cancelar.
- O segredo da S3 fica só no backend, nunca no navegador.

3. Salvar no caminho esperado pelo app
- Ao concluir, retornar um `filePath` compatível com o cadastro do filme.
- Manter o comportamento atual: depois do upload, o formulário recebe o caminho do vídeo e pode salvar o filme normalmente.

4. Remover a dependência do TUS para vídeos
- Tirar o uso de `tus-js-client` do fluxo de vídeo.
- O bucket `videos` pode continuar existindo, mas o upload principal de vídeo não dependerá mais do limite que está gerando 413.

5. Validar com logs e mensagens melhores
- Se faltar configuração S3 no backend, mostrar erro claro.
- Se uma parte falhar, exibir erro de rede/assinatura em vez de erro genérico.
- Confirmar que arquivos grandes começam a carregar de fato, em vez de falhar no POST inicial.