import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { Link } from "react-router-dom";
import { Calendar, Clock, ArrowRight, Search, Tag } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import SEO from "@/components/SEO";
import { supabase } from "@/integrations/supabase/client";

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
}

const Blog = () => {
  const [articles, setArticles] = useState<Article[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);

  useEffect(() => {
    fetchArticles();
  }, []);

  const fetchArticles = async () => {
    try {
      const response = await fetch("/content/articles-index.json");
      if (!response.ok) throw new Error("Failed to fetch articles index");

      const data = await response.json();
      setArticles(data || []);
    } catch (error) {
      console.error("Error fetching articles:", error);
    } finally {
      setLoading(false);
    }
  };

  const categories = [...new Set(articles.map((a) => a.category))];

  const filteredArticles = articles.filter((article) => {
    const matchesSearch =
      article.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      article.excerpt?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesCategory = !selectedCategory || article.category === selectedCategory;
    return matchesSearch && matchesCategory;
  });

  return (
    <div className="min-h-screen bg-background">
      <SEO
        title="Blog - Latest Articles & Tips"
        description="Discover tips, tutorials, and insights about browser extensions, productivity, and web development. Stay updated with the latest Chrome extension news."
        canonicalPath="/blog"
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
              Discover tips, tutorials, and insights about browser extensions,
              productivity, and web development.
            </p>
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
              {filteredArticles.map((article, index) => (
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
                        src={article.featured_image}
                        alt={article.title}
                        className="h-full w-full object-cover transition-transform duration-300 hover:scale-105"
                      />
                    </div>
                  )}
                  <div className="p-6">
                    <div className="mb-3 flex items-center gap-3 text-xs text-muted-foreground">
                      <span className="rounded-full bg-primary/10 px-2 py-1 text-primary">
                        {article.category}
                      </span>
                      <span className="flex items-center gap-1">
                        <Calendar className="h-3 w-3" />
                        {new Date(article.published_at).toLocaleDateString()}
                      </span>
                      <span className="flex items-center gap-1">
                        <Clock className="h-3 w-3" />
                        {article.read_time} min read
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
                    <Link to={`/blog/${article.slug}`}>
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
        </div>
      </main>

      <Footer />
    </div>
  );
};

export default Blog;
