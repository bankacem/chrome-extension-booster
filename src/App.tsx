import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { ThemeProvider } from "next-themes";
import { HelmetProvider } from "react-helmet-async";
import Index from "./pages/Index";
import Blog from "./pages/Blog";
import BlogPost from "./pages/BlogPost";
import Admin from "./pages/Admin";
import AdminLogin from "./pages/AdminLogin";
import AIGenerator from "./pages/AIGenerator";
import ExtensionPage from "./pages/ExtensionPage";
import SEOAnalyzer from "./pages/SEOAnalyzer";
import SEODashboard from "./pages/SEODashboard";
import Privacy from "./pages/Privacy";
import Terms from "./pages/Terms";
import EditorialPolicy from "./pages/EditorialPolicy";
import NotFound from "./pages/NotFound";

// i18n — must be imported before any component that uses useTranslation
import "./i18n";

const queryClient = new QueryClient();

const App = () => (
  <HelmetProvider>
    <QueryClientProvider client={queryClient}>
      <ThemeProvider attribute="class" defaultTheme="dark" enableSystem>
        <TooltipProvider>
          <Toaster />
          <Sonner />
          <BrowserRouter>
            <Routes>
              {/* ── English (default) ── */}
              <Route path="/" element={<Index />} />
              <Route path="/blog" element={<Blog />} />
              <Route path="/blog/:slug" element={<BlogPost />} />
              <Route path="/extension/:slug" element={<ExtensionPage />} />

              {/* ── French ── */}
              <Route path="/fr" element={<Index />} />
              <Route path="/fr/blog" element={<Blog />} />
              <Route path="/fr/blog/:slug" element={<BlogPost />} />

              {/* ── Spanish ── */}
              <Route path="/es" element={<Index />} />
              <Route path="/es/blog" element={<Blog />} />
              <Route path="/es/blog/:slug" element={<BlogPost />} />

              {/* ── Admin / internal ── */}
              <Route path="/admin" element={<AdminLogin />} />
              <Route path="/settings" element={<AdminLogin />} />
              <Route path="/settings/manage" element={<Admin />} />
              <Route path="/settings/ai-generator" element={<AIGenerator />} />
              <Route path="/settings/seo-dashboard" element={<SEODashboard />} />
              <Route path="/settings/seo/:slug" element={<SEOAnalyzer />} />
              <Route path="/privacy" element={<Privacy />} />
              <Route path="/terms" element={<Terms />} />
              <Route path="/editorial-policy" element={<EditorialPolicy />} />
              <Route path="*" element={<NotFound />} />
            </Routes>
          </BrowserRouter>
        </TooltipProvider>
      </ThemeProvider>
    </QueryClientProvider>
  </HelmetProvider>
);

export default App;
