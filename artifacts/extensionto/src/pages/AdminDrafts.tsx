import { useState, useEffect, useCallback } from "react";
import { Link, useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import {
  ArrowLeft, ShieldCheck, Search, RefreshCw, Globe,
  Eye, Trash2, Calendar, CheckCircle, Filter, Loader2,
  BookOpen, ExternalLink, AlertCircle,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Helmet } from "react-helmet-async";
import { useAdminSession } from "@/hooks/useAdminSession";
import { useToast } from "@/hooks/use-toast";

interface DraftArticle {
  id: string;
  title: string;
  slug: string;
  category: string | null;
  meta_description: string;
  created_at: string | null;
  read_time: number;
  filePath: string;
}

const CATEGORIES = [
  "All",
  "Chrome Extensions",
  "Ad Blocking",
  "Screenshot & Screen Capture",
  "Dark Mode & Themes",
  "Privacy & Security",
  "Performance & Memory",
  "Mobile & Android",
  "Productivity & Workflow",
  "Downloads & Media",
  "Developer Tools",
  "Social Media",
];

function fmtDate(raw: string | null): string {
  if (!raw) return "—";
  try { return new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric", year: "numeric" }).format(new Date(raw)); }
  catch { return raw; }
}

export default function AdminDrafts() {
  const { isAuthenticated } = useAdminSession();
  const navigate = useNavigate();
  const { toast } = useToast();

  const [drafts, setDrafts]         = useState<DraftArticle[]>([]);
  const [loading, setLoading]        = useState(true);
  const [search, setSearch]          = useState("");
  const [catFilter, setCatFilter]    = useState("All");
  const [publishing, setPublishing]  = useState<Set<string>>(new Set());
  const [deleting, setDeleting]      = useState<Set<string>>(new Set());
  const [selected, setSelected]      = useState<Set<string>>(new Set());

  useEffect(() => {
    if (!isAuthenticated) navigate("/admin/login", { replace: true });
  }, [isAuthenticated, navigate]);

  const loadDrafts = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/content/drafts-index.json?" + Date.now());
      if (!res.ok) throw new Error("drafts-index.json not found");
      const data: DraftArticle[] = await res.json();
      setDrafts(data.sort((a, b) => a.title.localeCompare(b.title)));
    } catch (e: any) {
      toast({ title: "Could not load drafts", description: e.message, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  }, [toast]);

  useEffect(() => { loadDrafts(); }, [loadDrafts]);

  // Filtered list
  const filtered = drafts.filter((d) => {
    const matchCat = catFilter === "All" || d.category === catFilter;
    const matchSearch = !search || d.title.toLowerCase().includes(search.toLowerCase()) || d.slug.includes(search.toLowerCase());
    return matchCat && matchSearch;
  });

  const toggleSelect = (id: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  };

  const selectAll = () => setSelected(new Set(filtered.map((d) => d.id)));
  const clearSelect = () => setSelected(new Set());

  // "Publish" a single draft: moves the markdown file from draft → published
  // by updating the status field in its frontmatter (server-side via API)
  // Since we're running client-only (no API server), we show a clear instruction.
  const handlePublish = async (draft: DraftArticle) => {
    setPublishing((p) => new Set(p).add(draft.id));
    // Simulate async action — in production this would call an API route
    // that flips status: draft → published and re-runs sync-articles.mjs
    await new Promise((r) => setTimeout(r, 800));
    setPublishing((p) => { const n = new Set(p); n.delete(draft.id); return n; });
    toast({
      title: "Ready to publish",
      description: `To publish "${draft.title}", open the file at ${draft.filePath} and change status: draft → status: published, then run: pnpm run sync-articles`,
    });
  };

  const handleDelete = async (draft: DraftArticle) => {
    if (!confirm(`Delete draft "${draft.title}"?\n\nThis will remove it from the drafts list. The markdown file will remain on disk.`)) return;
    setDeleting((p) => new Set(p).add(draft.id));
    await new Promise((r) => setTimeout(r, 400));
    setDrafts((prev) => prev.filter((d) => d.id !== draft.id));
    setDeleting((p) => { const n = new Set(p); n.delete(draft.id); return n; });
    toast({ title: "Removed from drafts list", description: draft.title });
  };

  const categories = CATEGORIES.filter((c) => c === "All" || drafts.some((d) => d.category === c));

  return (
    <div className="min-h-screen bg-background">
      <Helmet>
        <title>Drafts Manager | Admin — ExtensionTo</title>
        <meta name="robots" content="noindex, nofollow" />
      </Helmet>

      {/* Header */}
      <header className="sticky top-0 z-50 border-b border-border bg-background/95 backdrop-blur">
        <div className="mx-auto flex h-16 max-w-6xl items-center gap-4 px-4">
          <Link to="/admin/dashboard">
            <Button variant="ghost" size="sm">
              <ArrowLeft className="mr-1.5 h-4 w-4" />Dashboard
            </Button>
          </Link>
          <div className="h-5 w-px bg-border" />
          <div className="flex items-center gap-2">
            <BookOpen className="h-5 w-5 text-amber-500" />
            <div>
              <p className="font-heading text-sm font-bold leading-none">Drafts Manager</p>
              <p className="mt-0.5 text-xs text-muted-foreground">{drafts.length} draft articles — not live</p>
            </div>
          </div>
          <div className="ml-auto flex items-center gap-2">
            <Button variant="ghost" size="sm" onClick={loadDrafts} disabled={loading}>
              <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
            </Button>
            <Link to="/admin/cms">
              <Button size="sm">
                <ShieldCheck className="mr-1.5 h-4 w-4" />CMS Creator
              </Button>
            </Link>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-6xl px-4 py-8">
        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">

          {/* Info banner */}
          <div className="flex items-start gap-3 rounded-xl border border-amber-500/30 bg-amber-500/8 px-4 py-3 text-sm">
            <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-amber-600 dark:text-amber-400" />
            <div className="text-amber-700 dark:text-amber-300">
              <strong>These articles are NOT live.</strong> They are saved as markdown files with <code className="rounded bg-amber-500/20 px-1 text-xs">status: draft</code> and will not appear on the public blog until you publish them. No automatic publishing will occur.
            </div>
          </div>

          {/* Filters */}
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input placeholder="Search drafts…" value={search} onChange={(e) => setSearch(e.target.value)} className="pl-9" />
            </div>
            <div className="flex items-center gap-2 overflow-x-auto pb-1 sm:pb-0">
              <Filter className="h-4 w-4 shrink-0 text-muted-foreground" />
              {categories.map((c) => (
                <button
                  key={c}
                  onClick={() => setCatFilter(c)}
                  className={`shrink-0 rounded-full border px-3 py-1 text-xs transition-colors ${
                    catFilter === c
                      ? "border-primary bg-primary text-primary-foreground"
                      : "border-border bg-card text-muted-foreground hover:border-primary/40 hover:text-foreground"
                  }`}
                >
                  {c}
                </button>
              ))}
            </div>
          </div>

          {/* Bulk select */}
          {filtered.length > 0 && !loading && (
            <div className="flex items-center justify-between text-sm text-muted-foreground">
              <span>{filtered.length} articles{search || catFilter !== "All" ? " (filtered)" : ""}</span>
              <div className="flex gap-3">
                {selected.size > 0 ? (
                  <>
                    <span className="font-medium text-foreground">{selected.size} selected</span>
                    <button onClick={clearSelect} className="hover:text-foreground">Clear</button>
                  </>
                ) : (
                  <button onClick={selectAll} className="hover:text-foreground">Select all</button>
                )}
              </div>
            </div>
          )}

          {/* Draft list */}
          {loading ? (
            <div className="flex items-center justify-center py-20">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
          ) : filtered.length === 0 ? (
            <div className="rounded-xl border border-border bg-card py-16 text-center text-muted-foreground">
              <BookOpen className="mx-auto mb-3 h-10 w-10 opacity-30" />
              <p className="font-medium">No drafts match your filter.</p>
            </div>
          ) : (
            <AnimatePresence initial={false}>
              <ul className="divide-y divide-border rounded-xl border border-border bg-card overflow-hidden">
                {filtered.map((draft, i) => {
                  const isPublishing = publishing.has(draft.id);
                  const isDeleting   = deleting.has(draft.id);
                  const isSelected   = selected.has(draft.id);
                  return (
                    <motion.li
                      key={draft.id}
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      exit={{ opacity: 0, height: 0 }}
                      transition={{ duration: 0.15, delay: Math.min(i * 0.02, 0.3) }}
                      className={`flex items-center gap-4 px-5 py-4 transition-colors ${isSelected ? "bg-primary/5" : "hover:bg-accent/30"}`}
                    >
                      {/* Checkbox */}
                      <input
                        type="checkbox"
                        checked={isSelected}
                        onChange={() => toggleSelect(draft.id)}
                        className="h-4 w-4 shrink-0 rounded border-border accent-primary"
                      />

                      {/* Info */}
                      <div className="min-w-0 flex-1">
                        <p className="truncate font-medium text-sm leading-snug">{draft.title}</p>
                        <div className="mt-0.5 flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                          <span>/blog/{draft.slug}</span>
                          {draft.category && (
                            <span className="rounded-full bg-muted px-2 py-0.5">{draft.category}</span>
                          )}
                          <span>{draft.read_time}min read</span>
                          <span>{fmtDate(draft.created_at)}</span>
                        </div>
                      </div>

                      {/* Actions */}
                      <div className="flex shrink-0 items-center gap-2">
                        <a
                          href={`/blog/${draft.slug}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          title="Preview (may not exist yet)"
                          className="rounded-lg p-1.5 text-muted-foreground hover:bg-muted hover:text-foreground"
                        >
                          <Eye className="h-4 w-4" />
                        </a>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handlePublish(draft)}
                          disabled={isPublishing || isDeleting}
                          className="gap-1.5 border-green-500/40 text-green-700 hover:bg-green-500/10 dark:text-green-400"
                        >
                          {isPublishing ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Globe className="h-3.5 w-3.5" />}
                          {isPublishing ? "…" : "Publish"}
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => handleDelete(draft)}
                          disabled={isPublishing || isDeleting}
                          className="text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
                        >
                          {isDeleting ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Trash2 className="h-3.5 w-3.5" />}
                        </Button>
                      </div>
                    </motion.li>
                  );
                })}
              </ul>
            </AnimatePresence>
          )}

          {/* How to publish instructions */}
          <div className="rounded-xl border border-border bg-muted/30 p-5 text-sm space-y-2">
            <p className="font-semibold text-foreground flex items-center gap-2">
              <CheckCircle className="h-4 w-4 text-green-500" />How to publish a draft article
            </p>
            <ol className="list-decimal list-inside space-y-1 text-muted-foreground">
              <li>Click <strong className="text-foreground">Publish</strong> on any article above — it shows the exact file path.</li>
              <li>Open that file in the editor and change <code className="rounded bg-muted px-1">status: draft</code> → <code className="rounded bg-muted px-1">status: published</code></li>
              <li>Also set <code className="rounded bg-muted px-1">published_at:</code> to the current ISO date.</li>
              <li>Run <code className="rounded bg-muted px-1">pnpm run sync-articles</code> — the article appears on the public blog immediately.</li>
            </ol>
            <p className="text-muted-foreground pt-1">
              <strong className="text-foreground">Scheduling:</strong> Set <code className="rounded bg-muted px-1">scheduled_at:</code> to a future ISO date in the frontmatter. No article publishes automatically — scheduling is display-only until you run sync manually.
            </p>
          </div>

        </motion.div>
      </main>
    </div>
  );
}
