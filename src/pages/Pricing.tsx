import { useState, useEffect, useRef } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Layout } from '@/components/layout/Layout';
import { PricingCard } from '@/components/pricing/PricingCard';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { SUBSCRIPTION_TIERS, SubscriptionTier } from '@/lib/subscription-tiers';
import { toast } from 'sonner';
import { PaymentSuccessModal } from '@/components/subscription/PaymentSuccessModal';

const MAX_SYNC_RETRIES = 10;
const getRetryDelay = (attempt: number) => Math.min(1000 * attempt, 5000); // Progressive: 1s, 2s, 3s... max 5s

export default function Pricing() {
  const [isLoading, setIsLoading] = useState(false);
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);
  const [confirmedTierName, setConfirmedTierName] = useState<string | undefined>(undefined);
  const [searchParams, setSearchParams] = useSearchParams();
  const navigate = useNavigate();
  const { user, subscription, session, checkSubscription } = useAuth();
  const syncAttempted = useRef(false);

  // Handle success redirect from Stripe with retry logic
  useEffect(() => {
    const handleSuccessReturn = async () => {
      if (searchParams.get('success') !== 'true' || syncAttempted.current) return;
      
      syncAttempted.current = true;
      setIsSyncing(true);
      setShowSuccessModal(true);
      
      // Clean up URL immediately
      searchParams.delete('success');
      setSearchParams(searchParams, { replace: true });

      let retries = 0;
      let syncedSubscription = await checkSubscription();

      // Retry with progressive delay if still on 'free' tier (Stripe might not have processed yet)
      while (syncedSubscription.tier === 'free' && retries < MAX_SYNC_RETRIES) {
        retries++;
        const delay = getRetryDelay(retries);
        console.log(`[Pricing] Sync retry ${retries}/${MAX_SYNC_RETRIES} (waiting ${delay}ms)...`);
        await new Promise(resolve => setTimeout(resolve, delay));
        syncedSubscription = await checkSubscription();
      }

      if (syncedSubscription.tier !== 'free') {
        const tierInfo = SUBSCRIPTION_TIERS[syncedSubscription.tier];
        setConfirmedTierName(tierInfo?.name);
        console.log('[Pricing] Subscription synced successfully:', syncedSubscription.tier);
        toast.success(`Plano ${tierInfo?.name || syncedSubscription.tier} ativado!`);
      } else {
        // Fallback if sync failed after retries - still show modal with contact info
        setConfirmedTierName(undefined);
        console.warn('[Pricing] Subscription sync failed after', MAX_SYNC_RETRIES, 'retries');
        toast.warning('Sincronização em andamento. Se o plano não aparecer em alguns minutos, entre em contato conosco.');
      }

      setIsSyncing(false);
    };

    handleSuccessReturn();
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
        // Redirect in same tab for reliable sync on return
        window.location.href = data.url;
      }
    } catch (error) {
      console.error('Checkout error:', error);
      toast.error('Erro ao iniciar checkout. Tente novamente.');
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
        window.location.href = data.url;
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

  return (
    <Layout>
      {/* Payment Success Modal */}
      <PaymentSuccessModal
        isOpen={showSuccessModal}
        onClose={() => setShowSuccessModal(false)}
        tierName={confirmedTierName}
        isLoading={isSyncing}
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
