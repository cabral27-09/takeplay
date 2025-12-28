import { useState, useEffect } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { Search, Menu, X, LogIn, LogOut, User, Crown, Sparkles } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '@/lib/utils';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { SUBSCRIPTION_TIERS } from '@/lib/subscription-tiers';
const navLinks = [{
  label: 'Início',
  href: '/'
}, {
  label: 'Filmes',
  href: '/browse'
}, {
  label: 'Trailers',
  href: '/trailers'
}, {
  label: 'Gêneros',
  href: '/genres'
}, {
  label: 'Planos',
  href: '/pricing'
}];
export const Header = () => {
  const [isScrolled, setIsScrolled] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const location = useLocation();
  const navigate = useNavigate();
  const {
    user,
    profile,
    roles,
    subscription,
    signOut,
    isLoading
  } = useAuth();
  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 50);
    };
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);
  useEffect(() => {
    setIsMobileMenuOpen(false);
  }, [location.pathname]);
  const handleSignOut = async () => {
    await signOut();
    navigate('/');
  };
  const getRoleBadge = () => {
    if (roles.includes('admin')) return 'Admin';
    if (roles.includes('producer')) return 'Produtor';
    return 'Espectador';
  };
  const getPlanBadge = () => {
    const tier = subscription.tier;
    const tierInfo = SUBSCRIPTION_TIERS[tier];
    if (tier === 'premium') {
      return {
        label: tierInfo.name,
        icon: Crown,
        className: 'bg-primary/20 text-primary border-primary/30'
      };
    }
    if (tier === 'standard') {
      return {
        label: tierInfo.name,
        icon: Sparkles,
        className: 'bg-accent/20 text-accent border-accent/30'
      };
    }
    return {
      label: tierInfo.name,
      icon: null,
      className: 'bg-muted text-muted-foreground border-border'
    };
  };
  return <header className={cn('fixed top-0 left-0 right-0 z-50 transition-all duration-500', isScrolled ? 'glass-dark border-b border-border/50' : 'bg-transparent')}>
      <div className="container flex h-16 items-center justify-between md:h-20">
        {/* Logo */}
        <Link to="/" className="flex items-center gap-2">
          <motion.div initial={{
          opacity: 0,
          x: -20
        }} animate={{
          opacity: 1,
          x: 0
        }} className="flex items-center gap-2">
            <div className="h-8 w-8 rounded-lg bg-primary flex items-center justify-center">
              <span className="text-primary-foreground font-bold text-lg">T</span>
            </div>
            <span className="text-xl font-semibold tracking-tight text-foreground">
              Tie<span className="text-primary">Flix</span>
            </span>
          </motion.div>
        </Link>

        {/* Desktop Navigation */}
        <nav className="hidden md:flex items-center gap-8">
          {navLinks.map(link => <Link key={link.href} to={link.href} className={cn('text-sm font-medium transition-colors hover:text-primary', location.pathname === link.href ? 'text-primary' : 'text-muted-foreground')}>
              {link.label}
            </Link>)}
        </nav>

        {/* Right Side Actions */}
        <div className="flex items-center gap-3">
          <Link to="/search" className="flex h-10 w-10 items-center justify-center rounded-full text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground">
            <Search className="h-5 w-5" />
          </Link>

          {/* Auth Button */}
          {!isLoading && <>
              {user ? <div className="flex items-center gap-2">
                  {/* Plan Badge */}
                  {(() => {
              const planBadge = getPlanBadge();
              return <Link to="/pricing" className={cn('hidden md:flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium border transition-colors hover:opacity-80', planBadge.className)}>Plano Free{planBadge.icon && <planBadge.icon className="h-3 w-3" />}
                        {planBadge.label}
                      </Link>;
            })()}
                  
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="icon" className="rounded-full">
                        <User className="h-5 w-5" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" className="w-56">
                      <div className="px-2 py-2">
                        <p className="text-sm font-medium truncate">
                          {profile?.full_name || user.email}
                        </p>
                        <div className="flex items-center gap-2 mt-1">
                          <span className="text-xs text-muted-foreground">{getRoleBadge()}</span>
                          <span className="text-xs text-muted-foreground">•</span>
                          {(() => {
                      const planBadge = getPlanBadge();
                      return <span className={cn('text-xs font-medium', planBadge.className.includes('text-primary') ? 'text-primary' : planBadge.className.includes('text-accent') ? 'text-accent' : 'text-muted-foreground')}>
                                {planBadge.label}
                              </span>;
                    })()}
                        </div>
                      </div>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem asChild>
                        <Link to="/pricing" className="cursor-pointer">
                          <Crown className="mr-2 h-4 w-4" />
                          Gerenciar Plano
                        </Link>
                      </DropdownMenuItem>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem onClick={handleSignOut} className="text-destructive">
                        <LogOut className="mr-2 h-4 w-4" />
                        Sair
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div> : <Button variant="default" size="sm" onClick={() => navigate('/auth')} className="hidden md:flex">
                  <LogIn className="mr-2 h-4 w-4" />
                  Entrar
                </Button>}
            </>}

          {/* Mobile Menu Toggle */}
          <button onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)} className="flex h-10 w-10 items-center justify-center rounded-full text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground md:hidden">
            {isMobileMenuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </button>
        </div>
      </div>

      {/* Mobile Menu */}
      <AnimatePresence>
        {isMobileMenuOpen && <motion.div initial={{
        opacity: 0,
        height: 0
      }} animate={{
        opacity: 1,
        height: 'auto'
      }} exit={{
        opacity: 0,
        height: 0
      }} className="glass-dark border-t border-border/50 md:hidden">
            <nav className="container flex flex-col gap-2 py-4">
              {navLinks.map(link => <Link key={link.href} to={link.href} className={cn('px-4 py-3 rounded-lg text-sm font-medium transition-colors', location.pathname === link.href ? 'bg-secondary text-primary' : 'text-muted-foreground hover:bg-secondary hover:text-foreground')}>
                  {link.label}
                </Link>)}
              
              {/* Mobile Auth Button */}
              {!isLoading && !user && <Link to="/auth" className="px-4 py-3 rounded-lg text-sm font-medium bg-primary text-primary-foreground text-center">
                  Entrar
                </Link>}
              
              {!isLoading && user && <button onClick={handleSignOut} className="px-4 py-3 rounded-lg text-sm font-medium text-destructive text-left hover:bg-secondary">
                  Sair
                </button>}
            </nav>
          </motion.div>}
      </AnimatePresence>
    </header>;
};