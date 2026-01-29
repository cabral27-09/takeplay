import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { CheckCircle, Sparkles, Loader2, ExternalLink, Mail } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useNavigate } from 'react-router-dom';
import { Skeleton } from '@/components/ui/skeleton';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';

interface PaymentSuccessModalProps {
  isOpen: boolean;
  onClose: () => void;
  tierName?: string;
  isLoading?: boolean;
}

export function PaymentSuccessModal({ isOpen, onClose, tierName, isLoading = false }: PaymentSuccessModalProps) {
  const navigate = useNavigate();
  const { session } = useAuth();
  const [isOpeningPortal, setIsOpeningPortal] = useState(false);

  useEffect(() => {
    // Only auto-close after loading is complete - extended to 15s for user to see options
    if (isOpen && !isLoading) {
      const timer = setTimeout(() => {
        onClose();
      }, 15000);
      return () => clearTimeout(timer);
    }
  }, [isOpen, onClose, isLoading]);

  const handleStartWatching = () => {
    onClose();
    navigate('/browse');
  };

  const handleViewInvoice = async () => {
    if (!session) return;
    
    setIsOpeningPortal(true);
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
      setIsOpeningPortal(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md border-primary/20 bg-card">
        <DialogHeader>
          <DialogTitle className="sr-only">Pagamento confirmado</DialogTitle>
        </DialogHeader>
        
        <div className="flex flex-col items-center text-center py-6">
          {/* Animated Check Icon or Loading */}
          <motion.div
            initial={{ scale: 0, rotate: -180 }}
            animate={{ scale: 1, rotate: 0 }}
            transition={{ 
              type: "spring", 
              stiffness: 200, 
              damping: 15,
              delay: 0.1 
            }}
            className="relative mb-6"
          >
            <div className="w-20 h-20 rounded-full bg-primary/20 flex items-center justify-center">
              {isLoading ? (
                <Loader2 className="w-12 h-12 text-primary animate-spin" />
              ) : (
                <CheckCircle className="w-12 h-12 text-primary" />
              )}
            </div>
            
            {/* Sparkles animation - only show when not loading */}
            {!isLoading && (
              <>
                <motion.div
                  initial={{ opacity: 0, scale: 0 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: 0.4 }}
                  className="absolute -top-2 -right-2"
                >
                  <Sparkles className="w-6 h-6 text-primary" />
                </motion.div>
                <motion.div
                  initial={{ opacity: 0, scale: 0 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: 0.5 }}
                  className="absolute -bottom-1 -left-3"
                >
                  <Sparkles className="w-5 h-5 text-primary/70" />
                </motion.div>
              </>
            )}
          </motion.div>

          {/* Success Message with Loading State */}
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
          >
            {isLoading ? (
              <>
                <h2 className="text-2xl font-bold text-foreground mb-2">
                  Confirmando Pagamento...
                </h2>
                <p className="text-muted-foreground mb-1">
                  Sincronizando sua assinatura
                </p>
                <Skeleton className="h-4 w-32 mx-auto mt-2" />
              </>
            ) : (
              <>
                <h2 className="text-2xl font-bold text-foreground mb-2">
                  Pagamento Confirmado!
                </h2>
                <p className="text-muted-foreground mb-1">
                  {tierName ? (
                    <>Sua assinatura <span className="text-primary font-semibold">{tierName}</span> está ativa.</>
                  ) : (
                    <>Sua assinatura está ativa.</>
                  )}
                </p>
                <p className="text-sm text-muted-foreground">
                  Aproveite o acesso completo ao catálogo.
                </p>
              </>
            )}
          </motion.div>

          {/* CTA Buttons */}
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.5 }}
            className="mt-6 w-full space-y-3"
          >
            <Button 
              onClick={handleStartWatching}
              className="w-full"
              size="lg"
              disabled={isLoading}
            >
              {isLoading ? 'Aguarde...' : 'Começar a Assistir'}
            </Button>
            
            {/* View Invoice Button - only show when not loading */}
            {!isLoading && (
              <Button 
                onClick={handleViewInvoice}
                variant="outline"
                className="w-full"
                size="lg"
                disabled={isOpeningPortal}
              >
                {isOpeningPortal ? (
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                ) : (
                  <ExternalLink className="w-4 h-4 mr-2" />
                )}
                Ver Fatura / Recibo
              </Button>
            )}
          </motion.div>

          {/* Email notice - only show when not loading */}
          {!isLoading && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.7 }}
              className="flex items-center justify-center gap-2 text-xs text-muted-foreground mt-4"
            >
              <Mail className="w-3 h-3" />
              <span>Um recibo foi enviado para seu email.</span>
            </motion.div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
