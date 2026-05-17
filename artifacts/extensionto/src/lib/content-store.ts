/**
 * content-store.ts — Local-first data layer for the admin system.
 *
 * Reads directly from static JSON files served by Vite's built-in file server.
 * These are NEVER routed through the custom API middleware, so they always
 * return proper JSON regardless of port/process state.
 *
 * Write operations (publish, unpublish, delete, schedule) still go through
 * the API middleware — they only run on explicit user action so a transient
 * failure there is surfaced clearly, not silently broken.
 */

export interface Article {
  id:               string;
  title:            string;
  slug:             string;
  category?:        string | null;
  status:           string;
  published_at?:    string | null;
  scheduled_at?:    string | null;
  created_at?:      string | null;
  updated_at?:      string | null;
  read_time?:       number;
  reading_time?:    number;
  word_count?:      number;
  featured_image?:  string | null;
  image_url?:       string;
  meta_description?: string;
  description?:     string;
  excerpt?:         string;
  filePath:         string;
  canonicalPath:    string;
  tags?:            string[];
  keywords?:        string[];
  author?:          string;
  views?:           number;
}

export interface Stats {
  published:       number;
  drafts:          number;
  scheduled:       number;
  total:           number;
  categories:      Record<string, number>;
  recentPublished: Article[];
  recentDrafts:    Article[];
}

export interface PageResult<T> {
  data:  T[];
  total: number;
  page:  number;
  pages: number;
  limit: number;
}

// ── In-memory cache ─────────────────────────────────────────────────────────
let _articles: Article[] | null = null;
let _drafts:   Article[] | null = null;

/** Bust the cache — call after any write operation so next read is fresh. */
export function invalidateCache(): void {
  _articles = null;
  _drafts   = null;
}

// ── Safe fetch — static files always return JSON, never HTML ─────────────────
async function loadJson<T>(url: string): Promise<T> {
  const res = await fetch(url, { cache: "no-store" });
  const text = await res.text();
  // Guard against Vite's SPA fallback returning HTML on 404
  if (text.trimStart().startsWith("<")) {
    throw new Error(`Static file ${url} returned HTML — expected JSON. Check the file exists in public/content/.`);
  }
  try {
    return JSON.parse(text) as T;
  } catch {
    throw new Error(`${url} is not valid JSON.`);
  }
}

// ── Public API ────────────────────────────────────────────────────────────────

export async function getAllArticles(fresh = false): Promise<Article[]> {
  if (_articles && !fresh) return _articles;
  const raw = await loadJson<Article[]>("/content/articles-index.json");
  // Normalize: older entries may lack a status field
  _articles = raw.map((a) => ({ ...a, status: a.status || "published" }));
  return _articles;
}

export async function getAllDrafts(fresh = false): Promise<Article[]> {
  if (_drafts && !fresh) return _drafts;
  _drafts = await loadJson<Article[]>("/content/drafts-index.json");
  return _drafts;
}

export async function getStats(fresh = false): Promise<Stats> {
  const [articles, drafts] = await Promise.all([
    getAllArticles(fresh),
    getAllDrafts(fresh),
  ]);
  const scheduled = drafts.filter((d) => d.status === "scheduled").length;
  const cats: Record<string, number> = {};
  for (const a of [...articles, ...drafts]) {
    if (a.category) cats[a.category] = (cats[a.category] || 0) + 1;
  }
  const sorted = [...articles].sort(
    (a, b) =>
      new Date(b.published_at ?? 0).getTime() -
      new Date(a.published_at ?? 0).getTime()
  );
  return {
    published:       articles.length,
    drafts:          drafts.filter((d) => d.status === "draft").length,
    scheduled,
    total:           articles.length + drafts.length,
    categories:      cats,
    recentPublished: sorted.slice(0, 10),
    recentDrafts:    drafts.slice(0, 10),
  };
}

// ── Filter + paginate helpers ─────────────────────────────────────────────────

export interface FilterOpts {
  q?:        string;
  category?: string;
  status?:   string;
}

export function filterArticles(items: Article[], opts: FilterOpts): Article[] {
  let result = items;
  if (opts.q) {
    const q = opts.q.toLowerCase();
    result = result.filter(
      (a) => a.title.toLowerCase().includes(q) || a.slug.includes(q)
    );
  }
  if (opts.category && opts.category !== "All") {
    result = result.filter((a) => a.category === opts.category);
  }
  if (opts.status && opts.status !== "all") {
    result = result.filter((a) => a.status === opts.status);
  }
  return result;
}

export function paginateArticles(
  items: Article[],
  page: number,
  limit: number
): PageResult<Article> {
  const total = items.length;
  const pages = Math.max(1, Math.ceil(total / limit));
  const safePage = Math.min(Math.max(1, page), pages);
  return {
    data:  items.slice((safePage - 1) * limit, safePage * limit),
    total,
    page:  safePage,
    pages,
    limit,
  };
}
