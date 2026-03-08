import { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Layout } from '@/components/layout/Layout';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/contexts/AuthContext';
import { useProducerPurchase } from '@/hooks/useProducerPurchase';
import { supabase } from '@/integrations/supabase/client';
import { PRODUCER_TIERS, ProducerTier, ProducerTierInfo } from '@/lib/subscription-tiers';
import { Check, Loader2, Upload, Calendar, Star, Sparkles } from 'lucide-react';
import { motion } from 'framer-motion';

export default function ProducerPricing() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { toast } = useToast();
  const { user, hasRole } = useAuth();
  const { purchaseInfo, isLoading: purchaseLoading, checkPurchase } = useProducerPurchase();
  const [loadingTier, setLoadingTier] = useState<ProducerTier | null>(null);

  const isProducer = hasRole('producer');
  const success = searchParams.get('success') === 'true';

  useEffect(() => {
    if (success) {
      toast({
        title: 'Compra realizada!',
        description: 'Seu plano foi ativado com sucesso. Você já pode enviar seus filmes!',
      });
      checkPurchase();
      navigate('/producer/pricing', { replace: true });
    }
  }, [success, toast, navigate, checkPurchase]);

  const handlePurchase = async (tier: ProducerTier) => {
    if (!user) {
      navigate('/auth?redirect=/producer/pricing');
      return;
    }

    if (!isProducer) {
      toast({
        title: 'Acesso restrito',
        description: 'Você precisa ter uma conta de produtor para adquirir este plano.',
        variant: 'destructive',
      });
      return;
    }

    setLoadingTier(tier);

    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        throw new Error('Sessão expirada');
      }

      const { data, error } = await supabase.functions.invoke('create-producer-checkout', {
        headers: {
          Authorization: `Bearer ${session.access_token}`,
        },
        body: { tier },
      });

      if (error) throw error;
      if (!data?.url) throw new Error('URL de checkout não retornada');

      window.open(data.url, '_blank');
    } catch (error) {
      console.error('Checkout error:', error);
      toast({
        title: 'Erro no checkout',
        description: error instanceof Error ? error.message : 'Não foi possível iniciar o checkout.',
        variant: 'destructive',
      });
    } finally {
      setLoadingTier(null);
    }
  };

  const getTierIcon = (tier: ProducerTier) => {
    switch (tier) {
      case 'produtor_anual':
        return <Star className="w-5 h-5" />;
      case 'produtor_semestral':
        return <Calendar className="w-5 h-5" />;
      case 'produtor_avulso':
        return <Upload className="w-5 h-5" />;
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('pt-BR', {
      day: '2-digit',
      month: 'long',
      year: 'numeric',
    });
  };

  return (
    <Layout>
      <div className="container max-w-6xl py-12">
        <div className="text-center mb-12">
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
          >
            <Badge variant="secondary" className="mb-4">
              <Sparkles className="w-3 h-3 mr-1" />
              Planos de Produtor
            </Badge>
            <h1 className="text-4xl font-bold mb-4">
              Distribua seu conteúdo
            </h1>
            <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
              Escolha o plano ideal para enviar seus filmes e séries para o Manivela Filmes
            </p>
          </motion.div>
        </div>

        {purchaseInfo.hasActivePurchase && (
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="mb-8"
          >
            <Card className="border-primary/50 bg-primary/5">
              <CardContent className="py-6">
                <div className="flex flex-col md:flex-row items-center justify-between gap-4">
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 bg-primary/20 rounded-full flex items-center justify-center">
                      <Upload className="w-6 h-6 text-primary" />
                    </div>
                    <div>
                      <h3 className="font-semibold">Seu Plano Atual</h3>
                      <p className="text-sm text-muted-foreground">
                        {purchaseInfo.uploadsRemaining} uploads restantes
                        {purchaseInfo.expiresAt && (
                          <> • Válido até {formatDate(purchaseInfo.expiresAt)}</>
                        )}
                      </p>
                    </div>
                  </div>
                  <Button onClick={() => navigate('/producer/movies/new')}>
                    <Upload className="w-4 h-4 mr-2" />
                    Enviar Filme
                  </Button>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        )}

        <div className="grid md:grid-cols-3 gap-6">
          {(Object.entries(PRODUCER_TIERS) as [ProducerTier, ProducerTierInfo][]).map(
            ([tier, info], index) => (
              <motion.div
                key={tier}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: index * 0.1 }}
              >
                <Card 
                  className={`relative h-full flex flex-col ${
                    info.highlighted 
                      ? 'border-primary shadow-lg shadow-primary/20' 
                      : ''
                  }`}
                >
                  {info.highlighted && (
                    <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                      <Badge className="bg-primary text-primary-foreground">
                        Mais Popular
                      </Badge>
                    </div>
                  )}
                  
                  <CardHeader className="text-center pb-2">
                    <div className={`w-12 h-12 rounded-full flex items-center justify-center mx-auto mb-4 ${
                      info.highlighted ? 'bg-primary text-primary-foreground' : 'bg-muted'
                    }`}>
                      {getTierIcon(tier)}
                    </div>
                    <CardTitle className="text-xl">{info.name}</CardTitle>
                    <CardDescription>{info.description}</CardDescription>
                  </CardHeader>
                  
                  <CardContent className="flex-1 flex flex-col">
                    <div className="text-center mb-6">
                      <span className="text-4xl font-bold">
                        R$ {info.price.toFixed(2).replace('.', ',')}
                      </span>
                      <span className="text-muted-foreground block text-sm mt-1">
                        pagamento único
                      </span>
                    </div>
                    
                    <ul className="space-y-3 mb-6 flex-1">
                      {info.features.map((feature, i) => (
                        <li key={i} className="flex items-start gap-2">
                          <Check className="w-5 h-5 text-primary shrink-0 mt-0.5" />
                          <span className="text-sm">{feature}</span>
                        </li>
                      ))}
                    </ul>
                    
                    <Button
                      className="w-full"
                      variant={info.highlighted ? 'default' : 'outline'}
                      size="lg"
                      disabled={loadingTier !== null || purchaseLoading}
                      onClick={() => handlePurchase(tier)}
                    >
                      {loadingTier === tier ? (
                        <>
                          <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                          Processando...
                        </>
                      ) : (
                        'Comprar Agora'
                      )}
                    </Button>
                  </CardContent>
                </Card>
              </motion.div>
            )
          )}
        </div>

        <div className="text-center mt-12 text-sm text-muted-foreground">
          <p>
            Pagamento único e seguro via Mercado Pago. Os uploads são válidos pelo período indicado em cada plano.
          </p>
          <p className="mt-2">
            Dúvidas? Entre em contato com nosso{' '}
            <a href="mailto:suporte@manivelafilmes.com" className="text-primary hover:underline">
              suporte
            </a>
          </p>
        </div>
      </div>
    </Layout>
  );
}
