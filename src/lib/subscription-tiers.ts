export type SubscriptionTier = 'free' | 'standard' | 'premium';
export type ProducerTier = 'produtor_anual' | 'produtor_semestral' | 'produtor_avulso';

export interface TierInfo {
  name: string;
  price: number;
  planId?: string; // Mercado Pago plan ID for subscriptions
  description: string;
  features: string[];
  highlighted?: boolean;
}

export interface ProducerTierInfo {
  name: string;
  price: number;
  tier: ProducerTier; // Used as key for checkout
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
    planId: 'bb8d14e00c0a4dbba6cad6128b6b485e',
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
    planId: '05fed28083034eada6865427fc70fe96',
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
    tier: 'produtor_anual',
    description: 'Para produtores frequentes',
    features: [
      '10 uploads por ano',
      'Até 6GB por arquivo',
      'Suporte prioritário',
      'Destaque no catálogo',
    ],
    uploadsAllowed: 10,
    validityMonths: 12,
    maxFileSizeGB: 6,
    paymentMode: 'payment',
    highlighted: true,
  },
  produtor_semestral: {
    name: 'Produtor Semestral',
    price: 179.90,
    tier: 'produtor_semestral',
    description: 'Ideal para projetos pontuais',
    features: [
      '5 uploads por semestre',
      'Até 6GB por arquivo',
      'Suporte padrão',
    ],
    uploadsAllowed: 5,
    validityMonths: 6,
    maxFileSizeGB: 6,
    paymentMode: 'payment',
  },
  produtor_avulso: {
    name: 'Upload Avulso',
    price: 49.90,
    tier: 'produtor_avulso',
    description: 'Para um único upload',
    features: [
      '1 upload',
      'Até 6GB por arquivo',
      'Válido por 30 dias',
    ],
    uploadsAllowed: 1,
    validityMonths: 1,
    maxFileSizeGB: 6,
    paymentMode: 'payment',
  },
};

export function getTierByPlanId(planId: string | null): SubscriptionTier {
  if (!planId) return 'free';
  
  for (const [tier, info] of Object.entries(SUBSCRIPTION_TIERS)) {
    if (info.planId === planId) {
      return tier as SubscriptionTier;
    }
  }
  
  return 'free';
}

export function getProducerTierInfo(tier: ProducerTier): ProducerTierInfo {
  return PRODUCER_TIERS[tier];
}
