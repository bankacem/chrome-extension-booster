import { useState, useEffect } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import { motion } from "framer-motion";
import { 
  ArrowLeft, 
  RefreshCw, 
  ExternalLink,
  FileText,
  Target,
  TrendingUp,
  Loader2,
  Sparkles
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { supabase, isSupabaseConfigured } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { analyzeSEO, type SEOAnalysis } from "@/lib/seoAnalyzer";
import SEO from "@/components/SEO";
import { RadialScoreGauge } from "@/components/seo/RadialScoreGauge";
import { KeywordsSidebar } from "@/components/seo/KeywordsSidebar";
import { SEOStatsCards } from "@/components/seo/SEOStatsCards";
import { SEOIssuesList } from "@/components/seo/SEOIssuesList";
import { GoogleSearchConsoleCard } from "@/components/seo/GoogleSearchConsoleCard";
import { CompetitorAnalysis } from "@/components/seo/CompetitorAnalysis";
import { AIOptimizeButton } from "@/components/seo/AIOptimizeButton";

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
}

const SEOAnalyzer = () => {
  const { slug } = useParams<{ slug: string }>();
  const navigate = useNavigate();
  const { toast } = useToast();
  
  const [article, setArticle] = useState<Article | null>(null);
  const [analysis, setAnalysis] = useState<SEOAnalysis | null>(null);
  const [loading, setLoading] = useState(true);
  const [analyzing, setAnalyzing] = useState(false);

  useEffect(() => {
    const checkAuth = async () => {
      if (!isSupabaseConfigured) {
        fetchArticle();
        return;
      }

      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        navigate("/settings");
        return;
      }

      const { data: role, error: roleError } = await supabase
        .from("user_roles")
        .select("role")
        .eq("user_id", session.user.id)
        .single();

      if (roleError || role?.role !== "admin") {
        await supabase.auth.signOut();
        navigate("/settings");
        return;
      }

      fetchArticle();
    };

    checkAuth();
  }, [slug, navigate]);

  const fetchArticle = async () => {
    if (!slug) return;
    setLoading(true);

    if (!isSupabaseConfigured) {
      // Dev-bypass: find article in markdown index, then fetch its content
      try {
        const idxRes = await fetch("/content/articles-index.json");
        const index = await idxRes.json();
        const entry = index.find((a: any) => a.slug === slug);
        if (!entry) throw new Error("Not found in index");

        let content = "";
        if (entry.filePath) {
          const mdRes = await fetch(entry.filePath);
          if (mdRes.ok) {
            const raw = await mdRes.text();
            // Strip frontmatter
            content = raw.replace(/^---[\s\S]*?---\n?/, "").trim();
          }
        }

        const article: Article = {
          id: entry.id || slug,
          title: entry.title || "",
          slug: entry.slug || slug,
          content,
          excerpt: entry.excerpt || null,
          featured_image: entry.featured_image || null,
          category: entry.category || null,
          tags: entry.tags || null,
          keywords: entry.keywords || null,
          meta_description: entry.description || null,
          status: "published",
        };
        setArticle(article);
        runAnalysis(article);
      } catch {
        toast({ title: "Error", description: "Article not found", variant: "destructive" });
        navigate("/settings/manage");
      } finally {
        setLoading(false);
      }
      return;
    }

    const { data, error } = await supabase
      .from("articles")
      .select("*")
      .eq("slug", slug)
      .single();

    if (error) {
      toast({
        title: "Error",
        description: "Article not found",
        variant: "destructive"
      });
      navigate("/settings/manage");
      return;
    }

    setArticle(data);
    runAnalysis(data);
    setLoading(false);
  };

  const runAnalysis = (articleData: Article) => {
    setAnalyzing(true);
    
    // Simulate processing time for visual effect
    setTimeout(() => {
      const result = analyzeSEO(
        articleData.title,
        articleData.content,
        articleData.meta_description,
        articleData.category,
        articleData.keywords
      );
      setAnalysis(result);
      setAnalyzing(false);
    }, 500);
  };

  const handleRefresh = () => {
    if (article) {
      runAnalysis(article);
      toast({
        title: "Analysis Updated",
        description: "SEO analysis has been refreshed"
      });
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="flex items-center gap-3">
          <Loader2 className="w-6 h-6 animate-spin text-primary" />
          <span className="text-lg">Loading article...</span>
        </div>
      </div>
    );
  }

  if (!article || !analysis) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-xl font-semibold mb-2">Article not found</h2>
          <Button onClick={() => navigate("/settings/manage")}>
            Back to Admin
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <SEO
        title={`SEO Analysis: ${article.title}`}
        description={`Detailed SEO analysis and optimization recommendations for "${article.title}".`}
        noindex
      />
      {/* Header */}
      <header className="sticky top-0 z-50 border-b border-border bg-background/80 backdrop-blur-xl">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Button
                variant="ghost"
                size="icon"
                onClick={() => navigate("/settings/manage")}
              >
                <ArrowLeft className="w-5 h-5" />
              </Button>
              <div>
                <h1 className="font-heading text-xl font-bold truncate max-w-md">
                  SEO Analysis
                </h1>
                <p className="text-sm text-muted-foreground truncate max-w-md">
                  {article.title}
                </p>
              </div>
            </div>
            
            <div className="flex items-center gap-2">
              {/* AI Magic Fix Button */}
              {analysis && (
                <AIOptimizeButton
                  articleId={article.id}
                  content={article.content}
                  title={article.title}
                  metaDescription={article.meta_description}
                  targetKeyword={article.keywords?.[0] || ''}
                  missingKeywords={analysis.nlpKeywords.filter(k => !k.found).map(k => k.keyword)}
                  issues={analysis.issues}
                  currentKeywordDensity={analysis.keywordDensity}
                  wordCount={analysis.wordCount}
                  onOptimized={() => fetchArticle()}
                />
              )}
              
              <Button
                variant="outline"
                size="sm"
                onClick={handleRefresh}
                disabled={analyzing}
              >
                <RefreshCw className={`w-4 h-4 mr-2 ${analyzing ? 'animate-spin' : ''}`} />
                Refresh
              </Button>
              <Button
                variant="outline"
                size="sm"
                asChild
              >
                <Link to={`/blog/${article.slug}`} target="_blank">
                  <ExternalLink className="w-4 h-4 mr-2" />
                  Preview
                </Link>
              </Button>
            </div>
          </div>
        </div>
      </header>

      <div className="flex">
        {/* Main Content */}
        <main className="flex-1 p-6">
          <div className="max-w-5xl mx-auto space-y-8">
            {/* Score Section */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="glass-card p-8"
            >
              <div className="flex flex-col md:flex-row items-center gap-8">
                {/* Radial Score */}
                <div className="flex-shrink-0">
                  <RadialScoreGauge score={analysis.score} size={180} />
                </div>
                
                {/* Score Details */}
                <div className="flex-1 text-center md:text-left">
                  <h2 className="font-heading text-2xl font-bold mb-2">
                    SEO Score Overview
                  </h2>
                  <p className="text-muted-foreground mb-4">
                    {analysis.score >= 80 
                      ? "Great job! Your content is well-optimized for search engines."
                      : analysis.score >= 50
                        ? "Good progress! There are some improvements that could boost your rankings."
                        : "Your content needs optimization. Follow the recommendations below."
                    }
                  </p>
                  
                  {/* Quick badges */}
                  <div className="flex flex-wrap gap-2 justify-center md:justify-start">
                    <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-primary/10 text-primary text-sm">
                      <FileText className="w-3.5 h-3.5" />
                      <span>{analysis.wordCount} words</span>
                    </div>
                    {article.keywords?.[0] && (
                      <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-accent/10 text-accent text-sm">
                        <Target className="w-3.5 h-3.5" />
                        <span>{article.keywords[0]}</span>
                      </div>
                    )}
                    <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-green-500/10 text-green-500 text-sm">
                      <TrendingUp className="w-3.5 h-3.5" />
                      <span>Readability: {Math.round(analysis.readabilityScore)}</span>
                    </div>
                  </div>
                </div>
              </div>
            </motion.div>

            {/* Competitor Analysis */}
            <CompetitorAnalysis
              wordCount={analysis.wordCount}
              headingsCount={analysis.headingsCount}
              imagesCount={analysis.imagesCount}
              internalLinks={analysis.internalLinks}
              externalLinks={analysis.externalLinks}
            />

            {/* Google Search Console */}
            <GoogleSearchConsoleCard 
              articleSlug={article.slug}
              articleUrl={`https://extensionto.com/blog/${article.slug}`}
            />

            {/* Stats Cards */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
            >
              <h3 className="font-heading text-lg font-semibold mb-4">Content Statistics</h3>
              <SEOStatsCards
                wordCount={analysis.wordCount}
                headingsCount={analysis.headingsCount}
                imagesCount={analysis.imagesCount}
                internalLinks={analysis.internalLinks}
                externalLinks={analysis.externalLinks}
                keywordDensity={analysis.keywordDensity}
                titleLength={analysis.titleLength}
                metaDescriptionLength={analysis.metaDescriptionLength}
              />
            </motion.div>

            {/* Issues & Recommendations */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.4 }}
              className="glass-card p-6"
            >
              <h3 className="font-heading text-lg font-semibold mb-4">Issues & Recommendations</h3>
              <SEOIssuesList 
                issues={analysis.issues} 
                recommendations={analysis.recommendations} 
              />
            </motion.div>

            {/* Keyword Checks */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.6 }}
              className="glass-card p-6"
            >
              <h3 className="font-heading text-lg font-semibold mb-4">Keyword Optimization</h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className={`p-4 rounded-xl border ${
                  analysis.keywordInTitle 
                    ? 'bg-green-500/10 border-green-500/30' 
                    : 'bg-destructive/10 border-destructive/30'
                }`}>
                  <div className="flex items-center gap-2 mb-1">
                    {analysis.keywordInTitle ? (
                      <span className="text-green-500">✓</span>
                    ) : (
                      <span className="text-destructive">✗</span>
                    )}
                    <span className="font-medium">Keyword in Title</span>
                  </div>
                  <p className="text-sm text-muted-foreground">
                    {analysis.keywordInTitle 
                      ? "Target keyword found in title" 
                      : "Add target keyword to title"}
                  </p>
                </div>
                
                <div className={`p-4 rounded-xl border ${
                  analysis.keywordInFirstParagraph 
                    ? 'bg-green-500/10 border-green-500/30' 
                    : 'bg-yellow-500/10 border-yellow-500/30'
                }`}>
                  <div className="flex items-center gap-2 mb-1">
                    {analysis.keywordInFirstParagraph ? (
                      <span className="text-green-500">✓</span>
                    ) : (
                      <span className="text-yellow-500">!</span>
                    )}
                    <span className="font-medium">Keyword in First Paragraph</span>
                  </div>
                  <p className="text-sm text-muted-foreground">
                    {analysis.keywordInFirstParagraph 
                      ? "Keyword appears in introduction" 
                      : "Include keyword early in content"}
                  </p>
                </div>
                
                <div className={`p-4 rounded-xl border ${
                  analysis.keywordInMetaDescription 
                    ? 'bg-green-500/10 border-green-500/30' 
                    : 'bg-yellow-500/10 border-yellow-500/30'
                }`}>
                  <div className="flex items-center gap-2 mb-1">
                    {analysis.keywordInMetaDescription ? (
                      <span className="text-green-500">✓</span>
                    ) : (
                      <span className="text-yellow-500">!</span>
                    )}
                    <span className="font-medium">Keyword in Meta Description</span>
                  </div>
                  <p className="text-sm text-muted-foreground">
                    {analysis.keywordInMetaDescription 
                      ? "Meta description is optimized" 
                      : "Add keyword to meta description"}
                  </p>
                </div>
              </div>
            </motion.div>
          </div>
        </main>

        {/* Sidebar - NLP Keywords */}
        <aside className="hidden lg:block w-80 border-l border-border bg-card/50">
          <KeywordsSidebar 
            keywords={analysis.nlpKeywords}
            targetKeyword={article.keywords?.[0]}
          />
        </aside>
      </div>
    </div>
  );
};

export default SEOAnalyzer;
