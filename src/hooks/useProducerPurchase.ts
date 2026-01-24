import { useState, useCallback, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { ProducerTier } from '@/lib/subscription-tiers';

export interface ProducerPurchaseInfo {
  hasActivePurchase: boolean;
  uploadsRemaining: number;
  tier: ProducerTier | null;
  expiresAt: string | null;
  purchaseId: string | null;
}

export function useProducerPurchase() {
  const { user, hasRole } = useAuth();
  const [purchaseInfo, setPurchaseInfo] = useState<ProducerPurchaseInfo>({
    hasActivePurchase: false,
    uploadsRemaining: 0,
    tier: null,
    expiresAt: null,
    purchaseId: null,
  });
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const checkPurchase = useCallback(async () => {
    if (!user || !hasRole('producer')) {
      setPurchaseInfo({
        hasActivePurchase: false,
        uploadsRemaining: 0,
        tier: null,
        expiresAt: null,
        purchaseId: null,
      });
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        throw new Error('No active session');
      }

      const { data, error: fnError } = await supabase.functions.invoke('check-producer-purchase', {
        headers: {
          Authorization: `Bearer ${session.access_token}`,
        },
      });

      if (fnError) {
        throw new Error(fnError.message);
      }

      setPurchaseInfo({
        hasActivePurchase: data.hasActivePurchase ?? false,
        uploadsRemaining: data.uploadsRemaining ?? 0,
        tier: data.tier ?? null,
        expiresAt: data.expiresAt ?? null,
        purchaseId: data.purchaseId ?? null,
      });
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to check purchase';
      setError(message);
      console.error('Error checking producer purchase:', err);
    } finally {
      setIsLoading(false);
    }
  }, [user, hasRole]);

  const recordUpload = useCallback(async (movieId: string): Promise<boolean> => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        throw new Error('No active session');
      }

      const { data, error: fnError } = await supabase.functions.invoke('record-producer-upload', {
        headers: {
          Authorization: `Bearer ${session.access_token}`,
        },
        body: { movieId },
      });

      if (fnError) {
        throw new Error(fnError.message);
      }

      // Update local state
      setPurchaseInfo(prev => ({
        ...prev,
        uploadsRemaining: data.uploadsRemaining ?? prev.uploadsRemaining - 1,
      }));

      return true;
    } catch (err) {
      console.error('Error recording upload:', err);
      return false;
    }
  }, []);

  // Check on mount and when user changes
  useEffect(() => {
    checkPurchase();
  }, [checkPurchase]);

  return {
    purchaseInfo,
    isLoading,
    error,
    checkPurchase,
    recordUpload,
  };
}
