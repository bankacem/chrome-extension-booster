import { useState, useMemo } from "react";
import { BarChart3, TrendingUp, TrendingDown, Minus, ClipboardPaste, Download, ExternalLink } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { useToast } from "@/hooks/use-toast";

interface CompetitorEntry {
  extension: string;
  ourPosition: number;
  storeRating: number;
  storeUsers: string;
  keyword: string;
  ourUrl: string;
  trend: "up" | "down" | "stable";
}

interface Article {
  id: string;
  title: string;
  slug: string;
}

interface Props {
  articles: Article[];
}

export default function CompetitorInsights({ articles }: Props) {
  const [rawInput, setRawInput] = useState("");
  const [entries, setEntries] = useState<CompetitorEntry[]>([]);
  const [sortBy, setSortBy] = useState<"position" | "rating" | "trend">("position");
  const { toast } = useToast();

  const handleParse = () => {
    const lines = rawInput.split("\n").filter(l => l.trim());
    const parsed: CompetitorEntry[] = lines.map(line => {
      const parts = line.split("\t").map(p => p.trim());
      const extensionName = parts[0] || "";
      const keyword = parts[1] || extensionName;
      const ourPosition = parseInt(parts[2]) || 0;
      const storeRating = parseFloat(parts[3]) || 0;
      const storeUsers = parts[4] || "N/A";
      const trendRaw = (parts[5] || "stable").toLowerCase();
      const trend: "up" | "down" | "stable" = trendRaw === "up" ? "up" : trendRaw === "down" ? "down" : "stable";

      // Find matching article
      const kwNorm = keyword.toLowerCase();
      const match = articles.find(a =>
        a.slug.includes(kwNorm.replace(/\s+/g, "-")) ||
        a.title.toLowerCase().includes(kwNorm)
      );

      return {
        extension: extensionName,
        ourPosition,
        storeRating,
        storeUsers,
        keyword,
        ourUrl: match ? `/blog/${match.slug}` : "",
        trend,
      };
    });

    setEntries(parsed);
    toast({ title: "Parsed", description: `${parsed.length} competitor entries loaded` });
  };

  const sorted = useMemo(() => {
    const copy = [...entries];
    if (sortBy === "position") copy.sort((a, b) => a.ourPosition - b.ourPosition);
    else if (sortBy === "rating") copy.sort((a, b) => b.storeRating - a.storeRating);
    else if (sortBy === "trend") {
      const order = { up: 0, stable: 1, down: 2 };
      copy.sort((a, b) => order[a.trend] - order[b.trend]);
    }
    return copy;
  }, [entries, sortBy]);

  const handleExport = () => {
    const csv = [
      ["Extension", "Keyword", "Our Position", "Store Rating", "Store Users", "Trend", "Our URL"].join(","),
      ...entries.map(e => [
        `"${e.extension}"`, `"${e.keyword}"`, e.ourPosition, e.storeRating, `"${e.storeUsers}"`, e.trend, e.ourUrl,
      ].join(","))
    ].join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "competitor-insights.csv";
    a.click();
    URL.revokeObjectURL(url);
  };

  const sampleData = `Ghostery\tghostery chrome extension\t50\t4.5\t2M+\tup
uBlock Origin\tadblocker for android chrome\t75\t4.7\t10M+\tstable
Privacy Badger\tprivacy badger chrome\t94\t4.3\t1M+\tdown
IDM Extension\tidm extension for chrome\t52\t4.1\t500K+\tup
Poper Blocker\tpop up blocker for chrome\t90\t4.4\t3M+\tstable`;

  const trendIcon = (trend: string) => {
    if (trend === "up") return <TrendingUp className="h-4 w-4 text-green-400" />;
    if (trend === "down") return <TrendingDown className="h-4 w-4 text-destructive" />;
    return <Minus className="h-4 w-4 text-muted-foreground" />;
  };

  return (
    <div className="space-y-6">
      <div className="rounded-xl border border-border bg-card p-6 space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-lg font-semibold font-[family-name:var(--font-heading)] text-foreground flex items-center gap-2">
              <BarChart3 className="h-5 w-5 text-primary" />
              Competitor Data
            </h3>
            <p className="text-sm text-muted-foreground">
              Tab-separated: Extension → Keyword → Our Position → Store Rating → Store Users → Trend (up/down/stable)
            </p>
          </div>
          <Button variant="outline" size="sm" onClick={() => setRawInput(sampleData)} className="gap-2">
            <ClipboardPaste className="h-4 w-4" />
            Load Sample
          </Button>
        </div>
        <Textarea
          value={rawInput}
          onChange={e => setRawInput(e.target.value)}
          placeholder="Paste competitor data here..."
          rows={6}
          className="font-mono text-sm bg-background"
        />
        <Button onClick={handleParse} className="gap-2 bg-primary text-primary-foreground">
          <BarChart3 className="h-4 w-4" />
          Analyze Competitors
        </Button>
      </div>

      {entries.length > 0 && (
        <>
          {/* Overview Cards */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <div className="rounded-lg border border-border bg-card p-4 text-center">
              <p className="text-2xl font-bold font-[family-name:var(--font-heading)] text-foreground">{entries.length}</p>
              <p className="text-xs text-muted-foreground">Extensions Tracked</p>
            </div>
            <div className="rounded-lg border border-green-500/30 bg-green-500/5 p-4 text-center">
              <p className="text-2xl font-bold font-[family-name:var(--font-heading)] text-green-400">
                {entries.filter(e => e.ourPosition <= 20).length}
              </p>
              <p className="text-xs text-muted-foreground">Page 1-2</p>
            </div>
            <div className="rounded-lg border border-primary/30 bg-primary/5 p-4 text-center">
              <p className="text-2xl font-bold font-[family-name:var(--font-heading)] text-primary">
                {entries.filter(e => e.trend === "up").length}
              </p>
              <p className="text-xs text-muted-foreground">Trending Up</p>
            </div>
            <div className="rounded-lg border border-destructive/30 bg-destructive/5 p-4 text-center">
              <p className="text-2xl font-bold font-[family-name:var(--font-heading)] text-destructive">
                {entries.filter(e => e.trend === "down").length}
              </p>
              <p className="text-xs text-muted-foreground">Declining</p>
            </div>
          </div>

          <div className="flex items-center justify-between">
            <div className="flex gap-2">
              {(["position", "rating", "trend"] as const).map(s => (
                <Button key={s} variant={sortBy === s ? "default" : "outline"} size="sm" onClick={() => setSortBy(s)} className="capitalize">
                  {s}
                </Button>
              ))}
            </div>
            <Button variant="outline" size="sm" onClick={handleExport} className="gap-2">
              <Download className="h-4 w-4" />
              Export CSV
            </Button>
          </div>

          <div className="rounded-xl border border-border overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow className="bg-secondary/50">
                  <TableHead>Extension</TableHead>
                  <TableHead>Target Keyword</TableHead>
                  <TableHead className="text-center">Our Pos.</TableHead>
                  <TableHead className="text-center">Store ★</TableHead>
                  <TableHead>Users</TableHead>
                  <TableHead className="text-center">Trend</TableHead>
                  <TableHead>Our Page</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {sorted.map((e, i) => (
                  <TableRow key={i}>
                    <TableCell className="font-medium">{e.extension}</TableCell>
                    <TableCell className="font-mono text-sm text-muted-foreground">{e.keyword}</TableCell>
                    <TableCell className="text-center">
                      <Badge className={
                        e.ourPosition <= 10 ? "bg-green-500/20 text-green-400 border-green-500/30" :
                        e.ourPosition <= 30 ? "bg-yellow-500/20 text-yellow-400 border-yellow-500/30" :
                        "bg-destructive/20 text-destructive border-destructive/30"
                      }>
                        #{e.ourPosition}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-center text-yellow-400">{e.storeRating} ★</TableCell>
                    <TableCell className="text-sm text-muted-foreground">{e.storeUsers}</TableCell>
                    <TableCell className="text-center">{trendIcon(e.trend)}</TableCell>
                    <TableCell>
                      {e.ourUrl ? (
                        <a href={e.ourUrl} target="_blank" rel="noopener" className="text-primary hover:underline text-sm flex items-center gap-1">
                          <ExternalLink className="h-3 w-3" />
                          View
                        </a>
                      ) : (
                        <span className="text-xs text-muted-foreground">No match</span>
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
