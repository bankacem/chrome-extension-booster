/**
 * AdminImageGen — production image generation engine
 * Generates unique SEO-optimised featured images for every article
 * using the visual entropy engine (deterministic SHA-256 seed).
 */

import { useState, useEffect, useCallback, useRef } from "react";
import { useNavigate } from "react-router-dom";
import {
  Wand2, ImageIcon, RefreshCw, ChevronUp,
  CheckCircle, XCircle, Copy, Loader2, Filter,
  Layers, Zap, ShieldCheck, Eye,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Progress } from "@/components/ui/progress";
import { useToast } from "@/hooks/use-toast";
import AdminLayout from "@/components/admin/AdminLayout";
import { getAllArticles, getAllDrafts, type Article } from "@/lib/content-store";
import { supabase } from "@/integrations/supabase/client";
import {
  generateImageSpec,
  type ImageSpec,
  type EntropyParams,
} from "@/lib/imageEntropyEngine";

// ── Types ─────────────────────────────────────────────────────────────────────

type FilterMode = "all" | "missing" | "has_image";

interface ArticleRow extends Article {
  spec?: ImageSpec;
  generating?: boolean;
  generated?: boolean;
  error?: string;
  imageUrl?: string;
}

// ── Helpers ───────────────────────────────────────────────────────────────────

const LAYOUT_LABEL: Record<string, string> = {
  saas_dashboard:     "SaaS Dashboard",
  cinematic_hero:     "Cinematic Hero",
  minimal_typography: "Minimal Type",
  isometric_3d:       "Isometric 3D",
  split_screen:       "Split Screen",
  floating_cards:     "Floating Cards",
  neon_cyber:         "Neon Cyber",
  editorial_magazine: "Editorial",
};

const LAYOUT_COLOR: Record<string, string> = {
  saas_dashboard:     "bg-blue-500/10 text-blue-400 border-blue-500/20",
  cinematic_hero:     "bg-orange-500/10 text-orange-400 border-orange-500/20",
  minimal_typography: "bg-slate-500/10 text-slate-300 border-slate-500/20",
  isometric_3d:       "bg-emerald-500/10 text-emerald-400 border-emerald-500/20",
  split_screen:       "bg-violet-500/10 text-violet-400 border-violet-500/20",
  floating_cards:     "bg-cyan-500/10 text-cyan-400 border-cyan-500/20",
  neon_cyber:         "bg-pink-500/10 text-pink-400 border-pink-500/20",
  editorial_magazine: "bg-amber-500/10 text-amber-400 border-amber-500/20",
};

// ── Main Component ────────────────────────────────────────────────────────────

export default function AdminImageGen() {
  const { toast } = useToast();

  const [rows, setRows]               = useState<ArticleRow[]>([]);
  const [loading, setLoading]         = useState(true);
  const [previewLoading, setPreviewLoading] = useState(false);
  const [search, setSearch]           = useState("");
  const [filter, setFilter]           = useState<FilterMode>("all");
  const [catFilter, setCatFilter]     = useState("");
  const [batchRunning, setBatchRunning]     = useState(false);
  const [batchProgress, setBatchProgress]   = useState(0);
  const [batchCurrent, setBatchCurrent]     = useState("");
  const [inspectedSlug, setInspectedSlug]   = useState<string | null>(null);

  const batchAbortRef  = useRef(false);
  const prevParamsRef  = useRef<EntropyParams[]>([]);

  // ── Load articles ──────────────────────────────────────────────────────────
  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const [articles, drafts] = await Promise.all([getAllArticles(), getAllDrafts()]);
      setRows([...articles, ...drafts]);
    } catch {
      toast({ title: "Failed to load articles", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  }, [toast]);

  useEffect(() => { loadData(); }, [loadData]);

  // ── Pre-compute entropy specs ──────────────────────────────────────────────
  const previewSpecs = useCallback(async () => {
    setPreviewLoading(true);
    prevParamsRef.current = [];
    setRows((prev) => {
      // return as-is, we'll update asynchronously
      return prev;
    });

    // We need to read rows outside of setState
    const current = await new Promise<ArticleRow[]>((resolve) => {
      setRows((prev) => { resolve(prev); return prev; });
    });

    const updated = [...current];
    for (let i = 0; i < updated.length; i++) {
      const a = updated[i];
      if (!a.spec) {
        const spec = await generateImageSpec(
          { title: a.title, slug: a.slug, category: a.category, tags: a.tags, excerpt: a.excerpt, published_at: a.published_at },
          prevParamsRef.current,
        );
        updated[i] = { ...a, spec };
        prevParamsRef.current.push(spec.params);
      } else {
        prevParamsRef.current.push(a.spec.params);
      }
    }
    setRows(updated);
    setPreviewLoading(false);
  }, []);

  // ── Generate one image ─────────────────────────────────────────────────────
  const generateOne = useCallback(async (row: ArticleRow): Promise<string | null> => {
    let spec = row.spec;
    if (!spec) {
      spec = await generateImageSpec(
        { title: row.title, slug: row.slug, category: row.category, tags: row.tags, excerpt: row.excerpt, published_at: row.published_at },
        prevParamsRef.current,
      );
    }
    const { data, error } = await supabase.functions.invoke("generate-featured-image", {
      body: {
        articleId: row.id ?? row.slug,
        title: row.title,
        slug: row.slug,
        category: row.category,
        image_prompt: spec.image_prompt,
        negative_prompt: spec.negative_prompt,
        layout: spec.layout,
        seed: spec.seed,
        visual_signature: spec.visual_signature,
      },
    });
    if (error || data?.error) throw new Error(error?.message ?? data?.error ?? "Generation failed");
    return data?.imageUrl ?? null;
  }, []);

  // ── Single generate ────────────────────────────────────────────────────────
  const handleGenerateSingle = async (slug: string) => {
    const row = rows.find((r) => r.slug === slug);
    if (!row) return;
    setRows((prev) => prev.map((r) => r.slug === slug ? { ...r, generating: true, error: undefined } : r));
    try {
      const url = await generateOne(row);
      setRows((prev) => prev.map((r) => r.slug === slug ? { ...r, generating: false, generated: true, imageUrl: url ?? undefined } : r));
      toast({ title: "Image generated", description: slug });
    } catch (err: any) {
      setRows((prev) => prev.map((r) => r.slug === slug ? { ...r, generating: false, error: err.message ?? "Failed" } : r));
      toast({ title: "Generation failed", description: err.message, variant: "destructive" });
    }
  };

  // ── Batch generate ─────────────────────────────────────────────────────────
  const handleBatchGenerate = async (targets: ArticleRow[]) => {
    if (targets.length === 0) { toast({ title: "No articles to process" }); return; }
    batchAbortRef.current = false;
    setBatchRunning(true);
    setBatchProgress(0);

    for (let i = 0; i < targets.length; i++) {
      if (batchAbortRef.current) break;
      const row = targets[i];
      setBatchCurrent(row.title);
      setBatchProgress(Math.round((i / targets.length) * 100));
      setRows((prev) => prev.map((r) => r.slug === row.slug ? { ...r, generating: true, error: undefined } : r));
      try {
        const url = await generateOne(row);
        setRows((prev) => prev.map((r) => r.slug === row.slug ? { ...r, generating: false, generated: true, imageUrl: url ?? undefined } : r));
      } catch (err: any) {
        setRows((prev) => prev.map((r) => r.slug === row.slug ? { ...r, generating: false, error: err.message } : r));
      }
      if (i < targets.length - 1 && !batchAbortRef.current) {
        await new Promise((res) => setTimeout(res, 2000));
      }
    }

    setBatchProgress(100);
    setBatchRunning(false);
    setBatchCurrent("");
  };

  // ── Filtering ──────────────────────────────────────────────────────────────
  const categories = Array.from(new Set(rows.map((r) => r.category).filter(Boolean))) as string[];

  const filteredRows = rows.filter((r) => {
    if (search && !r.title.toLowerCase().includes(search.toLowerCase())) return false;
    if (catFilter && r.category !== catFilter) return false;
    if (filter === "missing") return !r.featured_image;
    if (filter === "has_image") return !!r.featured_image;
    return true;
  });

  const missingCount = rows.filter((r) => !r.featured_image).length;

  // ── Copy prompt ────────────────────────────────────────────────────────────
  const copyPrompt = (spec: ImageSpec) => {
    navigator.clipboard.writeText(spec.image_prompt).then(() =>
      toast({ title: "Prompt copied to clipboard" }),
    );
  };

  const inspectedRow = inspectedSlug ? rows.find((r) => r.slug === inspectedSlug) : null;

  // ── Render ─────────────────────────────────────────────────────────────────
  return (
    <AdminLayout
      title="Image Engine"
      subtitle="SHA-256 entropy · 8 layouts · category DNA · anti-duplication"
    >
      <div className="max-w-[1400px] mx-auto space-y-6 px-4 py-6">

        {/* Actions */}
        <div className="flex flex-wrap items-center justify-end gap-2">
          <Button variant="outline" size="sm" onClick={previewSpecs} disabled={previewLoading || loading}>
            {previewLoading
              ? <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              : <Zap className="mr-2 h-4 w-4" />}
            Preview All Prompts
          </Button>
          <Button
            size="sm"
            onClick={() => handleBatchGenerate(filteredRows.filter((r) => !r.featured_image))}
            disabled={batchRunning || loading}
          >
            <Wand2 className="mr-2 h-4 w-4" />
            Generate Missing ({missingCount})
          </Button>
          {batchRunning && (
            <Button variant="destructive" size="sm" onClick={() => { batchAbortRef.current = true; }}>
              Stop
            </Button>
          )}
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          <StatCard label="Total"       value={rows.length}                          color="text-primary"    icon={<Layers   className="h-4 w-4" />} />
          <StatCard label="Has Image"   value={rows.length - missingCount}           color="text-green-400"  icon={<ImageIcon className="h-4 w-4" />} />
          <StatCard label="Missing"     value={missingCount}                         color="text-amber-400"  icon={<XCircle  className="h-4 w-4" />} />
          <StatCard label="Specs Ready" value={rows.filter((r) => r.spec).length}   color="text-blue-400"   icon={<ShieldCheck className="h-4 w-4" />} />
        </div>

        {/* Batch progress */}
        {batchRunning && (
          <div className="rounded-xl border border-border bg-card p-4 space-y-2">
            <div className="flex items-center justify-between text-sm">
              <span className="flex items-center gap-2 text-muted-foreground">
                <Loader2 className="h-4 w-4 animate-spin" />
                Generating…
              </span>
              <span className="text-xs tabular-nums">{batchProgress}%</span>
            </div>
            <Progress value={batchProgress} className="h-2" />
            <p className="truncate text-xs text-muted-foreground">{batchCurrent}</p>
          </div>
        )}

        {/* Filters */}
        <div className="flex flex-wrap gap-2">
          <div className="relative flex-1 min-w-[160px]">
            <Filter className="absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Search articles…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-8 h-9 text-sm"
            />
          </div>
          {(["all", "missing", "has_image"] as FilterMode[]).map((f) => (
            <Button
              key={f}
              variant={filter === f ? "default" : "outline"}
              size="sm"
              onClick={() => setFilter(f)}
            >
              {f === "all" ? "All" : f === "missing" ? `Missing (${missingCount})` : "Has Image"}
            </Button>
          ))}
          <select
            className="h-9 rounded-md border border-border bg-background px-3 text-sm"
            value={catFilter}
            onChange={(e) => setCatFilter(e.target.value)}
          >
            <option value="">All categories</option>
            {categories.map((c) => <option key={c} value={c}>{c}</option>)}
          </select>
        </div>

        {/* Table */}
        <div className="rounded-xl border border-border overflow-hidden">
          {loading ? (
            <div className="flex items-center justify-center py-20 text-muted-foreground">
              <RefreshCw className="mr-2 h-5 w-5 animate-spin" />
              Loading articles…
            </div>
          ) : filteredRows.length === 0 ? (
            <div className="py-20 text-center text-muted-foreground">
              No articles match your filters.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border bg-muted/50 text-xs text-muted-foreground">
                    <th className="px-4 py-3 text-left font-medium">Article</th>
                    <th className="px-4 py-3 text-left font-medium">Category</th>
                    <th className="px-4 py-3 text-left font-medium">Layout</th>
                    <th className="px-4 py-3 text-left font-medium">Image</th>
                    <th className="px-4 py-3 text-left font-medium">Status</th>
                    <th className="px-4 py-3 text-right font-medium">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {filteredRows.map((row) => (
                    <ArticleTableRow
                      key={row.slug}
                      row={row}
                      isInspected={inspectedSlug === row.slug}
                      onToggleInspect={() =>
                        setInspectedSlug((prev) => (prev === row.slug ? null : row.slug))
                      }
                      onGenerate={() => handleGenerateSingle(row.slug)}
                      onCopy={row.spec ? () => copyPrompt(row.spec!) : undefined}
                    />
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Prompt Inspector */}
        {inspectedRow?.spec && (
          <PromptInspector
            spec={inspectedRow.spec}
            onClose={() => setInspectedSlug(null)}
            onCopy={() => copyPrompt(inspectedRow.spec!)}
          />
        )}
        {inspectedRow && !inspectedRow.spec && (
          <div className="rounded-xl border border-border bg-card p-6 text-center text-sm text-muted-foreground">
            <Loader2 className="mx-auto mb-2 h-5 w-5 animate-spin" />
            Computing entropy spec…
          </div>
        )}

      </div>
    </AdminLayout>
  );
}

// ── Stat Card ─────────────────────────────────────────────────────────────────

function StatCard({ label, value, color, icon }: { label: string; value: number; color: string; icon: React.ReactNode }) {
  return (
    <div className="rounded-xl border border-border bg-card p-4">
      <div className={`mb-1 flex items-center gap-1.5 text-xs font-medium ${color}`}>
        {icon} {label}
      </div>
      <p className="text-2xl font-bold tabular-nums">{value}</p>
    </div>
  );
}

// ── Article Table Row ─────────────────────────────────────────────────────────

function ArticleTableRow({
  row,
  isInspected,
  onToggleInspect,
  onGenerate,
  onCopy,
}: {
  row: ArticleRow;
  isInspected: boolean;
  onToggleInspect: () => void;
  onGenerate: () => void;
  onCopy?: () => void;
}) {
  const imageUrl = row.imageUrl ?? row.featured_image;

  return (
    <tr className={`transition-colors hover:bg-muted/30 ${isInspected ? "bg-primary/5" : ""}`}>
      <td className="max-w-[260px] px-4 py-3">
        <p className="truncate font-medium leading-tight">{row.title}</p>
        <p className="mt-0.5 truncate text-xs text-muted-foreground">{row.slug}</p>
      </td>

      <td className="px-4 py-3 text-xs text-muted-foreground whitespace-nowrap">
        {row.category ?? "—"}
      </td>

      <td className="px-4 py-3">
        {row.spec ? (
          <span className={`inline-block rounded-full border px-2 py-0.5 text-xs font-medium ${LAYOUT_COLOR[row.spec.layout] ?? "bg-muted text-muted-foreground"}`}>
            {LAYOUT_LABEL[row.spec.layout] ?? row.spec.layout}
          </span>
        ) : (
          <span className="text-xs text-muted-foreground">—</span>
        )}
      </td>

      <td className="px-4 py-3">
        {imageUrl ? (
          <a href={imageUrl} target="_blank" rel="noopener noreferrer">
            <img src={imageUrl} alt="" className="h-8 w-14 rounded object-cover ring-1 ring-border" />
          </a>
        ) : (
          <span className="inline-flex items-center gap-1 text-xs text-muted-foreground">
            <XCircle className="h-3.5 w-3.5 text-amber-500" />
            Missing
          </span>
        )}
      </td>

      <td className="px-4 py-3">
        {row.generating ? (
          <span className="inline-flex items-center gap-1 text-xs text-blue-400">
            <Loader2 className="h-3.5 w-3.5 animate-spin" />
            Generating…
          </span>
        ) : row.generated ? (
          <span className="inline-flex items-center gap-1 text-xs text-green-400">
            <CheckCircle className="h-3.5 w-3.5" />
            Done
          </span>
        ) : row.error ? (
          <span className="max-w-[140px] truncate text-xs text-red-400" title={row.error}>
            {row.error}
          </span>
        ) : (
          <span className="text-xs text-muted-foreground">—</span>
        )}
      </td>

      <td className="px-4 py-3">
        <div className="flex items-center justify-end gap-1">
          {onCopy && (
            <button
              onClick={onCopy}
              className="rounded p-1.5 text-muted-foreground hover:bg-muted hover:text-foreground"
              title="Copy prompt"
            >
              <Copy className="h-3.5 w-3.5" />
            </button>
          )}
          <button
            onClick={onToggleInspect}
            className={`rounded p-1.5 transition-colors ${isInspected ? "bg-primary/20 text-primary" : "text-muted-foreground hover:bg-muted hover:text-foreground"}`}
            title={isInspected ? "Close inspector" : "Inspect entropy spec"}
          >
            {isInspected ? <ChevronUp className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
          </button>
          <Button
            size="sm"
            variant="outline"
            className="h-7 px-2 text-xs"
            disabled={row.generating}
            onClick={onGenerate}
          >
            {row.generating ? (
              <Loader2 className="h-3 w-3 animate-spin" />
            ) : (
              <>
                <Wand2 className="mr-1 h-3 w-3" />
                Generate
              </>
            )}
          </Button>
        </div>
      </td>
    </tr>
  );
}

// ── Prompt Inspector ──────────────────────────────────────────────────────────

function PromptInspector({
  spec,
  onClose,
  onCopy,
}: {
  spec: ImageSpec;
  onClose: () => void;
  onCopy: () => void;
}) {
  const p = spec.params;

  const fields = [
    { label: "Layout",        value: LAYOUT_LABEL[spec.layout] ?? spec.layout },
    { label: "Palette",       value: p.palette.replace(/_/g, " ") },
    { label: "Typography",    value: p.typography.replace(/_/g, " ") },
    { label: "Camera",        value: p.cameraAngle.replace(/_/g, " ") },
    { label: "Lighting",      value: p.lightingStyle.replace(/_/g, " ") },
    { label: "Density",       value: p.compositionDensity.replace(/_/g, " ") },
    { label: "Background",    value: p.backgroundEnvironment.replace(/_/g, " ") },
    { label: "UI Structure",  value: p.uiStructure.replace(/_/g, " ") },
    { label: "Seed",          value: spec.seed.slice(0, 16) + "…", mono: true },
    { label: "Signature",     value: spec.visual_signature, mono: true },
  ];

  return (
    <div className="rounded-xl border border-primary/20 bg-card p-5 space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold">
          Entropy Inspector — <span className="text-primary">{spec.slug}</span>
        </h3>
        <button onClick={onClose} className="text-xs text-muted-foreground hover:text-foreground">
          ✕ Close
        </button>
      </div>

      <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-5">
        {fields.map((f) => (
          <div key={f.label} className="rounded-lg border border-border bg-muted/30 p-3">
            <p className="text-xs text-muted-foreground">{f.label}</p>
            <p className={`mt-0.5 text-xs font-medium leading-tight break-all ${f.mono ? "font-mono" : "capitalize"}`}>
              {f.value}
            </p>
          </div>
        ))}
      </div>

      <div className="space-y-1">
        <div className="flex items-center justify-between">
          <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
            Image Prompt
          </p>
          <button
            onClick={onCopy}
            className="flex items-center gap-1 rounded px-2 py-1 text-xs text-muted-foreground hover:bg-muted hover:text-foreground"
          >
            <Copy className="h-3 w-3" />
            Copy
          </button>
        </div>
        <pre className="max-h-40 overflow-y-auto rounded-lg border border-border bg-muted/20 p-3 text-xs leading-relaxed whitespace-pre-wrap font-mono">
          {spec.image_prompt}
        </pre>
      </div>

      <div className="space-y-1">
        <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
          Negative Prompt
        </p>
        <pre className="max-h-24 overflow-y-auto rounded-lg border border-border bg-muted/20 p-3 text-xs leading-relaxed whitespace-pre-wrap font-mono text-red-400/80">
          {spec.negative_prompt}
        </pre>
      </div>
    </div>
  );
}
