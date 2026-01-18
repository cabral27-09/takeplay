import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

interface UseVideoUrlOptions {
  movieId: string | undefined;
  isPreview?: boolean;
}

interface UseVideoUrlResult {
  url: string | null;
  isLoading: boolean;
  error: string | null;
  refetch: () => Promise<void>;
}

export function useVideoUrl({ movieId, isPreview = false }: UseVideoUrlOptions): UseVideoUrlResult {
  const [url, setUrl] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { user } = useAuth();

  const fetchUrl = useCallback(async () => {
    if (!movieId) {
      setIsLoading(false);
      setError('Movie ID is required');
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
      };

      // Add auth header if user is logged in
      if (user) {
        const { data: { session } } = await supabase.auth.getSession();
        if (session?.access_token) {
          headers['Authorization'] = `Bearer ${session.access_token}`;
        }
      }

      const { data, error: fnError } = await supabase.functions.invoke('get-video-url', {
        body: { movieId, isPreview },
        headers,
      });

      if (fnError) {
        console.error('Error fetching video URL:', fnError);
        setError('Não foi possível carregar o vídeo');
        setUrl(null);
        return;
      }

      if (data?.error) {
        console.error('Video URL error:', data.error);
        if (data.requiresSubscription) {
          setError('subscription_required');
        } else {
          setError(data.error);
        }
        setUrl(null);
        return;
      }

      if (data?.url) {
        setUrl(data.url);
        setError(null);

        // Schedule refresh before expiration (refresh 5 minutes before expiry)
        if (data.expiresIn) {
          const refreshTime = (data.expiresIn - 300) * 1000; // 5 minutes before expiry
          setTimeout(() => {
            fetchUrl();
          }, refreshTime);
        }
      }
    } catch (err) {
      console.error('Unexpected error fetching video URL:', err);
      setError('Erro ao carregar vídeo');
      setUrl(null);
    } finally {
      setIsLoading(false);
    }
  }, [movieId, isPreview, user]);

  useEffect(() => {
    fetchUrl();
  }, [fetchUrl]);

  return {
    url,
    isLoading,
    error,
    refetch: fetchUrl,
  };
}
