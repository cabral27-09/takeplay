export type SubscriptionTier = 'free' | 'standard' | 'premium';
export type ProducerTier = 'produtor_anual' | 'produtor_semestral' | 'produtor_avulso';

export interface TierInfo {
  name: string;
  price: number;
  priceId?: string;
  productId?: string;
  description: string;
  features: string[];
  highlighted?: boolean;
}

export interface ProducerTierInfo {
  name: string;
  price: number;
  priceId: string;
  productId: string;
  description: string;
  features: string[];
  uploadsAllowed: number;
  validityMonths: number;
  maxFileSizeGB: number;
  paymentMode: 'payment';
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
    priceId: 'price_1StDcWCeLx1o0X2JEP36pI2f',
    productId: 'prod_TqvTi7txLYbgVK',
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
    priceId: 'price_1StDe5CeLx1o0X2JtcO3fVz2',
    productId: 'prod_TqvVvRzOWJLsmS',
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

export const PRODUCER_TIERS: Record<ProducerTier, ProducerTierInfo> = {
  produtor_anual: {
    name: 'Produtor Anual',
    price: 299.90,
    priceId: 'price_1StDgyCeLx1o0X2J05Ip3ZI0',
    productId: 'prod_TqvYsBxxU64nn2',
    description: 'Para produtores frequentes',
    features: [
      '10 uploads por ano',
      'Até 6GB por arquivo',
      'Suporte prioritário',
      'Destaque no catálogo',
    ],
    uploadsAllowed: 10,
    validityMonths: 12,
    maxFileSizeGB: 5,
    paymentMode: 'payment',
    highlighted: true,
  },
  produtor_semestral: {
    name: 'Produtor Semestral',
    price: 179.90,
    priceId: 'price_1StDjLCeLx1o0X2JiTaGtE8R',
    productId: 'prod_TqvaIP6ov8bnnn',
    description: 'Ideal para projetos pontuais',
    features: [
      '5 uploads por semestre',
      'Até 6GB por arquivo',
      'Suporte padrão',
    ],
    uploadsAllowed: 5,
    validityMonths: 6,
    maxFileSizeGB: 5,
    paymentMode: 'payment',
  },
  produtor_avulso: {
    name: 'Upload Avulso',
    price: 49.90,
    priceId: 'price_1StDkPCeLx1o0X2JR93OuCwW',
    productId: 'prod_Tqvbvoa1mdrqeQ',
    description: 'Para um único upload',
    features: [
      '1 upload',
      'Até 6GB por arquivo',
      'Válido por 30 dias',
    ],
    uploadsAllowed: 1,
    validityMonths: 1,
    maxFileSizeGB: 5,
    paymentMode: 'payment',
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

export function getProducerTierByProductId(productId: string | null): ProducerTier | null {
  if (!productId) return null;
  
  for (const [tier, info] of Object.entries(PRODUCER_TIERS)) {
    if (info.productId === productId) {
      return tier as ProducerTier;
    }
  }
  
  return null;
}

export function getProducerTierInfo(tier: ProducerTier): ProducerTierInfo {
  return PRODUCER_TIERS[tier];
}
