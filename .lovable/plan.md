
# Plano: Corrigir Auto-Preenchimento ao Selecionar Série Existente

## Problema Identificado

O auto-preenchimento **não funciona** porque o hook `useSeriesParent` pode estar:

1. **Falhando silenciosamente** - Usando `.single()` que pode retornar erro se RLS bloquear
2. **Não sendo ativado** - O `enabled` pode ter problemas de timing com states
3. **Dados não chegando ao useEffect** - O `selectedSeriesData` pode estar `undefined`

## Investigação no Código

O fluxo atual:
```text
Usuário seleciona série → setSelectedSeriesId(value) → useSeriesParent(selectedSeriesId) → useEffect preenche formData
```

O problema pode estar em:
- Hook `useSeriesParent` usando `.single()` que falha silenciosamente
- Estado `selectedSeriesId` não sendo passado corretamente
- RLS bloqueando a leitura (embora a série esteja published)

---

## Solução

### 1. Corrigir o Hook `useSeriesParent`

**Arquivo:** `src/hooks/useSeriesEpisodes.ts`

Mudanças:
- Usar `.maybeSingle()` ao invés de `.single()` para evitar erros silenciosos
- Adicionar log para debug
- Garantir que o hook retorna dados corretamente

```typescript
export function useSeriesParent(seriesId: string | undefined) {
  return useQuery({
    queryKey: ['series-parent', seriesId],
    queryFn: async (): Promise<MovieWithGenres | null> => {
      if (!seriesId) return null;

      console.log('Fetching series parent:', seriesId);

      // Fetch series data - usando maybeSingle para evitar erros
      const { data: seriesData, error: seriesError } = await supabase
        .from('movies')
        .select('*')
        .eq('id', seriesId)
        .maybeSingle();

      if (seriesError) {
        console.error('Error fetching series:', seriesError);
        throw seriesError;
      }
      
      if (!seriesData) {
        console.warn('Series not found:', seriesId);
        return null;
      }

      console.log('Series data fetched:', seriesData);

      // Buscar gêneros
      const { data: genreLinks, error: genreLinksError } = await supabase
        .from('movie_genres')
        .select('genre_id')
        .eq('movie_id', seriesId);

      if (genreLinksError) {
        console.error('Error fetching genre links:', genreLinksError);
        throw genreLinksError;
      }

      let genres: Genre[] = [];
      if (genreLinks && genreLinks.length > 0) {
        const genreIds = genreLinks.map(gl => gl.genre_id);
        const { data: genresData, error: genresError } = await supabase
          .from('genres')
          .select('*')
          .in('id', genreIds);

        if (genresError) throw genresError;
        genres = (genresData || []) as Genre[];
      }

      const result = {
        ...seriesData,
        content_type: (seriesData.content_type || 'serie') as ContentType,
        genres,
      } as MovieWithGenres;

      console.log('Series parent result:', result);
      return result;
    },
    enabled: !!seriesId,
    staleTime: 0, // Sempre buscar dados frescos
  });
}
```

### 2. Adicionar Logs no Componente de Upload

**Arquivo:** `src/pages/producer/UploadMovie.tsx`

Adicionar logs para debug no useEffect:

```typescript
// Auto-fill form when selecting an existing series
useEffect(() => {
  console.log('Auto-fill effect triggered:', { 
    selectedSeriesData, 
    seriesMode, 
    selectedSeriesId 
  });
  
  if (selectedSeriesData && seriesMode === 'existing') {
    console.log('Auto-filling form with series data:', selectedSeriesData);
    setFormData(prev => ({
      // ... todos os campos
    }));
  }
}, [selectedSeriesData, seriesMode]);
```

### 3. Mostrar Todos os Campos Preenchidos (Read-Only)

**Arquivo:** `src/pages/producer/UploadMovie.tsx`

Quando `seriesMode === 'existing'` e `selectedSeriesData` existe:
- Mostrar TODOS os campos preenchidos
- Campos serão `disabled` (read-only)
- Apenas `season_number`, `current_episode` e `video_url` são editáveis

---

## Resultado Visual Esperado

```text
┌────────────────────────────────────────────────────────────────────────────┐
│ Tipo de Conteúdo: Série                                                    │
├────────────────────────────────────────────────────────────────────────────┤
│ ● Adicionar episódio a série existente                                     │
│ [O PAPO FAZ CURVA ▼]                                                       │
├────────────────────────────────────────────────────────────────────────────┤
│                                                                            │
│ ═══════════════════ DADOS HERDADOS DA SÉRIE (SOMENTE LEITURA) ════════════ │
│                                                                            │
│ Nome da Série:        [ O PAPO FAZ CURVA                    ] (desabilitado) │
│ Sinopse:              [ Um grupo de pessoas...              ] (desabilitado) │
│ Ano:                  [ 2026                                ] (desabilitado) │
│ Duração por episódio: [ 23 min                              ] (desabilitado) │
│ Classificação:        [ 12 anos                             ] (desabilitado) │
│ Idioma:               [ Português                           ] (desabilitado) │
│ Gêneros:              [■ Aventura]                            (desabilitado) │
│ Tier:                 [ Standard                            ] (desabilitado) │
│                                                                            │
│ Thumbnail:  [🖼️ imagem atual]                                (desabilitado) │
│ Banner:     [🖼️ imagem atual]                                (desabilitado) │
│ Trailer:    [ https://youtube.com/...                     ] (desabilitado) │
│                                                                            │
│ ═════════════════════════ INFORMAÇÕES DO EPISÓDIO ═════════════════════════ │
│                                                                            │
│ Qual temporada?  [ 1  ]                              ← EDITÁVEL             │
│ Qual episódio?   [ 3  ]                              ← EDITÁVEL             │
│                                                                            │
│ Vídeo do Episódio:  [📹 UPLOAD VIDEO]                ← EDITÁVEL             │
│                                                                            │
└────────────────────────────────────────────────────────────────────────────┘
```

---

## Arquivos a Modificar

| Arquivo | Alteração |
|---------|-----------|
| `src/hooks/useSeriesEpisodes.ts` | Corrigir hook com `.maybeSingle()` e adicionar logs |
| `src/pages/producer/UploadMovie.tsx` | Mostrar todos os campos preenchidos como read-only quando série existente selecionada |

---

## Detalhes Técnicos

### Mudança no UI (UploadMovie.tsx)

Quando `seriesMode === 'existing'` e `selectedSeriesData` existe:

1. **Seção "Informações Básicas"** - Mostrar com campos `disabled`:
   - Título (preenchido automaticamente)
   - Sinopse (preenchida automaticamente)
   - Ano, Duração, Classificação, Idioma (preenchidos)

2. **Seção "Gêneros"** - Mostrar gêneros selecionados com checkboxes `disabled`

3. **Seção "Imagens"** - Mostrar previews das imagens (não editável)

4. **Seção "Episódio"** - ÚNICA seção editável:
   - Temporada (editável)
   - Número do episódio (editável)
   - Upload de vídeo (editável)

Isso garante que o produtor veja claramente o que foi herdado e o que precisa preencher.
