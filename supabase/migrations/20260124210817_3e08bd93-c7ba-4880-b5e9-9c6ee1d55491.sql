-- Create producer_purchases table to track one-time purchases for producers
CREATE TABLE public.producer_purchases (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  stripe_payment_intent_id TEXT NOT NULL UNIQUE,
  product_id TEXT NOT NULL,
  tier TEXT NOT NULL CHECK (tier IN ('produtor_anual', 'produtor_semestral', 'produtor_avulso')),
  uploads_allowed INTEGER NOT NULL,
  uploads_used INTEGER NOT NULL DEFAULT 0,
  purchased_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create index for faster lookups
CREATE INDEX idx_producer_purchases_user_id ON public.producer_purchases(user_id);
CREATE INDEX idx_producer_purchases_active ON public.producer_purchases(user_id, is_active, expires_at);

-- Enable RLS
ALTER TABLE public.producer_purchases ENABLE ROW LEVEL SECURITY;

-- Users can view their own purchases
CREATE POLICY "Users can view own purchases"
ON public.producer_purchases
FOR SELECT
USING (auth.uid() = user_id);

-- Only admins can insert/update (service role will be used in edge functions)
CREATE POLICY "Service role can manage purchases"
ON public.producer_purchases
FOR ALL
USING (auth.uid() IN (SELECT user_id FROM public.user_roles WHERE role = 'admin'))
WITH CHECK (auth.uid() IN (SELECT user_id FROM public.user_roles WHERE role = 'admin'));

-- Add trigger for updated_at
CREATE TRIGGER update_producer_purchases_updated_at
BEFORE UPDATE ON public.producer_purchases
FOR EACH ROW
EXECUTE FUNCTION public.handle_updated_at();