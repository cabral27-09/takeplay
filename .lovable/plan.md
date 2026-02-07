

# Plano: Completar Auto-Preenchimento de Todos os Campos da Série

## Situação Atual

Quando o produtor seleciona uma série existente, o sistema já preenche automaticamente **alguns** campos:
- ✅ `series_id` 
- ✅ `title`
- ✅ `synopsis`
- ✅ `thumbnail_url`
- ✅ `backdrop_url`
- ✅ `genre_ids`
- ✅ `age_rating`
- ✅ `language`
- ✅ `total_seasons`
- ✅ `total_episodes`
- ✅ `year`
- ✅ `min_tier`

## Campos Faltando

Precisamos adicionar no auto-preenchimento:
- ❌ `duration` - Duração (herdada da série)
- ❌ `rating` - Avaliação
- ❌ `trailer_url` - URL do trailer
- ❌ `producer_type` - Tipo de produtor (individual, estúdio, etc.)

---

## Alteração Necessária

### Arquivo: `src/pages/producer/UploadMovie.tsx`

Modificar o `useEffect` de auto-preenchimento (linhas 100-118) para incluir **todos** os campos da série pai:

```typescript
// Auto-fill form when selecting an existing series
useEffect(() => {
  if (selectedSeriesData && seriesMode === 'existing') {
    setFormData(prev => ({
      ...prev,
      // Identificação
      series_id: selectedSeriesData.id,
      title: selectedSeriesData.title,
      
      // Detalhes
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
      genre_ids: selectedSeriesData.genres.map(g => g.id),
      
      // Estrutura da série
      total_seasons: selectedSeriesData.total_seasons || null,
      total_episodes: selectedSeriesData.total_episodes || null,
      
      // Tier e produtor
      min_tier: selectedSeriesData.min_tier || 'free',
      producer_type: selectedSeriesData.producer_type || 'individual',
    }));
  }
}, [selectedSeriesData, seriesMode]);
```

---

## Campos que Ficam para o Produtor Preencher

Quando série existente é selecionada, o produtor só precisa informar:

| Campo | Descrição |
|-------|-----------|
| `season_number` | Qual temporada é este episódio |
| `current_episode` | Qual é o número do episódio |
| `video_url` | Upload do vídeo do episódio |

Todos os outros campos são herdados automaticamente da série pai.

---

## Resultado Esperado

```text
Produtor seleciona "Série Existente: Breaking Bad"
           │
           ▼
┌──────────────────────────────────────────────────────────────┐
│ ✓ PREENCHIDO AUTOMATICAMENTE:                                │
│                                                              │
│   Título: Breaking Bad                                       │
│   Sinopse: Um professor de química...                        │
│   Gêneros: Drama, Suspense, Crime                            │
│   Classificação: 16 anos                                     │
│   Idioma: Português                                          │
│   Ano: 2008                                                  │
│   Duração: 45 min (por episódio)                             │
│   Thumbnail: [imagem da série]                               │
│   Banner: [banner da série]                                  │
│   Trailer: https://youtube.com/...                           │
│   Tier: Premium                                              │
│                                                              │
├──────────────────────────────────────────────────────────────┤
│ PRODUTOR PRECISA INFORMAR:                                   │
│                                                              │
│   Qual temporada? [ 3 ]                                      │
│   Qual episódio?  [ 5 ]                                      │
│   Vídeo: [UPLOAD AQUI]                                       │
│                                                              │
└──────────────────────────────────────────────────────────────┘
```

