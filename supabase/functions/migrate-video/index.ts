import { corsHeaders } from 'npm:@supabase/supabase-js@2/cors'
import { createClient } from 'npm:@supabase/supabase-js@2'

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })

  try {
    const body0 = await req.clone().json().catch(() => ({}))
    if (body0?.confirm !== 'MIGRATE_NOW') {
      return new Response(JSON.stringify({ error: 'forbidden' }), {
        status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const body = await req.json().catch(() => ({}))
    const path = body?.path as string | undefined
    if (!path) {
      return new Response(JSON.stringify({ error: 'path required' }), {
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!
    const SERVICE_ROLE = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    const EXT_URL = Deno.env.get('EXTERNAL_VIDEO_SUPABASE_URL')!
    const EXT_KEY = Deno.env.get('EXTERNAL_VIDEO_SUPABASE_ANON_KEY')!

    if (body0?.mode === 'list-buckets') {
      const cleanBase = EXT_URL.replace(/\/rest\/v1\/?$/, '').replace(/\/+$/, '')
      const r = await fetch(`${cleanBase}/storage/v1/bucket`, {
        headers: { Authorization: `Bearer ${EXT_KEY}`, apikey: EXT_KEY },
      })
      const txt = await r.text()
      return new Response(JSON.stringify({ status: r.status, ext_url_raw: EXT_URL, host: new URL(cleanBase).host, pathname: new URL(cleanBase).pathname, body: txt }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }



    // 1) Signed URL from old bucket (this project)
    const src = createClient(SUPABASE_URL, SERVICE_ROLE)
    const { data: signed, error: signErr } = await src.storage
      .from('videos')
      .createSignedUrl(path, 60 * 60)
    if (signErr || !signed) throw new Error(`sign: ${signErr?.message}`)

    // 2) Stream-download
    const dl = await fetch(signed.signedUrl)
    if (!dl.ok || !dl.body) throw new Error(`download: ${dl.status}`)
    const contentType = dl.headers.get('content-type') || 'video/mp4'
    const contentLength = dl.headers.get('content-length') || undefined

    // 3) Stream-upload to external bucket via Storage REST
    const cleanBase = EXT_URL.replace(/\/+$/, '')
    const bucket = (body?.bucket as string) || 'manivela_filmes'
    const uploadUrl = `${cleanBase}/storage/v1/object/${bucket}/${path}`
    const up = await fetch(uploadUrl, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${EXT_KEY}`,
        apikey: EXT_KEY,
        'Content-Type': contentType,
        'x-upsert': 'true',
        ...(contentLength ? { 'Content-Length': contentLength } : {}),
      },
      body: dl.body,
      // @ts-ignore Deno fetch streaming body
      duplex: 'half',
    })

    if (!up.ok) {
      const txt = await up.text()
      throw new Error(`upload ${up.status} to ${uploadUrl.replace(cleanBase, '<EXT>')}: ${txt}`)
    }

    return new Response(JSON.stringify({ ok: true, path }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  } catch (e) {
    return new Response(JSON.stringify({ error: String(e?.message ?? e) }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }
})
