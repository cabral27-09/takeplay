import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "@/contexts/AuthContext";
import Index from "./pages/Index";
import MovieDetail from "./pages/MovieDetail";
import Watch from "./pages/Watch";
import Share from "./pages/Share";
import Browse from "./pages/Browse";
import Filmes from "./pages/Filmes";
import Series from "./pages/Series";
import Espetaculo from "./pages/Espetaculo";
import Genres from "./pages/Genres";
import Search from "./pages/Search";
import Auth from "./pages/Auth";
import ResetPassword from "./pages/ResetPassword";
import Trailers from "./pages/Trailers";
import Pricing from "./pages/Pricing";
import NotFound from "./pages/NotFound";
import AdminMovies from "./pages/admin/Movies";
import AdminUsers from "./pages/admin/Users";
import MovieForm from "./pages/admin/MovieForm";
import VideoApproval from "./pages/admin/VideoApproval";
import ProducerMovies from "./pages/producer/Movies";
import ProducerUploadMovie from "./pages/producer/UploadMovie";
import ProducerPricing from "./pages/producer/Pricing";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <AuthProvider>
          <Routes>
            <Route path="/" element={<Index />} />
            <Route path="/auth" element={<Auth />} />
            <Route path="/reset-password" element={<ResetPassword />} />
            <Route path="/movie/:id" element={<MovieDetail />} />
            <Route path="/watch/:id" element={<Watch />} />
            <Route path="/share/:id" element={<Share />} />
            <Route path="/browse" element={<Browse />} />
            <Route path="/filmes" element={<Filmes />} />
            <Route path="/series" element={<Series />} />
            <Route path="/espetaculo" element={<Espetaculo />} />
            <Route path="/genres" element={<Genres />} />
            <Route path="/trailers" element={<Trailers />} />
            <Route path="/pricing" element={<Pricing />} />
            <Route path="/search" element={<Search />} />
            {/* Admin routes */}
            <Route path="/admin/movies" element={<AdminMovies />} />
            <Route path="/admin/movies/new" element={<MovieForm />} />
            <Route path="/admin/movies/:id/edit" element={<MovieForm />} />
            <Route path="/admin/users" element={<AdminUsers />} />
            <Route path="/admin/approval" element={<VideoApproval />} />
            {/* Producer routes */}
            <Route path="/producer/movies" element={<ProducerMovies />} />
            <Route path="/producer/movies/new" element={<ProducerUploadMovie />} />
            <Route path="/producer/movies/:id/edit" element={<ProducerUploadMovie />} />
            <Route path="/producer/pricing" element={<ProducerPricing />} />
            <Route path="*" element={<NotFound />} />
          </Routes>
        </AuthProvider>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
