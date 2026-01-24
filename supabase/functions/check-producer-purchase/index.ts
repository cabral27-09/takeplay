import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@18.5.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const logStep = (step: string, details?: any) => {
  console.log(`[CHECK-PRODUCER-PURCHASE] ${step}`, details ? JSON.stringify(details) : '');
};

// Producer tier configuration
const PRODUCER_TIERS: Record<string, { tier: string; uploadsAllowed: number; validityMonths: number }> = {
  'prod_TqvYsBxxU64nn2': { tier: 'produtor_anual', uploadsAllowed: 10, validityMonths: 12 },
  'prod_TqvaIP6ov8bnnn': { tier: 'produtor_semestral', uploadsAllowed: 5, validityMonths: 6 },
  'prod_Tqvbvoa1mdrqeQ': { tier: 'produtor_avulso', uploadsAllowed: 1, validityMonths: 1 },
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

    const stripeKey = Deno.env.get("STRIPE_SECRET_KEY");
    if (!stripeKey) throw new Error("STRIPE_SECRET_KEY is not set");

    const authHeader = req.headers.get("Authorization");
    if (!authHeader) throw new Error("No authorization header provided");

    const token = authHeader.replace("Bearer ", "");
    const { data: userData, error: userError } = await supabaseClient.auth.getUser(token);
    if (userError) throw new Error(`Authentication error: ${userError.message}`);
    const user = userData.user;
    if (!user?.email) throw new Error("User not authenticated or email not available");
    logStep("User authenticated", { userId: user.id, email: user.email });

    // First check local database for active purchases
    const now = new Date().toISOString();
    const { data: localPurchases, error: dbError } = await supabaseClient
      .from('producer_purchases')
      .select('*')
      .eq('user_id', user.id)
      .eq('is_active', true)
      .gt('expires_at', now)
      .order('expires_at', { ascending: false });

    if (dbError) {
      logStep("Database error, will check Stripe", { error: dbError.message });
    }

    // Calculate total remaining uploads from local purchases
    let totalUploadsRemaining = 0;
    let activePurchase = null;

    if (localPurchases && localPurchases.length > 0) {
      for (const purchase of localPurchases) {
        const remaining = purchase.uploads_allowed - purchase.uploads_used;
        if (remaining > 0) {
          totalUploadsRemaining += remaining;
          if (!activePurchase) {
            activePurchase = purchase;
          }
        }
      }
    }

    if (totalUploadsRemaining > 0 && activePurchase) {
      logStep("Found active local purchase", { 
        purchaseId: activePurchase.id, 
        uploadsRemaining: totalUploadsRemaining 
      });
      
      return new Response(JSON.stringify({
        hasActivePurchase: true,
        uploadsRemaining: totalUploadsRemaining,
        tier: activePurchase.tier,
        expiresAt: activePurchase.expires_at,
        purchaseId: activePurchase.id,
      }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      });
    }

    // If no local purchases, check Stripe for completed payments
    const stripe = new Stripe(stripeKey, { apiVersion: "2025-08-27.basil" });
    
    const customers = await stripe.customers.list({ email: user.email, limit: 1 });
    if (customers.data.length === 0) {
      logStep("No Stripe customer found");
      return new Response(JSON.stringify({
        hasActivePurchase: false,
        uploadsRemaining: 0,
        tier: null,
        expiresAt: null,
      }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      });
    }

    const customerId = customers.data[0].id;
    logStep("Found Stripe customer", { customerId });

    // Get successful payment intents for producer products
    const paymentIntents = await stripe.paymentIntents.list({
      customer: customerId,
      limit: 100,
    });

    const successfulPayments = paymentIntents.data.filter((pi: { status: string }) => pi.status === 'succeeded');
    logStep("Found payment intents", { total: paymentIntents.data.length, successful: successfulPayments.length });

    // Check each successful payment to see if it's a producer purchase not yet in our DB
    for (const payment of successfulPayments) {
      // Check if we already have this payment in our database
      const { data: existingPurchase } = await supabaseClient
        .from('producer_purchases')
        .select('id')
        .eq('stripe_payment_intent_id', payment.id)
        .maybeSingle();

      if (existingPurchase) {
        continue; // Already recorded
      }

      // Get the checkout session to find the product
      const sessions = await stripe.checkout.sessions.list({
        payment_intent: payment.id,
        limit: 1,
      });

      if (sessions.data.length === 0) continue;

      const session = sessions.data[0];
      const lineItems = await stripe.checkout.sessions.listLineItems(session.id, { limit: 1 });
      
      if (lineItems.data.length === 0) continue;

      const lineItem = lineItems.data[0];
      const priceId = lineItem.price?.id;
      const productId = typeof lineItem.price?.product === 'string' 
        ? lineItem.price.product 
        : lineItem.price?.product?.id;

      if (!productId || !PRODUCER_TIERS[productId]) {
        continue; // Not a producer product
      }

      const tierConfig = PRODUCER_TIERS[productId];
      const purchasedAt = new Date(payment.created * 1000);
      const expiresAt = new Date(purchasedAt);
      expiresAt.setMonth(expiresAt.getMonth() + tierConfig.validityMonths);

      // Insert the new purchase
      const { data: newPurchase, error: insertError } = await supabaseClient
        .from('producer_purchases')
        .insert({
          user_id: user.id,
          stripe_payment_intent_id: payment.id,
          product_id: productId,
          tier: tierConfig.tier,
          uploads_allowed: tierConfig.uploadsAllowed,
          uploads_used: 0,
          purchased_at: purchasedAt.toISOString(),
          expires_at: expiresAt.toISOString(),
          is_active: true,
        })
        .select()
        .single();

      if (insertError) {
        logStep("Error inserting purchase", { error: insertError.message });
      } else {
        logStep("New purchase recorded", { purchaseId: newPurchase.id, tier: tierConfig.tier });
        totalUploadsRemaining += tierConfig.uploadsAllowed;
        if (!activePurchase) {
          activePurchase = newPurchase;
        }
      }
    }

    // Return final status
    return new Response(JSON.stringify({
      hasActivePurchase: totalUploadsRemaining > 0,
      uploadsRemaining: totalUploadsRemaining,
      tier: activePurchase?.tier || null,
      expiresAt: activePurchase?.expires_at || null,
      purchaseId: activePurchase?.id || null,
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
