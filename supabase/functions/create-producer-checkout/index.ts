import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const logStep = (step: string, details?: any) => {
  console.log(`[CREATE-PRODUCER-CHECKOUT] ${step}`, details ? JSON.stringify(details) : '');
};

const PRODUCER_PRODUCTS: Record<string, { title: string; price: number; tier: string }> = {
  produtor_anual: { title: 'TakePlay Produtor Anual - 10 uploads', price: 299.90, tier: 'produtor_anual' },
  produtor_semestral: { title: 'TakePlay Produtor Semestral - 5 uploads', price: 179.90, tier: 'produtor_semestral' },
  produtor_avulso: { title: 'TakePlay Upload Avulso - 1 upload', price: 49.90, tier: 'produtor_avulso' },
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

    const { tier } = await req.json().catch(() => ({}));
    if (!tier || !PRODUCER_PRODUCTS[tier]) throw new Error("Invalid tier");
    
    const product = PRODUCER_PRODUCTS[tier];
    logStep("Product selected", { tier, product });

    const mpToken = Deno.env.get("MP_ACCESS_TOKEN");
    if (!mpToken) throw new Error("MP_ACCESS_TOKEN not set");

    const origin = req.headers.get("origin") 
      || req.headers.get("referer")?.split("/").slice(0, 3).join("/") 
      || "https://takeplay.lovable.app";
    logStep("Origin determined", { origin });

    // Checkout Pro (preferences API) — supports PIX, credit card, boleto
    const preferenceRes = await fetch("https://api.mercadopago.com/checkout/preferences", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${mpToken}`,
      },
      body: JSON.stringify({
        items: [
          {
            title: product.title,
            quantity: 1,
            unit_price: product.price,
            currency_id: "BRL",
          },
        ],
        payer: {
          email: user.email,
        },
        payment_methods: {
          excluded_payment_types: [],
          installments: 1,
        },
        back_urls: {
          success: `${origin}/producer/pricing?success=true`,
          failure: `${origin}/producer/pricing`,
          pending: `${origin}/producer/pricing?pending=true`,
        },
        auto_return: "approved",
        external_reference: `${user.id}|${tier}`,
        metadata: {
          user_id: user.id,
          tier: tier,
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
