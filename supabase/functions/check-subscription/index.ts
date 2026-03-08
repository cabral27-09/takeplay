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

// Map Mercado Pago plan IDs to tiers
const PLAN_TIER_MAP: Record<string, string> = {
  'bb8d14e00c0a4dbba6cad6128b6b485e': 'standard',
  '05fed28083034eada6865427fc70fe96': 'premium',
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

    // FIRST: Check for admin-granted subscription (takes priority)
    const { data: adminSub, error: adminSubError } = await supabaseClient
      .from('admin_subscriptions')
      .select('*')
      .eq('user_id', user.id)
      .eq('is_active', true)
      .single();

    if (adminSub && !adminSubError) {
      const isExpired = adminSub.expires_at && new Date(adminSub.expires_at) < new Date();
      
      if (!isExpired) {
        logStep("Found active admin-granted subscription", { 
          tier: adminSub.tier, 
          expires_at: adminSub.expires_at 
        });
        
        return new Response(JSON.stringify({
          subscribed: adminSub.tier !== 'free',
          tier: adminSub.tier,
          subscription_end: adminSub.expires_at,
          admin_granted: true,
        }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
          status: 200,
        });
      } else {
        logStep("Admin subscription expired, checking Mercado Pago");
      }
    }

    // SECOND: Check Mercado Pago subscription
    const mpToken = Deno.env.get("MP_ACCESS_TOKEN");
    if (!mpToken) {
      logStep("MP_ACCESS_TOKEN not set, returning free tier");
      return new Response(JSON.stringify({ subscribed: false, tier: 'free' }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      });
    }

    // Search for active preapprovals (subscriptions) by payer email
    const searchUrl = `https://api.mercadopago.com/preapproval/search?payer_email=${encodeURIComponent(user.email)}&status=authorized&sort=date_created&criteria=desc&limit=10`;
    
    const searchRes = await fetch(searchUrl, {
      headers: {
        "Authorization": `Bearer ${mpToken}`,
      },
    });

    const searchData = await searchRes.json();
    logStep("MP preapproval search", { status: searchRes.status, total: searchData.paging?.total });

    if (!searchRes.ok || !searchData.results || searchData.results.length === 0) {
      logStep("No active MP subscription found");
      return new Response(JSON.stringify({ subscribed: false, tier: 'free' }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      });
    }

    // Find the highest tier active subscription
    let bestTier = 'free';
    let subscriptionEnd: string | null = null;

    for (const sub of searchData.results) {
      const planId = sub.preapproval_plan_id;
      const tier = PLAN_TIER_MAP[planId];
      
      if (tier) {
        const tierLevel = tier === 'premium' ? 2 : tier === 'standard' ? 1 : 0;
        const bestLevel = bestTier === 'premium' ? 2 : bestTier === 'standard' ? 1 : 0;
        
        if (tierLevel > bestLevel) {
          bestTier = tier;
          subscriptionEnd = sub.next_payment_date || null;
        }
      }
    }

    logStep("Best tier found", { tier: bestTier, subscriptionEnd });

    return new Response(JSON.stringify({
      subscribed: bestTier !== 'free',
      tier: bestTier,
      subscription_end: subscriptionEnd,
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
