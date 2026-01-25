import { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Layout } from '@/components/layout/Layout';
import { PricingCard } from '@/components/pricing/PricingCard';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { SUBSCRIPTION_TIERS, SubscriptionTier } from '@/lib/subscription-tiers';
import { toast } from 'sonner';
import { PaymentSuccessModal } from '@/components/subscription/PaymentSuccessModal';

export default function Pricing() {
  const [isLoading, setIsLoading] = useState(false);
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [searchParams, setSearchParams] = useSearchParams();
  const navigate = useNavigate();
  const { user, subscription, session, checkSubscription } = useAuth();

  // Handle success redirect from Stripe
  useEffect(() => {
    if (searchParams.get('success') === 'true') {
      setShowSuccessModal(true);
      checkSubscription(); // Refresh subscription status
      
      // Clean up URL
      searchParams.delete('success');
      setSearchParams(searchParams, { replace: true });
    }
  }, [searchParams, setSearchParams, checkSubscription]);

  const handleSubscribe = async (priceId: string) => {
    if (!session) {
      navigate('/auth');
      return;
    }

    setIsLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('create-checkout', {
        body: { priceId },
        headers: {
          Authorization: `Bearer ${session.access_token}`,
        },
      });

      if (error) throw error;

      if (data?.url) {
        window.open(data.url, '_blank');
      }
    } catch (error) {
      console.error('Checkout error:', error);
      toast.error('Erro ao iniciar checkout. Tente novamente.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleManage = async () => {
    if (!session) return;

    setIsLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('customer-portal', {
        headers: {
          Authorization: `Bearer ${session.access_token}`,
        },
      });

      if (error) throw error;

      if (data?.url) {
        window.open(data.url, '_blank');
      }
    } catch (error) {
      console.error('Portal error:', error);
      toast.error('Erro ao abrir portal. Tente novamente.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleLogin = () => {
    navigate('/auth');
  };

  const currentTier = subscription.tier || 'free';

  const currentTierName = subscription.tier !== 'free' 
    ? SUBSCRIPTION_TIERS[subscription.tier]?.name 
    : undefined;

  return (
    <Layout>
      {/* Payment Success Modal */}
      <PaymentSuccessModal
        isOpen={showSuccessModal}
        onClose={() => setShowSuccessModal(false)}
        tierName={currentTierName}
      />

      <div className="min-h-screen pt-24 pb-16">
        <div className="container max-w-6xl">
          {/* Header */}
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-center mb-12"
          >
            <h1 className="text-4xl md:text-5xl font-bold text-foreground mb-4">
              Escolha seu Plano
            </h1>
            <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
              Assista aos melhores filmes e séries. Cancele quando quiser.
            </p>
          </motion.div>

          {/* Pricing Cards */}
          <div className="grid md:grid-cols-3 gap-6 md:gap-8">
            {(Object.entries(SUBSCRIPTION_TIERS) as [SubscriptionTier, typeof SUBSCRIPTION_TIERS[SubscriptionTier]][]).map(
              ([tier, info], index) => (
                <motion.div
                  key={tier}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.1 }}
                >
                  <PricingCard
                    tier={tier}
                    info={info}
                    currentTier={currentTier}
                    isLoading={isLoading}
                    onSubscribe={handleSubscribe}
                    onManage={handleManage}
                    isLoggedIn={!!user}
                    onLogin={handleLogin}
                  />
                </motion.div>
              )
            )}
          </div>

          {/* Footer Note */}
          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.4 }}
            className="text-center text-sm text-muted-foreground mt-12"
          >
            Todos os planos incluem 7 dias de garantia. Cancele a qualquer momento.
          </motion.p>
        </div>
      </div>
    </Layout>
  );
}
