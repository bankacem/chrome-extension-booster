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
import rehypeRaw from "rehype-raw";
import remarkGfm from "remark-gfm";

interface Article {
  id: string;
  title: string;
  seo_title?: string;
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
  updated_at?: string;
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

    // Clean up title and other fields from potential YAML artifacts
    if (frontmatter.title) {
      frontmatter.title = String(frontmatter.title).replace(/\s+/g, ' ').trim();
    }
    if (frontmatter.meta_description) {
      frontmatter.meta_description = String(frontmatter.meta_description).replace(/\s+/g, ' ').trim();
    } else if (frontmatter.excerpt) {
      frontmatter.meta_description = String(frontmatter.excerpt).replace(/\s+/g, ' ').trim();
    }

    const content = match[2].trim();
    return { frontmatter, content };
  } catch (e) {
    console.error("Error parsing frontmatter:", e);
    return { frontmatter: {} as Partial<Article>, content: text };
  }
};

const processArticleContent = (content: string, featuredImage?: string) => {
  if (!content) return "";
  let processed = content;

  if (featuredImage) {
    const cleanFeatured = featuredImage.replace(/^\/+/, "");

    const wpImageRegex = new RegExp(
      `<p>\\s*\\s*<\\/p>\\s*<figure\\s+class="wp-block-image\\s+size-large">\\s*<img\\s+src="[^"]*${cleanFeatured}[^"]*"\\s+alt="[^"]*"\\s*\\/>\\s*<\\/figure>\\s*<p>\\s*`,
      "i"
    );
    processed = processed.replace(wpImageRegex, "");

    const generalImgRegex = new RegExp(`^\\s*<img[^>]+src="[^"]*${cleanFeatured}[/"]*[^>]*>\\s*`, "i");
    processed = processed.replace(generalImgRegex, "");

    const mdImgRegex = new RegExp(`^\\s*!\\[[^\\]]*\\]\\([^)]*${cleanFeatured}[^)]*\\)\\s*`, "i");
    processed = processed.replace(mdImgRegex, "");
  }

  processed = processed.replace(/^<p>\s*\s*<\/p>\s*<figure\s+class="wp-block-image\s+size-large">\s*<img\s+src=""\s+alt=""\s*\/>\s*<\/figure>/i, "");

  processed = processed.replace(
    /<a[^>]*href=["'](https?:\/\/(?:www\.)?(?:youtube\.com\/watch\?v=|youtu\.be\/)([a-zA-Z0-9_-]{11})[^"']*)["'][^>]*>.*?<\/a>/gi,
    '<div class="aspect-video my-6 rounded-xl overflow-hidden border border-border"><iframe src="https://www.youtube-nocookie.com/embed/$2" title="Video" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" allowfullscreen class="w-full h-full" loading="lazy"></iframe></div>'
  );

  return processed;
};

const slugToTitle = (slug: string): string => {
  return slug.split("-").map((word) => word.charAt(0).toUpperCase() + word.slice(1)).join(" ");
};

const BlogPost = () => {
  const { slug } = useParams<{ slug: string }>();
  const [article, setArticle] = useState<Partial<Article> | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [matchedExtension, setMatchedExtension] = useState<Extension | null>(null);
  const [relatedArticles, setRelatedArticles] = useState<Article[]>([]);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);

  const instantTitle = slug ? slugToTitle(slug) : "Loading Article";

  const fetchArticle = useCallback(async () => {
    if (!slug) { setLoading(false); setNotFound(true); return; }
    setLoading(true); setNotFound(false); setError(null);
    
    try {
      const indexRes = await fetch("/content/articles-index.json");
      let matched: Article | null = null;
      let allArticles: Article[] = [];

      if (indexRes.ok) {
        allArticles = await indexRes.json() as Article[];
        const normalizedSlug = slug.toLowerCase().replace(/[^a-z0-9]/g, '-').replace(/-+/g, '-').replace(/^-|-$/g, '');
        matched = allArticles.find(a => a.slug === normalizedSlug || a.id === slug) || null;
      }

      if (matched) {
        setArticle(matched);
        if (matched.slug !== slug) { window.history.replaceState(null, '', `/blog/${matched.slug}`); }
        const related = allArticles.filter(a => a.category === matched?.category && a.id !== matched?.id).slice(0, 3);
        setRelatedArticles(related);
      }

      const fetchSlug = matched ? matched.slug : slug;
      const path = getPartitionedPath(fetchSlug);
      const response = await fetch(path);
      const isHtml = response.headers.get("Content-Type")?.includes("text/html");

      if (!response.ok || isHtml) {
        if (response.status === 404 || isHtml) {
          if (matched) { setError(`Content file missing or invalid for article: ${matched.slug}`); } else { setNotFound(true); }
          return;
        }
        throw new Error(`Failed to fetch article content: ${response.statusText}`);
      }
      
      const text = await response.text();
      const { frontmatter, content } = parseMarkdown(text);
      const processedContent = processArticleContent(content, frontmatter.featured_image);
      const fullArticle = { ...(matched || {}), ...frontmatter, content: processedContent } as Article;
      setArticle(fullArticle);

      const extSlug = (frontmatter as Record<string, unknown>).related_extension_slug as string | undefined;
      let detectedExt = extSlug ? getExtensionBySlug(extSlug) || null : null;
      if (!detectedExt) {
        detectedExt = detectExtensionFromContent(fullArticle.title || "", fullArticle.content || "", fullArticle.keywords || []);
      }
      setMatchedExtension(detectedExt);
    } catch (error) {
      console.error("Error fetching article:", error);
      setNotFound(true);
    } finally {
      setLoading(false);
    }
  }, [slug]);

  useEffect(() => { if (slug) { fetchArticle(); } }, [slug, fetchArticle]);

  if (error && !loading) {
    return (
      <div className="min-h-screen bg-background">
        <Navbar />
        <div className="container mx-auto px-4 pt-32 text-center">
          <h2 className="mb-4 text-2xl font-bold text-destructive">Content Unavailable</h2>
          <p className="mb-6 text-muted-foreground">{error}</p>
          <Link to="/blog"><Button><ArrowLeft className="mr-2 h-4 w-4" />Back to Blog</Button></Link>
        </div>
        <Footer />
      </div>
    );
  }

  if (notFound && !loading) {
    return (
      <div className="min-h-screen bg-background"><Navbar /><div className="container mx-auto px-4 pt-32 text-center"><h2 className="text-2xl font-bold mb-4">Article Not Found</h2><Link to="/blog"><Button>Back to Blog</Button></Link></div><Footer /></div>
    );
  }

  if (loading) { return <div className="min-h-screen bg-background"><Navbar /><div className="text-center pt-32">Loading...</div><Footer /></div>; }

  const schemaData = article.title ? {
    "@context": "https://schema.org",
    "@type": "Article",
    "headline": article.title,
    "description": article.meta_description || article.excerpt,
    "image": article.featured_image ? resolveImagePath(article.featured_image) : undefined,
    "author": {
      "@type": "Person",
      "name": article.author || "Admin"
    },
    "datePublished": article.published_at,
    "dateModified": article.updated_at || article.published_at,
    "publisher": {
      "@type": "Organization",
      "name": "ExtensionTo",
      "logo": {
        "@type": "ImageObject",
        "url": `${window.location.origin}/og-image.png`
      }
    },
    "mainEntityOfPage": {
      "@type": "WebPage",
      "@id": `${window.location.origin}/blog/${article.slug}`
    }
  } : null;

  const breadcrumbData = article.title ? {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    "itemListElement": [
      {
        "@type": "ListItem",
        "position": 1,
        "name": "Home",
        "item": window.location.origin
      },
      {
        "@type": "ListItem",
        "position": 2,
        "name": "Blog",
        "item": `${window.location.origin}/blog`
      },
      {
        "@type": "ListItem",
        "position": 3,
        "name": article.title,
        "item": `${window.location.origin}/blog/${article.slug}`
      }
    ]
  } : null;

  return (
    <div className="min-h-screen bg-background">
      <SEO
        title={article.seo_title || article.title}
        description={article.meta_description || article.excerpt || undefined}
        canonicalPath={`/blog/${article.slug}`}
        ogType="article"
        ogImage={
          article.featured_image
            ? `${window.location.origin}${resolveImagePath(article.featured_image)}`
            : undefined
        }
      />
      {schemaData && <SchemaMarkup data={schemaData} />}
      {breadcrumbData && <SchemaMarkup data={breadcrumbData} />}
      <Navbar />
      <main className="pt-24 pb-16">
        <article className="container mx-auto max-w-4xl px-4">
          <Link to="/blog"><Button variant="ghost" className="mb-8"><ArrowLeft className="mr-2 h-4 w-4" />Back to Blog</Button></Link>
          <header className="mb-8">
            <h1 className="mb-4 font-heading text-3xl font-bold md:text-5xl">{article.title}</h1>
          </header>

          {article.featured_image && (
            <div className="mb-8 overflow-hidden rounded-xl bg-muted aspect-video">
              <img src={resolveImagePath(article.featured_image)} alt={article.title} className="w-full h-full object-cover" />
            </div>
          )}

          <div className="prose prose-lg dark:prose-invert max-w-none prose-table:border-collapse prose-th:border prose-th:border-border prose-th:p-3 prose-th:bg-muted prose-td:border prose-td:border-border prose-td:p-3">
            <ReactMarkdown remarkPlugins={[remarkGfm]} rehypePlugins={[rehypeRaw]}>
              {article.content}
            </ReactMarkdown>
          </div>
        </article>
      </main>
      <Footer />
    </div>
  );
};

export default BlogPost;