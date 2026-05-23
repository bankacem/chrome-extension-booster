import { defineConfig, type Plugin } from "vite";
import react from "@vitejs/plugin-react";
import path from "path";
import fs from "fs";
import type { IncomingMessage, ServerResponse } from "http";
import cron from "node-cron";

// ── Absolute paths ─────────────────────────────────────────────────────────────
const ARTICLES_DIR   = path.join(__dirname, "public/content/articles");
const DRAFTS_INDEX   = path.join(__dirname, "public/content/drafts-index.json");
const ARTICLES_INDEX = path.join(__dirname, "public/content/articles-index.json");
const PUBLISH_LOG    = path.join(__dirname, "public/content/publish-log.json");

interface PublishLogEntry {
  slug: string;
  title: string;
  published_at: string;
  triggered_by: "auto" | "manual" | "scheduled";
  status: "success" | "failed";
  error?: string;
}

function readPublishLog(): PublishLogEntry[] {
  try { return JSON.parse(fs.readFileSync(PUBLISH_LOG, "utf8")) as PublishLogEntry[]; }
  catch { return []; }
}

function appendPublishLog(entry: PublishLogEntry) {
  const log = readPublishLog();
  log.unshift(entry);
  fs.writeFileSync(PUBLISH_LOG, JSON.stringify(log.slice(0, 500), null, 2), "utf8");
}

// ── Frontmatter helpers ────────────────────────────────────────────────────────
function parseFm(content: string): Record<string, string> {
  const m = content.match(/^---([\s\S]*?)---/);
  if (!m) return {};
  const out: Record<string, string> = {};
  for (const line of m[1].split("\n")) {
    const kv = line.match(/^([a-zA-Z_][a-zA-Z0-9_]*):\s*(.*)/);
    if (!kv) continue;
    let v = kv[2].trim();
    if ((v.startsWith('"') && v.endsWith('"')) || (v.startsWith("'") && v.endsWith("'"))) v = v.slice(1, -1);
    out[kv[1]] = v;
  }
  return out;
}

function updateFm(content: string, updates: Record<string, string | null>): string {
  const m = content.match(/^---([\s\S]*?)---/);
  if (!m) return content;
  let fm = m[1];
  for (const [key, val] of Object.entries(updates)) {
    // FIX: match key line + any indented continuation lines (handles YAML block scalars like >- and |-)
    const re = new RegExp(`^${key}:[ \\t]*[^\\n]*(?:\\n[ \\t]+[^\\n]*)*`, "m");
    const line = val === null ? `${key}: null` : `${key}: "${val}"`;
    if (re.test(fm)) fm = fm.replace(re, line);
    else fm += `\n${line}`;
  }
  return content.replace(/^---([\s\S]*?)---/, `---${fm}---`);
}

// FIX: resolve article file path from slug (canonical) with fallback to index-stored path.
// Prevents silent skip when draft.filePath is stale or wrong.
function findArticleFile(slug: string, fallbackFilePath?: string | null): { absPath: string; relFilePath: string } | null {
  const norm = slug.toLowerCase().replace(/[^a-z0-9]/g, "-").replace(/-+/g, "-").replace(/^-|-$/g, "");
  const c1 = norm[0] || "_"; const c2 = norm[1] || "_"; const c3 = norm[2] || "_";
  const relPath = `/content/articles/${c1}/${c2}/${c3}/${norm}.md`;
  const absPath = path.join(__dirname, "public" + relPath);
  if (fs.existsSync(absPath)) return { absPath, relFilePath: relPath };
  if (fallbackFilePath) {
    const abs = path.join(__dirname, "public" + fallbackFilePath);
    if (fs.existsSync(abs)) return { absPath: abs, relFilePath: fallbackFilePath };
  }
  return null;
}

function readJson<T = unknown>(p: string): T {
  try { return JSON.parse(fs.readFileSync(p, "utf8")) as T; }
  catch { return [] as unknown as T; }
}
function writeJson(p: string, data: unknown) {
  fs.writeFileSync(p, JSON.stringify(data, null, 2), "utf8");
}

// ── Inline sitemap regeneration ───────────────────────────────────────────────
const SITEMAP_PATH  = path.join(__dirname, "public/sitemap.xml");
const WEBSITE_URL   = "https://extensionto.com";
const PILLAR_SLUGS  = new Set([
  "how-to-fix-chrome-high-memory-usage-2026-complete-guide",
  "adblock-chrome-android-complete-guide-2026",
  "best-chrome-screenshot-extensions-2026-complete-guide",
  "best-chrome-privacy-extensions-2026-complete-guide",
  "best-youtube-downloader-chrome-extension-2026",
  "best-chrome-extensions-for-privacy-2026-protect-your-online-identity",
  "chrome-extensions-on-android-2026-kiwi-vs-yandex-vs-lemur-full-guide",
  "best-full-page-screenshot-chrome-extension-2026-free-no-login-required",
]);
const DISQUALIFYING = new Set(["thin", "partial", "corrupted_slug"]);

function toDateStr(iso?: string | null) {
  if (!iso) return new Date().toISOString().split("T")[0];
  try { return new Date(iso).toISOString().split("T")[0]; } catch { return new Date().toISOString().split("T")[0]; }
}
function escXml(s: string) {
  return String(s).replace(/[<>&'"]/g, (c: string) => ({"<":"&lt;",">":"&gt;","&":"&amp;","'":"&apos;",'"':"&quot;"})[c]!);
}

function regenerateSitemap() {
  try {
    const articles: Art[] = readJson(ARTICLES_INDEX);
    const STATIC = [
      { url: "/",        changefreq: "weekly",  priority: "1.0" },
      { url: "/blog",    changefreq: "daily",   priority: "0.9" },
      { url: "/privacy", changefreq: "yearly",  priority: "0.3" },
      { url: "/terms",   changefreq: "yearly",  priority: "0.3" },
    ];
    const EXTENSIONS = [
      "quick-screenshot-lite","auto-dark-mode-switcher","redirect-shield",
      "protab-suspender","light-popup-blocker","formula-builder-pro",
      "securakey-pro","offline-reader-pro","cookie-banner-blocker",
    ];
    const articlePages = articles
      .filter((a) => {
        const flags: string[] = (a as unknown as Record<string,string[]>).quality_flags || [];
        return !flags.some((f) => DISQUALIFYING.has(f)) && !a.slug.includes("-partial");
      })
      .map((a) => {
        const isPillar = PILLAR_SLUGS.has(a.slug);
        const age = a.published_at ? Math.floor((Date.now() - new Date(a.published_at).getTime()) / 86400000) : 9999;
        const isNew = age < 30;
        return {
          url: `/blog/${a.slug}`,
          changefreq: isPillar || isNew ? "weekly" : "monthly",
          priority: isPillar ? "0.85" : isNew ? "0.8" : "0.7",
          lastmod: toDateStr((a as unknown as Record<string,string>).updated_at || a.published_at),
        };
      });
    const extPages = EXTENSIONS.map((s) => ({ url: `/extension/${s}`, changefreq: "monthly", priority: "0.9", lastmod: undefined as string | undefined }));
    const all = [...STATIC.map(p => ({...p, lastmod: undefined as string | undefined})), ...articlePages, ...extPages];
    const xml = `<?xml version="1.0" encoding="UTF-8"?>\n<?xml-stylesheet type="text/xsl" href="/sitemap.xsl"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${
      all.map((p) => `  <url>\n    <loc>${escXml(WEBSITE_URL + p.url)}</loc>\n    <changefreq>${p.changefreq}</changefreq>\n    <priority>${p.priority}</priority>${p.lastmod ? `\n    <lastmod>${p.lastmod}</lastmod>` : ""}\n  </url>`).join("\n")
    }\n</urlset>`;
    fs.writeFileSync(SITEMAP_PATH, xml, "utf8");
  } catch (e) {
    console.warn("[admin-api] sitemap regeneration failed (non-blocking):", e);
  }
}

interface Art {
  id: string; title: string; slug: string; category?: string | null;
  status: string; published_at?: string | null; scheduled_at?: string | null;
  created_at?: string | null; read_time?: number; word_count?: number;
  featured_image?: string | null; image_url?: string; filePath: string; canonicalPath: string;
  meta_description?: string; description?: string; excerpt?: string;
  author?: string; tags?: string[]; keywords?: string[];
  reading_time?: number; views?: number;
}

async function readBody(req: IncomingMessage): Promise<Record<string, unknown>> {
  return new Promise((resolve) => {
    let body = "";
    req.on("data", (c) => { body += c; });
    req.on("end", () => { try { resolve(JSON.parse(body)); } catch { resolve({}); } });
    req.on("error", () => resolve({}));
  });
}

async function doPublish(slug: string, publishedAt: string, res: ServerResponse) {
  console.log("[PUBLISH]", slug, "START");
  const drafts: Art[] = readJson(DRAFTS_INDEX);
  const draft = drafts.find((d) => d.slug === slug);
  if (!draft) { res.statusCode = 404; res.end(JSON.stringify({ error: "Draft not found" })); return; }

  const found = findArticleFile(slug, draft.filePath);
  if (found) {
    let c = fs.readFileSync(found.absPath, "utf8");
    c = updateFm(c, { status: "published", published_at: publishedAt, scheduled_at: null });
    fs.writeFileSync(found.absPath, c, "utf8");
  } else {
    // File missing — abort rather than writing a stale/broken index entry.
    console.warn(`[admin-api] publish: markdown file not found for slug "${slug}" (checked canonical + ${draft.filePath})`);
    if (!res.headersSent) {
      res.statusCode = 404;
      res.end(JSON.stringify({ error: `Markdown file not found for slug: ${slug}` }));
    }
    return;
  }

  const articles: Art[] = readJson(ARTICLES_INDEX);
  const resolvedFilePath = found?.relFilePath ?? draft.filePath;
  const entry: Art = {
    ...draft,
    status: "published",
    published_at: publishedAt,
    scheduled_at: null,
    filePath: resolvedFilePath,
    canonicalPath: `/blog/${slug}`,
    image_url: draft.featured_image || draft.image_url || `/images/blog/${slug}.webp`,
    featured_image: draft.featured_image || draft.image_url || `/images/blog/${slug}.webp`,
    reading_time: draft.read_time ?? draft.reading_time,
    views: draft.views ?? 0,
    updated_at: publishedAt,
  };
  const withoutSlug = articles.filter((a) => a.slug !== slug);
  withoutSlug.unshift(entry);
  writeJson(ARTICLES_INDEX, withoutSlug);
  writeJson(DRAFTS_INDEX, drafts.filter((d) => d.slug !== slug));

  // Respond FIRST, then defer sitemap regeneration via setImmediate so it runs
  // only after Node.js has fully flushed the response to the network.
  // This eliminates the race where synchronous fs work after res.end() delays
  // the TCP flush long enough for the browser to receive an empty body.
  if (!res.headersSent) res.end(JSON.stringify({ ok: true, slug, published_at: publishedAt }));
  console.log("[PUBLISH]", slug, "END");
  setImmediate(() => regenerateSitemap());
}

async function doUnpublish(slug: string, res: ServerResponse) {
  const articles: Art[] = readJson(ARTICLES_INDEX);
  const article = articles.find((a) => a.slug === slug);
  if (!article) { res.statusCode = 404; res.end(JSON.stringify({ error: "Not found" })); return; }

  const found = findArticleFile(slug, article.filePath);
  if (found) {
    let c = fs.readFileSync(found.absPath, "utf8");
    c = updateFm(c, { status: "draft", published_at: null });
    fs.writeFileSync(found.absPath, c, "utf8");
  } else {
    console.warn(`[admin-api] unpublish: markdown file not found for slug "${slug}"`);
  }
  writeJson(ARTICLES_INDEX, articles.filter((a) => a.slug !== slug));
  const drafts: Art[] = readJson(DRAFTS_INDEX);
  const draftEntry = { ...article, status: "draft", published_at: null, filePath: found?.relFilePath ?? article.filePath };
  const draftsWithout = drafts.filter((d) => d.slug !== slug);
  draftsWithout.unshift(draftEntry);
  writeJson(DRAFTS_INDEX, draftsWithout);
  if (!res.headersSent) res.end(JSON.stringify({ ok: true, slug }));
  setImmediate(() => regenerateSitemap());
}

async function doSchedule(slug: string, scheduledAt: string, res: ServerResponse) {
  const drafts: Art[] = readJson(DRAFTS_INDEX);
  const idx = drafts.findIndex((d) => d.slug === slug);
  if (idx === -1) { res.statusCode = 404; res.end(JSON.stringify({ error: "Draft not found" })); return; }

  // FIX: use findArticleFile to locate file reliably
  const found = findArticleFile(slug, drafts[idx].filePath);
  if (found) {
    let c = fs.readFileSync(found.absPath, "utf8");
    c = updateFm(c, { status: "scheduled", scheduled_at: scheduledAt });
    fs.writeFileSync(found.absPath, c, "utf8");
    drafts[idx] = { ...drafts[idx], status: "scheduled", scheduled_at: scheduledAt, filePath: found.relFilePath };
  } else {
    console.warn(`[admin-api] schedule: markdown file not found for slug "${slug}"`);
    drafts[idx] = { ...drafts[idx], status: "scheduled", scheduled_at: scheduledAt };
  }
  writeJson(DRAFTS_INDEX, drafts);
  res.end(JSON.stringify({ ok: true, slug, scheduled_at: scheduledAt }));
}

async function doUpdate(slug: string, patch: Record<string, string | null>, res: ServerResponse) {
  const updatedAt = new Date().toISOString();
  const updated: string[] = [];

  // ── 1. Locate the markdown file (published index first, then drafts) ──────
  const articles: Art[] = readJson(ARTICLES_INDEX);
  const drafts:   Art[] = readJson(DRAFTS_INDEX);
  const existing = articles.find((a) => a.slug === slug) ?? drafts.find((d) => d.slug === slug);
  if (!existing) {
    res.statusCode = 404;
    res.end(JSON.stringify({ error: `Article not found: ${slug}` }));
    return;
  }

  const found = findArticleFile(slug, existing.filePath);
  if (!found) {
    res.statusCode = 404;
    res.end(JSON.stringify({ error: `Markdown file not found for slug: ${slug}` }));
    return;
  }

  // ── 2. Read the file once ─────────────────────────────────────────────────
  let content = fs.readFileSync(found.absPath, "utf8");

  // ── 3. Patch frontmatter fields (title, meta_description, updated_at) ─────
  const fmPatch: Record<string, string | null> = { updated_at: updatedAt };
  if (typeof patch.title === "string" && patch.title.trim()) {
    fmPatch.title = patch.title.trim();
    updated.push("title");
  }
  if (typeof patch.meta_description === "string" && patch.meta_description.trim()) {
    fmPatch.meta_description = patch.meta_description.trim();
    updated.push("meta_description");
  }
  content = updateFm(content, fmPatch);

  // ── 4. Replace body (everything after the closing ---) if provided ─────────
  if (typeof patch.body === "string" && patch.body.trim()) {
    const fmEnd = content.indexOf("---", 3);
    if (fmEnd !== -1) {
      content = content.slice(0, fmEnd + 3) + "\n\n" + patch.body.trim() + "\n";
    }
    updated.push("body");
  }

  // ── 5. Write the file ─────────────────────────────────────────────────────
  fs.writeFileSync(found.absPath, content, "utf8");

  // ── 6. Respond immediately ────────────────────────────────────────────────
  if (!res.headersSent) {
    res.end(JSON.stringify({ ok: true, slug, updated, updated_at: updatedAt }));
  }

  // ── 7. Patch the index entry in-place (deferred — never blocks response) ──
  setImmediate(() => {
    try {
      const indexPatch: Partial<Art> = { updated_at: updatedAt } as unknown as Partial<Art>;
      if (fmPatch.title)            (indexPatch as unknown as Record<string,string>).title = fmPatch.title;
      if (fmPatch.meta_description) (indexPatch as unknown as Record<string,string>).meta_description = fmPatch.meta_description;

      const arts = readJson<Art[]>(ARTICLES_INDEX);
      const ai = arts.findIndex((a) => a.slug === slug);
      if (ai !== -1) {
        arts[ai] = { ...arts[ai], ...indexPatch };
        writeJson(ARTICLES_INDEX, arts);
      } else {
        const drfs = readJson<Art[]>(DRAFTS_INDEX);
        const di = drfs.findIndex((d) => d.slug === slug);
        if (di !== -1) {
          drfs[di] = { ...drfs[di], ...indexPatch };
          writeJson(DRAFTS_INDEX, drfs);
        }
      }
    } catch (e) {
      console.warn("[admin-api] update: index patch failed (non-blocking):", e);
    }
  });
}

async function doDelete(slug: string, res: ServerResponse) {
  // Remove from both indexes (never deletes the markdown file — it stays on disk)
  const drafts: Art[] = readJson(DRAFTS_INDEX);
  writeJson(DRAFTS_INDEX, drafts.filter((d) => d.slug !== slug));
  const articles: Art[] = readJson(ARTICLES_INDEX);
  const wasPublished = articles.some((a) => a.slug === slug);
  if (wasPublished) writeJson(ARTICLES_INDEX, articles.filter((a) => a.slug !== slug));
  if (!res.headersSent) res.end(JSON.stringify({ ok: true, slug }));
  if (wasPublished) setImmediate(() => regenerateSitemap());
}

// ── Scheduler ─────────────────────────────────────────────────────────────────
const DAILY_AUTO_LIMIT = 2;

interface SchedulerState {
  last_run: string | null;
  last_published: string[];
  runs_total: number;
}

const schedulerState: SchedulerState = {
  last_run: null,
  last_published: [],
  runs_total: 0,
};

function nextRunAt(): string {
  const now = new Date();
  const next = new Date(now);
  next.setHours(9, 0, 0, 0);
  if (next <= now) next.setDate(next.getDate() + 1);
  return next.toISOString();
}

// Append 2 internal links to an article's markdown body without touching frontmatter.
// Links are appended as a "Related articles" block so they never break existing structure.
function injectInternalLinks(content: string, targetSlug: string, published: Art[]): string {
  const pool = published.filter((a) => a.slug !== targetSlug && a.title);
  if (pool.length === 0) return content;

  // Pick up to 2 random articles, deterministic per-slug to stay idempotent
  const shuffled = [...pool].sort(() => (targetSlug.charCodeAt(0) % 3) - 1);
  const picks = shuffled.slice(0, Math.min(2, shuffled.length));

  // Don't inject if links already present
  for (const p of picks) {
    if (content.includes(`/blog/${p.slug}`)) return content;
  }

  const linkBlock =
    "\n\n## Related Articles\n\n" +
    picks.map((p) => `- [${p.title}](/blog/${p.slug})`).join("\n") +
    "\n";

  return content.trimEnd() + linkBlock;
}

async function runScheduledPublish(): Promise<void> {
  console.log("[SCHEDULER] Running daily job...");

  const drafts: Art[] = readJson(DRAFTS_INDEX);
  const now = Date.now();
  const candidates = drafts
    .filter((d) => d.status === "scheduled" && d.scheduled_at && new Date(d.scheduled_at).getTime() <= now)
    .sort((a, b) => new Date(a.scheduled_at!).getTime() - new Date(b.scheduled_at!).getTime())
    .slice(0, DAILY_AUTO_LIMIT);

  if (candidates.length === 0) {
    console.log("[SCHEDULER] No scheduled articles are due now.");
    schedulerState.last_run = new Date().toISOString();
    schedulerState.last_published = [];
    schedulerState.runs_total += 1;
    return;
  }

  console.log("[SCHEDULER] Selected articles:", candidates.map((c) => c.slug).join(", "));

  const publishedSlugs: string[] = [];

  for (const draft of candidates) {
    try {
      const fake = { statusCode: 200, headersSent: false, end() {} } as unknown as ServerResponse;
      const publishedAt = new Date().toISOString();
      await doPublish(draft.slug, publishedAt, fake);
      publishedSlugs.push(draft.slug);
      appendPublishLog({
        slug: draft.slug,
        title: draft.title,
        published_at: publishedAt,
        triggered_by: "auto",
        status: "success",
      });

      // Inject internal links after successful publish (deferred, non-blocking)
      setImmediate(() => {
        try {
          const currentPublished: Art[] = readJson(ARTICLES_INDEX);
          const found = findArticleFile(draft.slug, draft.filePath);
          if (!found) return;
          const raw = fs.readFileSync(found.absPath, "utf8");
          const updated = injectInternalLinks(raw, draft.slug, currentPublished);
          if (updated !== raw) fs.writeFileSync(found.absPath, updated, "utf8");
        } catch (e) {
          console.warn("[SCHEDULER] Internal link injection failed for", draft.slug, e);
        }
      });
    } catch (e) {
      console.error("[SCHEDULER] Failed to publish", draft.slug, e);
      appendPublishLog({
        slug: draft.slug,
        title: draft.title,
        published_at: new Date().toISOString(),
        triggered_by: "auto",
        status: "failed",
        error: String(e),
      });
    }
  }

  schedulerState.last_run = new Date().toISOString();
  schedulerState.last_published = publishedSlugs;
  schedulerState.runs_total += 1;
  console.log("[SCHEDULER] Completed successfully. Published:", publishedSlugs.join(", ") || "(none)");
}

function adminApiPlugin(): Plugin {
  return {
    name: "admin-api",
    enforce: "pre",
    configureServer(server) {
      // Guard middleware — runs before every other Vite middleware.
      // Sets Content-Type:application/json for all /api/ routes so Vite's SPA
      // fallback never serves HTML in place of a missing API handler.
      // Also disables caching for all content JSON files.
      server.middlewares.use((req, res, next) => {
        if (req.url?.startsWith("/api/")) {
          res.setHeader("Content-Type", "application/json");
          res.setHeader("Cache-Control", "no-store");
        }
        const p = req.url?.split("?")[0] ?? "";
        if (p.startsWith("/content/") && p.endsWith(".json")) {
          res.setHeader("Cache-Control", "no-store, no-cache, must-revalidate");
          res.setHeader("Pragma", "no-cache");
          res.setHeader("Expires", "0");
        }
        next();
      });

      // ── Cron: publish due drafts at 09:00 AND 15:00 UTC every day ──────────
      // IMPORTANT: articles are scheduled at both 09:00 and 15:00 slots.
      // Running only at 09:00 means all 15:00 articles were never auto-published.
      cron.schedule("0 9,15 * * *", () => {
        runScheduledPublish().catch((e) =>
          console.error("[SCHEDULER] Unexpected error:", e),
        );
      });
      console.log("[SCHEDULER] Cron registered (09:00 + 15:00 UTC) — next run:", nextRunAt());

      server.middlewares.use(async (req, res, next) => {
        if (!req.url?.startsWith("/api/admin")) return next();

        try {
          res.setHeader("Content-Type", "application/json");
          res.setHeader("Cache-Control", "no-store");

          const url      = new URL(req.url, "http://localhost");
          const pathname = url.pathname;
          const method   = req.method ?? "GET";
          // GET /api/admin/stats
          if (pathname === "/api/admin/stats" && method === "GET") {
            // articles-index.json entries may lack a status field — treat them as published
            const articles: Art[] = (readJson<Art[]>(ARTICLES_INDEX)).map((a) => ({ ...a, status: a.status || "published" }));
            const drafts: Art[] = readJson(DRAFTS_INDEX);
            const scheduled = drafts.filter((d) => d.status === "scheduled").length;
            const cats: Record<string, number> = {};
            for (const a of [...articles, ...drafts]) if (a.category) cats[a.category] = (cats[a.category] || 0) + 1;
            res.end(JSON.stringify({
              published:  articles.length,
              drafts:     drafts.filter((d) => d.status === "draft").length,
              scheduled,
              total:      articles.length + drafts.length,
              categories: cats,
              recentPublished: [...articles].sort((a, b) => new Date(b.published_at ?? 0).getTime() - new Date(a.published_at ?? 0).getTime()).slice(0, 10),
              recentDrafts:    drafts.slice(0, 10),
            }));
            return;
          }

          // GET /api/admin/articles
          if (pathname === "/api/admin/articles" && method === "GET") {
            const page  = Math.max(1, parseInt(url.searchParams.get("page") ?? "1"));
            const limit = Math.min(50, Math.max(1, parseInt(url.searchParams.get("limit") ?? "20")));
            const q     = (url.searchParams.get("q") ?? "").toLowerCase();
            const cat   = url.searchParams.get("category") ?? "";
            // Normalize: articles-index.json entries may not have a status field
            let data: Art[] = (readJson<Art[]>(ARTICLES_INDEX)).map((a) => ({ ...a, status: a.status || "published" }));
            if (q) data = data.filter((a) => a.title.toLowerCase().includes(q) || a.slug.includes(q));
            if (cat && cat !== "All") data = data.filter((a) => a.category === cat);
            const total = data.length;
            res.end(JSON.stringify({ data: data.slice((page-1)*limit, page*limit), total, page, pages: Math.ceil(total/limit), limit }));
            return;
          }

          // GET /api/admin/drafts
          if (pathname === "/api/admin/drafts" && method === "GET") {
            const page   = Math.max(1, parseInt(url.searchParams.get("page") ?? "1"));
            const limit  = Math.min(50, Math.max(1, parseInt(url.searchParams.get("limit") ?? "20")));
            const q      = (url.searchParams.get("q") ?? "").toLowerCase();
            const cat    = url.searchParams.get("category") ?? "";
            const status = url.searchParams.get("status") ?? "";
            let data: Art[] = readJson(DRAFTS_INDEX);
            if (q) data = data.filter((d) => d.title.toLowerCase().includes(q) || d.slug.includes(q));
            if (cat && cat !== "All") data = data.filter((d) => d.category === cat);
            if (status && status !== "all") data = data.filter((d) => d.status === status);
            const total = data.length;
            res.end(JSON.stringify({ data: data.slice((page-1)*limit, page*limit), total, page, pages: Math.ceil(total/limit), limit }));
            return;
          }

          // POST /api/admin/articles/:slug/publish
          const pubM = pathname.match(/^\/api\/admin\/articles\/([^/]+)\/publish$/);
          if (pubM && method === "POST") {
            const body = await readBody(req);
            await doPublish(pubM[1], (body.published_at as string) || new Date().toISOString(), res);
            return;
          }

          // POST /api/admin/articles/:slug/unpublish
          const unpubM = pathname.match(/^\/api\/admin\/articles\/([^/]+)\/unpublish$/);
          if (unpubM && method === "POST") { await doUnpublish(unpubM[1], res); return; }

          // POST /api/admin/articles/:slug/schedule
          const schedM = pathname.match(/^\/api\/admin\/articles\/([^/]+)\/schedule$/);
          if (schedM && method === "POST") {
            const body = await readBody(req);
            if (!body.scheduled_at) { res.statusCode = 400; res.end(JSON.stringify({ error: "scheduled_at required" })); return; }
            await doSchedule(schedM[1], body.scheduled_at as string, res);
            return;
          }

          // PATCH /api/admin/articles/:slug/update
          const updateM = pathname.match(/^\/api\/admin\/articles\/([^/]+)\/update$/);
          if (updateM && method === "PATCH") {
            const body = await readBody(req);
            const patch: Record<string, string | null> = {};
            if (typeof body.title === "string")            patch.title = body.title;
            if (typeof body.meta_description === "string") patch.meta_description = body.meta_description;
            if (typeof body.body === "string")             patch.body = body.body;
            if (!Object.keys(patch).length) {
              res.statusCode = 400;
              res.end(JSON.stringify({ error: "Provide at least one field: title, meta_description, body" }));
              return;
            }
            await doUpdate(updateM[1], patch, res);
            return;
          }

          // DELETE /api/admin/articles/:slug
          const delM = pathname.match(/^\/api\/admin\/articles\/([^/]+)$/);
          if (delM && method === "DELETE") { await doDelete(delM[1], res); return; }

          // POST /api/admin/bulk
          if (pathname === "/api/admin/bulk" && method === "POST") {
            const body = await readBody(req);
            const { action, slugs } = body as { action: string; slugs: string[] };
            const results: unknown[] = [];
            for (const slug of (slugs || [])) {
              const fake = { statusCode: 200, headersSent: false, end() {} } as unknown as ServerResponse;
              try {
                if (action === "publish")   await doPublish(slug, new Date().toISOString(), fake);
                else if (action === "draft") await doUnpublish(slug, fake);
                else if (action === "delete") await doDelete(slug, fake);
                results.push({ slug, ok: true });
              } catch (e) { results.push({ slug, ok: false, error: String(e) }); }
            }
            res.end(JSON.stringify({ ok: true, results }));
            return;
          }

          // POST /api/admin/check-scheduled
          if (pathname === "/api/admin/check-scheduled" && method === "POST") {
            const drafts: Art[] = readJson(DRAFTS_INDEX);
            const now = Date.now();
            const toPublish = drafts.filter((d) => d.status === "scheduled" && d.scheduled_at && new Date(d.scheduled_at).getTime() <= now);
            for (const d of toPublish) {
              const fake = { statusCode: 200, headersSent: false, end() {} } as unknown as ServerResponse;
              await doPublish(d.slug, d.scheduled_at!, fake);
              appendPublishLog({ slug: d.slug, title: d.title, published_at: new Date().toISOString(), triggered_by: "scheduled", status: "success" });
            }
            res.end(JSON.stringify({ ok: true, published: toPublish.map((d) => d.slug) }));
            return;
          }

          // POST /api/admin/auto-publish  — publish up to `limit` scheduled articles for today
          if (pathname === "/api/admin/auto-publish" && method === "POST") {
            const body = await readBody(req);
            const dailyLimit = Math.min(10, Math.max(1, parseInt(String(body.limit ?? "2"))));
            const triggeredBy = (body.triggered_by as string) === "manual" ? "manual" : "auto";

            // Count how many already published today (UTC day)
            const todayStr = new Date().toISOString().slice(0, 10);
            const log = readPublishLog();
            const todayCount = log.filter((e) => e.published_at.startsWith(todayStr) && e.status === "success").length;
            const remaining = Math.max(0, dailyLimit - todayCount);

            if (remaining === 0) {
              res.end(JSON.stringify({ ok: true, published: [], todayCount, message: `Daily limit of ${dailyLimit} already reached for ${todayStr}` }));
              return;
            }

            // Pick oldest-scheduled articles that are due now
            const drafts: Art[] = readJson(DRAFTS_INDEX);
            const now = Date.now();
            const due = drafts
              .filter((d) => d.status === "scheduled" && d.scheduled_at && new Date(d.scheduled_at).getTime() <= now)
              .sort((a, b) => new Date(a.scheduled_at!).getTime() - new Date(b.scheduled_at!).getTime())
              .slice(0, remaining);

            const published: string[] = [];
            for (const d of due) {
              try {
                const fake = { statusCode: 200, headersSent: false, end() {} } as unknown as ServerResponse;
                await doPublish(d.slug, new Date().toISOString(), fake);
                published.push(d.slug);
                appendPublishLog({ slug: d.slug, title: d.title, published_at: new Date().toISOString(), triggered_by: triggeredBy as "auto" | "manual", status: "success" });
              } catch (e) {
                appendPublishLog({ slug: d.slug, title: d.title, published_at: new Date().toISOString(), triggered_by: triggeredBy as "auto" | "manual", status: "failed", error: String(e) });
              }
            }
            res.end(JSON.stringify({ ok: true, published, todayCount: todayCount + published.length, dailyLimit, remaining: remaining - published.length }));
            return;
          }

          // GET /api/admin/publish-log
          if (pathname === "/api/admin/publish-log" && method === "GET") {
            const log = readPublishLog();
            res.end(JSON.stringify(log.slice(0, 100)));
            return;
          }

          // GET /api/admin/schedule-queue  — all scheduled drafts sorted by scheduled_at
          if (pathname === "/api/admin/schedule-queue" && method === "GET") {
            const drafts: Art[] = readJson(DRAFTS_INDEX);
            const queue = drafts
              .filter((d) => d.status === "scheduled" && d.scheduled_at)
              .sort((a, b) => new Date(a.scheduled_at!).getTime() - new Date(b.scheduled_at!).getTime());
            const todayStr = new Date().toISOString().slice(0, 10);
            const log = readPublishLog();
            const todayPublished = log.filter((e) => e.published_at.startsWith(todayStr) && e.status === "success").length;
            res.end(JSON.stringify({ queue, todayPublished }));
            return;
          }

          // GET /api/admin/scheduler/status
          if (pathname === "/api/admin/scheduler/status" && method === "GET") {
            const drafts: Art[] = readJson(DRAFTS_INDEX);
            const queuedCount = drafts.filter((d) => d.status === "draft").length;
            const todayStr = new Date().toISOString().slice(0, 10);
            const log = readPublishLog();
            const todayPublished = log.filter((e) => e.published_at.startsWith(todayStr) && e.status === "success").length;
            res.end(JSON.stringify({
              last_run: schedulerState.last_run,
              last_published: schedulerState.last_published,
              next_run: nextRunAt(),
              queued_articles_count: queuedCount,
              daily_limit: DAILY_AUTO_LIMIT,
              published_today: todayPublished,
              runs_total: schedulerState.runs_total,
            }));
            return;
          }

          // POST /api/admin/scheduler/run  — trigger manually for testing
          if (pathname === "/api/admin/scheduler/run" && method === "POST") {
            if (!res.headersSent) res.end(JSON.stringify({ ok: true, message: "Scheduler triggered — check publish log" }));
            setImmediate(() => {
              runScheduledPublish().catch((e) =>
                console.error("[SCHEDULER] Manual trigger error:", e),
              );
            });
            return;
          }

          // POST /api/admin/force-publish  — publish next N scheduled articles ignoring time
          if (pathname === "/api/admin/force-publish" && method === "POST") {
            const body = await readBody(req);
            const limit = Math.min(20, Math.max(1, parseInt(String((body as Record<string, unknown>).limit ?? "2"))));
            const drafts: Art[] = readJson(DRAFTS_INDEX);
            const due = drafts
              .filter((d) => d.status === "scheduled" && d.scheduled_at)
              .sort((a, b) => new Date(a.scheduled_at!).getTime() - new Date(b.scheduled_at!).getTime())
              .slice(0, limit);
            if (due.length === 0) {
              if (!res.headersSent) res.end(JSON.stringify({ ok: true, published: [], message: "No scheduled articles found" }));
              return;
            }
            const published: string[] = [];
            for (const d of due) {
              try {
                const fake = { statusCode: 200, headersSent: false, end() {} } as unknown as ServerResponse;
                await doPublish(d.slug, new Date().toISOString(), fake);
                published.push(d.slug);
                appendPublishLog({ slug: d.slug, title: d.title, published_at: new Date().toISOString(), triggered_by: "manual", status: "success" });
              } catch (e) {
                appendPublishLog({ slug: d.slug, title: d.title, published_at: new Date().toISOString(), triggered_by: "manual", status: "failed", error: String(e) });
              }
            }
            if (!res.headersSent) res.end(JSON.stringify({ ok: true, published }));
            return;
          }

          res.statusCode = 404;
          res.end(JSON.stringify({ error: "Unknown route: " + pathname }));
        } catch (err: unknown) {
          if (!res.headersSent) {
            res.statusCode = 500;
            res.end(JSON.stringify({ error: String(err) }));
          }
        }
      });
    },
  };
}

export default defineConfig({
  plugins: [react(), adminApiPlugin()],
  resolve: {
    alias: { "@": path.resolve(__dirname, "./src") },
  },
  server: {
    port: parseInt(process.env.PORT || "5000"),
    host: "0.0.0.0",
    allowedHosts: true,
    // Prevent Vite from watching content JSON files — writing articles-index.json
    // or sitemap.xml during a publish would trigger a HMR "full-reload" WebSocket
    // message that causes the browser to navigate away before the fetch response
    // body arrives, producing an empty body → "Invalid JSON" error in the admin UI.
    watch: {
      ignored: ["**/public/content/**", "**/public/sitemap.xml"],
    },
  },
});
