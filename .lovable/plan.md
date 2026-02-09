

# Plano: Corrigir EP3 da série "O Papo Faz Curva"

## Problemas Encontrados

1. **Duplicatas**: Existem 4 registros de EP3, sendo 2 publicados, 1 em rascunho e 1 pendente de revisao
2. **Vinculacao ausente**: Nenhum EP3 esta vinculado a serie pai (series_id = NULL)
3. **Videos possivelmente corrompidos**: Os uploads foram feitos pelo metodo antigo que falhava com arquivos grandes
4. **Tier inconsistente**: Um EP3 publicado esta como "premium" e outro como "free"

## Solucao em 2 Etapas

### Etapa 1: Limpeza do Banco de Dados

Manter apenas **1 registro** do EP3 (o mais recente publicado: `c4a8e78b`) e vincula-lo corretamente a serie pai. Remover ou despublicar os duplicados.

Acoes:
- Despublicar os registros duplicados (mudar status para "draft")
- Vincular o EP3 escolhido a serie pai: `series_id = c328446b`
- Ajustar o min_tier para ser consistente com o restante da serie

### Etapa 2: Re-upload do Video

Como os uploads anteriores usavam o metodo antigo (chunks via Edge Functions) que falhava com arquivos grandes, o arquivo de video no Storage pode estar corrompido ou incompleto.

**Apos a correcao do codigo do uploader com TUS** (ja implementada), sera necessario:
- Verificar se o arquivo `movies/1770432300872-nim5ag9hl69.mp4` existe e esta intacto no Storage
- Se nao estiver funcional, fazer um novo upload do EP3 usando o novo uploader com TUS protocol

## Detalhes Tecnicos

### SQL para limpeza (sera executado via migration):

```sql
-- 1. Despublicar duplicatas do EP3
UPDATE movies SET status = 'draft' 
WHERE id IN (
  '1eebb0df-a1f9-4477-8f8d-1727904b5f08',
  'fb7696fe-3f38-452e-8389-0d5cec1b77ab',
  '59e7fc11-2105-4efd-8ea1-f937055c6790'
);

-- 2. Vincular o EP3 restante a serie pai e ajustar tier
UPDATE movies 
SET series_id = 'c328446b-407f-458d-ac58-8ce035c06ece',
    min_tier = 'free'
WHERE id = 'c4a8e78b-e958-4d11-a0df-fc8fd1564526';
```

### Verificacao do arquivo de video

Apos a limpeza, o sistema tentara gerar uma URL assinada via a Edge Function `get-video-url`. Se o arquivo nao existir no Storage, o player exibira a mensagem "Video Indisponivel" e sera necessario fazer o re-upload.

## Resultado Esperado

- Apenas 1 EP3 publicado e vinculado corretamente a serie
- O episodio aparecera na listagem de episodios da serie
- O video estara acessivel (se o arquivo existir no Storage) ou claramente marcado para re-upload

