import { useState, useMemo } from "react";
import { AlertTriangle, TrendingUp, Eye, MousePointer, ArrowUpDown, RefreshCw, ClipboardPaste } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { useToast } from "@/hooks/use-toast";

interface Article {
  id: string;
  title: string;
  slug: string;
  views?: number | null;
  updated_at: string;
  status: string;
}

interface GSCEntry {
  page: string;
  clicks: number;
  impressions: number;
  ctr: number;
  position: number;
}

interface RefreshCandidate {
  article: Article;
  gsc: GSCEntry;
  priority: "high" | "medium" | "low";
  reason: string;
}

interface Props {
  articles: Article[];
}

export default function ContentRefresh({ articles }: Props) {
  const [gscInput, setGscInput] = useState("");
  const [candidates, setCandidates] = useState<RefreshCandidate[]>([]);
  const [sortBy, setSortBy] = useState<"priority" | "impressions" | "ctr">("priority");
  const { toast } = useToast();

  const handleAnalyze = () => {
    const lines = gscInput.split("\n").filter(l => l.trim());
    const entries: GSCEntry[] = [];

    for (const line of lines) {
      const parts = line.split("\t").map(p => p.trim());
      if (parts.length >= 4) {
        entries.push({
          page: parts[0],
          clicks: parseInt(parts[1]) || 0,
          impressions: parseInt(parts[2]) || 0,
          ctr: parseFloat(parts[3]) || 0,
          position: parseFloat(parts[4]) || 0,
        });
      }
    }

    const results: RefreshCandidate[] = [];
    for (const entry of entries) {
      // Match GSC page URL to article slug
      const slug = entry.page.replace(/^https?:\/\/[^/]+\/blog\//, "").replace(/\/$/, "");
      const article = articles.find(a => a.slug === slug || entry.page.includes(a.slug));
      if (!article) continue;

      let priority: "high" | "medium" | "low" = "low";
      let reason = "";

      if (entry.impressions > 100 && entry.ctr < 2) {
        priority = "high";
        reason = `High impressions (${entry.impressions}) but very low CTR (${entry.ctr}%). Title/meta needs optimization.`;
      } else if (entry.position >= 5 && entry.position <= 20 && entry.impressions > 50) {
        priority = "high";
        reason = `Ranking at position ${entry.position} with ${entry.impressions} impressions. Close to page 1 — content refresh could push it up.`;
      } else if (entry.impressions > 50 && entry.clicks < 5) {
        priority = "medium";
        reason = `${entry.impressions} impressions but only ${entry.clicks} clicks. Consider updating title and adding structured data.`;
      } else if (entry.position > 20) {
        priority = "low";
        reason = `Position ${entry.position}. May need comprehensive content update or backlinks.`;
      } else {
        priority = "low";
        reason = `Performing adequately. Monitor for changes.`;
      }

      results.push({ article, gsc: entry, priority, reason });
    }

    results.sort((a, b) => {
      const priorityOrder = { high: 0, medium: 1, low: 2 };
      return priorityOrder[a.priority] - priorityOrder[b.priority];
    });

    setCandidates(results);
    toast({
      title: "Analysis Complete",
      description: `Found ${results.filter(r => r.priority === "high").length} high-priority articles to refresh`,
    });
  };

  const sorted = useMemo(() => {
    const copy = [...candidates];
    if (sortBy === "impressions") copy.sort((a, b) => b.gsc.impressions - a.gsc.impressions);
    else if (sortBy === "ctr") copy.sort((a, b) => a.gsc.ctr - b.gsc.ctr);
    return copy;
  }, [candidates, sortBy]);

  const sampleData = `https://extensionto.com/blog/best-chrome-extensions-for-privacy\t5\t1200\t0.4\t12
https://extensionto.com/blog/ghostery-chrome-extension\t3\t800\t0.3\t18
https://extensionto.com/blog/idm-extension-to-chrome\t12\t450\t2.6\t8`;

  return (
    <div className="space-y-6">
      <div className="rounded-xl border border-border bg-card p-6 space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-lg font-semibold font-[family-name:var(--font-heading)] text-foreground">
              GSC Performance Data
            </h3>
            <p className="text-sm text-muted-foreground">
              Paste from Google Search Console: page → clicks → impressions → CTR → position (tab-separated)
            </p>
          </div>
          <Button variant="outline" size="sm" onClick={() => setGscInput(sampleData)} className="gap-2">
            <ClipboardPaste className="h-4 w-4" />
            Load Sample
          </Button>
        </div>
        <Textarea
          value={gscInput}
          onChange={e => setGscInput(e.target.value)}
          placeholder="Paste GSC data here (tab-separated)..."
          rows={6}
          className="font-mono text-sm bg-background"
        />
        <Button onClick={handleAnalyze} className="gap-2 bg-primary text-primary-foreground">
          <RefreshCw className="h-4 w-4" />
          Analyze Content
        </Button>
      </div>

      {candidates.length > 0 && (
        <>
          {/* Priority Summary */}
          <div className="grid grid-cols-3 gap-3">
            {[
              { label: "High Priority", count: candidates.filter(c => c.priority === "high").length, color: "text-destructive", bg: "bg-destructive/10" },
              { label: "Medium Priority", count: candidates.filter(c => c.priority === "medium").length, color: "text-yellow-400", bg: "bg-yellow-500/10" },
              { label: "Low Priority", count: candidates.filter(c => c.priority === "low").length, color: "text-green-400", bg: "bg-green-500/10" },
            ].map(s => (
              <div key={s.label} className={`rounded-lg border border-border p-4 text-center ${s.bg}`}>
                <p className={`text-3xl font-bold font-[family-name:var(--font-heading)] ${s.color}`}>{s.count}</p>
                <p className="text-xs text-muted-foreground mt-1">{s.label}</p>
              </div>
            ))}
          </div>

          {/* Sort Controls */}
          <div className="flex gap-2">
            {(["priority", "impressions", "ctr"] as const).map(s => (
              <Button
                key={s}
                variant={sortBy === s ? "default" : "outline"}
                size="sm"
                onClick={() => setSortBy(s)}
                className="gap-1 capitalize"
              >
                <ArrowUpDown className="h-3 w-3" />
                {s === "ctr" ? "Lowest CTR" : s}
              </Button>
            ))}
          </div>

          {/* Results */}
          <div className="space-y-3">
            {sorted.map((c, i) => (
              <div
                key={i}
                className={`rounded-xl border p-4 space-y-3 ${
                  c.priority === "high" ? "border-destructive/40 bg-destructive/5" :
                  c.priority === "medium" ? "border-yellow-500/40 bg-yellow-500/5" :
                  "border-border bg-card"
                }`}
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <Badge className={
                        c.priority === "high" ? "bg-destructive/20 text-destructive border-destructive/30" :
                        c.priority === "medium" ? "bg-yellow-500/20 text-yellow-400 border-yellow-500/30" :
                        "bg-green-500/20 text-green-400 border-green-500/30"
                      }>
                        {c.priority}
                      </Badge>
                      <a
                        href={`/blog/${c.article.slug}`}
                        target="_blank"
                        rel="noopener"
                        className="text-sm font-medium text-primary hover:underline truncate"
                      >
                        {c.article.title}
                      </a>
                    </div>
                    <p className="text-sm text-muted-foreground flex items-center gap-1">
                      <AlertTriangle className="h-3 w-3" />
                      {c.reason}
                    </p>
                  </div>
                  <div className="flex gap-4 text-center shrink-0">
                    <div>
                      <p className="text-lg font-bold text-foreground">{c.gsc.clicks}</p>
                      <p className="text-[10px] text-muted-foreground flex items-center gap-1"><MousePointer className="h-3 w-3" />Clicks</p>
                    </div>
                    <div>
                      <p className="text-lg font-bold text-foreground">{c.gsc.impressions}</p>
                      <p className="text-[10px] text-muted-foreground flex items-center gap-1"><Eye className="h-3 w-3" />Impr.</p>
                    </div>
                    <div>
                      <p className="text-lg font-bold text-foreground">{c.gsc.ctr}%</p>
                      <p className="text-[10px] text-muted-foreground flex items-center gap-1"><TrendingUp className="h-3 w-3" />CTR</p>
                    </div>
                    <div>
                      <p className="text-lg font-bold text-foreground">{c.gsc.position}</p>
                      <p className="text-[10px] text-muted-foreground">Pos.</p>
                    </div>
                  </div>
                </div>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => window.open(`/settings/seo/${c.article.slug}`, "_blank")}
                    className="gap-1"
                  >
                    <RefreshCw className="h-3 w-3" />
                    Optimize SEO
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
