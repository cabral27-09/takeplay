import { corsHeaders } from 'npm:@supabase/supabase-js@2/cors'
import { createClient } from 'npm:@supabase/supabase-js@2'

// @ts-ignore
declare const EdgeRuntime: { waitUntil: (p: Promise<unknown>) => void }

async function migrateOne(path: string, bucket: string) {
  const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!
  const SERVICE_ROLE = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
  const EXT_URL = Deno.env.get('EXTERNAL_VIDEO_SUPABASE_URL')!
  const EXT_KEY = Deno.env.get('EXTERNAL_VIDEO_SUPABASE_ANON_KEY')!
  const cleanBase = EXT_URL.replace(/\/rest\/v1\/?$/, '').replace(/\/+$/, '')

  const src = createClient(SUPABASE_URL, SERVICE_ROLE)
  const { data: signed, error: signErr } = await src.storage
    .from('videos').createSignedUrl(path, 60 * 60 * 6)
  if (signErr || !signed) {
    console.error(`[${path}] sign error`, signErr?.message)
    return
  }

  const dl = await fetch(signed.signedUrl)
  if (!dl.ok || !dl.body) {
    console.error(`[${path}] download ${dl.status}`)
    return
  }
  const contentType = dl.headers.get('content-type') || 'video/mp4'
  const contentLength = dl.headers.get('content-length') || undefined

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
    console.error(`[${path}] upload ${up.status}: ${txt.slice(0, 300)}`)
    return
  }
  console.log(`[${path}] OK`)
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })

  try {
    const body = await req.json().catch(() => ({}))
    if (body?.confirm !== 'MIGRATE_NOW') {
      return new Response(JSON.stringify({ error: 'forbidden' }), {
        status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!
    const SERVICE_ROLE = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    const EXT_URL = Deno.env.get('EXTERNAL_VIDEO_SUPABASE_URL')!
    const EXT_KEY = Deno.env.get('EXTERNAL_VIDEO_SUPABASE_ANON_KEY')!
    const cleanBase = EXT_URL.replace(/\/rest\/v1\/?$/, '').replace(/\/+$/, '')
    const bucket = (body?.bucket as string) || 'manivela_filmes'

    // Mode: list destination bucket contents (progress check)
    if (body?.mode === 'list-dest') {
      const r = await fetch(`${cleanBase}/storage/v1/object/list/${bucket}`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${EXT_KEY}`,
          apikey: EXT_KEY,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ prefix: 'movies/', limit: 200, offset: 0 }),
      })
      const txt = await r.text()
      return new Response(txt, { status: r.status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
    }

    // Mode: migrate ALL movies/ from source bucket, in background
    if (body?.mode === 'migrate-all') {
      const src = createClient(SUPABASE_URL, SERVICE_ROLE)
      const { data: files, error } = await src.storage.from('videos').list('movies', { limit: 1000 })
      if (error) throw error
      const paths = (files || []).filter(f => f.name && !f.name.endsWith('/')).map(f => `movies/${f.name}`)
      EdgeRuntime.waitUntil((async () => {
        for (const p of paths) {
          try { await migrateOne(p, bucket) } catch (e) { console.error('mig err', p, e) }
        }
        console.log('migrate-all DONE', paths.length)
      })())
      return new Response(JSON.stringify({ ok: true, scheduled: paths.length, paths }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    // Mode: single file (background)
    const path = body?.path as string | undefined
    if (!path) {
      return new Response(JSON.stringify({ error: 'path required' }), {
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }
    EdgeRuntime.waitUntil(migrateOne(path, bucket))
    return new Response(JSON.stringify({ ok: true, scheduled: path }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  } catch (e) {
    return new Response(JSON.stringify({ error: String((e as any)?.message ?? e) }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }
})
