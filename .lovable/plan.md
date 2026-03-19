

## Plano: Adicionar seletor de tier e gênero "Ação" no fluxo de upload

### Problema 1: Sem seletor de nível de acesso (min_tier) no upload do produtor

O formulário do produtor (`src/pages/producer/UploadMovie.tsx`) não tem o campo para escolher qual tipo de assinatura pode assistir ao conteúdo. Ele sempre salva como `free`. O admin tem esse campo, mas o produtor não.

### Problema 2: Gênero "Ação" não existe no banco de dados

Os gêneros atuais na categoria `geral` são: Animação, Aventura, Comédia, Documentário, Drama, Ficção Científica, Romance, Suspense, Terror. Falta **Ação**.

### Solução

#### 1. Inserir gênero "Ação" no banco de dados

Usar o insert tool para adicionar:
```sql
INSERT INTO genres (name, slug, category) VALUES ('Ação', 'acao', 'geral');
```

#### 2. Adicionar seção "Nível de Acesso" no formulário do produtor

No arquivo `src/pages/producer/UploadMovie.tsx`, adicionar uma seção entre "Gêneros" e "Mídia" com um `Select` para `min_tier`:

- Opções: Grátis / Standard / Premium
- Quando série existente selecionada: campo desabilitado (herdado)
- Mesmo padrão visual usado no admin (`MovieForm.tsx`)

### Arquivos a editar

1. **Banco de dados** — INSERT do gênero "Ação"
2. **`src/pages/producer/UploadMovie.tsx`** — adicionar seletor de `min_tier` com label "Quem pode assistir?"

