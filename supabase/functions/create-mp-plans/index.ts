import { serve } from "https://deno.land/std@0.190.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const mpToken = Deno.env.get("MP_ACCESS_TOKEN");
    if (!mpToken) throw new Error("MP_ACCESS_TOKEN not set");

    const plans = [
      {
        reason: "TakePlay Standard",
        auto_recurring: {
          frequency: 1,
          frequency_type: "months",
          transaction_amount: 14.90,
          currency_id: "BRL",
        },
        back_url: "https://takeplay.lovable.app/pricing",
      },
      {
        reason: "TakePlay Premium",
        auto_recurring: {
          frequency: 1,
          frequency_type: "months",
          transaction_amount: 19.90,
          currency_id: "BRL",
        },
        back_url: "https://takeplay.lovable.app/pricing",
      },
    ];

    const results = [];

    for (const plan of plans) {
      const res = await fetch("https://api.mercadopago.com/preapproval_plan", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${mpToken}`,
        },
        body: JSON.stringify(plan),
      });

      const data = await res.json();
      console.log(`Plan created: ${plan.reason}`, JSON.stringify(data));
      results.push({ name: plan.reason, id: data.id, status: data.status, init_point: data.init_point });
    }

    return new Response(JSON.stringify({ plans: results }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error);
    return new Response(JSON.stringify({ error: msg }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }
});
