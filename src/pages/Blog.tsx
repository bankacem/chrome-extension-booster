import { useState, useEffect, useMemo } from "react";
import { motion } from "framer-motion";
import { Link, useSearchParams, useParams } from "react-router-dom";
import { Calendar, Clock, ArrowRight, Search, Tag, User } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import SEO from "@/components/SEO";
import { supabase } from "@/integrations/supabase/client";
import { resolveImagePath, getLocalizedIndexPath, isSupportedLocale } from "@/utils/articlePath";
import {
  Pagination,
  PaginationContent,
  PaginationEllipsis,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from "@/components/ui/pagination";

const ARTICLES_PER_PAGE = 12;

interface Article {
  id: string;
  title: string;
  slug: string;
  excerpt: string;
  featured_image: string;
  category: string;
  tags: string[];
  published_at: string;
  updated_at?: string;
  read_time: number;
  author: string;
}

const Blog = () => {
  const { lang: rawLang } = useParams<{ lang?: string }>();
  const lang = isSupportedLocale(rawLang) ? rawLang : undefined;
  const routePrefix = lang ? `/${lang}` : "";
  const [articles, setArticles] = useState<Article[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [searchParams, setSearchParams] = useSearchParams();

  const currentPage = Math.max(1, parseInt(searchParams.get("page") || "1", 10) || 1);

  const goToPage = (page: number) => {
    const params = new URLSearchParams(searchParams);
    if (page <= 1) {
      params.delete("page");
    } else {
      params.set("page", String(page));
    }
    setSearchParams(params);
    // Bring the user back to the top of the article list, not the whole page
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  useEffect(() => {
    fetchArticles();
  }, []);

  // Whenever the search term or category filter changes, jump back to page 1
  useEffect(() => {
    if (currentPage !== 1) {
      const params = new URLSearchParams(searchParams);
      params.delete("page");
      setSearchParams(params, { replace: true });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchTerm, selectedCategory]);

  const fetchArticles = async () => {
    try {
      const path = lang ? getLocalizedIndexPath(lang) : "/content/articles-index.json";
      const response = await fetch(path);
      if (!response.ok) throw new Error("Failed to fetch articles index");

      const data = await response.json();
      setArticles(data || []);
    } catch (error) {
      console.error("Error fetching articles:", error);
    } finally {
      setLoading(false);
    }
  };

  const categories = [...new Set(articles.map((a) => a.category || "Uncategorized"))].sort();

  const filteredArticles = articles.filter((article) => {
    const matchesSearch =
      article.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      article.excerpt?.toLowerCase().includes(searchTerm.toLowerCase());
    const articleCategory = article.category || "Uncategorized";
    const matchesCategory = !selectedCategory || articleCategory === selectedCategory;
    return matchesSearch && matchesCategory;
  });

  const totalPages = Math.max(1, Math.ceil(filteredArticles.length / ARTICLES_PER_PAGE));
  const safePage = Math.min(currentPage, totalPages);
  const paginatedArticles = filteredArticles.slice(
    (safePage - 1) * ARTICLES_PER_PAGE,
    safePage * ARTICLES_PER_PAGE
  );

  // Builds a compact page list like: 1 ... 4 5 [6] 7 8 ... 63
  const pageNumbers = useMemo(() => {
    const pages: (number | "ellipsis")[] = [];
    const siblings = 1;
    const range = (start: number, end: number) => {
      const out: number[] = [];
      for (let i = start; i <= end; i++) out.push(i);
      return out;
    };

    if (totalPages <= 7) {
      return range(1, totalPages);
    }

    const left = Math.max(2, safePage - siblings);
    const right = Math.min(totalPages - 1, safePage + siblings);

    pages.push(1);
    if (left > 2) pages.push("ellipsis");
    pages.push(...range(left, right));
    if (right < totalPages - 1) pages.push("ellipsis");
    pages.push(totalPages);

    return pages;
  }, [safePage, totalPages]);

  return (
    <div className="min-h-screen bg-background">
      <SEO
        title={
          lang === "fr" ? "Blog - Derniers Articles et Astuces"
          : lang === "es" ? "Blog - Últimos Artículos y Consejos"
          : "Blog - Latest Articles & Tips"
        }
        description={
          lang === "fr" ? "Découvrez des astuces, tutoriels et analyses sur les extensions de navigateur, la productivité et le développement web."
          : lang === "es" ? "Descubre consejos, tutoriales e ideas sobre extensiones de navegador, productividad y desarrollo web."
          : "Discover tips, tutorials, and insights about browser extensions, productivity, and web development. Stay updated with the latest Chrome extension news."
        }
        canonicalPath={safePage > 1 ? `/blog?page=${safePage}` : `/blog`}
        lang={(lang as "en" | "fr" | "es") || "en"}
      />
      <Navbar />
      
      <main className="pt-24 pb-16">
        <div className="container mx-auto px-4">
          {/* Header */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="mb-12 text-center"
          >
            <span className="mb-4 inline-block rounded-full bg-primary/10 px-4 py-1.5 text-sm font-medium text-primary">
              Our Blog
            </span>
            <h1 className="mb-4 font-heading text-4xl font-bold md:text-5xl">
              Latest Articles & Tips
            </h1>
            <p className="mx-auto max-w-2xl text-muted-foreground">
              Discover practical, reviewed guides about browser extensions, privacy, productivity, and performance.
            </p>
            <Link to="/editorial-policy" className="mt-4 inline-block text-sm text-primary hover:underline">Learn how ExtensionTo reviews and updates its guides</Link>
          </motion.div>

          {/* Search and Filter */}
          <div className="mb-8 flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
            <div className="relative max-w-md flex-1">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Search articles..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
            <div className="flex flex-wrap gap-2">
              <Button
                variant={selectedCategory === null ? "default" : "outline"}
                size="sm"
                onClick={() => setSelectedCategory(null)}
              >
                All
              </Button>
              {categories.map((category) => (
                <Button
                  key={category}
                  variant={selectedCategory === category ? "default" : "outline"}
                  size="sm"
                  onClick={() => setSelectedCategory(category)}
                >
                  {category}
                </Button>
              ))}
            </div>
          </div>

          {/* Articles Grid */}
          {loading ? (
            <div className="flex items-center justify-center py-20">
              <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
            </div>
          ) : filteredArticles.length === 0 ? (
            <div className="py-20 text-center">
              <p className="text-muted-foreground">No articles found.</p>
            </div>
          ) : (
            <div className="grid gap-8 md:grid-cols-2 lg:grid-cols-3">
              {paginatedArticles.map((article, index) => (
                <motion.article
                  key={article.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.1 }}
                  className="glass-card overflow-hidden"
                >
                  {article.featured_image && (
                    <div className="aspect-video overflow-hidden">
                      <img
                        src={resolveImagePath(article.featured_image)}
                        alt={article.title}
                        referrerPolicy="no-referrer"
                        className="h-full w-full object-cover transition-transform duration-300 hover:scale-105"
                      />
                    </div>
                  )}
                  <div className="p-6">
                    <div className="mb-3 flex items-center gap-3 text-xs text-muted-foreground">
                      <span className="rounded-full bg-primary/10 px-2 py-1 text-primary">
                        {article.category || "Uncategorized"}
                      </span>
                      <span className="flex items-center gap-1">
                        <Calendar className="h-3 w-3" />
                        {new Date(article.published_at).toLocaleDateString()}
                      </span>
                      <span className="flex items-center gap-1">
                        <Clock className="h-3 w-3" />
                        {article.read_time} min read
                      </span>
                      <span className="flex items-center gap-1">
                        <User className="h-3 w-3" />
                        {article.author || "ExtensionTo Editorial Team"}
                      </span>
                    </div>
                    <h2 className="mb-2 font-heading text-xl font-semibold line-clamp-2">
                      {article.title}
                    </h2>
                    <p className="mb-4 text-sm text-muted-foreground line-clamp-3">
                      {article.excerpt}
                    </p>
                    {article.tags && article.tags.length > 0 && (
                      <div className="mb-4 flex flex-wrap gap-1">
                        {article.tags.slice(0, 3).map((tag) => (
                          <span
                            key={tag}
                            className="inline-flex items-center gap-1 rounded bg-muted px-2 py-0.5 text-xs"
                          >
                            <Tag className="h-2 w-2" />
                            {tag}
                          </span>
                        ))}
                      </div>
                    )}
                    <Link to={`${routePrefix}/blog/${article.slug}`}>
                      <Button variant="ghost" size="sm" className="group p-0">
                        Read More
                        <ArrowRight className="ml-1 h-4 w-4 transition-transform group-hover:translate-x-1" />
                      </Button>
                    </Link>
                  </div>
                </motion.article>
              ))}
            </div>
          )}

          {/* Pagination */}
          {!loading && totalPages > 1 && (
            <div className="mt-12">
              <Pagination>
                <PaginationContent>
                  <PaginationItem>
                    <PaginationPrevious
                      href="#"
                      onClick={(e) => {
                        e.preventDefault();
                        if (safePage > 1) goToPage(safePage - 1);
                      }}
                      className={safePage === 1 ? "pointer-events-none opacity-50" : ""}
                    />
                  </PaginationItem>

                  {pageNumbers.map((page, idx) =>
                    page === "ellipsis" ? (
                      <PaginationItem key={`ellipsis-${idx}`}>
                        <PaginationEllipsis />
                      </PaginationItem>
                    ) : (
                      <PaginationItem key={page}>
                        <PaginationLink
                          href="#"
                          isActive={page === safePage}
                          onClick={(e) => {
                            e.preventDefault();
                            goToPage(page);
                          }}
                        >
                          {page}
                        </PaginationLink>
                      </PaginationItem>
                    )
                  )}

                  <PaginationItem>
                    <PaginationNext
                      href="#"
                      onClick={(e) => {
                        e.preventDefault();
                        if (safePage < totalPages) goToPage(safePage + 1);
                      }}
                      className={safePage === totalPages ? "pointer-events-none opacity-50" : ""}
                    />
                  </PaginationItem>
                </PaginationContent>
              </Pagination>
              <p className="mt-4 text-center text-sm text-muted-foreground">
                صفحة {safePage} من {totalPages} — {filteredArticles.length} مقال
              </p>
            </div>
          )}
        </div>
      </main>

      <Footer />
    </div>
  );
};

export default Blog;
