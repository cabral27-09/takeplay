import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import type { SubscriptionTier } from '@/lib/subscription-tiers';

export interface AdminSubscription {
  id: string;
  user_id: string;
  tier: SubscriptionTier;
  granted_by: string | null;
  reason: string | null;
  expires_at: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface ProducerPurchase {
  id: string;
  user_id: string;
  stripe_payment_intent_id: string;
  product_id: string;
  tier: string;
  uploads_allowed: number;
  uploads_used: number;
  purchased_at: string;
  expires_at: string;
  is_active: boolean;
}

interface SetSubscriptionParams {
  userId: string;
  tier: SubscriptionTier;
  reason?: string;
  expiresAt?: Date | null;
}

interface GrantProducerUploadsParams {
  userId: string;
  uploadsAllowed: number;
  expiresAt?: Date | null;
  reason?: string;
}

export function useAdminSubscriptions() {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const setSubscriptionMutation = useMutation({
    mutationFn: async ({ userId, tier, reason, expiresAt }: SetSubscriptionParams) => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      // Upsert: insert or update if exists
      const { error } = await supabase
        .from('admin_subscriptions')
        .upsert({
          user_id: userId,
          tier,
          granted_by: user.id,
          reason: reason || null,
          expires_at: expiresAt?.toISOString() || null,
          is_active: true,
        }, {
          onConflict: 'user_id'
        });

      if (error) throw error;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['admin-users'] });
      toast({
        title: 'Assinatura atualizada',
        description: `Usuário agora tem acesso ${variables.tier.toUpperCase()}.`,
      });
    },
    onError: (error: Error) => {
      toast({
        title: 'Erro ao atualizar assinatura',
        description: error.message,
        variant: 'destructive',
      });
    },
  });

  const removeSubscriptionMutation = useMutation({
    mutationFn: async (userId: string) => {
      const { error } = await supabase
        .from('admin_subscriptions')
        .delete()
        .eq('user_id', userId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-users'] });
      toast({
        title: 'Assinatura removida',
        description: 'Usuário voltou ao plano baseado no Stripe.',
      });
    },
    onError: (error: Error) => {
      toast({
        title: 'Erro ao remover assinatura',
        description: error.message,
        variant: 'destructive',
      });
    },
  });

  // Grant producer uploads manually
  const grantProducerUploadsMutation = useMutation({
    mutationFn: async ({ userId, uploadsAllowed, expiresAt, reason }: GrantProducerUploadsParams) => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      const now = new Date();
      const defaultExpiry = new Date();
      defaultExpiry.setFullYear(defaultExpiry.getFullYear() + 1); // Default 1 year validity

      const { error } = await supabase
        .from('producer_purchases')
        .insert({
          user_id: userId,
          stripe_payment_intent_id: `admin_grant_${now.getTime()}_${user.id}`,
          product_id: 'admin_grant',
          tier: 'admin_grant',
          uploads_allowed: uploadsAllowed,
          uploads_used: 0,
          purchased_at: now.toISOString(),
          expires_at: expiresAt?.toISOString() || defaultExpiry.toISOString(),
          is_active: true,
        });

      if (error) throw error;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['admin-users'] });
      queryClient.invalidateQueries({ queryKey: ['producer-purchases'] });
      toast({
        title: 'Uploads concedidos',
        description: `${variables.uploadsAllowed} upload(s) concedido(s) com sucesso.`,
      });
    },
    onError: (error: Error) => {
      toast({
        title: 'Erro ao conceder uploads',
        description: error.message,
        variant: 'destructive',
      });
    },
  });

  // Revoke producer uploads (delete the purchase record)
  const revokeProducerUploadsMutation = useMutation({
    mutationFn: async (purchaseId: string) => {
      const { error } = await supabase
        .from('producer_purchases')
        .delete()
        .eq('id', purchaseId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-users'] });
      queryClient.invalidateQueries({ queryKey: ['producer-purchases'] });
      toast({
        title: 'Uploads revogados',
        description: 'Os uploads foram revogados com sucesso.',
      });
    },
    onError: (error: Error) => {
      toast({
        title: 'Erro ao revogar uploads',
        description: error.message,
        variant: 'destructive',
      });
    },
  });

  return {
    setSubscription: setSubscriptionMutation.mutate,
    removeSubscription: removeSubscriptionMutation.mutate,
    isSettingSubscription: setSubscriptionMutation.isPending,
    isRemovingSubscription: removeSubscriptionMutation.isPending,
    grantProducerUploads: grantProducerUploadsMutation.mutate,
    revokeProducerUploads: revokeProducerUploadsMutation.mutate,
    isGrantingUploads: grantProducerUploadsMutation.isPending,
    isRevokingUploads: revokeProducerUploadsMutation.isPending,
  };
}