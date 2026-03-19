import { motion } from 'framer-motion';
import { Film, Clapperboard } from 'lucide-react';
import logoManivela from '@/assets/logo-manivela.png';

export const EmptyHomeHero = () => {
  return (
    <section className="relative flex items-center justify-center min-h-[calc(100vh-4rem)] w-full overflow-hidden">
      {/* Background logo watermark */}
      <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
        <img
          src={logoManivela}
          alt=""
          className="w-[60vw] max-w-[600px] opacity-[0.04] select-none"
          draggable={false}
        />
      </div>

      {/* Subtle radial glow */}
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,hsl(var(--primary)/0.08)_0%,transparent_70%)]" />

      {/* Content */}
      <div className="relative z-10 text-center px-6 max-w-2xl">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7 }}
          className="flex flex-col items-center gap-6"
        >
          {/* Logo */}
          <img
            src={logoManivela}
            alt="Manivela Filmes"
            className="h-16 md:h-20 object-contain"
          />

          {/* Decorative divider */}
          <div className="flex items-center gap-3 text-primary/60">
            <div className="h-px w-12 bg-primary/30" />
            <Clapperboard className="h-5 w-5" />
            <div className="h-px w-12 bg-primary/30" />
          </div>

          {/* Headline */}
          <h1 className="text-3xl md:text-5xl font-bold text-foreground leading-tight">
            Cinema independente,{' '}
            <span className="text-primary">sem limites</span>
          </h1>

          {/* Description */}
          <p className="text-lg md:text-xl text-muted-foreground leading-relaxed max-w-lg">
            A plataforma de streaming dedicada ao cinema independente brasileiro. 
            Filmes, séries e espetáculos — sem anúncios, sem interrupções.
          </p>

          {/* Status badge */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.5, duration: 0.5 }}
            className="flex items-center gap-2 px-4 py-2 rounded-full border border-primary/20 bg-primary/5 text-primary text-sm font-medium"
          >
            <Film className="h-4 w-4" />
            Novos conteúdos em breve
          </motion.div>
        </motion.div>
      </div>
    </section>
  );
};
