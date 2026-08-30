import { createClient } from "https://esm.sh/@supabase/supabase-js@2.58.0";
import { corsHeaders } from "npm:@supabase/supabase-js@2/cors";

// One-off maintenance endpoint. Guarded by a static token and removed after use.
const PURGE_TOKEN = "8f42b1c3-purge-legacy-2026-08-30";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  if (req.headers.get("x-purge-token") !== PURGE_TOKEN) {
    return new Response(JSON.stringify({ error: "forbidden" }), {
      status: 403,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
  );

  const buckets: string[] = ["videos", "movie-images"];
  const report: Record<string, { deleted: number; errors: string[] }> = {};

  for (const bucket of buckets) {
    const result = { deleted: 0, errors: [] as string[] };

    const walk = async (prefix: string) => {
      let offset = 0;
      // Collect entries page by page
      while (true) {
        const { data, error } = await supabase.storage
          .from(bucket)
          .list(prefix, { limit: 100, offset });
        if (error) {
          result.errors.push(`${prefix}: ${error.message}`);
          return;
        }
        if (!data || data.length === 0) return;

        const files: string[] = [];
        const folders: string[] = [];
        for (const item of data) {
          const path = prefix ? `${prefix}/${item.name}` : item.name;
          if (item.id === null) folders.push(path);
          else files.push(path);
        }

        if (files.length > 0) {
          const { error: delErr } = await supabase.storage.from(bucket).remove(files);
          if (delErr) result.errors.push(`remove ${prefix}: ${delErr.message}`);
          else result.deleted += files.length;
        }

        for (const folder of folders) await walk(folder);

        if (files.length > 0) {
          // deleted files disappear from the listing, restart at same offset
          continue;
        }
        offset += data.length;
      }
    };

    await walk("");
    report[bucket] = result;
  }

  return new Response(JSON.stringify(report), {
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
});
