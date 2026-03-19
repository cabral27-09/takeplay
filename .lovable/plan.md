

## Plano: Upload de vídeo em segundo plano (background upload)

### Problema

O upload de vídeo usa `tus-js-client` dentro do componente `VideoUploader`, que é destruído quando o usuário navega para outra página. O upload para imediatamente.

### Solução

Criar um **contexto global de upload** que mantém a instância TUS viva independente da página, com um **indicador flutuante** visível em qualquer tela.

### Arquivos a criar/editar

#### 1. Criar `src/contexts/UploadContext.tsx`
- Contexto React global com estado do upload (arquivo, progresso, velocidade, status, erro)
- Mantém a referência `tus.Upload` no contexto, fora de qualquer componente de página
- Expõe funções: `startUpload(file)`, `pauseUpload()`, `resumeUpload()`, `cancelUpload()`
- Callback `onComplete(filePath)` configurável para receber o path quando terminar
- Provido no `App.tsx` envolvendo todas as rotas

#### 2. Criar `src/components/upload/GlobalUploadIndicator.tsx`
- Barra flutuante fixa no canto inferior direito, visível em qualquer página
- Mostra: nome do arquivo, barra de progresso, %, velocidade
- Botões de pausar/continuar/cancelar
- Aparece apenas quando há upload ativo
- Minimizável para um ícone pequeno

#### 3. Editar `src/components/admin/VideoUploader.tsx`
- Quando um upload está em andamento no contexto global, mostrar o progresso inline (lido do contexto)
- Ao selecionar arquivo, chamar `startUpload()` do contexto ao invés de criar TUS localmente
- Registrar callback `onComplete` para chamar o `onChange(filePath)` do formulário
- Manter a UI de seleção de arquivo e exibição de vídeo já enviado

#### 4. Editar `src/App.tsx`
- Envolver rotas com `UploadProvider`
- Renderizar `GlobalUploadIndicator` dentro do provider

### Comportamento esperado

1. Usuário seleciona vídeo → upload inicia no contexto global
2. Usuário navega para outra página → upload continua, indicador flutuante visível
3. Usuário volta ao formulário → progresso atualizado inline
4. Upload completa → toast de sucesso, `video_url` atualizado se o formulário estiver aberto

