import { Toaster } from "@/components/ui/toaster";
import { lazy, Suspense } from "react";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { ThemeProvider } from "next-themes";
import { HelmetProvider } from "react-helmet-async";
const Index = lazy(() => import("./pages/Index"));
const Blog = lazy(() => import("./pages/Blog"));
const BlogPost = lazy(() => import("./pages/BlogPost"));
const Admin = lazy(() => import("./pages/Admin"));
const AdminLogin = lazy(() => import("./pages/AdminLogin"));
const AIGenerator = lazy(() => import("./pages/AIGenerator"));
const ExtensionPage = lazy(() => import("./pages/ExtensionPage"));
const SEOAnalyzer = lazy(() => import("./pages/SEOAnalyzer"));
const SEODashboard = lazy(() => import("./pages/SEODashboard"));
const Privacy = lazy(() => import("./pages/Privacy"));
const Terms = lazy(() => import("./pages/Terms"));
const EditorialPolicy = lazy(() => import("./pages/EditorialPolicy"));
const NotFound = lazy(() => import("./pages/NotFound"));

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
            <Suspense fallback={<div className="min-h-screen bg-background text-foreground flex items-center justify-center">Loading…</div>}>
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

              {/* ── Portuguese (BR) ── */}
              <Route path="/pt" element={<Index />} />
              <Route path="/pt/blog" element={<Blog />} />
              <Route path="/pt/blog/:slug" element={<BlogPost />} />

              {/* ── Arabic (MSA / RTL) ── */}
              <Route path="/ar" element={<Index />} />
              <Route path="/ar/blog" element={<Blog />} />
              <Route path="/ar/blog/:slug" element={<BlogPost />} />

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
            </Suspense>
          </BrowserRouter>
        </TooltipProvider>
      </ThemeProvider>
    </QueryClientProvider>
  </HelmetProvider>
);

export default App;
