# Auth apenas com e-mail e senha

Manter só o login nativo do backend (Supabase Auth) e remover o acesso via Google.

## O que muda

- Remoção do botão "Continuar com Google" e do divisor "ou" na tela de login/cadastro (`src/pages/Auth.tsx`), junto com o estado e o tratamento de erro específicos desse fluxo.
- Desativação do provedor Google na configuração de autenticação do backend, para que ninguém consiga iniciar o fluxo por URL direta.
- O restante do fluxo continua igual: cadastro e login por e-mail/senha, criação automática de perfil e papel (viewer/producer) e o redirecionamento para a página que o usuário tentou acessar.

## O que não muda

- Contas já existentes continuam funcionando. Quem entrou antes com Google mantém o cadastro no backend com o mesmo e-mail; para voltar a acessar, precisará usar "esqueci minha senha" e definir uma senha.
- Perfis, papéis, assinaturas e permissões permanecem intactos.

## Detalhes técnicos

- `src/pages/Auth.tsx`: remover o bloco OAuth (botão, `isGoogleLoading`, chamada `lovable.auth.signInWithOAuth`) mantendo a lógica de `sessionStorage` do destino pós-login.
- Backend: desabilitar o provedor Google via configuração de social auth.
- O helper `src/integrations/lovable/index.ts` fica como está (não é usado por mais nada no login).
