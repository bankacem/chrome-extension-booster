import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { ArrowRight, Calendar, Clock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";
import { getLocalizedIndexPath, resolveImagePath } from "@/utils/articlePath";
import { useLang } from "@/hooks/useLang";
import { useTranslation } from "react-i18next";

type FeaturedArticle = {
  title: string;
  excerpt?: string;
  meta_description?: string;
  published_at?: string;
  read_time?: number;
  category?: string;
  slug: string;
  featured_image?: string;
  localized?: boolean;
};

const FEATURED_SLUGS = [
  "chrome-extensions-complete-guide",
  "best-chrome-privacy-extensions-2026-complete-guide",
  "the-elite-stack-essential-chrome-extensions-for-work-pro-environments",
];

const BlogSection = () => {
  const [posts, setPosts] = useState<FeaturedArticle[]>([]);
  const activeLang = useLang();
  const { t } = useTranslation();

  useEffect(() => {
    let active = true;
    const loadIndex = async (path: string): Promise<FeaturedArticle[]> => {
      const response = await fetch(path);
      return response.ok ? await response.json() as FeaturedArticle[] : [];
    };

    Promise.all([
      loadIndex("/content/articles-index.json"),
      activeLang === "en" ? Promise.resolve([]) : loadIndex(getLocalizedIndexPath(activeLang)),
    ])
      .then(([englishArticles, localizedArticles]) => {
        if (!active) return;
        const selected = FEATURED_SLUGS
          .map((slug) => {
            const localized = localizedArticles.find((article) => article.slug === slug);
            const english = englishArticles.find((article) => article.slug === slug);
            return localized ? { ...localized, localized: true } : english ? { ...english, localized: false } : null;
          })
          .filter((article): article is FeaturedArticle => Boolean(article));
        const localizedFallback = localizedArticles.slice(0, 3).map((article) => ({ ...article, localized: true }));
        setPosts(activeLang === "en" || selected.some((article) => article.localized) ? selected : localizedFallback.length ? localizedFallback : selected);
      })
      .catch(() => {
        if (active) setPosts([]);
      });
    return () => { active = false; };
  }, [activeLang]);

  return (
    <section id="blog" className="relative py-24">
      <div className="container mx-auto px-4">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5 }}
          className="mb-16 flex flex-col items-center justify-between gap-4 md:flex-row"
        >
          <div>
            <span className="mb-4 inline-block rounded-full bg-primary/10 px-4 py-1.5 text-sm font-medium text-primary">{t("blog_section.eyebrow")}</span>
            <h2 className="font-heading text-3xl font-bold md:text-5xl">{t("blog_section.title")}</h2>
            <p className="mt-3 max-w-2xl text-muted-foreground">{t("blog_section.description")}</p>
          </div>
          <Button variant="glass" asChild>
            <Link to={`${activeLang === "en" ? "" : `/${activeLang}`}/blog`}>{t("blog_section.view_all")} <ArrowRight className="h-4 w-4" /></Link>
          </Button>
        </motion.div>

        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {posts.map((post, index) => (
            <motion.article
              key={post.slug}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5, delay: index * 0.1 }}
              className="group glass-card overflow-hidden transition-all duration-300 hover:border-primary/30"
            >
              {post.featured_image ? (
                <div className="h-32 overflow-hidden bg-gradient-to-br from-primary/20 via-accent/20 to-secondary">
                  <img src={resolveImagePath(post.featured_image)} alt="" loading="lazy" className="h-full w-full object-cover opacity-90 transition-transform duration-300 group-hover:scale-105" />
                </div>
              ) : <div className="h-32 bg-gradient-to-br from-primary/20 via-accent/20 to-secondary" />}
              <div className="p-6">
                <div className="mb-3 flex flex-wrap items-center gap-3 text-sm text-muted-foreground">
                  <span className="rounded-full bg-primary/10 px-2 py-0.5 text-xs font-medium text-primary">{post.category || t("extensions_section.eyebrow")}</span>
                  {post.published_at && <span className="flex items-center gap-1"><Calendar className="h-3 w-3" />{new Date(post.published_at).toLocaleDateString(activeLang)}</span>}
                  {post.read_time && <span className="flex items-center gap-1"><Clock className="h-3 w-3" />{post.read_time} {t("blog.min_read")}</span>}
                </div>
                <h3 className="mb-2 font-heading text-lg font-semibold transition-colors group-hover:text-primary">{post.title}</h3>
                <p className="mb-4 line-clamp-2 text-sm text-muted-foreground">{post.excerpt || post.meta_description}</p>
                <Link to={`${post.localized ? (activeLang === "en" ? "" : `/${activeLang}`) : ""}/blog/${post.slug}`} className="inline-flex items-center gap-1 text-sm font-medium text-primary transition-all group-hover:gap-2">{t("blog_section.read_guide")} <ArrowRight className="h-4 w-4" /></Link>
              </div>
            </motion.article>
          ))}
        </div>
      </div>
    </section>
  );
};

export default BlogSection;
