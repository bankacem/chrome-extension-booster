import { useState, useEffect, useCallback, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Search, Filter, Globe, Trash2, Calendar, Loader2,
  ChevronLeft, ChevronRight as ChevronRightIcon,
  CheckSquare, Square, RefreshCw, AlertCircle, Eye,
  Clock, PenLine,
} from "lucide-react";
import { Helmet } from "react-helmet-async";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import AdminLayout from "@/components/admin/AdminLayout";
import {
  getAllDrafts, filterArticles, paginateArticles,
  invalidateCache, type Article, type PageResult,
} from "@/lib/content-store";
import { adminApi } from "@/lib/adminApi";

const LIMIT = 20;

const CATEGORIES = [
  "All", "Chrome Extensions", "Ad Blocking", "Screenshot & Screen Capture",
  "Dark Mode & Themes", "Privacy & Security", "Performance & Memory",
  "Mobile & Android", "Productivity & Workflow", "Downloads & Media",
];

const STATUSES = [
  { value: "all", label: "All" },
  { value: "draft", label: "Draft" },
  { value: "scheduled", label: "Scheduled" },
];

function fmtDate(raw?: string | null): string {
  if (!raw) return "—";
  try { return new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric", year: "numeric" }).format(new Date(raw)); }
  catch { return raw; }
}

function ScheduleDialog({ slug, onDone, onCancel }: { slug: string; onDone: () => void; onCancel: () => void }) {
  const { toast } = useToast();
  const [date, setDate] = useState(() => {
    const d = new Date(); d.setDate(d.getDate() + 1); return d.toISOString().slice(0, 16);
  });
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      await adminApi.schedule(slug, new Date(date).toISOString());
      toast({ title: "Article scheduled", description: `Will publish on ${fmtDate(new Date(date).toISOString())}` });
      onDone();
    } catch (err: unknown) {
      toast({ title: "Schedule failed", description: String(err), variant: "destructive" });
    } finally { setLoading(false); }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4" onClick={onCancel}>
      <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }}
        className="w-full max-w-sm rounded-xl border border-border bg-card p-6 shadow-xl"
        onClick={(e) => e.stopPropagation()}>
        <h3 className="mb-1 font-semibold">Schedule Article</h3>
        <p className="mb-4 text-xs text-muted-foreground">
          Article will auto-publish when the time arrives (next admin visit checks it).
        </p>
        <form onSubmit={handleSubmit} className="space-y-4">
          <input type="datetime-local" value={date} onChange={(e) => setDate(e.target.value)}
            className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-primary" />
          <div className="flex gap-2">
            <Button type="submit" className="flex-1" disabled={loading}>
              {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Calendar className="mr-2 h-4 w-4" />}
              Schedule
            </Button>
            <Button type="button" variant="outline" onClick={onCancel}>Cancel</Button>
          </div>
        </form>
      </motion.div>
    </div>
  );
}

export default function AdminDrafts() {
  const { toast } = useToast();

  // All drafts loaded from static file — never from API middleware
  const [allDrafts, setAllDrafts] = useState<Article[]>([]);

  // Derived / filtered view
  const [result, setResult]   = useState<PageResult<Article> | null>(null);
  const [page, setPage]       = useState(1);
  const [search, setSearch]   = useState("");
  const [cat, setCat]         = useState("All");
  const [status, setStatus]   = useState("all");
  const [loading, setLoading] = useState(true);
  const [error, setError]     = useState<string | null>(null);

  const [selected, setSelected]     = useState<Set<string>>(new Set());
  const [acting, setActing]         = useState<Set<string>>(new Set());
  const [bulkLoading, setBulk]      = useState(false);
  const [scheduling, setScheduling] = useState<string | null>(null);

  const searchRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Load all drafts from static JSON (no API middleware involved)
  const loadDrafts = useCallback(async (fresh = false) => {
    setLoading(true);
    setError(null);
    try {
      if (fresh) invalidateCache();
      const drafts = await getAllDrafts(fresh);
      setAllDrafts(drafts);
    } catch (e: unknown) {
      setError(String(e));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { loadDrafts(); }, [loadDrafts]);

  // Auto-publish any scheduled articles that are due (write operation via API)
  useEffect(() => {
    adminApi.checkScheduled().then((res) => {
      if (res.published.length > 0) {
        toast({ title: `${res.published.length} scheduled article${res.published.length > 1 ? "s" : ""} auto-published` });
        loadDrafts(true);
      }
    }).catch(() => {});
  }, []);

  // Recompute filtered + paginated view whenever drafts, filters, or page change
  useEffect(() => {
    const filtered = filterArticles(allDrafts, { q: search, category: cat, status });
    setResult(paginateArticles(filtered, page, LIMIT));
  }, [allDrafts, search, cat, status, page]);

  // Debounce search
  useEffect(() => {
    if (searchRef.current) clearTimeout(searchRef.current);
    searchRef.current = setTimeout(() => setPage(1), 300);
    return () => { if (searchRef.current) clearTimeout(searchRef.current); };
  }, [search]);

  // Reset page on filter changes
  useEffect(() => { setPage(1); setSelected(new Set()); }, [cat, status]);

  const articles = result?.data ?? [];
  const total    = result?.total ?? 0;
  const pages    = result?.pages ?? 1;

  const toggleSelect = (id: string) => setSelected((prev) => {
    const next = new Set(prev); if (next.has(id)) next.delete(id); else next.add(id); return next;
  });
  const allSelected = articles.length > 0 && articles.every((a) => selected.has(a.id));
  const toggleAll = () => setSelected(allSelected ? new Set() : new Set(articles.map((a) => a.id)));

  const doPublish = async (slug: string) => {
    setActing((p) => new Set(p).add(slug));
    try {
      await adminApi.publish(slug);
      toast({ title: "Published!", description: slug });
      invalidateCache();
      await loadDrafts(true);
      setSelected((prev) => { const n = new Set(prev); n.delete(slug); return n; });
    } catch (e: unknown) {
      toast({ title: "Publish failed", description: String(e), variant: "destructive" });
    } finally { setActing((p) => { const n = new Set(p); n.delete(slug); return n; }); }
  };

  const doDelete = async (slug: string) => {
    if (!confirm(`Remove "${slug}" from drafts?`)) return;
    setActing((p) => new Set(p).add(slug));
    try {
      await adminApi.delete(slug);
      toast({ title: "Removed from drafts", description: slug });
      invalidateCache();
      await loadDrafts(true);
    } catch (e: unknown) {
      toast({ title: "Delete failed", description: String(e), variant: "destructive" });
    } finally { setActing((p) => { const n = new Set(p); n.delete(slug); return n; }); }
  };

  const doBulk = async (action: "publish" | "delete") => {
    const slugs = articles.filter((a) => selected.has(a.id)).map((a) => a.slug);
    if (!slugs.length) return;
    if (!confirm(`${action === "delete" ? "Delete" : "Publish"} ${slugs.length} articles?`)) return;
    setBulk(true);
    try {
      await adminApi.bulk(action, slugs);
      toast({ title: `Bulk ${action} complete`, description: `${slugs.length} articles updated` });
      setSelected(new Set());
      invalidateCache();
      await loadDrafts(true);
    } catch (e: unknown) {
      toast({ title: "Bulk action failed", description: String(e), variant: "destructive" });
    } finally { setBulk(false); }
  };

  const pagination = (() => {
    const arr: (number | "…")[] = [];
    if (pages <= 7) { for (let i = 1; i <= pages; i++) arr.push(i); }
    else {
      arr.push(1);
      if (page > 3) arr.push("…");
      for (let i = Math.max(2, page - 1); i <= Math.min(pages - 1, page + 1); i++) arr.push(i);
      if (page < pages - 2) arr.push("…");
      arr.push(pages);
    }
    return arr;
  })();

  const statusBadge = (s: string) => {
    if (s === "scheduled") return <span className="rounded-full bg-blue-500/10 px-2 py-0.5 text-[11px] font-medium text-blue-600 dark:text-blue-400">scheduled</span>;
    return <span className="rounded-full bg-amber-500/10 px-2 py-0.5 text-[11px] font-medium text-amber-600 dark:text-amber-400">draft</span>;
  };

  // Total draft count (unfiltered) for the layout badge
  const draftCount = allDrafts.filter((d) => d.status === "draft").length;

  return (
    <>
      {scheduling && (
        <ScheduleDialog
          slug={scheduling}
          onDone={() => { setScheduling(null); invalidateCache(); loadDrafts(true); }}
          onCancel={() => setScheduling(null)}
        />
      )}

      <AdminLayout title="Drafts Manager" subtitle={`${total} article${total !== 1 ? "s" : ""} awaiting review`} draftCount={draftCount}>
        <Helmet>
          <title>Drafts | Admin — ExtensionTo</title>
          <meta name="robots" content="noindex, nofollow" />
        </Helmet>

        <div className="space-y-4">
          {/* Error */}
          {error && (
            <div className="flex items-center gap-3 rounded-lg border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive">
              <AlertCircle className="h-4 w-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {/* Info banner */}
          <div className="flex items-start gap-3 rounded-lg border border-amber-500/30 bg-amber-500/8 px-4 py-3 text-sm">
            <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-amber-500" />
            <span className="text-amber-700 dark:text-amber-300">
              <strong>Not live.</strong> Drafts are saved as markdown with <code className="rounded bg-amber-500/20 px-1 text-xs">status: draft</code> and hidden from the public blog. Click <strong>Publish</strong> to make any article live instantly.
            </span>
          </div>

          {/* Filters */}
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input placeholder="Search drafts…" value={search} onChange={(e) => setSearch(e.target.value)} className="pl-9" />
            </div>
            <div className="flex gap-1 rounded-lg border border-border bg-card p-1">
              {STATUSES.map((s) => (
                <button key={s.value} onClick={() => setStatus(s.value)}
                  className={`rounded-md px-3 py-1 text-xs font-medium transition-colors ${
                    status === s.value ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground"
                  }`}>
                  {s.label}
                </button>
              ))}
            </div>
            <Button variant="ghost" size="sm" onClick={() => loadDrafts(true)} disabled={loading}>
              <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
            </Button>
          </div>

          {/* Category chips */}
          <div className="flex items-center gap-2 overflow-x-auto pb-1">
            <Filter className="h-4 w-4 shrink-0 text-muted-foreground" />
            {CATEGORIES.map((c) => (
              <button key={c} onClick={() => setCat(c)}
                className={`shrink-0 rounded-full border px-3 py-1 text-xs transition-colors ${
                  cat === c ? "border-primary bg-primary text-primary-foreground" : "border-border bg-card text-muted-foreground hover:border-primary/40 hover:text-foreground"
                }`}>
                {c}
              </button>
            ))}
          </div>

          {/* Bulk actions */}
          {selected.size > 0 && (
            <motion.div initial={{ opacity: 0, y: -6 }} animate={{ opacity: 1, y: 0 }}
              className="flex items-center gap-3 rounded-lg border border-border bg-card px-4 py-2.5 text-sm">
              <span className="font-medium">{selected.size} selected</span>
              <div className="ml-auto flex gap-2">
                <Button size="sm" onClick={() => doBulk("publish")} disabled={bulkLoading}
                  className="gap-1.5 border-green-500/40 text-green-700 hover:bg-green-500/10 dark:text-green-400" variant="outline">
                  {bulkLoading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Globe className="h-3.5 w-3.5" />}
                  Publish All
                </Button>
                <Button size="sm" variant="destructive" onClick={() => doBulk("delete")} disabled={bulkLoading} className="gap-1.5">
                  {bulkLoading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Trash2 className="h-3.5 w-3.5" />}
                  Delete All
                </Button>
                <Button size="sm" variant="ghost" onClick={() => setSelected(new Set())}>Clear</Button>
              </div>
            </motion.div>
          )}

          {/* Article list */}
          <div className="rounded-xl border border-border bg-card overflow-hidden">
            <div className="flex items-center gap-4 border-b border-border bg-muted/30 px-4 py-2.5 text-xs font-medium text-muted-foreground">
              <button onClick={toggleAll} className="shrink-0">
                {allSelected ? <CheckSquare className="h-4 w-4 text-primary" /> : <Square className="h-4 w-4" />}
              </button>
              <span className="flex-1">Title</span>
              <span className="hidden w-28 sm:block">Category</span>
              <span className="hidden w-20 md:block">Status</span>
              <span className="hidden w-24 lg:block">Created</span>
              <span className="w-28 text-right">Actions</span>
            </div>

            {loading ? (
              <div className="space-y-px p-1">
                {[...Array(10)].map((_, i) => (
                  <div key={i} className="flex items-center gap-4 px-4 py-3.5">
                    <div className="h-4 w-4 animate-pulse rounded bg-muted" />
                    <div className="h-4 flex-1 animate-pulse rounded bg-muted" />
                    <div className="hidden h-4 w-28 animate-pulse rounded bg-muted sm:block" />
                    <div className="h-4 w-28 animate-pulse rounded bg-muted" />
                  </div>
                ))}
              </div>
            ) : articles.length === 0 ? (
              <div className="flex flex-col items-center gap-2 py-16 text-center text-muted-foreground">
                <PenLine className="h-8 w-8 opacity-30" />
                <p className="text-sm">No drafts match your filters.</p>
                {search || cat !== "All" || status !== "all" ? (
                  <button onClick={() => { setSearch(""); setCat("All"); setStatus("all"); }}
                    className="mt-1 text-xs text-primary hover:underline">Clear filters</button>
                ) : null}
              </div>
            ) : (
              <AnimatePresence initial={false}>
                <ul className="divide-y divide-border">
                  {articles.map((a, i) => {
                    const isSelected = selected.has(a.id);
                    const isActing   = acting.has(a.slug);
                    return (
                      <motion.li key={a.id}
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0, height: 0 }}
                        transition={{ delay: Math.min(i * 0.015, 0.2) }}
                        className={`flex items-center gap-4 px-4 py-3 transition-colors ${isSelected ? "bg-primary/5" : "hover:bg-accent/30"}`}
                      >
                        <button onClick={() => toggleSelect(a.id)} className="shrink-0">
                          {isSelected ? <CheckSquare className="h-4 w-4 text-primary" /> : <Square className="h-4 w-4 text-muted-foreground" />}
                        </button>
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-sm font-medium">{a.title}</p>
                          <p className="text-xs text-muted-foreground">/blog/{a.slug}</p>
                        </div>
                        <span className="hidden w-28 truncate text-xs text-muted-foreground sm:block">{a.category ?? "—"}</span>
                        <span className="hidden w-20 md:block">{statusBadge(a.status)}</span>
                        <span className="hidden w-24 text-xs text-muted-foreground lg:block">{fmtDate(a.created_at)}</span>
                        <div className="flex w-28 shrink-0 items-center justify-end gap-1">
                          <a href={`/blog/${a.slug}`} target="_blank" rel="noopener noreferrer"
                            className="rounded p-1 text-muted-foreground hover:bg-muted hover:text-foreground" title="Preview">
                            <Eye className="h-3.5 w-3.5" />
                          </a>
                          <button onClick={() => setScheduling(a.slug)} disabled={isActing}
                            className="rounded p-1 text-muted-foreground hover:bg-muted hover:text-blue-500" title="Schedule">
                            <Clock className="h-3.5 w-3.5" />
                          </button>
                          <button onClick={() => doPublish(a.slug)} disabled={isActing}
                            className="rounded p-1 text-muted-foreground hover:bg-muted hover:text-green-500" title="Publish now">
                            {isActing ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Globe className="h-3.5 w-3.5" />}
                          </button>
                          <button onClick={() => doDelete(a.slug)} disabled={isActing}
                            className="rounded p-1 text-muted-foreground hover:bg-muted hover:text-destructive" title="Delete">
                            {isActing ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Trash2 className="h-3.5 w-3.5" />}
                          </button>
                        </div>
                      </motion.li>
                    );
                  })}
                </ul>
              </AnimatePresence>
            )}
          </div>

          {/* Pagination */}
          {pages > 1 && (
            <div className="flex items-center justify-between gap-4">
              <p className="text-sm text-muted-foreground">
                {((page - 1) * LIMIT) + 1}–{Math.min(page * LIMIT, total)} of {total} drafts
              </p>
              <div className="flex items-center gap-1">
                <Button variant="ghost" size="sm" onClick={() => setPage(page - 1)} disabled={page <= 1 || loading}>
                  <ChevronLeft className="h-4 w-4" />
                </Button>
                {pagination.map((p, i) =>
                  p === "…" ? (
                    <span key={`ell-${i}`} className="px-2 text-muted-foreground">…</span>
                  ) : (
                    <Button key={p} variant={page === p ? "default" : "ghost"} size="sm"
                      onClick={() => setPage(p as number)} disabled={loading}
                      className="h-8 w-8 p-0">
                      {p}
                    </Button>
                  )
                )}
                <Button variant="ghost" size="sm" onClick={() => setPage(page + 1)} disabled={page >= pages || loading}>
                  <ChevronRightIcon className="h-4 w-4" />
                </Button>
              </div>
            </div>
          )}
        </div>
      </AdminLayout>
    </>
  );
}
