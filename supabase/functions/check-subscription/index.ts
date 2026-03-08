import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const logStep = (step: string, details?: any) => {
  const detailsStr = details ? ` - ${JSON.stringify(details)}` : '';
  console.log(`[CHECK-SUBSCRIPTION] ${step}${detailsStr}`);
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const supabaseClient = createClient(
    Deno.env.get("SUPABASE_URL") ?? "",
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
    { auth: { persistSession: false } }
  );

  try {
    logStep("Function started");

    const authHeader = req.headers.get("Authorization");
    if (!authHeader) throw new Error("No authorization header provided");

    const token = authHeader.replace("Bearer ", "");
    const { data: userData, error: userError } = await supabaseClient.auth.getUser(token);
    if (userError) throw new Error(`Authentication error: ${userError.message}`);
    
    const user = userData.user;
    if (!user?.email) throw new Error("User not authenticated or email not available");
    logStep("User authenticated", { userId: user.id, email: user.email });

    // Check admin_subscriptions table (populated by admin grants AND mp-webhook)
    const { data: sub, error: subError } = await supabaseClient
      .from('admin_subscriptions')
      .select('*')
      .eq('user_id', user.id)
      .eq('is_active', true)
      .single();

    if (sub && !subError) {
      const isExpired = sub.expires_at && new Date(sub.expires_at) < new Date();
      
      if (!isExpired) {
        logStep("Found active subscription", { 
          tier: sub.tier, 
          expires_at: sub.expires_at,
          reason: sub.reason,
        });
        
        return new Response(JSON.stringify({
          subscribed: sub.tier !== 'free',
          tier: sub.tier,
          subscription_end: sub.expires_at,
          admin_granted: !sub.reason?.startsWith('mp_payment_'),
        }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
          status: 200,
        });
      } else {
        logStep("Subscription expired", { expires_at: sub.expires_at });
      }
    }

    // No active subscription found
    logStep("No active subscription found, returning free");
    return new Response(JSON.stringify({
      subscribed: false,
      tier: 'free',
      subscription_end: null,
      admin_granted: false,
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    logStep("ERROR", { message: errorMessage });
    return new Response(JSON.stringify({ error: errorMessage }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }
});
