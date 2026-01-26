import { useState, useEffect, useCallback, RefObject } from 'react';

interface UseAirPlayResult {
  isAvailable: boolean;
  isConnected: boolean;
  showPicker: () => void;
}

export function useAirPlay(videoRef: RefObject<HTMLVideoElement>): UseAirPlayResult {
  const [isAvailable, setIsAvailable] = useState(false);
  const [isConnected, setIsConnected] = useState(false);

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    // Check if AirPlay is supported (Safari/WebKit only)
    const supportsAirPlay = 'webkitShowPlaybackTargetPicker' in video;
    
    if (!supportsAirPlay) {
      console.log('[AirPlay] Not supported in this browser');
      return;
    }

    const handleAvailabilityChanged = (event: Event) => {
      const customEvent = event as CustomEvent<{ availability: string }>;
      const availability = customEvent.detail?.availability || 
        (event as any).availability;
      
      const available = availability === 'available';
      console.log('[AirPlay] Availability changed:', available);
      setIsAvailable(available);
    };

    const handleCurrentPlaybackTargetChanged = () => {
      // Check if we're currently playing on an external device
      const isRemote = (video as any).webkitCurrentPlaybackTargetIsWireless;
      console.log('[AirPlay] Playback target changed, wireless:', isRemote);
      setIsConnected(!!isRemote);
    };

    // Listen for AirPlay availability changes
    video.addEventListener(
      'webkitplaybacktargetavailabilitychanged',
      handleAvailabilityChanged
    );

    // Listen for when the playback target changes
    video.addEventListener(
      'webkitcurrentplaybacktargetiswirelesschanged',
      handleCurrentPlaybackTargetChanged
    );

    // Initial check - assume available if the API exists (Safari will update this)
    setIsAvailable(true);

    return () => {
      video.removeEventListener(
        'webkitplaybacktargetavailabilitychanged',
        handleAvailabilityChanged
      );
      video.removeEventListener(
        'webkitcurrentplaybacktargetiswirelesschanged',
        handleCurrentPlaybackTargetChanged
      );
    };
  }, [videoRef]);

  const showPicker = useCallback(() => {
    const video = videoRef.current;
    if (!video) return;

    if ('webkitShowPlaybackTargetPicker' in video) {
      console.log('[AirPlay] Opening picker');
      (video as any).webkitShowPlaybackTargetPicker();
    }
  }, [videoRef]);

  return {
    isAvailable,
    isConnected,
    showPicker,
  };
}
