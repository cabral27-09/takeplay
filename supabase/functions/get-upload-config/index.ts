import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
    const SUPABASE_ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY")!;
    const EXT_URL = (Deno.env.get("EXTERNAL_VIDEO_SUPABASE_URL") || "")
      .replace(/\/rest\/v1\/?$/, "")
      .replace(/\/+$/, "");
    const EXT_KEY = Deno.env.get("EXTERNAL_VIDEO_SUPABASE_ANON_KEY") || "";

    if (!EXT_URL || !EXT_KEY) {
      return new Response(JSON.stringify({ error: "External storage not configured" }), {
        status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Require authenticated user (admin/producer) — same Supabase auth as the app
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Authentication required" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const supabaseUser = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: { user }, error: userErr } = await supabaseUser.auth.getUser();
    if (userErr || !user) {
      return new Response(JSON.stringify({ error: "Invalid authentication" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(
      JSON.stringify({ url: EXT_URL, anonKey: EXT_KEY, bucket: "manivela_filmes" }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (e) {
    return new Response(JSON.stringify({ error: String((e as any)?.message ?? e) }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
