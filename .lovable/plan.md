

# Plano: Adicionar botao de visualizar senha

## Resumo

Adicionar um icone de "olho" ao lado do campo de senha na tela de login/cadastro, permitindo alternar entre mostrar e ocultar a senha digitada.

## Alteracao

**Arquivo:** `src/pages/Auth.tsx`

1. Adicionar estado `showPassword` (boolean, inicialmente `false`)
2. No campo de senha, trocar o `type` de `"password"` fixo para `showPassword ? "text" : "password"`
3. Adicionar um botao com icone `Eye` / `EyeOff` do Lucide dentro do campo de senha (posicionado a direita)
4. Importar os icones `Eye` e `EyeOff` de `lucide-react`

## Detalhes Tecnicos

- Novo estado: `const [showPassword, setShowPassword] = useState(false);`
- O botao sera posicionado com `absolute right-3 top-1/2 -translate-y-1/2` dentro do `div relative` que ja envolve o input de senha
- O input mantera o `pl-10` (icone de cadeado a esquerda) e ganhara `pr-10` para acomodar o botao de visualizar a direita
- O botao tera `type="button"` para nao submeter o formulario ao clicar

