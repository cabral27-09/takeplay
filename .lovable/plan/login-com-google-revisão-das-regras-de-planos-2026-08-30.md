# Login com Google + revisão das regras de planos

## Situação atual

**Planos de espectador** (`src/lib/subscription-tiers.ts`): Grátis (R$ 0), Standard (R$ 14,90) e Premium (R$ 19,90). Cada filme tem um `min_tier` (`free` / `standard` / `premium`).

**Pacotes de produtor**: Anual R$ 299,90 (10 uploads), Semestral R$ 179,90 (5 uploads), Avulso R$ 49,90 (1 upload). Estão definidos, mas o código que controla o limite (`useProducerPurchase`) está desativado — hoje qualquer produtor sobe uploads ilimitados.

**Regras de acesso hoje** (`SubscriptionGate`):
- Deslogado + filme grátis: preview de 1 minuto
- Deslogado + filme pago: bloqueado, tela de login/assinatura
- Logado + filme grátis: acesso completo
- Logado + assinatura de nível igual ou maior que o filme: acesso completo
- Logado sem assinatura suficiente: preview de 1 minuto

**Papéis**: `viewer`, `producer`, `admin`, definidos no cadastro (só viewer/producer são auto-atribuíveis) e liberação manual de assinatura via `admin_subscriptions`.

## O que será feito

### 1. Entrar com Google
- Ativar o provedor Google gerenciado pelo Lovable Cloud (sem precisar de credenciais suas).
- Adicionar botão "Continuar com Google" na tela de login e na de cadastro, mantendo e-mail/senha funcionando normalmente.
- Usuários que entram pelo Google recebem o papel `viewer` automaticamente; produtor continua sendo concedido pelo admin.
- Nome e foto do Google passam a preencher o perfil.

### 2. Correções de sessão que hoje causam problemas
- Após promover alguém a Premium, o app só reconhece na próxima visita. Será adicionada uma revalidação da assinatura ao abrir uma página de filme, para o acesso liberar na hora.
- Tratamento de retorno do Google preservando a página que o usuário tentava acessar.

### 3. Regras de negócio dos planos
Sem instruções específicas suas, mantenho a estrutura atual de três níveis e apenas deixo o comportamento coerente:
- Grátis, Standard e Premium seguem com os mesmos preços e hierarquia.
- Preview de 1 minuto permanece o único acesso parcial; trailers seguem públicos.
- Pacotes de produtor continuam desativados (uploads livres para quem tem papel de produtor), como está hoje. Se quiser reativar a cobrança de uploads, me diga e eu incluo.

Se algum desses pontos não for o que você quer (por exemplo, remover o Standard, mudar preços, ou voltar a limitar uploads de produtor), é só apontar antes de aprovar.

## Detalhes técnicos

- `supabase--configure_social_auth` com `providers: ["google"]`, mantendo e-mail habilitado.
- `lovable.auth.signInWithOAuth("google", { redirect_uri: window.location.origin })` a partir de `src/pages/Auth.tsx`; destino pretendido guardado separadamente e aplicado só após a sessão hidratar.
- `handle_new_user()` já lê `full_name`/`name` e `avatar_url`/`picture` do metadata — sem migração necessária.
- `SubscriptionGate` chama `checkSubscription()` no mount quando o usuário está logado e não tem assinatura em cache.

## Fora do escopo

Servidor OAuth para clientes externos (ChatGPT, Zapier etc.) não será implementado — o pedido foi interpretado como login social no site. Se você quiser expor a API para apps externos, isso é um segundo plano.
