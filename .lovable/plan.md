

## Plano: Corrigir fluxo de criação de série no Admin (MovieForm)

### Problema
O formulário admin (`/admin/movies/new`) não distingue entre "criar série pai" e "adicionar episódio". O VideoUploader sempre aparece, o botão sempre diz "Criar Filme", e não há campos específicos para episódios.

### Fluxo desejado

**Etapa 1 — Criar a Série (registro pai, sem vídeo):**
- Título da série
- Sinopse da série
- Quantidade de temporadas
- Episódios por temporada
- Gênero
- Tipo de assinatura (tier)
- Faixa etária
- Ano de gravação
- Produtora
- Capa da série (thumbnail)

**Etapa 2 — Adicionar episódio (vinculado a série existente):**
- Selecionar série
- Título do episódio
- Sinopse do episódio
- Duração do episódio
- Temporada e número do episódio
- Capa do episódio
- Upload do vídeo

### Alterações em `src/pages/admin/MovieForm.tsx`

1. **Adicionar variável `isCreatingSeriesParent`**: `content_type === 'serie' && !formData.series_id && !isEditing` — indica que está criando a série pai.

2. **Esconder VideoUploader quando criando série pai**: A série pai não precisa de vídeo. Envolver o bloco do VideoUploader (~linha 582-594) com `{!isCreatingSeriesParent && (...)}`.

3. **Mostrar campos de episódio quando `series_id` está selecionado**: Adicionar campos de título do episódio, sinopse do episódio, duração do episódio e capa do episódio (similar ao que o producer form já faz com `episodeTitle`, `episodeDuration`, `episodeThumbnail`). Esses campos aparecem apenas quando `formData.series_id` está preenchido.

4. **Atualizar texto do botão submit** (~linha 686): Trocar "Criar Filme" por texto dinâmico:
   - "Criar Série" quando `isCreatingSeriesParent`
   - "Adicionar Episódio" quando `formData.series_id` existe
   - "Criar Espetáculo" / "Criar Filme" conforme `content_type`

5. **Ajustar `handleSubmit`**: Quando `isCreatingSeriesParent`, setar `video_url: ''` e validar apenas campos obrigatórios da série. Quando adicionando episódio, validar vídeo e campos do episódio, e usar o título/sinopse/duração/capa do episódio no submit.

6. **Adicionar estados para episódio**: `episodeTitle`, `episodeSynopsis`, `episodeDuration`, `episodeThumbnail` — campos independentes do formulário pai, usados só quando vinculando a série.

7. **Atualizar toasts/mensagens**: "Série criada" / "Episódio adicionado" em vez de "Filme criado".

### Arquivo a editar
- `src/pages/admin/MovieForm.tsx`

