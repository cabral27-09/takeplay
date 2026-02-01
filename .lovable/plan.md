

# Plano: Corrigir Upload de Vídeos Grandes (3.9GB+)

## Diagnóstico do Problema

### O que foi reportado
Tentativa de upload de vídeo de **3.9GB** para a série "O Papo Faz Curva EP2" foi bloqueado, mesmo que o limite deveria ser 5GB.

### Possíveis Causas Identificadas

| Causa | Probabilidade | Detalhe |
|-------|---------------|---------|
| **1. Usuário sem plano ativo** | Alta | O `UploadGate` bloqueia antes mesmo do upload se não houver compra válida |
| **2. Limite de memória do navegador** | Média | Arquivos de 3.9GB podem exceder o heap do JavaScript |
| **3. Timeout de conexão** | Média | Uploads longos podem sofrer interrupção |
| **4. Inconsistência de limites** | Baixa | Client diz 6GB, bucket permite 5GB (mas 3.9GB está abaixo) |
| **5. Erro de rede/TUS** | Média | O protocolo resumable pode ter falhado silenciosamente |

### Status Atual da Configuração

**Bucket `videos`:**
- `file_size_limit`: 5GB (5.368.709.120 bytes) ✓
- `public`: false (privado, correto) ✓
- MIME types: `video/mp4`, `video/webm`, `video/quicktime` ✓

**Políticas de Storage:**
- ✅ `Producers can upload videos` - permite INSERT para produtores
- ✅ `Producers can update videos` - permite UPDATE
- ✅ `Producers can delete videos` - permite DELETE

**VideoUploader.tsx:**
- Usa TUS (resumable upload) ✓
- Chunk size: 6MB ✓
- Retry delays configurados ✓
- Validação client: 6GB (inconsistente com 5GB do bucket)

---

## Solução Proposta

### Fase 1: Harmonizar Limites e Aumentar para 6GB

O memory `constraints/storage-limits` menciona que o limite deveria ser **6GB** para acomodar uploads grandes. Precisamos:

1. **Atualizar o bucket** para 6GB (6.442.450.944 bytes)
2. **Corrigir textos da UI** que mostram "5GB"

### Fase 2: Melhorar Tratamento de Erros no Upload

Atualmente, erros podem não ser mostrados corretamente. Precisamos:

1. Adicionar logs detalhados do erro real
2. Mostrar mensagem específica quando TUS falha
3. Detectar quando o usuário não tem permissão vs arquivo grande demais

### Fase 3: Verificar Plano do Produtor

O erro mais provável é que o produtor **não tem plano ativo** ou **uploads esgotados**. O `UploadGate` bloqueia isso, mas a mensagem pode não estar clara.

---

## Detalhes Técnicos

### Migração SQL (aumentar limite do bucket)

Atualizar o bucket `videos` para permitir arquivos de até 6GB:

```sql
UPDATE storage.buckets 
SET file_size_limit = 6442450944 
WHERE id = 'videos';
```

### Arquivo: `src/components/producer/UploadGate.tsx`

Corrigir texto de "5GB" para "6GB" na lista de benefícios:

- Linha 78: `'✓ Upload de até 5GB por arquivo'` → `'✓ Upload de até 6GB por arquivo'`

### Arquivo: `src/lib/subscription-tiers.ts`

Atualizar as features dos planos de produtor:

- Linhas 78, 96, 112: `'Até 5GB por arquivo'` → `'Até 6GB por arquivo'`

### Arquivo: `src/components/admin/VideoUploader.tsx`

Melhorar o tratamento de erro para identificar a causa exata:

- Linha 100-116: Expandir a lógica de `onError` para detectar:
  - Erro 413 (arquivo muito grande)
  - Erro 403 (sem permissão - produtor sem plano)
  - Erro de rede/timeout
  - Quota excedida

Exemplo de melhoria:

```typescript
onError: (err) => {
  console.error('Upload error details:', {
    message: err.message,
    causingError: err.originalRequest,
    originalResponse: err.originalResponse,
  });
  
  let errorMessage = 'Não foi possível enviar o vídeo.';
  
  if (err.originalResponse?.status === 413) {
    errorMessage = 'O arquivo excede o limite máximo de 6GB.';
  } else if (err.originalResponse?.status === 403) {
    errorMessage = 'Você não tem permissão para fazer upload. Verifique se tem um plano de produtor ativo.';
  } else if (err.message?.includes('network') || err.message?.includes('fetch')) {
    errorMessage = 'Erro de conexão. Verifique sua internet e tente novamente. Uploads grandes podem ser retomados.';
  } else if (err.message?.includes('exceeded') || err.message?.includes('too large')) {
    errorMessage = 'O arquivo excede o limite do servidor (6GB máximo).';
  } else if (err.message) {
    errorMessage = err.message;
  }
  
  setError({ title: 'Erro no upload', description: errorMessage });
}
```

---

## Arquivos a Modificar

| Arquivo | Alteração |
|---------|-----------|
| Migração SQL | Aumentar `file_size_limit` do bucket para 6GB |
| `src/components/producer/UploadGate.tsx` | Corrigir texto "5GB" → "6GB" |
| `src/lib/subscription-tiers.ts` | Corrigir textos dos planos "5GB" → "6GB" |
| `src/components/admin/VideoUploader.tsx` | Melhorar mensagens de erro |

---

## Investigação Adicional Necessária

Para determinar a causa exata do erro da série "O Papo Faz Curva EP2", preciso saber:

1. **O produtor tem plano ativo?** 
   - Qual é o email do produtor que tentou fazer o upload?
   - Ele comprou um plano de produtor (Anual, Semestral ou Avulso)?

2. **Qual foi a mensagem de erro exibida?**
   - Apareceu algum toast/alert?
   - O upload começou e depois falhou, ou nem iniciou?

3. **Qual navegador/dispositivo foi usado?**
   - Navegadores móveis têm limites de memória menores

---

## Fluxo Esperado Após Correção

```text
1. Produtor acessa /producer/upload
2. Sistema verifica se tem plano ativo (UploadGate)
3. Se sim, mostra formulário com uploader
4. Produtor seleciona vídeo de 3.9GB
5. Validação client passa (< 6GB)
6. TUS inicia upload resumable em chunks de 6MB
7. Progress bar mostra avanço + velocidade
8. Se falhar, sistema permite retomar de onde parou
9. Ao completar, salva path relativo no banco
```

---

## Resultado Esperado

1. ✅ Uploads de até 6GB funcionam corretamente
2. ✅ Mensagens de erro claras quando algo falha
3. ✅ Textos da UI consistentes (todos dizem "6GB")
4. ✅ Produtor consegue enviar "O Papo Faz Curva EP2"

