import { useState, useEffect, useCallback, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Search, Filter, Globe, EyeOff, Loader2, ChevronLeft,
  ChevronRight as ChevronRightIcon, CheckSquare, Square,
  RefreshCw, Trash2, AlertCircle, ExternalLink,
} from "lucide-react";
import { Helmet } from "react-helmet-async";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import AdminLayout from "@/components/admin/AdminLayout";
import {
  getAllArticles, filterArticles, paginateArticles,
  invalidateCache, type Article, type PageResult,
} from "@/lib/content-store";
import { adminApi } from "@/lib/adminApi";

const LIMIT = 20;

const CATEGORIES = [
  "All", "Chrome Extensions", "Ad Blocking", "Screenshot & Screen Capture",
  "Dark Mode & Themes", "Privacy & Security", "Performance & Memory",
  "Mobile & Android", "Productivity & Workflow", "Downloads & Media",
  "Developer Tools", "Social Media",
];

function fmtDate(raw?: string | null): string {
  if (!raw) return "—";
  try { return new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric", year: "numeric" }).format(new Date(raw)); }
  catch { return raw; }
}

export default function AdminArticles() {
  const { toast } = useToast();

  // All articles loaded from static JSON — never from API middleware
  const [allArticles, setAllArticles] = useState<Article[]>([]);

  // Derived / filtered view
  const [result, setResult]   = useState<PageResult<Article> | null>(null);
  const [page, setPage]       = useState(1);
  const [search, setSearch]   = useState("");
  const [cat, setCat]         = useState("All");
  const [loading, setLoading] = useState(true);
  const [error, setError]     = useState<string | null>(null);

  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [acting, setActing]     = useState<Set<string>>(new Set());
  const [bulkLoading, setBulk]  = useState(false);
  const searchRef               = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Load all articles from static JSON (no API middleware involved)
  const loadArticles = useCallback(async (fresh = false) => {
    setLoading(true);
    setError(null);
    try {
      if (fresh) invalidateCache();
      const articles = await getAllArticles(fresh);
      setAllArticles(articles);
    } catch (e: unknown) {
      setError(String(e));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { loadArticles(); }, [loadArticles]);

  // Recompute filtered + paginated view whenever articles, filters, or page change
  useEffect(() => {
    const filtered = filterArticles(allArticles, { q: search, category: cat });
    setResult(paginateArticles(filtered, page, LIMIT));
  }, [allArticles, search, cat, page]);

  // Debounce search
  useEffect(() => {
    if (searchRef.current) clearTimeout(searchRef.current);
    searchRef.current = setTimeout(() => setPage(1), 300);
    return () => { if (searchRef.current) clearTimeout(searchRef.current); };
  }, [search]);

  // Reset page on category change
  useEffect(() => { setPage(1); setSelected(new Set()); }, [cat]);

  const articles = result?.data ?? [];
  const total    = result?.total ?? 0;
  const pages    = result?.pages ?? 1;

  const toggleSelect = (id: string) => setSelected((prev) => {
    const next = new Set(prev); if (next.has(id)) next.delete(id); else next.add(id); return next;
  });
  const allSelected = articles.length > 0 && articles.every((a) => selected.has(a.id));
  const toggleAll = () => setSelected(allSelected ? new Set() : new Set(articles.map((a) => a.id)));

  const doAction = async (slug: string, action: "unpublish" | "delete") => {
    setActing((p) => new Set(p).add(slug));
    try {
      if (action === "unpublish") {
        await adminApi.unpublish(slug);
        toast({ title: "Moved to drafts", description: slug });
      } else {
        await adminApi.delete(slug);
        toast({ title: "Deleted", description: slug });
      }
      setSelected((prev) => { const n = new Set(prev); n.delete(slug); return n; });
      invalidateCache();
      await loadArticles(true);
    } catch (e: unknown) {
      toast({ title: "Action failed", description: String(e), variant: "destructive" });
    } finally {
      setActing((p) => { const n = new Set(p); n.delete(slug); return n; });
    }
  };

  const doBulk = async (action: "draft" | "delete") => {
    const slugs = articles.filter((a) => selected.has(a.id)).map((a) => a.slug);
    if (!slugs.length) return;
    if (!confirm(`${action === "delete" ? "Delete" : "Move to draft"} ${slugs.length} articles?`)) return;
    setBulk(true);
    try {
      await adminApi.bulk(action, slugs);
      toast({ title: `Bulk ${action} complete`, description: `${slugs.length} articles updated` });
      setSelected(new Set());
      invalidateCache();
      await loadArticles(true);
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

  return (
    <AdminLayout title="All Articles" subtitle={`${total.toLocaleString()} published articles`}>
      <Helmet>
        <title>Articles | Admin — ExtensionTo</title>
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

        {/* Filters */}
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input placeholder="Search articles…" value={search} onChange={(e) => setSearch(e.target.value)} className="pl-9" />
          </div>
          <Button variant="ghost" size="sm" onClick={() => loadArticles(true)} disabled={loading}>
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

        {/* Bulk actions bar */}
        {selected.size > 0 && (
          <motion.div initial={{ opacity: 0, y: -6 }} animate={{ opacity: 1, y: 0 }}
            className="flex items-center gap-3 rounded-lg border border-border bg-card px-4 py-2.5 text-sm">
            <span className="font-medium">{selected.size} selected</span>
            <div className="ml-auto flex items-center gap-2">
              <Button size="sm" variant="outline" onClick={() => doBulk("draft")} disabled={bulkLoading} className="gap-1.5">
                {bulkLoading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <EyeOff className="h-3.5 w-3.5" />}
                Move to Draft
              </Button>
              <Button size="sm" variant="destructive" onClick={() => doBulk("delete")} disabled={bulkLoading} className="gap-1.5">
                {bulkLoading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Trash2 className="h-3.5 w-3.5" />}
                Delete
              </Button>
              <Button size="sm" variant="ghost" onClick={() => setSelected(new Set())}>Clear</Button>
            </div>
          </motion.div>
        )}

        {/* Table */}
        <div className="rounded-xl border border-border bg-card overflow-hidden">
          <div className="flex items-center gap-4 border-b border-border bg-muted/30 px-4 py-2.5 text-xs font-medium text-muted-foreground">
            <button onClick={toggleAll} className="shrink-0">
              {allSelected ? <CheckSquare className="h-4 w-4 text-primary" /> : <Square className="h-4 w-4" />}
            </button>
            <span className="flex-1">Title</span>
            <span className="hidden w-28 sm:block">Category</span>
            <span className="hidden w-24 md:block">Published</span>
            <span className="w-20 text-right">Actions</span>
          </div>

          {loading ? (
            <div className="space-y-px p-1">
              {[...Array(10)].map((_, i) => (
                <div key={i} className="flex items-center gap-4 rounded px-4 py-3.5">
                  <div className="h-4 w-4 animate-pulse rounded bg-muted" />
                  <div className="h-4 flex-1 animate-pulse rounded bg-muted" />
                  <div className="hidden h-4 w-28 animate-pulse rounded bg-muted sm:block" />
                  <div className="hidden h-4 w-24 animate-pulse rounded bg-muted md:block" />
                  <div className="h-4 w-20 animate-pulse rounded bg-muted" />
                </div>
              ))}
            </div>
          ) : articles.length === 0 ? (
            <div className="flex flex-col items-center gap-2 py-16 text-center text-muted-foreground">
              <AlertCircle className="h-8 w-8 opacity-30" />
              <p className="text-sm">No articles match your filters.</p>
              {search || cat !== "All" ? (
                <button onClick={() => { setSearch(""); setCat("All"); }}
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
                      exit={{ opacity: 0 }}
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
                      <span className="hidden w-24 text-xs text-muted-foreground md:block">{fmtDate(a.published_at)}</span>
                      <div className="flex w-20 shrink-0 items-center justify-end gap-1">
                        <a href={`/blog/${a.slug}`} target="_blank" rel="noopener noreferrer"
                          className="rounded p-1 text-muted-foreground hover:bg-muted hover:text-foreground" title="View live">
                          <ExternalLink className="h-3.5 w-3.5" />
                        </a>
                        <button onClick={() => doAction(a.slug, "unpublish")} disabled={isActing}
                          className="rounded p-1 text-muted-foreground hover:bg-muted hover:text-amber-500" title="Move to draft">
                          {isActing ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <EyeOff className="h-3.5 w-3.5" />}
                        </button>
                        <button onClick={() => doAction(a.slug, "delete")} disabled={isActing}
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
              {((page - 1) * LIMIT) + 1}–{Math.min(page * LIMIT, total)} of {total.toLocaleString()} articles
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
  );
}
