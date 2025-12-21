import { Check } from 'lucide-react';
import { motion } from 'framer-motion';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { TierInfo, SubscriptionTier } from '@/lib/subscription-tiers';

interface PricingCardProps {
  tier: SubscriptionTier;
  info: TierInfo;
  currentTier: SubscriptionTier;
  isLoading: boolean;
  onSubscribe: (priceId: string) => void;
  onManage: () => void;
  isLoggedIn: boolean;
  onLogin: () => void;
}

export function PricingCard({
  tier,
  info,
  currentTier,
  isLoading,
  onSubscribe,
  onManage,
  isLoggedIn,
  onLogin,
}: PricingCardProps) {
  const isCurrentPlan = currentTier === tier;
  const canUpgrade = tier !== 'free' && !isCurrentPlan;
  const isFree = tier === 'free';

  const handleAction = () => {
    if (!isLoggedIn) {
      onLogin();
      return;
    }
    
    if (isCurrentPlan && !isFree) {
      onManage();
      return;
    }
    
    if (canUpgrade && info.priceId) {
      onSubscribe(info.priceId);
    }
  };

  const getButtonText = () => {
    if (!isLoggedIn) {
      return isFree ? 'Criar Conta Grátis' : 'Entrar para Assinar';
    }
    if (isCurrentPlan) {
      return isFree ? 'Seu Plano Atual' : 'Gerenciar Assinatura';
    }
    return 'Assinar Agora';
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className={cn(
        'relative flex flex-col rounded-2xl border p-6 md:p-8',
        info.highlighted
          ? 'border-primary bg-primary/5 shadow-lg shadow-primary/20'
          : 'border-border bg-card'
      )}
    >
      {/* Popular Badge */}
      {info.highlighted && (
        <div className="absolute -top-3 left-1/2 -translate-x-1/2">
          <span className="bg-primary text-primary-foreground text-xs font-semibold px-3 py-1 rounded-full">
            Mais Popular
          </span>
        </div>
      )}

      {/* Current Plan Badge */}
      {isCurrentPlan && !isFree && (
        <div className="absolute -top-3 right-4">
          <span className="bg-accent text-accent-foreground text-xs font-semibold px-3 py-1 rounded-full">
            Seu Plano
          </span>
        </div>
      )}

      {/* Header */}
      <div className="mb-6">
        <h3 className="text-xl font-bold text-foreground">{info.name}</h3>
        <p className="text-sm text-muted-foreground mt-1">{info.description}</p>
      </div>

      {/* Price */}
      <div className="mb-6">
        <div className="flex items-baseline gap-1">
          <span className="text-4xl font-bold text-foreground">
            R$ {info.price.toFixed(2).replace('.', ',')}
          </span>
          {!isFree && (
            <span className="text-muted-foreground">/mês</span>
          )}
        </div>
      </div>

      {/* Features */}
      <ul className="flex-1 space-y-3 mb-8">
        {info.features.map((feature) => (
          <li key={feature} className="flex items-start gap-3">
            <Check className="h-5 w-5 text-primary shrink-0 mt-0.5" />
            <span className="text-sm text-muted-foreground">{feature}</span>
          </li>
        ))}
      </ul>

      {/* Action Button */}
      <Button
        onClick={handleAction}
        disabled={isLoading || (isCurrentPlan && isFree)}
        variant={info.highlighted ? 'default' : 'outline'}
        className="w-full"
        size="lg"
      >
        {isLoading ? 'Carregando...' : getButtonText()}
      </Button>
    </motion.div>
  );
}
