import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const logStep = (step: string, details?: any) => {
  console.log(`[CREATE-CHECKOUT] ${step}`, details ? JSON.stringify(details) : '');
};

// Mercado Pago Plan IDs
const PLAN_IDS: Record<string, string> = {
  standard: 'bb8d14e00c0a4dbba6cad6128b6b485e',
  premium: '05fed28083034eada6865427fc70fe96',
};

// Backward compatibility: old frontend payloads (Stripe priceId)
const LEGACY_PRICE_TO_PLAN: Record<string, string> = {
  price_1StDcWCeLx1o0X2JEP36pI2f: PLAN_IDS.premium,
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
    const authHeader = req.headers.get("Authorization")!;
    const token = authHeader.replace("Bearer ", "");
    const { data } = await supabaseClient.auth.getUser(token);
    const user = data.user;
    if (!user?.email) throw new Error("User not authenticated or email not available");

    const body = await req.json().catch(() => ({}));
    logStep("Request body", body);

    const legacyMappedPlanId =
      typeof body?.priceId === "string" ? LEGACY_PRICE_TO_PLAN[body.priceId] : undefined;

    if (body?.priceId && legacyMappedPlanId) {
      logStep("Mapped legacy priceId to planId", {
        priceId: body.priceId,
        planId: legacyMappedPlanId,
      });
    }

    const planId = body?.planId ?? legacyMappedPlanId;
    if (!planId) throw new Error("planId is required");
    logStep("Plan ID received", { planId });

    // Validate plan ID
    const validPlanIds = Object.values(PLAN_IDS);
    if (!validPlanIds.includes(planId)) {
      throw new Error("Invalid planId");
    }

    const mpToken = Deno.env.get("MP_ACCESS_TOKEN");
    if (!mpToken) throw new Error("MP_ACCESS_TOKEN not set");

    // Robust origin fallback
    const origin = req.headers.get("origin") 
      || req.headers.get("referer")?.split("/").slice(0, 3).join("/") 
      || "https://takeplay.lovable.app";
    logStep("Origin determined", { origin });

    // Fetch the subscription plan and use its hosted checkout URL (init_point)
    // This avoids requiring card_token_id in our backend.
    const planRes = await fetch(`https://api.mercadopago.com/preapproval_plan/${planId}`, {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${mpToken}`,
      },
    });

    const planData = await planRes.json();
    logStep("Plan fetch response", { status: planRes.status, id: planData?.id });

    if (!planRes.ok) {
      throw new Error(`Mercado Pago plan error: ${JSON.stringify(planData)}`);
    }

    const planInitPoint = planData?.init_point;
    const fallbackInitPoint = `https://www.mercadopago.com.br/subscriptions/checkout?preapproval_plan_id=${encodeURIComponent(planId)}`;

    const checkoutUrl = new URL(planInitPoint || fallbackInitPoint);
    checkoutUrl.searchParams.set("preapproval_plan_id", planId);
    checkoutUrl.searchParams.set("external_reference", user.id);
    checkoutUrl.searchParams.set("payer_email", user.email);
    checkoutUrl.searchParams.set("back_url", `${origin}/pricing?success=true`);

    const url = checkoutUrl.toString();

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
