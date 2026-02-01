-- Aumentar limite do bucket videos para 6GB (6.442.450.944 bytes)
UPDATE storage.buckets 
SET file_size_limit = 6442450944 
WHERE id = 'videos';