import { useState, useEffect } from "react";
import { useNavigate, Link } from "react-router-dom";
import { motion } from "framer-motion";
import {
  ArrowLeft, Plus, Wand2, Globe, Copy, CheckCircle, Image,
  Loader2, RefreshCw, Save, Eye, Tag, Shield, Sparkles
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { supabase, isDevBypass } from "@/integrations/supabase/client";
import { useAdminSession } from "@/hooks/useAdminSession";
import { useToast } from "@/hooks/use-toast";
import SEO from "@/components/SEO";

const WEBSITE_URL = "https://www.extensionto.com";
const SITE_CANONICAL = "https://extensionto.com";
const AUTHOR = "Daniel Carter";

const CATEGORIES = [
  "Chrome Extensions",
  "Ad Blocking",
  "Screenshot & Screen Capture",
  "Dark Mode & Themes",
  "Privacy & Security",
  "Performance & Memory",
  "Developer Tools",
  "Downloads & Media",
  "Mobile & Android",
  "Social Media",
  "Productivity & Workflow",
  "General",
];

function generateSlug(title: string): string {
  const base = (title ?? "")
    .normalize("NFKD")
    .toLowerCase()
    .replace(/[^\p{L}\p{N}\s-]/gu, " ")
    .trim()
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 120);
  return base || `post-${Date.now()}`;
}

function buildArticleJsonLd(article: {
  title: string;
  slug: string;
  meta_description: string;
  published_at: string;
  featured_image?: string | null;
  category?: string;
  keywords?: string[];
}): string {
  const articleSchema = {
    "@context": "https://schema.org",
    "@type": "Article",
    "@id": `${SITE_CANONICAL}/blog/${article.slug}#article`,
    "headline": article.title,
    "description": article.meta_description,
    "datePublished": article.published_at,
    "dateModified": article.published_at,
    "author": {
      "@type": "Person",
      "name": AUTHOR,
      "url": SITE_CANONICAL,
    },
    "publisher": {
      "@type": "Organization",
      "@id": `${SITE_CANONICAL}/#organization`,
      "name": "ExtensionTo",
      "logo": {
        "@type": "ImageObject",
        "url": `${SITE_CANONICAL}/favicon.png`,
      },
    },
    "mainEntityOfPage": {
      "@type": "WebPage",
      "@id": `${SITE_CANONICAL}/blog/${article.slug}`,
    },
    "image": article.featured_image
      ? [`${SITE_CANONICAL}${article.featured_image}`]
      : [`${SITE_CANONICAL}/og-image.png`],
    ...(article.keywords?.length ? { "keywords": article.keywords.join(", ") } : {}),
  };

  const breadcrumbSchema = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    "itemListElement": [
      { "@type": "ListItem", "position": 1, "name": "Home", "item": `${SITE_CANONICAL}/` },
      { "@type": "ListItem", "position": 2, "name": "Blog", "item": `${SITE_CANONICAL}/blog` },
      { "@type": "ListItem", "position": 3, "name": article.title, "item": `${SITE_CANONICAL}/blog/${article.slug}` },
    ],
  };

  return [articleSchema, breadcrumbSchema]
    .map((s) => `<script type="application/ld+json">\n${JSON.stringify(s, null, 2)}\n</script>`)
    .join("\n");
}

function estimateReadTime(content: string): number {
  const wordCount = content.replace(/<[^>]+>/g, " ").split(/\s+/).filter(Boolean).length;
  return Math.max(1, Math.round(wordCount / 200));
}

function deriveExcerpt(content: string): string {
  try {
    const doc = new DOMParser().parseFromString(content || "", "text/html");
    const text = (doc.body.textContent || "").replace(/\s+/g, " ").trim();
    return text.slice(0, 160);
  } catch {
    return "";
  }
}

export default function CMSCreator() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { isAuthenticated: hasAdminSession } = useAdminSession();

  const [authChecked, setAuthChecked] = useState(false);

  const [title, setTitle] = useState("");
  const [slug, setSlug] = useState("");
  const [slugCustomized, setSlugCustomized] = useState(false);
  const [content, setContent] = useState("");
  const [metaDescription, setMetaDescription] = useState("");
  const [category, setCategory] = useState("Chrome Extensions");
  const [tagsInput, setTagsInput] = useState("");
  const [keywordsInput, setKeywordsInput] = useState("");
  const [featuredImage, setFeaturedImage] = useState("");
  const [status, setStatus] = useState<"draft" | "published">("draft");

  const [saving, setSaving] = useState(false);
  const [generatingImage, setGeneratingImage] = useState(false);
  const [publishedSlug, setPublishedSlug] = useState<string | null>(null);
  const [urlCopied, setUrlCopied] = useState(false);

  useEffect(() => {
    // Accept either auth path:
    //   1. New localStorage admin session (/admin/cms route)
    //   2. Legacy Supabase admin session (/settings/cms route)
    //   3. Dev-bypass mode (no credentials set at all)
    if (hasAdminSession || isDevBypass) {
      setAuthChecked(true);
      return;
    }
    const check = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (!session) { navigate("/settings"); return; }
        const { data: role } = await supabase
          .from("user_roles").select("role").eq("user_id", session.user.id).single();
        if (role?.role !== "admin") { navigate("/settings"); return; }
        setAuthChecked(true);
      } catch {
        // Supabase unreachable — if we got here without a local session,
        // the user is not authenticated. Redirect to login.
        navigate("/admin/login");
      }
    };
    check();
  }, [hasAdminSession, navigate]);

  useEffect(() => {
    if (!slugCustomized && title) {
      setSlug(generateSlug(title));
    }
  }, [title, slugCustomized]);

  const handleGenerateImage = async () => {
    if (!title || !slug) {
      toast({ title: "Enter a title first", variant: "destructive" });
      return;
    }
    setGeneratingImage(true);
    try {
      const { data, error } = await supabase.functions.invoke("generate-featured-image", {
        body: { title, category, slug },
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      if (data?.imageUrl) {
        setFeaturedImage(data.imageUrl);
        toast({ title: "Image generated", description: "Featured image ready (1200×630 WebP)" });
      }
    } catch (err: any) {
      toast({
        title: "Image generation failed",
        description: err.message || "Edge function unavailable — enter an image URL manually.",
        variant: "destructive",
      });
    } finally {
      setGeneratingImage(false);
    }
  };

  const handleSave = async () => {
    if (!title.trim()) { toast({ title: "Title is required", variant: "destructive" }); return; }
    if (!content.trim()) { toast({ title: "Content is required", variant: "destructive" }); return; }

    setSaving(true);
    try {
      const finalSlug = slug || generateSlug(title);
      const now = new Date().toISOString();
      const keywords = keywordsInput.split(",").map((k) => k.trim()).filter(Boolean);
      const tags = tagsInput.split(",").map((t) => t.trim()).filter(Boolean);
      const excerpt = deriveExcerpt(content);
      const finalMeta = (metaDescription || excerpt).slice(0, 160);
      const readTime = estimateReadTime(content);

      const { data: existing } = await supabase
        .from("articles")
        .select("id")
        .eq("slug", finalSlug)
        .maybeSingle();

      if (existing) {
        toast({
          title: "Slug already exists",
          description: "Change the slug or title to avoid duplicates.",
          variant: "destructive",
        });
        setSaving(false);
        return;
      }

      const jsonLdBlock = buildArticleJsonLd({
        title,
        slug: finalSlug,
        meta_description: finalMeta,
        published_at: status === "published" ? now : now,
        featured_image: featuredImage || null,
        category,
        keywords,
      });

      const enrichedContent = content + "\n\n<!-- SEO Schema -->\n" + jsonLdBlock;

      const articleData = {
        title: title.trim(),
        slug: finalSlug,
        content: enrichedContent,
        excerpt,
        meta_description: finalMeta,
        category,
        tags,
        keywords,
        featured_image: featuredImage || null,
        author: AUTHOR,
        read_time: readTime,
        status,
        published_at: status === "published" ? now : null,
        scheduled_at: null,
      };

      const { error } = await supabase.from("articles").insert([articleData]);
      if (error) throw error;

      if (status === "published") {
        try {
          await supabase.functions.invoke("publish-to-github", {
            body: {
              slug: finalSlug,
              title: articleData.title,
              content: articleData.content,
              excerpt: articleData.excerpt,
              meta_description: articleData.meta_description,
              category: articleData.category,
              keywords: articleData.keywords,
              featured_image: articleData.featured_image,
              author: AUTHOR,
              published_at: articleData.published_at,
              read_time: articleData.read_time,
              tags: articleData.tags,
            },
          });
        } catch (e) {
          console.warn("[publish-to-github] non-blocking error:", e);
        }
      }

      setPublishedSlug(finalSlug);
      toast({
        title: status === "published" ? "Article Published!" : "Draft Saved",
        description: status === "published"
          ? `Live at ${WEBSITE_URL}/blog/${finalSlug}`
          : "Saved as draft — publish when ready.",
      });
    } catch (err: any) {
      console.error("Save error:", err);
      toast({ title: "Save failed", description: err.message, variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  const handleCopyUrl = () => {
    if (!publishedSlug) return;
    navigator.clipboard.writeText(`${WEBSITE_URL}/blog/${publishedSlug}`);
    setUrlCopied(true);
    setTimeout(() => setUrlCopied(false), 2000);
  };

  const handleReset = () => {
    setTitle("");
    setSlug("");
    setSlugCustomized(false);
    setContent("");
    setMetaDescription("");
    setCategory("Chrome Extensions");
    setTagsInput("");
    setKeywordsInput("");
    setFeaturedImage("");
    setStatus("draft");
    setPublishedSlug(null);
  };

  if (!authChecked) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <SEO title="CMS Article Creator" noindex canonicalPath="/settings/cms" />

      <header className="fixed top-0 z-50 w-full border-b border-border bg-background/95 backdrop-blur">
        <div className="container flex h-16 items-center justify-between px-4">
          <div className="flex items-center gap-3">
            <Sparkles className="h-6 w-6 text-primary" />
            <div>
              <h1 className="font-heading text-lg font-bold">CMS Article Creator</h1>
              <p className="text-xs text-muted-foreground">extensionto.com · Supabase CMS</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Link to="/settings/manage">
              <Button variant="ghost" size="sm">
                <Shield className="mr-2 h-4 w-4" />
                Dashboard
              </Button>
            </Link>
          </div>
        </div>
      </header>

      <main className="container mx-auto max-w-4xl px-4 pt-24 pb-16">
        <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }}>

          <div className="mb-6 flex items-center gap-3">
            <Link to="/settings/manage">
              <Button variant="ghost" size="sm">
                <ArrowLeft className="mr-2 h-4 w-4" />
                Back
              </Button>
            </Link>
            <div>
              <h2 className="font-heading text-2xl font-bold">New Article</h2>
              <p className="text-sm text-muted-foreground">
                All articles are saved to Supabase with full SEO, JSON-LD schema, and OpenGraph tags auto-applied.
              </p>
            </div>
          </div>

          {publishedSlug && (
            <div className="mb-6 rounded-xl border border-green-500/30 bg-green-500/10 p-5">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div className="flex items-center gap-3">
                  <CheckCircle className="h-6 w-6 shrink-0 text-green-500" />
                  <div>
                    <p className="font-semibold text-green-400">
                      {status === "published" ? "Article Published!" : "Draft Saved!"}
                    </p>
                    <code className="text-xs text-muted-foreground break-all">
                      {WEBSITE_URL}/blog/{publishedSlug}
                    </code>
                  </div>
                </div>
                <div className="flex shrink-0 gap-2">
                  <Button size="sm" variant="outline" onClick={handleCopyUrl}>
                    {urlCopied ? <CheckCircle className="mr-2 h-4 w-4 text-green-400" /> : <Copy className="mr-2 h-4 w-4" />}
                    {urlCopied ? "Copied!" : "Copy URL"}
                  </Button>
                  <Button size="sm" variant="outline"
                    onClick={() => window.open(`/blog/${publishedSlug}`, "_blank")}>
                    <Eye className="mr-2 h-4 w-4" />
                    Preview
                  </Button>
                  <Button size="sm" onClick={handleReset}>
                    <Plus className="mr-2 h-4 w-4" />
                    New Article
                  </Button>
                </div>
              </div>
            </div>
          )}

          <div className="grid gap-6 lg:grid-cols-3">
            <div className="space-y-6 lg:col-span-2">
              <div className="glass-card p-6">
                <h3 className="mb-4 font-heading text-lg font-semibold">Content</h3>
                <div className="space-y-4">
                  <div>
                    <Label htmlFor="title">Title *</Label>
                    <Input
                      id="title"
                      value={title}
                      onChange={(e) => setTitle(e.target.value)}
                      placeholder="e.g. Best Chrome Extensions for Privacy in 2026"
                      className="mt-1"
                    />
                  </div>

                  <div>
                    <Label htmlFor="slug">
                      URL Slug
                      <span className="ml-2 text-xs text-muted-foreground">(auto-generated from title)</span>
                    </Label>
                    <div className="mt-1 flex items-center gap-2">
                      <span className="shrink-0 text-sm text-muted-foreground">/blog/</span>
                      <Input
                        id="slug"
                        value={slug}
                        onChange={(e) => {
                          setSlugCustomized(true);
                          setSlug(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, "-").replace(/-+/g, "-"));
                        }}
                        placeholder="auto-generated-slug"
                        className="font-mono text-sm"
                      />
                    </div>
                    {slug && (
                      <p className="mt-1 text-xs text-muted-foreground break-all">
                        Live URL: <span className="text-primary">{WEBSITE_URL}/blog/{slug}</span>
                      </p>
                    )}
                  </div>

                  <div>
                    <Label htmlFor="content">Article Content (HTML) *</Label>
                    <Textarea
                      id="content"
                      value={content}
                      onChange={(e) => setContent(e.target.value)}
                      placeholder="<h2>Introduction</h2><p>Your article content here...</p>"
                      className="mt-1 min-h-[320px] font-mono text-sm"
                    />
                    {content && (
                      <p className="mt-1 text-xs text-muted-foreground">
                        ~{estimateReadTime(content)} min read · {content.replace(/<[^>]+>/g, " ").split(/\s+/).filter(Boolean).length} words
                      </p>
                    )}
                  </div>

                  <div>
                    <Label htmlFor="meta">Meta Description (SEO)</Label>
                    <Textarea
                      id="meta"
                      value={metaDescription}
                      onChange={(e) => setMetaDescription(e.target.value.slice(0, 160))}
                      placeholder="Short SEO description shown in Google results (≤160 chars). Auto-derived from content if left blank."
                      className="mt-1 h-20 text-sm"
                    />
                    <p className="mt-1 text-xs text-muted-foreground">
                      {metaDescription.length}/160
                    </p>
                  </div>
                </div>
              </div>

              <div className="glass-card p-6">
                <h3 className="mb-2 font-heading text-lg font-semibold">SEO Auto-Generation</h3>
                <p className="mb-4 text-sm text-muted-foreground">
                  On save, this article automatically gets:
                </p>
                <ul className="space-y-1.5 text-sm text-muted-foreground">
                  <li className="flex items-center gap-2"><CheckCircle className="h-4 w-4 shrink-0 text-green-500" /> Article JSON-LD schema (Schema.org)</li>
                  <li className="flex items-center gap-2"><CheckCircle className="h-4 w-4 shrink-0 text-green-500" /> BreadcrumbList schema (Home → Blog → Article)</li>
                  <li className="flex items-center gap-2"><CheckCircle className="h-4 w-4 shrink-0 text-green-500" /> OpenGraph tags (title, description, image, type=article)</li>
                  <li className="flex items-center gap-2"><CheckCircle className="h-4 w-4 shrink-0 text-green-500" /> Twitter Card meta tags</li>
                  <li className="flex items-center gap-2"><CheckCircle className="h-4 w-4 shrink-0 text-green-500" /> Canonical URL</li>
                  <li className="flex items-center gap-2"><CheckCircle className="h-4 w-4 shrink-0 text-green-500" /> Author: Daniel Carter</li>
                  <li className="flex items-center gap-2"><CheckCircle className="h-4 w-4 shrink-0 text-green-500" /> Duplicate slug check (safety guard)</li>
                </ul>
              </div>
            </div>

            <div className="space-y-4">
              <div className="glass-card p-5">
                <h3 className="mb-4 font-heading font-semibold">Publish Settings</h3>

                <div className="space-y-4">
                  <div>
                    <Label>Status</Label>
                    <Select value={status} onValueChange={(v) => setStatus(v as "draft" | "published")}>
                      <SelectTrigger className="mt-1">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="draft">Draft</SelectItem>
                        <SelectItem value="published">Published</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div>
                    <Label>Category</Label>
                    <Select value={category} onValueChange={setCategory}>
                      <SelectTrigger className="mt-1">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {CATEGORIES.map((c) => (
                          <SelectItem key={c} value={c}>{c}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div>
                    <Label htmlFor="tags">Tags</Label>
                    <Input
                      id="tags"
                      value={tagsInput}
                      onChange={(e) => setTagsInput(e.target.value)}
                      placeholder="tag1, tag2, tag3"
                      className="mt-1"
                    />
                  </div>

                  <div>
                    <Label htmlFor="keywords">Keywords (SEO)</Label>
                    <Input
                      id="keywords"
                      value={keywordsInput}
                      onChange={(e) => setKeywordsInput(e.target.value)}
                      placeholder="keyword1, keyword2"
                      className="mt-1"
                    />
                  </div>

                  <div className="flex flex-col gap-2 pt-2">
                    <Button onClick={handleSave} disabled={saving} className="w-full">
                      {saving ? (
                        <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Saving...</>
                      ) : status === "published" ? (
                        <><Globe className="mr-2 h-4 w-4" />Publish Article</>
                      ) : (
                        <><Save className="mr-2 h-4 w-4" />Save Draft</>
                      )}
                    </Button>
                  </div>
                </div>
              </div>

              <div className="glass-card p-5">
                <h3 className="mb-3 font-heading font-semibold flex items-center gap-2">
                  <Image className="h-5 w-5 text-primary" />
                  Featured Image
                </h3>
                <p className="mb-3 text-xs text-muted-foreground">
                  Auto-generates WebP 1200×630 via edge function, or paste a URL manually.
                </p>

                {featuredImage && (
                  <div className="mb-3 overflow-hidden rounded-lg border border-border">
                    <img
                      src={featuredImage}
                      alt="Featured"
                      referrerPolicy="no-referrer"
                      className="h-32 w-full object-cover"
                      onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }}
                    />
                  </div>
                )}

                <Button
                  variant="outline"
                  className="mb-3 w-full"
                  onClick={handleGenerateImage}
                  disabled={generatingImage || !title}
                >
                  {generatingImage ? (
                    <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Generating...</>
                  ) : (
                    <><Wand2 className="mr-2 h-4 w-4" />Auto-Generate Image</>
                  )}
                </Button>

                <Input
                  value={featuredImage}
                  onChange={(e) => setFeaturedImage(e.target.value)}
                  placeholder="Or paste image URL here"
                  className="text-xs"
                />
              </div>

              <div className="glass-card p-5">
                <h3 className="mb-2 font-heading font-semibold flex items-center gap-2">
                  <Tag className="h-5 w-5 text-primary" />
                  Author
                </h3>
                <p className="text-sm font-medium text-primary">{AUTHOR}</p>
                <p className="text-xs text-muted-foreground mt-1">
                  All articles are attributed to Daniel Carter automatically.
                </p>
              </div>

              <div className="glass-card p-5">
                <h3 className="mb-2 font-heading font-semibold flex items-center gap-2">
                  <RefreshCw className="h-5 w-5 text-primary" />
                  Sitemap
                </h3>
                <p className="text-xs text-muted-foreground">
                  The sitemap is auto-regenerated at each production build via <code className="rounded bg-muted px-1">pnpm run sync</code>. After publishing, trigger a new deployment to update the live sitemap.
                </p>
              </div>
            </div>
          </div>
        </motion.div>
      </main>
    </div>
  );
}
