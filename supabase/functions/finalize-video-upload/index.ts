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

    // Create Supabase client with service role for storage operations
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Parse request body
    const { upload_id, total_chunks, final_path, content_type } = await req.json();

    if (!upload_id || !total_chunks || !final_path) {
      return new Response(
        JSON.stringify({ error: 'Missing required fields: upload_id, total_chunks, final_path' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`Finalizing upload ${upload_id}: ${total_chunks} chunks -> ${final_path}`);

    // Download and concatenate all chunks
    const chunks: Uint8Array[] = [];
    let totalSize = 0;

    for (let i = 0; i < total_chunks; i++) {
      const chunkPath = `temp/${upload_id}/chunk_${String(i).padStart(5, '0')}.bin`;
      
      console.log(`Downloading chunk ${i + 1}/${total_chunks}: ${chunkPath}`);
      
      const { data, error } = await supabase.storage
        .from('videos')
        .download(chunkPath);

      if (error || !data) {
        console.error(`Error downloading chunk ${i}:`, error);
        return new Response(
          JSON.stringify({ error: `Failed to download chunk ${i}: ${error?.message}` }),
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      const chunkData = new Uint8Array(await data.arrayBuffer());
      chunks.push(chunkData);
      totalSize += chunkData.length;
      
      console.log(`Chunk ${i + 1}/${total_chunks} downloaded: ${chunkData.length} bytes`);
    }

    console.log(`All chunks downloaded. Total size: ${totalSize} bytes (${(totalSize / (1024 * 1024 * 1024)).toFixed(2)} GB)`);

    // Concatenate all chunks into a single buffer
    const finalBuffer = new Uint8Array(totalSize);
    let offset = 0;
    for (const chunk of chunks) {
      finalBuffer.set(chunk, offset);
      offset += chunk.length;
    }

    console.log(`Uploading final file to ${final_path}...`);

    // Upload the final concatenated file
    const { error: uploadError } = await supabase.storage
      .from('videos')
      .upload(final_path, finalBuffer, {
        contentType: content_type || 'video/mp4',
        upsert: true,
      });

    if (uploadError) {
      console.error('Error uploading final file:', uploadError);
      return new Response(
        JSON.stringify({ error: `Failed to upload final file: ${uploadError.message}` }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`Final file uploaded successfully to ${final_path}`);

    // Clean up temp chunks
    console.log(`Cleaning up temp chunks for ${upload_id}...`);
    
    const deletePromises = [];
    for (let i = 0; i < total_chunks; i++) {
      const chunkPath = `temp/${upload_id}/chunk_${String(i).padStart(5, '0')}.bin`;
      deletePromises.push(
        supabase.storage.from('videos').remove([chunkPath])
      );
    }

    await Promise.all(deletePromises);
    console.log(`Temp chunks cleaned up for ${upload_id}`);

    return new Response(
      JSON.stringify({ 
        success: true, 
        path: final_path,
        size: totalSize,
        message: 'Video upload finalized successfully'
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
