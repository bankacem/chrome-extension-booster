import { useState, useEffect, useCallback } from "react";
import { Link, useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import {
  FileText, LogOut, ShieldCheck, ExternalLink, Globe,
  BarChart3, Clock, Eye, Settings, Sparkles, RefreshCw,
  ChevronRight, CheckCircle, PenLine, AlertCircle, Database,
  BookOpen, Plus,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Helmet } from "react-helmet-async";
import { useAdminSession } from "@/hooks/useAdminSession";
import { supabase } from "@/integrations/supabase/client";

const WEBSITE_URL = "https://www.extensionto.com";

// ── Types ─────────────────────────────────────────────────────────────────────
interface ArticleRow {
  id: string;
  title: string;
  slug: string;
  category: string | null;
  status: string;
  created_at: string;
  published_at: string | null;
}

interface DashboardStats {
  publishedMarkdown: number;
  draftCount: number;
  supabasePublished: number;
  supabaseDraft: number;
  recentPublished: ArticleRow[];
  recentDrafts: ArticleRow[];
  supabaseError: string | null;
}

const EMPTY: DashboardStats = {
  publishedMarkdown: 0,
  draftCount: 0,
  supabasePublished: 0,
  supabaseDraft: 0,
  recentPublished: [],
  recentDrafts: [],
  supabaseError: null,
};

// ── Data fetching ─────────────────────────────────────────────────────────────
async function fetchStats(): Promise<DashboardStats> {
  // 1. Local published index (499 markdown articles)
  let publishedMarkdown = 0;
  let recentPublished: ArticleRow[] = [];
  try {
    const res = await fetch("/content/articles-index.json");
    if (res.ok) {
      const data: any[] = await res.json();
      publishedMarkdown = data.length;
      recentPublished = data
        .sort((a, b) => new Date(b.published_at ?? 0).getTime() - new Date(a.published_at ?? 0).getTime())
        .slice(0, 5)
        .map((a) => ({
          id: a.id ?? a.slug,
          title: a.title,
          slug: a.slug,
          category: a.category ?? null,
          status: "published",
          created_at: a.published_at ?? "",
          published_at: a.published_at ?? null,
        }));
    }
  } catch { /* non-blocking */ }

  // 2. Drafts index (52 imported articles)
  let draftCount = 0;
  let recentDrafts: ArticleRow[] = [];
  try {
    const res = await fetch("/content/drafts-index.json");
    if (res.ok) {
      const data: any[] = await res.json();
      draftCount = data.length;
      recentDrafts = data
        .sort((a, b) => new Date(b.created_at ?? 0).getTime() - new Date(a.created_at ?? 0).getTime())
        .slice(0, 10)
        .map((a) => ({
          id: a.id ?? a.slug,
          title: a.title,
          slug: a.slug,
          category: a.category ?? null,
          status: "draft",
          created_at: a.created_at ?? "",
          published_at: null,
        }));
    }
  } catch { /* non-blocking */ }

  // 3. Supabase CMS articles (optional — fails gracefully)
  let supabasePublished = 0;
  let supabaseDraft = 0;
  let supabaseError: string | null = null;
  try {
    const { data, error } = await supabase
      .from("articles")
      .select("status", { count: "exact" });
    if (!error && data) {
      supabasePublished = (data as any[]).filter((r) => r.status === "published").length;
      supabaseDraft     = (data as any[]).filter((r) => r.status === "draft").length;
    }
  } catch (e: any) {
    supabaseError = e?.message ?? "Supabase unavailable";
  }

  return { publishedMarkdown, draftCount, supabasePublished, supabaseDraft, recentPublished, recentDrafts, supabaseError };
}

// ── Helpers ───────────────────────────────────────────────────────────────────
function fmtDate(raw: string | null): string {
  if (!raw) return "—";
  try { return new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric", year: "numeric" }).format(new Date(raw)); }
  catch { return raw; }
}

const card = "rounded-xl border border-border bg-card p-6 shadow-sm";

// ── Component ─────────────────────────────────────────────────────────────────
export default function AdminDashboard() {
  const { session, logout } = useAdminSession();
  const navigate = useNavigate();
  const [stats, setStats]       = useState<DashboardStats>(EMPTY);
  const [loading, setLoading]   = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async (isRefresh = false) => {
    if (isRefresh) setRefreshing(true); else setLoading(true);
    const s = await fetchStats();
    setStats(s);
    if (isRefresh) setRefreshing(false); else setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  const handleLogout = () => { logout(); navigate("/admin/login", { replace: true }); };

  const grandTotal = stats.publishedMarkdown + stats.draftCount + stats.supabasePublished;

  const quickLinks = [
    { label: "CMS Creator",       description: "Write & publish new articles with auto SEO", icon: <Sparkles className="h-6 w-6 text-primary" />,        href: "/admin/cms",                primary: true  },
    { label: "Drafts Manager",    description: "Review, publish, or delete the 52 imported drafts", icon: <BookOpen className="h-6 w-6 text-amber-500" />,  href: "/admin/drafts",             primary: false },
    { label: "Full Admin Panel",  description: "Manage, edit, schedule, and bulk-import articles", icon: <Settings className="h-6 w-6 text-blue-500" />,    href: "/settings/manage",          primary: false },
    { label: "SEO Dashboard",     description: "Audit individual articles for SEO health",          icon: <BarChart3 className="h-6 w-6 text-purple-500" />, href: "/settings/seo-dashboard",   primary: false },
    { label: "AI Generator",      description: "Generate articles automatically with AI",           icon: <RefreshCw className="h-6 w-6 text-green-500" />,  href: "/settings/ai-generator",    primary: false },
    { label: "View Live Blog",    description: "See the public blog at extensionto.com",            icon: <Globe className="h-6 w-6 text-orange-500" />,     href: "/blog",                     primary: false },
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
            {session?.email && <span className="hidden text-sm text-muted-foreground md:block">{session.email}</span>}
            <Button variant="ghost" size="sm" asChild>
              <a href={WEBSITE_URL} target="_blank" rel="noopener noreferrer">
                <ExternalLink className="mr-1.5 h-4 w-4" />Site
              </a>
            </Button>
            <Button variant="outline" size="sm" onClick={handleLogout}>
              <LogOut className="mr-1.5 h-4 w-4" />Logout
            </Button>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-6xl px-4 py-10">
        <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3 }} className="space-y-8">

          {/* Welcome */}
          <div className="flex items-start justify-between gap-4">
            <div>
              <h1 className="font-heading text-3xl font-bold">Welcome back</h1>
              <p className="mt-1 text-muted-foreground">
                {loading ? "Loading article data…" : `${grandTotal.toLocaleString()} total articles · ${stats.draftCount} awaiting review`}
              </p>
            </div>
            <Button variant="outline" size="sm" onClick={() => load(true)} disabled={loading || refreshing} className="shrink-0">
              <RefreshCw className={`mr-1.5 h-4 w-4 ${refreshing ? "animate-spin" : ""}`} />Refresh
            </Button>
          </div>

          {/* Supabase error banner */}
          {stats.supabaseError && (
            <div className="flex items-start gap-3 rounded-xl border border-amber-500/30 bg-amber-500/10 px-4 py-3 text-sm text-amber-600 dark:text-amber-400">
              <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
              <span><strong>Supabase:</strong> {stats.supabaseError} — markdown + draft index data shown instead.</span>
            </div>
          )}

          {/* Draft alert banner */}
          {!loading && stats.draftCount > 0 && (
            <div className="flex items-center justify-between gap-4 rounded-xl border border-amber-500/40 bg-amber-500/10 px-5 py-4">
              <div className="flex items-center gap-3">
                <Eye className="h-5 w-5 shrink-0 text-amber-600 dark:text-amber-400" />
                <div>
                  <p className="font-semibold text-amber-700 dark:text-amber-300">
                    {stats.draftCount} draft articles awaiting review
                  </p>
                  <p className="text-sm text-amber-600/80 dark:text-amber-400/80">
                    These articles are NOT live. Publish them manually from the Drafts Manager.
                  </p>
                </div>
              </div>
              <Link to="/admin/drafts">
                <Button size="sm" variant="outline" className="shrink-0 border-amber-500/40 text-amber-700 dark:text-amber-300 hover:bg-amber-500/10">
                  Manage Drafts →
                </Button>
              </Link>
            </div>
          )}

          {/* Stat cards */}
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <div className={card}>
              <div className="flex items-center gap-4">
                <div className="rounded-lg bg-primary/10 p-3"><FileText className="h-6 w-6 text-primary" /></div>
                <div>
                  {loading ? <div className="h-8 w-16 animate-pulse rounded bg-muted" /> : <p className="text-3xl font-bold">{grandTotal.toLocaleString()}</p>}
                  <p className="text-sm text-muted-foreground">Total Articles</p>
                </div>
              </div>
            </div>
            <div className={card}>
              <div className="flex items-center gap-4">
                <div className="rounded-lg bg-green-500/10 p-3"><CheckCircle className="h-6 w-6 text-green-500" /></div>
                <div>
                  {loading ? <div className="h-8 w-16 animate-pulse rounded bg-muted" /> : <p className="text-3xl font-bold">{stats.publishedMarkdown.toLocaleString()}</p>}
                  <p className="text-sm text-muted-foreground">Live Published</p>
                </div>
              </div>
            </div>
            <div className={card}>
              <div className="flex items-center gap-4">
                <div className="rounded-lg bg-amber-500/10 p-3"><PenLine className="h-6 w-6 text-amber-500" /></div>
                <div>
                  {loading ? <div className="h-8 w-16 animate-pulse rounded bg-muted" /> : <p className="text-3xl font-bold">{stats.draftCount}</p>}
                  <p className="text-sm text-muted-foreground">Drafts (not live)</p>
                </div>
              </div>
            </div>
            <div className={card}>
              <div className="flex items-center gap-4">
                <div className="rounded-lg bg-blue-500/10 p-3"><Database className="h-6 w-6 text-blue-500" /></div>
                <div>
                  {loading ? <div className="h-8 w-16 animate-pulse rounded bg-muted" /> : <p className="text-3xl font-bold">{stats.supabasePublished + stats.supabaseDraft}</p>}
                  <p className="text-sm text-muted-foreground">CMS Articles</p>
                </div>
              </div>
            </div>
          </div>

          {/* Quick links */}
          <div>
            <h2 className="mb-4 font-heading text-lg font-semibold">Quick Actions</h2>
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {quickLinks.map((link) => (
                <Link key={link.href} to={link.href}
                  className={`group flex items-start gap-4 rounded-xl border p-5 transition-colors hover:bg-accent ${link.primary ? "border-primary/40 bg-primary/5" : "border-border bg-card"}`}>
                  <div className={`shrink-0 rounded-lg p-2 ${link.primary ? "bg-primary/10" : "bg-muted"}`}>{link.icon}</div>
                  <div className="min-w-0 flex-1">
                    <p className={`font-semibold ${link.primary ? "text-primary" : ""}`}>{link.label}</p>
                    <p className="mt-0.5 text-sm text-muted-foreground">{link.description}</p>
                  </div>
                  <ChevronRight className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground transition-transform group-hover:translate-x-0.5" />
                </Link>
              ))}
            </div>
          </div>

          {/* Recent drafts */}
          {(loading || stats.recentDrafts.length > 0) && (
            <div>
              <div className="mb-4 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <h2 className="font-heading text-lg font-semibold">Draft Articles</h2>
                  <span className="rounded-full bg-amber-500/15 px-2 py-0.5 text-xs font-medium text-amber-700 dark:text-amber-400">
                    {stats.draftCount} total
                  </span>
                </div>
                <Link to="/admin/drafts" className="text-sm text-primary hover:underline">View all & manage →</Link>
              </div>
              <div className={`${card} overflow-hidden p-0`}>
                {loading ? (
                  <div>{[...Array(5)].map((_, i) => (
                    <div key={i} className="flex items-center gap-4 px-5 py-4 border-b border-border last:border-0">
                      <div className="h-4 flex-1 animate-pulse rounded bg-muted" />
                      <div className="h-4 w-28 animate-pulse rounded bg-muted" />
                    </div>
                  ))}</div>
                ) : (
                  <ul className="divide-y divide-border">
                    {stats.recentDrafts.map((a) => (
                      <li key={a.id} className="flex items-center justify-between gap-4 px-5 py-3.5 transition-colors hover:bg-accent/40">
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-sm font-medium">{a.title}</p>
                          <p className="text-xs text-muted-foreground">/blog/{a.slug}</p>
                        </div>
                        <div className="flex shrink-0 items-center gap-2">
                          {a.category && <span className="hidden rounded-full bg-muted px-2 py-0.5 text-xs text-muted-foreground sm:block">{a.category}</span>}
                          <span className="rounded-full bg-amber-500/10 px-2 py-0.5 text-xs font-medium text-amber-600 dark:text-amber-400">draft</span>
                        </div>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            </div>
          )}

          {/* Recent published */}
          <div>
            <div className="mb-4 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <h2 className="font-heading text-lg font-semibold">Recent Published</h2>
                <span className="rounded-full bg-green-500/15 px-2 py-0.5 text-xs font-medium text-green-700 dark:text-green-400">live</span>
              </div>
              <Link to="/blog" className="text-sm text-primary hover:underline">View blog →</Link>
            </div>
            <div className={`${card} overflow-hidden p-0`}>
              {loading ? (
                <div>{[...Array(5)].map((_, i) => (
                  <div key={i} className="flex items-center gap-4 px-5 py-4 border-b border-border last:border-0">
                    <div className="h-4 flex-1 animate-pulse rounded bg-muted" />
                    <div className="h-4 w-24 animate-pulse rounded bg-muted" />
                  </div>
                ))}</div>
              ) : stats.recentPublished.length === 0 ? (
                <div className="flex flex-col items-center gap-3 px-5 py-10 text-center text-muted-foreground">
                  <Plus className="h-8 w-8 opacity-40" />
                  <p className="text-sm">No published articles found.</p>
                </div>
              ) : (
                <ul className="divide-y divide-border">
                  {stats.recentPublished.map((a) => (
                    <li key={a.id} className="flex items-center justify-between gap-4 px-5 py-3.5 transition-colors hover:bg-accent/40">
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-medium">{a.title}</p>
                        <p className="text-xs text-muted-foreground">/blog/{a.slug}</p>
                      </div>
                      <div className="flex shrink-0 items-center gap-2">
                        <span className="hidden text-xs text-muted-foreground sm:block">{fmtDate(a.published_at)}</span>
                        {a.category && <span className="hidden rounded-full bg-muted px-2 py-0.5 text-xs text-muted-foreground md:block">{a.category}</span>}
                        <span className="rounded-full bg-green-500/10 px-2 py-0.5 text-xs font-medium text-green-600 dark:text-green-400">live</span>
                        <a href={`/blog/${a.slug}`} target="_blank" rel="noopener noreferrer" className="text-muted-foreground hover:text-foreground">
                          <ExternalLink className="h-3.5 w-3.5" />
                        </a>
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>

          {/* Footer */}
          <div className="rounded-xl border border-border bg-muted/30 px-5 py-4 text-sm text-muted-foreground">
            <div className="flex flex-wrap items-center gap-x-6 gap-y-1">
              <span className="flex items-center gap-1.5"><Clock className="h-4 w-4" />Session expires in <strong className="text-foreground">8 hours</strong></span>
              <span className="flex items-center gap-1.5"><ShieldCheck className="h-4 w-4" />Protected — not indexed by search engines</span>
              <span className="flex items-center gap-1.5"><Database className="h-4 w-4" />Draft articles: {stats.draftCount} · Published: {stats.publishedMarkdown}</span>
            </div>
          </div>

        </motion.div>
      </main>
    </div>
  );
}
