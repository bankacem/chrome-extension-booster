import { useState, useEffect, useCallback } from "react";
import { useParams, Link } from "react-router-dom";
import { motion } from "framer-motion";
import { Calendar, Clock, ArrowLeft, Tag, User, Share2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import SEO from "@/components/SEO";
import SchemaMarkup from "@/components/SchemaMarkup";
import DirectDownloadSection from "@/components/seo/DirectDownloadSection";
import VideoPlayer from "@/components/blog/VideoPlayer";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import yaml from "js-yaml";
import { getPartitionedPath, resolveImagePath } from "@/utils/articlePath";
import { detectExtensionFromContent } from "@/lib/autoExtensionLinker";
import { getExtensionBySlug, Extension } from "@/lib/extensionsData";
import ReactMarkdown from "react-markdown";

interface Article {
  id: string;
  title: string;
  slug: string;
  content: string;
  excerpt: string;
  featured_image: string;
  category: string;
  tags: string[];
  keywords: string[];
  meta_description: string;
  canonicalPath?: string;
  published_at: string;
  read_time: number;
  author: string;
  views: number;
  related_extension_slug?: string;
  featured_video?: string;
  schema?: any;
}

const parseMarkdown = (text: string) => {
  const match = text.match(/^---([\s\S]*?)---([\s\S]*)$/);
  if (!match) return { frontmatter: {} as Partial<Article>, content: text };
  try {
    const frontmatter = yaml.load(match[1]) as Partial<Article>;
    const content = match[2].trim();
    return { frontmatter, content };
  } catch (e) {
    console.error("Error parsing frontmatter:", e);
    return { frontmatter: {} as Partial<Article>, content: text };
  }
};

const processArticleContent = (content: string) => {
  if (!content) return "";

  let processed = content;

  // 1. منع تكرار الصور: حذف أول صورة تظهر في بداية النص إذا كانت تطابق الصورة البارزة
  processed = processed.replace(/^(!\[[^\]]*\]\([^)]+\)\s*)/i, "");
  processed = processed.replace(/^(<img[^>]*>\s*)/i, "");

  // 2. إصلاح روابط اليوتيوب وتحويلها إلى لاعب مدمج
  processed = processed.replace(
    /<a[^>]*href=["'](https?:\/\/(?:www\.)?(?:youtube\.com\/watch\?v=|youtu\.be\/)([a-zA-Z0-9_-]{11})[^"']*)["'][^>]*>.*?<\/a>/gi,
    '<div class="aspect-video my-6 rounded-xl overflow-hidden border border-border"><iframe src="https://www.youtube-nocookie.com/embed/$2" title="Video" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" allowfullscreen class="w-full h-full" loading="lazy"></iframe></div>'
  );

  return processed;
};

const slugToTitle = (slug: string): string => {
  return slug
    .split("-")
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");
};

const BlogPost = () => {
  const { slug } = useParams<{ slug: string }>();
  const [article, setArticle] = useState<Partial<Article> | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [matchedExtension, setMatchedExtension] = useState<Extension | null>(null);

  const [relatedArticles, setRelatedArticles] = useState<Article[]>([]);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const { toast } = useToast();

  const instantTitle = slug ? slugToTitle(slug) : "Loading Article";
  const instantDescription = `Read our article about ${instantTitle.toLowerCase()}. Discover tips, tutorials, and insights about browser extensions and productivity.`;

  const fetchArticle = useCallback(async () => {
    if (!slug) {
      setLoading(false);
      setNotFound(true);
      return;
    }

    setLoading(true);
    setNotFound(false);
    setError(null);
    
    try {
      const indexRes = await fetch("/content/articles-index.json");
      let matched: Article | null = null;
      let allArticles: Article[] = [];

      if (indexRes.ok) {
        allArticles = await indexRes.json() as Article[];
        const normalizedSlug = slug.toLowerCase().replace(/[^a-z0-9]/g, '-').replace(/-+/g, '-').replace(/^-|-$/g, '');

        matched = allArticles.find(a =>
          a.slug === normalizedSlug ||
          a.id === slug
        ) || null;

        if (!matched) {
          const incomingWords = normalizedSlug.split('-').filter(w => w.length > 2);
          let bestScore = 0;
          let bestMatch: Article | null = null;

          for (const article of allArticles) {
            const articleWords = new Set(article.slug.split('-').filter(w => w.length > 2));
            let score = 0;
            for (const word of incomingWords) {
              if (articleWords.has(word)) score++;
            }
            if (score >= 3 && score > bestScore) {
              bestScore = score;
              bestMatch = article;
            }
          }

          if (bestMatch) {
            matched = bestMatch;
          }
        }
      }

      if (matched) {
        setArticle(matched);
        if (matched.slug !== slug) {
          window.history.replaceState(null, '', `/blog/${matched.slug}`);
        }

        const related = allArticles
          .filter(a => a.category === matched?.category && a.id !== matched?.id)
          .slice(0, 3);
        setRelatedArticles(related);
      }

      const fetchSlug = matched ? matched.slug : slug;
      const path = getPartitionedPath(fetchSlug);
      const response = await fetch(path);
      const isHtml = response.headers.get("Content-Type")?.includes("text/html");

      if (!response.ok || isHtml) {
        if (response.status === 404 || isHtml) {
          if (matched) {
            setError(`Content file missing or invalid for article: ${matched.slug}`);
          } else {
            setNotFound(true);
          }
          return;
        }
        throw new Error(`Failed to fetch article content: ${response.statusText}`);
      }
      
      const text = await response.text();
      const { frontmatter, content } = parseMarkdown(text);

      if (!frontmatter || !frontmatter.slug) {
        if (matched) {
          setError(`Content file has invalid format for article: ${matched.slug}`);
        } else {
          setNotFound(true);
        }
        return;
      }

      const processedContent = processArticleContent(content);
      const fullArticle = { ...(matched || {}), ...frontmatter, content: processedContent } as Article;
      setArticle(fullArticle);

      const extSlug = (frontmatter as Record<string, unknown>).related_extension_slug as string | undefined;
      let detectedExt: Extension | null = null;
      if (extSlug) {
        detectedExt = getExtensionBySlug(extSlug) || null;
      }
      if (!detectedExt) {
        detectedExt = detectExtensionFromContent(
          fullArticle.title || "",
          fullArticle.content || "",
          fullArticle.keywords || []
        );
      }
      setMatchedExtension(detectedExt);

      if (frontmatter.id) {
        try {
          const { data } = await supabase
            .from("articles")
            .select("views")
            .eq("id", frontmatter.id)
            .single();
          if (data) {
            const currentViews = data.views || 0;
            await supabase
              .from("articles")
              .update({ views: currentViews + 1 })
              .eq("id", frontmatter.id);
          }
        } catch (err) {
          console.error("Non-critical view update error:", err);
        }
      }

    } catch (error) {
      console.error("Error fetching article:", error);
      setNotFound(true);
    } finally {
      setLoading(false);
    }
  }, [slug]);

  useEffect(() => {
    if (slug) {
      fetchArticle();
    }
  }, [slug, fetchArticle]);

  const handleShare = () => {
    if (navigator.share) {
      navigator.share({
        title: article?.title,
        url: window.location.href,
      });
    } else {
      navigator.clipboard.writeText(window.location.href);
      toast({
        title: "Link Copied!",
        description: "Article link has been copied to clipboard.",
      });
    }
  };

  if (error && !loading) {
    return (
      <div className="min-h-screen bg-background">
        <SEO title={article?.title || "Content Error"} description={article?.meta_description || "Article content is currently unavailable."} canonicalPath={`/blog/${slug}`} />
        <Navbar />
        <div className="container mx-auto px-4 pt-32 text-center">
          <h2 className="mb-4 text-2xl font-bold text-destructive">Content Unavailable</h2>
          <p className="mb-6 text-muted-foreground">{error}. Please try again later or contact support.</p>
          <Link to="/blog"><Button><ArrowLeft className="mr-2 h-4 w-4" />Back to Blog</Button></Link>
        </div>
        <Footer />
      </div>
    );
  }

  if (notFound && !loading) {
    return (
      <div className="min-h-screen bg-background">
        <SEO title="Article Not Found" description="The article you're looking for doesn't exist or has been removed." canonicalPath={`/blog/${slug}`} />
        <Navbar />
        <div className="container mx-auto px-4 pt-32 text-center">
          <h2 className="mb-4 text-2xl font-bold">Article Not Found</h2>
          <p className="mb-6 text-muted-foreground">The article you're looking for doesn't exist or has been removed.</p>
          <Link to="/blog"><Button><ArrowLeft className="mr-2 h-4 w-4" />Back to Blog</Button></Link>
        </div>
        <Footer />
      </div>
    );
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-background">
        <SEO title={article?.title || instantTitle} description={article?.meta_description || article?.excerpt || instantDescription} canonicalPath={article?.canonicalPath || `/blog/${slug}`} ogType="article" articlePublishedTime={article?.published_at} articleAuthor={article?.author} />
        <Navbar />
        <main className="pt-24 pb-16">
          <article className="container mx-auto max-w-4xl px-4">
            <Link to="/blog"><Button variant="ghost" className="mb-8"><ArrowLeft className="mr-2 h-4 w-4" />Back to Blog</Button></Link>
            <header className="mb-8">
              <div className="mb-4 flex flex-wrap items-center gap-3 text-sm text-muted-foreground">
                {article?.category ? <span className="rounded-full bg-primary/10 px-3 py-1 text-primary">{article.category}</span> : <div className="h-6 w-20 animate-pulse rounded-full bg-muted" />}
                {article?.published_at ? <span className="flex items-center gap-1"><Calendar className="h-4 w-4" />{new Date(article.published_at).toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" })}</span> : <div className="h-4 w-32 animate-pulse rounded bg-muted" />}
              </div>
              <h1 className="mb-4 font-heading text-3xl font-bold leading-tight md:text-5xl">{article?.title || instantTitle}</h1>
              <p className="text-lg text-muted-foreground">Loading article content...</p>
            </header>
            <div className="space-y-4">
              <div className="h-64 w-full animate-pulse rounded-xl bg-muted" />
              <div className="h-4 w-full animate-pulse rounded bg-muted" />
            </div>
          </article>
        </main>
        <Footer />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <SEO title={article.title} description={article.meta_description || article.excerpt || undefined} keywords={article.keywords?.join(", ")} canonicalPath={article.canonicalPath || `/blog/${article.slug}`} ogType="article" articlePublishedTime={article.published_at} articleAuthor={article.author} />
      {article.schema && <SchemaMarkup data={article.schema} />}
      <Navbar />

      <main className="pt-24 pb-16">
        <article className="container mx-auto max-w-4xl px-4">
          <Link to="/blog"><Button variant="ghost" className="mb-8"><ArrowLeft className="mr-2 h-4 w-4" />Back to Blog</Button></Link>

          <motion.header initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="mb-8">
            <div className="mb-4 flex flex-wrap items-center gap-3 text-sm text-muted-foreground">
              <span className="rounded-full bg-primary/10 px-3 py-1 text-primary">{article.category || "Uncategorized"}</span>
              <span className="flex items-center gap-1"><Calendar className="h-4 w-4" />{article.published_at && new Date(article.published_at).toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" })}</span>
              <span className="flex items-center gap-1"><Clock className="h-4 w-4" />{article.read_time} min read</span>
              <span className="flex items-center gap-1"><User className="h-4 w-4" />{article.author}</span>
            </div>
            <h1 className="mb-4 font-heading text-3xl font-bold leading-tight md:text-5xl">{article.title}</h1>
            {article.excerpt && <p className="text-lg text-muted-foreground">{article.excerpt}</p>}
            <div className="mt-4 flex items-center gap-4">
              <Button variant="outline" size="sm" onClick={handleShare}><Share2 className="mr-2 h-4 w-4" />Share</Button>
              <span className="text-sm text-muted-foreground">{article.views} views</span>
            </div>
          </motion.header>

          {article.featured_video && <VideoPlayer url={article.featured_video} title={article.title} />}

          {article.featured_image && !article.featured_video && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.2 }} className="mb-8 overflow-hidden rounded-xl bg-muted aspect-video">
              <img src={resolveImagePath(article.featured_image)} alt={article.title} width="1200" height="675" decoding="async" referrerPolicy="no-referrer" className="w-full h-full object-cover" />
            </motion.div>
          )}

          {/* التنسيق الاحترافي الجديد باستخدام ReactMarkdown والـ Tailwind Typography */}
          <motion.div 
            initial={{ opacity: 0 }} 
            animate={{ opacity: 1 }} 
            transition={{ delay: 0.3 }} 
            className="prose prose-lg dark:prose-invert max-w-none prose-headings:font-heading prose-headings:font-bold prose-h2:text-2xl prose-h3:text-xl prose-p:text-muted-foreground prose-a:text-primary hover:prose-a:underline"
          >
            <ReactMarkdown>{article.content}</ReactMarkdown>
          </motion.div>

          {matchedExtension && (
            <DirectDownloadSection extensionName={matchedExtension.name} internalSlug={matchedExtension.slug} storeUrl={matchedExtension.storeUrl} users={matchedExtension.users} rating={matchedExtension.rating} lastUpdated={article.published_at ? new Date(article.published_at).toLocaleDateString("en-US", { month: 'long', year: 'numeric' }) : undefined} />
          )}

          {article.tags && article.tags.length > 0 && (
            <div className="mt-8 flex flex-wrap gap-2 border-t border-border pt-8">
              <span className="text-sm font-medium">Tags:</span>
              {article.tags.map((tag) => (
                <span key={tag} className="inline-flex items-center gap-1 rounded-full bg-muted px-3 py-1 text-sm"><Tag className="h-3 w-3" />{tag}</span>
              ))}
            </div>
          )}

          {article.keywords && article.keywords.length > 0 && (
            <div className="mt-4 text-sm text-muted-foreground"><span className="font-medium">Keywords: </span>{article.keywords.join(", ")}</div>
          )}
        </article>

        {relatedArticles.length > 0 && (
          <section className="container mx-auto mt-16 px-4">
            <h2 className="mb-8 text-center font-heading text-2xl font-bold">Related Articles</h2>
            <div className="grid gap-6 md:grid-cols-3">
              {relatedArticles.map((related) => (
                <Link key={related.id} to={`/blog/${related.slug}`} className="glass-card overflow-hidden transition-transform hover:scale-[1.02]">
                  {related.featured_image && (
                    <div className="aspect-video overflow-hidden">
                      <img src={resolveImagePath(related.featured_image)} alt={related.title} loading="lazy" decoding="async" referrerPolicy="no-referrer" className="h-full w-full object-cover" />
                    </div>
                  )}
                  <div className="p-4"><h3 className="font-heading font-semibold line-clamp-2">{related.title}</h3></div>
                </Link>
              ))}
            </div>
          </section>
        )}
      </main>

      <Footer />
    </div>
  );
};

export default BlogPost;