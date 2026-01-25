import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { ArrowLeft, Play, Check, X, Clock, Eye, Film, User, Tv, Theater } from 'lucide-react';
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
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
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
import { Textarea } from '@/components/ui/textarea';
import { useAuth } from '@/contexts/AuthContext';
import { useMovies, useUpdateMovie } from '@/hooks/useMovies';
import { useToast } from '@/hooks/use-toast';
import { Navigate } from 'react-router-dom';
import type { MovieStatus, ContentType } from '@/types/movie';

const STATUS_CONFIG: Record<MovieStatus, { label: string; icon: React.ElementType; variant: 'default' | 'secondary' | 'destructive' | 'outline' }> = {
  draft: { label: 'Rascunho', icon: Film, variant: 'outline' },
  pending_review: { label: 'Aguardando Avaliação', icon: Clock, variant: 'secondary' },
  published: { label: 'No Ar', icon: Eye, variant: 'default' },
  rejected: { label: 'Recusado', icon: X, variant: 'destructive' },
};

const CONTENT_TYPE_CONFIG: Record<ContentType, { label: string; icon: React.ElementType }> = {
  filme: { label: 'Filme', icon: Film },
  serie: { label: 'Série', icon: Tv },
  espetaculo: { label: 'Espetáculo', icon: Theater },
};

export default function VideoApproval() {
  const navigate = useNavigate();
  const { hasRole, isLoading: authLoading } = useAuth();
  const { data: allMovies, isLoading: moviesLoading } = useMovies(true);
  const updateMovie = useUpdateMovie();
  const { toast } = useToast();

  const [previewMovie, setPreviewMovie] = useState<any>(null);
  const [rejectDialogOpen, setRejectDialogOpen] = useState(false);
  const [movieToReject, setMovieToReject] = useState<any>(null);
  const [rejectReason, setRejectReason] = useState('');

  // Filter movies that need review
  const pendingMovies = allMovies?.filter(m => (m.status as string) === 'pending_review') || [];
  const recentlyReviewed = allMovies?.filter(m => 
    (m.status as string) === 'published' || (m.status as string) === 'rejected'
  ).slice(0, 10) || [];

  // Redirect non-admins
  if (!authLoading && !hasRole('admin')) {
    return <Navigate to="/" replace />;
  }

  const handleApprove = async (movie: any) => {
    try {
      await updateMovie.mutateAsync({
        id: movie.id,
        status: 'published',
      } as any);
      toast({
        title: 'Vídeo aprovado!',
        description: `"${movie.title}" está agora no ar.`,
      });
      setPreviewMovie(null);
    } catch (error) {
      toast({
        title: 'Erro ao aprovar',
        description: 'Não foi possível aprovar o vídeo.',
        variant: 'destructive',
      });
    }
  };

  const handleReject = async () => {
    if (!movieToReject) return;
    
    try {
      await updateMovie.mutateAsync({
        id: movieToReject.id,
        status: 'rejected',
      } as any);
      toast({
        title: 'Vídeo recusado',
        description: `"${movieToReject.title}" foi recusado.`,
      });
      setRejectDialogOpen(false);
      setMovieToReject(null);
      setRejectReason('');
      setPreviewMovie(null);
    } catch (error) {
      toast({
        title: 'Erro ao recusar',
        description: 'Não foi possível recusar o vídeo.',
        variant: 'destructive',
      });
    }
  };

  const openRejectDialog = (movie: any) => {
    setMovieToReject(movie);
    setRejectDialogOpen(true);
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
          className="space-y-8"
        >
          {/* Header */}
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="icon" onClick={() => navigate(-1)}>
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <div>
              <h1 className="text-2xl font-bold">Aprovação de Vídeos</h1>
              <p className="text-muted-foreground">
                {pendingMovies.length} vídeo(s) aguardando sua avaliação
              </p>
            </div>
          </div>

          {/* Pending Videos */}
          <div className="space-y-4">
            <h2 className="text-lg font-semibold flex items-center gap-2">
              <Clock className="h-5 w-5 text-yellow-500" />
              Aguardando Avaliação
            </h2>
            
            <div className="rounded-lg border border-border overflow-hidden">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-16"></TableHead>
                    <TableHead>Título</TableHead>
                    <TableHead>Tipo</TableHead>
                    <TableHead>Produtor</TableHead>
                    <TableHead>Enviado em</TableHead>
                    <TableHead className="text-right">Ações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {pendingMovies.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={6} className="text-center py-12">
                        <Check className="h-12 w-12 mx-auto text-green-500 mb-3" />
                        <p className="text-muted-foreground">
                          Nenhum vídeo aguardando avaliação!
                        </p>
                      </TableCell>
                    </TableRow>
                  ) : (
                    pendingMovies.map((movie) => {
                      const contentTypeConfig = CONTENT_TYPE_CONFIG[movie.content_type as ContentType];
                      const ContentTypeIcon = contentTypeConfig?.icon || Film;
                      
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
                                <ContentTypeIcon className="h-5 w-5 text-muted-foreground" />
                              </div>
                            )}
                          </TableCell>
                          <TableCell>
                            <div className="flex flex-col">
                              <span className="font-medium">{movie.title}</span>
                              {movie.content_type === 'serie' && movie.total_seasons && (
                                <span className="text-xs text-muted-foreground">
                                  {movie.total_seasons} temp. {movie.total_episodes && `• ${movie.total_episodes} ep.`}
                                </span>
                              )}
                            </div>
                          </TableCell>
                          <TableCell>
                            <Badge variant="outline" className="gap-1">
                              <ContentTypeIcon className="h-3 w-3" />
                              {contentTypeConfig?.label || movie.content_type}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center gap-2">
                              <User className="h-4 w-4 text-muted-foreground" />
                              <span>{movie.producer_name || 'Desconhecido'}</span>
                            </div>
                          </TableCell>
                          <TableCell>
                            {new Date(movie.updated_at).toLocaleDateString('pt-BR')}
                          </TableCell>
                          <TableCell className="text-right">
                            <div className="flex items-center justify-end gap-2">
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => setPreviewMovie(movie)}
                              >
                                <Play className="h-4 w-4 mr-1" />
                                Avaliar
                              </Button>
                              <Button
                                variant="default"
                                size="sm"
                                onClick={() => handleApprove(movie)}
                                disabled={updateMovie.isPending}
                              >
                                <Check className="h-4 w-4 mr-1" />
                                Aprovar
                              </Button>
                              <Button
                                variant="destructive"
                                size="sm"
                                onClick={() => openRejectDialog(movie)}
                                disabled={updateMovie.isPending}
                              >
                                <X className="h-4 w-4 mr-1" />
                                Recusar
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      );
                    })
                  )}
                </TableBody>
              </Table>
            </div>
          </div>

          {/* Recently Reviewed */}
          {recentlyReviewed.length > 0 && (
            <div className="space-y-4">
              <h2 className="text-lg font-semibold">Avaliados Recentemente</h2>
              
              <div className="rounded-lg border border-border overflow-hidden">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-16"></TableHead>
                      <TableHead>Título</TableHead>
                      <TableHead>Tipo</TableHead>
                      <TableHead>Produtor</TableHead>
                      <TableHead>Status</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {recentlyReviewed.map((movie) => {
                      const statusConfig = STATUS_CONFIG[movie.status as MovieStatus];
                      const Icon = statusConfig?.icon || Film;
                      const contentTypeConfig = CONTENT_TYPE_CONFIG[movie.content_type as ContentType];
                      const ContentTypeIcon = contentTypeConfig?.icon || Film;
                      
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
                                <ContentTypeIcon className="h-5 w-5 text-muted-foreground" />
                              </div>
                            )}
                          </TableCell>
                          <TableCell>
                            <div className="flex flex-col">
                              <span className="font-medium">{movie.title}</span>
                              {movie.content_type === 'serie' && movie.total_seasons && (
                                <span className="text-xs text-muted-foreground">
                                  {movie.total_seasons} temp. {movie.total_episodes && `• ${movie.total_episodes} ep.`}
                                </span>
                              )}
                            </div>
                          </TableCell>
                          <TableCell>
                            <Badge variant="outline" className="gap-1">
                              <ContentTypeIcon className="h-3 w-3" />
                              {contentTypeConfig?.label || movie.content_type}
                            </Badge>
                          </TableCell>
                          <TableCell>{movie.producer_name || 'Desconhecido'}</TableCell>
                          <TableCell>
                            <Badge variant={statusConfig?.variant || 'outline'} className="gap-1">
                              <Icon className="h-3 w-3" />
                              {statusConfig?.label || movie.status}
                            </Badge>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </div>
            </div>
          )}
        </motion.div>

        {/* Preview Dialog */}
        <Dialog open={!!previewMovie} onOpenChange={() => setPreviewMovie(null)}>
          <DialogContent className="max-w-4xl">
            <DialogHeader>
              <DialogTitle>{previewMovie?.title}</DialogTitle>
              <DialogDescription>
                Enviado por: {previewMovie?.producer_name || 'Desconhecido'}
              </DialogDescription>
            </DialogHeader>
            
            {previewMovie?.video_url ? (
              <div className="aspect-video bg-black rounded-lg overflow-hidden">
                <video
                  src={previewMovie.video_url}
                  controls
                  className="w-full h-full"
                />
              </div>
            ) : previewMovie?.trailer_url ? (
              <div className="aspect-video bg-black rounded-lg overflow-hidden">
                <video
                  src={previewMovie.trailer_url}
                  controls
                  className="w-full h-full"
                />
              </div>
            ) : (
              <div className="aspect-video bg-muted rounded-lg flex items-center justify-center">
                <p className="text-muted-foreground">Nenhum vídeo disponível para preview</p>
              </div>
            )}

            {previewMovie?.synopsis && (
              <div>
                <h4 className="font-medium mb-1">Sinopse</h4>
                <p className="text-sm text-muted-foreground">{previewMovie.synopsis}</p>
              </div>
            )}

            <DialogFooter>
              <Button variant="outline" onClick={() => setPreviewMovie(null)}>
                Fechar
              </Button>
              <Button
                variant="destructive"
                onClick={() => {
                  openRejectDialog(previewMovie);
                }}
              >
                <X className="h-4 w-4 mr-1" />
                Recusar
              </Button>
              <Button onClick={() => handleApprove(previewMovie)}>
                <Check className="h-4 w-4 mr-1" />
                Aprovar
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Reject Dialog */}
        <AlertDialog open={rejectDialogOpen} onOpenChange={setRejectDialogOpen}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Recusar vídeo?</AlertDialogTitle>
              <AlertDialogDescription>
                O vídeo "{movieToReject?.title}" será marcado como recusado e não irá ao ar.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <div className="py-4">
              <Textarea
                placeholder="Motivo da recusa (opcional)..."
                value={rejectReason}
                onChange={(e) => setRejectReason(e.target.value)}
                rows={3}
              />
            </div>
            <AlertDialogFooter>
              <AlertDialogCancel onClick={() => {
                setRejectReason('');
                setMovieToReject(null);
              }}>
                Cancelar
              </AlertDialogCancel>
              <AlertDialogAction
                onClick={handleReject}
                className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              >
                Recusar Vídeo
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </Layout>
  );
}