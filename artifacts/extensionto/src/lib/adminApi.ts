/**
 * adminApi.ts — Write-only API client for admin mutations.
 *
 * READ operations (stats, article lists, draft lists) have been moved to
 * content-store.ts which reads static JSON files directly — those never
 * go through the Vite middleware and can never return HTML.
 *
 * This file only handles mutations that must write to disk:
 *   publish / unpublish / schedule / delete / bulk / checkScheduled
 */

const MAX_RETRIES = 2;
const RETRY_DELAY = 600; // ms base — doubles each retry

function sleep(ms: number) {
  return new Promise<void>((resolve) => setTimeout(resolve, ms));
}

async function apiFetch<T>(url: string, opts?: RequestInit, attempt = 0): Promise<T> {
  try {
    const res = await fetch(url, {
      ...opts,
      headers: { "Content-Type": "application/json", ...opts?.headers },
    });
    const text = await res.text();
    // Guard: if the middleware returned HTML (SPA fallback), give a clear error
    if (text.trimStart().startsWith("<")) {
      throw new Error("API returned HTML instead of JSON — the dev server middleware may not be running.");
    }
    let json: unknown;
    try { json = JSON.parse(text); } catch { throw new Error(`Invalid JSON from ${url}`); }
    if (!res.ok) throw new Error((json as Record<string,string>)?.error ?? `HTTP ${res.status}`);
    return json as T;
  } catch (err) {
    if (attempt < MAX_RETRIES) {
      await sleep(RETRY_DELAY * Math.pow(2, attempt));
      return apiFetch<T>(url, opts, attempt + 1);
    }
    const raw = err instanceof Error ? err.message : String(err);
    const clean = raw.toLowerCase().includes("failed to fetch")
      ? "Could not reach the dev server. Make sure `pnpm dev` is running."
      : raw;
    throw new Error(clean);
  }
}

export const adminApi = {
  /** Publish a draft: updates markdown frontmatter + moves to articles-index.json + regenerates sitemap */
  publish: (slug: string) =>
    apiFetch<{ ok: boolean; slug: string; published_at: string }>(
      `/api/admin/articles/${slug}/publish`,
      { method: "POST", body: JSON.stringify({ published_at: new Date().toISOString() }) }
    ),

  /** Move a published article back to drafts */
  unpublish: (slug: string) =>
    apiFetch<{ ok: boolean; slug: string }>(
      `/api/admin/articles/${slug}/unpublish`,
      { method: "POST" }
    ),

  /** Schedule a draft to auto-publish at a future time */
  schedule: (slug: string, scheduled_at: string) =>
    apiFetch<{ ok: boolean; slug: string; scheduled_at: string }>(
      `/api/admin/articles/${slug}/schedule`,
      { method: "POST", body: JSON.stringify({ scheduled_at }) }
    ),

  /** Remove an article from the indexes (markdown file is never deleted) */
  delete: (slug: string) =>
    apiFetch<{ ok: boolean; slug: string }>(
      `/api/admin/articles/${slug}`,
      { method: "DELETE" }
    ),

  /** Bulk action across multiple slugs */
  bulk: (action: "publish" | "draft" | "delete", slugs: string[]) =>
    apiFetch<{ ok: boolean; results: Array<{ slug: string; ok: boolean; error?: string }> }>(
      "/api/admin/bulk",
      { method: "POST", body: JSON.stringify({ action, slugs }) }
    ),

  /** Check for scheduled articles that are now due and publish them */
  checkScheduled: () =>
    apiFetch<{ ok: boolean; published: string[] }>(
      "/api/admin/check-scheduled",
      { method: "POST" }
    ),
};
