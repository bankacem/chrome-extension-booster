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
import { getPartitionedPath, getLocalizedPartitionedPath, getLocalizedIndexPath, isSupportedLocale, resolveImagePath } from "@/utils/articlePath";
import { detectExtensionFromContent } from "@/lib/autoExtensionLinker";
import { getExtensionBySlug, Extension } from "@/lib/extensionsData";
import { getEditorialProfile } from "@/lib/editorialProfiles";
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
  schema?: Record<string, unknown>;
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
  const { slug, lang: rawLang } = useParams<{ slug: string; lang?: string }>();
  const lang = isSupportedLocale(rawLang) ? rawLang : undefined;
  const [article, setArticle] = useState<Partial<Article> | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [matchedExtension, setMatchedExtension] = useState<Extension | null>(null);
  const [relatedArticles, setRelatedArticles] = useState<Article[]>([]);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [notYetTranslated, setNotYetTranslated] = useState(false);
  const [availableHreflangLanguages, setAvailableHreflangLanguages] = useState<("en" | "fr" | "es")[]>(["en"]);

  const instantTitle = slug ? slugToTitle(slug) : "Loading Article";

  const fetchArticle = useCallback(async () => {
    if (!slug) { setLoading(false); setNotFound(true); return; }
    setLoading(true); setNotFound(false); setNotYetTranslated(false); setError(null);

    try {
      // Always load the English index first -- it's the source of truth for
      // taxonomy/canonical slug even when rendering a translated page, and
      // it's what related-article suggestions and the English fallback link
      // are built from.
      const indexRes = await fetch("/content/articles-index.json");
      let matched: Article | null = null;
      let allArticles: Article[] = [];

      if (indexRes.ok) {
        allArticles = await indexRes.json() as Article[];
        const normalizedSlug = slug.toLowerCase().replace(/[^a-z0-9]/g, '-').replace(/-+/g, '-').replace(/^-|-$/g, '');
        matched = allArticles.find(a => a.slug === normalizedSlug || a.id === slug) || null;
      }

      if (matched) {
        const hreflangLanguages: ("en" | "fr" | "es")[] = lang ? ["en", lang] : ["en"];
        if (!lang) {
          const localizedAvailability = await Promise.all((['fr', 'es'] as const).map(async (locale) => {
            try {
              const response = await fetch(getLocalizedIndexPath(locale));
              if (!response.ok) return null;
              const localizedArticles = await response.json() as Partial<Article>[];
              return localizedArticles.some((entry) => entry.slug === matched?.slug) ? locale : null;
            } catch {
              return null;
            }
          }));
          for (const locale of localizedAvailability) {
            if (locale) hreflangLanguages.push(locale);
          }
        }
        setAvailableHreflangLanguages([...new Set(hreflangLanguages)]);
        if (!lang) setArticle(matched);
        const routePrefix = lang ? `/${lang}` : "";
        if (matched.slug !== slug) { window.history.replaceState(null, '', `${routePrefix}/blog/${matched.slug}`); }
        const related = allArticles.filter(a => a.category === matched?.category && a.id !== matched?.id).slice(0, 3);
        setRelatedArticles(related);
      }

      const fetchSlug = matched ? matched.slug : slug;

      let localizedEntry: Partial<Article> | null = null;
      if (lang) {
        try {
          const locIndexRes = await fetch(getLocalizedIndexPath(lang));
          if (locIndexRes.ok) {
            const locArticles = await locIndexRes.json() as Partial<Article>[];
            localizedEntry = locArticles.find(a => a.slug === fetchSlug) || null;
          }
        } catch {
          // fall through to "not yet translated" handling below
        }
        if (!localizedEntry) {
          // Graceful fallback: this article exists in English but has no
          // translation yet. Show a clear message + link rather than a
          // soft-404 -- never leave a URL from a translated sitemap pointing
          // at a blank/broken page.
          setNotYetTranslated(true);
          setArticle(matched);
          setLoading(false);
          return;
        }
      }

      const path = lang
        ? getLocalizedPartitionedPath(fetchSlug, lang)
        : getPartitionedPath(fetchSlug);
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
      // IMPORTANT: never let a frontmatter `slug` field override the routing slug.
      // Some legacy content files have a corrupted multi-line `slug:` value in
      // their YAML frontmatter (a leftover from a past migration bug). The URL
      // the visitor/crawler actually landed on (matched.slug from the index, or
      // the URL param as a fallback) must always win, or the canonical tag and
      // any generated links end up pointing at a URL that doesn't exist.
      // The site's article-index.json is the single source of truth for this
      // article's metadata (title, slug, category, description, etc.) -- it's
      // what actually gets curated/fixed over time. Individual markdown files
      // can carry stale copies of these same fields from whenever they were
      // first imported (a recurring class of bug: a corrected index entry got
      // silently undone by frontmatter reasserting the old value at
      // hydration). To make this whole class of bug impossible rather than
      // patching it field-by-field, `matched` now always wins over
      // `frontmatter` for any key both objects define. Frontmatter is only
      // used to fill in fields the index doesn't carry at all (seo_title,
      // related_extension_slug, featured_video, schema, etc.) plus the
      // rendered article body.
      const fullArticle = {
        ...frontmatter,
        ...(matched || {}),
        // When rendering a translated page, the localized index entry's
        // title/description/excerpt must win over the English matched
        // entry's -- otherwise a French/Spanish page would show an English
        // title with a French body, which is exactly the "half-translated"
        // sloppiness a professional multilingual site never ships.
        ...(localizedEntry || {}),
        // matched.slug can theoretically be missing/malformed if the index
        // lookup failed; fall back to the URL param rather than trust
        // frontmatter's (potentially corrupted) slug either way.
        slug: (matched?.slug || fetchSlug || slug || "").toString().trim().split(/\s+/)[0],
        content: processedContent,
      } as Article;
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
  }, [lang, slug]);

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

  if (notYetTranslated && !loading) {
    const fallbackMsg: Record<string, { heading: string; body: string; cta: string }> = {
      fr: {
        heading: "Traduction pas encore disponible",
        body: "Cet article n'a pas encore de version française. Vous pouvez le lire en anglais en attendant.",
        cta: "Lire en anglais",
      },
      es: {
        heading: "Traducción aún no disponible",
        body: "Este artículo todavía no tiene una versión en español. Mientras tanto, puedes leerlo en inglés.",
        cta: "Leer en inglés",
      },
    };
    const msg = fallbackMsg[lang || "fr"];
    return (
      <div className="min-h-screen bg-background">
        <SEO title={msg.heading} noindex canonicalPath={`/blog/${slug}`} lang={(lang as "en" | "fr" | "es") || "fr"} />
        <Navbar />
        <div className="container mx-auto px-4 pt-32 text-center">
          <h2 className="text-2xl font-bold mb-4">{msg.heading}</h2>
          <p className="text-muted-foreground mb-6">{msg.body}</p>
          <Link to={`/blog/${slug}`}><Button>{msg.cta}</Button></Link>
        </div>
        <Footer />
      </div>
    );
  }

  if (loading) { return <div className="min-h-screen bg-background"><Navbar /><div className="text-center pt-32">Loading...</div><Footer /></div>; }

  const routePrefix = lang ? `/${lang}` : "";

  const editorialProfile = getEditorialProfile(article.author);

  const schemaData = article.title ? {
    "@context": "https://schema.org",
    "@type": "Article",
    "headline": article.title,
    "description": article.meta_description || article.excerpt,
    "image": article.featured_image ? resolveImagePath(article.featured_image) : undefined,
    "articleSection": article.category || undefined,
    "inLanguage": lang || "en",
    "author": {
      "@type": editorialProfile.type,
      "name": editorialProfile.name,
      "url": `${window.location.origin}${editorialProfile.url}`
    },
    "reviewedBy": {
      "@type": "Organization",
      "name": "ExtensionTo Editorial Team",
      "url": `${window.location.origin}/editorial-policy`
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
      "@id": `${window.location.origin}${routePrefix}/blog/${article.slug}`
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
        "item": `${window.location.origin}${routePrefix}/blog`
      },
      {
        "@type": "ListItem",
        "position": 3,
        "name": article.title,
        "item": `${window.location.origin}${routePrefix}/blog/${article.slug}`
      }
    ]
  } : null;

  return (
    <div className="min-h-screen bg-background">
      <SEO
        title={article.seo_title || article.title}
        description={article.meta_description || article.excerpt || undefined}
        canonicalPath={article.canonicalPath || `/blog/${article.slug}`}
        noindex={Boolean(article.canonicalPath && article.canonicalPath !== `/blog/${article.slug}`)}
        ogType="article"
        articlePublishedTime={article.published_at}
        articleModifiedTime={article.updated_at || article.published_at}
        articleAuthor={editorialProfile.name}
        lang={(lang as "en" | "fr" | "es") || "en"}
        hreflangLanguages={availableHreflangLanguages}
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
          <Link to={`${routePrefix}/blog`}><Button variant="ghost" className="mb-8"><ArrowLeft className="mr-2 h-4 w-4" />Back to Blog</Button></Link>
          <header className="mb-8">
            <h1 className="mb-4 font-heading text-3xl font-bold md:text-5xl">{article.title}</h1>
            <div className="rounded-xl border border-border/60 bg-card/60 p-4 text-sm text-muted-foreground">
              <p>
                Written by <Link to={editorialProfile.url} className="font-medium text-foreground hover:text-primary">{editorialProfile.name}</Link> · {editorialProfile.role}
              </p>
              <p className="mt-1">
                Published {article.published_at ? new Date(article.published_at).toLocaleDateString() : ""}
                {article.updated_at && ` · Updated ${new Date(article.updated_at).toLocaleDateString()}`}
                {" · "}<Link to="/editorial-policy" className="text-primary hover:underline">Our review methodology</Link>
              </p>
            </div>
          </header>

          {article.featured_image && (
            <div className="mb-8 overflow-hidden rounded-xl bg-muted aspect-video">
              <img
                src={resolveImagePath(article.featured_image)}
                alt={article.title}
                width={1200}
                height={675}
                fetchPriority="high"
                decoding="async"
                className="w-full h-full object-cover"
              />
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