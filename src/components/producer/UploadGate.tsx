import { ReactNode } from 'react';
import { useNavigate } from 'react-router-dom';
import { useProducerPurchase } from '@/hooks/useProducerPurchase';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Loader2, ShoppingCart, Upload, AlertCircle } from 'lucide-react';
import { motion } from 'framer-motion';

interface UploadGateProps {
  children: ReactNode;
}

export function UploadGate({ children }: UploadGateProps) {
  const navigate = useNavigate();
  const { purchaseInfo, isLoading, error, checkPurchase } = useProducerPurchase();

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="w-8 h-8 animate-spin mx-auto mb-4 text-primary" />
          <p className="text-muted-foreground">Verificando seu plano...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <Card className="max-w-md w-full">
          <CardHeader className="text-center">
            <AlertCircle className="w-12 h-12 text-destructive mx-auto mb-4" />
            <CardTitle>Erro ao verificar plano</CardTitle>
            <CardDescription>{error}</CardDescription>
          </CardHeader>
          <CardContent className="flex justify-center gap-4">
            <Button variant="outline" onClick={() => checkPurchase()}>
              Tentar novamente
            </Button>
            <Button onClick={() => navigate('/producer/pricing')}>
              Ver planos
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!purchaseInfo.hasActivePurchase || purchaseInfo.uploadsRemaining <= 0) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
        >
          <Card className="max-w-lg w-full text-center">
            <CardHeader>
              <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-4">
                <Upload className="w-8 h-8 text-primary" />
              </div>
              <CardTitle className="text-2xl">
                {purchaseInfo.hasActivePurchase 
                  ? 'Uploads Esgotados' 
                  : 'Nenhum Plano Ativo'}
              </CardTitle>
              <CardDescription className="text-base mt-2">
                {purchaseInfo.hasActivePurchase
                  ? 'Você utilizou todos os uploads do seu plano atual. Adquira mais uploads para continuar enviando conteúdo.'
                  : 'Para enviar filmes e séries para a plataforma, você precisa adquirir um plano de produtor.'}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="bg-muted/50 rounded-lg p-4">
                <h4 className="font-medium mb-2">Benefícios dos planos:</h4>
                <ul className="text-sm text-muted-foreground space-y-1 text-left">
                  <li>✓ Upload de até 6GB por arquivo</li>
                  <li>✓ Distribuição para todo o catálogo</li>
                  <li>✓ Suporte técnico dedicado</li>
                  <li>✓ Relatórios de visualização</li>
                </ul>
              </div>
              
              <Button 
                size="lg" 
                className="w-full"
                onClick={() => navigate('/producer/pricing')}
              >
                <ShoppingCart className="w-4 h-4 mr-2" />
                Ver Planos de Produtor
              </Button>
              
              <Button 
                variant="ghost" 
                className="w-full"
                onClick={() => navigate('/producer/movies')}
              >
                Voltar para Meus Filmes
              </Button>
            </CardContent>
          </Card>
        </motion.div>
      </div>
    );
  }

  // User has active purchase with remaining uploads
  return <>{children}</>;
}
