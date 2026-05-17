import { useState, useEffect, useCallback } from "react";
import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import {
  FileText, PenLine, Clock, CheckCircle, Calendar,
  TrendingUp, Globe, BarChart3, Sparkles,
  RefreshCw, ArrowRight, AlertCircle, BookOpen,
} from "lucide-react";
import { Helmet } from "react-helmet-async";
import { Button } from "@/components/ui/button";
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell,
} from "recharts";
import AdminLayout from "@/components/admin/AdminLayout";
import { adminApi, type AdminStats, type AdminArticle } from "@/lib/adminApi";

// ── Helpers ───────────────────────────────────────────────────────────────────
function fmtDate(raw: string | null | undefined): string {
  if (!raw) return "—";
  try { return new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric" }).format(new Date(raw)); }
  catch { return raw; }
}

const CAT_COLORS: Record<string, string> = {
  "Chrome Extensions":         "#6366f1",
  "Privacy & Security":        "#ec4899",
  "Ad Blocking":               "#f59e0b",
  "Screenshot & Screen Capture": "#10b981",
  "Performance & Memory":      "#3b82f6",
  "Mobile & Android":          "#8b5cf6",
  "Productivity & Workflow":   "#06b6d4",
  "Downloads & Media":         "#f43f5e",
  "Dark Mode & Themes":        "#64748b",
  "Developer Tools":           "#84cc16",
};

function StatCard({ label, value, icon, color, href, loading }: {
  label: string; value: number | string; icon: React.ReactNode;
  color: string; href?: string; loading: boolean;
}) {
  const inner = (
    <div className={`group relative overflow-hidden rounded-xl border border-border bg-card p-5 shadow-sm transition-colors ${href ? "hover:border-primary/40 hover:bg-accent/30 cursor-pointer" : ""}`}>
      <div className="flex items-start justify-between">
        <div className={`rounded-lg p-2.5 ${color}`}>{icon}</div>
        {href && <ArrowRight className="h-4 w-4 text-muted-foreground transition-transform group-hover:translate-x-0.5" />}
      </div>
      <div className="mt-3">
        {loading ? (
          <div className="h-8 w-14 animate-pulse rounded bg-muted" />
        ) : (
          <p className="text-3xl font-bold tabular-nums">{value}</p>
        )}
        <p className="mt-0.5 text-sm text-muted-foreground">{label}</p>
      </div>
    </div>
  );
  return href ? <Link to={href}>{inner}</Link> : inner;
}

function RecentRow({ a, type }: { a: AdminArticle; type: "published" | "draft" }) {
  return (
    <li className="flex items-center justify-between gap-4 px-4 py-3 transition-colors hover:bg-accent/30">
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-medium">{a.title}</p>
        <p className="text-xs text-muted-foreground">/blog/{a.slug}</p>
      </div>
      <div className="flex shrink-0 items-center gap-2">
        <span className="hidden text-xs text-muted-foreground sm:block">
          {type === "published" ? fmtDate(a.published_at) : "draft"}
        </span>
        {a.category && (
          <span className="hidden rounded-full bg-muted px-2 py-0.5 text-[11px] text-muted-foreground md:block">
            {a.category}
          </span>
        )}
        <span className={`rounded-full px-2 py-0.5 text-[11px] font-medium ${
          type === "published" ? "bg-green-500/10 text-green-600 dark:text-green-400" : "bg-amber-500/10 text-amber-600 dark:text-amber-400"
        }`}>
          {type}
        </span>
        {type === "published" && (
          <a href={`/blog/${a.slug}`} target="_blank" rel="noopener noreferrer" className="text-muted-foreground hover:text-foreground">
            <Globe className="h-3.5 w-3.5" />
          </a>
        )}
      </div>
    </li>
  );
}

export default function AdminDashboard() {
  const [stats, setStats]     = useState<AdminStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError]     = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async (isRefresh = false) => {
    if (isRefresh) setRefreshing(true); else setLoading(true);
    setError(null);
    try {
      const s = await adminApi.stats();
      setStats(s);
      // Silently auto-publish any scheduled articles that are due
      adminApi.checkScheduled().catch(() => {});
    } catch (e: unknown) {
      setError(String(e));
    } finally {
      if (isRefresh) setRefreshing(false); else setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const catChartData = stats
    ? Object.entries(stats.categories)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 8)
        .map(([name, count]) => ({ name: name.replace(" & ", " &\n"), count, color: CAT_COLORS[name] ?? "#6366f1" }))
    : [];

  return (
    <AdminLayout
      title="Dashboard"
      subtitle="Overview of your ExtensionTo blog"
      draftCount={stats?.drafts}
      actions={
        <Button variant="ghost" size="sm" onClick={() => load(true)} disabled={loading || refreshing}>
          <RefreshCw className={`h-4 w-4 ${refreshing ? "animate-spin" : ""}`} />
        </Button>
      }
    >
      <Helmet>
        <title>Dashboard | Admin — ExtensionTo</title>
        <meta name="robots" content="noindex, nofollow" />
      </Helmet>

      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">

        {/* Error */}
        {error && (
          <div className="flex items-center gap-3 rounded-lg border border-amber-500/30 bg-amber-500/10 px-4 py-3 text-sm text-amber-700 dark:text-amber-400">
            <AlertCircle className="h-4 w-4 shrink-0" />
            <span>{error} — run the dev server with <code className="rounded bg-amber-500/20 px-1">pnpm dev</code></span>
          </div>
        )}

        {/* Draft alert */}
        {!loading && stats && stats.drafts > 0 && (
          <div className="flex items-center justify-between gap-4 rounded-xl border border-amber-500/30 bg-amber-500/8 px-4 py-3">
            <div className="flex items-center gap-2.5 text-sm">
              <PenLine className="h-4 w-4 text-amber-500" />
              <span className="font-medium text-amber-700 dark:text-amber-300">
                {stats.drafts} draft{stats.drafts !== 1 ? "s" : ""} awaiting review
              </span>
              <span className="text-amber-600/70 dark:text-amber-400/70">— not visible on the public blog</span>
            </div>
            <Link to="/admin/drafts">
              <Button size="sm" variant="outline" className="shrink-0 border-amber-500/30 text-amber-700 dark:text-amber-300 hover:bg-amber-500/10">
                Review Drafts →
              </Button>
            </Link>
          </div>
        )}

        {/* Stat cards */}
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <StatCard label="Total Articles"  value={stats?.total ?? 0}     icon={<FileText className="h-5 w-5 text-primary" />}           color="bg-primary/10"       href="/admin/articles" loading={loading} />
          <StatCard label="Live Published"  value={stats?.published ?? 0} icon={<CheckCircle className="h-5 w-5 text-green-500" />}        color="bg-green-500/10"     href="/admin/articles" loading={loading} />
          <StatCard label="Drafts"          value={stats?.drafts ?? 0}    icon={<PenLine className="h-5 w-5 text-amber-500" />}            color="bg-amber-500/10"     href="/admin/drafts"   loading={loading} />
          <StatCard label="Scheduled"       value={stats?.scheduled ?? 0} icon={<Calendar className="h-5 w-5 text-blue-500" />}            color="bg-blue-500/10"      href="/admin/drafts"   loading={loading} />
        </div>

        {/* Two-column: chart + quick actions */}
        <div className="grid gap-4 lg:grid-cols-3">
          {/* Category distribution chart */}
          <div className="rounded-xl border border-border bg-card p-5 lg:col-span-2">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="font-semibold">Category Distribution</h2>
              <span className="rounded-full bg-muted px-2.5 py-0.5 text-xs text-muted-foreground">
                {Object.keys(stats?.categories ?? {}).length} categories
              </span>
            </div>
            {loading ? (
              <div className="flex h-48 items-center justify-center">
                <RefreshCw className="h-6 w-6 animate-spin text-muted-foreground" />
              </div>
            ) : (
              <ResponsiveContainer width="100%" height={200}>
                <BarChart data={catChartData} margin={{ top: 0, right: 0, left: -20, bottom: 0 }}>
                  <XAxis dataKey="name" tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }} interval={0} angle={-20} textAnchor="end" height={44} />
                  <YAxis tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }} />
                  <Tooltip
                    contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: 8, fontSize: 12 }}
                    labelStyle={{ color: "hsl(var(--foreground))" }}
                  />
                  <Bar dataKey="count" radius={[4, 4, 0, 0]}>
                    {catChartData.map((entry, i) => (
                      <Cell key={i} fill={entry.color} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>

          {/* Quick actions */}
          <div className="rounded-xl border border-border bg-card p-5">
            <h2 className="mb-4 font-semibold">Quick Actions</h2>
            <div className="space-y-2">
              {[
                { label: "CMS Creator",    desc: "Write & publish new article",  icon: <Sparkles className="h-4 w-4 text-primary" />,           href: "/admin/cms"      },
                { label: "Drafts Manager", desc: "Review the 52 imported drafts", icon: <BookOpen className="h-4 w-4 text-amber-500" />,          href: "/admin/drafts"   },
                { label: "All Articles",   desc: "Paginated article management",  icon: <FileText className="h-4 w-4 text-blue-500" />,            href: "/admin/articles" },
                { label: "SEO Dashboard",  desc: "Audit article SEO health",      icon: <BarChart3 className="h-4 w-4 text-purple-500" />,         href: "/admin/seo"      },
              ].map((item) => (
                <Link key={item.href} to={item.href}
                  className="group flex items-center gap-3 rounded-lg border border-border p-3 text-sm transition-colors hover:bg-accent/40">
                  <div className="shrink-0 rounded-md bg-muted p-1.5">{item.icon}</div>
                  <div className="min-w-0">
                    <p className="font-medium leading-none">{item.label}</p>
                    <p className="mt-0.5 truncate text-xs text-muted-foreground">{item.desc}</p>
                  </div>
                  <ArrowRight className="ml-auto h-3.5 w-3.5 shrink-0 text-muted-foreground transition-transform group-hover:translate-x-0.5" />
                </Link>
              ))}
            </div>
          </div>
        </div>

        {/* Recent rows — two columns */}
        <div className="grid gap-4 lg:grid-cols-2">
          {/* Recent drafts */}
          <div className="rounded-xl border border-border bg-card overflow-hidden">
            <div className="flex items-center justify-between border-b border-border px-4 py-3">
              <h2 className="text-sm font-semibold">Recent Drafts</h2>
              <Link to="/admin/drafts" className="text-xs text-primary hover:underline">View all</Link>
            </div>
            {loading ? (
              <div className="p-4 space-y-3">
                {[...Array(5)].map((_, i) => <div key={i} className="h-10 animate-pulse rounded bg-muted" />)}
              </div>
            ) : !stats?.recentDrafts?.length ? (
              <p className="px-4 py-8 text-center text-sm text-muted-foreground">No drafts found.</p>
            ) : (
              <ul className="divide-y divide-border">
                {stats.recentDrafts.slice(0, 8).map((a) => <RecentRow key={a.id} a={a} type="draft" />)}
              </ul>
            )}
          </div>

          {/* Recent published */}
          <div className="rounded-xl border border-border bg-card overflow-hidden">
            <div className="flex items-center justify-between border-b border-border px-4 py-3">
              <h2 className="text-sm font-semibold">Recently Published</h2>
              <Link to="/admin/articles" className="text-xs text-primary hover:underline">View all</Link>
            </div>
            {loading ? (
              <div className="p-4 space-y-3">
                {[...Array(5)].map((_, i) => <div key={i} className="h-10 animate-pulse rounded bg-muted" />)}
              </div>
            ) : !stats?.recentPublished?.length ? (
              <p className="px-4 py-8 text-center text-sm text-muted-foreground">No published articles found.</p>
            ) : (
              <ul className="divide-y divide-border">
                {stats.recentPublished.slice(0, 8).map((a) => <RecentRow key={a.id} a={a} type="published" />)}
              </ul>
            )}
          </div>
        </div>

      </motion.div>
    </AdminLayout>
  );
}
