
# Plano: Adicionar Auto-Preenchimento na Página de Admin (MovieForm.tsx)

## Problema Identificado

A página de admin (`/admin/movies/new`) **NÃO possui auto-preenchimento** quando uma série existente é selecionada. Ao contrário da página do produtor (`UploadMovie.tsx`), a página de admin (`MovieForm.tsx`) não usa o hook `useSeriesParent` para buscar e preencher automaticamente os dados da série pai.

**Resultado atual:** O admin seleciona "O PAPO FAZ CURVA" no dropdown, mas todos os campos abaixo (Nome da Série, Sinopse, etc.) ficam em branco.

---

## Solução

### Arquivo a Modificar: `src/pages/admin/MovieForm.tsx`

Adicionar a mesma lógica de auto-preenchimento que existe na página do produtor:

1. **Importar o hook `useSeriesParent`**
2. **Buscar dados quando `formData.series_id` mudar**
3. **Preencher automaticamente TODOS os campos herdados**
4. **Mostrar campos como read-only quando série existente for selecionada**

---

## Mudanças Detalhadas

### 1. Adicionar Import do Hook

```typescript
import { useSeriesListAdmin, useSeriesParent } from '@/hooks/useSeriesEpisodes';
```

### 2. Adicionar Chamada do Hook

```typescript
// Fetch selected series data for auto-fill
const { data: selectedSeriesData, isLoading: seriesParentLoading } = useSeriesParent(
  formData.series_id || undefined
);
```

### 3. Adicionar useEffect para Auto-Preenchimento

```typescript
// Auto-fill form when selecting an existing series
useEffect(() => {
  if (selectedSeriesData && formData.series_id) {
    console.log('Admin: Auto-filling form with series data:', selectedSeriesData);
    setFormData(prev => ({
      ...prev,
      // Tipo de conteúdo
      content_type: selectedSeriesData.content_type || 'serie',
      
      // Detalhes herdados
      title: selectedSeriesData.title,
      synopsis: selectedSeriesData.synopsis || '',
      year: selectedSeriesData.year || new Date().getFullYear(),
      duration: selectedSeriesData.duration || 90,
      rating: selectedSeriesData.rating || 0,
      
      // Classificação
      age_rating: selectedSeriesData.age_rating || 'L',
      language: selectedSeriesData.language || 'portugues',
      
      // Mídia
      thumbnail_url: selectedSeriesData.thumbnail_url || '',
      backdrop_url: selectedSeriesData.backdrop_url || '',
      trailer_url: selectedSeriesData.trailer_url || '',
      
      // Gêneros
      genre_ids: selectedSeriesData.genres?.map(g => g.id) || [],
      
      // Estrutura da série
      total_seasons: selectedSeriesData.total_seasons || null,
      total_episodes: selectedSeriesData.total_episodes || null,
      
      // Tier e produtor
      min_tier: selectedSeriesData.min_tier || 'free',
      producer_type: selectedSeriesData.producer_type || 'studio',
      producer_name: selectedSeriesData.producer_name || '',
    }));
  }
}, [selectedSeriesData, formData.series_id]);
```

### 4. Adicionar Variável para Verificar se Série Está Selecionada

```typescript
const isExistingSeriesSelected = !!formData.series_id && !!selectedSeriesData;
```

### 5. Mostrar Campos como Read-Only

Quando `isExistingSeriesSelected` for `true`, os campos herdados devem:
- Ficar com `disabled={true}`
- Ter fundo diferente (ex: `className="bg-muted"`)
- Mostrar badge "Herdado"

Campos que ficam editáveis:
- Temporada (`season_number`)
- Episódio (`current_episode`)
- Upload de vídeo

---

## Resultado Visual Esperado

```text
┌────────────────────────────────────────────────────────────────────────────┐
│ Tipo de Conteúdo: Série                                                    │
├────────────────────────────────────────────────────────────────────────────┤
│ Informações da Série                                                       │
│                                                                            │
│ Vincular a uma Série Existente                                             │
│ [O PAPO FAZ CURVA ▼]                                                       │
│                                                                            │
│ Qual temporada? [  ]     Qual episódio? [  ]   ← EDITÁVEL                  │
├────────────────────────────────────────────────────────────────────────────┤
│ Informações Básicas (Herdadas da Série)                                    │
│                                                                            │
│ Nome da Série:  [ O PAPO FAZ CURVA ]    ← DESABILITADO + PREENCHIDO        │
│ Sinopse:        [ Texto da série... ]   ← DESABILITADO + PREENCHIDO        │
│ Ano:            [ 2026 ]                ← DESABILITADO + PREENCHIDO        │
│ Duração:        [ 23 ]                  ← DESABILITADO + PREENCHIDO        │
│ Classificação:  [ 12 anos ]             ← DESABILITADO + PREENCHIDO        │
│ Idioma:         [ Português ]           ← DESABILITADO + PREENCHIDO        │
├────────────────────────────────────────────────────────────────────────────┤
│ Gêneros (Herdados)                                                         │
│ [✓] Aventura                            ← DESABILITADO + PREENCHIDO        │
├────────────────────────────────────────────────────────────────────────────┤
│ Mídia                                                                      │
│ Thumbnail: [🖼️ imagem atual]            ← DESABILITADO + PREVIEW           │
│ Banner:    [🖼️ imagem atual]            ← DESABILITADO + PREVIEW           │
│                                                                            │
│ Vídeo do Episódio: [UPLOAD]             ← EDITÁVEL                         │
└────────────────────────────────────────────────────────────────────────────┘
```

---

## Arquivos a Modificar

| Arquivo | Alteração |
|---------|-----------|
| `src/pages/admin/MovieForm.tsx` | Adicionar hook `useSeriesParent`, useEffect de auto-fill, e campos disabled quando série selecionada |

---

## Benefícios

1. Admin só precisa informar temporada, episódio e fazer upload do vídeo
2. Todos os metadados são herdados automaticamente da série pai
3. Consistência visual entre páginas de admin e produtor
4. Evita erros de digitação e inconsistências nos dados

