

# Plano: Auto-preenchimento de Dados da Série no Upload de Episódios

## Problema Atual

Quando o produtor vai subir um episódio de uma série já existente, ele precisa preencher **todos os dados novamente**:
- Gêneros (Drama, Ficção, Aventura...)
- Sinopse
- Thumbnail/Capa
- Backdrop/Banner
- Classificação etária
- Idioma
- Etc.

Isso é redundante porque esses dados já existem na série pai.

## Solução

Quando o produtor selecionar uma série existente para vincular o episódio:

1. **Buscar automaticamente os dados da série pai**
2. **Preencher o formulário** com esses dados
3. **Mostrar apenas os campos que mudam** (temporada e episódio)
4. **Bloquear edição** dos campos herdados (ou mostrar como read-only)

---

## Arquivos a Modificar

| Arquivo | Alteração |
|---------|-----------|
| `src/pages/producer/UploadMovie.tsx` | Adicionar seleção de série existente e auto-preenchimento |
| `src/hooks/useSeriesEpisodes.ts` | Adicionar hook para buscar dados completos da série pai |

---

## Detalhes da Implementação

### 1. Novo Hook: `useSeriesParent`

Buscar todos os dados da série pai (incluindo gêneros) para preencher o formulário:

```typescript
// useSeriesEpisodes.ts - Novo hook
export function useSeriesParent(seriesId: string | undefined) {
  return useQuery({
    queryKey: ['series-parent', seriesId],
    queryFn: async (): Promise<MovieWithGenres | null> => {
      // Busca a série pai com todos os dados + gêneros
    },
    enabled: !!seriesId,
  });
}
```

### 2. Modificar Formulário do Produtor

**Adicionar seletor de série existente:**
```text
┌────────────────────────────────────────────────────────────┐
│  Tipo de Conteúdo: Série                                   │
├────────────────────────────────────────────────────────────┤
│                                                            │
│  ○ Criar nova série                                        │
│    (Preciso preencher todos os dados)                      │
│                                                            │
│  ● Adicionar episódio a série existente                    │
│    [▼ Selecione a série                           ]        │
│                                                            │
│    ┌─ Dados da Série (herdados automaticamente) ─────────┐ │
│    │ Título: Minha Série                                 │ │
│    │ Gêneros: Drama, Suspense                            │ │
│    │ Classificação: 14 anos                              │ │
│    │ (Esses dados serão usados automaticamente)          │ │
│    └─────────────────────────────────────────────────────┘ │
│                                                            │
│    Temporada: [ 2  ]  Episódio: [ 5  ]                     │
│                                                            │
└────────────────────────────────────────────────────────────┘
```

**Quando série selecionada, preencher automaticamente:**
- `title` → Título da série + " - S01E05" (opcional, para identificação)
- `synopsis` → Mesma sinopse da série
- `thumbnail_url` → Mesma capa da série
- `backdrop_url` → Mesmo banner da série
- `genre_ids` → Mesmos gêneros da série
- `age_rating` → Mesma classificação
- `language` → Mesmo idioma
- `total_seasons` → Herdado da série
- `total_episodes` → Herdado da série

**Campos que o produtor precisa informar:**
- Número da temporada
- Número do episódio
- Vídeo do episódio (obrigatório)
- Título do episódio (opcional, ex: "O Começo")

### 3. Lógica de Preenchimento

Quando o produtor seleciona uma série:

```typescript
// Ao selecionar série
useEffect(() => {
  if (selectedSeriesData) {
    setFormData(prev => ({
      ...prev,
      series_id: selectedSeriesData.id,
      synopsis: selectedSeriesData.synopsis || '',
      thumbnail_url: selectedSeriesData.thumbnail_url || '',
      backdrop_url: selectedSeriesData.backdrop_url || '',
      genre_ids: selectedSeriesData.genres.map(g => g.id),
      age_rating: selectedSeriesData.age_rating || 'L',
      language: selectedSeriesData.language || 'portugues',
      total_seasons: selectedSeriesData.total_seasons || null,
      total_episodes: selectedSeriesData.total_episodes || null,
      // Título pode ser editado, mas começa com o nome da série
      title: selectedSeriesData.title,
    }));
  }
}, [selectedSeriesData]);
```

---

## Fluxo Visual Completo

```text
Produtor seleciona "Série"
           │
           ▼
┌──────────────────────────────────────┐
│ É uma série nova ou já existente?    │
├──────────────────────────────────────┤
│ ○ Nova série (preencher tudo)        │
│ ● Série existente (herdar dados)     │
└──────────────────────────────────────┘
           │
           ▼ (Seleciona série existente)
           
┌──────────────────────────────────────┐
│ Série: "Breaking Bad"                │
│                                      │
│ ✓ Gêneros herdados: Drama, Suspense  │
│ ✓ Classificação: 16 anos             │
│ ✓ Idioma: Português                  │
│ ✓ Thumbnail/Banner: [preview]        │
│                                      │
│ ─────────────────────────────────────│
│                                      │
│ Qual temporada? [ 3  ]               │
│ Qual episódio?  [ 1  ]               │
│                                      │
│ Título do episódio (opcional):       │
│ [ No Thirty-Eight Snub             ] │
│                                      │
│ Vídeo do episódio: [UPLOAD VIDEO]    │
│                                      │
└──────────────────────────────────────┘
```

---

## Resultado Esperado

1. Produtor não precisa preencher dados repetidos ao subir episódios
2. Gêneros, sinopse, thumbnail, etc. são herdados automaticamente
3. Produtor só preenche: temporada, episódio e o vídeo
4. Interface mais rápida e sem erros de inconsistência entre episódios

