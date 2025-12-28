import { useAuth } from "@/contexts/AuthContext";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Lock, Crown, Sparkles } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useState } from "react";
import { toast } from "sonner";

interface SubscriptionGateProps {
  children: React.ReactNode;
  movieTitle?: string;
}

export function SubscriptionGate({ children, movieTitle }: SubscriptionGateProps) {
  const { user, subscription, isLoading } = useAuth();
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

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-cinema-black">
        <div className="animate-pulse text-muted-foreground">Carregando...</div>
      </div>
    );
  }

  // User is subscribed, show the content
  if (subscription.subscribed) {
    return <>{children}</>;
  }

  // Not subscribed, show subscription gate
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
              <span className="text-sm font-medium text-primary">Conteúdo Premium</span>
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
            Assine o TieFlix Premium para ter acesso ilimitado a todos os filmes completos da plataforma.
          </p>

          {/* Features */}
          <div className="grid gap-3 mb-8 text-left">
            {[
              "Acesso ilimitado a todos os filmes",
              "Qualidade HD e 4K",
              "Novos lançamentos toda semana",
              "Cancele quando quiser",
            ].map((feature, index) => (
              <div key={index} className="flex items-center gap-3">
                <Sparkles className="h-4 w-4 text-primary flex-shrink-0" />
                <span className="text-sm text-foreground">{feature}</span>
              </div>
            ))}
          </div>

          {/* Price */}
          <div className="mb-6">
            <div className="flex items-baseline justify-center gap-1">
              <span className="text-4xl font-bold text-foreground">R$ 19,90</span>
              <span className="text-muted-foreground">/mês</span>
            </div>
          </div>

          {/* CTA Button */}
          <Button
            onClick={handleSubscribe}
            disabled={isCheckingOut}
            className="w-full h-12 text-lg font-semibold"
            size="lg"
          >
            {isCheckingOut ? "Processando..." : user ? "Assinar Agora" : "Fazer Login para Assinar"}
          </Button>

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
