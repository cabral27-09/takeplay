import { useState, useRef, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Play, 
  Pause, 
  Volume2, 
  VolumeX, 
  Maximize, 
  Minimize,
  SkipBack,
  SkipForward,
  ArrowLeft,
  Clock,
  Loader2
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Slider } from '@/components/ui/slider';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { ShareButton } from '@/components/share/ShareButton';
import { useVideoUrl } from '@/hooks/useVideoUrl';

interface VideoPlayerProps {
  movieId: string;
  poster?: string;
  title?: string;
  onBack?: () => void;
  previewMode?: boolean;
  previewDuration?: number; // in seconds
  isSharePage?: boolean;
  onPreviewEnd?: () => void;
}

export function VideoPlayer({ 
  movieId,
  poster, 
  title, 
  onBack,
  previewMode = false,
  previewDuration = 60,
  isSharePage = false,
  onPreviewEnd
}: VideoPlayerProps) {
  const navigate = useNavigate();
  const { user } = useAuth();
  
  // Debug log for preview mode
  console.log('[VideoPlayer] Props:', { movieId, previewMode, previewDuration, isSharePage });
  
  // Fetch signed video URL
  const { url: videoUrl, isLoading: isLoadingUrl, error: urlError } = useVideoUrl({
    movieId,
    isPreview: isSharePage || previewMode,
  });
  
  const videoRef = useRef<HTMLVideoElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [showControls, setShowControls] = useState(true);
  const [progress, setProgress] = useState(0);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [volume, setVolume] = useState(1);
  const [previewEnded, setPreviewEnded] = useState(false);
  const [isCheckingOut, setIsCheckingOut] = useState(false);
  const controlsTimeoutRef = useRef<NodeJS.Timeout>();

  const formatTime = (time: number) => {
    const hours = Math.floor(time / 3600);
    const minutes = Math.floor((time % 3600) / 60);
    const seconds = Math.floor(time % 60);
    
    if (hours > 0) {
      return `${hours}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
    }
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
  };

  const handleMouseMove = useCallback(() => {
    setShowControls(true);
    
    if (controlsTimeoutRef.current) {
      clearTimeout(controlsTimeoutRef.current);
    }
    
    if (isPlaying) {
      controlsTimeoutRef.current = setTimeout(() => {
        setShowControls(false);
      }, 3000);
    }
  }, [isPlaying]);

  const togglePlay = useCallback(() => {
    if (!videoRef.current || previewEnded) return;
    
    if (isPlaying) {
      videoRef.current.pause();
    } else {
      videoRef.current.play();
    }
    setIsPlaying(!isPlaying);
  }, [isPlaying, previewEnded]);

  const toggleMute = useCallback(() => {
    if (!videoRef.current) return;
    videoRef.current.muted = !isMuted;
    setIsMuted(!isMuted);
  }, [isMuted]);

  const toggleFullscreen = useCallback(async () => {
    if (!containerRef.current) return;
    
    try {
      if (!isFullscreen) {
        await containerRef.current.requestFullscreen();
      } else {
        await document.exitFullscreen();
      }
    } catch (error) {
      console.error('Fullscreen error:', error);
    }
  }, [isFullscreen]);

  const handleVolumeChange = useCallback((value: number[]) => {
    if (!videoRef.current) return;
    const newVolume = value[0];
    videoRef.current.volume = newVolume;
    setVolume(newVolume);
    setIsMuted(newVolume === 0);
  }, []);

  const handleProgressChange = useCallback((value: number[]) => {
    if (!videoRef.current) return;
    const newTime = (value[0] / 100) * duration;
    videoRef.current.currentTime = newTime;
    setCurrentTime(newTime);
    setProgress(value[0]);
  }, [duration]);

  const skip = useCallback((seconds: number) => {
    if (!videoRef.current) return;
    videoRef.current.currentTime = Math.max(0, Math.min(duration, videoRef.current.currentTime + seconds));
  }, [duration]);

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    const handleTimeUpdate = () => {
      const time = video.currentTime;
      setCurrentTime(time);
      setProgress((time / video.duration) * 100);
      
      // Check if preview should end
      if (previewMode && time >= previewDuration && !previewEnded) {
        video.pause();
        setIsPlaying(false);
        setPreviewEnded(true);
        setShowControls(true);
      }
    };

    const handleLoadedMetadata = () => {
      setDuration(video.duration);
    };

    const handleEnded = () => {
      setIsPlaying(false);
      setShowControls(true);
    };

    const handleFullscreenChange = () => {
      setIsFullscreen(!!document.fullscreenElement);
    };

    video.addEventListener('timeupdate', handleTimeUpdate);
    video.addEventListener('loadedmetadata', handleLoadedMetadata);
    video.addEventListener('ended', handleEnded);
    document.addEventListener('fullscreenchange', handleFullscreenChange);

    return () => {
      video.removeEventListener('timeupdate', handleTimeUpdate);
      video.removeEventListener('loadedmetadata', handleLoadedMetadata);
      video.removeEventListener('ended', handleEnded);
      document.removeEventListener('fullscreenchange', handleFullscreenChange);
    };
  }, [previewMode, previewDuration, previewEnded]);

  const handleSubscribe = async () => {
    if (!user) {
      navigate("/auth");
      return;
    }

    setIsCheckingOut(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        navigate("/auth");
        return;
      }

      const { data, error } = await supabase.functions.invoke("create-checkout", {
        headers: {
          Authorization: `Bearer ${session.access_token}`,
        },
      });

      if (error) {
        toast.error("Erro ao iniciar checkout");
        console.error("Checkout error:", error);
        return;
      }

      if (data?.url) {
        window.open(data.url, "_blank");
      }
    } catch (error) {
      toast.error("Erro ao processar assinatura");
      console.error("Subscription error:", error);
    } finally {
      setIsCheckingOut(false);
    }
  };

  const handleAuthRedirect = (mode: 'login' | 'signup') => {
    const redirectUrl = movieId ? `/watch/${movieId}` : '/';
    navigate(`/auth?redirect=${encodeURIComponent(redirectUrl)}`);
  };

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      switch (e.key) {
        case ' ':
        case 'k':
          e.preventDefault();
          togglePlay();
          break;
        case 'f':
          e.preventDefault();
          toggleFullscreen();
          break;
        case 'm':
          e.preventDefault();
          toggleMute();
          break;
        case 'ArrowLeft':
          e.preventDefault();
          skip(-10);
          break;
        case 'ArrowRight':
          e.preventDefault();
          skip(10);
          break;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [togglePlay, toggleFullscreen, toggleMute, skip]);

  // Show loading state while fetching URL
  if (isLoadingUrl) {
    return (
      <div className="relative w-full h-full bg-black flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="h-12 w-12 animate-spin text-primary" />
          <p className="text-muted-foreground">Carregando vídeo...</p>
        </div>
      </div>
    );
  }

  // Show error state
  if (urlError && urlError !== 'subscription_required') {
    return (
      <div className="relative w-full h-full bg-black flex items-center justify-center">
        <div className="text-center p-8 max-w-md">
          <h2 className="text-xl font-semibold text-foreground mb-2">
            Erro ao carregar vídeo
          </h2>
          <p className="text-muted-foreground mb-6">{urlError}</p>
          <Button onClick={onBack || (() => navigate(-1))}>Voltar</Button>
        </div>
      </div>
    );
  }

  return (
    <div
      ref={containerRef}
      className="relative w-full h-full bg-black group"
      onMouseMove={handleMouseMove}
      onMouseLeave={() => isPlaying && !previewEnded && setShowControls(false)}
    >
      <video
        ref={videoRef}
        src={videoUrl || undefined}
        poster={poster}
        className="w-full h-full object-contain"
        onClick={togglePlay}
        playsInline
        crossOrigin="anonymous"
        controlsList="nodownload"
        onContextMenu={(e) => e.preventDefault()}
        onError={(e) => {
          const video = e.currentTarget;
          console.error('Video error:', video.error?.message, video.error?.code);
        }}
        onCanPlay={() => console.log('Video can play')}
      />

      {/* Preview Mode Badge */}
      {previewMode && !previewEnded && (
        <div className="absolute top-4 right-4 z-30">
          <div className="flex items-center gap-2 px-3 py-1.5 bg-primary/90 rounded-full text-primary-foreground text-sm font-medium">
            <Clock className="h-4 w-4" />
            <span>Preview: {formatTime(Math.max(0, previewDuration - currentTime))}</span>
          </div>
        </div>
      )}

      {/* Preview Ended Overlay */}
      <AnimatePresence>
        {previewEnded && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 bg-black/90 flex items-center justify-center z-30"
          >
            <div className="text-center p-8 max-w-md">
              <div className="flex justify-center mb-6">
                <div className="p-4 rounded-full bg-primary/20">
                  <Clock className="h-12 w-12 text-primary" />
                </div>
              </div>
              <h2 className="text-2xl font-bold text-foreground mb-2">
                {isSharePage ? 'Gostou do que viu?' : 'Preview Encerrado'}
              </h2>
              <p className="text-muted-foreground mb-6">
                {isSharePage 
                  ? 'Crie sua conta ou faça login para assistir o filme completo!'
                  : user 
                    ? "Assine para continuar assistindo este filme completo."
                    : "Faça login para assistir filmes gratuitos ou assine para acessar o catálogo completo."
                }
              </p>
              <div className="flex flex-col gap-3">
                {isSharePage ? (
                  <>
                    <Button 
                      className="w-full"
                      onClick={() => handleAuthRedirect('signup')}
                    >
                      Criar Conta Grátis
                    </Button>
                    <Button 
                      variant="outline" 
                      className="w-full"
                      onClick={() => handleAuthRedirect('login')}
                    >
                      Fazer Login
                    </Button>
                  </>
                ) : (
                  <>
                    {!user && (
                      <Button 
                        variant="outline" 
                        className="w-full"
                        onClick={() => navigate('/auth')}
                      >
                        Fazer Login
                      </Button>
                    )}
                    <Button 
                      className="w-full"
                      onClick={handleSubscribe}
                      disabled={isCheckingOut}
                    >
                      {isCheckingOut ? "Processando..." : "Assinar Agora"}
                    </Button>
                  </>
                )}
                <button
                  onClick={onBack || (() => navigate(-1))}
                  className="text-sm text-muted-foreground hover:text-foreground transition-colors"
                >
                  Voltar
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Play/Pause Overlay */}
      <AnimatePresence>
        {!isPlaying && showControls && !previewEnded && (
          <motion.div
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.8 }}
            className="absolute inset-0 flex items-center justify-center"
          >
            <button
              onClick={togglePlay}
              className="w-20 h-20 rounded-full bg-primary/90 flex items-center justify-center hover:bg-primary transition-colors"
            >
              <Play className="w-10 h-10 text-primary-foreground ml-1" />
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Controls */}
      <AnimatePresence>
        {showControls && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 pointer-events-none"
          >
            {/* Top gradient */}
            <div className="absolute top-0 left-0 right-0 h-32 bg-gradient-to-b from-black/80 to-transparent" />
            
            {/* Bottom gradient */}
            <div className="absolute bottom-0 left-0 right-0 h-40 bg-gradient-to-t from-black/90 to-transparent" />

            {/* Top bar */}
            <div className="absolute top-0 left-0 right-0 p-4 flex items-center justify-between pointer-events-auto">
              <div className="flex items-center gap-4">
                {onBack ? (
                  <Button variant="ghost" size="icon" onClick={onBack}>
                    <ArrowLeft className="h-6 w-6" />
                  </Button>
                ) : (
                  <Link to="/">
                    <Button variant="ghost" size="icon">
                      <ArrowLeft className="h-6 w-6" />
                    </Button>
                  </Link>
                )}
                {title && (
                  <h1 className="text-lg font-semibold truncate">{title}</h1>
                )}
              </div>
              
              {/* Share button in top bar */}
              {movieId && title && (
                <ShareButton 
                  movieId={movieId} 
                  movieTitle={title} 
                  variant="icon"
                />
              )}
            </div>

            {/* Bottom controls */}
            <div className="absolute bottom-0 left-0 right-0 p-4 space-y-2 pointer-events-auto">
              {/* Progress bar */}
              <Slider
                value={[progress]}
                onValueChange={handleProgressChange}
                max={100}
                step={0.1}
                className="cursor-pointer"
              />

              {/* Controls row */}
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Button variant="ghost" size="icon" onClick={togglePlay}>
                    {isPlaying ? (
                      <Pause className="h-5 w-5" />
                    ) : (
                      <Play className="h-5 w-5" />
                    )}
                  </Button>

                  <Button variant="ghost" size="icon" onClick={() => skip(-10)}>
                    <SkipBack className="h-5 w-5" />
                  </Button>

                  <Button variant="ghost" size="icon" onClick={() => skip(10)}>
                    <SkipForward className="h-5 w-5" />
                  </Button>

                  <div className="flex items-center gap-2 group/volume">
                    <Button variant="ghost" size="icon" onClick={toggleMute}>
                      {isMuted || volume === 0 ? (
                        <VolumeX className="h-5 w-5" />
                      ) : (
                        <Volume2 className="h-5 w-5" />
                      )}
                    </Button>
                    <div className="w-0 overflow-hidden group-hover/volume:w-24 transition-all duration-300">
                      <Slider
                        value={[isMuted ? 0 : volume]}
                        onValueChange={handleVolumeChange}
                        max={1}
                        step={0.01}
                        className="w-24"
                      />
                    </div>
                  </div>

                  <span className="text-sm text-muted-foreground ml-2">
                    {formatTime(currentTime)} / {formatTime(duration)}
                  </span>
                </div>

                <div className="flex items-center gap-2">
                  <Button variant="ghost" size="icon" onClick={toggleFullscreen}>
                    {isFullscreen ? (
                      <Minimize className="h-5 w-5" />
                    ) : (
                      <Maximize className="h-5 w-5" />
                    )}
                  </Button>
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
