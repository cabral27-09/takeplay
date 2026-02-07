-- Atualiza o bucket videos para aceitar application/octet-stream (necessário para chunks temporários)
UPDATE storage.buckets 
SET allowed_mime_types = ARRAY['video/mp4', 'video/webm', 'video/quicktime', 'application/octet-stream']
WHERE id = 'videos';