import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Plus, Edit, Trash2, Eye, EyeOff, Star, Film } from 'lucide-react';
import { Layout } from '@/components/layout/Layout';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
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
import { useToast } from '@/hooks/use-toast';
import { Navigate } from 'react-router-dom';

export default function AdminMovies() {
  const { hasRole, isLoading: authLoading } = useAuth();
  const { data: movies, isLoading: moviesLoading } = useMovies(true);
  const deleteMovie = useDeleteMovie();
  const { toast } = useToast();

  // Redirect non-admins
  if (!authLoading && !hasRole('admin')) {
    return <Navigate to="/" replace />;
  }

  const handleDelete = async (id: string, title: string) => {
    try {
      await deleteMovie.mutateAsync(id);
      toast({
        title: 'Filme excluído',
        description: `"${title}" foi removido com sucesso.`,
      });
    } catch (error) {
      toast({
        title: 'Erro ao excluir',
        description: 'Não foi possível excluir o filme.',
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
              <h1 className="text-3xl font-bold">Gerenciar Filmes</h1>
              <p className="text-muted-foreground mt-1">
                {movies?.length || 0} filmes cadastrados
              </p>
            </div>
            <Link to="/admin/movies/new">
              <Button>
                <Plus className="h-4 w-4 mr-2" />
                Novo Filme
              </Button>
            </Link>
          </div>

          {/* Movies Table */}
          <div className="rounded-lg border border-border overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-16"></TableHead>
                  <TableHead>Título</TableHead>
                  <TableHead>Ano</TableHead>
                  <TableHead>Gêneros</TableHead>
                  <TableHead>Tier</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {movies?.map((movie) => (
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
                          <Film className="h-5 w-5 text-muted-foreground" />
                        </div>
                      )}
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <span className="font-medium">{movie.title}</span>
                        {movie.featured && (
                          <Star className="h-4 w-4 text-primary fill-primary" />
                        )}
                      </div>
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
                        variant={movie.status === 'published' ? 'default' : 'secondary'}
                        className="flex items-center gap-1 w-fit"
                      >
                        {movie.status === 'published' ? (
                          <Eye className="h-3 w-3" />
                        ) : (
                          <EyeOff className="h-3 w-3" />
                        )}
                        {movie.status === 'published' ? 'Publicado' : 'Rascunho'}
                      </Badge>
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
                              <AlertDialogTitle>Excluir filme?</AlertDialogTitle>
                              <AlertDialogDescription>
                                Esta ação não pode ser desfeita. O filme "{movie.title}" 
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
                ))}
                {(!movies || movies.length === 0) && (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center py-12">
                      <Film className="h-12 w-12 mx-auto text-muted-foreground mb-3" />
                      <p className="text-muted-foreground">
                        Nenhum filme cadastrado ainda.
                      </p>
                      <Link to="/admin/movies/new">
                        <Button variant="outline" className="mt-4">
                          <Plus className="h-4 w-4 mr-2" />
                          Adicionar primeiro filme
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
