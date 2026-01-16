import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "@/contexts/AuthContext";
import Index from "./pages/Index";
import MovieDetail from "./pages/MovieDetail";
import Watch from "./pages/Watch";
import Browse from "./pages/Browse";
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
            <Route path="/browse" element={<Browse />} />
            <Route path="/genres" element={<Genres />} />
            <Route path="/trailers" element={<Trailers />} />
            <Route path="/pricing" element={<Pricing />} />
            <Route path="/search" element={<Search />} />
            <Route path="/admin/movies" element={<AdminMovies />} />
            <Route path="/admin/movies/new" element={<MovieForm />} />
            <Route path="/admin/movies/:id/edit" element={<MovieForm />} />
            <Route path="/admin/users" element={<AdminUsers />} />
            <Route path="*" element={<NotFound />} />
          </Routes>
        </AuthProvider>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
