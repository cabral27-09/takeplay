-- Tornar o bucket de vídeos privado
UPDATE storage.buckets 
SET public = false 
WHERE id = 'videos';

-- Remover política pública (se existir)
DROP POLICY IF EXISTS "Anyone can view videos" ON storage.objects;

-- Política para usuários autenticados verem vídeos
CREATE POLICY "Authenticated users can view videos"
ON storage.objects FOR SELECT
TO authenticated
USING (bucket_id = 'videos');

-- Política para produtores/admins fazerem upload
DROP POLICY IF EXISTS "Producers can upload videos" ON storage.objects;
CREATE POLICY "Producers can upload videos"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'videos' 
  AND (has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'producer'))
);

-- Política para produtores/admins atualizarem vídeos
DROP POLICY IF EXISTS "Producers can update videos" ON storage.objects;
CREATE POLICY "Producers can update videos"
ON storage.objects FOR UPDATE
TO authenticated
USING (
  bucket_id = 'videos' 
  AND (has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'producer'))
);

-- Política para produtores/admins deletarem vídeos
DROP POLICY IF EXISTS "Producers can delete videos" ON storage.objects;
CREATE POLICY "Producers can delete videos"
ON storage.objects FOR DELETE
TO authenticated
USING (
  bucket_id = 'videos' 
  AND (has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'producer'))
);