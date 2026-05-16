import { useState, useMemo } from "react";
import { Search, CheckCircle, XCircle, Download, FilePlus, Zap } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";

interface Article {
  id: string;
  title: string;
  slug: string;
  keywords?: string[] | null;
  category?: string | null;
  views?: number | null;
  status: string;
}

interface MappedKeyword {
  keyword: string;
  volume: string;
  position: string;
  matchedArticle: Article | null;
  matchScore: number;
  matchType: "exact" | "partial" | "slug" | "none";
}

interface Props {
  articles: Article[];
}

// Synonym groups — if any member matches, all members count as matched
const SYNONYM_GROUPS: string[][] = [
  ["facebook pixel helper", "meta pixel helper", "fb pixel helper"],
  ["idm extension", "internet download manager extension", "idm chrome extension", "idm integration module"],
  ["adblocker for android chrome", "adblock chrome android", "ad blocker android chrome", "extension google chrome adblock android"],
  ["ghostery chrome extension", "ghostery extension chrome", "extension chrome ghostery"],
  ["privacy badger chrome", "privacy badger extension"],
  ["vpn extension chrome", "vpn extension to chrome"],
  ["grammarly extension chrome", "grammarly extension to chrome", "extension grammaire chrome"],
  ["google translate extension chrome", "google translate extension to chrome", "google trad plugin"],
  ["chatgpt extension chrome", "chatgpt extension to chrome"],
  ["noscript chrome", "noscript chrome extension"],
  ["dark mode chrome", "auto dark mode chrome", "dark mode extension chrome"],
];

function normalizeText(text: string): string {
  return text.toLowerCase().replace(/[^a-z0-9\s]/g, "").replace(/\s+/g, " ").trim();
}

function getSynonyms(keyword: string): string[] {
  const norm = normalizeText(keyword);
  for (const group of SYNONYM_GROUPS) {
    if (group.some(s => normalizeText(s) === norm)) {
      return group.map(normalizeText);
    }
  }
  return [norm];
}

function scoreMatch(keyword: string, article: Article): { score: number; type: "exact" | "partial" | "slug" | "none" } {
  const normKw = normalizeText(keyword);
  const synonyms = getSynonyms(keyword);
  const normTitle = normalizeText(article.title);
  const normSlug = normalizeText(article.slug.replace(/-/g, " "));
  const normKeywords = (article.keywords || []).map(k => normalizeText(k));

  // Check all synonyms against article data
  for (const syn of synonyms) {
    // Exact match in keywords array
    if (normKeywords.includes(syn)) return { score: 100, type: "exact" };
    // Exact slug match
    if (normSlug === syn) return { score: 100, type: "exact" };
    // Title contains keyword
    if (normTitle.includes(syn)) return { score: 95, type: "exact" };
    // Slug contains keyword
    if (normSlug.includes(syn)) return { score: 90, type: "slug" };
  }

  // Word overlap scoring
  const kwWords = normKw.split(" ");
  const slugWords = normSlug.split(" ");
  const titleWords = normTitle.split(" ");
  const keywordWords = normKeywords.flatMap(k => k.split(" "));

  const allArticleWords = new Set([...slugWords, ...titleWords, ...keywordWords]);
  const matchingWords = kwWords.filter(w => w.length > 2 && allArticleWords.has(w));
  const overlap = matchingWords.length / Math.max(kwWords.length, 1);

  if (overlap >= 0.8) return { score: Math.round(overlap * 85), type: "partial" };
  if (overlap >= 0.5) return { score: Math.round(overlap * 70), type: "partial" };
  if (overlap >= 0.3) return { score: Math.round(overlap * 50), type: "partial" };
  return { score: 0, type: "none" };
}

export default function KeywordMapper({ articles }: Props) {
  const [rawInput, setRawInput] = useState("");
  const [mappedResults, setMappedResults] = useState<MappedKeyword[]>([]);
  const [filter, setFilter] = useState("");
  const { toast } = useToast();

  const handleMap = () => {
    const lines = rawInput.split("\n").filter(l => l.trim());
    const results: MappedKeyword[] = lines.map(line => {
      const parts = line.split("\t").map(p => p.trim());
      const keyword = parts[0] || line.trim();
      const volume = parts[1] || "-";
      const position = parts[2] || "-";

      let bestMatch: Article | null = null;
      let bestScore = 0;
      let bestType: "exact" | "partial" | "slug" | "none" = "none";

      for (const article of articles) {
        const { score, type } = scoreMatch(keyword, article);
        if (score > bestScore) {
          bestScore = score;
          bestMatch = article;
          bestType = type;
        }
      }

      return {
        keyword,
        volume,
        position,
        matchedArticle: bestScore >= 25 ? bestMatch : null,
        matchScore: bestScore,
        matchType: bestScore >= 25 ? bestType : "none",
      };
    });

    setMappedResults(results);
    const matched = results.filter(r => r.matchedArticle).length;
    toast({
      title: "Mapping Complete",
      description: `${matched}/${results.length} keywords matched to articles (from ${articles.length} local articles)`,
    });
  };

  const filtered = useMemo(() => {
    if (!filter) return mappedResults;
    const f = filter.toLowerCase();
    return mappedResults.filter(r =>
      r.keyword.toLowerCase().includes(f) ||
      r.matchedArticle?.title.toLowerCase().includes(f)
    );
  }, [mappedResults, filter]);

  const stats = useMemo(() => ({
    total: mappedResults.length,
    matched: mappedResults.filter(r => r.matchedArticle).length,
    unmatched: mappedResults.filter(r => !r.matchedArticle).length,
    winners: mappedResults.filter(r => r.matchScore >= 90).length,
    partial: mappedResults.filter(r => r.matchType === "partial").length,
  }), [mappedResults]);

  const handleExport = () => {
    const csv = [
      ["Keyword", "Volume", "Position", "Match Type", "Score", "Article Title", "Slug"].join(","),
      ...mappedResults.map(r => [
        `"${r.keyword}"`, r.volume, r.position, r.matchType, r.matchScore,
        `"${r.matchedArticle?.title || ""}"`, r.matchedArticle?.slug || "",
      ].join(","))
    ].join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "keyword-mapping.csv";
    a.click();
    URL.revokeObjectURL(url);
  };

  const targetKeywords = `adblocker for android chrome\t250\t75
idm extension\t450\t52
ghostery chrome extension\t500\t67
facebook pixel helper\t350\t88
privacy badger chrome\t700\t94
internet download manager extension\t300\t60
meta pixel helper\t200\t45
vpn extension chrome\t600\t30
grammarly extension chrome\t400\t40
google translate extension chrome\t350\t55
chatgpt extension chrome\t800\t35
noscript chrome\t150\t70
dark mode chrome\t900\t25
extension chrome android\t250\t80
chrome web store extensions\t500\t50
add extension to chrome\t400\t60
best chrome extensions privacy\t300\t45
idm chrome extension\t350\t55
adblock chrome android\t200\t65`;

  const handleCopyDraft = (keyword: string) => {
    const draft = `Draft Request: New Article
Target Keyword: ${keyword}
Primary Goal: Informative guide & Direct Download Utility
Requirements:
- Minimum 1200 words
- SEO Title: Optimized for "${keyword}"
- Meta Description: High-CTR conversion focused
- Must include 'Direct Download Section' for CRX files
- Clear H2/H3 structure with technical depth`;

    navigator.clipboard.writeText(draft);
    toast({
      title: "Draft Copied",
      description: `Draft request for "${keyword}" copied to clipboard.`,
    });
  };

  return (
    <div className="space-y-6">
      {/* Source indicator */}
      <div className="flex items-center gap-2 text-xs text-muted-foreground bg-secondary/30 rounded-lg px-3 py-2 border border-border">
        <Zap className="h-3.5 w-3.5 text-primary" />
        Data Source: <strong className="text-foreground">Local Markdown Index</strong> — {articles.length} articles loaded from articles-index.json
      </div>

      {/* Input Section */}
      <div className="rounded-xl border border-border bg-card p-6 space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-lg font-semibold font-[family-name:var(--font-heading)] text-foreground">
              Keyword Mapping & Gap Identification
            </h3>
            <p className="text-sm text-muted-foreground">
              Map target keywords against {articles.length} local Markdown articles. Synonyms are auto-linked.
            </p>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setRawInput(targetKeywords)}
            className="gap-2 border-primary/50 text-primary hover:bg-primary/5"
          >
            <Zap className="h-4 w-4" />
            Load 19 Target Keywords
          </Button>
        </div>
        <Textarea
          value={rawInput}
          onChange={e => setRawInput(e.target.value)}
          placeholder={`adblocker for android chrome\t250\t75\nghostery chrome extension\t500\t67`}
          rows={8}
          className="font-mono text-sm bg-background"
        />
        <div className="flex gap-3">
          <Button onClick={handleMap} className="gap-2 bg-primary text-primary-foreground">
            <Search className="h-4 w-4" />
            Map Keywords ({rawInput.split("\n").filter(l => l.trim()).length})
          </Button>
          {mappedResults.length > 0 && (
            <Button variant="outline" onClick={handleExport} className="gap-2">
              <Download className="h-4 w-4" />
              Export CSV
            </Button>
          )}
        </div>
      </div>

      {/* Stats */}
      {mappedResults.length > 0 && (
        <>
          <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
            {[
              { label: "Total", value: stats.total, color: "text-foreground" },
              { label: "Matched", value: stats.matched, color: "text-primary" },
              { label: "Unmatched", value: stats.unmatched, color: "text-destructive" },
              { label: "Winners (90%+)", value: stats.winners, color: "text-green-400" },
              { label: "Partial", value: stats.partial, color: "text-yellow-400" },
            ].map(s => (
              <div key={s.label} className="rounded-lg border border-border bg-card p-4 text-center">
                <p className={`text-2xl font-bold font-[family-name:var(--font-heading)] ${s.color}`}>{s.value}</p>
                <p className="text-xs text-muted-foreground">{s.label}</p>
              </div>
            ))}
          </div>

          <Input
            value={filter}
            onChange={e => setFilter(e.target.value)}
            placeholder="Filter results..."
            className="max-w-sm bg-background"
          />

          {/* Results Table */}
          <div className="rounded-xl border border-border overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow className="bg-secondary/50">
                  <TableHead>Keyword</TableHead>
                  <TableHead className="w-20">Vol.</TableHead>
                  <TableHead className="w-20">Pos.</TableHead>
                  <TableHead className="w-24">Match</TableHead>
                  <TableHead>Matched Article / Gap Action</TableHead>
                  <TableHead className="w-20">Score</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.map((r, i) => (
                  <TableRow key={i} className={!r.matchedArticle ? "bg-destructive/10" : ""}>
                    <TableCell className="font-mono text-sm font-medium">{r.keyword}</TableCell>
                    <TableCell className="text-muted-foreground font-mono text-xs">{r.volume}</TableCell>
                    <TableCell className="text-muted-foreground font-mono text-xs">{r.position}</TableCell>
                    <TableCell>
                      {r.matchScore >= 90 && <Badge className="bg-green-500/20 text-green-400 border-green-500/30">Winner</Badge>}
                      {r.matchScore >= 50 && r.matchScore < 90 && <Badge className="bg-blue-500/20 text-blue-400 border-blue-500/30">Strong</Badge>}
                      {r.matchScore >= 25 && r.matchScore < 50 && <Badge className="bg-yellow-500/20 text-yellow-400 border-yellow-500/30">Partial</Badge>}
                      {r.matchType === "none" && <Badge variant="destructive" className="animate-pulse">GAP</Badge>}
                    </TableCell>
                    <TableCell>
                      {r.matchedArticle ? (
                        <div className="flex items-center gap-2">
                          <CheckCircle className="h-4 w-4 text-green-400 shrink-0" />
                          <a
                            href={`/blog/${r.matchedArticle.slug}`}
                            target="_blank"
                            rel="noopener"
                            className="text-sm text-primary hover:underline truncate max-w-[300px]"
                          >
                            {r.matchedArticle.title}
                          </a>
                        </div>
                      ) : (
                        <div className="flex items-center justify-between gap-4">
                          <div className="flex items-center gap-2 text-destructive">
                            <XCircle className="h-4 w-4 shrink-0" />
                            <span className="text-xs font-semibold uppercase tracking-wider">Gap Identified</span>
                          </div>
                          <Button
                            variant="secondary"
                            size="sm"
                            className="h-7 gap-1.5 text-[10px] bg-primary/10 text-primary hover:bg-primary/20"
                            onClick={() => handleCopyDraft(r.keyword)}
                          >
                            <FilePlus className="h-3 w-3" />
                            Generate Draft Request
                          </Button>
                        </div>
                      )}
                    </TableCell>
                    <TableCell>
                      <span className={`text-sm font-bold ${r.matchScore >= 90 ? "text-green-400" : r.matchScore >= 50 ? "text-blue-400" : r.matchScore >= 25 ? "text-yellow-400" : "text-destructive"}`}>
                        {r.matchScore}%
                      </span>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </>
      )}
    </div>
  );
}
