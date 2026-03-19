import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const logStep = (step: string, details?: any) => {
  console.log(`[CREATE-CHECKOUT] ${step}`, details ? JSON.stringify(details) : '');
};

// Plan configs: viewer subscriptions as one-time payments via Checkout Pro (supports PIX)
const PLAN_CONFIGS: Record<string, { title: string; price: number; tier: string }> = {
  standard: { title: 'TakePlay Standard - Mensal', price: 14.90, tier: 'standard' },
  premium: { title: 'TakePlay Premium - Mensal', price: 19.90, tier: 'premium' },
};

// Map old Mercado Pago plan IDs to new plan keys
const PLAN_ID_TO_KEY: Record<string, string> = {
  'bb8d14e00c0a4dbba6cad6128b6b485e': 'standard',
  '05fed28083034eada6865427fc70fe96': 'premium',
};

// Map old Stripe priceIds to plan keys
const LEGACY_PRICE_TO_KEY: Record<string, string> = {
  'price_1StDcWCeLx1o0X2JEP36pI2f': 'standard',
  'price_1StDe5CeLx1o0X2JtcO3fVz2': 'premium',
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const supabaseClient = createClient(
    Deno.env.get("SUPABASE_URL") ?? "",
    Deno.env.get("SUPABASE_ANON_KEY") ?? ""
  );

  try {
    logStep("Function started");

    const authHeader = req.headers.get("Authorization")!;
    const token = authHeader.replace("Bearer ", "");
    const { data } = await supabaseClient.auth.getUser(token);
    const user = data.user;
    if (!user?.email) throw new Error("User not authenticated or email not available");
    logStep("User authenticated", { userId: user.id, email: user.email });

    const body = await req.json().catch(() => ({}));
    logStep("Request body", body);

    // Resolve plan key from various input formats
    let planKey: string | undefined;

    if (body?.planId) {
      // Could be a plan key directly (e.g. "standard") or an old MP plan ID
      planKey = PLAN_CONFIGS[body.planId] ? body.planId : PLAN_ID_TO_KEY[body.planId];
    }
    if (!planKey && body?.priceId) {
      planKey = LEGACY_PRICE_TO_KEY[body.priceId];
    }

    if (!planKey || !PLAN_CONFIGS[planKey]) {
      throw new Error("Invalid plan identifier");
    }

    const plan = PLAN_CONFIGS[planKey];
    logStep("Plan resolved", { planKey, plan });

    const mpToken = Deno.env.get("MP_ACESS_TOKEN");
    if (!mpToken) throw new Error("MP_ACCESS_TOKEN not set");

    const origin = req.headers.get("origin")
      || req.headers.get("referer")?.split("/").slice(0, 3).join("/")
      || "https://takeplay.lovable.app";
    logStep("Origin determined", { origin });

    // Use Checkout Pro (preferences API) — supports PIX, credit card, boleto
    const preferenceRes = await fetch("https://api.mercadopago.com/checkout/preferences", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${mpToken}`,
      },
      body: JSON.stringify({
        items: [
          {
            title: plan.title,
            quantity: 1,
            unit_price: plan.price,
            currency_id: "BRL",
          },
        ],
        payer: {
          email: user.email,
        },
        payment_methods: {
          excluded_payment_types: [],
        },
        back_urls: {
          success: `${origin}/pricing?success=true`,
          failure: `${origin}/pricing`,
          pending: `${origin}/pricing?pending=true`,
        },
        auto_return: "approved",
        notification_url: `${Deno.env.get("SUPABASE_URL")}/functions/v1/mp-webhook`,
        external_reference: `${user.id}|${plan.tier}`,
        metadata: {
          user_id: user.id,
          tier: plan.tier,
        },
      }),
    });

    const preferenceData = await preferenceRes.json();
    logStep("Preference response", { status: preferenceRes.status, id: preferenceData.id });

    if (!preferenceRes.ok) {
      throw new Error(`Mercado Pago error: ${JSON.stringify(preferenceData)}`);
    }

    const url = preferenceData.init_point;
    if (!url) throw new Error("No init_point returned from Mercado Pago");

    logStep("Checkout URL generated", { url });

    return new Response(JSON.stringify({ url }), {
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
