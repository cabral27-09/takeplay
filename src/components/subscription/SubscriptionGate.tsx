import { useAuth } from "@/contexts/AuthContext";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Lock, Crown, Sparkles } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { SUBSCRIPTION_TIERS } from "@/lib/subscription-tiers";
import { useState } from "react";
import { toast } from "sonner";

type MovieTier = 'free' | 'standard' | 'premium';
type AccessType = 'full' | 'preview' | 'blocked';

interface SubscriptionGateProps {
  children: React.ReactNode | ((previewMode: boolean) => React.ReactNode);
  movieTitle?: string;
  movieTier?: MovieTier;
}

// Tier hierarchy for comparison
const TIER_LEVELS: Record<MovieTier, number> = {
  free: 0,
  standard: 1,
  premium: 2,
};

export function SubscriptionGate({ children, movieTitle, movieTier = 'premium' }: SubscriptionGateProps) {
  const { user, subscription, isLoading, isSubscriptionLoading } = useAuth();
  const navigate = useNavigate();
  const [isCheckingOut, setIsCheckingOut] = useState(false);

  const handleSubscribe = async () => {
    if (!user) {
      navigate("/auth");
      return;
    }

    setIsCheckingOut(true);
    try {
      const {
        data: { session },
      } = await supabase.auth.getSession();
      if (!session) {
        navigate("/auth");
        return;
      }

      const { data, error } = await supabase.functions.invoke("create-checkout", {
        headers: {
          Authorization: `Bearer ${session.access_token}`,
        },
      });

      if (error) {
        toast.error("Erro ao iniciar checkout");
        console.error("Checkout error:", error);
        return;
      }

      if (data?.url) {
        window.open(data.url, "_blank");
      }
    } catch (error) {
      toast.error("Erro ao processar assinatura");
      console.error("Subscription error:", error);
    } finally {
      setIsCheckingOut(false);
    }
  };

  // Determine access type based on user status, subscription, and movie tier
  const getAccessType = (): AccessType => {
    const movieLevel = TIER_LEVELS[movieTier];
    
    console.log('[SubscriptionGate] Access check:', {
      movieTier,
      movieLevel,
      userEmail: user?.email,
      subscribed: subscription.subscribed,
      subscriptionTier: subscription.tier,
    });
    
    // User not logged in
    if (!user) {
      // Logged out + Free movie = preview (1 min)
      if (movieLevel === 0) {
        console.log('[SubscriptionGate] Result: preview (logged out + free movie)');
        return 'preview';
      }
      // Logged out + Standard/Premium movie = blocked
      console.log('[SubscriptionGate] Result: blocked (logged out + paid movie)');
      return 'blocked';
    }
    
    // User is logged in
    // Logged in + Free movie = full access
    if (movieLevel === 0) {
      console.log('[SubscriptionGate] Result: full (logged in + free movie)');
      return 'full';
    }
    
    // Logged in with subscription
    if (subscription.subscribed) {
      const userTierLevel = TIER_LEVELS[subscription.tier || 'free'];
      // User's tier >= movie's tier = full access
      if (userTierLevel >= movieLevel) {
        console.log('[SubscriptionGate] Result: full (subscribed + sufficient tier)');
        return 'full';
      }
      // User's tier < movie's tier = preview (1 min)
      console.log('[SubscriptionGate] Result: preview (subscribed but lower tier)');
      return 'preview';
    }
    
    // Logged in without subscription + Standard/Premium movie = preview (1 min)
    console.log('[SubscriptionGate] Result: preview (logged in, no subscription, paid movie)');
    return 'preview';
  };

  if (isLoading || isSubscriptionLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-cinema-black">
        <div className="animate-pulse text-muted-foreground">Carregando...</div>
      </div>
    );
  }

  const accessType = getAccessType();

  // Full access - show content without restrictions
  if (accessType === 'full') {
    return <>{typeof children === 'function' ? children(false) : children}</>;
  }

  // Preview access - show content with 1 minute limit
  if (accessType === 'preview') {
    return <>{typeof children === 'function' ? children(true) : children}</>;
  }

  // Blocked access - show subscription/login gate
  return (
    <div className="flex min-h-screen items-center justify-center bg-cinema-black p-4">
      <div className="relative max-w-lg w-full">
        {/* Background glow effect */}
        <div className="absolute -inset-1 bg-gradient-to-r from-primary/30 via-accent/30 to-primary/30 rounded-2xl blur-xl opacity-50" />

        <div className="relative bg-card border border-border rounded-2xl p-8 text-center">
          {/* Premium badge */}
          <div className="flex justify-center mb-6">
            <div className="flex items-center gap-2 px-4 py-2 bg-primary/10 rounded-full border border-primary/20">
              <Crown className="h-5 w-5 text-primary" />
              <span className="text-sm font-medium text-primary">Conteúdo Exclusivo</span>
            </div>
          </div>

          {/* Lock icon */}
          <div className="flex justify-center mb-6">
            <div className="p-6 rounded-full bg-secondary">
              <Lock className="h-12 w-12 text-muted-foreground" />
            </div>
          </div>

          {/* Title */}
          <h2 className="text-2xl font-bold text-foreground mb-2">
            {movieTitle ? `Assista "${movieTitle}"` : "Conteúdo Exclusivo"}
          </h2>
          <p className="text-muted-foreground mb-8">
            Este conteúdo requer uma conta. Faça login para acessar filmes gratuitos ou assine para o catálogo completo.
          </p>

          {/* Features */}
          <div className="grid gap-3 mb-8 text-left">
            {[
              "Acesso a filmes gratuitos ao fazer login",
              "Preview de 1 minuto para todos os filmes",
              "Catálogo completo com assinatura",
              "Cancele quando quiser",
            ].map((feature, index) => (
              <div key={index} className="flex items-center gap-3">
                <Sparkles className="h-4 w-4 text-primary flex-shrink-0" />
                <span className="text-sm text-foreground">{feature}</span>
              </div>
            ))}
          </div>

          {/* CTA Buttons */}
          <div className="flex flex-col gap-3">
            <Button
              onClick={() => navigate("/auth")}
              variant="outline"
              className="w-full h-12 text-lg"
              size="lg"
            >
              Fazer Login
            </Button>
            <Button
              onClick={handleSubscribe}
              disabled={isCheckingOut}
              className="w-full h-12 text-lg font-semibold"
              size="lg"
            >
              {isCheckingOut ? "Processando..." : "Assinar Agora"}
            </Button>
          </div>

          {/* Back link */}
          <button
            onClick={() => navigate("/", { replace: true })}
            className="mt-4 text-sm text-muted-foreground hover:text-foreground transition-colors"
          >
            Voltar para o início
          </button>
        </div>
      </div>
    </div>
  );
}
