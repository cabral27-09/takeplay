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
    const { data: userData, error: authErr } = await supabaseAuth.auth.getUser(token);
    if (authErr || !userData?.user?.id) {
      return new Response(JSON.stringify({ error: "Invalid token" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const userId = userData.user.id;

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

    const ext = String(fileName).split(".").pop() || "mp4";
    const finalPath = `movies/${Date.now()}-${Math.random().toString(36).substring(2)}.${ext}`;
    const finalContentType = contentType || "video/mp4";

    // Calcula tamanho total a partir da listagem (necessário para Content-Length)
    const { data: listing, error: listErr } = await admin.storage
      .from("videos")
      .list(tmpPrefix, { limit: 10000 });
    if (listErr || !listing) {
      console.error("[finalize] list error", listErr);
      return new Response(JSON.stringify({ error: "Falha ao listar chunks" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const sizesByName = new Map<string, number>();
    let totalSize = 0;
    for (const f of listing) {
      const sz = (f as any)?.metadata?.size ?? 0;
      sizesByName.set(f.name, sz);
      totalSize += sz;
    }

    // Verifica que todos os chunks esperados estão presentes
    for (let i = 0; i < totalChunks; i++) {
      const name = `${String(i).padStart(6, "0")}.part`;
      if (!sizesByName.has(name)) {
        console.error("[finalize] missing chunk", name);
        return new Response(JSON.stringify({ error: `Chunk ${i} ausente` }), {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
    }

    console.log(`[finalize] streaming ${totalChunks} chunks, total=${totalSize} bytes -> ${finalPath}`);

    // Stream que baixa um chunk por vez e libera memória entre chunks
    let streamErr: Error | null = null;
    const stream = new ReadableStream<Uint8Array>({
      async pull(controller) {
        // Vai enfileirar tudo de uma vez via async iteration; usamos start em vez disso
      },
      async start(controller) {
        try {
          for (let i = 0; i < totalChunks; i++) {
            const partPath = `${tmpPrefix}/${String(i).padStart(6, "0")}.part`;
            const { data, error } = await admin.storage.from("videos").download(partPath);
            if (error || !data) {
              throw new Error(`Falha ao baixar chunk ${i}: ${error?.message || "sem dados"}`);
            }
            // Stream do Blob direto para o controller, sem materializar tudo
            const reader = data.stream().getReader();
            while (true) {
              const { done, value } = await reader.read();
              if (done) break;
              if (value) controller.enqueue(value);
            }
          }
          controller.close();
        } catch (e: any) {
          streamErr = e;
          console.error("[finalize] stream error", e);
          controller.error(e);
        }
      },
    });

    // Upload direto via REST do Storage usando o stream como body
    const uploadUrl = `${SUPABASE_URL}/storage/v1/object/videos/${finalPath}`;
    const resp = await fetch(uploadUrl, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${SERVICE_ROLE}`,
        apikey: SERVICE_ROLE,
        "Content-Type": finalContentType,
        "Content-Length": String(totalSize),
        "x-upsert": "false",
        "cache-control": "3600",
      },
      body: stream,
      // @ts-ignore - Deno fetch suporta duplex
      duplex: "half",
    });

    if (!resp.ok) {
      const txt = await resp.text().catch(() => "");
      console.error("[finalize] storage upload failed", resp.status, txt, streamErr);
      return new Response(
        JSON.stringify({ error: `Upload final falhou (${resp.status}): ${txt || streamErr?.message || "erro"}` }),
        {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }
    await resp.text().catch(() => "");

    await cleanup();

    console.log(`[finalize] done ${finalPath} size=${totalSize}`);
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
