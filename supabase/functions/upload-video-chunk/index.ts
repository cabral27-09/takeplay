import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

Deno.serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Get auth token from request
    const authHeader = req.headers.get('authorization');
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: 'Missing authorization header' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Create Supabase client with user's token
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Parse multipart form data
    const formData = await req.formData();
    const uploadId = formData.get('upload_id') as string;
    const chunkIndex = parseInt(formData.get('chunk_index') as string, 10);
    const totalChunks = parseInt(formData.get('total_chunks') as string, 10);
    const chunk = formData.get('chunk') as File;

    if (!uploadId || isNaN(chunkIndex) || !chunk) {
      return new Response(
        JSON.stringify({ error: 'Missing required fields: upload_id, chunk_index, chunk' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`Receiving chunk ${chunkIndex + 1}/${totalChunks} for upload ${uploadId}, size: ${chunk.size} bytes`);

    // Read chunk data
    const chunkData = await chunk.arrayBuffer();

    // Upload chunk to temp folder
    const chunkPath = `temp/${uploadId}/chunk_${String(chunkIndex).padStart(5, '0')}.bin`;
    
    const { error: uploadError } = await supabase.storage
      .from('videos')
      .upload(chunkPath, chunkData, {
        contentType: 'application/octet-stream',
        upsert: true,
      });

    if (uploadError) {
      console.error('Error uploading chunk:', uploadError);
      return new Response(
        JSON.stringify({ error: `Failed to upload chunk: ${uploadError.message}` }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`Chunk ${chunkIndex + 1}/${totalChunks} uploaded successfully to ${chunkPath}`);

    return new Response(
      JSON.stringify({ 
        success: true, 
        chunk_index: chunkIndex,
        total_chunks: totalChunks,
        message: `Chunk ${chunkIndex + 1}/${totalChunks} uploaded` 
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error: unknown) {
    console.error('Unexpected error:', error);
    const message = error instanceof Error ? error.message : 'Internal server error';
    return new Response(
      JSON.stringify({ error: message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
