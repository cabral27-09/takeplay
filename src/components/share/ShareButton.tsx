import { useState } from 'react';
import { Share2, Copy, Check, MessageCircle, Send } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

interface ShareButtonProps {
  movieId: string;
  movieTitle: string;
  variant?: 'default' | 'icon' | 'ghost';
  className?: string;
}

export function ShareButton({ movieId, movieTitle, variant = 'default', className }: ShareButtonProps) {
  const [copied, setCopied] = useState(false);
  const [open, setOpen] = useState(false);

  const shareUrl = `${window.location.origin}/share/${movieId}`;
  const shareText = `Assista "${movieTitle}" no TieFlix!`;

  const copyToClipboard = async () => {
    try {
      await navigator.clipboard.writeText(shareUrl);
      setCopied(true);
      toast.success('Link copiado!');
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      toast.error('Erro ao copiar link');
    }
  };

  const shareOptions = [
    {
      name: 'Copiar Link',
      icon: copied ? Check : Copy,
      action: copyToClipboard,
      color: 'text-primary',
      isCustomIcon: false,
    },
    {
      name: 'WhatsApp',
      icon: MessageCircle,
      url: `https://wa.me/?text=${encodeURIComponent(`${shareText} ${shareUrl}`)}`,
      color: 'text-green-500',
      isCustomIcon: false,
    },
    {
      name: 'Twitter',
      icon: null,
      customIcon: (
        <svg className="h-4 w-4" fill="currentColor" viewBox="0 0 24 24">
          <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
        </svg>
      ),
      url: `https://twitter.com/intent/tweet?text=${encodeURIComponent(shareText)}&url=${encodeURIComponent(shareUrl)}`,
      color: 'text-foreground',
      isCustomIcon: true,
    },
    {
      name: 'Telegram',
      icon: Send,
      url: `https://t.me/share/url?url=${encodeURIComponent(shareUrl)}&text=${encodeURIComponent(shareText)}`,
      color: 'text-blue-500',
      isCustomIcon: false,
    },
  ];

  const handleShare = (option: typeof shareOptions[0]) => {
    if (option.action) {
      option.action();
    } else if (option.url) {
      window.open(option.url, '_blank', 'noopener,noreferrer');
      setOpen(false);
    }
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        {variant === 'icon' ? (
          <Button
            variant="ghost"
            size="icon"
            className={cn('hover:bg-white/20', className)}
            onClick={(e) => e.stopPropagation()}
          >
            <Share2 className="h-5 w-5" />
          </Button>
        ) : variant === 'ghost' ? (
          <Button
            variant="ghost"
            size="sm"
            className={cn('gap-2', className)}
            onClick={(e) => e.stopPropagation()}
          >
            <Share2 className="h-4 w-4" />
            Compartilhar
          </Button>
        ) : (
          <Button
            variant="outline"
            size="lg"
            className={cn('gap-2', className)}
            onClick={(e) => e.stopPropagation()}
          >
            <Share2 className="h-5 w-5" />
            Compartilhar
          </Button>
        )}
      </PopoverTrigger>
      <PopoverContent 
        className="w-56 p-2" 
        align="end"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="grid gap-1">
          <p className="px-2 py-1.5 text-sm font-medium text-foreground">
            Compartilhar
          </p>
          {shareOptions.map((option) => {
            const IconComponent = option.icon;
            return (
              <button
                key={option.name}
                onClick={() => handleShare(option)}
                className="flex items-center gap-3 w-full px-2 py-2 text-sm rounded-md hover:bg-accent transition-colors"
              >
                <span className={option.color}>
                  {option.isCustomIcon ? option.customIcon : IconComponent && <IconComponent className="h-4 w-4" />}
                </span>
                {option.name}
              </button>
            );
          })}
        </div>
      </PopoverContent>
    </Popover>
  );
}
