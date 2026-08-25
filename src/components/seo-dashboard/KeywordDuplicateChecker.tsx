import { useState, useMemo, useEffect } from "react";
import { AlertTriangle, Search, CheckCircle, Link as LinkIcon } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";

interface Article {
  id: string;
  title: string;
  slug: string;
  keywords?: string[] | null;
}

interface Props {
  articles: Article[];
}

interface KeywordEntry {
  keyword: string;
  articles: { id: string; title: string; slug: string }[];
}

export default function KeywordDuplicateChecker({ articles }: Props) {
  const [searchKeyword, setSearchKeyword] = useState("");

  // Build full keyword map
  const keywordMap = useMemo(() => {
    const map = new Map<string, { id: string; title: string; slug: string }[]>();

    for (const article of articles) {
      const keywords = article.keywords || [];
      for (const kw of keywords) {
        const norm = kw.toLowerCase().trim();
        if (!norm) continue;
        if (!map.has(norm)) map.set(norm, []);
        map.get(norm)!.push({ id: article.id, title: article.title, slug: article.slug });
      }

      // Also index slug words as implicit keywords
      const slugWords = article.slug.split("-").filter(w => w.length > 3).join(" ");
      if (slugWords) {
        const norm = slugWords.toLowerCase();
        if (!map.has(norm)) map.set(norm, []);
        const existing = map.get(norm)!;
        if (!existing.some(a => a.id === article.id)) {
          existing.push({ id: article.id, title: article.title, slug: article.slug });
        }
      }
    }

    return map;
  }, [articles]);

  // Duplicates: keywords used in 2+ articles
  const duplicates = useMemo(() => {
    const result: KeywordEntry[] = [];
    keywordMap.forEach((arts, keyword) => {
      if (arts.length > 1) {
        result.push({ keyword, articles: arts });
      }
    });
    return result.sort((a, b) => b.articles.length - a.articles.length);
  }, [keywordMap]);

  // Live search check
  const searchResults = useMemo(() => {
    if (!searchKeyword.trim()) return null;
    const norm = searchKeyword.toLowerCase().trim();
    const matches: KeywordEntry[] = [];

    keywordMap.forEach((arts, keyword) => {
      if (keyword.includes(norm) || norm.includes(keyword)) {
        matches.push({ keyword, articles: arts });
      }
    });

    return matches;
  }, [searchKeyword, keywordMap]);

  return (
    <div className="space-y-6">
      {/* Live Keyword Check */}
      <div className="rounded-xl border border-border bg-card p-6 space-y-4">
        <h3 className="text-lg font-semibold font-[family-name:var(--font-heading)]">
          SEO Shield — Duplicate Keyword Prevention
        </h3>
        <p className="text-sm text-muted-foreground">
          Enter a target keyword before writing. The system checks all {articles.length} articles instantly.
        </p>

        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            value={searchKeyword}
            onChange={e => setSearchKeyword(e.target.value)}
            placeholder="Enter target keyword to check..."
            className="pl-10 bg-background text-lg h-12"
          />
        </div>

        {searchResults && searchResults.length > 0 && (
          <div className="rounded-lg border-2 border-destructive bg-destructive/10 p-4 space-y-3">
            <div className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-destructive" />
              <span className="font-bold text-destructive text-sm uppercase tracking-wider">
                ⚠️ Keyword Conflict Detected!
              </span>
            </div>
            {searchResults.map(sr => (
              <div key={sr.keyword} className="space-y-1">
                <p className="text-sm font-medium">
                  Keyword "<span className="text-destructive font-bold">{sr.keyword}</span>" is already targeted in:
                </p>
                {sr.articles.map(a => (
                  <a
                    key={a.id}
                    href={`/blog/${a.slug}`}
                    target="_blank"
                    rel="noopener"
                    className="flex items-center gap-2 text-sm text-primary hover:underline pl-4"
                  >
                    <LinkIcon className="h-3 w-3" />
                    {a.title}
                  </a>
                ))}
              </div>
            ))}
            <p className="text-xs text-destructive font-semibold mt-2">
              Avoid duplicate SEO targeting! Use a unique angle or merge with the existing article.
            </p>
          </div>
        )}

        {searchResults && searchResults.length === 0 && searchKeyword.trim() && (
          <div className="rounded-lg border-2 border-green-500 bg-green-500/10 p-4 flex items-center gap-3">
            <CheckCircle className="h-5 w-5 text-green-500" />
            <span className="text-green-500 font-bold text-sm">
              ✅ Keyword is unique! Safe to create a new article targeting "{searchKeyword}".
            </span>
          </div>
        )}
      </div>

      {/* Full Keyword Map */}
      <div className="rounded-xl border border-border bg-card p-6 space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-semibold font-[family-name:var(--font-heading)]">
            Full Keyword Map
          </h3>
          <Badge variant="outline" className="gap-1">
            {duplicates.length} duplicates found
          </Badge>
        </div>

        {duplicates.length > 0 ? (
          <div className="rounded-xl border border-border overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow className="bg-secondary/50">
                  <TableHead>Keyword</TableHead>
                  <TableHead className="w-16 text-center">Count</TableHead>
                  <TableHead>Conflicting Articles</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {duplicates.map(d => (
                  <TableRow key={d.keyword} className="bg-destructive/5">
                    <TableCell className="font-mono text-sm font-medium">{d.keyword}</TableCell>
                    <TableCell className="text-center">
                      <Badge variant="destructive">{d.articles.length}</Badge>
                    </TableCell>
                    <TableCell>
                      <div className="space-y-1">
                        {d.articles.map(a => (
                          <a
                            key={a.id}
                            href={`/blog/${a.slug}`}
                            target="_blank"
                            rel="noopener"
                            className="block text-sm text-primary hover:underline truncate max-w-[400px]"
                          >
                            {a.title}
                          </a>
                        ))}
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        ) : (
          <div className="text-center py-8 text-muted-foreground">
            <CheckCircle className="h-8 w-8 mx-auto mb-2 text-green-500" />
            <p className="font-medium">No duplicate keywords detected across your content.</p>
          </div>
        )}
      </div>
    </div>
  );
}
