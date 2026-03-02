import { useState, useEffect, useCallback } from "react";
import { useParams, Link } from "react-router-dom";
import { motion } from "framer-motion";
import { Calendar, Clock, ArrowLeft, Tag, User, Share2, Download } from "lucide-react";
import { Button } from "@/components/ui/button";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import SEO from "@/components/SEO";
import DirectDownloadSection from "@/components/seo/DirectDownloadSection";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import yaml from "js-yaml";
import { getPartitionedPath } from "@/utils/articlePath";

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
  published_at: string;
  read_time: number;
  author: string;
  views: number;
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

  // 1. Add loading="lazy" and decoding="async" to all <img> tags
  // This regex handles both HTML <img> and Markdown ![alt](url)
  // If it's Markdown, it will be converted to HTML later?
  // Wait, the content in frontmatter is already HTML or Markdown?
  // Based on sync-articles.ts, it fetches raw content which might be HTML or Markdown.
  // In BlogPost.tsx, dangerouslySetInnerHTML={{ __html: article.content }} is used.
  // This implies the content is ALREADY HTML.

  processed = processed.replace(/<img([^>]*)>/gi, (match, attributes) => {
    let newAttributes = attributes;
    // Ensure space before adding attributes if they don't exist
    if (!attributes.includes('loading=')) {
      newAttributes = ` loading="lazy"${newAttributes}`;
    }
    if (!attributes.includes('decoding=')) {
      newAttributes = ` decoding="async"${newAttributes}`;
    }
    return `<img${newAttributes}>`;
  });

  // 2. Semantic HTML Audit: Ensure exactly one <h1>
  // Demote <h1> to <h2>
  processed = processed.replace(/<h1([^>]*)>(.*?)<\/h1>/gi, '<h2$1>$2</h2>');

  // Ensure all secondary headers are at most <h3>
  // Demote <h4>, <h5>, <h6> to <h3>
  processed = processed.replace(/<h[4-6]([^>]*)>(.*?)<\/h[4-6]>/gi, '<h3$1>$2</h3>');

  return processed;
};

// Helper to convert slug to readable title for instant SEO
const slugToTitle = (slug: string): string => {
  return slug
    .split("-")
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");
};

const BlogPost = () => {
  const { slug } = useParams<{ slug: string }>();
  const [article, setArticle] = useState<Article | null>(null);

  // Priority detection logic
  const isPriorityArticle = (art: Article) => {
    const priorityKeywords = ["adblocker", "idm", "ghostery", "facebook pixel helper"];
    const textToSearch = `${art.title} ${art.content} ${art.slug} ${art.keywords?.join(" ")}`.toLowerCase();
    return priorityKeywords.some(kw => textToSearch.includes(kw.toLowerCase()));
  };
  const [relatedArticles, setRelatedArticles] = useState<Article[]>([]);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const { toast } = useToast();

  // Generate instant SEO from slug before data loads
  const instantTitle = slug ? slugToTitle(slug) : "Loading Article";
  const instantDescription = `Read our article about ${instantTitle.toLowerCase()}. Discover tips, tutorials, and insights about browser extensions and productivity.`;

  const fetchArticle = useCallback(async () => {
    if (!slug) return;
    setLoading(true);
    setNotFound(false);
    
    try {
      // Fetch article from partitioned path
      let path = getPartitionedPath(slug);
      let response = await fetch(path);

      // Search-and-Rescue: Fallback mechanism for legacy URLs or mismatched slugs
      if (!response.ok && response.status === 404) {
        console.log(`[Search-and-Rescue] Article not found at ${path}. Attempting index-based resolution...`);
        const indexRes = await fetch("/content/articles-index.json");
        if (indexRes.ok) {
          const index = await indexRes.json() as Article[];
          const normalizedSlug = slug.toLowerCase().replace(/[^a-z0-9]/g, '-');

          // Try to find the article by ID or an exact matching normalized slug
          const matched = index.find(a =>
            a.slug === normalizedSlug ||
            a.id === slug
          );

          if (matched) {
            console.log(`[Search-and-Rescue] Resolved ${slug} to ${matched.slug}`);
            path = getPartitionedPath(matched.slug);
            response = await fetch(path);
          }
        }
      }

      if (!response.ok) {
        if (response.status === 404) {
          setNotFound(true);
          return;
        }
        throw new Error(`Failed to fetch article: ${response.statusText}`);
      }
      
      const text = await response.text();
      const { frontmatter, content } = parseMarkdown(text);

      if (!frontmatter || !frontmatter.slug) {
        setNotFound(true);
        return;
      }

      const processedContent = processArticleContent(content);
      const fullArticle = { ...frontmatter, content: processedContent } as Article;
      setArticle(fullArticle);

      // Increment views in Supabase using the latest count from the database
      // to avoid overwriting with stale data from the Markdown frontmatter.
      supabase
        .from("articles")
        .select("views")
        .eq("id", frontmatter.id)
        .single()
        .then(({ data, error: fetchError }) => {
          if (fetchError) {
            console.error("Error fetching current views:", fetchError);
            return;
          }
          const currentViews = data?.views || 0;
          supabase
            .from("articles")
            .update({ views: currentViews + 1 })
            .eq("id", frontmatter.id)
            .then(({ error: updateError }) => {
              if (updateError) console.error("Error updating views:", updateError);
            });
        });

      // Fetch related articles from index
      const indexResponse = await fetch("/content/articles-index.json");
      if (indexResponse.ok) {
        const index = await indexResponse.json() as Article[];
        const related = index
          .filter(a => a.category === frontmatter.category && a.id !== frontmatter.id)
          .slice(0, 3);
        setRelatedArticles(related);
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

  // Only show 404 after confirming article doesn't exist
  if (notFound && !loading) {
    return (
      <div className="min-h-screen bg-background">
        <SEO
          title="Article Not Found"
          description="The article you're looking for doesn't exist or has been removed."
          canonicalPath={`/blog/${slug}`}
        />
        <Navbar />
        <div className="container mx-auto px-4 pt-32 text-center">
          <h2 className="mb-4 text-2xl font-bold">Article Not Found</h2>
          <p className="mb-6 text-muted-foreground">
            The article you're looking for doesn't exist or has been removed.
          </p>
          <Link to="/blog">
            <Button>
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back to Blog
            </Button>
          </Link>
        </div>
        <Footer />
      </div>
    );
  }

  // Loading state with SEO metadata already rendered
  if (loading) {
    return (
      <div className="min-h-screen bg-background">
        {/* SEO renders instantly based on slug */}
        <SEO
          title={instantTitle}
          description={instantDescription}
          canonicalPath={`/blog/${slug}`}
          ogType="article"
        />
        <Navbar />
        <main className="pt-24 pb-16">
          <article className="container mx-auto max-w-4xl px-4">
            <Link to="/blog">
              <Button variant="ghost" className="mb-8">
                <ArrowLeft className="mr-2 h-4 w-4" />
                Back to Blog
              </Button>
            </Link>
            
            {/* Skeleton loading with title visible for SEO */}
            <header className="mb-8">
              <div className="mb-4 flex items-center gap-3">
                <div className="h-6 w-20 animate-pulse rounded-full bg-muted" />
                <div className="h-4 w-32 animate-pulse rounded bg-muted" />
              </div>
              <h1 className="mb-4 font-heading text-3xl font-bold leading-tight md:text-5xl">
                {instantTitle}
              </h1>
              <p className="text-lg text-muted-foreground">Loading article content...</p>
            </header>
            
            <div className="space-y-4">
              <div className="h-64 w-full animate-pulse rounded-xl bg-muted" />
              <div className="h-4 w-full animate-pulse rounded bg-muted" />
              <div className="h-4 w-3/4 animate-pulse rounded bg-muted" />
              <div className="h-4 w-5/6 animate-pulse rounded bg-muted" />
            </div>
          </article>
        </main>
        <Footer />
      </div>
    );
  }

  if (!article) {
    return null;
  }

  return (
    <div className="min-h-screen bg-background">
      <SEO
        title={article.title}
        description={article.meta_description || article.excerpt || undefined}
        keywords={article.keywords?.join(", ")}
        canonicalPath={`/blog/${article.slug}`}
        ogType="article"
        articlePublishedTime={article.published_at}
        articleAuthor={article.author}
      />
      <Navbar />

      <main className="pt-24 pb-16">
        <article className="container mx-auto max-w-4xl px-4">
          {/* Back Button */}
          <Link to="/blog">
            <Button variant="ghost" className="mb-8">
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back to Blog
            </Button>
          </Link>

          {/* Article Header */}
          <motion.header
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="mb-8"
          >
            <div className="mb-4 flex flex-wrap items-center gap-3 text-sm text-muted-foreground">
              <span className="rounded-full bg-primary/10 px-3 py-1 text-primary">
                {article.category || "Uncategorized"}
              </span>
              <span className="flex items-center gap-1">
                <Calendar className="h-4 w-4" />
                {new Date(article.published_at).toLocaleDateString("en-US", {
                  year: "numeric",
                  month: "long",
                  day: "numeric",
                })}
              </span>
              <span className="flex items-center gap-1">
                <Clock className="h-4 w-4" />
                {article.read_time} min read
              </span>
              <span className="flex items-center gap-1">
                <User className="h-4 w-4" />
                {article.author}
              </span>
            </div>

            <h1 className="mb-4 font-heading text-3xl font-bold leading-tight md:text-5xl">
              {article.title}
            </h1>

            {article.excerpt && (
              <p className="text-lg text-muted-foreground">{article.excerpt}</p>
            )}

            <div className="mt-4 flex items-center gap-4">
              <Button variant="outline" size="sm" onClick={handleShare}>
                <Share2 className="mr-2 h-4 w-4" />
                Share
              </Button>
              <span className="text-sm text-muted-foreground">
                {article.views} views
              </span>
            </div>
          </motion.header>

          {/* Featured Image */}
          {article.featured_image && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.2 }}
              className="mb-8 overflow-hidden rounded-xl"
            >
              <img
                src={article.featured_image}
                alt={article.title}
                decoding="async"
                className="w-full"
              />
            </motion.div>
          )}

          {/* Article Content */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.3 }}
            className="prose prose-lg dark:prose-invert max-w-none"
            dangerouslySetInnerHTML={{ __html: article.content }}
          />

          {/* Direct Download Injection for Priority Articles */}
          {isPriorityArticle(article) && (
            <DirectDownloadSection
              extensionName={article.title.split(" - ")[0].split(" | ")[0]}
              lastUpdated={new Date(article.published_at).toLocaleDateString("en-US", { month: 'long', year: 'numeric' })}
            />
          )}

          {/* Tags */}
          {article.tags && article.tags.length > 0 && (
            <div className="mt-8 flex flex-wrap gap-2 border-t border-border pt-8">
              <span className="text-sm font-medium">Tags:</span>
              {article.tags.map((tag) => (
                <span
                  key={tag}
                  className="inline-flex items-center gap-1 rounded-full bg-muted px-3 py-1 text-sm"
                >
                  <Tag className="h-3 w-3" />
                  {tag}
                </span>
              ))}
            </div>
          )}

          {/* Keywords */}
          {article.keywords && article.keywords.length > 0 && (
            <div className="mt-4 text-sm text-muted-foreground">
              <span className="font-medium">Keywords: </span>
              {article.keywords.join(", ")}
            </div>
          )}
        </article>

        {/* Related Articles */}
        {relatedArticles.length > 0 && (
          <section className="container mx-auto mt-16 px-4">
            <h2 className="mb-8 text-center font-heading text-2xl font-bold">
              Related Articles
            </h2>
            <div className="grid gap-6 md:grid-cols-3">
              {relatedArticles.map((related) => (
                <Link
                  key={related.id}
                  to={`/blog/${related.slug}`}
                  className="glass-card overflow-hidden transition-transform hover:scale-[1.02]"
                >
                  {related.featured_image && (
                    <div className="aspect-video overflow-hidden">
                      <img
                        src={related.featured_image}
                        alt={related.title}
                        loading="lazy"
                        decoding="async"
                        className="h-full w-full object-cover"
                      />
                    </div>
                  )}
                  <div className="p-4">
                    <h3 className="font-heading font-semibold line-clamp-2">
                      {related.title}
                    </h3>
                  </div>
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
