import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const logStep = (step: string, details?: any) => {
  console.log(`[CHECK-PRODUCER-PURCHASE] ${step}`, details ? JSON.stringify(details) : '');
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

    // Check local database for active purchases
    const now = new Date().toISOString();
    const { data: purchases, error: dbError } = await supabaseClient
      .from('producer_purchases')
      .select('*')
      .eq('user_id', user.id)
      .eq('is_active', true)
      .gt('expires_at', now)
      .order('expires_at', { ascending: false });

    if (dbError) {
      logStep("Database error", { error: dbError.message });
      throw new Error(`Database error: ${dbError.message}`);
    }

    // Calculate total remaining uploads
    let totalUploadsRemaining = 0;
    let activePurchase = null;

    if (purchases && purchases.length > 0) {
      for (const purchase of purchases) {
        const remaining = purchase.uploads_allowed - purchase.uploads_used;
        if (remaining > 0) {
          totalUploadsRemaining += remaining;
          if (!activePurchase) {
            activePurchase = purchase;
          }
        }
      }
    }

    logStep("Purchase check complete", { 
      totalPurchases: purchases?.length || 0,
      uploadsRemaining: totalUploadsRemaining,
    });

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
