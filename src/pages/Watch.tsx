import { useParams, Link, useNavigate } from 'react-router-dom';
import { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  ArrowLeft, 
  Play, 
  Pause, 
  Volume2, 
  VolumeX, 
  Maximize, 
  Minimize,
  SkipBack,
  SkipForward,
  Clock
} from 'lucide-react';
import { useMovie } from '@/hooks/useMovies';
import { cn } from '@/lib/utils';
import { SubscriptionGate } from '@/components/subscription/SubscriptionGate';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import type { MovieWithGenres } from '@/types/movie';

const PREVIEW_DURATION = 60; // 1 minute in seconds

interface WatchContentProps {
  movie: MovieWithGenres;
  previewMode?: boolean;
}

const WatchContent = ({ movie, previewMode = false }: WatchContentProps) => {
  const navigate = useNavigate();
  const { user } = useAuth();
  
  const [isPlaying, setIsPlaying] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [showControls, setShowControls] = useState(true);
  const [progress, setProgress] = useState(0);
  const [currentTime, setCurrentTime] = useState(0);
  const [previewEnded, setPreviewEnded] = useState(false);
  const [isCheckingOut, setIsCheckingOut] = useState(false);
  
  const containerRef = useRef<HTMLDivElement>(null);
  const hideControlsTimeout = useRef<NodeJS.Timeout>();

  useEffect(() => {
    const handleMouseMove = () => {
      setShowControls(true);
      if (hideControlsTimeout.current) {
        clearTimeout(hideControlsTimeout.current);
      }
      hideControlsTimeout.current = setTimeout(() => {
        if (isPlaying && !previewEnded) {
          setShowControls(false);
        }
      }, 3000);
    };

    window.addEventListener('mousemove', handleMouseMove);
    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      if (hideControlsTimeout.current) {
        clearTimeout(hideControlsTimeout.current);
      }
    };
  }, [isPlaying, previewEnded]);

  // Simulate progress for demo
  useEffect(() => {
    if (isPlaying && !previewEnded) {
      const interval = setInterval(() => {
        setProgress(prev => {
          if (prev >= 100) {
            setIsPlaying(false);
            return 100;
          }
          return prev + 0.1;
        });
        setCurrentTime(prev => {
          const newTime = prev + 1;
          // Check if preview should end
          if (previewMode && newTime >= PREVIEW_DURATION) {
            setPreviewEnded(true);
            setIsPlaying(false);
            setShowControls(true);
          }
          return newTime;
        });
      }, 1000);
      return () => clearInterval(interval);
    }
  }, [isPlaying, previewEnded, previewMode]);

  const toggleFullscreen = () => {
    if (!document.fullscreenElement && containerRef.current) {
      containerRef.current.requestFullscreen();
      setIsFullscreen(true);
    } else if (document.exitFullscreen) {
      document.exitFullscreen();
      setIsFullscreen(false);
    }
  };

  const formatTime = (seconds: number) => {
    const hrs = Math.floor(seconds / 3600);
    const mins = Math.floor((seconds % 3600) / 60);
    const secs = Math.floor(seconds % 60);
    if (hrs > 0) {
      return `${hrs}:${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    }
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

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

  const totalDuration = (movie.duration || 120) * 60;

  return (
    <div 
      ref={containerRef}
      className="relative h-screen w-screen bg-cinema-black overflow-hidden cursor-none"
      onClick={() => !previewEnded && setIsPlaying(!isPlaying)}
    >
      {/* Video Background (simulated with image) */}
      <div className="absolute inset-0">
        <img
          src={movie.backdrop_url || '/placeholder.svg'}
          alt={movie.title}
          className="h-full w-full object-cover"
        />
        <div className="absolute inset-0 bg-cinema-black/30" />
      </div>

      {/* Preview Ended Overlay */}
      <AnimatePresence>
        {previewEnded && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 bg-cinema-black/90 flex items-center justify-center z-30"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="text-center p-8 max-w-md">
              <div className="flex justify-center mb-6">
                <div className="p-4 rounded-full bg-primary/20">
                  <Clock className="h-12 w-12 text-primary" />
                </div>
              </div>
              <h2 className="text-2xl font-bold text-foreground mb-2">
                Preview Encerrado
              </h2>
              <p className="text-muted-foreground mb-6">
                {user 
                  ? "Assine para continuar assistindo este filme completo."
                  : "Faça login para assistir filmes gratuitos ou assine para acessar o catálogo completo."
                }
              </p>
              <div className="flex flex-col gap-3">
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
                <button
                  onClick={() => navigate(-1)}
                  className="text-sm text-muted-foreground hover:text-foreground transition-colors"
                >
                  Voltar
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Play/Pause Indicator */}
      <AnimatePresence>
        {!isPlaying && !previewEnded && (
          <motion.div
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.8 }}
            className="absolute inset-0 flex items-center justify-center z-10 pointer-events-none"
          >
            <div className="flex h-24 w-24 items-center justify-center rounded-full bg-primary/90 text-primary-foreground shadow-lg backdrop-blur-sm">
              <Play className="h-12 w-12 fill-current ml-2" />
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Preview Mode Badge */}
      {previewMode && !previewEnded && (
        <div className="absolute top-4 right-4 z-20">
          <div className="flex items-center gap-2 px-3 py-1.5 bg-primary/90 rounded-full text-primary-foreground text-sm font-medium">
            <Clock className="h-4 w-4" />
            <span>Preview: {formatTime(Math.max(0, PREVIEW_DURATION - currentTime))}</span>
          </div>
        </div>
      )}

      {/* Controls Overlay */}
      <AnimatePresence>
        {showControls && !previewEnded && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 z-20 cursor-auto"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Top Bar */}
            <div className="absolute top-0 left-0 right-0 bg-gradient-to-b from-cinema-black/80 to-transparent p-4 md:p-6">
              <div className="flex items-center gap-4">
                <button
                  onClick={() => navigate(-1)}
                  className="flex h-10 w-10 items-center justify-center rounded-full bg-secondary/50 backdrop-blur-sm text-foreground hover:bg-secondary transition-colors"
                >
                  <ArrowLeft className="h-5 w-5" />
                </button>
                <div>
                  <h1 className="text-lg md:text-xl font-semibold text-foreground">
                    {movie.title}
                  </h1>
                  <p className="text-sm text-muted-foreground">
                    {movie.year} • {movie.producer_name || 'Produtor'}
                  </p>
                </div>
              </div>
            </div>

            {/* Bottom Controls */}
            <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-cinema-black/90 to-transparent p-4 md:p-6">
              {/* Progress Bar */}
              <div className="mb-4">
                <div className="relative h-1 bg-secondary rounded-full overflow-hidden group cursor-pointer">
                  <div 
                    className="absolute inset-y-0 left-0 bg-primary rounded-full transition-all"
                    style={{ width: `${progress}%` }}
                  />
                  <div 
                    className="absolute top-1/2 -translate-y-1/2 h-3 w-3 bg-primary rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
                    style={{ left: `${progress}%`, transform: 'translate(-50%, -50%)' }}
                  />
                </div>
                <div className="flex justify-between mt-2 text-xs text-muted-foreground">
                  <span>{formatTime(currentTime)}</span>
                  <span>{formatTime(previewMode ? PREVIEW_DURATION : totalDuration)}</span>
                </div>
              </div>

              {/* Control Buttons */}
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  {/* Play/Pause */}
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      setIsPlaying(!isPlaying);
                    }}
                    className="flex h-12 w-12 items-center justify-center rounded-full bg-primary text-primary-foreground hover:bg-primary/90 transition-colors"
                  >
                    {isPlaying ? (
                      <Pause className="h-6 w-6 fill-current" />
                    ) : (
                      <Play className="h-6 w-6 fill-current ml-1" />
                    )}
                  </button>

                  {/* Skip Back */}
                  <button
                    onClick={(e) => e.stopPropagation()}
                    className="flex h-10 w-10 items-center justify-center rounded-full text-foreground hover:bg-secondary/50 transition-colors"
                  >
                    <SkipBack className="h-5 w-5" />
                  </button>

                  {/* Skip Forward */}
                  <button
                    onClick={(e) => e.stopPropagation()}
                    className="flex h-10 w-10 items-center justify-center rounded-full text-foreground hover:bg-secondary/50 transition-colors"
                  >
                    <SkipForward className="h-5 w-5" />
                  </button>

                  {/* Volume */}
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      setIsMuted(!isMuted);
                    }}
                    className="flex h-10 w-10 items-center justify-center rounded-full text-foreground hover:bg-secondary/50 transition-colors"
                  >
                    {isMuted ? (
                      <VolumeX className="h-5 w-5" />
                    ) : (
                      <Volume2 className="h-5 w-5" />
                    )}
                  </button>
                </div>

                {/* Right Controls */}
                <div className="flex items-center gap-2">
                  {/* Fullscreen */}
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      toggleFullscreen();
                    }}
                    className="flex h-10 w-10 items-center justify-center rounded-full text-foreground hover:bg-secondary/50 transition-colors"
                  >
                    {isFullscreen ? (
                      <Minimize className="h-5 w-5" />
                    ) : (
                      <Maximize className="h-5 w-5" />
                    )}
                  </button>
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

const Watch = () => {
  const { id } = useParams<{ id: string }>();
  const { data: movie, isLoading, error } = useMovie(id);

  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-cinema-black">
        <div className="animate-pulse text-muted-foreground">Carregando...</div>
      </div>
    );
  }

  if (!movie || error) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-cinema-black">
        <div className="text-center">
          <h1 className="text-2xl font-semibold text-foreground mb-4">Filme não encontrado</h1>
          <Link to="/" className="text-primary hover:underline">
            Voltar ao Início
          </Link>
        </div>
      </div>
    );
  }

  return (
    <SubscriptionGate 
      movieTitle={movie.title}
      movieTier={movie.min_tier as 'free' | 'standard' | 'premium'}
    >
      {(previewMode) => (
        <WatchContent movie={movie} previewMode={previewMode} />
      )}
    </SubscriptionGate>
  );
};

export default Watch;
