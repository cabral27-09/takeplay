export type SubscriptionTier = 'free' | 'standard' | 'premium';

export interface TierInfo {
  name: string;
  price: number;
  priceId?: string;
  productId?: string;
  description: string;
  features: string[];
  highlighted?: boolean;
}

export const SUBSCRIPTION_TIERS: Record<SubscriptionTier, TierInfo> = {
  free: {
    name: 'Grátis',
    price: 0,
    description: 'Perfeito para começar',
    features: [
      'Acesso a trailers',
      'Preview de 1 minuto dos filmes',
      'Catálogo limitado',
    ],
  },
  standard: {
    name: 'Standard',
    price: 14.90,
    priceId: 'price_1SgropPvii9Jy2jp47594iKt',
    productId: 'prod_TeA9bWQ6uNkcqt',
    description: 'Para quem quer mais',
    features: [
      'Tudo do plano Grátis',
      'Catálogo básico de filmes',
      'Qualidade HD',
      'Assista em 1 dispositivo',
    ],
  },
  premium: {
    name: 'Premium',
    price: 19.90,
    priceId: 'price_1SgrJePvii9Jy2jpmAlTLCV1',
    productId: 'prod_Te9cKVqbpz8YnY',
    description: 'A experiência completa',
    features: [
      'Tudo do plano Standard',
      'Catálogo completo',
      'Qualidade 4K HDR',
      'Lançamentos exclusivos',
      'Assista em até 4 dispositivos',
    ],
    highlighted: true,
  },
};

export function getTierByProductId(productId: string | null): SubscriptionTier {
  if (!productId) return 'free';
  
  for (const [tier, info] of Object.entries(SUBSCRIPTION_TIERS)) {
    if (info.productId === productId) {
      return tier as SubscriptionTier;
    }
  }
  
  return 'free';
}
