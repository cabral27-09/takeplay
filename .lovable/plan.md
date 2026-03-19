

## Plano: Adicionar campo "Produtora" visível no formulário de série

### Problema
O campo `producer_name` é preenchido automaticamente com o nome do perfil do usuário, mas não aparece visualmente no formulário. O usuário quer poder ver e editar quem é a produtora ao criar uma série.

### Solução
Adicionar um campo de texto "Produtora" na seção "Informações Básicas" do `src/pages/producer/UploadMovie.tsx`, pré-preenchido com o nome do perfil mas editável.

### Alteração

**Arquivo:** `src/pages/producer/UploadMovie.tsx`

Na seção "Informações Básicas" (após o campo de Ano de Produção, ~linha 696), adicionar:

```
<div className="space-y-2">
  <Label htmlFor="producer_name">Produtora *</Label>
  <Input
    id="producer_name"
    value={formData.producer_name}
    onChange={(e) => setFormData(prev => ({ ...prev, producer_name: e.target.value }))}
    placeholder="Nome da produtora ou produtor"
    required
  />
</div>
```

O campo aparecerá para todos os tipos de conteúdo (filme, série, espetáculo) quando não estiver no modo de adicionar episódio a série existente (já que nesse caso herda da série pai).

