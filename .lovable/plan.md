

# Plano: Renomear para Manivela Filmes + Corrigir imagem no Google

## O que vai mudar

1. **Nome do site**: "TakePlay" sera substituido por "Manivela Filmes" em todo o projeto
2. **Favicon**: O icone da aba do navegador passara a mostrar a letra "M" (em vez do "T")
3. **Imagem do Google (og:image)**: As meta tags og:image e twitter:image apontam atualmente para `https://lovable.dev/opengraph-image-p98pqg.png` (logo da Lovable). Serao atualizadas para uma imagem propria. Como ainda nao ha logo definitiva, sera gerado um og:image placeholder com a letra "M" via SVG inline

**Nota importante**: Apos publicar, o Google pode levar dias ou semanas para atualizar a imagem nos resultados de busca. Voce pode acelerar isso usando o [Google Search Console](https://search.google.com/search-console) para solicitar re-indexacao.

## Arquivos que serao alterados

### 1. `index.html`
- Titulo: "Manivela Filmes - Streaming de Cinema Independente"
- Favicon: SVG com letra "M"
- Meta tags: description, author, keywords, og:title, og:description, og:image, twitter:site, twitter:image

### 2. `src/components/layout/Header.tsx`
- Logo no cabecalho: "Manivela" + "Filmes" (com "Filmes" na cor primaria)
- Letra "M" no icone quadrado

### 3. `src/pages/Auth.tsx`
- Logo na tela de login/cadastro

### 4. `src/pages/ResetPassword.tsx`
- Logo na tela de redefinir senha

### 5. `src/pages/Index.tsx`, `Browse.tsx`, `Search.tsx`, `Genres.tsx`, `MovieDetail.tsx`
- Titulos SEO: "IndieFlix" substituido por "Manivela Filmes"

### 6. `src/pages/producer/Pricing.tsx`
- Texto "TakePlay" e email de suporte

### 7. Edge Functions (fallback origin)
- `create-checkout/index.ts`, `create-producer-checkout/index.ts`, `customer-portal/index.ts`
- URL de fallback permanece `takeplay.lovable.app` (nao muda ate ter dominio proprio)

## Detalhes Tecnicos

### Favicon (SVG inline no index.html)
```html
<link rel="icon" href="data:image/svg+xml,<svg xmlns='...'><rect fill='%23F97316' .../><text ...>M</text></svg>">
```

### og:image
Como nao ha logo definitiva, sera usada uma imagem SVG inline como data URI para og:image temporariamente. Quando voce tiver a logo pronta, basta enviar a imagem aqui e eu atualizo.

### Branding no Header
```
[M] Manivela Filmes
```
O icone quadrado tera a letra "M" e o texto sera "Manivela" + "Filmes" (com "Filmes" na cor laranja/primaria).

