import { Airplay, Cast } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';

interface CastButtonProps {
  airplayAvailable: boolean;
  airplayConnected: boolean;
  chromecastAvailable: boolean;
  chromecastConnected: boolean;
  chromecastDeviceName: string | null;
  onAirPlayClick: () => void;
  onChromecastClick: () => void;
}

export function CastButton({
  airplayAvailable,
  airplayConnected,
  chromecastAvailable,
  chromecastConnected,
  chromecastDeviceName,
  onAirPlayClick,
  onChromecastClick,
}: CastButtonProps) {
  // Determine which casting option to show based on browser
  const isSafari = /^((?!chrome|android).)*safari/i.test(navigator.userAgent);
  
  const showAirPlay = airplayAvailable && isSafari;
  const showChromecast = chromecastAvailable && !isSafari;
  
  if (!showAirPlay && !showChromecast) {
    return null;
  }

  return (
    <TooltipProvider>
      {showAirPlay && (
        <Tooltip>
          <TooltipTrigger asChild>
            <Button 
              variant="ghost" 
              size="icon" 
              onClick={onAirPlayClick}
              className={cn(
                "transition-colors",
                airplayConnected && "text-primary"
              )}
            >
              <Airplay className={cn(
                "h-5 w-5",
                airplayConnected && "fill-primary"
              )} />
            </Button>
          </TooltipTrigger>
          <TooltipContent>
            <p>{airplayConnected ? 'Conectado via AirPlay' : 'AirPlay'}</p>
          </TooltipContent>
        </Tooltip>
      )}

      {showChromecast && (
        <Tooltip>
          <TooltipTrigger asChild>
            <Button 
              variant="ghost" 
              size="icon" 
              onClick={onChromecastClick}
              className={cn(
                "transition-colors",
                chromecastConnected && "text-primary"
              )}
            >
              <Cast className={cn(
                "h-5 w-5",
                chromecastConnected && "fill-primary"
              )} />
            </Button>
          </TooltipTrigger>
          <TooltipContent>
            <p>
              {chromecastConnected 
                ? `Conectado: ${chromecastDeviceName}` 
                : 'Transmitir para TV'}
            </p>
          </TooltipContent>
        </Tooltip>
      )}
    </TooltipProvider>
  );
}
