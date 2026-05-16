import { useState, useEffect, useCallback } from "react";
import { Link, useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import {
  FileText, Plus, LogOut, ShieldCheck, ExternalLink, Globe,
  BarChart3, Clock, Eye, Settings, Sparkles, RefreshCw,
  ChevronRight, CheckCircle, PenLine, AlertCircle, Database,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Helmet } from "react-helmet-async";
import { useAdminSession } from "@/hooks/useAdminSession";
import { supabase } from "@/integrations/supabase/client";

const WEBSITE_URL = "https://www.extensionto.com";

// ── Types ────────────────────────────────────────────────────────────────────
interface RecentArticle {
  id: string;
  title: string;
  slug: string;
  category: string | null;
  status: string;
  created_at: string;
  published_at: string | null;
}

interface DashboardStats {
  supabaseTotal: number;
  supabasePublished: number;
  supabaseDraft: number;
  markdownTotal: number;
  recent: RecentArticle[];
  source: "supabase" | "local" | "empty";
  error: string | null;
}

const EMPTY_STATS: DashboardStats = {
  supabaseTotal: 0,
  supabasePublished: 0,
  supabaseDraft: 0,
  markdownTotal: 0,
  recent: [],
  source: "empty",
  error: null,
};

// ── Data fetching ─────────────────────────────────────────────────────────────
async function fetchDashboardStats(): Promise<DashboardStats> {
  // 1. Local markdown index (the 499 existing articles — always available)
  let markdownTotal = 0;
  try {
    const res = await fetch("/content/articles-index.json");
    if (res.ok) {
      const data = await res.json();
      markdownTotal = Array.isArray(data) ? data.length : 0;
    }
  } catch {
    // non-blocking
  }

  // 2. Supabase — real CMS articles
  try {
    const [countRes, recentRes] = await Promise.all([
      // Published count
      supabase
        .from("articles")
        .select("status", { count: "exact" }),
      // Recent 10 articles
      supabase
        .from("articles")
        .select("id, title, slug, category, status, created_at, published_at")
        .order("created_at", { ascending: false })
        .limit(10),
    ]);

    if (countRes.error) throw countRes.error;

    const rows = (countRes.data ?? []) as { status: string }[];
    const supabaseTotal = countRes.count ?? rows.length;
    const supabasePublished = rows.filter((r) => r.status === "published").length;
    const supabaseDraft = rows.filter((r) => r.status === "draft").length;
    const recent: RecentArticle[] = ((recentRes.data ?? []) as RecentArticle[]);

    return {
      supabaseTotal,
      supabasePublished,
      supabaseDraft,
      markdownTotal,
      recent,
      source: "supabase",
      error: null,
    };
  } catch (err: any) {
    // Supabase unreachable — show local data as fallback
    let localRecent: RecentArticle[] = [];
    try {
      const res = await fetch("/content/articles-index.json");
      if (res.ok) {
        const data: any[] = await res.json();
        localRecent = data
          .sort((a, b) => {
            const da = a.published_at ? new Date(a.published_at).getTime() : 0;
            const db = b.published_at ? new Date(b.published_at).getTime() : 0;
            return db - da;
          })
          .slice(0, 10)
          .map((a) => ({
            id: a.id ?? a.slug,
            title: a.title ?? "",
            slug: a.slug ?? "",
            category: a.category ?? null,
            status: "published",
            created_at: a.published_at ?? "",
            published_at: a.published_at ?? null,
          }));
      }
    } catch {
      // nothing
    }

    return {
      supabaseTotal: 0,
      supabasePublished: 0,
      supabaseDraft: 0,
      markdownTotal,
      recent: localRecent,
      source: localRecent.length > 0 ? "local" : "empty",
      error: err?.message ?? "Supabase unavailable",
    };
  }
}

// ── Helpers ───────────────────────────────────────────────────────────────────
function fmtDate(raw: string | null): string {
  if (!raw) return "—";
  try {
    return new Intl.DateTimeFormat("en-US", {
      month: "short", day: "numeric", year: "numeric",
    }).format(new Date(raw));
  } catch {
    return raw;
  }
}

const card = "rounded-xl border border-border bg-card p-6 shadow-sm";

// ── Component ─────────────────────────────────────────────────────────────────
export default function AdminDashboard() {
  const { session, logout } = useAdminSession();
  const navigate = useNavigate();

  const [stats, setStats] = useState<DashboardStats>(EMPTY_STATS);
  const [statsLoading, setStatsLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const loadStats = useCallback(async (isRefresh = false) => {
    if (isRefresh) setRefreshing(true);
    else setStatsLoading(true);
    const data = await fetchDashboardStats();
    setStats(data);
    if (isRefresh) setRefreshing(false);
    else setStatsLoading(false);
  }, []);

  useEffect(() => { loadStats(); }, [loadStats]);

  const handleLogout = () => {
    logout();
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

  // Total across markdown + CMS
  const grandTotal = stats.markdownTotal + stats.supabaseTotal;

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
          {/* Welcome + Supabase status */}
          <div className="flex items-start justify-between gap-4">
            <div>
              <h1 className="font-heading text-3xl font-bold">Welcome back</h1>
              <p className="mt-1 text-muted-foreground">
                {statsLoading
                  ? "Loading article data…"
                  : `Manage your ExtensionTo blog — ${grandTotal.toLocaleString()} total articles.`}
              </p>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={() => loadStats(true)}
              disabled={statsLoading || refreshing}
              className="shrink-0"
            >
              <RefreshCw className={`mr-1.5 h-4 w-4 ${refreshing ? "animate-spin" : ""}`} />
              Refresh
            </Button>
          </div>

          {/* Supabase error banner */}
          {stats.error && (
            <div className="flex items-start gap-3 rounded-xl border border-amber-500/30 bg-amber-500/10 px-4 py-3 text-sm text-amber-600 dark:text-amber-400">
              <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
              <span>
                <strong>Supabase unavailable:</strong> {stats.error}. Showing local markdown index data as fallback.
              </span>
            </div>
          )}

          {/* Stat cards */}
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {/* Grand total */}
            <div className={card}>
              <div className="flex items-center gap-4">
                <div className="rounded-lg bg-primary/10 p-3">
                  <FileText className="h-6 w-6 text-primary" />
                </div>
                <div>
                  {statsLoading ? (
                    <div className="h-8 w-16 animate-pulse rounded bg-muted" />
                  ) : (
                    <p className="text-3xl font-bold">{grandTotal.toLocaleString()}</p>
                  )}
                  <p className="text-sm text-muted-foreground">Total Articles</p>
                </div>
              </div>
            </div>

            {/* Markdown articles */}
            <div className={card}>
              <div className="flex items-center gap-4">
                <div className="rounded-lg bg-blue-500/10 p-3">
                  <PenLine className="h-6 w-6 text-blue-500" />
                </div>
                <div>
                  {statsLoading ? (
                    <div className="h-8 w-16 animate-pulse rounded bg-muted" />
                  ) : (
                    <p className="text-3xl font-bold">{stats.markdownTotal.toLocaleString()}</p>
                  )}
                  <p className="text-sm text-muted-foreground">Markdown Articles</p>
                </div>
              </div>
            </div>

            {/* CMS published */}
            <div className={card}>
              <div className="flex items-center gap-4">
                <div className="rounded-lg bg-green-500/10 p-3">
                  <CheckCircle className="h-6 w-6 text-green-500" />
                </div>
                <div>
                  {statsLoading ? (
                    <div className="h-8 w-16 animate-pulse rounded bg-muted" />
                  ) : (
                    <p className="text-3xl font-bold">{stats.supabasePublished.toLocaleString()}</p>
                  )}
                  <p className="text-sm text-muted-foreground">CMS Published</p>
                </div>
              </div>
            </div>

            {/* CMS drafts */}
            <div className={card}>
              <div className="flex items-center gap-4">
                <div className="rounded-lg bg-orange-500/10 p-3">
                  <Eye className="h-6 w-6 text-orange-500" />
                </div>
                <div>
                  {statsLoading ? (
                    <div className="h-8 w-16 animate-pulse rounded bg-muted" />
                  ) : (
                    <p className="text-3xl font-bold">{stats.supabaseDraft.toLocaleString()}</p>
                  )}
                  <p className="text-sm text-muted-foreground">CMS Drafts</p>
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
              <div className="flex items-center gap-2">
                <h2 className="font-heading text-lg font-semibold">Recent Articles</h2>
                {!statsLoading && (
                  <span className="flex items-center gap-1 rounded-full border border-border bg-muted px-2 py-0.5 text-xs text-muted-foreground">
                    {stats.source === "supabase" ? (
                      <><Database className="h-3 w-3" /> Supabase</>
                    ) : (
                      <><FileText className="h-3 w-3" /> Local index</>
                    )}
                  </span>
                )}
              </div>
              <Link to="/blog" className="text-sm text-primary hover:underline">
                View all →
              </Link>
            </div>

            <div className={`${card} overflow-hidden p-0`}>
              {statsLoading ? (
                <div className="space-y-px">
                  {[...Array(5)].map((_, i) => (
                    <div key={i} className="flex items-center gap-4 px-5 py-4">
                      <div className="h-4 flex-1 animate-pulse rounded bg-muted" />
                      <div className="h-4 w-24 animate-pulse rounded bg-muted" />
                      <div className="h-4 w-16 animate-pulse rounded bg-muted" />
                    </div>
                  ))}
                </div>
              ) : stats.recent.length === 0 ? (
                <div className="flex flex-col items-center gap-3 px-5 py-10 text-center text-muted-foreground">
                  <Plus className="h-8 w-8 opacity-40" />
                  <div>
                    <p className="font-medium">No CMS articles yet</p>
                    <p className="text-sm">Use the CMS Creator to publish your first article.</p>
                  </div>
                  <Link to="/admin/cms">
                    <Button size="sm" className="mt-1">
                      <Sparkles className="mr-1.5 h-4 w-4" />
                      Open CMS Creator
                    </Button>
                  </Link>
                </div>
              ) : (
                <ul className="divide-y divide-border">
                  {stats.recent.map((a) => (
                    <li
                      key={a.id}
                      className="flex items-center justify-between gap-4 px-5 py-3.5 transition-colors hover:bg-accent/40"
                    >
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-medium">{a.title}</p>
                        <p className="text-xs text-muted-foreground">/blog/{a.slug}</p>
                      </div>
                      <div className="flex shrink-0 items-center gap-2">
                        <span className="hidden text-xs text-muted-foreground sm:block">
                          {fmtDate(a.published_at ?? a.created_at)}
                        </span>
                        {a.category && (
                          <span className="rounded-full bg-muted px-2 py-0.5 text-xs text-muted-foreground">
                            {a.category}
                          </span>
                        )}
                        <span
                          className={`rounded-full px-2 py-0.5 text-xs font-medium ${
                            a.status === "published"
                              ? "bg-green-500/10 text-green-600 dark:text-green-400"
                              : "bg-orange-500/10 text-orange-600 dark:text-orange-400"
                          }`}
                        >
                          {a.status}
                        </span>
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

          {/* Session / security note */}
          <div className="rounded-xl border border-border bg-muted/30 px-5 py-4 text-sm text-muted-foreground">
            <div className="flex flex-wrap items-center gap-x-6 gap-y-1">
              <span className="flex items-center gap-1.5">
                <Clock className="h-4 w-4" />
                Session expires in <strong className="text-foreground">8 hours</strong>
              </span>
              <span className="flex items-center gap-1.5">
                <ShieldCheck className="h-4 w-4" />
                Protected area — not indexed by search engines
              </span>
              <span className="flex items-center gap-1.5">
                <Database className="h-4 w-4" />
                {stats.source === "supabase"
                  ? "Live data from Supabase"
                  : "Supabase offline — local fallback active"}
              </span>
            </div>
          </div>
        </motion.div>
      </main>
    </div>
  );
}
