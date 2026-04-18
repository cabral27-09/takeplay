

## Diagnóstico do erro real

A documentação oficial do Supabase exige **`chunkSize: 6MB exatamente`** para uploads TUS. Usar 50MB faz o storage rejeitar com erro confuso `AccessDenied / Unauthorized: Compact JWS` (que parece erro de auth, mas é validação de chunk).

Erro do print mostra:
- `response code: 400`
- `{"statusCode":"403","code":"AccessDenied","error":"Unauthorized: Compact JWS"}`

Esse erro acontece porque o serviço de storage bloqueia chunks fora do tamanho esperado.

## Correção

**Arquivo:** `src/contexts/UploadContext.tsx`

1. Trocar `CHUNK_SIZE = 50 * 1024 * 1024` por `CHUNK_SIZE = 6 * 1024 * 1024` (6MB, valor obrigatório do Supabase)
2. Garantir que o `endpoint` use o hostname direto `storage.supabase.co` (já está correto no código)
3. Forçar refresh do token ANTES de iniciar o upload (não só no `onBeforeRequest`), para garantir que a primeira request POST de criação use um JWT fresco
4. Adicionar log do endpoint final no console na inicialização para confirmar que o `PROJECT_REF` está sendo lido corretamente em runtime

## Impacto na performance

Com chunks de 6MB para um arquivo de 2.4GB serão ~400 partes em vez de ~48. Isso é normal e esperado pelo Supabase — o protocolo TUS é otimizado para isso e o overhead por request é mínimo. Continua suportando resume nativo se a conexão cair.

## Por que o erro parecia ser de URL/auth

O Supabase Storage retorna `AccessDenied / Compact JWS` para vários tipos de erro de validação além de auth real, incluindo chunk size inválido. Isso desviou o diagnóstico anterior.

