import { useState, useMemo } from "react";
import { Search, Link as LinkIcon, CheckCircle, XCircle, ClipboardPaste, Download } from "lucide-react";
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

function normalizeText(text: string): string {
  return text.toLowerCase().replace(/[^a-z0-9\s]/g, "").replace(/\s+/g, " ").trim();
}

function scoreMatch(keyword: string, article: Article): { score: number; type: "exact" | "partial" | "slug" | "none" } {
  const normKw = normalizeText(keyword);
  const normTitle = normalizeText(article.title);
  const normSlug = normalizeText(article.slug.replace(/-/g, " "));
  const normKeywords = (article.keywords || []).map(k => normalizeText(k));

  // Exact match in keywords array
  if (normKeywords.includes(normKw)) return { score: 100, type: "exact" };
  // Exact match in slug
  if (normSlug === normKw) return { score: 95, type: "slug" };
  // Title contains keyword
  if (normTitle.includes(normKw)) return { score: 90, type: "exact" };
  // Slug contains keyword
  if (normSlug.includes(normKw)) return { score: 80, type: "slug" };
  // Keyword contains slug words
  const kwWords = normKw.split(" ");
  const slugWords = normSlug.split(" ");
  const titleWords = normTitle.split(" ");
  const slugOverlap = slugWords.filter(w => kwWords.includes(w)).length / Math.max(slugWords.length, 1);
  const titleOverlap = titleWords.filter(w => kwWords.includes(w)).length / Math.max(titleWords.length, 1);
  const bestOverlap = Math.max(slugOverlap, titleOverlap);
  if (bestOverlap >= 0.6) return { score: Math.round(bestOverlap * 70), type: "partial" };
  if (bestOverlap >= 0.3) return { score: Math.round(bestOverlap * 50), type: "partial" };
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
      // Support tab-separated: keyword\tvolume\tposition
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
      description: `${matched}/${results.length} keywords matched to articles`,
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
    exact: mappedResults.filter(r => r.matchType === "exact").length,
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

  const sampleData = `adblocker for android chrome\t250\t75
ghostery chrome extension\t500\t67
idm extension for chrome\t450\t52
chrome extensions android\t1800\t83
privacy badger chrome\t700\t94`;

  return (
    <div className="space-y-6">
      {/* Input Section */}
      <div className="rounded-xl border border-border bg-card p-6 space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-lg font-semibold font-[family-name:var(--font-heading)] text-foreground">
              Paste Keywords
            </h3>
            <p className="text-sm text-muted-foreground">
              One keyword per line. Supports tab-separated format: keyword → volume → position
            </p>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setRawInput(sampleData)}
            className="gap-2"
          >
            <ClipboardPaste className="h-4 w-4" />
            Load Sample
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
              { label: "Exact", value: stats.exact, color: "text-green-400" },
              { label: "Partial", value: stats.partial, color: "text-yellow-400" },
            ].map(s => (
              <div key={s.label} className="rounded-lg border border-border bg-card p-4 text-center">
                <p className={`text-2xl font-bold font-[family-name:var(--font-heading)] ${s.color}`}>{s.value}</p>
                <p className="text-xs text-muted-foreground">{s.label}</p>
              </div>
            ))}
          </div>

          {/* Filter */}
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
                  <TableHead>Matched Article</TableHead>
                  <TableHead className="w-20">Score</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.map((r, i) => (
                  <TableRow key={i} className={!r.matchedArticle ? "bg-destructive/5" : ""}>
                    <TableCell className="font-mono text-sm">{r.keyword}</TableCell>
                    <TableCell className="text-muted-foreground">{r.volume}</TableCell>
                    <TableCell className="text-muted-foreground">{r.position}</TableCell>
                    <TableCell>
                      {r.matchType === "exact" && <Badge className="bg-green-500/20 text-green-400 border-green-500/30">Exact</Badge>}
                      {r.matchType === "slug" && <Badge className="bg-blue-500/20 text-blue-400 border-blue-500/30">Slug</Badge>}
                      {r.matchType === "partial" && <Badge className="bg-yellow-500/20 text-yellow-400 border-yellow-500/30">Partial</Badge>}
                      {r.matchType === "none" && <Badge variant="destructive">None</Badge>}
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
                        <div className="flex items-center gap-2 text-muted-foreground">
                          <XCircle className="h-4 w-4 text-destructive shrink-0" />
                          <span className="text-sm">No match found</span>
                        </div>
                      )}
                    </TableCell>
                    <TableCell>
                      <span className={`text-sm font-medium ${r.matchScore >= 80 ? "text-green-400" : r.matchScore >= 40 ? "text-yellow-400" : "text-destructive"}`}>
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
