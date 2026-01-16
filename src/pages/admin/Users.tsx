import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { useUsers, AppRole } from '@/hooks/useUsers';
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
} from '@/components/ui/dropdown-menu';
import { ArrowLeft, MoreHorizontal, Shield, Film, User, Crown } from 'lucide-react';

const ROLE_CONFIG: Record<AppRole, { label: string; icon: React.ElementType; variant: 'default' | 'secondary' | 'destructive' | 'outline' }> = {
  admin: { label: 'Admin', icon: Crown, variant: 'destructive' },
  producer: { label: 'Produtor', icon: Film, variant: 'default' },
  viewer: { label: 'Espectador', icon: User, variant: 'secondary' },
};

export default function AdminUsers() {
  const navigate = useNavigate();
  const { roles, isLoading: authLoading, user } = useAuth();
  const { users, isLoading, addRole, removeRole, isAddingRole, isRemovingRole } = useUsers();

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
                Gerencie os roles e permissões dos usuários
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
                <TableHead>Data de Cadastro</TableHead>
                <TableHead className="w-[70px]">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {users.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={4} className="text-center py-8 text-muted-foreground">
                    Nenhum usuário encontrado
                  </TableCell>
                </TableRow>
              ) : (
                users.map((u) => (
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
                      {new Date(u.created_at).toLocaleDateString('pt-BR')}
                    </TableCell>
                    <TableCell>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button 
                            variant="ghost" 
                            size="icon"
                            disabled={isAddingRole || isRemovingRole}
                          >
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="bg-popover">
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
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      </div>
    </Layout>
  );
}
