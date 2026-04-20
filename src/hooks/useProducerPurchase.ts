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
  // Uploads ilimitados — stub que sempre permite envio.
  const purchaseInfo: ProducerPurchaseInfo = {
    hasActivePurchase: true,
    uploadsRemaining: Number.POSITIVE_INFINITY,
    tier: null,
    expiresAt: null,
    purchaseId: null,
  };

  const checkPurchase = useCallback(async () => {
    /* no-op */
  }, []);

  const recordUpload = useCallback(async (_movieId: string): Promise<boolean> => {
    return true;
  }, []);

  return {
    purchaseInfo,
    isLoading: false,
    error: null as string | null,
    checkPurchase,
    recordUpload,
  };
}
