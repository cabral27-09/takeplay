update storage.buckets
set file_size_limit = 6442450944,
    allowed_mime_types = array[
      'video/mp4',
      'video/webm',
      'video/quicktime',
      'video/x-msvideo',
      'video/mpeg',
      'video/x-matroska',
      'application/octet-stream'
    ]
where id = 'videos';