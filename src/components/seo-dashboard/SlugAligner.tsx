import { useState, useMemo } from "react";
import { AlertTriangle, CheckCircle, ArrowRight, RefreshCw, Download, ClipboardPaste } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

interface Article {
  id: string;
  title: string;
  slug: string;
  keywords?: string[] | null;
  status: string;
}

interface SlugSuggestion {
  article: Article;
  targetKeyword: string;
  currentSlug: string;
  suggestedSlug: string;
  isAligned: boolean;
  selected: boolean;
}

interface Props {
  articles: Article[];
  onRefresh: () => void;
}

function keywordToSlug(keyword: string): string {
  return keyword
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 120);
}

export default function SlugAligner({ articles, onRefresh }: Props) {
  const [keywordsInput, setKeywordsInput] = useState("");
  const [suggestions, setSuggestions] = useState<SlugSuggestion[]>([]);
  const [applying, setApplying] = useState(false);
  const [filter, setFilter] = useState<"all" | "misaligned" | "aligned">("all");
  const { toast } = useToast();

  const handleAnalyze = () => {
    const keywords = keywordsInput.split("\n").map(k => k.trim()).filter(Boolean);
    const results: SlugSuggestion[] = [];

    for (const keyword of keywords) {
      const idealSlug = keywordToSlug(keyword);
      // Find best matching article
      const kwNorm = keyword.toLowerCase();
      let bestArticle: Article | null = null;
      let bestScore = 0;

      for (const article of articles) {
        const titleNorm = article.title.toLowerCase();
        const slugNorm = article.slug.toLowerCase().replace(/-/g, " ");
        const keywordsNorm = (article.keywords || []).map(k => k.toLowerCase());

        let score = 0;
        if (keywordsNorm.includes(kwNorm)) score = 100;
        else if (titleNorm.includes(kwNorm)) score = 80;
        else if (slugNorm.includes(kwNorm.replace(/\s+/g, " "))) score = 70;
        else {
          const kwWords = kwNorm.split(" ");
          const overlap = kwWords.filter(w => titleNorm.includes(w) || slugNorm.includes(w)).length;
          score = (overlap / kwWords.length) * 50;
        }
        if (score > bestScore) { bestScore = score; bestArticle = article; }
      }

      if (bestArticle && bestScore >= 30) {
        const isAligned = bestArticle.slug === idealSlug || bestArticle.slug.includes(idealSlug);
        results.push({
          article: bestArticle,
          targetKeyword: keyword,
          currentSlug: bestArticle.slug,
          suggestedSlug: idealSlug,
          isAligned,
          selected: !isAligned,
        });
      }
    }

    setSuggestions(results);
    const misaligned = results.filter(r => !r.isAligned).length;
    toast({
      title: "Analysis Complete",
      description: `${misaligned} slugs need alignment out of ${results.length} matches`,
    });
  };

  const toggleSelection = (index: number) => {
    setSuggestions(prev => prev.map((s, i) => i === index ? { ...s, selected: !s.selected } : s));
  };

  const handleApply = async () => {
    const toApply = suggestions.filter(s => s.selected && !s.isAligned);
    if (toApply.length === 0) {
      toast({ title: "Nothing to apply", description: "No slugs selected for update" });
      return;
    }

    setApplying(true);
    let updated = 0;
    for (const item of toApply) {
      const { error } = await supabase
        .from("articles")
        .update({ slug: item.suggestedSlug })
        .eq("id", item.article.id);
      if (!error) updated++;
    }
    setApplying(false);
    toast({
      title: "Slugs Updated",
      description: `${updated}/${toApply.length} slugs aligned successfully`,
    });
    onRefresh();
  };

  const filtered = useMemo(() => {
    if (filter === "misaligned") return suggestions.filter(s => !s.isAligned);
    if (filter === "aligned") return suggestions.filter(s => s.isAligned);
    return suggestions;
  }, [suggestions, filter]);

  const stats = useMemo(() => ({
    total: suggestions.length,
    aligned: suggestions.filter(s => s.isAligned).length,
    misaligned: suggestions.filter(s => !s.isAligned).length,
  }), [suggestions]);

  const sampleKeywords = `chrome extensions android
ghostery chrome extension
idm extension for chrome
adblocker for android chrome
privacy badger chrome
pop up blocker for chrome
how to speed up chrome`;

  return (
    <div className="space-y-6">
      <div className="rounded-xl border border-border bg-card p-6 space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-lg font-semibold font-[family-name:var(--font-heading)] text-foreground">
              Target Keywords
            </h3>
            <p className="text-sm text-muted-foreground">
              Enter target keywords (one per line). We'll check if your article slugs match.
            </p>
          </div>
          <Button variant="outline" size="sm" onClick={() => setKeywordsInput(sampleKeywords)} className="gap-2">
            <ClipboardPaste className="h-4 w-4" />
            Load Sample
          </Button>
        </div>
        <Textarea
          value={keywordsInput}
          onChange={e => setKeywordsInput(e.target.value)}
          placeholder="chrome extensions android&#10;idm extension for chrome&#10;..."
          rows={6}
          className="font-mono text-sm bg-background"
        />
        <Button onClick={handleAnalyze} className="gap-2 bg-primary text-primary-foreground">
          <RefreshCw className="h-4 w-4" />
          Analyze Slugs
        </Button>
      </div>

      {suggestions.length > 0 && (
        <>
          <div className="grid grid-cols-3 gap-3">
            <div className="rounded-lg border border-border bg-card p-4 text-center">
              <p className="text-2xl font-bold font-[family-name:var(--font-heading)] text-foreground">{stats.total}</p>
              <p className="text-xs text-muted-foreground">Total Checked</p>
            </div>
            <div className="rounded-lg border border-green-500/30 bg-green-500/5 p-4 text-center">
              <p className="text-2xl font-bold font-[family-name:var(--font-heading)] text-green-400">{stats.aligned}</p>
              <p className="text-xs text-muted-foreground">Aligned ✓</p>
            </div>
            <div className="rounded-lg border border-destructive/30 bg-destructive/5 p-4 text-center">
              <p className="text-2xl font-bold font-[family-name:var(--font-heading)] text-destructive">{stats.misaligned}</p>
              <p className="text-xs text-muted-foreground">Need Fix</p>
            </div>
          </div>

          <div className="flex items-center justify-between">
            <div className="flex gap-2">
              {(["all", "misaligned", "aligned"] as const).map(f => (
                <Button key={f} variant={filter === f ? "default" : "outline"} size="sm" onClick={() => setFilter(f)} className="capitalize">
                  {f}
                </Button>
              ))}
            </div>
            {stats.misaligned > 0 && (
              <Button onClick={handleApply} disabled={applying} className="gap-2 bg-primary text-primary-foreground">
                {applying ? <RefreshCw className="h-4 w-4 animate-spin" /> : <CheckCircle className="h-4 w-4" />}
                Apply Selected ({suggestions.filter(s => s.selected && !s.isAligned).length})
              </Button>
            )}
          </div>

          <div className="rounded-xl border border-border overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow className="bg-secondary/50">
                  <TableHead className="w-12">✓</TableHead>
                  <TableHead>Target Keyword</TableHead>
                  <TableHead>Current Slug</TableHead>
                  <TableHead className="w-8"></TableHead>
                  <TableHead>Suggested Slug</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.map((s, i) => (
                  <TableRow key={i} className={!s.isAligned ? "bg-destructive/5" : ""}>
                    <TableCell>
                      {!s.isAligned && (
                        <input
                          type="checkbox"
                          checked={s.selected}
                          onChange={() => toggleSelection(suggestions.indexOf(s))}
                          className="rounded"
                        />
                      )}
                    </TableCell>
                    <TableCell className="font-mono text-sm">{s.targetKeyword}</TableCell>
                    <TableCell className="font-mono text-xs text-muted-foreground max-w-[200px] truncate">{s.currentSlug}</TableCell>
                    <TableCell><ArrowRight className="h-4 w-4 text-muted-foreground" /></TableCell>
                    <TableCell className="font-mono text-xs text-primary max-w-[200px] truncate">{s.suggestedSlug}</TableCell>
                    <TableCell>
                      {s.isAligned ? (
                        <Badge className="bg-green-500/20 text-green-400 border-green-500/30">
                          <CheckCircle className="h-3 w-3 mr-1" />Aligned
                        </Badge>
                      ) : (
                        <Badge className="bg-destructive/20 text-destructive border-destructive/30">
                          <AlertTriangle className="h-3 w-3 mr-1" />Misaligned
                        </Badge>
                      )}
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
