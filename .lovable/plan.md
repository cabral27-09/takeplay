# Migrar imagens e vídeos legados para o projeto Manivela

## O que existe hoje (verificado agora)

Neste projeto (Lovable Cloud):
- Bucket `videos` (privado): 18 arquivos em `movies/` somando ~28,8 GB — são os vídeos legados.
- Além disso há lixo de tentativas antigas de upload: `_tmp/` (1.832 arquivos, ~9,1 GB) e `temp/` (1.028 arquivos, ~8,3 GB).
- Bucket `movie-images` (público): 84 arquivos, ~35 MB — capas e backdrops.

No banco: 7 títulos; 6 têm `video_url` como caminho simples (`movies/xxx.mp4`) e 1 está sem vídeo. Hoje o código interpreta caminho simples como se já estivesse no bucket externo `manivela_filmes` — por isso os vídeos legados não tocam.

## O que será feito

### 1. Chave de serviço do projeto Manivela (necessário)
As tentativas anteriores falharam porque a cópia usava a chave anônima e o RLS do projeto externo recusava a gravação. Vou pedir o segredo `EXTERNAL_VIDEO_SUPABASE_SERVICE_ROLE_KEY` (chave `service_role` do seu projeto Manivela). Com ela a cópia grava sem depender de policies.

### 2. Migração dos vídeos
- Reescrever a função `migrate-video` para copiar em streaming, **um arquivo por chamada**, do bucket `videos` para `manivela_filmes`, mantendo o mesmo caminho (`movies/nome.mp4`).
- Arquivos grandes (o maior tem vários GB) vão por upload resumível, para poder continuar de onde parou caso a execução estoure o tempo limite.
- Depois de cada arquivo, conferir no destino se o tamanho bate com a origem; só então marcar como migrado.
- Rodar os 18 arquivos em sequência e apresentar um relatório final: migrados, tamanhos conferidos, falhas.

### 3. Migração das imagens
- Criar/usar o prefixo `images/` dentro do bucket `manivela_filmes` e copiar os 84 arquivos de `movie-images`.
- Como esse bucket é privado, as capas passariam a exigir URL assinada — o que deixa a listagem mais lenta e mais frágil.
- **Recomendação**: manter as imagens onde estão (são só 35 MB, já funcionam e são públicas) e migrar apenas os vídeos, que é onde está o volume. Se ainda assim você quiser mover as imagens, eu movo e adapto capas/backdrops para URL assinada — me confirme e eu incluo.

### 4. Atualização das referências
- Atualizar `movies.video_url` (e `thumbnail_url`/`backdrop_url`, se as imagens forem migradas) para apontar ao destino.
- Ajustar `get-video-url` para procurar sempre no `manivela_filmes` e só cair no bucket local se o arquivo não existir lá.

### 5. Limpeza (opcional, depois de confirmar)
Apagar `_tmp/` e `temp/` do bucket `videos` libera ~17 GB de lixo das tentativas antigas. Faço só com seu ok, e só depois que a migração dos vídeos estiver conferida.

## Detalhes técnicos

- `migrate-video` passa a usar `EXTERNAL_VIDEO_SUPABASE_SERVICE_ROLE_KEY` para o destino e `SUPABASE_SERVICE_ROLE_KEY` para assinar a leitura na origem.
- Cópia por `fetch` com `body` de stream (`duplex: 'half'`) para arquivos menores; para os grandes, GET com `Range` alimentando o endpoint resumível `/storage/v1/upload/resumable` do projeto externo, com offset persistido entre chamadas.
- Verificação por `HEAD`/`list` no destino comparando `content-length` com `metadata->>'size'` da origem.
- Nenhuma alteração no fluxo de upload novo — ele já grava direto em `manivela_filmes`.

## Riscos

O arquivo maior é de vários GB e a cópia depende da rede entre os dois projetos. Por isso a estratégia é resumível e por arquivo: se uma execução expirar, a próxima continua do ponto em que parou em vez de recomeçar.
