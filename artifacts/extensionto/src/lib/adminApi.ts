/**
 * adminApi.ts — typed fetch client for the Vite admin API middleware
 * All network errors are caught gracefully — never propagate to auth.
 */

export interface AdminStats {
  published:       number;
  drafts:          number;
  scheduled:       number;
  total:           number;
  categories:      Record<string, number>;
  recentPublished: AdminArticle[];
  recentDrafts:    AdminArticle[];
}

export interface AdminArticle {
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
  filePath:         string;
  canonicalPath:    string;
  tags?:            string[];
  keywords?:        string[];
  author?:          string;
  views?:           number;
}

export interface PageResult<T> {
  data:  T[];
  total: number;
  page:  number;
  pages: number;
  limit: number;
}

async function apiFetch<T>(url: string, opts?: RequestInit): Promise<T> {
  const res = await fetch(url, {
    ...opts,
    headers: { "Content-Type": "application/json", ...opts?.headers },
  });
  const json = await res.json();
  if (!res.ok) throw new Error(json?.error ?? `HTTP ${res.status}`);
  return json as T;
}

export const adminApi = {
  stats: () =>
    apiFetch<AdminStats>("/api/admin/stats"),

  articles: (params: { page?: number; limit?: number; q?: string; category?: string }) => {
    const sp = new URLSearchParams();
    if (params.page)     sp.set("page",     String(params.page));
    if (params.limit)    sp.set("limit",    String(params.limit));
    if (params.q)        sp.set("q",        params.q);
    if (params.category) sp.set("category", params.category);
    return apiFetch<PageResult<AdminArticle>>("/api/admin/articles?" + sp.toString());
  },

  drafts: (params: { page?: number; limit?: number; q?: string; category?: string; status?: string }) => {
    const sp = new URLSearchParams();
    if (params.page)     sp.set("page",     String(params.page));
    if (params.limit)    sp.set("limit",    String(params.limit));
    if (params.q)        sp.set("q",        params.q);
    if (params.category) sp.set("category", params.category);
    if (params.status)   sp.set("status",   params.status);
    return apiFetch<PageResult<AdminArticle>>("/api/admin/drafts?" + sp.toString());
  },

  publish: (slug: string) =>
    apiFetch<{ ok: boolean; slug: string; published_at: string }>(
      `/api/admin/articles/${slug}/publish`, { method: "POST", body: JSON.stringify({ published_at: new Date().toISOString() }) }
    ),

  unpublish: (slug: string) =>
    apiFetch<{ ok: boolean; slug: string }>(
      `/api/admin/articles/${slug}/unpublish`, { method: "POST" }
    ),

  schedule: (slug: string, scheduled_at: string) =>
    apiFetch<{ ok: boolean; slug: string; scheduled_at: string }>(
      `/api/admin/articles/${slug}/schedule`, { method: "POST", body: JSON.stringify({ scheduled_at }) }
    ),

  delete: (slug: string) =>
    apiFetch<{ ok: boolean; slug: string }>(
      `/api/admin/articles/${slug}`, { method: "DELETE" }
    ),

  bulk: (action: "publish" | "draft" | "delete", slugs: string[]) =>
    apiFetch<{ ok: boolean; results: Array<{ slug: string; ok: boolean; error?: string }> }>(
      "/api/admin/bulk", { method: "POST", body: JSON.stringify({ action, slugs }) }
    ),

  checkScheduled: () =>
    apiFetch<{ ok: boolean; published: string[] }>(
      "/api/admin/check-scheduled", { method: "POST" }
    ),
};
