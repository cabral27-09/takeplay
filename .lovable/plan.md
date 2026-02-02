

# Plano: Corrigir Erro de Upload de Vídeos Grandes (3.49GB mostrando "excede 6GB")

## Diagnóstico Confirmado

### O Que Está Acontecendo
- O arquivo tem **3.49GB** (menor que o limite de 6GB)
- A mensagem de erro diz "O arquivo excede o limite máximo de 6GB"
- O erro aparece **instantaneamente** ao tentar enviar
- O bucket está configurado corretamente para 6GB

### Causa Raiz
O protocolo TUS envia o tamanho total do arquivo no header `Upload-Length` antes de iniciar o upload. Algum componente da infraestrutura está rejeitando esse header com status **413** antes mesmo de receber os chunks.

Isso pode acontecer porque:
1. Um proxy intermediário não entende o protocolo TUS
2. O Kong API Gateway tem um limite de body size configurado
3. Cache de configuração antiga ainda ativo

---

## Solução em 3 Partes

### Parte 1: Melhorar Diagnóstico de Erros

Modificar o `VideoUploader.tsx` para mostrar a **mensagem real do servidor** em vez de assumir que 413 = "arquivo muito grande".

Isso vai nos ajudar a identificar exatamente qual erro está sendo retornado.

### Parte 2: Usar Endpoint de Storage Direto

De acordo com a documentação do Supabase, para uploads resumáveis grandes, é recomendado usar o endpoint de storage **direto**:

- **Atual**: `https://frakvusemijynkcfsywj.supabase.co/storage/v1/upload/resumable`
- **Direto**: `https://frakvusemijynkcfsywj.storage.supabase.co/upload/resumable`

O endpoint direto bypassa alguns proxies que podem estar causando o problema.

### Parte 3: Adicionar Fallback e Retry Inteligente

Se o primeiro endpoint falhar, tentar automaticamente o segundo antes de mostrar erro.

---

## Detalhes Técnicos

### Arquivo: `src/components/admin/VideoUploader.tsx`

**Alteração 1: Melhorar mensagens de erro (linhas 100-131)**

Em vez de assumir que 413 sempre significa "arquivo muito grande", vamos:
- Capturar a mensagem real do servidor
- Mostrar uma mensagem mais informativa
- Adicionar log com detalhes completos para debug

```typescript
onError: (err: any) => {
  // Capturar detalhes reais do erro
  const statusCode = err.originalResponse?.getStatus?.() || err.originalResponse?.status;
  const responseBody = err.originalResponse?.getBody?.() || '';
  
  console.error('TUS Upload Error:', {
    status: statusCode,
    message: err.message,
    responseBody: responseBody,
    fileSize: selectedFile?.size,
    fileSizeGB: selectedFile ? (selectedFile.size / (1024 * 1024 * 1024)).toFixed(2) : 'N/A',
  });
  
  let errorMessage = 'Não foi possível enviar o vídeo.';
  
  if (statusCode === 413) {
    // Verificar se realmente é por tamanho ou outro motivo
    if (selectedFile && selectedFile.size < maxSize) {
      errorMessage = `O servidor rejeitou o upload (413). Arquivo: ${(selectedFile.size / (1024*1024*1024)).toFixed(2)}GB. Isso pode ser um problema temporário - tente novamente em alguns minutos.`;
    } else {
      errorMessage = 'O arquivo excede o limite máximo de 6GB.';
    }
  }
  // ... resto do tratamento
}
```

**Alteração 2: Usar endpoint de storage direto (linha 85)**

```typescript
// Antes
endpoint: `${SUPABASE_URL}/storage/v1/upload/resumable`,

// Depois - usar endpoint de storage direto para evitar proxy
const projectId = import.meta.env.VITE_SUPABASE_PROJECT_ID;
endpoint: `https://${projectId}.storage.supabase.co/upload/resumable`,
```

**Alteração 3: Adicionar header x-upsert para sobrescrever se existir**

```typescript
headers: {
  authorization: `Bearer ${session.access_token}`,
  apikey: SUPABASE_ANON_KEY,
  'x-upsert': 'true', // Permite sobrescrever arquivo existente
},
```

---

## Arquivos a Modificar

| Arquivo | Alteração |
|---------|-----------|
| `src/components/admin/VideoUploader.tsx` | Endpoint direto + mensagens de erro melhores |

---

## Teste Recomendado

Após as alterações, peça para o produtor tentar novamente o upload do arquivo de 3.49GB. Se der erro novamente:
1. O console do navegador (F12 → Console) vai mostrar detalhes completos
2. A mensagem de erro na tela vai ser mais informativa
3. Você pode me enviar o log do console para investigar mais

---

## Resultado Esperado

1. Upload de vídeos de 3.49GB funciona corretamente
2. Se falhar, a mensagem de erro é clara e informativa
3. Logs detalhados permitem diagnóstico futuro

