import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    // Validate auth
    const authHeader = req.headers.get('Authorization')
    if (!authHeader?.startsWith('Bearer ')) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

    const supabaseAuth = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_ANON_KEY')!,
      { global: { headers: { Authorization: authHeader } } }
    )

    const token = authHeader.replace('Bearer ', '')
    const { data: claimsData, error: claimsError } = await supabaseAuth.auth.getClaims(token)
    if (claimsError || !claimsData?.claims) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }
    const userId = claimsData.claims.sub as string

    // Parse body
    const { movieId, watchedSeconds } = await req.json()
    if (!movieId || typeof watchedSeconds !== 'number') {
      return new Response(JSON.stringify({ error: 'movieId and watchedSeconds required' }), {
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

    // Service role client for DB operations
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    )

    // Fetch movie data and user profile in parallel
    const [movieResult, profileResult] = await Promise.all([
      supabase.from('movies').select('producer_name, duration').eq('id', movieId).single(),
      supabase.from('profiles').select('full_name').eq('id', userId).single(),
    ])

    if (movieResult.error || !movieResult.data) {
      return new Response(JSON.stringify({ error: 'Movie not found' }), {
        status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

    const movie = movieResult.data
    const userFullName = profileResult.data?.full_name || ''

    // Detect own view
    const isOwnView = !!(movie.producer_name && userFullName && movie.producer_name === userFullName)

    // Rate limit: max 20 valid views per user per day
    const today = new Date().toISOString().split('T')[0]
    const { count: todayCount } = await supabase
      .from('video_views')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', userId)
      .eq('view_date', today)

    if ((todayCount || 0) > 20 && watchedSeconds === 0) {
      return new Response(JSON.stringify({ error: 'Daily view limit reached' }), {
        status: 429, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

    // Determine counted and completed
    const counted = watchedSeconds >= 60 && !isOwnView
    const completed = movie.duration ? watchedSeconds >= (movie.duration * 60 * 0.9) : false

    // Upsert using unique constraint (user_id, movie_id, view_date)
    const { error: upsertError } = await supabase
      .from('video_views')
      .upsert(
        {
          user_id: userId,
          movie_id: movieId,
          view_date: today,
          producer_name: movie.producer_name,
          watched_seconds: watchedSeconds,
          completed,
          counted,
          is_own_view: isOwnView,
          flagged: false,
          updated_at: new Date().toISOString(),
        },
        { onConflict: 'user_id,movie_id,view_date' }
      )

    if (upsertError) {
      console.error('Upsert error:', upsertError)
      return new Response(JSON.stringify({ error: 'Failed to record view' }), {
        status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

    return new Response(JSON.stringify({ success: true, isOwnView, counted, completed }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    })

  } catch (error) {
    console.error('record-view error:', error)
    return new Response(JSON.stringify({ error: 'Internal server error' }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    })
  }
})
