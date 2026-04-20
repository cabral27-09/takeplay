-- Aumenta o file_size_limit global do storage para 6GB
-- Isso é necessário porque o limite global se aplica antes do limite do bucket
UPDATE storage.buckets SET file_size_limit = 6442450944 WHERE id = 'videos';

-- Garante que o bucket aceita os tipos certos
UPDATE storage.buckets 
SET allowed_mime_types = ARRAY['video/mp4', 'video/webm', 'video/quicktime', 'application/octet-stream']
WHERE id = 'videos';