import { useState, useMemo } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Plus, Edit, Trash2, Eye, EyeOff, Star, Film, Tv, Theater } from 'lucide-react';
import { Layout } from '@/components/layout/Layout';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import { useAuth } from '@/contexts/AuthContext';
import { useMovies, useDeleteMovie } from '@/hooks/useMovies';
import { useMovieViewCounts } from '@/hooks/useMovieViewCounts';
import { useToast } from '@/hooks/use-toast';
import { Navigate } from 'react-router-dom';
import type { ContentType } from '@/types/movie';

type TabType = 'all' | ContentType;

const CONTENT_TYPE_CONFIG: Record<ContentType, { label: string; icon: React.ElementType; plural: string }> = {
  filme: { label: 'Filme', icon: Film, plural: 'filmes' },
  serie: { label: 'Série', icon: Tv, plural: 'séries' },
  espetaculo: { label: 'Espetáculo', icon: Theater, plural: 'espetáculos' },
};

export default function AdminMovies() {
  const [searchParams, setSearchParams] = useSearchParams();
  const initialTab = (searchParams.get('tipo') as TabType) || 'all';
  const [activeTab, setActiveTab] = useState<TabType>(initialTab);
  
  const { hasRole, isLoading: authLoading } = useAuth();
  const { data: movies, isLoading: moviesLoading } = useMovies(true);
  const { data: viewCounts } = useMovieViewCounts();
  const deleteMovie = useDeleteMovie();
  const { toast } = useToast();

  // Filter movies by content type
  const filteredMovies = useMemo(() => {
    if (activeTab === 'all') return movies || [];
    return movies?.filter(m => m.content_type === activeTab) || [];
  }, [movies, activeTab]);

  // Count by content type
  const counts = useMemo(() => ({
    all: movies?.length || 0,
    filme: movies?.filter(m => m.content_type === 'filme').length || 0,
    serie: movies?.filter(m => m.content_type === 'serie').length || 0,
    espetaculo: movies?.filter(m => m.content_type === 'espetaculo').length || 0,
  }), [movies]);

  // Redirect non-admins
  if (!authLoading && !hasRole('admin')) {
    return <Navigate to="/" replace />;
  }

  const handleTabChange = (value: string) => {
    const tab = value as TabType;
    setActiveTab(tab);
    if (tab === 'all') {
      searchParams.delete('tipo');
    } else {
      searchParams.set('tipo', tab);
    }
    setSearchParams(searchParams);
  };

  const handleDelete = async (id: string, title: string) => {
    try {
      await deleteMovie.mutateAsync(id);
      toast({
        title: 'Conteúdo excluído',
        description: `"${title}" foi removido com sucesso.`,
      });
    } catch (error) {
      toast({
        title: 'Erro ao excluir',
        description: 'Não foi possível excluir o conteúdo.',
        variant: 'destructive',
      });
    }
  };

  const getTierBadgeVariant = (tier: string) => {
    switch (tier) {
      case 'premium':
        return 'default';
      case 'standard':
        return 'secondary';
      default:
        return 'outline';
    }
  };

  const getContentTypeIcon = (type: ContentType) => {
    const config = CONTENT_TYPE_CONFIG[type];
    return config?.icon || Film;
  };

  const getPageTitle = () => {
    if (activeTab === 'all') return 'Gerenciar Conteúdos';
    const config = CONTENT_TYPE_CONFIG[activeTab];
    return `Gerenciar ${config?.plural.charAt(0).toUpperCase() + config?.plural.slice(1)}`;
  };

  const getCountLabel = () => {
    if (activeTab === 'all') return `${counts.all} conteúdos cadastrados`;
    const config = CONTENT_TYPE_CONFIG[activeTab];
    return `${counts[activeTab]} ${config?.plural} cadastradas`;
  };

  if (authLoading || moviesLoading) {
    return (
      <Layout>
        <div className="container py-20 flex items-center justify-center">
          <div className="h-8 w-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="container py-8">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="space-y-6"
        >
          {/* Header */}
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold">{getPageTitle()}</h1>
              <p className="text-muted-foreground mt-1">
                {getCountLabel()}
              </p>
            </div>
            <Link to="/admin/movies/new">
              <Button>
                <Plus className="h-4 w-4 mr-2" />
                Novo Conteúdo
              </Button>
            </Link>
          </div>

          {/* Tabs */}
          <Tabs value={activeTab} onValueChange={handleTabChange}>
            <TabsList className="grid w-full grid-cols-4 lg:w-auto lg:inline-flex">
              <TabsTrigger value="all" className="gap-2">
                Todos
                <Badge variant="secondary" className="ml-1 h-5 px-1.5 text-xs">
                  {counts.all}
                </Badge>
              </TabsTrigger>
              <TabsTrigger value="filme" className="gap-2">
                <Film className="h-4 w-4" />
                Filmes
                <Badge variant="secondary" className="ml-1 h-5 px-1.5 text-xs">
                  {counts.filme}
                </Badge>
              </TabsTrigger>
              <TabsTrigger value="serie" className="gap-2">
                <Tv className="h-4 w-4" />
                Séries
                <Badge variant="secondary" className="ml-1 h-5 px-1.5 text-xs">
                  {counts.serie}
                </Badge>
              </TabsTrigger>
              <TabsTrigger value="espetaculo" className="gap-2">
                <Theater className="h-4 w-4" />
                Espetáculos
                <Badge variant="secondary" className="ml-1 h-5 px-1.5 text-xs">
                  {counts.espetaculo}
                </Badge>
              </TabsTrigger>
            </TabsList>
          </Tabs>

          {/* Content Table */}
          <div className="rounded-lg border border-border overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-16"></TableHead>
                  <TableHead>Título</TableHead>
                  <TableHead>Tipo</TableHead>
                  <TableHead>Ano</TableHead>
                  <TableHead>Gêneros</TableHead>
                  <TableHead>Tier</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Views</TableHead>
                      <TableHead className="text-right">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredMovies?.map((movie) => {
                  const TypeIcon = getContentTypeIcon(movie.content_type);
                  const typeConfig = CONTENT_TYPE_CONFIG[movie.content_type];
                  
                  return (
                    <TableRow key={movie.id}>
                      <TableCell>
                        {movie.thumbnail_url ? (
                          <img
                            src={movie.thumbnail_url}
                            alt={movie.title}
                            className="w-12 h-16 object-cover rounded"
                          />
                        ) : (
                          <div className="w-12 h-16 bg-muted rounded flex items-center justify-center">
                            <TypeIcon className="h-5 w-5 text-muted-foreground" />
                          </div>
                        )}
                      </TableCell>
                      <TableCell>
                        <div className="flex flex-col">
                          <div className="flex items-center gap-2">
                            <span className="font-medium">{movie.title}</span>
                            {movie.featured && (
                              <Star className="h-4 w-4 text-primary fill-primary" />
                            )}
                          </div>
                          {movie.content_type === 'serie' && movie.total_seasons && (
                            <span className="text-xs text-muted-foreground">
                              {movie.total_seasons} temporada{movie.total_seasons > 1 ? 's' : ''} 
                              {movie.total_episodes && ` • ${movie.total_episodes} episódios`}
                            </span>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline" className="gap-1">
                          <TypeIcon className="h-3 w-3" />
                          {typeConfig?.label}
                        </Badge>
                      </TableCell>
                      <TableCell>{movie.year || '-'}</TableCell>
                      <TableCell>
                        <div className="flex flex-wrap gap-1">
                          {movie.genres.slice(0, 2).map((genre) => (
                            <Badge key={genre.id} variant="outline" className="text-xs">
                              {genre.name}
                            </Badge>
                          ))}
                          {movie.genres.length > 2 && (
                            <Badge variant="outline" className="text-xs">
                              +{movie.genres.length - 2}
                            </Badge>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant={getTierBadgeVariant(movie.min_tier)}>
                          {movie.min_tier}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Badge
                          variant={
                            movie.status === 'published' ? 'default' : 
                            movie.status === 'pending_review' ? 'secondary' :
                            movie.status === 'rejected' ? 'destructive' : 'outline'
                          }
                          className="flex items-center gap-1 w-fit"
                        >
                          {movie.status === 'published' ? (
                            <Eye className="h-3 w-3" />
                          ) : movie.status === 'pending_review' ? (
                            <Eye className="h-3 w-3" />
                          ) : (
                            <EyeOff className="h-3 w-3" />
                          )}
                          {movie.status === 'published' ? 'No Ar' : 
                           movie.status === 'pending_review' ? 'Em Avaliação' :
                           movie.status === 'rejected' ? 'Recusado' : 'Rascunho'}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <div className="flex flex-col">
                          <span className="font-medium">{viewCounts?.[movie.id]?.total_views || 0}</span>
                          <span className="text-xs text-muted-foreground">
                            {viewCounts?.[movie.id]?.valid_views || 0} válidas
                          </span>
                        </div>
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-2">
                          <Link to={`/admin/movies/${movie.id}/edit`}>
                            <Button variant="ghost" size="icon">
                              <Edit className="h-4 w-4" />
                            </Button>
                          </Link>
                          <AlertDialog>
                            <AlertDialogTrigger asChild>
                              <Button variant="ghost" size="icon">
                                <Trash2 className="h-4 w-4 text-destructive" />
                              </Button>
                            </AlertDialogTrigger>
                            <AlertDialogContent>
                              <AlertDialogHeader>
                                <AlertDialogTitle>Excluir conteúdo?</AlertDialogTitle>
                                <AlertDialogDescription>
                                  Esta ação não pode ser desfeita. O conteúdo "{movie.title}" 
                                  será permanentemente removido.
                                </AlertDialogDescription>
                              </AlertDialogHeader>
                              <AlertDialogFooter>
                                <AlertDialogCancel>Cancelar</AlertDialogCancel>
                                <AlertDialogAction
                                  onClick={() => handleDelete(movie.id, movie.title)}
                                  className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                                >
                                  Excluir
                                </AlertDialogAction>
                              </AlertDialogFooter>
                            </AlertDialogContent>
                          </AlertDialog>
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })}
                {(!filteredMovies || filteredMovies.length === 0) && (
                  <TableRow>
                    <TableCell colSpan={9} className="text-center py-12">
                      <Film className="h-12 w-12 mx-auto text-muted-foreground mb-3" />
                      <p className="text-muted-foreground">
                        {activeTab === 'all' 
                          ? 'Nenhum conteúdo cadastrado ainda.' 
                          : `Nenhum(a) ${CONTENT_TYPE_CONFIG[activeTab]?.label.toLowerCase()} cadastrado(a) ainda.`}
                      </p>
                      <Link to="/admin/movies/new">
                        <Button variant="outline" className="mt-4">
                          <Plus className="h-4 w-4 mr-2" />
                          Adicionar primeiro conteúdo
                        </Button>
                      </Link>
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        </motion.div>
      </div>
    </Layout>
  );
}