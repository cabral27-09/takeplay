

## Plano: Corrigir sinopse do episódio no fluxo de criação de série

### Problema identificado
Quando o admin seleciona uma série existente para adicionar um episódio:
1. O campo principal "Sinopse" (em "Informações Básicas") fica **desabilitado** e mostra a sinopse da série pai
2. Existe um campo separado "Sinopse do Episódio" na seção "Dados do Episódio", mas ele está acima na tela e pode ser confuso
3. No submit, o código usa `episodeSynopsis` — se o usuário não preencheu esse campo específico, o episódio é salvo com sinopse vazia ou errada

### Solução
Quando estiver adicionando episódio (`isAddingEpisode`):

1. **Esconder o campo principal "Sinopse"** na seção "Informações Básicas" — já que ele é da série e está desabilitado, só confunde
2. **Esconder o campo principal "Título"** também — o título do episódio já está na seção de episódio
3. **Esconder "Duração"** principal — a duração do episódio já tem campo próprio
4. Manter visíveis apenas os campos herdados que fazem sentido como referência (ano, classificação etária, idioma)
5. Garantir que a seção "Dados do Episódio" fique bem visível e clara

### Alterações em `src/pages/admin/MovieForm.tsx`

- Linhas ~492-518: Envolver título e sinopse principais com `{!isAddingEpisode && (...)}` para escondê-los quando adicionando episódio
- Linhas ~534-546: Esconder duração principal quando `isAddingEpisode`  
- Isso elimina a confusão — o usuário só vê os campos do episódio (título, sinopse, duração, capa) na seção dedicada

### Arquivo a editar
- `src/pages/admin/MovieForm.tsx`

