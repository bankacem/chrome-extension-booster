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

// Pass as `maxRetries` for mutations: 0 means no retries at all.
// A publish that succeeds server-side but whose response body was dropped
// must NOT be retried — the retry would return 404 "Draft not found",
// masking the fact that the publish actually succeeded.
const NO_RETRY = 0;

function sleep(ms: number) {
  return new Promise<void>((resolve) => setTimeout(resolve, ms));
}

/**
 * @param maxRetries  How many additional attempts are allowed after the first
 *                    failure. Pass NO_RETRY (0) for mutations so a successful
 *                    server-side operation that drops its response is never
 *                    replayed.
 */
async function apiFetch<T>(
  url: string,
  opts?: RequestInit,
  maxRetries = MAX_RETRIES,
  attempt = 0,
): Promise<T> {
  try {
    const res = await fetch(url, {
      ...opts,
      headers: { "Content-Type": "application/json", ...opts?.headers },
    });

    const text = await res.text();

    // Guard: Vite SPA fallback returns HTML — give a clear error instead of a
    // confusing JSON parse failure.
    if (text.trimStart().startsWith("<")) {
      throw new Error(
        `API returned HTML instead of JSON.\n` +
        `URL: ${url}\n` +
        `Origin: ${typeof window !== "undefined" ? window.location.origin : "unknown"}\n` +
        `Make sure the Vite dev server is running and the admin-api plugin has enforce: "pre".`,
      );
    }

    // Single parse point — never double-parse.
    let data: unknown;
    try {
      data = JSON.parse(text);
    } catch {
      throw new Error(
        `Invalid JSON from ${url}: ${text.slice(0, 120)}`,
      );
    }

    if (!res.ok) {
      throw new Error(
        (data as Record<string, string>)?.error ?? `HTTP ${res.status}`,
      );
    }

    return data as T;
  } catch (err) {
    if (attempt < maxRetries) {
      await sleep(RETRY_DELAY * Math.pow(2, attempt));
      return apiFetch<T>(url, opts, maxRetries, attempt + 1);
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
      { method: "POST", body: JSON.stringify({ published_at: new Date().toISOString() }) },
      NO_RETRY,
    ),

  /** Move a published article back to drafts */
  unpublish: (slug: string) =>
    apiFetch<{ ok: boolean; slug: string }>(
      `/api/admin/articles/${slug}/unpublish`,
      { method: "POST" },
      NO_RETRY,
    ),

  /** Schedule a draft to auto-publish at a future time */
  schedule: (slug: string, scheduled_at: string) =>
    apiFetch<{ ok: boolean; slug: string; scheduled_at: string }>(
      `/api/admin/articles/${slug}/schedule`,
      { method: "POST", body: JSON.stringify({ scheduled_at }) },
      NO_RETRY,
    ),

  /**
   * Patch an article's title, meta_description, and/or body in-place.
   * The article stays published/drafted — no unpublish required.
   * Slug is never changed.
   */
  update: (slug: string, patch: { title?: string; meta_description?: string; body?: string }) =>
    apiFetch<{ ok: boolean; slug: string; updated: string[]; updated_at: string }>(
      `/api/admin/articles/${slug}/update`,
      { method: "PATCH", body: JSON.stringify(patch) },
      NO_RETRY,
    ),

  /** Remove an article from the indexes (markdown file is never deleted) */
  delete: (slug: string) =>
    apiFetch<{ ok: boolean; slug: string }>(
      `/api/admin/articles/${slug}`,
      { method: "DELETE" },
      NO_RETRY,
    ),

  /** Bulk action across multiple slugs */
  bulk: (action: "publish" | "draft" | "delete", slugs: string[]) =>
    apiFetch<{ ok: boolean; results: Array<{ slug: string; ok: boolean; error?: string }> }>(
      "/api/admin/bulk",
      { method: "POST", body: JSON.stringify({ action, slugs }) },
      NO_RETRY,
    ),

  /** Check for scheduled articles that are now due and publish them */
  checkScheduled: () =>
    apiFetch<{ ok: boolean; published: string[] }>(
      "/api/admin/check-scheduled",
      { method: "POST" },
      NO_RETRY,
    ),

  /** Auto-publish up to `limit` scheduled articles, respecting daily quota */
  autoPublish: (limit = 2, triggered_by: "auto" | "manual" = "auto") =>
    apiFetch<{ ok: boolean; published: string[]; todayCount: number; dailyLimit: number; remaining: number; message?: string }>(
      "/api/admin/auto-publish",
      { method: "POST", body: JSON.stringify({ limit, triggered_by }) },
      NO_RETRY,
    ),

  /** Get the publish activity log (last 100 entries) */
  getPublishLog: () =>
    apiFetch<Array<{ slug: string; title: string; published_at: string; triggered_by: string; status: string; error?: string }>>(
      "/api/admin/publish-log",
    ),

  /** Get the scheduled articles queue + today's publish count */
  getScheduleQueue: () =>
    apiFetch<{ queue: Array<{ id: string; slug: string; title: string; category?: string; scheduled_at: string }>; todayPublished: number }>(
      "/api/admin/schedule-queue",
    ),

  /** Get the daily auto-scheduler status (last run, next run, queue size) */
  getSchedulerStatus: () =>
    apiFetch<{
      last_run: string | null;
      last_published: string[];
      next_run: string;
      queued_articles_count: number;
      daily_limit: number;
      published_today: number;
      runs_total: number;
    }>("/api/admin/scheduler/status"),

  /** Manually trigger the daily scheduler (for testing) — NO_RETRY safe */
  triggerScheduler: () =>
    apiFetch<{ ok: boolean; message: string }>(
      "/api/admin/scheduler/run",
      { method: "POST" },
      NO_RETRY,
    ),

  /**
   * Force-publish the next N scheduled articles immediately, ignoring scheduled time.
   * Designed for manual override — bypasses daily limit and due-time checks.
   */
  forcePublish: (limit = 2) =>
    apiFetch<{ ok: boolean; published: string[]; message?: string }>(
      "/api/admin/force-publish",
      { method: "POST", body: JSON.stringify({ limit }) },
      NO_RETRY,
    ),
};
