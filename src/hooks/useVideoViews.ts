import { useRef, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

export function useVideoViews(movieId: string | undefined) {
  const { user } = useAuth();
  const accumulatedRef = useRef(0);
  const lastSendRef = useRef(0);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const activeRef = useRef(false);

  const sendView = useCallback(async (seconds: number) => {
    if (!movieId || !user) return;
    try {
      await supabase.functions.invoke('record-view', {
        body: { movieId, watchedSeconds: Math.floor(seconds) },
      });
    } catch (e) {
      console.error('[useVideoViews] send error:', e);
    }
  }, [movieId, user]);

  const startView = useCallback(() => {
    if (!movieId || !user || activeRef.current) return;
    activeRef.current = true;
    accumulatedRef.current = 0;
    lastSendRef.current = 0;
    sendView(0);

    // Send updates every 30 seconds
    intervalRef.current = setInterval(() => {
      if (accumulatedRef.current > lastSendRef.current) {
        sendView(accumulatedRef.current);
        lastSendRef.current = accumulatedRef.current;
      }
    }, 30000);
  }, [movieId, user, sendView]);

  const updateSeconds = useCallback((seconds: number) => {
    accumulatedRef.current = seconds;
  }, []);

  const stopView = useCallback(() => {
    if (!activeRef.current) return;
    activeRef.current = false;
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
    // Send final update
    if (accumulatedRef.current > lastSendRef.current) {
      sendView(accumulatedRef.current);
    }
  }, [movieId]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      stopView();
    };
  }, [stopView]);

  return { startView, updateSeconds, stopView };
}
