import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
    const SERVICE_ROLE = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY")!;

    const supabaseAuth = createClient(SUPABASE_URL, ANON_KEY);
    const token = authHeader.replace("Bearer ", "");
    const { data: claims, error: authErr } = await supabaseAuth.auth.getClaims(token);
    if (authErr || !claims?.claims?.sub) {
      return new Response(JSON.stringify({ error: "Invalid token" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const userId = claims.claims.sub;

    const admin = createClient(SUPABASE_URL, SERVICE_ROLE);

    const { data: roles } = await admin
      .from("user_roles")
      .select("role")
      .eq("user_id", userId);
    const allowed = (roles || []).some((r: any) => r.role === "admin" || r.role === "producer");
    if (!allowed) {
      return new Response(JSON.stringify({ error: "Forbidden" }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const body = await req.json();
    const { uploadId, totalChunks, fileName, contentType, abort } = body || {};

    if (!uploadId || !/^[a-zA-Z0-9_-]+$/.test(String(uploadId))) {
      return new Response(JSON.stringify({ error: "Invalid uploadId" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const tmpPrefix = `_tmp/${userId}/${uploadId}`;

    const cleanup = async () => {
      const { data: list } = await admin.storage.from("videos").list(tmpPrefix, { limit: 10000 });
      if (list && list.length) {
        const paths = list.map((f) => `${tmpPrefix}/${f.name}`);
        await admin.storage.from("videos").remove(paths);
      }
    };

    if (abort) {
      await cleanup();
      return new Response(JSON.stringify({ ok: true, aborted: true }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (!totalChunks || !fileName) {
      return new Response(JSON.stringify({ error: "Missing fields" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Baixa cada chunk em ordem e concatena
    const parts: Uint8Array[] = [];
    let totalSize = 0;
    for (let i = 0; i < totalChunks; i++) {
      const partPath = `${tmpPrefix}/${String(i).padStart(6, "0")}.part`;
      const { data, error } = await admin.storage.from("videos").download(partPath);
      if (error || !data) {
        console.error("[finalize] missing chunk", i, error);
        return new Response(JSON.stringify({ error: `Chunk ${i} ausente` }), {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const buf = new Uint8Array(await data.arrayBuffer());
      parts.push(buf);
      totalSize += buf.length;
    }

    const merged = new Uint8Array(totalSize);
    let offset = 0;
    for (const p of parts) {
      merged.set(p, offset);
      offset += p.length;
    }

    const ext = String(fileName).split(".").pop() || "mp4";
    const finalPath = `movies/${Date.now()}-${Math.random().toString(36).substring(2)}.${ext}`;

    const { error: upErr } = await admin.storage
      .from("videos")
      .upload(finalPath, merged, {
        contentType: contentType || "video/mp4",
        upsert: false,
      });

    if (upErr) {
      console.error("[finalize] upload error", upErr);
      return new Response(JSON.stringify({ error: upErr.message }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    await cleanup();

    return new Response(JSON.stringify({ filePath: finalPath, size: totalSize }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e: any) {
    console.error("[finalize-video-upload] error", e);
    return new Response(JSON.stringify({ error: e?.message || "unknown" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
