import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY");

    if (!supabaseUrl || !supabaseServiceKey || !supabaseAnonKey) {
      console.error("Missing environment variables");
      return new Response(
        JSON.stringify({ error: "Server configuration error" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Get the authorization header
    const authHeader = req.headers.get("Authorization");
    
    // Create admin client for generating signed URLs
    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);

    // Parse request body
    const { movieId, isPreview = false } = await req.json();

    if (!movieId) {
      console.error("Missing movieId in request");
      return new Response(
        JSON.stringify({ error: "Movie ID is required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log(`Processing video URL request for movie: ${movieId}, isPreview: ${isPreview}`);

    // Fetch movie data
    const { data: movie, error: movieError } = await supabaseAdmin
      .from("movies")
      .select("video_url, min_tier, status, title")
      .eq("id", movieId)
      .single();

    if (movieError || !movie) {
      console.error("Movie not found:", movieError);
      return new Response(
        JSON.stringify({ error: "Movie not found" }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (!movie.video_url) {
      console.error("Movie has no video URL");
      return new Response(
        JSON.stringify({ error: "Video not available" }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Extract the video path from the URL or use it directly if it's already a path
    let videoPath = movie.video_url;
    
    console.log(`Original video_url from database: ${movie.video_url}`);
    
    // If it's a full URL, extract the path
    if (videoPath.startsWith('http')) {
      const patterns = [
        '/storage/v1/object/public/manivela_filmes/',
        '/storage/v1/object/sign/manivela_filmes/',
        '/storage/v1/object/public/videos/',
        '/storage/v1/object/sign/videos/',
      ];
      for (const pattern of patterns) {
        if (videoPath.includes(pattern)) {
          videoPath = videoPath.split(pattern)[1]?.split('?')[0] || videoPath;
          break;
        }
      }
    }
    
    // Remove leading slash if present
    if (videoPath.startsWith('/')) {
      videoPath = videoPath.substring(1);
    }

    console.log(`Normalized video path for storage lookup: ${videoPath}`);

    // For preview mode (share page), allow access without auth
    if (isPreview) {
      console.log("Generating preview URL (no auth required)");
      
      // Generate signed URL with 2 hour expiration
      const { data: signedUrlData, error: signedUrlError } = await supabaseAdmin.storage
        .from("manivela_filmes")
        .createSignedUrl(videoPath, 7200); // 2 hours

      if (signedUrlError || !signedUrlData) {
        console.error("Error generating signed URL:", signedUrlError);
        return new Response(
          JSON.stringify({ error: "Failed to generate video URL" }),
          { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      console.log("Preview URL generated successfully");
      return new Response(
        JSON.stringify({ url: signedUrlData.signedUrl, expiresIn: 7200 }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // For full access, require authentication
    if (!authHeader) {
      console.error("No authorization header provided");
      return new Response(
        JSON.stringify({ error: "Authentication required" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Create a client with the user's token to verify authentication
    const supabaseUser = createClient(supabaseUrl, supabaseAnonKey, {
      global: {
        headers: { Authorization: authHeader },
      },
    });

    const { data: { user }, error: userError } = await supabaseUser.auth.getUser();

    if (userError || !user) {
      console.error("User authentication failed:", userError);
      return new Response(
        JSON.stringify({ error: "Invalid authentication" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log(`User authenticated: ${user.id}`);

    // Check subscription status for non-free content
    let hasAccess = true;
    
    if (movie.min_tier !== 'free') {
      hasAccess = false; // Default to no access for paid content
      
      // Tier hierarchy: free=0, standard=1, premium=2
      const tierLevels: Record<string, number> = { free: 0, standard: 1, premium: 2 };
      const movieTierLevel = tierLevels[movie.min_tier] || 0;

      // FIRST: Check for admin-granted subscription (takes priority over Stripe)
      const { data: adminSub, error: adminSubError } = await supabaseAdmin
        .from('admin_subscriptions')
        .select('tier, expires_at, is_active')
        .eq('user_id', user.id)
        .eq('is_active', true)
        .single();

      if (adminSub && !adminSubError) {
        const isExpired = adminSub.expires_at && new Date(adminSub.expires_at) < new Date();
        
        if (!isExpired) {
          const userTierLevel = tierLevels[adminSub.tier] || 0;
          
          if (userTierLevel >= movieTierLevel) {
            console.log(`Admin subscription grants access: ${adminSub.tier} >= ${movie.min_tier}`);
            hasAccess = true;
          } else {
            console.log(`Admin tier ${adminSub.tier} insufficient for movie tier ${movie.min_tier}`);
          }
        } else {
          console.log("Admin subscription expired");
        }
      } else {
        console.log("No active admin subscription found, checking Stripe...");
      }

      // Only check Stripe if admin subscription didn't grant access
      if (!hasAccess) {
        const stripeKey = Deno.env.get("STRIPE_SECRET_KEY");
        
        if (stripeKey && user.email) {
          try {
            // Import Stripe
            const Stripe = (await import("https://esm.sh/stripe@14.21.0")).default;
            const stripe = new Stripe(stripeKey, { apiVersion: "2023-10-16" });

            // Find customer by email
            const customers = await stripe.customers.list({ email: user.email, limit: 1 });
            
            if (customers.data.length > 0) {
              const customer = customers.data[0];
              
              // Check for active subscriptions
              const subscriptions = await stripe.subscriptions.list({
                customer: customer.id,
                status: "active",
                limit: 1,
              });

              if (subscriptions.data.length > 0) {
                // Check the subscription tier from metadata or price
                hasAccess = true;
                console.log(`Stripe subscription grants access`);
              } else {
                console.log("No active Stripe subscription");
              }
            } else {
              console.log("No Stripe customer found for user");
            }
          } catch (stripeError) {
            console.error("Error checking Stripe subscription:", stripeError);
            // Don't block access on Stripe errors, just log
          }
        }
      }
    }

    // For non-subscribed users accessing premium content, deny full access
    if (!hasAccess) {
      console.log("User does not have access to this content tier");
      return new Response(
        JSON.stringify({ error: "Subscription required", requiresSubscription: true }),
        { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Generate signed URL with 2 hour expiration
    const { data: signedUrlData, error: signedUrlError } = await supabaseAdmin.storage
      .from("manivela_filmes")
      .createSignedUrl(videoPath, 7200); // 2 hours

    if (signedUrlError || !signedUrlData) {
      console.error("Error generating signed URL:", signedUrlError);
      return new Response(
        JSON.stringify({ error: "Failed to generate video URL" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log("Signed URL generated successfully");
    return new Response(
      JSON.stringify({ url: signedUrlData.signedUrl, expiresIn: 7200 }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error) {
    console.error("Unexpected error:", error);
    return new Response(
      JSON.stringify({ error: "Internal server error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
