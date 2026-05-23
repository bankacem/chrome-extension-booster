import { useState, useEffect, useMemo } from "react";
import { motion } from "framer-motion";
import { Link, useSearchParams } from "react-router-dom";
import { Calendar, Clock, ArrowRight, Search, Tag, ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import SEO from "@/components/SEO";
import { resolveImagePath } from "@/utils/articlePath";

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
  read_time: number;
  author: string;
  status?: string;
}

function Pagination({
  currentPage,
  totalPages,
  onPage,
}: {
  currentPage: number;
  totalPages: number;
  onPage: (p: number) => void;
}) {
  if (totalPages <= 1) return null;

  const pages: (number | "...")[] = [];

  if (totalPages <= 7) {
    for (let i = 1; i <= totalPages; i++) pages.push(i);
  } else {
    pages.push(1);
    if (currentPage > 3) pages.push("...");
    const start = Math.max(2, currentPage - 1);
    const end = Math.min(totalPages - 1, currentPage + 1);
    for (let i = start; i <= end; i++) pages.push(i);
    if (currentPage < totalPages - 2) pages.push("...");
    pages.push(totalPages);
  }

  return (
    <nav
      aria-label="Blog pagination"
      className="mt-12 flex items-center justify-center gap-1 flex-wrap"
    >
      <Button
        variant="outline"
        size="sm"
        onClick={() => onPage(currentPage - 1)}
        disabled={currentPage === 1}
        aria-label="Previous page"
        className="gap-1"
      >
        <ChevronLeft className="h-4 w-4" />
        Prev
      </Button>

      {pages.map((p, i) =>
        p === "..." ? (
          <span key={`dots-${i}`} className="px-2 text-muted-foreground select-none">
            …
          </span>
        ) : (
          <Button
            key={p}
            variant={p === currentPage ? "default" : "outline"}
            size="sm"
            onClick={() => onPage(p as number)}
            aria-label={`Page ${p}`}
            aria-current={p === currentPage ? "page" : undefined}
            className="min-w-[36px]"
          >
            {p}
          </Button>
        )
      )}

      <Button
        variant="outline"
        size="sm"
        onClick={() => onPage(currentPage + 1)}
        disabled={currentPage === totalPages}
        aria-label="Next page"
        className="gap-1"
      >
        Next
        <ChevronRight className="h-4 w-4" />
      </Button>
    </nav>
  );
}

const Blog = () => {
  const [articles, setArticles] = useState<Article[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [searchParams, setSearchParams] = useSearchParams();

  const currentPage = Math.max(1, parseInt(searchParams.get("page") ?? "1") || 1);

  useEffect(() => {
    const fetchArticles = async () => {
      try {
        const response = await fetch("/content/articles-index.json", { cache: "no-store" });
        if (!response.ok) throw new Error("Failed to fetch articles index");
        const data: Article[] = await response.json();
        const published = data.filter(
          (a) => !a.status || a.status === "published"
        );
        published.sort(
          (a, b) =>
            new Date(b.published_at || 0).getTime() -
            new Date(a.published_at || 0).getTime()
        );
        setArticles(published);
      } catch (error) {
        console.error("Error fetching articles:", error);
      } finally {
        setLoading(false);
      }
    };
    fetchArticles();
  }, []);

  const categories = useMemo(
    () => [...new Set(articles.map((a) => a.category || "Uncategorized"))].sort(),
    [articles]
  );

  const filteredArticles = useMemo(() => {
    const q = searchTerm.toLowerCase();
    return articles.filter((article) => {
      const matchesSearch =
        !q ||
        article.title.toLowerCase().includes(q) ||
        (article.excerpt || "").toLowerCase().includes(q);
      const matchesCategory =
        !selectedCategory ||
        (article.category || "Uncategorized") === selectedCategory;
      return matchesSearch && matchesCategory;
    });
  }, [articles, searchTerm, selectedCategory]);

  const totalPages = Math.max(1, Math.ceil(filteredArticles.length / ARTICLES_PER_PAGE));
  const safePage = Math.min(currentPage, totalPages);
  const pageArticles = filteredArticles.slice(
    (safePage - 1) * ARTICLES_PER_PAGE,
    safePage * ARTICLES_PER_PAGE
  );

  const goToPage = (p: number) => {
    const next = Math.max(1, Math.min(p, totalPages));
    setSearchParams((prev) => {
      const s = new URLSearchParams(prev);
      if (next === 1) s.delete("page");
      else s.set("page", String(next));
      return s;
    });
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const handleSearch = (val: string) => {
    setSearchTerm(val);
    setSearchParams((prev) => {
      const s = new URLSearchParams(prev);
      s.delete("page");
      return s;
    });
  };

  const handleCategory = (cat: string | null) => {
    setSelectedCategory(cat);
    setSearchParams((prev) => {
      const s = new URLSearchParams(prev);
      s.delete("page");
      return s;
    });
  };

  const pageTitle =
    safePage > 1
      ? `Blog - Page ${safePage} | Chrome Extensions Tips`
      : "Blog - Latest Articles & Tips";

  const canonicalPath = safePage > 1 ? `/blog?page=${safePage}` : "/blog";

  return (
    <div className="min-h-screen bg-background">
      <SEO
        title={pageTitle}
        description="Discover tips, tutorials, and insights about Chrome extensions, productivity, and web development. Stay updated with the latest extension news."
        canonicalPath={canonicalPath}
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
              Discover tips, tutorials, and insights about Chrome extensions,
              productivity, and web development.
            </p>
            {!loading && (
              <p className="mt-2 text-sm text-muted-foreground">
                {filteredArticles.length.toLocaleString()} articles
                {safePage > 1 && ` · Page ${safePage} of ${totalPages}`}
              </p>
            )}
          </motion.div>

          {/* Search + Filter */}
          <div className="mb-8 flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
            <div className="relative max-w-md flex-1">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Search articles..."
                value={searchTerm}
                onChange={(e) => handleSearch(e.target.value)}
                className="pl-10"
              />
            </div>
            <div className="flex flex-wrap gap-2">
              <Button
                variant={selectedCategory === null ? "default" : "outline"}
                size="sm"
                onClick={() => handleCategory(null)}
              >
                All
              </Button>
              {categories.map((category) => (
                <Button
                  key={category}
                  variant={selectedCategory === category ? "default" : "outline"}
                  size="sm"
                  onClick={() => handleCategory(category)}
                >
                  {category}
                </Button>
              ))}
            </div>
          </div>

          {/* Articles Grid */}
          {loading ? (
            <div className="grid gap-8 md:grid-cols-2 lg:grid-cols-3">
              {Array.from({ length: 12 }).map((_, i) => (
                <div
                  key={i}
                  className="glass-card overflow-hidden animate-pulse"
                >
                  <div className="aspect-video bg-muted" />
                  <div className="p-6 space-y-3">
                    <div className="h-3 w-24 rounded bg-muted" />
                    <div className="h-5 w-full rounded bg-muted" />
                    <div className="h-5 w-3/4 rounded bg-muted" />
                    <div className="h-4 w-full rounded bg-muted" />
                    <div className="h-4 w-2/3 rounded bg-muted" />
                  </div>
                </div>
              ))}
            </div>
          ) : filteredArticles.length === 0 ? (
            <div className="py-20 text-center">
              <p className="text-muted-foreground">No articles found.</p>
            </div>
          ) : (
            <>
              <div className="grid gap-8 md:grid-cols-2 lg:grid-cols-3">
                {pageArticles.map((article, index) => (
                  <motion.article
                    key={article.slug}
                    initial={{ opacity: 0, y: 16 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.25, delay: Math.min(index, 5) * 0.05 }}
                    className="glass-card overflow-hidden"
                  >
                    {article.featured_image && (
                      <Link to={`/blog/${article.slug}`} tabIndex={-1} aria-hidden>
                        <div className="aspect-video overflow-hidden bg-muted">
                          <img
                            src={resolveImagePath(article.featured_image)}
                            alt={article.title}
                            loading="lazy"
                            decoding="async"
                            referrerPolicy="no-referrer"
                            className="h-full w-full object-cover transition-transform duration-300 hover:scale-105"
                          />
                        </div>
                      </Link>
                    )}
                    <div className="p-6">
                      <div className="mb-3 flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                        <span className="rounded-full bg-primary/10 px-2 py-1 text-primary font-medium">
                          {article.category || "Uncategorized"}
                        </span>
                        <span className="flex items-center gap-1">
                          <Calendar className="h-3 w-3" />
                          {article.published_at
                            ? new Date(article.published_at).toLocaleDateString("en-US", {
                                month: "short",
                                day: "numeric",
                                year: "numeric",
                              })
                            : "—"}
                        </span>
                        <span className="flex items-center gap-1">
                          <Clock className="h-3 w-3" />
                          {article.read_time ?? 5} min
                        </span>
                      </div>
                      <h2 className="mb-2 font-heading text-xl font-semibold line-clamp-2 leading-snug">
                        <Link
                          to={`/blog/${article.slug}`}
                          className="hover:text-primary transition-colors"
                        >
                          {article.title}
                        </Link>
                      </h2>
                      {article.excerpt && (
                        <p className="mb-4 text-sm text-muted-foreground line-clamp-3">
                          {article.excerpt}
                        </p>
                      )}
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
                      <Link to={`/blog/${article.slug}`}>
                        <Button variant="ghost" size="sm" className="group p-0 h-auto font-medium">
                          Read More
                          <ArrowRight className="ml-1 h-4 w-4 transition-transform group-hover:translate-x-1" />
                        </Button>
                      </Link>
                    </div>
                  </motion.article>
                ))}
              </div>

              <Pagination
                currentPage={safePage}
                totalPages={totalPages}
                onPage={goToPage}
              />

              <p className="mt-4 text-center text-sm text-muted-foreground">
                Showing {(safePage - 1) * ARTICLES_PER_PAGE + 1}–
                {Math.min(safePage * ARTICLES_PER_PAGE, filteredArticles.length)} of{" "}
                {filteredArticles.length.toLocaleString()} articles
              </p>
            </>
          )}
        </div>
      </main>

      <Footer />
    </div>
  );
};

export default Blog;
