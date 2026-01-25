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

interface SetSubscriptionParams {
  userId: string;
  tier: SubscriptionTier;
  reason?: string;
  expiresAt?: Date | null;
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

  return {
    setSubscription: setSubscriptionMutation.mutate,
    removeSubscription: removeSubscriptionMutation.mutate,
    isSettingSubscription: setSubscriptionMutation.isPending,
    isRemovingSubscription: removeSubscriptionMutation.isPending,
  };
}