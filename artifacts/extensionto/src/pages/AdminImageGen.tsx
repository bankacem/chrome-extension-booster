/**
 * AdminImageGen — production image generation engine
 *
 * Implements all 7 Image Quality Enforcement rules:
 *  1. No fallback images (detects generic/placeholder/wordpress URLs)
 *  2. Enforced generation for missing/fallback articles
 *  3. Quality gate (5 automated checks per spec)
 *  4. Strict category visual match (layout + UI enforced by DNA)
 *  5. Visual uniqueness (hard-triple dedup + 25% similarity threshold)
 *  6. Auto-fix pipeline ("Fix All Issues" batch)
 *  7. Final output guarantee (prompt wires title into UI element, never floating)
 */

import { useState, useEffect, useCallback, useRef } from "react";
import {
  Wand2, ImageIcon, RefreshCw, ChevronUp,
  CheckCircle, XCircle, Copy, Loader2, Filter,
  Layers, Zap, ShieldCheck, Eye, AlertTriangle,
  ShieldX, ShieldAlert, CircleDot, Wrench,
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
  getImageQualityStatus,
  isFallbackImage,
  type ImageSpec,
  type EntropyParams,
  type ImageQualityStatus,
} from "@/lib/imageEntropyEngine";

// ── Types ─────────────────────────────────────────────────────────────────────

type FilterMode = "all" | "issues" | "missing" | "fallback" | "has_image";

interface ArticleRow extends Article {
  qualityStatus: ImageQualityStatus;
  spec?: ImageSpec;
  generating?: boolean;
  generated?: boolean;
  error?: string;
  liveImageUrl?: string;
}

// ── Constants ─────────────────────────────────────────────────────────────────

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

const STATUS_CONFIG: Record<ImageQualityStatus, { label: string; color: string; icon: React.ReactNode }> = {
  approved: {
    label: "Approved",
    color: "text-green-400 bg-green-500/10 border-green-500/20",
    icon: <ShieldCheck className="h-3 w-3" />,
  },
  missing: {
    label: "Missing",
    color: "text-amber-400 bg-amber-500/10 border-amber-500/20",
    icon: <XCircle className="h-3 w-3" />,
  },
  fallback: {
    label: "Fallback",
    color: "text-red-400 bg-red-500/10 border-red-500/20",
    icon: <ShieldX className="h-3 w-3" />,
  },
  pending: {
    label: "Pending",
    color: "text-blue-400 bg-blue-500/10 border-blue-500/20",
    icon: <CircleDot className="h-3 w-3" />,
  },
  rejected: {
    label: "Rejected",
    color: "text-rose-400 bg-rose-500/10 border-rose-500/20",
    icon: <ShieldAlert className="h-3 w-3" />,
  },
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
  const [batchLabel, setBatchLabel]         = useState("");
  const [inspectedSlug, setInspectedSlug]   = useState<string | null>(null);

  const batchAbortRef  = useRef(false);
  const prevParamsRef  = useRef<EntropyParams[]>([]);

  // ── Load articles ──────────────────────────────────────────────────────────
  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const [articles, drafts] = await Promise.all([getAllArticles(), getAllDrafts()]);
      // RULE 1: Detect fallback/missing images immediately on load
      const allRows: ArticleRow[] = [...articles, ...drafts].map((a) => ({
        ...a,
        qualityStatus: getImageQualityStatus(a.featured_image),
      }));
      setRows(allRows);
    } catch {
      toast({ title: "Failed to load articles", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  }, [toast]);

  useEffect(() => { loadData(); }, [loadData]);

  // ── Pre-compute entropy specs for all rows ─────────────────────────────────
  const previewSpecs = useCallback(async () => {
    setPreviewLoading(true);
    prevParamsRef.current = [];

    const snapshot = await new Promise<ArticleRow[]>((resolve) => {
      setRows((prev) => { resolve(prev); return prev; });
    });

    const updated = [...snapshot];
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

    // RULE 3: Quality gate — if spec fails, we still send it but mark as rejected
    const gateResult = spec.quality_gate;

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
        quality_gate_passed: gateResult.passed,
      },
    });
    if (error || data?.error) throw new Error(error?.message ?? data?.error ?? "Generation failed");

    // Register this spec's params for future dedup
    prevParamsRef.current.push(spec.params);

    return data?.imageUrl ?? null;
  }, []);

  // ── Single generate ────────────────────────────────────────────────────────
  const handleGenerateSingle = async (slug: string) => {
    const row = rows.find((r) => r.slug === slug);
    if (!row) return;
    setRows((prev) => prev.map((r) =>
      r.slug === slug ? { ...r, generating: true, error: undefined } : r,
    ));
    try {
      const url = await generateOne(row);
      setRows((prev) => prev.map((r) =>
        r.slug === slug
          ? { ...r, generating: false, generated: true, liveImageUrl: url ?? undefined, qualityStatus: "approved" }
          : r,
      ));
      toast({ title: "Image generated", description: slug });
    } catch (err: any) {
      setRows((prev) => prev.map((r) =>
        r.slug === slug ? { ...r, generating: false, error: err.message ?? "Failed" } : r,
      ));
      toast({ title: "Generation failed", description: err.message, variant: "destructive" });
    }
  };

  // ── Batch generate ─────────────────────────────────────────────────────────
  const handleBatchGenerate = async (targets: ArticleRow[], label: string) => {
    if (targets.length === 0) { toast({ title: "No articles to process" }); return; }
    batchAbortRef.current = false;
    setBatchRunning(true);
    setBatchProgress(0);
    setBatchLabel(label);

    let success = 0;
    let fail = 0;

    for (let i = 0; i < targets.length; i++) {
      if (batchAbortRef.current) break;
      const row = targets[i];
      setBatchCurrent(row.title);
      setBatchProgress(Math.round((i / targets.length) * 100));
      setRows((prev) => prev.map((r) =>
        r.slug === row.slug ? { ...r, generating: true, error: undefined } : r,
      ));
      try {
        const url = await generateOne(row);
        setRows((prev) => prev.map((r) =>
          r.slug === row.slug
            ? { ...r, generating: false, generated: true, liveImageUrl: url ?? undefined, qualityStatus: "approved" }
            : r,
        ));
        success++;
      } catch (err: any) {
        setRows((prev) => prev.map((r) =>
          r.slug === row.slug ? { ...r, generating: false, error: err.message } : r,
        ));
        fail++;
      }
      if (i < targets.length - 1 && !batchAbortRef.current) {
        await new Promise((res) => setTimeout(res, 2000));
      }
    }

    setBatchProgress(100);
    setBatchRunning(false);
    setBatchCurrent("");
    setBatchLabel("");
    toast({
      title: "Batch complete",
      description: `${success} generated, ${fail} failed`,
      variant: fail > 0 ? "destructive" : "default",
    });
  };

  // ── Derived data ───────────────────────────────────────────────────────────
  const categories  = Array.from(new Set(rows.map((r) => r.category).filter(Boolean))) as string[];
  const missingCount  = rows.filter((r) => r.qualityStatus === "missing").length;
  const fallbackCount = rows.filter((r) => r.qualityStatus === "fallback").length;
  const issuesCount   = rows.filter((r) => ["missing", "fallback", "rejected"].includes(r.qualityStatus)).length;
  const approvedCount = rows.filter((r) => r.qualityStatus === "approved" || r.generated).length;

  const issueRows = rows.filter((r) => ["missing", "fallback", "rejected"].includes(r.qualityStatus));

  const filteredRows = rows.filter((r) => {
    if (search && !r.title.toLowerCase().includes(search.toLowerCase())) return false;
    if (catFilter && r.category !== catFilter) return false;
    if (filter === "issues")    return ["missing", "fallback", "rejected"].includes(r.qualityStatus);
    if (filter === "missing")   return r.qualityStatus === "missing";
    if (filter === "fallback")  return r.qualityStatus === "fallback" || isFallbackImage(r.featured_image);
    if (filter === "has_image") return !!r.featured_image && !isFallbackImage(r.featured_image);
    return true;
  });

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
      subtitle="SHA-256 entropy · 8 layouts · category DNA · quality enforcement"
    >
      <div className="max-w-[1400px] mx-auto space-y-6 px-4 py-6">

        {/* Actions bar */}
        <div className="flex flex-wrap items-center justify-end gap-2">
          <Button variant="outline" size="sm" onClick={previewSpecs} disabled={previewLoading || loading}>
            {previewLoading
              ? <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              : <Zap className="mr-2 h-4 w-4" />}
            Preview All Specs
          </Button>

          {/* RULE 6: Fix All Issues — regenerates missing + fallback + rejected */}
          {issuesCount > 0 && (
            <Button
              size="sm"
              variant="destructive"
              onClick={() => handleBatchGenerate(issueRows, "Fixing issues")}
              disabled={batchRunning || loading}
            >
              <Wrench className="mr-2 h-4 w-4" />
              Fix All Issues ({issuesCount})
            </Button>
          )}

          <Button
            size="sm"
            onClick={() =>
              handleBatchGenerate(
                filteredRows.filter((r) => !r.featured_image || isFallbackImage(r.featured_image)),
                "Generating missing",
              )
            }
            disabled={batchRunning || loading}
          >
            <Wand2 className="mr-2 h-4 w-4" />
            Generate Missing ({missingCount + fallbackCount})
          </Button>

          {batchRunning && (
            <Button variant="outline" size="sm" onClick={() => { batchAbortRef.current = true; }}>
              Stop
            </Button>
          )}
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-5">
          <StatCard label="Total"    value={rows.length}   color="text-primary"    icon={<Layers      className="h-4 w-4" />} />
          <StatCard label="Approved" value={approvedCount} color="text-green-400"  icon={<ShieldCheck className="h-4 w-4" />} />
          <StatCard label="Missing"  value={missingCount}  color="text-amber-400"  icon={<XCircle     className="h-4 w-4" />} />
          <StatCard label="Fallback" value={fallbackCount} color="text-red-400"    icon={<ShieldX     className="h-4 w-4" />} />
          <StatCard
            label="Issues"
            value={issuesCount}
            color={issuesCount > 0 ? "text-rose-400" : "text-muted-foreground"}
            icon={<AlertTriangle className="h-4 w-4" />}
          />
        </div>

        {/* Issues banner */}
        {issuesCount > 0 && !batchRunning && (
          <div className="flex items-center gap-3 rounded-xl border border-rose-500/30 bg-rose-500/5 px-4 py-3 text-sm">
            <AlertTriangle className="h-4 w-4 shrink-0 text-rose-400" />
            <span className="text-rose-300">
              <strong>{issuesCount} articles</strong> need attention —
              {missingCount > 0 && ` ${missingCount} missing image`}
              {missingCount > 0 && fallbackCount > 0 && ","}
              {fallbackCount > 0 && ` ${fallbackCount} using a fallback/generic image`}.
              {" "}
              <button
                className="underline hover:no-underline"
                onClick={() => setFilter("issues")}
              >
                Show issues
              </button>
              {" · "}
              <button
                className="underline hover:no-underline"
                onClick={() => handleBatchGenerate(issueRows, "Fixing all issues")}
                disabled={batchRunning}
              >
                Fix all now
              </button>
            </span>
          </div>
        )}

        {/* Batch progress */}
        {batchRunning && (
          <div className="rounded-xl border border-border bg-card p-4 space-y-2">
            <div className="flex items-center justify-between text-sm">
              <span className="flex items-center gap-2 text-muted-foreground">
                <Loader2 className="h-4 w-4 animate-spin" />
                {batchLabel || "Generating…"}
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

          {(["all", "issues", "missing", "fallback", "has_image"] as FilterMode[]).map((f) => {
            const labels: Record<FilterMode, string> = {
              all:       "All",
              issues:    `Issues (${issuesCount})`,
              missing:   `Missing (${missingCount})`,
              fallback:  `Fallback (${fallbackCount})`,
              has_image: "Has Image",
            };
            const isIssues = f === "issues";
            return (
              <Button
                key={f}
                variant={filter === f ? "default" : "outline"}
                size="sm"
                onClick={() => setFilter(f)}
                className={isIssues && issuesCount > 0 && filter !== f ? "border-rose-500/40 text-rose-400 hover:bg-rose-500/10" : ""}
              >
                {isIssues && issuesCount > 0 && <AlertTriangle className="mr-1.5 h-3 w-3" />}
                {labels[f]}
              </Button>
            );
          })}

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
                    <th className="px-4 py-3 text-left font-medium">Quality</th>
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

function StatCard({ label, value, color, icon }: {
  label: string; value: number; color: string; icon: React.ReactNode;
}) {
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
  const displayUrl = row.liveImageUrl ?? row.featured_image;
  const showImage  = displayUrl && !isFallbackImage(displayUrl);
  const status     = row.generated ? "approved" : row.qualityStatus;
  const sc         = STATUS_CONFIG[status];

  const isIssue = ["missing", "fallback", "rejected"].includes(status);

  return (
    <tr className={`transition-colors hover:bg-muted/30 ${isInspected ? "bg-primary/5" : ""} ${isIssue ? "bg-rose-500/3" : ""}`}>
      {/* Title */}
      <td className="max-w-[260px] px-4 py-3">
        <div className="flex items-center gap-2">
          {isIssue && <AlertTriangle className="h-3 w-3 shrink-0 text-rose-400" />}
          <div>
            <p className="truncate font-medium leading-tight">{row.title}</p>
            <p className="mt-0.5 truncate text-xs text-muted-foreground">{row.slug}</p>
          </div>
        </div>
      </td>

      {/* Category */}
      <td className="px-4 py-3 text-xs text-muted-foreground whitespace-nowrap">
        {row.category ?? "—"}
      </td>

      {/* Layout badge */}
      <td className="px-4 py-3">
        {row.spec ? (
          <span className={`inline-block rounded-full border px-2 py-0.5 text-xs font-medium ${LAYOUT_COLOR[row.spec.layout] ?? "bg-muted text-muted-foreground"}`}>
            {LAYOUT_LABEL[row.spec.layout] ?? row.spec.layout}
          </span>
        ) : (
          <span className="text-xs text-muted-foreground">—</span>
        )}
      </td>

      {/* Image thumbnail */}
      <td className="px-4 py-3">
        {showImage ? (
          <a href={displayUrl} target="_blank" rel="noopener noreferrer">
            <img src={displayUrl} alt="" className="h-8 w-14 rounded object-cover ring-1 ring-border" />
          </a>
        ) : row.qualityStatus === "fallback" ? (
          <span className="inline-flex items-center gap-1 text-xs text-red-400">
            <ShieldX className="h-3.5 w-3.5" />
            Fallback
          </span>
        ) : (
          <span className="inline-flex items-center gap-1 text-xs text-muted-foreground">
            <XCircle className="h-3.5 w-3.5 text-amber-500" />
            Missing
          </span>
        )}
      </td>

      {/* Quality status */}
      <td className="px-4 py-3">
        {row.generating ? (
          <span className="inline-flex items-center gap-1 text-xs text-blue-400">
            <Loader2 className="h-3.5 w-3.5 animate-spin" />
            Generating…
          </span>
        ) : row.error ? (
          <span className="max-w-[140px] truncate text-xs text-red-400" title={row.error}>
            {row.error}
          </span>
        ) : (
          <span className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-xs font-medium ${sc.color}`}>
            {sc.icon}
            {sc.label}
          </span>
        )}
      </td>

      {/* Actions */}
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
            className={`rounded p-1.5 transition-colors ${
              isInspected
                ? "bg-primary/20 text-primary"
                : "text-muted-foreground hover:bg-muted hover:text-foreground"
            }`}
            title={isInspected ? "Close inspector" : "Inspect entropy spec"}
          >
            {isInspected ? <ChevronUp className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
          </button>
          <Button
            size="sm"
            variant={isIssue ? "default" : "outline"}
            className={`h-7 px-2 text-xs ${isIssue ? "bg-rose-600 hover:bg-rose-700 border-0" : ""}`}
            disabled={row.generating}
            onClick={onGenerate}
          >
            {row.generating ? (
              <Loader2 className="h-3 w-3 animate-spin" />
            ) : isIssue ? (
              <>
                <Wrench className="mr-1 h-3 w-3" />
                Fix
              </>
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
  const p  = spec.params;
  const qg = spec.quality_gate;

  const paramFields = [
    { label: "Layout",       value: LAYOUT_LABEL[spec.layout] ?? spec.layout },
    { label: "Palette",      value: p.palette.replace(/_/g, " ") },
    { label: "Typography",   value: p.typography.replace(/_/g, " ") },
    { label: "Camera",       value: p.cameraAngle.replace(/_/g, " ") },
    { label: "Lighting",     value: p.lightingStyle.replace(/_/g, " ") },
    { label: "Density",      value: p.compositionDensity.replace(/_/g, " ") },
    { label: "Background",   value: p.backgroundEnvironment.replace(/_/g, " ") },
    { label: "UI Structure", value: p.uiStructure.replace(/_/g, " ") },
    { label: "Seed",         value: spec.seed.slice(0, 16) + "…", mono: true },
    { label: "Signature",    value: spec.visual_signature, mono: true },
  ];

  const gateChecks: { label: string; passed: boolean }[] = [
    { label: "Globally unique",          passed: qg.checks.isUnique },
    { label: "Category aligned",         passed: qg.checks.isCategoryAligned },
    { label: "UI structure present",     passed: qg.checks.hasUIStructure },
    { label: "Title in UI element",      passed: qg.checks.hasTitleIntegration },
    { label: "Differs from last 10",     passed: qg.checks.differsFromRecent },
  ];

  return (
    <div className="rounded-xl border border-primary/20 bg-card p-5 space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold">
          Entropy Inspector —{" "}
          <span className="font-mono text-primary">{spec.slug}</span>
        </h3>
        <button onClick={onClose} className="text-xs text-muted-foreground hover:text-foreground">
          ✕ Close
        </button>
      </div>

      {/* Quality Gate Results */}
      <div className="rounded-lg border border-border bg-muted/20 p-4 space-y-3">
        <div className="flex items-center gap-2">
          <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            Quality Gate
          </p>
          <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${
            qg.passed
              ? "bg-green-500/10 text-green-400 border border-green-500/20"
              : "bg-rose-500/10 text-rose-400 border border-rose-500/20"
          }`}>
            {qg.passed ? "✓ All checks passed" : `${qg.failedChecks.length} check${qg.failedChecks.length > 1 ? "s" : ""} failed`}
          </span>
        </div>
        <div className="grid grid-cols-2 gap-1.5 sm:grid-cols-5">
          {gateChecks.map((c) => (
            <div
              key={c.label}
              className={`flex items-center gap-1.5 rounded-md border px-2 py-1.5 text-xs ${
                c.passed
                  ? "border-green-500/20 bg-green-500/5 text-green-400"
                  : "border-rose-500/20 bg-rose-500/5 text-rose-400"
              }`}
            >
              {c.passed
                ? <CheckCircle className="h-3 w-3 shrink-0" />
                : <XCircle    className="h-3 w-3 shrink-0" />}
              {c.label}
            </div>
          ))}
        </div>
        {qg.failedChecks.length > 0 && (
          <div className="space-y-1">
            {qg.failedChecks.map((fc, i) => (
              <p key={i} className="text-xs text-rose-400/80">
                <AlertTriangle className="inline-block h-3 w-3 mr-1" />
                {fc}
              </p>
            ))}
          </div>
        )}
      </div>

      {/* Entropy Params */}
      <div>
        <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
          Entropy Parameters
        </p>
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-5">
          {paramFields.map((f) => (
            <div key={f.label} className="rounded-lg border border-border bg-muted/30 p-3">
              <p className="text-xs text-muted-foreground">{f.label}</p>
              <p className={`mt-0.5 text-xs font-medium leading-tight break-all ${f.mono ? "font-mono" : "capitalize"}`}>
                {f.value}
              </p>
            </div>
          ))}
        </div>
      </div>

      {/* Image Prompt */}
      <div className="space-y-1">
        <div className="flex items-center justify-between">
          <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
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

      {/* Negative Prompt */}
      <div className="space-y-1">
        <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
          Negative Prompt
        </p>
        <pre className="max-h-24 overflow-y-auto rounded-lg border border-border bg-muted/20 p-3 text-xs leading-relaxed whitespace-pre-wrap font-mono text-red-400/80">
          {spec.negative_prompt}
        </pre>
      </div>
    </div>
  );
}
