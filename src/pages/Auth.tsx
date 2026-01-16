import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Film, Clapperboard, User, Mail, Lock, Loader2, ArrowLeft } from 'lucide-react';
import { toast } from 'sonner';
import { z } from 'zod';

const authSchema = z.object({
  email: z.string().email('Email inválido').max(255, 'Email muito longo'),
  password: z.string().min(6, 'Senha deve ter pelo menos 6 caracteres').max(100, 'Senha muito longa'),
  fullName: z.string().min(2, 'Nome deve ter pelo menos 2 caracteres').max(100, 'Nome muito longo').optional(),
});

const forgotPasswordSchema = z.object({
  email: z.string().email('Email inválido'),
});

type AppRole = 'viewer' | 'producer';
type AuthMode = 'login' | 'signup' | 'forgot-password';

export default function Auth() {
  const [mode, setMode] = useState<AuthMode>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [role, setRole] = useState<AppRole>('viewer');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  
  const { signIn, signUp, user, isLoading } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (user && !isLoading) {
      navigate('/');
    }
  }, [user, isLoading, navigate]);

  const validateForm = () => {
    try {
      if (mode === 'forgot-password') {
        forgotPasswordSchema.parse({ email });
      } else {
        const data: { email: string; password: string; fullName?: string } = { email, password };
        if (mode === 'signup') {
          data.fullName = fullName;
        }
        authSchema.parse(data);
      }
      setErrors({});
      return true;
    } catch (error) {
      if (error instanceof z.ZodError) {
        const newErrors: Record<string, string> = {};
        error.errors.forEach((err) => {
          if (err.path[0]) {
            newErrors[err.path[0] as string] = err.message;
          }
        });
        setErrors(newErrors);
      }
      return false;
    }
  };

  const handleForgotPassword = async () => {
    if (!validateForm()) return;
    
    setIsSubmitting(true);

    try {
      const redirectUrl = `${window.location.origin}/reset-password`;
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: redirectUrl,
      });
      
      if (error) {
        toast.error('Erro ao enviar email: ' + error.message);
      } else {
        toast.success('Link de recuperação enviado! Verifique seu email.');
        setMode('login');
        setEmail('');
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (mode === 'forgot-password') {
      await handleForgotPassword();
      return;
    }
    
    if (!validateForm()) return;
    
    setIsSubmitting(true);

    try {
      if (mode === 'login') {
        const { error } = await signIn(email, password);
        if (error) {
          if (error.message.includes('Invalid login credentials')) {
            toast.error('Email ou senha incorretos');
          } else {
            toast.error('Erro ao entrar: ' + error.message);
          }
        } else {
          toast.success('Bem-vindo de volta!');
          navigate('/');
        }
      } else {
        const { error } = await signUp(email, password, fullName, role);
        if (error) {
          if (error.message.includes('User already registered')) {
            toast.error('Este email já está cadastrado');
          } else {
            toast.error('Erro ao criar conta: ' + error.message);
          }
        } else {
          toast.success('Conta criada com sucesso!');
          navigate('/');
        }
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  const getTitle = () => {
    switch (mode) {
      case 'login': return 'Entrar';
      case 'signup': return 'Criar Conta';
      case 'forgot-password': return 'Recuperar Senha';
    }
  };

  const getSubtitle = () => {
    switch (mode) {
      case 'login': return 'Entre para continuar assistindo';
      case 'signup': return 'Crie sua conta gratuitamente';
      case 'forgot-password': return 'Digite seu email para receber um link de recuperação';
    }
  };

  return (
    <div className="min-h-screen bg-background flex">
      {/* Left side - Branding */}
      <div className="hidden lg:flex lg:w-1/2 relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-primary/20 via-background to-background" />
        <div className="absolute inset-0 bg-[url('/placeholder.svg')] opacity-10" />
        <div className="relative z-10 flex flex-col justify-center p-12">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
          >
            <div className="flex items-center gap-3 mb-8">
              <div className="h-12 w-12 rounded-xl bg-primary flex items-center justify-center">
                <span className="text-primary-foreground font-bold text-2xl">T</span>
              </div>
              <span className="text-3xl font-bold">
                Tie<span className="text-primary">Flix</span>
              </span>
            </div>
            <h1 className="text-4xl font-bold text-foreground mb-4">
              Cinema Independente
              <br />
              <span className="text-primary">Sem Limites</span>
            </h1>
            <p className="text-muted-foreground text-lg max-w-md">
              Descubra filmes únicos de produtores independentes. 
              Assista sem anúncios, sem interrupções.
            </p>
          </motion.div>
        </div>
      </div>

      {/* Right side - Auth Form */}
      <div className="w-full lg:w-1/2 flex items-center justify-center p-8">
        <motion.div
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.5 }}
          className="w-full max-w-md"
        >
          {/* Mobile logo */}
          <div className="lg:hidden flex items-center gap-2 mb-8 justify-center">
            <div className="h-10 w-10 rounded-lg bg-primary flex items-center justify-center">
              <span className="text-primary-foreground font-bold text-xl">T</span>
            </div>
            <span className="text-2xl font-bold">
              Tie<span className="text-primary">Flix</span>
            </span>
          </div>

          <div className="bg-card border border-border rounded-2xl p-8">
            {mode === 'forgot-password' && (
              <button
                type="button"
                onClick={() => {
                  setMode('login');
                  setErrors({});
                }}
                className="flex items-center gap-1 text-sm text-muted-foreground hover:text-primary transition-colors mb-4"
              >
                <ArrowLeft className="h-4 w-4" />
                Voltar
              </button>
            )}

            <h2 className="text-2xl font-bold text-foreground mb-2">
              {getTitle()}
            </h2>
            <p className="text-muted-foreground mb-6">
              {getSubtitle()}
            </p>

            <form onSubmit={handleSubmit} className="space-y-4">
              {mode === 'signup' && (
                <div className="space-y-2">
                  <Label htmlFor="fullName">Nome Completo</Label>
                  <div className="relative">
                    <User className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      id="fullName"
                      type="text"
                      placeholder="Seu nome"
                      value={fullName}
                      onChange={(e) => setFullName(e.target.value)}
                      className="pl-10"
                    />
                  </div>
                  {errors.fullName && (
                    <p className="text-sm text-destructive">{errors.fullName}</p>
                  )}
                </div>
              )}

              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="email"
                    type="email"
                    placeholder="seu@email.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="pl-10"
                  />
                </div>
                {errors.email && (
                  <p className="text-sm text-destructive">{errors.email}</p>
                )}
              </div>

              {mode !== 'forgot-password' && (
                <div className="space-y-2">
                  <Label htmlFor="password">Senha</Label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      id="password"
                      type="password"
                      placeholder="••••••••"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      className="pl-10"
                    />
                  </div>
                  {errors.password && (
                    <p className="text-sm text-destructive">{errors.password}</p>
                  )}
                </div>
              )}

              {mode === 'login' && (
                <div className="text-right">
                  <button
                    type="button"
                    onClick={() => {
                      setMode('forgot-password');
                      setErrors({});
                      setPassword('');
                    }}
                    className="text-sm text-muted-foreground hover:text-primary transition-colors"
                  >
                    Esqueceu a senha?
                  </button>
                </div>
              )}

              {mode === 'signup' && (
                <div className="space-y-3">
                  <Label>Tipo de Conta</Label>
                  <RadioGroup
                    value={role}
                    onValueChange={(value) => setRole(value as AppRole)}
                    className="grid grid-cols-2 gap-4"
                  >
                    <Label
                      htmlFor="viewer"
                      className={`flex flex-col items-center gap-2 p-4 rounded-xl border-2 cursor-pointer transition-all ${
                        role === 'viewer'
                          ? 'border-primary bg-primary/10'
                          : 'border-border hover:border-muted-foreground'
                      }`}
                    >
                      <RadioGroupItem value="viewer" id="viewer" className="sr-only" />
                      <Film className="h-6 w-6" />
                      <span className="font-medium">Espectador</span>
                      <span className="text-xs text-muted-foreground text-center">
                        Assistir filmes
                      </span>
                    </Label>
                    <Label
                      htmlFor="producer"
                      className={`flex flex-col items-center gap-2 p-4 rounded-xl border-2 cursor-pointer transition-all ${
                        role === 'producer'
                          ? 'border-primary bg-primary/10'
                          : 'border-border hover:border-muted-foreground'
                      }`}
                    >
                      <RadioGroupItem value="producer" id="producer" className="sr-only" />
                      <Clapperboard className="h-6 w-6" />
                      <span className="font-medium">Produtor</span>
                      <span className="text-xs text-muted-foreground text-center">
                        Publicar filmes
                      </span>
                    </Label>
                  </RadioGroup>
                </div>
              )}

              <Button
                type="submit"
                className="w-full"
                size="lg"
                disabled={isSubmitting}
              >
                {isSubmitting ? (
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                ) : null}
                {mode === 'login' && 'Entrar'}
                {mode === 'signup' && 'Criar Conta'}
                {mode === 'forgot-password' && 'Enviar Link de Recuperação'}
              </Button>
            </form>

            {mode !== 'forgot-password' && (
              <div className="mt-6 text-center">
                <button
                  type="button"
                  onClick={() => {
                    setMode(mode === 'login' ? 'signup' : 'login');
                    setErrors({});
                  }}
                  className="text-sm text-muted-foreground hover:text-primary transition-colors"
                >
                  {mode === 'login' 
                    ? 'Não tem conta? Criar conta' 
                    : 'Já tem conta? Entrar'}
                </button>
              </div>
            )}
          </div>
        </motion.div>
      </div>
    </div>
  );
}