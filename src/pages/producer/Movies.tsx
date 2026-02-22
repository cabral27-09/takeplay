import { useState } from 'react';
import { Link, Navigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Plus, Film, Clock, CheckCircle, XCircle, Edit, Trash2, Eye, BarChart3 } from 'lucide-react';
import { Layout } from '@/components/layout/Layout';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
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
} from '@/components/ui/alert-dialog';
import { useAuth } from '@/contexts/AuthContext';
import { useMovies, useDeleteMovie } from '@/hooks/useMovies';
import { useMovieViewCounts } from '@/hooks/useMovieViewCounts';
import { useToast } from '@/hooks/use-toast';
import type { MovieStatus, MovieWithGenres } from '@/types/movie';

const STATUS_CONFIG: Record<MovieStatus, { label: string; icon: React.ComponentType<any>; variant: 'default' | 'secondary' | 'destructive' | 'outline' }> = {
  draft: { label: 'Rascunho', icon: Film, variant: 'secondary' },
  pending_review: { label: 'Em Avaliação', icon: Clock, variant: 'default' },
  published: { label: 'No Ar', icon: CheckCircle, variant: 'outline' },
  rejected: { label: 'Recusado', icon: XCircle, variant: 'destructive' },
};

export default function ProducerMovies() {
  const { user, profile, hasRole, isLoading: authLoading } = useAuth();
  const { data: allMovies, isLoading: moviesLoading } = useMovies(true);
  const { data: viewCounts } = useMovieViewCounts();
  const deleteMovie = useDeleteMovie();
  const { toast } = useToast();
  
  const [movieToDelete, setMovieToDelete] = useState<string | null>(null);

  // Filter movies by current producer
  const producerMovies = allMovies?.filter(
    movie => movie.producer_name === profile?.full_name
  ) || [];

  // Redirect non-producers
  if (!authLoading && !hasRole('producer') && !hasRole('admin')) {
    return <Navigate to="/" replace />;
  }

  const handleDelete = async () => {
    if (!movieToDelete) return;
    
    try {
      await deleteMovie.mutateAsync(movieToDelete);
      toast({
        title: 'Filme excluído',
        description: 'O filme foi removido com sucesso.',
      });
    } catch (error) {
      toast({
        title: 'Erro ao excluir',
        description: 'Não foi possível excluir o filme.',
        variant: 'destructive',
      });
    } finally {
      setMovieToDelete(null);
    }
  };

  const canEdit = (movie: MovieWithGenres) => {
    const editableStatuses: MovieStatus[] = ['draft', 'pending_review', 'rejected'];
    return editableStatuses.includes(movie.status);
  };

  const canDelete = (movie: MovieWithGenres) => {
    const deletableStatuses: MovieStatus[] = ['draft', 'rejected'];
    return deletableStatuses.includes(movie.status);
  };

  const isLoading = authLoading || moviesLoading;

  // Stats
  const totalViews = producerMovies.reduce((sum, m) => sum + (viewCounts?.[m.id]?.total_views || 0), 0);
  const validViews = producerMovies.reduce((sum, m) => sum + (viewCounts?.[m.id]?.valid_views || 0), 0);

  const stats = {
    total: producerMovies.length,
    draft: producerMovies.filter(m => m.status === 'draft').length,
    pending: producerMovies.filter(m => m.status === 'pending_review').length,
    published: producerMovies.filter(m => m.status === 'published').length,
    rejected: producerMovies.filter(m => m.status === 'rejected').length,
  };

  if (isLoading) {
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
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <h1 className="text-2xl font-bold">Meus Filmes</h1>
              <p className="text-muted-foreground">
                Gerencie seus filmes enviados
              </p>
            </div>
            <Link to="/producer/movies/new">
              <Button className="gap-2">
                <Plus className="h-4 w-4" />
                Enviar Novo Filme
              </Button>
            </Link>
          </div>

          {/* Stats Cards */}
          <div className="grid gap-4 md:grid-cols-5">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  Total
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{stats.total}</div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                  <Clock className="h-4 w-4" />
                  Em Avaliação
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{stats.pending}</div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                  <CheckCircle className="h-4 w-4" />
                  No Ar
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{stats.published}</div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                  <XCircle className="h-4 w-4" />
                  Recusados
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{stats.rejected}</div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                  <BarChart3 className="h-4 w-4" />
                  Views Válidas
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{validViews}</div>
                <p className="text-xs text-muted-foreground">{totalViews} total</p>
              </CardContent>
            </Card>
          </div>

          {/* Movies Table */}
          {producerMovies.length === 0 ? (
            <Card>
              <CardContent className="py-12 text-center">
                <Film className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                <h3 className="text-lg font-semibold mb-2">Nenhum filme ainda</h3>
                <p className="text-muted-foreground mb-4">
                  Comece enviando seu primeiro filme para avaliação.
                </p>
                <Link to="/producer/movies/new">
                  <Button>
                    <Plus className="h-4 w-4 mr-2" />
                    Enviar Primeiro Filme
                  </Button>
                </Link>
              </CardContent>
            </Card>
          ) : (
            <Card>
              <CardContent className="p-0">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Filme</TableHead>
                      <TableHead>Gêneros</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Views</TableHead>
                      <TableHead>Enviado em</TableHead>
                      <TableHead className="text-right">Ações</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {producerMovies.map((movie) => {
                      const statusConfig = STATUS_CONFIG[movie.status];
                      const StatusIcon = statusConfig.icon;
                      
                      return (
                        <TableRow key={movie.id}>
                          <TableCell>
                            <div className="flex items-center gap-3">
                              {movie.thumbnail_url ? (
                                <img
                                  src={movie.thumbnail_url}
                                  alt={movie.title}
                                  className="h-12 w-8 object-cover rounded"
                                />
                              ) : (
                                <div className="h-12 w-8 bg-muted rounded flex items-center justify-center">
                                  <Film className="h-4 w-4 text-muted-foreground" />
                                </div>
                              )}
                              <div>
                                <p className="font-medium">{movie.title}</p>
                                <p className="text-sm text-muted-foreground">
                                  {movie.year} • {movie.duration} min
                                </p>
                              </div>
                            </div>
                          </TableCell>
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
                            <Badge variant={statusConfig.variant} className="gap-1">
                              <StatusIcon className="h-3 w-3" />
                              {statusConfig.label}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            <div className="flex flex-col">
                              <span className="font-medium">{viewCounts?.[movie.id]?.valid_views || 0}</span>
                              <span className="text-xs text-muted-foreground">
                                {viewCounts?.[movie.id]?.total_views || 0} total
                              </span>
                            </div>
                          </TableCell>
                          <TableCell className="text-sm text-muted-foreground">
                            {new Date(movie.created_at).toLocaleDateString('pt-BR')}
                          </TableCell>
                          <TableCell className="text-right">
                            <div className="flex items-center justify-end gap-2">
                              {movie.status === 'published' && (
                                <Link to={`/movie/${movie.id}`}>
                                  <Button variant="ghost" size="icon">
                                    <Eye className="h-4 w-4" />
                                  </Button>
                                </Link>
                              )}
                              {canEdit(movie) && (
                                <Link to={`/producer/movies/${movie.id}/edit`}>
                                  <Button variant="ghost" size="icon">
                                    <Edit className="h-4 w-4" />
                                  </Button>
                                </Link>
                              )}
                              {canDelete(movie) && (
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  onClick={() => setMovieToDelete(movie.id)}
                                >
                                  <Trash2 className="h-4 w-4 text-destructive" />
                                </Button>
                              )}
                            </div>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          )}
        </motion.div>
      </div>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={!!movieToDelete} onOpenChange={() => setMovieToDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir filme?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta ação não pode ser desfeita. O filme será permanentemente removido.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Excluir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Layout>
  );
}
