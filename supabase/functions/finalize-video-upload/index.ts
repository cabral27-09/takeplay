import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { S3Client, CreateMultipartUploadCommand, UploadPartCommand, CompleteMultipartUploadCommand, AbortMultipartUploadCommand } from "https://esm.sh/@aws-sdk/client-s3@3.540.0";

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
    const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const { upload_id, total_chunks, final_path, content_type } = await req.json();

    if (!upload_id || !total_chunks || !final_path) {
      return new Response(
        JSON.stringify({ error: 'Missing required fields: upload_id, total_chunks, final_path' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`Finalizing upload ${upload_id}: ${total_chunks} chunks -> ${final_path}`);

    // Extract project ref from URL (e.g. https://abc.supabase.co -> abc)
    const projectRef = new URL(supabaseUrl).hostname.split('.')[0];

    // Use S3 client with session token auth (Supabase S3 protocol)
    // accessKeyId = project_ref, secretAccessKey = anon_key, sessionToken = service_role JWT
    const s3Client = new S3Client({
      forcePathStyle: true,
      region: 'us-east-1',
      endpoint: `${supabaseUrl}/storage/v1/s3`,
      credentials: {
        accessKeyId: projectRef,
        secretAccessKey: supabaseAnonKey,
        sessionToken: supabaseServiceKey,
      },
    });

    const bucket = 'videos';

    // 1. Initiate multipart upload
    console.log('Initiating S3 multipart upload...');
    const createCmd = new CreateMultipartUploadCommand({
      Bucket: bucket,
      Key: final_path,
      ContentType: content_type || 'video/mp4',
    });
    const createRes = await s3Client.send(createCmd);
    const s3UploadId = createRes.UploadId;

    if (!s3UploadId) {
      throw new Error('Failed to get S3 UploadId');
    }
    console.log(`S3 multipart initiated, UploadId: ${s3UploadId}`);

    // 2. Upload each chunk as a part
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
        await s3Client.send(new AbortMultipartUploadCommand({
          Bucket: bucket,
          Key: final_path,
          UploadId: s3UploadId,
        }));
        return new Response(
          JSON.stringify({ error: `Falha ao baixar chunk ${i}: ${dlError?.message}` }),
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      const chunkBytes = new Uint8Array(await chunkData.arrayBuffer());
      totalSize += chunkBytes.byteLength;

      // Upload as S3 part (1-indexed)
      const partNumber = i + 1;
      const uploadPartCmd = new UploadPartCommand({
        Bucket: bucket,
        Key: final_path,
        UploadId: s3UploadId,
        PartNumber: partNumber,
        Body: chunkBytes,
      });

      const partRes = await s3Client.send(uploadPartCmd);

      if (!partRes.ETag) {
        console.error(`No ETag for part ${partNumber}`);
        await s3Client.send(new AbortMultipartUploadCommand({
          Bucket: bucket,
          Key: final_path,
          UploadId: s3UploadId,
        }));
        return new Response(
          JSON.stringify({ error: `Falha no upload da parte ${partNumber}` }),
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      parts.push({ PartNumber: partNumber, ETag: partRes.ETag });
      console.log(`Part ${partNumber}/${total_chunks} uploaded, ETag: ${partRes.ETag}, size: ${chunkBytes.byteLength}`);
    }

    // 3. Complete multipart upload
    console.log('Completing multipart upload...');
    const completeCmd = new CompleteMultipartUploadCommand({
      Bucket: bucket,
      Key: final_path,
      UploadId: s3UploadId,
      MultipartUpload: {
        Parts: parts.map(p => ({
          PartNumber: p.PartNumber,
          ETag: p.ETag,
        })),
      },
    });

    await s3Client.send(completeCmd);
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
    const message = error instanceof Error ? error.message : 'Erro interno do servidor';
    return new Response(
      JSON.stringify({ error: message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
