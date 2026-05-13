import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { ThemeProvider } from "next-themes";
import { HelmetProvider, Helmet } from "react-helmet-async";
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
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const NoIndex = () => (
  <Helmet>
    <meta name="robots" content="noindex, nofollow" />
  </Helmet>
);

const App = () => (
  <HelmetProvider>
    <QueryClientProvider client={queryClient}>
      <ThemeProvider attribute="class" defaultTheme="dark" enableSystem>
        <TooltipProvider>
          <Toaster />
          <Sonner />
          <BrowserRouter basename={import.meta.env.BASE_URL}>
            <Routes>
              <Route path="/" element={<Index />} />
              <Route path="/blog" element={<Blog />} />
              <Route path="/blog/:slug" element={<BlogPost />} />
              <Route path="/extension/:slug" element={<ExtensionPage />} />
              <Route path="/admin" element={<><NoIndex /><AdminLogin /></>} />
              <Route path="/settings" element={<><NoIndex /><AdminLogin /></>} />
              <Route path="/settings/manage" element={<><NoIndex /><Admin /></>} />
              <Route path="/settings/ai-generator" element={<><NoIndex /><AIGenerator /></>} />
              <Route path="/settings/seo-dashboard" element={<><NoIndex /><SEODashboard /></>} />
              <Route path="/settings/seo/:slug" element={<><NoIndex /><SEOAnalyzer /></>} />
              <Route path="/privacy" element={<Privacy />} />
              <Route path="/terms" element={<Terms />} />
              <Route path="*" element={<NotFound />} />
            </Routes>
          </BrowserRouter>
        </TooltipProvider>
      </ThemeProvider>
    </QueryClientProvider>
  </HelmetProvider>
);

export default App;
