import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get('authorization');
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: 'Missing authorization header' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const { upload_id, total_chunks, final_path, content_type } = await req.json();

    if (!upload_id || !total_chunks || !final_path) {
      return new Response(
        JSON.stringify({ error: 'Missing required fields: upload_id, total_chunks, final_path' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`Finalizing upload ${upload_id}: ${total_chunks} chunks -> ${final_path}`);

    // --- S3 Multipart Upload via Supabase Storage S3 endpoint ---
    const s3Endpoint = `${supabaseUrl}/storage/v1/s3`;
    const bucket = 'videos';

    // Helper to make S3-like requests with service role auth
    const s3Fetch = async (path: string, options: RequestInit = {}) => {
      const headers = new Headers(options.headers || {});
      headers.set('Authorization', `Bearer ${supabaseServiceKey}`);
      return fetch(`${s3Endpoint}${path}`, { ...options, headers });
    };

    // 1. Initiate multipart upload
    const initRes = await s3Fetch(`/${bucket}/${final_path}?uploads`, {
      method: 'POST',
      headers: { 'Content-Type': content_type || 'video/mp4' },
    });

    if (!initRes.ok) {
      const errText = await initRes.text();
      console.error('S3 initiate multipart error:', initRes.status, errText);
      return new Response(
        JSON.stringify({ error: `Failed to initiate multipart upload: ${errText}` }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const initXml = await initRes.text();
    // Parse UploadId from XML response
    const uploadIdMatch = initXml.match(/<UploadId>(.+?)<\/UploadId>/);
    if (!uploadIdMatch) {
      console.error('Failed to parse UploadId from:', initXml);
      return new Response(
        JSON.stringify({ error: 'Failed to parse multipart UploadId' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }
    const s3UploadId = uploadIdMatch[1];
    console.log(`S3 multipart initiated, UploadId: ${s3UploadId}`);

    // 2. Upload each chunk as a part (one at a time to save memory)
    const parts: Array<{ PartNumber: number; ETag: string }> = [];
    let totalSize = 0;

    for (let i = 0; i < total_chunks; i++) {
      const chunkPath = `temp/${upload_id}/chunk_${String(i).padStart(5, '0')}.bin`;

      console.log(`Processing chunk ${i + 1}/${total_chunks}: ${chunkPath}`);

      // Download chunk from temp storage
      const { data: chunkData, error: dlError } = await supabase.storage
        .from('videos')
        .download(chunkPath);

      if (dlError || !chunkData) {
        console.error(`Error downloading chunk ${i}:`, dlError);
        // Abort the multipart upload
        await s3Fetch(`/${bucket}/${final_path}?uploadId=${encodeURIComponent(s3UploadId)}`, {
          method: 'DELETE',
        });
        return new Response(
          JSON.stringify({ error: `Failed to download chunk ${i}: ${dlError?.message}` }),
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      const chunkBytes = await chunkData.arrayBuffer();
      totalSize += chunkBytes.byteLength;

      // Upload as S3 part (part numbers are 1-indexed)
      const partNumber = i + 1;
      const partRes = await s3Fetch(
        `/${bucket}/${final_path}?partNumber=${partNumber}&uploadId=${encodeURIComponent(s3UploadId)}`,
        {
          method: 'PUT',
          body: chunkBytes,
          headers: { 'Content-Type': 'application/octet-stream' },
        }
      );

      if (!partRes.ok) {
        const errText = await partRes.text();
        console.error(`Error uploading part ${partNumber}:`, errText);
        await s3Fetch(`/${bucket}/${final_path}?uploadId=${encodeURIComponent(s3UploadId)}`, {
          method: 'DELETE',
        });
        return new Response(
          JSON.stringify({ error: `Failed to upload part ${partNumber}: ${errText}` }),
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      const etag = partRes.headers.get('ETag') || '';
      parts.push({ PartNumber: partNumber, ETag: etag });

      console.log(`Part ${partNumber}/${total_chunks} uploaded, ETag: ${etag}, size: ${chunkBytes.byteLength}`);
    }

    // 3. Complete multipart upload
    const completeXml = `<CompleteMultipartUpload>${parts.map(p =>
      `<Part><PartNumber>${p.PartNumber}</PartNumber><ETag>${p.ETag}</ETag></Part>`
    ).join('')}</CompleteMultipartUpload>`;

    const completeRes = await s3Fetch(
      `/${bucket}/${final_path}?uploadId=${encodeURIComponent(s3UploadId)}`,
      {
        method: 'POST',
        body: completeXml,
        headers: { 'Content-Type': 'application/xml' },
      }
    );

    if (!completeRes.ok) {
      const errText = await completeRes.text();
      console.error('Error completing multipart:', errText);
      return new Response(
        JSON.stringify({ error: `Failed to complete multipart upload: ${errText}` }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`S3 multipart completed for ${final_path}, total size: ${totalSize} bytes`);

    // 4. Clean up temp chunks
    console.log(`Cleaning up temp chunks for ${upload_id}...`);
    const deletePromises = [];
    for (let i = 0; i < total_chunks; i++) {
      const chunkPath = `temp/${upload_id}/chunk_${String(i).padStart(5, '0')}.bin`;
      deletePromises.push(supabase.storage.from('videos').remove([chunkPath]));
    }
    await Promise.all(deletePromises);
    console.log(`Temp chunks cleaned up for ${upload_id}`);

    return new Response(
      JSON.stringify({
        success: true,
        path: final_path,
        size: totalSize,
        message: 'Video upload finalized successfully via S3 multipart',
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
