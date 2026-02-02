import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { useUsers, AppRole } from '@/hooks/useUsers';
import { useAdminSubscriptions, ProducerPurchase } from '@/hooks/useAdminSubscriptions';
import { Layout } from '@/components/layout/Layout';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
  DropdownMenuSub,
  DropdownMenuSubTrigger,
  DropdownMenuSubContent,
  DropdownMenuPortal,
} from '@/components/ui/dropdown-menu';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { ArrowLeft, MoreHorizontal, Shield, Film, User, Crown, Sparkles, CreditCard, X, Upload, Package, Trash2 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import type { SubscriptionTier } from '@/lib/subscription-tiers';
import { SUBSCRIPTION_TIERS } from '@/lib/subscription-tiers';

const ROLE_CONFIG: Record<AppRole, { label: string; icon: React.ElementType; variant: 'default' | 'secondary' | 'destructive' | 'outline' }> = {
  admin: { label: 'Admin', icon: Crown, variant: 'destructive' },
  producer: { label: 'Produtor', icon: Film, variant: 'default' },
  viewer: { label: 'Espectador', icon: User, variant: 'secondary' },
};

const TIER_CONFIG: Record<SubscriptionTier, { label: string; icon: React.ElementType; className: string }> = {
  free: { label: 'Grátis', icon: User, className: 'bg-muted text-muted-foreground' },
  standard: { label: 'Standard', icon: Sparkles, className: 'bg-accent/20 text-accent border-accent/30' },
  premium: { label: 'Premium', icon: Crown, className: 'bg-primary/20 text-primary border-primary/30' },
};

interface AdminSubscription {
  user_id: string;
  tier: SubscriptionTier;
  expires_at: string | null;
}

interface UserUploadsInfo {
  totalRemaining: number;
  purchases: ProducerPurchase[];
}

export default function AdminUsers() {
  const navigate = useNavigate();
  const { roles, isLoading: authLoading, user } = useAuth();
  const { users, isLoading, addRole, removeRole, isAddingRole, isRemovingRole } = useUsers();
  const { 
    setSubscription, 
    removeSubscription, 
    isSettingSubscription, 
    isRemovingSubscription,
    grantProducerUploads,
    revokeProducerUploads,
    isGrantingUploads,
    isRevokingUploads
  } = useAdminSubscriptions();
  
  const [adminSubscriptions, setAdminSubscriptions] = useState<Record<string, AdminSubscription>>({});
  const [producerUploads, setProducerUploads] = useState<Record<string, UserUploadsInfo>>({});
  const [subscriptionDialogOpen, setSubscriptionDialogOpen] = useState(false);
  const [uploadsDialogOpen, setUploadsDialogOpen] = useState(false);
  const [uploadsHistoryDialogOpen, setUploadsHistoryDialogOpen] = useState(false);
  const [selectedUser, setSelectedUser] = useState<{ id: string; name: string } | null>(null);
  const [selectedTier, setSelectedTier] = useState<SubscriptionTier>('free');
  const [expiresAt, setExpiresAt] = useState<string>('');
  const [uploadsAmount, setUploadsAmount] = useState<number>(1);
  const [uploadsExpiresAt, setUploadsExpiresAt] = useState<string>('');

  // Fetch admin subscriptions and producer purchases
  useEffect(() => {
    const fetchData = async () => {
      // Fetch admin subscriptions
      const { data: subsData, error: subsError } = await supabase
        .from('admin_subscriptions')
        .select('user_id, tier, expires_at')
        .eq('is_active', true);

      if (!subsError && subsData) {
        const subsMap: Record<string, AdminSubscription> = {};
        subsData.forEach((sub: any) => {
          subsMap[sub.user_id] = sub as AdminSubscription;
        });
        setAdminSubscriptions(subsMap);
      }

      // Fetch producer purchases
      const now = new Date().toISOString();
      const { data: purchasesData, error: purchasesError } = await supabase
        .from('producer_purchases')
        .select('*')
        .eq('is_active', true)
        .gt('expires_at', now);

      if (!purchasesError && purchasesData) {
        const uploadsMap: Record<string, UserUploadsInfo> = {};
        purchasesData.forEach((purchase: ProducerPurchase) => {
          const remaining = purchase.uploads_allowed - purchase.uploads_used;
          if (!uploadsMap[purchase.user_id]) {
            uploadsMap[purchase.user_id] = { totalRemaining: 0, purchases: [] };
          }
          uploadsMap[purchase.user_id].totalRemaining += remaining;
          uploadsMap[purchase.user_id].purchases.push(purchase);
        });
        setProducerUploads(uploadsMap);
      }
    };

    fetchData();
  }, [isSettingSubscription, isRemovingSubscription, isGrantingUploads, isRevokingUploads]);

  // Redirect if not admin
  if (!authLoading && !roles.includes('admin')) {
    navigate('/');
    return null;
  }

  if (authLoading || isLoading) {
    return (
      <Layout>
        <div className="container mx-auto px-4 py-8">
          <div className="animate-pulse space-y-4">
            <div className="h-8 bg-muted rounded w-1/4"></div>
            <div className="h-64 bg-muted rounded"></div>
          </div>
        </div>
      </Layout>
    );
  }

  const handleAddRole = (userId: string, role: AppRole) => {
    addRole({ userId, role });
  };

  const handleRemoveRole = (userId: string, role: AppRole) => {
    // Prevent removing own admin role
    if (userId === user?.id && role === 'admin') {
      return;
    }
    removeRole({ userId, role });
  };

  const getAvailableRolesToAdd = (currentRoles: AppRole[]): AppRole[] => {
    const allRoles: AppRole[] = ['viewer', 'producer', 'admin'];
    return allRoles.filter(role => !currentRoles.includes(role));
  };

  const openSubscriptionDialog = (userId: string, userName: string, currentTier?: SubscriptionTier) => {
    setSelectedUser({ id: userId, name: userName });
    setSelectedTier(currentTier || 'free');
    setExpiresAt('');
    setSubscriptionDialogOpen(true);
  };

  const openUploadsDialog = (userId: string, userName: string) => {
    setSelectedUser({ id: userId, name: userName });
    setUploadsAmount(1);
    setUploadsExpiresAt('');
    setUploadsDialogOpen(true);
  };

  const openUploadsHistoryDialog = (userId: string, userName: string) => {
    setSelectedUser({ id: userId, name: userName });
    setUploadsHistoryDialogOpen(true);
  };

  const handleSetSubscription = () => {
    if (!selectedUser) return;
    
    setSubscription({
      userId: selectedUser.id,
      tier: selectedTier,
      reason: 'Admin manual assignment',
      expiresAt: expiresAt ? new Date(expiresAt) : null,
    });
    
    setSubscriptionDialogOpen(false);
    setSelectedUser(null);
  };

  const handleRemoveSubscription = (userId: string) => {
    removeSubscription(userId);
  };

  const handleGrantUploads = () => {
    if (!selectedUser || uploadsAmount < 1) return;

    grantProducerUploads({
      userId: selectedUser.id,
      uploadsAllowed: uploadsAmount,
      expiresAt: uploadsExpiresAt ? new Date(uploadsExpiresAt) : null,
      reason: 'Admin manual grant',
    });

    setUploadsDialogOpen(false);
    setSelectedUser(null);
  };

  const handleRevokeUploads = (purchaseId: string) => {
    revokeProducerUploads(purchaseId);
  };

  const getUserSubscriptionTier = (userId: string): SubscriptionTier | null => {
    const adminSub = adminSubscriptions[userId];
    if (adminSub) {
      // Check if expired
      if (adminSub.expires_at && new Date(adminSub.expires_at) < new Date()) {
        return null;
      }
      return adminSub.tier;
    }
    return null;
  };

  const isProducer = (userRoles: AppRole[]) => userRoles.includes('producer');

  return (
    <Layout>
      <div className="container mx-auto px-4 py-8">
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="icon" onClick={() => navigate(-1)}>
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <div>
              <h1 className="text-2xl font-bold">Gerenciar Usuários</h1>
              <p className="text-muted-foreground">
                Gerencie os roles, permissões, assinaturas e uploads dos usuários
              </p>
            </div>
          </div>
        </div>

        <div className="bg-card rounded-lg border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Usuário</TableHead>
                <TableHead>Roles</TableHead>
                <TableHead>Assinatura</TableHead>
                <TableHead>Uploads</TableHead>
                <TableHead>Data de Cadastro</TableHead>
                <TableHead className="w-[70px]">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {users.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                    Nenhum usuário encontrado
                  </TableCell>
                </TableRow>
              ) : (
                users.map((u) => {
                  const adminTier = getUserSubscriptionTier(u.id);
                  const tierConfig = adminTier ? TIER_CONFIG[adminTier] : null;
                  const TierIcon = tierConfig?.icon || User;
                  const userUploads = producerUploads[u.id];
                  const hasAdminGrant = userUploads?.purchases.some(p => p.tier === 'admin_grant');
                  
                  return (
                    <TableRow key={u.id}>
                      <TableCell>
                        <div className="flex items-center gap-3">
                          <Avatar className="h-10 w-10">
                            <AvatarImage src={u.avatar_url || undefined} />
                            <AvatarFallback>
                              {u.full_name?.charAt(0) || 'U'}
                            </AvatarFallback>
                          </Avatar>
                          <div>
                            <p className="font-medium">{u.full_name || 'Sem nome'}</p>
                            <p className="text-sm text-muted-foreground">
                              {u.id === user?.id && '(Você)'}
                            </p>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex flex-wrap gap-1">
                          {u.roles.length === 0 ? (
                            <Badge variant="outline">Sem roles</Badge>
                          ) : (
                            u.roles.map((role) => {
                              const config = ROLE_CONFIG[role];
                              const Icon = config.icon;
                              return (
                                <Badge key={role} variant={config.variant} className="gap-1">
                                  <Icon className="h-3 w-3" />
                                  {config.label}
                                </Badge>
                              );
                            })
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        {adminTier ? (
                          <Badge className={`gap-1 ${tierConfig?.className}`}>
                            <TierIcon className="h-3 w-3" />
                            {tierConfig?.label}
                            <span className="text-xs opacity-70">(Admin)</span>
                          </Badge>
                        ) : (
                          <Badge variant="outline" className="gap-1">
                            <CreditCard className="h-3 w-3" />
                            Stripe
                          </Badge>
                        )}
                      </TableCell>
                      <TableCell>
                        {isProducer(u.roles) ? (
                          userUploads && userUploads.totalRemaining > 0 ? (
                            <Badge variant="secondary" className="gap-1">
                              <Upload className="h-3 w-3" />
                              {userUploads.totalRemaining} restante(s)
                              {hasAdminGrant && (
                                <span className="text-xs opacity-70">(Admin)</span>
                              )}
                            </Badge>
                          ) : (
                            <Badge variant="outline" className="gap-1 text-muted-foreground">
                              <Package className="h-3 w-3" />
                              Sem uploads
                            </Badge>
                          )
                        ) : (
                          <span className="text-muted-foreground text-sm">-</span>
                        )}
                      </TableCell>
                      <TableCell>
                        {new Date(u.created_at).toLocaleDateString('pt-BR')}
                      </TableCell>
                      <TableCell>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button 
                              variant="ghost" 
                              size="icon"
                              disabled={isAddingRole || isRemovingRole || isSettingSubscription || isRemovingSubscription || isGrantingUploads || isRevokingUploads}
                            >
                              <MoreHorizontal className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end" className="bg-popover w-56">
                            {/* Roles Section */}
                            <div className="px-2 py-1.5 text-sm font-semibold text-muted-foreground">
                              Adicionar Role
                            </div>
                            {getAvailableRolesToAdd(u.roles).map((role) => {
                              const config = ROLE_CONFIG[role];
                              const Icon = config.icon;
                              return (
                                <DropdownMenuItem
                                  key={`add-${role}`}
                                  onClick={() => handleAddRole(u.id, role)}
                                  className="gap-2"
                                >
                                  <Icon className="h-4 w-4" />
                                  {config.label}
                                </DropdownMenuItem>
                              );
                            })}
                            
                            {u.roles.length > 0 && (
                              <>
                                <DropdownMenuSeparator />
                                <div className="px-2 py-1.5 text-sm font-semibold text-muted-foreground">
                                  Remover Role
                                </div>
                                {u.roles.map((role) => {
                                  const config = ROLE_CONFIG[role];
                                  const Icon = config.icon;
                                  const isOwnAdmin = u.id === user?.id && role === 'admin';
                                  return (
                                    <DropdownMenuItem
                                      key={`remove-${role}`}
                                      onClick={() => handleRemoveRole(u.id, role)}
                                      disabled={isOwnAdmin}
                                      className="gap-2 text-destructive focus:text-destructive"
                                    >
                                      <Icon className="h-4 w-4" />
                                      {config.label}
                                      {isOwnAdmin && ' (Você)'}
                                    </DropdownMenuItem>
                                  );
                                })}
                              </>
                            )}

                            {/* Subscription Section */}
                            <DropdownMenuSeparator />
                            <div className="px-2 py-1.5 text-sm font-semibold text-muted-foreground">
                              Assinatura
                            </div>
                            <DropdownMenuSub>
                              <DropdownMenuSubTrigger className="gap-2">
                                <CreditCard className="h-4 w-4" />
                                Definir Plano
                              </DropdownMenuSubTrigger>
                              <DropdownMenuPortal>
                                <DropdownMenuSubContent className="bg-popover">
                                  {(Object.keys(TIER_CONFIG) as SubscriptionTier[]).map((tier) => {
                                    const config = TIER_CONFIG[tier];
                                    const Icon = config.icon;
                                    const isCurrentTier = adminTier === tier;
                                    return (
                                      <DropdownMenuItem
                                        key={tier}
                                        onClick={() => openSubscriptionDialog(u.id, u.full_name || 'Usuário', tier)}
                                        className="gap-2"
                                        disabled={isCurrentTier}
                                      >
                                        <Icon className="h-4 w-4" />
                                        {config.label}
                                        {isCurrentTier && ' ✓'}
                                      </DropdownMenuItem>
                                    );
                                  })}
                                </DropdownMenuSubContent>
                              </DropdownMenuPortal>
                            </DropdownMenuSub>
                            
                            {adminTier && (
                              <DropdownMenuItem
                                onClick={() => handleRemoveSubscription(u.id)}
                                className="gap-2 text-destructive focus:text-destructive"
                              >
                                <X className="h-4 w-4" />
                                Remover Assinatura Manual
                              </DropdownMenuItem>
                            )}

                            {/* Producer Uploads Section - Only for producers */}
                            {isProducer(u.roles) && (
                              <>
                                <DropdownMenuSeparator />
                                <div className="px-2 py-1.5 text-sm font-semibold text-muted-foreground">
                                  Uploads de Produtor
                                </div>
                                <DropdownMenuItem
                                  onClick={() => openUploadsDialog(u.id, u.full_name || 'Usuário')}
                                  className="gap-2"
                                >
                                  <Upload className="h-4 w-4" />
                                  Conceder Uploads
                                </DropdownMenuItem>
                                {userUploads && userUploads.purchases.length > 0 && (
                                  <DropdownMenuItem
                                    onClick={() => openUploadsHistoryDialog(u.id, u.full_name || 'Usuário')}
                                    className="gap-2"
                                  >
                                    <Package className="h-4 w-4" />
                                    Ver Histórico ({userUploads.purchases.length})
                                  </DropdownMenuItem>
                                )}
                              </>
                            )}
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>
        </div>
      </div>

      {/* Subscription Dialog */}
      <Dialog open={subscriptionDialogOpen} onOpenChange={setSubscriptionDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Definir Assinatura</DialogTitle>
            <DialogDescription>
              Definir plano {TIER_CONFIG[selectedTier]?.label} para {selectedUser?.name}
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Plano Selecionado</Label>
              <div className="flex items-center gap-2">
                {(() => {
                  const config = TIER_CONFIG[selectedTier];
                  const Icon = config.icon;
                  return (
                    <Badge className={`gap-1 ${config.className}`}>
                      <Icon className="h-3 w-3" />
                      {config.label}
                    </Badge>
                  );
                })()}
              </div>
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="expires">Data de Expiração (opcional)</Label>
              <Input
                id="expires"
                type="date"
                value={expiresAt}
                onChange={(e) => setExpiresAt(e.target.value)}
                min={new Date().toISOString().split('T')[0]}
              />
              <p className="text-xs text-muted-foreground">
                Deixe em branco para acesso permanente
              </p>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setSubscriptionDialogOpen(false)}>
              Cancelar
            </Button>
            <Button onClick={handleSetSubscription} disabled={isSettingSubscription}>
              {isSettingSubscription ? 'Salvando...' : 'Confirmar'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Grant Uploads Dialog */}
      <Dialog open={uploadsDialogOpen} onOpenChange={setUploadsDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Conceder Uploads</DialogTitle>
            <DialogDescription>
              Conceder uploads de vídeo para {selectedUser?.name}
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="uploads-amount">Quantidade de Uploads</Label>
              <div className="flex gap-2">
                {[1, 5, 10].map((amount) => (
                  <Button
                    key={amount}
                    type="button"
                    variant={uploadsAmount === amount ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => setUploadsAmount(amount)}
                  >
                    {amount}
                  </Button>
                ))}
                <Input
                  id="uploads-amount"
                  type="number"
                  min={1}
                  max={100}
                  value={uploadsAmount}
                  onChange={(e) => setUploadsAmount(Math.max(1, parseInt(e.target.value) || 1))}
                  className="w-20"
                />
              </div>
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="uploads-expires">Data de Expiração (opcional)</Label>
              <Input
                id="uploads-expires"
                type="date"
                value={uploadsExpiresAt}
                onChange={(e) => setUploadsExpiresAt(e.target.value)}
                min={new Date().toISOString().split('T')[0]}
              />
              <p className="text-xs text-muted-foreground">
                Deixe em branco para validade de 1 ano
              </p>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setUploadsDialogOpen(false)}>
              Cancelar
            </Button>
            <Button onClick={handleGrantUploads} disabled={isGrantingUploads || uploadsAmount < 1}>
              {isGrantingUploads ? 'Concedendo...' : `Conceder ${uploadsAmount} Upload(s)`}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Uploads History Dialog */}
      <Dialog open={uploadsHistoryDialogOpen} onOpenChange={setUploadsHistoryDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Histórico de Uploads</DialogTitle>
            <DialogDescription>
              Compras e concessões de uploads para {selectedUser?.name}
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4 py-4 max-h-96 overflow-y-auto">
            {selectedUser && producerUploads[selectedUser.id]?.purchases.length > 0 ? (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Tipo</TableHead>
                    <TableHead>Uploads</TableHead>
                    <TableHead>Usados</TableHead>
                    <TableHead>Restantes</TableHead>
                    <TableHead>Expira em</TableHead>
                    <TableHead className="w-[50px]"></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {producerUploads[selectedUser.id].purchases.map((purchase) => {
                    const isAdminGrant = purchase.tier === 'admin_grant';
                    const remaining = purchase.uploads_allowed - purchase.uploads_used;
                    return (
                      <TableRow key={purchase.id}>
                        <TableCell>
                          <Badge variant={isAdminGrant ? 'secondary' : 'outline'}>
                            {isAdminGrant ? 'Admin' : 'Stripe'}
                          </Badge>
                        </TableCell>
                        <TableCell>{purchase.uploads_allowed}</TableCell>
                        <TableCell>{purchase.uploads_used}</TableCell>
                        <TableCell>
                          <Badge variant={remaining > 0 ? 'default' : 'outline'}>
                            {remaining}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          {new Date(purchase.expires_at).toLocaleDateString('pt-BR')}
                        </TableCell>
                        <TableCell>
                          {isAdminGrant && (
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => handleRevokeUploads(purchase.id)}
                              disabled={isRevokingUploads}
                              className="text-destructive hover:text-destructive"
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          )}
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            ) : (
              <p className="text-center text-muted-foreground py-8">
                Nenhum upload encontrado para este usuário.
              </p>
            )}
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setUploadsHistoryDialogOpen(false)}>
              Fechar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Layout>
  );
}