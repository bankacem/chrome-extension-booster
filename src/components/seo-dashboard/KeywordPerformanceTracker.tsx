import { useState, useMemo } from "react";
import {
  Trophy, TrendingUp, AlertTriangle, Target, Shield, FileText,
  ArrowUpDown, Search, Download, Zap, Eye, MousePointer, BarChart3,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { useToast } from "@/hooks/use-toast";

interface Article {
  id: string;
  title: string;
  slug: string;
  content: string;
  keywords?: string[] | null;
  meta_description?: string | null;
  views?: number | null;
  status: string;
}

interface TrackedKeyword {
  keyword: string;
  volume: number;
  position: number;
  clicks: number;
  impressions: number;
  ctr: number;
  matchedArticle: Article | null;
  rankZone: "winner" | "striking" | "climbing" | "deep";
  healthScore: number;
  hasCRX: boolean;
  hasCanonical: boolean;
  hasH1: boolean;
  wordCount: number;
  keywordDensity: number;
}

interface Props {
  articles: Article[];
}

function normalizeText(text: string): string {
  return text.toLowerCase().replace(/[^a-z0-9\s]/g, "").replace(/\s+/g, " ").trim();
}

function findBestArticle(keyword: string, articles: Article[]): Article | null {
  const normKw = normalizeText(keyword);
  let best: Article | null = null;
  let bestScore = 0;

  for (const article of articles) {
    const normSlug = normalizeText(article.slug.replace(/-/g, " "));
    const normTitle = normalizeText(article.title);
    const normKeywords = (article.keywords || []).map(k => normalizeText(k));

    let score = 0;
    if (normKeywords.includes(normKw)) score = 100;
    else if (normSlug === normKw) score = 95;
    else if (normTitle.includes(normKw)) score = 90;
    else if (normSlug.includes(normKw)) score = 80;
    else {
      const kwWords = normKw.split(" ");
      const slugWords = normSlug.split(" ");
      const titleWords = normTitle.split(" ");
      const overlap = Math.max(
        slugWords.filter(w => kwWords.includes(w)).length / Math.max(slugWords.length, 1),
        titleWords.filter(w => kwWords.includes(w)).length / Math.max(titleWords.length, 1)
      );
      if (overlap >= 0.4) score = Math.round(overlap * 70);
    }

    if (score > bestScore) { bestScore = score; best = article; }
  }
  return bestScore >= 25 ? best : null;
}

function computeHealthScore(article: Article, keyword: string): {
  score: number; hasCanonical: boolean; hasH1: boolean; wordCount: number; keywordDensity: number; hasCRX: boolean;
} {
  const content = article.content || "";
  const wordCount = content.split(/\s+/).filter(Boolean).length;
  const normKw = keyword.toLowerCase();
  const kwCount = (content.toLowerCase().match(new RegExp(normKw.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), "g")) || []).length;
  const keywordDensity = wordCount > 0 ? (kwCount / wordCount) * 100 : 0;

  const hasCanonical = true; // enforced by SEO component
  const hasH1 = /<h1/i.test(content) || article.title.length > 0;
  const hasCRX = /\.crx|\.xpi|direct.download|download.*button/i.test(content);

  let score = 0;
  // Canonical (20 pts)
  if (hasCanonical) score += 20;
  // H1 (20 pts)
  if (hasH1) score += 20;
  // Word count (20 pts) - 1200+ words is ideal
  score += Math.min(20, Math.round((wordCount / 1200) * 20));
  // Keyword density (20 pts) - 1-2.5% is ideal
  if (keywordDensity >= 1 && keywordDensity <= 2.5) score += 20;
  else if (keywordDensity > 0 && keywordDensity < 1) score += 10;
  else if (keywordDensity > 2.5 && keywordDensity <= 4) score += 10;
  // CRX presence (20 pts)
  if (hasCRX) score += 20;

  return { score, hasCanonical, hasH1, wordCount, keywordDensity, hasCRX };
}

export default function KeywordPerformanceTracker({ articles }: Props) {
  const [rawInput, setRawInput] = useState("");
  const [tracked, setTracked] = useState<TrackedKeyword[]>([]);
  const [sortBy, setSortBy] = useState<"position" | "volume" | "health">("position");
  const [filterZone, setFilterZone] = useState<"all" | "winner" | "striking" | "climbing" | "deep">("all");
  const { toast } = useToast();

  const sampleData = `adblocker for android chrome\t250\t75\t0\t250\t0
adblock chrome android\t2100\t80\t0\t2100\t0
ghostery chrome extension\t500\t67\t0\t500\t0
idm extension for chrome\t450\t52\t0\t450\t0
idm extension\t2500\t74\t0\t2500\t0
facebook pixel helper\t900\t64\t0\t900\t0
privacy badger chrome\t700\t94\t0\t700\t0
chrome extensions android\t1800\t83\t0\t1800\t0
internet download manager extension\t700\t84\t0\t700\t0
pop up blocker for chrome\t400\t90\t0\t400\t0
chrome popup blocker\t600\t65\t0\t600\t0
ghostery chrome\t800\t50\t3\t800\t0.3
how to speed up chrome\t400\t81\t0\t400\t0
linkedin chrome extension\t300\t72\t0\t300\t0
extension .to\t20\t10\t0\t20\t0`;

  const handleAnalyze = () => {
    const lines = rawInput.split("\n").filter(l => l.trim());
    const results: TrackedKeyword[] = [];

    for (const line of lines) {
      const parts = line.split("\t").map(p => p.trim());
      const keyword = parts[0];
      if (!keyword) continue;

      const volume = parseInt(parts[1]) || 0;
      const position = parseFloat(parts[2]) || 0;
      const clicks = parseInt(parts[3]) || 0;
      const impressions = parseInt(parts[4]) || 0;
      const ctr = parseFloat(parts[5]) || 0;

      const matchedArticle = findBestArticle(keyword, articles);

      let rankZone: TrackedKeyword["rankZone"] = "deep";
      if (position >= 1 && position <= 10) rankZone = "winner";
      else if (position >= 11 && position <= 20) rankZone = "striking";
      else if (position >= 21 && position <= 50) rankZone = "climbing";

      let healthScore = 0;
      let hasCRX = false, hasCanonical = true, hasH1 = true, wordCount = 0, keywordDensity = 0;

      if (matchedArticle) {
        const health = computeHealthScore(matchedArticle, keyword);
        healthScore = health.score;
        hasCRX = health.hasCRX;
        hasCanonical = health.hasCanonical;
        hasH1 = health.hasH1;
        wordCount = health.wordCount;
        keywordDensity = health.keywordDensity;
      }

      results.push({
        keyword, volume, position, clicks, impressions, ctr,
        matchedArticle, rankZone, healthScore, hasCRX, hasCanonical, hasH1, wordCount, keywordDensity,
      });
    }

    setTracked(results);
    const winners = results.filter(r => r.rankZone === "winner").length;
    const striking = results.filter(r => r.rankZone === "striking").length;
    toast({
      title: "🎯 Performance Analysis Complete",
      description: `${winners} winners, ${striking} striking distance — ${results.length} total keywords tracked`,
    });
  };

  const sorted = useMemo(() => {
    let data = [...tracked];
    if (filterZone !== "all") data = data.filter(t => t.rankZone === filterZone);
    if (sortBy === "position") data.sort((a, b) => a.position - b.position);
    else if (sortBy === "volume") data.sort((a, b) => b.volume - a.volume);
    else data.sort((a, b) => b.healthScore - a.healthScore);
    return data;
  }, [tracked, sortBy, filterZone]);

  const stats = useMemo(() => ({
    total: tracked.length,
    winners: tracked.filter(t => t.rankZone === "winner").length,
    striking: tracked.filter(t => t.rankZone === "striking").length,
    climbing: tracked.filter(t => t.rankZone === "climbing").length,
    deep: tracked.filter(t => t.rankZone === "deep").length,
    gaps: tracked.filter(t => !t.matchedArticle).length,
    noCRX: tracked.filter(t => t.matchedArticle && !t.hasCRX).length,
    avgHealth: tracked.length > 0 ? Math.round(tracked.reduce((s, t) => s + t.healthScore, 0) / tracked.length) : 0,
  }), [tracked]);

  const zoneConfig = {
    winner: { label: "🏆 Page 1", color: "text-green-400", bg: "bg-green-500/10", border: "border-green-500/30" },
    striking: { label: "⚡ Striking", color: "text-yellow-400", bg: "bg-yellow-500/10", border: "border-yellow-500/30" },
    climbing: { label: "📈 Climbing", color: "text-blue-400", bg: "bg-blue-500/10", border: "border-blue-500/30" },
    deep: { label: "🔻 Deep", color: "text-muted-foreground", bg: "bg-muted/10", border: "border-border" },
  };

  const handleExport = () => {
    const csv = [
      ["Keyword", "Volume", "Position", "Zone", "Article", "Health", "CRX", "Word Count", "KW Density"].join(","),
      ...tracked.map(t => [
        `"${t.keyword}"`, t.volume, t.position, t.rankZone,
        `"${t.matchedArticle?.title || "GAP"}"`, t.healthScore, t.hasCRX ? "Yes" : "No",
        t.wordCount, t.keywordDensity.toFixed(2),
      ].join(","))
    ].join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url; a.download = "keyword-performance.csv"; a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-6">
      {/* Input */}
      <div className="rounded-xl border border-border bg-card p-6 space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-lg font-semibold font-[family-name:var(--font-heading)] text-foreground">
              🎯 Keyword Performance Tracker
            </h3>
            <p className="text-sm text-muted-foreground">
              Paste Ahrefs/GSC data: keyword → volume → position → clicks → impressions → CTR (tab-separated)
            </p>
          </div>
          <Button variant="outline" size="sm" onClick={() => setRawInput(sampleData)} className="gap-2">
            <Zap className="h-4 w-4" />
            Load Ahrefs Data
          </Button>
        </div>
        <Textarea
          value={rawInput}
          onChange={e => setRawInput(e.target.value)}
          placeholder="adblocker for android chrome\t250\t75\t0\t250\t0"
          rows={6}
          className="font-mono text-sm bg-background"
        />
        <div className="flex gap-3">
          <Button onClick={handleAnalyze} className="gap-2 bg-primary text-primary-foreground">
            <Target className="h-4 w-4" />
            Analyze Performance
          </Button>
          {tracked.length > 0 && (
            <Button variant="outline" onClick={handleExport} className="gap-2">
              <Download className="h-4 w-4" />
              Export Report
            </Button>
          )}
        </div>
      </div>

      {tracked.length > 0 && (
        <>
          {/* Stats Grid */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {[
              { label: "🏆 Page 1 Winners", value: stats.winners, color: "text-green-400", bg: "bg-green-500/10" },
              { label: "⚡ Striking Distance", value: stats.striking, color: "text-yellow-400", bg: "bg-yellow-500/10" },
              { label: "📈 Climbing", value: stats.climbing, color: "text-blue-400", bg: "bg-blue-500/10" },
              { label: "🔻 Deep Pages", value: stats.deep, color: "text-muted-foreground", bg: "bg-muted/10" },
            ].map(s => (
              <button
                key={s.label}
                onClick={() => {
                  const targetZone: TrackedKeyword["rankZone"] = s.label.includes("Winner")
                    ? "winner"
                    : s.label.includes("Striking")
                      ? "striking"
                      : s.label.includes("Climbing")
                        ? "climbing"
                        : "deep";
                  setFilterZone(filterZone === targetZone ? "all" : targetZone);
                }}
                className={`rounded-lg border border-border p-4 text-center transition-all hover:scale-[1.02] ${s.bg}`}
              >
                <p className={`text-3xl font-bold font-[family-name:var(--font-heading)] ${s.color}`}>{s.value}</p>
                <p className="text-xs text-muted-foreground mt-1">{s.label}</p>
              </button>
            ))}
          </div>

          {/* Health & Gap Alerts */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <div className="rounded-lg border border-border bg-card p-4 flex items-center gap-3">
              <div className="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center">
                <Shield className="h-6 w-6 text-primary" />
              </div>
              <div>
                <p className="text-2xl font-bold text-foreground">{stats.avgHealth}%</p>
                <p className="text-xs text-muted-foreground">Avg Health Score</p>
              </div>
            </div>
            <div className="rounded-lg border border-destructive/30 bg-destructive/5 p-4 flex items-center gap-3">
              <div className="h-12 w-12 rounded-full bg-destructive/10 flex items-center justify-center">
                <AlertTriangle className="h-6 w-6 text-destructive" />
              </div>
              <div>
                <p className="text-2xl font-bold text-destructive">{stats.gaps}</p>
                <p className="text-xs text-muted-foreground">Content Gaps</p>
              </div>
            </div>
            <div className="rounded-lg border border-yellow-500/30 bg-yellow-500/5 p-4 flex items-center gap-3">
              <div className="h-12 w-12 rounded-full bg-yellow-500/10 flex items-center justify-center">
                <Download className="h-6 w-6 text-yellow-400" />
              </div>
              <div>
                <p className="text-2xl font-bold text-yellow-400">{stats.noCRX}</p>
                <p className="text-xs text-muted-foreground">Missing CRX Links</p>
              </div>
            </div>
          </div>

          {/* Sort & Filter */}
          <div className="flex flex-wrap gap-2">
            {(["position", "volume", "health"] as const).map(s => (
              <Button key={s} variant={sortBy === s ? "default" : "outline"} size="sm" onClick={() => setSortBy(s)} className="gap-1 capitalize">
                <ArrowUpDown className="h-3 w-3" />
                {s === "health" ? "Health Score" : s}
              </Button>
            ))}
            <div className="h-8 w-px bg-border mx-1" />
            <Button variant={filterZone === "all" ? "default" : "outline"} size="sm" onClick={() => setFilterZone("all")}>All</Button>
            {(["winner", "striking", "climbing", "deep"] as const).map(z => (
              <Button key={z} variant={filterZone === z ? "default" : "outline"} size="sm" onClick={() => setFilterZone(z)} className="capitalize">
                {zoneConfig[z].label}
              </Button>
            ))}
          </div>

          {/* Keyword Cards */}
          <div className="space-y-3">
            {sorted.map((t, i) => {
              const zone = zoneConfig[t.rankZone];
              return (
                <div key={i} className={`rounded-xl border p-4 space-y-3 ${zone.bg} ${zone.border}`}>
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1 flex-wrap">
                        <Badge className={`${zone.bg} ${zone.color} ${zone.border}`}>
                          {zone.label} #{Math.round(t.position)}
                        </Badge>
                        <span className="font-mono text-sm font-bold text-foreground">{t.keyword}</span>
                        {!t.matchedArticle && (
                          <Badge variant="destructive" className="animate-pulse text-[10px]">GAP</Badge>
                        )}
                        {t.matchedArticle && !t.hasCRX && (
                          <Badge className="bg-yellow-500/20 text-yellow-400 border-yellow-500/30 text-[10px]">No CRX</Badge>
                        )}
                      </div>
                      {t.matchedArticle ? (
                        <a href={`/blog/${t.matchedArticle.slug}`} target="_blank" rel="noopener"
                          className="text-sm text-primary hover:underline truncate block">
                          {t.matchedArticle.title}
                        </a>
                      ) : (
                        <p className="text-sm text-destructive">No article found — content gap needs filling!</p>
                      )}
                    </div>
                    <div className="flex gap-4 text-center shrink-0">
                      <div>
                        <p className="text-lg font-bold text-foreground">{t.volume.toLocaleString()}</p>
                        <p className="text-[10px] text-muted-foreground flex items-center gap-1"><Search className="h-3 w-3" />Vol.</p>
                      </div>
                      <div>
                        <p className="text-lg font-bold text-foreground">{t.impressions.toLocaleString()}</p>
                        <p className="text-[10px] text-muted-foreground flex items-center gap-1"><Eye className="h-3 w-3" />Impr.</p>
                      </div>
                      <div>
                        <p className="text-lg font-bold text-foreground">{t.clicks}</p>
                        <p className="text-[10px] text-muted-foreground flex items-center gap-1"><MousePointer className="h-3 w-3" />Clicks</p>
                      </div>
                    </div>
                  </div>

                  {/* Health Bar */}
                  {t.matchedArticle && (
                    <div className="space-y-2">
                      <div className="flex items-center justify-between text-xs">
                        <span className="text-muted-foreground">Health Score</span>
                        <span className={`font-bold ${t.healthScore >= 80 ? "text-green-400" : t.healthScore >= 50 ? "text-yellow-400" : "text-destructive"}`}>
                          {t.healthScore}%
                        </span>
                      </div>
                      <Progress value={t.healthScore} className="h-2" />
                      <div className="flex flex-wrap gap-2 text-[10px]">
                        <span className={t.hasCanonical ? "text-green-400" : "text-destructive"}>
                          {t.hasCanonical ? "✓" : "✗"} Canonical
                        </span>
                        <span className={t.hasH1 ? "text-green-400" : "text-destructive"}>
                          {t.hasH1 ? "✓" : "✗"} H1
                        </span>
                        <span className={t.wordCount >= 1200 ? "text-green-400" : "text-yellow-400"}>
                          {t.wordCount} words
                        </span>
                        <span className={t.keywordDensity >= 1 && t.keywordDensity <= 2.5 ? "text-green-400" : "text-yellow-400"}>
                          KD: {t.keywordDensity.toFixed(2)}%
                        </span>
                        <span className={t.hasCRX ? "text-green-400" : "text-destructive"}>
                          {t.hasCRX ? "✓" : "✗"} CRX Download
                        </span>
                      </div>
                    </div>
                  )}

                  {/* Actions */}
                  {t.matchedArticle && (
                    <div className="flex gap-2">
                      <Button variant="outline" size="sm" className="gap-1 h-7 text-xs"
                        onClick={() => window.open(`/settings/seo/${t.matchedArticle!.slug}`, "_blank")}>
                        <BarChart3 className="h-3 w-3" /> SEO Optimize
                      </Button>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </>
      )}
    </div>
  );
}
