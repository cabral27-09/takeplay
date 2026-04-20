
## Problema real

O erro mudou de `Invalid Compact JWS` para `Maximum size exceeded`, e isso muda o diagnóstico:

- o upload falha em **0%**, no `POST /storage/v1/upload/resumable`
- isso significa que o servidor está rejeitando a **criação do upload antes de enviar qualquer chunk**
- portanto, o problema atual não é JWT nem TUS chunking; é **limite ativo de storage**

O código e o repositório dizem “até 6GB”, mas há inconsistência:

- `supabase/config.toml` define `file_size_limit = "6GiB"`
- há migrations que tentam subir o bucket `videos` para `6442450944`
- porém o backend em produção claramente ainda está aplicando um limite menor
- no front, `UploadContext.tsx` ainda valida **5GB**, enquanto a UI mostra **6GB**

## O que será corrigido

### 1. Confirmar e alinhar o limite real do backend
Verificar o limite que está ativo agora no backend para storage:
- limite global de arquivo
- limite do bucket `videos`
- mime types permitidos do bucket

Se o bucket ou o limite global estiver abaixo de 2.4GB/6GB, aplicar correção no backend para deixar tudo consistente com o produto:
- bucket `videos` com limite de 6GB
- limite global compatível com 6GB ou maior

### 2. Corrigir a inconsistência do front-end
Atualizar `src/contexts/UploadContext.tsx` para usar o mesmo limite oficial do produto:
- trocar validação local de **5GB** para **6GB**
- manter `chunkSize` em `6 * 1024 * 1024`
- manter o endpoint direto de storage e o fluxo TUS atual

### 3. Unificar a mensagem para o usuário
Revisar os pontos que exibem “máx. 6GB” para garantir que todos os lugares reflitam o mesmo limite:
- `src/components/admin/VideoUploader.tsx`
- mensagens de erro/toast do upload
- qualquer texto de plano/benefício que mencione tamanho máximo

### 4. Evitar falsos diagnósticos futuros
Melhorar o tratamento do erro no upload para distinguir:
- erro de autenticação
- erro de permissão
- erro de limite de tamanho
- erro genérico do TUS

Assim, se o backend voltar a responder `Maximum size exceeded`, a interface mostrará um motivo claro em vez de parecer bug de upload.

## Arquivos envolvidos

- `src/contexts/UploadContext.tsx`
- `src/components/admin/VideoUploader.tsx`
- `src/components/producer/UploadGate.tsx` ou outros textos de plano
- `supabase/config.toml`
- migrations de storage já existentes em `supabase/migrations/`

## Resultado esperado

Depois da correção:
- vídeos grandes não devem falhar imediatamente em 0%
- um arquivo de **2.4GB** deve conseguir iniciar normalmente o upload
- o limite exibido na UI, validado no cliente e aplicado no backend ficará consistente em **6GB**

## Detalhes técnicos

- `Maximum size exceeded` no `POST /upload/resumable` indica rejeição pelo **limite de storage no servidor**, antes do envio dos chunks
- `chunkSize` de 6MB continua correto para TUS
- a divergência atual é:
  - backend/documentação do projeto: 6GB
  - validação local em `UploadContext`: 5GB
- além do limite por bucket, existe também a possibilidade de um **limite global ativo** estar menor que o esperado; ambos precisam ficar alinhados
