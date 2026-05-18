import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { ThemeProvider } from "next-themes";
import { HelmetProvider, Helmet } from "react-helmet-async";

import Index from "./pages/Index";
import Blog from "./pages/Blog";
import BlogPost from "./pages/BlogPost";
import Privacy from "./pages/Privacy";
import Terms from "./pages/Terms";
import NotFound from "./pages/NotFound";
import ExtensionPage from "./pages/ExtensionPage";

import AdminLogin from "./pages/AdminLogin";
import Admin from "./pages/Admin";
import CMSCreator from "./pages/CMSCreator";
import AIGenerator from "./pages/AIGenerator";
import SEOAnalyzer from "./pages/SEOAnalyzer";
import SEODashboard from "./pages/SEODashboard";

import AdminAuthLogin from "./pages/AdminAuthLogin";
import AdminDashboard from "./pages/AdminDashboard";
import AdminDrafts from "./pages/AdminDrafts";
import AdminArticles from "./pages/AdminArticles";
import AdminImageGen from "./pages/AdminImageGen";
import AdminScheduler from "./pages/AdminScheduler";
import ProtectedAdminRoute from "./components/admin/ProtectedAdminRoute";

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
              {/* ── Public blog routes ─────────────────────────────── */}
              <Route path="/" element={<Index />} />
              <Route path="/blog" element={<Blog />} />
              <Route path="/blog/:slug" element={<BlogPost />} />
              <Route path="/extension/:slug" element={<ExtensionPage />} />
              <Route path="/privacy" element={<Privacy />} />
              <Route path="/terms" element={<Terms />} />

              {/* ── /admin routes (localStorage auth, v3) ─────────── */}
              <Route
                path="/admin/login"
                element={<><NoIndex /><AdminAuthLogin /></>}
              />
              <Route path="/admin" element={<Navigate to="/admin/dashboard" replace />} />

              <Route
                path="/admin/dashboard"
                element={<ProtectedAdminRoute><NoIndex /><AdminDashboard /></ProtectedAdminRoute>}
              />
              <Route
                path="/admin/articles"
                element={<ProtectedAdminRoute><NoIndex /><AdminArticles /></ProtectedAdminRoute>}
              />
              <Route
                path="/admin/drafts"
                element={<ProtectedAdminRoute><NoIndex /><AdminDrafts /></ProtectedAdminRoute>}
              />
              <Route
                path="/admin/cms"
                element={<ProtectedAdminRoute><NoIndex /><CMSCreator /></ProtectedAdminRoute>}
              />
              <Route
                path="/admin/seo"
                element={<ProtectedAdminRoute><NoIndex /><SEODashboard /></ProtectedAdminRoute>}
              />
              <Route
                path="/admin/ai"
                element={<ProtectedAdminRoute><NoIndex /><AIGenerator /></ProtectedAdminRoute>}
              />
              <Route
                path="/admin/images"
                element={<ProtectedAdminRoute><NoIndex /><AdminImageGen /></ProtectedAdminRoute>}
              />
              <Route
                path="/admin/scheduler"
                element={<ProtectedAdminRoute><NoIndex /><AdminScheduler /></ProtectedAdminRoute>}
              />

              {/* ── /settings routes (legacy — redirect to new admin) ── */}
              <Route path="/settings" element={<Navigate to="/admin/login" replace />} />
              <Route path="/settings/manage" element={<Navigate to="/admin/dashboard" replace />} />
              <Route path="/settings/cms" element={<Navigate to="/admin/cms" replace />} />
              <Route path="/settings/ai-generator" element={<Navigate to="/admin/ai" replace />} />
              <Route path="/settings/seo-dashboard" element={<Navigate to="/admin/seo" replace />} />
              <Route path="/settings/seo/:slug" element={<><NoIndex /><SEOAnalyzer /></>} />

              {/* ── Catch-all ──────────────────────────────────────── */}
              <Route path="*" element={<NotFound />} />
            </Routes>
          </BrowserRouter>
        </TooltipProvider>
      </ThemeProvider>
    </QueryClientProvider>
  </HelmetProvider>
);

export default App;
