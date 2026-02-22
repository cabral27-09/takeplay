

# Plano: Atualizar cor da marca para #F0BF4C

## Resumo

Trocar a cor do favicon (letra M) e do logo no header/login de laranja (#F97316) para dourado (#F0BF4C).

## Arquivos a alterar

### 1. `index.html`
- Favicon SVG: trocar `%23F97316` por `%23F0BF4C` no fundo do retangulo

### 2. `public/og-image.png`
- Regerar a imagem og-image com a cor #F0BF4C

### 3. `src/components/layout/Header.tsx`
- Icone quadrado do logo: trocar `bg-primary` por `bg-[#F0BF4C]` (ou manter bg-primary se atualizarmos a variavel CSS)

### 4. `src/pages/Auth.tsx`
- Mesmo ajuste no icone do logo na tela de login

### 5. `src/pages/ResetPassword.tsx`
- Mesmo ajuste no icone do logo na tela de redefinir senha

### 6. `src/index.css`
- Atualizar a variavel `--primary` de `24 100% 53%` (laranja) para o HSL equivalente de #F0BF4C (~43 84% 62%) para que toda a interface use a nova cor dourada como cor primaria

## Observacao

Ao mudar a variavel `--primary` no CSS, todos os elementos que usam `bg-primary`, `text-primary`, bordas, etc. passarao automaticamente para a nova cor dourada. Isso inclui botoes, badges, links ativos e destaques em todo o site.

