-- Create a table for admin-granted subscriptions (manual overrides)
CREATE TABLE public.admin_subscriptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  tier TEXT NOT NULL CHECK (tier IN ('free', 'standard', 'premium')),
  granted_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  reason TEXT,
  expires_at TIMESTAMP WITH TIME ZONE,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(user_id)
);

-- Enable RLS
ALTER TABLE public.admin_subscriptions ENABLE ROW LEVEL SECURITY;

-- Only admins can view all subscriptions
CREATE POLICY "Admins can view all admin subscriptions"
ON public.admin_subscriptions
FOR SELECT
TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

-- Only admins can insert subscriptions
CREATE POLICY "Admins can insert admin subscriptions"
ON public.admin_subscriptions
FOR INSERT
TO authenticated
WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- Only admins can update subscriptions
CREATE POLICY "Admins can update admin subscriptions"
ON public.admin_subscriptions
FOR UPDATE
TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

-- Only admins can delete subscriptions
CREATE POLICY "Admins can delete admin subscriptions"
ON public.admin_subscriptions
FOR DELETE
TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

-- Users can read their own subscription
CREATE POLICY "Users can view own admin subscription"
ON public.admin_subscriptions
FOR SELECT
TO authenticated
USING (auth.uid() = user_id);

-- Add trigger for updated_at
CREATE TRIGGER update_admin_subscriptions_updated_at
BEFORE UPDATE ON public.admin_subscriptions
FOR EACH ROW
EXECUTE FUNCTION public.handle_updated_at();