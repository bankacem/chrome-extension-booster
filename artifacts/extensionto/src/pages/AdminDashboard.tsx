import { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import {
  FileText, Plus, LayoutDashboard, LogOut, ShieldCheck,
  ExternalLink, Globe, BarChart3, Clock, Eye, Settings,
  Sparkles, RefreshCw, ChevronRight,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Helmet } from "react-helmet-async";
import { useAdminSession } from "@/hooks/useAdminSession";

const WEBSITE_URL = "https://www.extensionto.com";

interface ArticleSummary {
  id: string;
  title: string;
  slug: string;
  status?: string;
  category?: string;
  published_at?: string;
}

interface IndexStats {
  total: number;
  recent: ArticleSummary[];
}

async function loadIndexStats(): Promise<IndexStats> {
  try {
    const res = await fetch("/content/articles-index.json");
    if (!res.ok) throw new Error("index not found");
    const data: ArticleSummary[] = await res.json();
    const sorted = [...data].sort((a, b) => {
      const da = a.published_at ? new Date(a.published_at).getTime() : 0;
      const db = b.published_at ? new Date(b.published_at).getTime() : 0;
      return db - da;
    });
    return { total: data.length, recent: sorted.slice(0, 5) };
  } catch {
    return { total: 0, recent: [] };
  }
}

const card = "rounded-xl border border-border bg-card p-6 shadow-sm";

export default function AdminDashboard() {
  const { session, logout } = useAdminSession();
  const navigate = useNavigate();
  const [stats, setStats] = useState<IndexStats>({ total: 0, recent: [] });
  const [statsLoading, setStatsLoading] = useState(true);

  useEffect(() => {
    loadIndexStats().then((s) => {
      setStats(s);
      setStatsLoading(false);
    });
  }, []);

  const handleLogout = async () => {
    await logout();
    navigate("/admin/login", { replace: true });
  };

  const quickLinks = [
    {
      label: "CMS Creator",
      description: "Write & publish new articles with auto SEO",
      icon: <Sparkles className="h-6 w-6 text-primary" />,
      href: "/admin/cms",
      primary: true,
    },
    {
      label: "Full Admin Panel",
      description: "Manage, edit, schedule, and bulk-import articles",
      icon: <Settings className="h-6 w-6 text-blue-500" />,
      href: "/settings/manage",
      primary: false,
    },
    {
      label: "SEO Dashboard",
      description: "Audit individual articles for SEO health",
      icon: <BarChart3 className="h-6 w-6 text-purple-500" />,
      href: "/settings/seo-dashboard",
      primary: false,
    },
    {
      label: "AI Generator",
      description: "Generate articles automatically with AI",
      icon: <RefreshCw className="h-6 w-6 text-green-500" />,
      href: "/settings/ai-generator",
      primary: false,
    },
    {
      label: "View Live Blog",
      description: "See the public blog at extensionto.com",
      icon: <Globe className="h-6 w-6 text-orange-500" />,
      href: "/blog",
      primary: false,
    },
  ];

  return (
    <div className="min-h-screen bg-background">
      <Helmet>
        <title>Admin Dashboard | ExtensionTo</title>
        <meta name="robots" content="noindex, nofollow" />
      </Helmet>

      {/* Top bar */}
      <header className="sticky top-0 z-50 border-b border-border bg-background/95 backdrop-blur">
        <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-4">
          <div className="flex items-center gap-3">
            <ShieldCheck className="h-6 w-6 text-primary" />
            <div>
              <p className="font-heading text-base font-bold leading-none">Admin Dashboard</p>
              <p className="mt-0.5 text-xs text-muted-foreground">extensionto.com</p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            {session?.email && (
              <span className="hidden text-sm text-muted-foreground md:block">
                {session.email}
              </span>
            )}
            <Button variant="ghost" size="sm" asChild>
              <a href={WEBSITE_URL} target="_blank" rel="noopener noreferrer">
                <ExternalLink className="mr-1.5 h-4 w-4" />
                Site
              </a>
            </Button>
            <Button variant="outline" size="sm" onClick={handleLogout}>
              <LogOut className="mr-1.5 h-4 w-4" />
              Logout
            </Button>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-6xl px-4 py-10">
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3 }}
          className="space-y-8"
        >
          {/* Welcome */}
          <div>
            <h1 className="font-heading text-3xl font-bold">Welcome back</h1>
            <p className="mt-1 text-muted-foreground">
              Manage your ExtensionTo blog — {stats.total} articles published.
            </p>
          </div>

          {/* Stat cards */}
          <div className="grid gap-4 sm:grid-cols-3">
            <div className={card}>
              <div className="flex items-center gap-4">
                <div className="rounded-lg bg-primary/10 p-3">
                  <FileText className="h-6 w-6 text-primary" />
                </div>
                <div>
                  {statsLoading ? (
                    <div className="h-8 w-16 animate-pulse rounded bg-muted" />
                  ) : (
                    <p className="text-3xl font-bold">{stats.total}</p>
                  )}
                  <p className="text-sm text-muted-foreground">Total Articles</p>
                </div>
              </div>
            </div>

            <div className={card}>
              <div className="flex items-center gap-4">
                <div className="rounded-lg bg-green-500/10 p-3">
                  <Eye className="h-6 w-6 text-green-500" />
                </div>
                <div>
                  <p className="text-3xl font-bold">Live</p>
                  <p className="text-sm text-muted-foreground">Site Status</p>
                </div>
              </div>
            </div>

            <div className={card}>
              <div className="flex items-center gap-4">
                <div className="rounded-lg bg-blue-500/10 p-3">
                  <Clock className="h-6 w-6 text-blue-500" />
                </div>
                <div>
                  <p className="text-3xl font-bold">8h</p>
                  <p className="text-sm text-muted-foreground">Session Length</p>
                </div>
              </div>
            </div>
          </div>

          {/* Quick links */}
          <div>
            <h2 className="mb-4 font-heading text-lg font-semibold">Quick Actions</h2>
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {quickLinks.map((link) => (
                <Link
                  key={link.href}
                  to={link.href}
                  className={`group flex items-start gap-4 rounded-xl border p-5 transition-colors hover:bg-accent ${
                    link.primary
                      ? "border-primary/40 bg-primary/5"
                      : "border-border bg-card"
                  }`}
                >
                  <div className={`shrink-0 rounded-lg p-2 ${link.primary ? "bg-primary/10" : "bg-muted"}`}>
                    {link.icon}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className={`font-semibold ${link.primary ? "text-primary" : ""}`}>
                      {link.label}
                    </p>
                    <p className="mt-0.5 text-sm text-muted-foreground">{link.description}</p>
                  </div>
                  <ChevronRight className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground transition-transform group-hover:translate-x-0.5" />
                </Link>
              ))}
            </div>
          </div>

          {/* Recent articles */}
          <div>
            <div className="mb-4 flex items-center justify-between">
              <h2 className="font-heading text-lg font-semibold">Recent Articles</h2>
              <Link to="/blog" className="text-sm text-primary hover:underline">
                View all →
              </Link>
            </div>

            <div className={`${card} p-0 overflow-hidden`}>
              {statsLoading ? (
                <div className="space-y-px">
                  {[...Array(5)].map((_, i) => (
                    <div key={i} className="flex items-center gap-4 px-5 py-4">
                      <div className="h-4 flex-1 animate-pulse rounded bg-muted" />
                      <div className="h-4 w-20 animate-pulse rounded bg-muted" />
                    </div>
                  ))}
                </div>
              ) : stats.recent.length === 0 ? (
                <div className="px-5 py-8 text-center text-muted-foreground">
                  No articles found in index.
                </div>
              ) : (
                <ul className="divide-y divide-border">
                  {stats.recent.map((a) => (
                    <li key={a.id} className="flex items-center justify-between gap-4 px-5 py-3.5 hover:bg-accent/40 transition-colors">
                      <div className="min-w-0">
                        <p className="truncate text-sm font-medium">{a.title}</p>
                        <p className="text-xs text-muted-foreground">/blog/{a.slug}</p>
                      </div>
                      <div className="flex shrink-0 items-center gap-2">
                        {a.category && (
                          <span className="rounded-full bg-muted px-2 py-0.5 text-xs text-muted-foreground">
                            {a.category}
                          </span>
                        )}
                        <a
                          href={`/blog/${a.slug}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-muted-foreground hover:text-foreground"
                        >
                          <ExternalLink className="h-3.5 w-3.5" />
                        </a>
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>

          {/* Footer info */}
          <div className="rounded-xl border border-border bg-muted/30 px-5 py-4 text-sm text-muted-foreground">
            <p>
              <strong className="text-foreground">Security:</strong> Session auto-expires in 8 hours.
              Blog content is read-only from this dashboard — all articles are markdown-sourced and
              untouched. Use the CMS Creator or Full Admin Panel to publish new content.
            </p>
          </div>
        </motion.div>
      </main>
    </div>
  );
}
