
Problema identificado

- O erro agora está claro: o upload falha no `POST` inicial do TUS para `/storage/v1/upload/resumable` com `413 Maximum size exceeded`.
- Isso significa que o backend rejeita o tamanho total do arquivo antes mesmo de começar a enviar os chunks.
- O bucket `videos` já está configurado com `file_size_limit = 6GB`, então o bloqueio não é mais o bucket.
- Como um vídeo de 2GB funcionou e o de 5GB não, o cenário mais provável é um limite global do storage/backend menor que 5GB.
- Também existe inconsistência no app: a UI fala em 6GB, mas `src/lib/subscription-tiers.ts` ainda guarda `maxFileSizeGB: 5`.

Plano de implementação

1. Corrigir o limite real no backend
- Ajustar a configuração global de upload do storage no backend para pelo menos 6GB.
- Manter o bucket `videos` alinhado com esse mesmo valor.

2. Unificar a regra de tamanho no app
- Parar de espalhar números diferentes.
- Definir um único limite oficial e refletir isso em validação, textos e planos.
- Preferência: alinhar tudo para 6GB, porque o app já comunica 6GB.

3. Melhorar o tratamento do erro
- Em `src/contexts/UploadContext.tsx`, interceptar `413` / `Maximum size exceeded`.
- Trocar o erro bruto do TUS por uma mensagem clara, por exemplo: “Este arquivo ultrapassa o limite permitido pelo sistema.”

4. Corrigir a comunicação na interface
- Revisar os textos que prometem 6GB:
  - `src/components/admin/VideoUploader.tsx`
  - `src/components/producer/UploadGate.tsx`
  - `src/lib/subscription-tiers.ts`
- Garantir que o limite exibido seja exatamente o mesmo suportado pelo backend.

Arquivos/áreas afetadas

- `src/contexts/UploadContext.tsx`
- `src/components/admin/VideoUploader.tsx`
- `src/components/producer/UploadGate.tsx`
- `src/lib/subscription-tiers.ts`
- Configuração de storage do backend

Detalhe técnico

- O `413` no passo de criação do upload TUS indica rejeição do `Upload-Length`, não problema de chunk, browser ou formulário.
- Como o bucket já está em 6GB, o próximo ponto a ajustar é o limite global do backend.
- Se esse limite global não puder subir para 6GB, o plano alternativo é reduzir a promessa do app para o limite real e avisar isso antes da seleção do arquivo — mas a solução ideal é liberar de fato os 6GB que o sistema já promete.
