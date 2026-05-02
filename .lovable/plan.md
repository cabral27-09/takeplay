Primeiro: sim, eu entendo a sua frustração. E vou ser direto: o fluxo atual por Edge Function não é o caminho certo para arquivo de vários GB. Ele falha por limite real de plataforma: primeiro memória, depois tempo de execução. Continuar tentando “consertar” essa finalização dentro da função é desperdiçar seus créditos.

A solução que eu recomendo agora é trocar a arquitetura, não remendar a mesma.

## O que vou fazer

Implementar upload S3 Multipart direto do navegador para o bucket `videos`, usando o token da sessão do usuário e respeitando as permissões do backend. Isso elimina a função que junta chunks e evita a barreira de 99%.

## Por que isso deve resolver

O problema atual é este:

```text
Navegador -> Edge Function chunk -> Storage temporário -> Edge Function finaliza/junta 2.4GB -> falha por timeout
```

O novo fluxo será:

```text
Navegador -> Storage S3 Multipart -> arquivo final em videos/movies/... -> concluído
```

Ou seja:

- não existe mais etapa de “juntar” arquivo no servidor;
- não existe mais processamento de 2GB dentro de Edge Function;
- cada parte é enviada diretamente para o Storage;
- a própria API S3 Multipart monta o objeto final internamente;
- se uma parte falhar, apenas aquela parte é reenviada.

## Mudanças no projeto

### 1. Remover o fluxo de finalização por Edge Function do upload principal

No `UploadContext`, vou parar de usar:

- `upload-video-chunk`
- `finalize-video-upload`

Essas funções foram úteis para diagnosticar, mas não são adequadas para vídeos grandes porque a finalização fica presa ao limite de execução da função.

### 2. Adicionar dependências S3 oficiais

Adicionar:

- `@aws-sdk/client-s3`
- `@aws-sdk/lib-storage`

Elas implementam multipart upload corretamente no navegador.

### 3. Reescrever `src/contexts/UploadContext.tsx`

O novo upload vai:

- pegar a sessão atual do usuário;
- criar um cliente S3 apontando para o endpoint Storage do projeto;
- usar `accessKeyId = project_ref`, `secretAccessKey = publishable key`, `sessionToken = access_token`;
- enviar para `videos/movies/<timestamp-random>.<ext>`;
- usar multipart com partes maiores, por exemplo 16MB ou 32MB;
- acompanhar progresso real via evento `httpUploadProgress`;
- manter o indicador global de upload já existente;
- retornar o mesmo `filePath` atual (`movies/...`) para não quebrar o player nem o `get-video-url`.

### 4. Corrigir pausa/cancelamento para o novo modelo

No modelo S3 Multipart:

- cancelar será suportado abortando o upload ativo;
- pausar/retomar real e persistente é mais complexo com `@aws-sdk/lib-storage`;
- para não prometer algo quebrado, vou ajustar a UI para não vender “resumível” se o estado real não for persistente;
- se necessário, o botão “Pausar” será substituído por “Cancelar” durante essa primeira correção estável.

Minha prioridade aqui será: o vídeo subir até o fim.

### 5. Manter o destino compatível com o app

O arquivo final continuará sendo salvo em:

```text
videos/movies/...
```

E o valor salvo no formulário continuará sendo:

```text
movies/arquivo.mp4
```

Assim o restante do app deve continuar funcionando com `get-video-url`.

## O que não vou fazer

- Não vou insistir em juntar chunks via Edge Function.
- Não vou criar outro workaround que dependa de uma função rodando minutos.
- Não vou pedir outro upgrade sem evidência concreta.
- Não vou mexer em pagamento, player, aprovação ou cadastro de filmes.

## Ponto importante

O S3 Multipart via sessão do usuário depende das políticas de acesso ao bucket `videos`. Se o backend bloquear `INSERT` no Storage para admins/produtores via RLS, eu vou ajustar as policies necessárias por migration para permitir upload apenas para usuários autenticados com papel `admin` ou `producer` e apenas nos caminhos permitidos.

## Validação esperada

Depois da implementação:

1. Você tenta subir o mesmo vídeo grande.
2. O progresso deve sair de 0% e ir até 100% sem etapa longa de “Finalizando...” em Edge Function.
3. O arquivo deve aparecer diretamente como `movies/...`.
4. O formulário deve receber o caminho e permitir salvar o conteúdo.

## Plano de contingência honesto

Se o S3 Multipart direto via token de sessão também for bloqueado por alguma configuração externa do Storage/S3, o próximo caminho tecnicamente correto não é Edge Function: é upload direto para um bucket S3 externo dedicado, como AWS S3/Cloudflare R2, com URLs assinadas geradas por backend. Mas antes disso, o caminho S3 Multipart nativo do Storage é o correto a tentar, porque ele foi feito exatamente para arquivos grandes.