import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const logStep = (step: string, details?: any) => {
  console.log(`[MP-WEBHOOK] ${step}`, details ? JSON.stringify(details) : '');
};

// Producer tier config (matches create-producer-checkout)
const PRODUCER_TIERS: Record<string, { uploadsAllowed: number; validityMonths: number }> = {
  produtor_anual: { uploadsAllowed: 10, validityMonths: 12 },
  produtor_semestral: { uploadsAllowed: 5, validityMonths: 6 },
  produtor_avulso: { uploadsAllowed: 1, validityMonths: 1 },
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL") ?? "",
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
    { auth: { persistSession: false } }
  );

  try {
    logStep("Webhook received", { method: req.method });

    const body = await req.json().catch(() => ({}));
    logStep("Webhook body", body);

    // Mercado Pago sends { action: "payment.created" | "payment.updated", data: { id: "123" } }
    // or { type: "payment", data: { id: "123" } }
    const paymentId = body?.data?.id;
    if (!paymentId) {
      logStep("No payment ID in webhook body, ignoring");
      return new Response(JSON.stringify({ ok: true }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      });
    }

    // Fetch payment details from Mercado Pago
    const mpToken = Deno.env.get("MP_ACESS_TOKEN");
    if (!mpToken) throw new Error("MP_ACCESS_TOKEN not set");

    const paymentRes = await fetch(`https://api.mercadopago.com/v1/payments/${paymentId}`, {
      headers: { "Authorization": `Bearer ${mpToken}` },
    });

    if (!paymentRes.ok) {
      logStep("Failed to fetch payment from MP", { status: paymentRes.status });
      return new Response(JSON.stringify({ error: "Failed to fetch payment" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200, // Return 200 so MP doesn't retry endlessly
      });
    }

    const payment = await paymentRes.json();
    logStep("Payment fetched", {
      id: payment.id,
      status: payment.status,
      external_reference: payment.external_reference,
      amount: payment.transaction_amount,
    });

    // Parse external_reference: "userId|tier"
    const extRef = payment.external_reference;
    if (!extRef || !extRef.includes('|')) {
      logStep("Invalid external_reference, ignoring", { extRef });
      return new Response(JSON.stringify({ ok: true }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      });
    }

    const [userId, tier] = extRef.split('|');
    logStep("Parsed reference", { userId, tier });

    // Record payment in audit table (upsert by mp_payment_id)
    await supabase.from('payments').upsert({
      user_id: userId,
      mp_payment_id: String(payment.id),
      mp_preference_id: payment.preference_id || null,
      external_reference: extRef,
      tier,
      amount: payment.transaction_amount || 0,
      status: payment.status,
      payment_method: payment.payment_method_id || payment.payment_type_id || null,
    }, { onConflict: 'mp_payment_id' });

    // Only activate on approved payments
    if (payment.status !== 'approved') {
      logStep("Payment not approved, recorded but not activating", { status: payment.status });
      return new Response(JSON.stringify({ ok: true, activated: false }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      });
    }

    // Determine if viewer subscription or producer purchase
    const isProducer = !!PRODUCER_TIERS[tier];

    if (isProducer) {
      // Producer purchase
      const config = PRODUCER_TIERS[tier];
      const now = new Date();
      const expiresAt = new Date(now);
      expiresAt.setMonth(expiresAt.getMonth() + config.validityMonths);

      const { error: insertError } = await supabase.from('producer_purchases').insert({
        user_id: userId,
        stripe_payment_intent_id: `mp_${payment.id}`, // Reuse column for MP payment ID
        product_id: `mp_${tier}`,
        tier,
        uploads_allowed: config.uploadsAllowed,
        uploads_used: 0,
        purchased_at: now.toISOString(),
        expires_at: expiresAt.toISOString(),
        is_active: true,
      });

      if (insertError) {
        logStep("Error inserting producer purchase", { error: insertError.message });
      } else {
        logStep("Producer purchase activated", { tier, uploads: config.uploadsAllowed });
      }
    } else {
      // Viewer subscription (standard/premium) — 30 days validity
      const expiresAt = new Date();
      expiresAt.setDate(expiresAt.getDate() + 30);

      const { error: upsertError } = await supabase.from('admin_subscriptions').upsert({
        user_id: userId,
        tier,
        is_active: true,
        reason: `mp_payment_${payment.id}`,
        expires_at: expiresAt.toISOString(),
      }, { onConflict: 'user_id' });

      if (upsertError) {
        logStep("Error upserting subscription", { error: upsertError.message });
      } else {
        logStep("Viewer subscription activated", { tier, expires: expiresAt.toISOString() });
      }
    }

    return new Response(JSON.stringify({ ok: true, activated: true }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    logStep("ERROR", { message: errorMessage });
    return new Response(JSON.stringify({ error: errorMessage }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200, // Return 200 to prevent MP retries on our errors
    });
  }
});
