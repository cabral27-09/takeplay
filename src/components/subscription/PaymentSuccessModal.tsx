import { useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { CheckCircle, Sparkles, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useNavigate } from 'react-router-dom';
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
}

export function PaymentSuccessModal({ isOpen, onClose, tierName = 'Premium' }: PaymentSuccessModalProps) {
  const navigate = useNavigate();

  useEffect(() => {
    if (isOpen) {
      const timer = setTimeout(() => {
        onClose();
      }, 8000);
      return () => clearTimeout(timer);
    }
  }, [isOpen, onClose]);

  const handleStartWatching = () => {
    onClose();
    navigate('/browse');
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md border-primary/20 bg-card">
        <DialogHeader>
          <DialogTitle className="sr-only">Pagamento confirmado</DialogTitle>
        </DialogHeader>
        
        <div className="flex flex-col items-center text-center py-6">
          {/* Animated Check Icon */}
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
              <CheckCircle className="w-12 h-12 text-primary" />
            </div>
            
            {/* Sparkles animation */}
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
          </motion.div>

          {/* Success Message */}
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
          >
            <h2 className="text-2xl font-bold text-foreground mb-2">
              Pagamento Confirmado!
            </h2>
            <p className="text-muted-foreground mb-1">
              Sua assinatura <span className="text-primary font-semibold">{tierName}</span> está ativa.
            </p>
            <p className="text-sm text-muted-foreground">
              Aproveite o acesso completo ao catálogo.
            </p>
          </motion.div>

          {/* CTA Button */}
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.5 }}
            className="mt-6 w-full"
          >
            <Button 
              onClick={handleStartWatching}
              className="w-full"
              size="lg"
            >
              Começar a Assistir
            </Button>
          </motion.div>

          {/* Email notice */}
          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.7 }}
            className="text-xs text-muted-foreground mt-4"
          >
            Um recibo foi enviado para seu email.
          </motion.p>
        </div>
      </DialogContent>
    </Dialog>
  );
}
