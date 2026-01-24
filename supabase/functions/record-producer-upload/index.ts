import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const logStep = (step: string, details?: any) => {
  console.log(`[RECORD-PRODUCER-UPLOAD] ${step}`, details ? JSON.stringify(details) : '');
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
    if (!user) throw new Error("User not authenticated");
    logStep("User authenticated", { userId: user.id });

    const { movieId } = await req.json().catch(() => ({}));
    if (!movieId) throw new Error("movieId is required");
    logStep("Movie ID received", { movieId });

    // Find the oldest active purchase with remaining uploads
    const now = new Date().toISOString();
    const { data: purchases, error: fetchError } = await supabaseClient
      .from('producer_purchases')
      .select('*')
      .eq('user_id', user.id)
      .eq('is_active', true)
      .gt('expires_at', now)
      .order('expires_at', { ascending: true }); // Use oldest first

    if (fetchError) throw new Error(`Database error: ${fetchError.message}`);
    
    // Find a purchase with remaining uploads
    let purchaseToUse = null;
    for (const purchase of purchases || []) {
      if (purchase.uploads_used < purchase.uploads_allowed) {
        purchaseToUse = purchase;
        break;
      }
    }

    if (!purchaseToUse) {
      throw new Error("No active purchase with remaining uploads");
    }

    // Increment uploads_used
    const { error: updateError } = await supabaseClient
      .from('producer_purchases')
      .update({ 
        uploads_used: purchaseToUse.uploads_used + 1,
        updated_at: now,
      })
      .eq('id', purchaseToUse.id);

    if (updateError) throw new Error(`Failed to update purchase: ${updateError.message}`);

    const uploadsRemaining = purchaseToUse.uploads_allowed - purchaseToUse.uploads_used - 1;
    logStep("Upload recorded", { 
      purchaseId: purchaseToUse.id, 
      uploadsRemaining,
      movieId 
    });

    return new Response(JSON.stringify({
      success: true,
      uploadsRemaining,
      purchaseId: purchaseToUse.id,
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
