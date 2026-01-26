import { useState, useEffect, useCallback, RefObject } from 'react';

// Simplified Cast SDK types - we use 'any' to avoid conflicts with external type definitions
interface UseChromecastResult {
  isAvailable: boolean;
  isConnected: boolean;
  deviceName: string | null;
  startCasting: (videoUrl: string, title?: string) => void;
  stopCasting: () => void;
  requestSession: () => void;
}

// Access global chrome.cast without TypeScript conflicts
const getChromeCast = (): any => {
  return (window as any).chrome?.cast;
};

export function useChromecast(videoRef: RefObject<HTMLVideoElement>): UseChromecastResult {
  const [isAvailable, setIsAvailable] = useState(false);
  const [isConnected, setIsConnected] = useState(false);
  const [deviceName, setDeviceName] = useState<string | null>(null);
  const [session, setSession] = useState<any>(null);

  useEffect(() => {
    const initializeCast = () => {
      const cast = getChromeCast();
      if (!cast) {
        console.log('[Chromecast] SDK not loaded');
        return;
      }

      try {
        const sessionRequest = new cast.SessionRequest(
          cast.media.DEFAULT_MEDIA_RECEIVER_APP_ID
        );

        const apiConfig = new cast.ApiConfig(
          sessionRequest,
          (newSession: any) => {
            console.log('[Chromecast] Session started:', newSession.receiver.friendlyName);
            setSession(newSession);
            setIsConnected(true);
            setDeviceName(newSession.receiver.friendlyName);
          },
          (availability: string) => {
            console.log('[Chromecast] Receiver availability:', availability);
            setIsAvailable(availability === cast.ReceiverAvailability.AVAILABLE);
          }
        );

        cast.initialize(
          apiConfig,
          () => {
            console.log('[Chromecast] Initialized successfully');
          },
          (error: any) => {
            console.error('[Chromecast] Initialization error:', error);
          }
        );
      } catch (e) {
        console.error('[Chromecast] Setup error:', e);
      }
    };

    // Set up callback for when Cast API becomes available
    (window as any).__onGCastApiAvailable = (isLoaded: boolean) => {
      if (isLoaded) {
        initializeCast();
      }
    };

    // If already loaded, initialize immediately
    if (getChromeCast()) {
      initializeCast();
    }

    return () => {
      (window as any).__onGCastApiAvailable = undefined;
    };
  }, []);

  const requestSession = useCallback(() => {
    const cast = getChromeCast();
    if (!cast) {
      console.log('[Chromecast] SDK not available');
      return;
    }

    cast.requestSession(
      (newSession: any) => {
        console.log('[Chromecast] Session requested:', newSession.receiver.friendlyName);
        setSession(newSession);
        setIsConnected(true);
        setDeviceName(newSession.receiver.friendlyName);
      },
      (error: any) => {
        if (error.code !== 'cancel') {
          console.error('[Chromecast] Request session error:', error);
        }
      }
    );
  }, []);

  const startCasting = useCallback((videoUrl: string, title?: string) => {
    const cast = getChromeCast();
    if (!session || !cast) {
      console.log('[Chromecast] No active session or SDK not available');
      return;
    }

    try {
      const mediaInfo = new cast.media.MediaInfo(videoUrl, 'video/mp4');
      
      if (title) {
        mediaInfo.metadata = new cast.media.GenericMediaMetadata();
        mediaInfo.metadata.title = title;
      }

      const request = new cast.media.LoadRequest(mediaInfo);

      session.loadMedia(
        request,
        (media: any) => {
          console.log('[Chromecast] Media loaded:', media);
          
          // Pause local video when casting
          if (videoRef.current) {
            videoRef.current.pause();
          }
        },
        (error: any) => {
          console.error('[Chromecast] Load media error:', error);
        }
      );
    } catch (e) {
      console.error('[Chromecast] Start casting error:', e);
    }
  }, [session, videoRef]);

  const stopCasting = useCallback(() => {
    if (session) {
      session.stop(
        () => {
          console.log('[Chromecast] Session stopped');
          setSession(null);
          setIsConnected(false);
          setDeviceName(null);
        },
        (error: any) => {
          console.error('[Chromecast] Stop session error:', error);
        }
      );
    }
  }, [session]);

  return {
    isAvailable,
    isConnected,
    deviceName,
    startCasting,
    stopCasting,
    requestSession,
  };
}
