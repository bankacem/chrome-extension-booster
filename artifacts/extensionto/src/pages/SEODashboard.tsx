import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import {
  Search, RefreshCw, BarChart3, Download, Link as LinkIcon,
  LogOut, ArrowLeft, FileText, Layers, HeartPulse, Target, Shield,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useAdminSession } from "@/hooks/useAdminSession";
import { useToast } from "@/hooks/use-toast";
import SEO from "@/components/SEO";
import KeywordMapper from "@/components/seo-dashboard/KeywordMapper";
import ContentRefresh from "@/components/seo-dashboard/ContentRefresh";
import DownloadManager from "@/components/seo-dashboard/DownloadManager";
import SlugAligner from "@/components/seo-dashboard/SlugAligner";
import CompetitorInsights from "@/components/seo-dashboard/CompetitorInsights";
import ArticleHealth from "@/components/seo-dashboard/ArticleHealth";
import KeywordPerformanceTracker from "@/components/seo-dashboard/KeywordPerformanceTracker";
import KeywordDuplicateChecker from "@/components/seo-dashboard/KeywordDuplicateChecker";

interface Article {
  id: string;
  title: string;
  slug: string;
  content: string;
  excerpt: string | null;
  featured_image: string | null;
  category: string | null;
  tags: string[] | null;
  keywords: string[] | null;
  meta_description: string | null;
  status: string;
  published_at: string | null;
  author: string | null;
  views: number | null;
  read_time: number | null;
  updated_at: string;
}

const SEODashboard = () => {
  const [articles, setArticles] = useState<Article[]>([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();
  const { toast } = useToast();
  const { logout } = useAdminSession();

  // Auth guaranteed by ProtectedAdminRoute — just load data
  useEffect(() => {
    fetchArticles();
  }, []);

  const fetchArticles = async () => {
    setLoading(true);
    try {
      const res = await fetch("/content/articles-index.json");
      if (!res.ok) throw new Error("Failed to fetch articles index");
      const indexData = await res.json();
      const mapped: Article[] = indexData.map((item: any) => ({
        id: item.id || item.slug,
        title: item.title || "",
        slug: item.slug || "",
        content: "",
        excerpt: item.excerpt || item.description || null,
        featured_image: item.featured_image || item.image_url || null,
        category: item.category || null,
        tags: item.tags || null,
        keywords: item.keywords || null,
        meta_description: item.description || null,
        status: "published",
        published_at: item.published_at || null,
        author: item.author || null,
        views: item.views || null,
        read_time: item.read_time || item.reading_time || null,
        updated_at: item.updated_at || "",
      }));
      setArticles(mapped);
    } catch (error) {
      console.error("Error fetching articles index:", error);
      toast({ title: "Error", description: "Failed to fetch articles from local index", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  const publishedArticles = articles.filter(a => a.status === "published");

  const handleLogout = () => {
    logout();
    navigate("/admin/login");
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="flex items-center gap-3 text-muted-foreground">
          <RefreshCw className="h-5 w-5 animate-spin" />
          <span>Loading dashboard...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <SEO
        title="SEO Dashboard — ExtensionTo"
        description="SEO analytics and content management dashboard"
        canonicalPath="/settings/seo"
      />

      {/* Header */}
      <header className="sticky top-0 z-50 border-b border-border bg-card/80 backdrop-blur-xl">
        <div className="max-w-[1400px] mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="sm" onClick={() => navigate("/admin/dashboard")} className="gap-2">
              <ArrowLeft className="h-4 w-4" />
              Admin
            </Button>
            <div className="h-6 w-px bg-border" />
            <h1 className="text-lg font-bold font-[family-name:var(--font-heading)] gradient-text">
              SEO Dashboard
            </h1>
          </div>
          <div className="flex items-center gap-3">
            <div className="hidden md:flex items-center gap-4 text-sm text-muted-foreground">
              <span className="flex items-center gap-1.5">
                <FileText className="h-4 w-4" />
                <strong className="text-foreground">{articles.length}</strong> Total
              </span>
              <span className="flex items-center gap-1.5">
                <Layers className="h-4 w-4 text-green-400" />
                <strong className="text-green-400">{publishedArticles.length}</strong> Published
              </span>
            </div>
            <Button variant="ghost" size="sm" onClick={handleLogout} className="gap-2 text-muted-foreground">
              <LogOut className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-[1400px] mx-auto px-4 py-6">
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3 }}
        >
          <Tabs defaultValue="keywords" className="space-y-6">
            <TabsList className="bg-secondary/50 border border-border p-1 h-auto flex-wrap">
              <TabsTrigger value="keywords" className="gap-2 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
                <Search className="h-4 w-4" />
                Keyword Mapper
              </TabsTrigger>
              <TabsTrigger value="refresh" className="gap-2 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
                <RefreshCw className="h-4 w-4" />
                Content Refresh
              </TabsTrigger>
              <TabsTrigger value="downloads" className="gap-2 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
                <Download className="h-4 w-4" />
                Downloads
              </TabsTrigger>
              <TabsTrigger value="slugs" className="gap-2 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
                <LinkIcon className="h-4 w-4" />
                Slug Aligner
              </TabsTrigger>
              <TabsTrigger value="competitors" className="gap-2 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
                <BarChart3 className="h-4 w-4" />
                Competitors
              </TabsTrigger>
              <TabsTrigger value="health" className="gap-2 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
                <HeartPulse className="h-4 w-4" />
                Article Health
              </TabsTrigger>
              <TabsTrigger value="tracker" className="gap-2 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
                <Target className="h-4 w-4" />
                Performance Tracker
              </TabsTrigger>
              <TabsTrigger value="duplicates" className="gap-2 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
                <Shield className="h-4 w-4" />
                SEO Shield
              </TabsTrigger>
            </TabsList>

            <TabsContent value="keywords">
              <KeywordMapper articles={publishedArticles} />
            </TabsContent>

            <TabsContent value="refresh">
              <ContentRefresh articles={publishedArticles} />
            </TabsContent>

            <TabsContent value="downloads">
              <DownloadManager articles={publishedArticles} />
            </TabsContent>

            <TabsContent value="slugs">
              <SlugAligner articles={articles} onRefresh={fetchArticles} />
            </TabsContent>

            <TabsContent value="competitors">
              <CompetitorInsights articles={publishedArticles} />
            </TabsContent>

            <TabsContent value="health">
              <ArticleHealth articles={publishedArticles} onRefresh={fetchArticles} />
            </TabsContent>

            <TabsContent value="tracker">
              <KeywordPerformanceTracker articles={publishedArticles} />
            </TabsContent>

            <TabsContent value="duplicates">
              <KeywordDuplicateChecker articles={publishedArticles} />
            </TabsContent>
          </Tabs>
        </motion.div>
      </main>
    </div>
  );
};

export default SEODashboard;
