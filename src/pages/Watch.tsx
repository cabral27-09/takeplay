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
  SkipForward
} from 'lucide-react';
import { getMovieById } from '@/data/mockMovies';
import { cn } from '@/lib/utils';
import { SubscriptionGate } from '@/components/subscription/SubscriptionGate';

const WatchContent = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const movie = getMovieById(id || '');
  
  const [isPlaying, setIsPlaying] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [showControls, setShowControls] = useState(true);
  const [progress, setProgress] = useState(0);
  const [currentTime, setCurrentTime] = useState(0);
  
  const containerRef = useRef<HTMLDivElement>(null);
  const hideControlsTimeout = useRef<NodeJS.Timeout>();

  useEffect(() => {
    const handleMouseMove = () => {
      setShowControls(true);
      if (hideControlsTimeout.current) {
        clearTimeout(hideControlsTimeout.current);
      }
      hideControlsTimeout.current = setTimeout(() => {
        if (isPlaying) {
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
  }, [isPlaying]);

  // Simulate progress for demo
  useEffect(() => {
    if (isPlaying) {
      const interval = setInterval(() => {
        setProgress(prev => {
          if (prev >= 100) {
            setIsPlaying(false);
            return 100;
          }
          return prev + 0.1;
        });
        setCurrentTime(prev => prev + 1);
      }, 1000);
      return () => clearInterval(interval);
    }
  }, [isPlaying]);

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

  if (!movie) {
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

  const totalDuration = movie.duration * 60;

  return (
    <div 
      ref={containerRef}
      className="relative h-screen w-screen bg-cinema-black overflow-hidden cursor-none"
      onClick={() => setIsPlaying(!isPlaying)}
    >
      {/* Video Background (simulated with image) */}
      <div className="absolute inset-0">
        <img
          src={movie.backdrop}
          alt={movie.title}
          className="h-full w-full object-cover"
        />
        <div className="absolute inset-0 bg-cinema-black/30" />
      </div>

      {/* Play/Pause Indicator */}
      <AnimatePresence>
        {!isPlaying && (
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

      {/* Controls Overlay */}
      <AnimatePresence>
        {showControls && (
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
                    {movie.year} • {movie.producer.name}
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
                  <span>{formatTime(totalDuration)}</span>
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
  const movie = getMovieById(id || '');

  return (
    <SubscriptionGate movieTitle={movie?.title}>
      <WatchContent />
    </SubscriptionGate>
  );
};

export default Watch;
