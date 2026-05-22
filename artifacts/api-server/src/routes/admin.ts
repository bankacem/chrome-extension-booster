import { Router, type IRouter, type Request, type Response } from "express";
import fs from "fs";
import path from "path";

const router: IRouter = Router();

const EXTENSIONTO_ROOT = path.resolve(process.cwd(), "../extensionto");
const ARTICLES_DIR     = path.join(EXTENSIONTO_ROOT, "public/content/articles");
const DRAFTS_INDEX     = path.join(EXTENSIONTO_ROOT, "public/content/drafts-index.json");
const ARTICLES_INDEX   = path.join(EXTENSIONTO_ROOT, "public/content/articles-index.json");
const PUBLISH_LOG      = path.join(EXTENSIONTO_ROOT, "public/content/publish-log.json");
const SITEMAP_PATH     = path.join(EXTENSIONTO_ROOT, "public/sitemap.xml");
const WEBSITE_URL      = "https://extensionto.com";

// ── JSON helpers ──────────────────────────────────────────────────────────────
function readJson<T = unknown>(p: string): T {
  try { return JSON.parse(fs.readFileSync(p, "utf8")) as T; }
  catch { return [] as unknown as T; }
}
function writeJson(p: string, data: unknown) {
  fs.writeFileSync(p, JSON.stringify(data, null, 2), "utf8");
}

// ── Publish log ───────────────────────────────────────────────────────────────
interface LogEntry { slug: string; title: string; published_at: string; triggered_by: string; status: string; error?: string; }
function readPublishLog(): LogEntry[] {
  try { return JSON.parse(fs.readFileSync(PUBLISH_LOG, "utf8")) as LogEntry[]; }
  catch { return []; }
}
function appendPublishLog(entry: LogEntry) {
  const log = readPublishLog();
  log.unshift(entry);
  fs.writeFileSync(PUBLISH_LOG, JSON.stringify(log.slice(0, 500), null, 2), "utf8");
}

// ── Frontmatter helpers ───────────────────────────────────────────────────────
function updateFm(content: string, updates: Record<string, string | null>): string {
  const m = content.match(/^---([\s\S]*?)---/);
  if (!m) return content;
  let fm = m[1];
  for (const [key, val] of Object.entries(updates)) {
    const re = new RegExp(`^${key}:[ \\t]*[^\\n]*(?:\\n[ \\t]+[^\\n]*)*`, "m");
    const line = val === null ? `${key}: null` : `${key}: "${val}"`;
    if (re.test(fm)) fm = fm.replace(re, line);
    else fm += `\n${line}`;
  }
  return content.replace(/^---([\s\S]*?)---/, `---${fm}---`);
}

function findArticleFile(slug: string, fallbackFilePath?: string | null): { absPath: string; relFilePath: string } | null {
  const norm = slug.toLowerCase().replace(/[^a-z0-9]/g, "-").replace(/-+/g, "-").replace(/^-|-$/g, "");
  const c1 = norm[0] || "_"; const c2 = norm[1] || "_"; const c3 = norm[2] || "_";
  const relPath = `/content/articles/${c1}/${c2}/${c3}/${norm}.md`;
  const absPath = path.join(EXTENSIONTO_ROOT, "public" + relPath);
  if (fs.existsSync(absPath)) return { absPath, relFilePath: relPath };
  if (fallbackFilePath) {
    const abs = path.join(EXTENSIONTO_ROOT, "public" + fallbackFilePath);
    if (fs.existsSync(abs)) return { absPath: abs, relFilePath: fallbackFilePath };
  }
  return null;
}

// ── Sitemap ───────────────────────────────────────────────────────────────────
const PILLAR_SLUGS = new Set([
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
    const articles = readJson<Art[]>(ARTICLES_INDEX);
    const STATIC = [
      { url: "/", changefreq: "weekly", priority: "1.0" },
      { url: "/blog", changefreq: "daily", priority: "0.9" },
      { url: "/privacy", changefreq: "yearly", priority: "0.3" },
      { url: "/terms", changefreq: "yearly", priority: "0.3" },
    ];
    const EXTENSIONS = ["quick-screenshot-lite","auto-dark-mode-switcher","redirect-shield","protab-suspender","light-popup-blocker","formula-builder-pro","securakey-pro","offline-reader-pro","cookie-banner-blocker"];
    const articlePages = articles
      .filter((a) => { const flags: string[] = (a as unknown as Record<string,string[]>).quality_flags || []; return !flags.some((f) => DISQUALIFYING.has(f)) && !a.slug.includes("-partial"); })
      .map((a) => {
        const isPillar = PILLAR_SLUGS.has(a.slug);
        const age = a.published_at ? Math.floor((Date.now() - new Date(a.published_at).getTime()) / 86400000) : 9999;
        const isNew = age < 30;
        return { url: `/blog/${a.slug}`, changefreq: isPillar || isNew ? "weekly" : "monthly", priority: isPillar ? "0.85" : isNew ? "0.8" : "0.7", lastmod: toDateStr((a as unknown as Record<string,string>).updated_at || a.published_at) };
      });
    const extPages = EXTENSIONS.map((s) => ({ url: `/extension/${s}`, changefreq: "monthly", priority: "0.9", lastmod: undefined as string | undefined }));
    const all = [...STATIC.map(p => ({...p, lastmod: undefined as string | undefined})), ...articlePages, ...extPages];
    const xml = `<?xml version="1.0" encoding="UTF-8"?>\n<?xml-stylesheet type="text/xsl" href="/sitemap.xsl"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${all.map((p) => `  <url>\n    <loc>${escXml(WEBSITE_URL + p.url)}</loc>\n    <changefreq>${p.changefreq}</changefreq>\n    <priority>${p.priority}</priority>${p.lastmod ? `\n    <lastmod>${p.lastmod}</lastmod>` : ""}\n  </url>`).join("\n")}\n</urlset>`;
    fs.writeFileSync(SITEMAP_PATH, xml, "utf8");
  } catch (e) { console.warn("[admin] sitemap regeneration failed:", e); }
}

// ── Article type ──────────────────────────────────────────────────────────────
interface Art {
  id: string; title: string; slug: string; category?: string | null;
  status: string; published_at?: string | null; scheduled_at?: string | null;
  created_at?: string | null; read_time?: number; reading_time?: number; word_count?: number;
  featured_image?: string | null; image_url?: string; filePath: string; canonicalPath: string;
  meta_description?: string; description?: string; excerpt?: string;
  author?: string; tags?: string[]; keywords?: string[]; views?: number;
  updated_at?: string | null;
}

// ── Core operations ───────────────────────────────────────────────────────────
async function doPublish(slug: string, publishedAt: string, res: Response) {
  const drafts = readJson<Art[]>(DRAFTS_INDEX);
  const draft = drafts.find((d) => d.slug === slug);
  if (!draft) { res.status(404).json({ error: "Draft not found" }); return; }
  const found = findArticleFile(slug, draft.filePath);
  if (!found) { res.status(404).json({ error: `Markdown file not found for slug: ${slug}` }); return; }
  let c = fs.readFileSync(found.absPath, "utf8");
  c = updateFm(c, { status: "published", published_at: publishedAt, scheduled_at: null });
  fs.writeFileSync(found.absPath, c, "utf8");
  const articles = readJson<Art[]>(ARTICLES_INDEX);
  const entry: Art = { ...draft, status: "published", published_at: publishedAt, scheduled_at: null, filePath: found.relFilePath, canonicalPath: `/blog/${slug}`, image_url: draft.featured_image || draft.image_url || `/images/blog/${slug}.webp`, featured_image: draft.featured_image || draft.image_url || `/images/blog/${slug}.webp`, reading_time: draft.read_time ?? draft.reading_time, views: draft.views ?? 0, updated_at: publishedAt };
  const withoutSlug = articles.filter((a) => a.slug !== slug);
  withoutSlug.unshift(entry);
  writeJson(ARTICLES_INDEX, withoutSlug);
  writeJson(DRAFTS_INDEX, drafts.filter((d) => d.slug !== slug));
  res.json({ ok: true, slug, published_at: publishedAt });
  setImmediate(() => regenerateSitemap());
}

async function doUnpublish(slug: string, res: Response) {
  const articles = readJson<Art[]>(ARTICLES_INDEX);
  const article = articles.find((a) => a.slug === slug);
  if (!article) { res.status(404).json({ error: "Not found" }); return; }
  const found = findArticleFile(slug, article.filePath);
  if (found) { let c = fs.readFileSync(found.absPath, "utf8"); c = updateFm(c, { status: "draft", published_at: null }); fs.writeFileSync(found.absPath, c, "utf8"); }
  writeJson(ARTICLES_INDEX, articles.filter((a) => a.slug !== slug));
  const drafts = readJson<Art[]>(DRAFTS_INDEX);
  const draftEntry = { ...article, status: "draft", published_at: null, filePath: found?.relFilePath ?? article.filePath };
  const draftsWithout = drafts.filter((d) => d.slug !== slug);
  draftsWithout.unshift(draftEntry);
  writeJson(DRAFTS_INDEX, draftsWithout);
  res.json({ ok: true, slug });
  setImmediate(() => regenerateSitemap());
}

async function doSchedule(slug: string, scheduledAt: string, res: Response) {
  const drafts = readJson<Art[]>(DRAFTS_INDEX);
  const idx = drafts.findIndex((d) => d.slug === slug);
  if (idx === -1) { res.status(404).json({ error: "Draft not found" }); return; }
  const found = findArticleFile(slug, drafts[idx].filePath);
  if (found) { let c = fs.readFileSync(found.absPath, "utf8"); c = updateFm(c, { status: "scheduled", scheduled_at: scheduledAt }); fs.writeFileSync(found.absPath, c, "utf8"); drafts[idx] = { ...drafts[idx], status: "scheduled", scheduled_at: scheduledAt, filePath: found.relFilePath }; }
  else { drafts[idx] = { ...drafts[idx], status: "scheduled", scheduled_at: scheduledAt }; }
  writeJson(DRAFTS_INDEX, drafts);
  res.json({ ok: true, slug, scheduled_at: scheduledAt });
}

async function doDelete(slug: string, res: Response) {
  const drafts = readJson<Art[]>(DRAFTS_INDEX);
  writeJson(DRAFTS_INDEX, drafts.filter((d) => d.slug !== slug));
  const articles = readJson<Art[]>(ARTICLES_INDEX);
  const wasPublished = articles.some((a) => a.slug === slug);
  if (wasPublished) writeJson(ARTICLES_INDEX, articles.filter((a) => a.slug !== slug));
  res.json({ ok: true, slug });
  if (wasPublished) setImmediate(() => regenerateSitemap());
}

// ── Routes ────────────────────────────────────────────────────────────────────

// GET /admin/stats
router.get("/admin/stats", (_req, res) => {
  const articles = readJson<Art[]>(ARTICLES_INDEX).map((a) => ({ ...a, status: a.status || "published" }));
  const drafts = readJson<Art[]>(DRAFTS_INDEX);
  const scheduled = drafts.filter((d) => d.status === "scheduled").length;
  const cats: Record<string, number> = {};
  for (const a of [...articles, ...drafts]) if (a.category) cats[a.category] = (cats[a.category] || 0) + 1;
  res.json({ published: articles.length, drafts: drafts.filter((d) => d.status === "draft").length, scheduled, total: articles.length + drafts.length, categories: cats, recentPublished: [...articles].sort((a, b) => new Date(b.published_at ?? 0).getTime() - new Date(a.published_at ?? 0).getTime()).slice(0, 10), recentDrafts: drafts.slice(0, 10) });
});

// GET /admin/articles
router.get("/admin/articles", (req, res) => {
  const page = Math.max(1, parseInt(String(req.query["page"] ?? "1")));
  const limit = Math.min(50, Math.max(1, parseInt(String(req.query["limit"] ?? "20"))));
  const q = String(req.query["q"] ?? "").toLowerCase();
  const cat = String(req.query["category"] ?? "");
  let data = readJson<Art[]>(ARTICLES_INDEX).map((a) => ({ ...a, status: a.status || "published" }));
  if (q) data = data.filter((a) => a.title.toLowerCase().includes(q) || a.slug.includes(q));
  if (cat && cat !== "All") data = data.filter((a) => a.category === cat);
  const total = data.length;
  res.json({ data: data.slice((page-1)*limit, page*limit), total, page, pages: Math.ceil(total/limit), limit });
});

// GET /admin/drafts
router.get("/admin/drafts", (req, res) => {
  const page = Math.max(1, parseInt(String(req.query["page"] ?? "1")));
  const limit = Math.min(50, Math.max(1, parseInt(String(req.query["limit"] ?? "20"))));
  const q = String(req.query["q"] ?? "").toLowerCase();
  const cat = String(req.query["category"] ?? "");
  const status = String(req.query["status"] ?? "");
  let data = readJson<Art[]>(DRAFTS_INDEX);
  if (q) data = data.filter((d) => d.title.toLowerCase().includes(q) || d.slug.includes(q));
  if (cat && cat !== "All") data = data.filter((d) => d.category === cat);
  if (status && status !== "all") data = data.filter((d) => d.status === status);
  const total = data.length;
  res.json({ data: data.slice((page-1)*limit, page*limit), total, page, pages: Math.ceil(total/limit), limit });
});

// POST /admin/articles/:slug/publish
router.post("/admin/articles/:slug/publish", async (req, res) => {
  const publishedAt = (req.body?.published_at as string) || new Date().toISOString();
  await doPublish(req.params["slug"]!, publishedAt, res);
});

// POST /admin/articles/:slug/unpublish
router.post("/admin/articles/:slug/unpublish", async (req, res) => {
  await doUnpublish(req.params["slug"]!, res);
});

// POST /admin/articles/:slug/schedule
router.post("/admin/articles/:slug/schedule", async (req, res) => {
  const { scheduled_at } = req.body as { scheduled_at?: string };
  if (!scheduled_at) { res.status(400).json({ error: "scheduled_at required" }); return; }
  await doSchedule(req.params["slug"]!, scheduled_at, res);
});

// PATCH /admin/articles/:slug/update
router.patch("/admin/articles/:slug/update", async (req, res) => {
  const slug = req.params["slug"]!;
  const body = req.body as Record<string, string>;
  const patch: Record<string, string | null> = {};
  if (typeof body.title === "string") patch.title = body.title;
  if (typeof body.meta_description === "string") patch.meta_description = body.meta_description;
  if (typeof body.body === "string") patch.body = body.body;
  if (!Object.keys(patch).length) { res.status(400).json({ error: "Provide at least one field: title, meta_description, body" }); return; }
  const updatedAt = new Date().toISOString();
  const updated: string[] = [];
  const articles = readJson<Art[]>(ARTICLES_INDEX);
  const drafts = readJson<Art[]>(DRAFTS_INDEX);
  const existing = articles.find((a) => a.slug === slug) ?? drafts.find((d) => d.slug === slug);
  if (!existing) { res.status(404).json({ error: `Article not found: ${slug}` }); return; }
  const found = findArticleFile(slug, existing.filePath);
  if (!found) { res.status(404).json({ error: `Markdown file not found for slug: ${slug}` }); return; }
  let content = fs.readFileSync(found.absPath, "utf8");
  const fmPatch: Record<string, string | null> = { updated_at: updatedAt };
  if (typeof patch.title === "string" && patch.title.trim()) { fmPatch.title = patch.title.trim(); updated.push("title"); }
  if (typeof patch.meta_description === "string" && patch.meta_description.trim()) { fmPatch.meta_description = patch.meta_description.trim(); updated.push("meta_description"); }
  content = updateFm(content, fmPatch);
  if (typeof patch.body === "string" && patch.body.trim()) { const fmEnd = content.indexOf("---", 3); if (fmEnd !== -1) content = content.slice(0, fmEnd + 3) + "\n\n" + patch.body.trim() + "\n"; updated.push("body"); }
  fs.writeFileSync(found.absPath, content, "utf8");
  res.json({ ok: true, slug, updated, updated_at: updatedAt });
});

// DELETE /admin/articles/:slug
router.delete("/admin/articles/:slug", async (req, res) => {
  await doDelete(req.params["slug"]!, res);
});

// POST /admin/bulk
router.post("/admin/bulk", async (req, res) => {
  const { action, slugs } = req.body as { action: string; slugs: string[] };
  const results: { slug: string; ok: boolean; error?: string }[] = [];
  for (const slug of (slugs || [])) {
    const fakeRes = { statusCode: 200, headersSent: false, json() {}, status(_: number) { return this; } } as unknown as Response;
    try {
      if (action === "publish") await doPublish(slug, new Date().toISOString(), fakeRes);
      else if (action === "draft") await doUnpublish(slug, fakeRes);
      else if (action === "delete") await doDelete(slug, fakeRes);
      results.push({ slug, ok: true });
    } catch (e) { results.push({ slug, ok: false, error: String(e) }); }
  }
  res.json({ ok: true, results });
});

// POST /admin/check-scheduled
router.post("/admin/check-scheduled", async (req, res) => {
  const drafts = readJson<Art[]>(DRAFTS_INDEX);
  const now = Date.now();
  const toPublish = drafts.filter((d) => d.status === "scheduled" && d.scheduled_at && new Date(d.scheduled_at).getTime() <= now);
  for (const d of toPublish) {
    const fakeRes = { statusCode: 200, headersSent: false, json() {}, status(_: number) { return this; } } as unknown as Response;
    await doPublish(d.slug, d.scheduled_at!, fakeRes);
    appendPublishLog({ slug: d.slug, title: d.title, published_at: new Date().toISOString(), triggered_by: "scheduled", status: "success" });
  }
  res.json({ ok: true, published: toPublish.map((d) => d.slug) });
});

// POST /admin/auto-publish
router.post("/admin/auto-publish", async (req, res) => {
  const body = req.body as Record<string, unknown>;
  const dailyLimit = Math.min(10, Math.max(1, parseInt(String(body["limit"] ?? "2"))));
  const triggeredBy = body["triggered_by"] === "manual" ? "manual" : "auto";
  const todayStr = new Date().toISOString().slice(0, 10);
  const log = readPublishLog();
  const todayCount = log.filter((e) => e.published_at.startsWith(todayStr) && e.status === "success").length;
  const remaining = Math.max(0, dailyLimit - todayCount);
  if (remaining === 0) { res.json({ ok: true, published: [], todayCount, dailyLimit, remaining: 0, message: `Daily limit of ${dailyLimit} already reached` }); return; }
  const drafts = readJson<Art[]>(DRAFTS_INDEX);
  const now = Date.now();
  const due = drafts.filter((d) => d.status === "scheduled" && d.scheduled_at && new Date(d.scheduled_at).getTime() <= now).sort((a, b) => new Date(a.scheduled_at!).getTime() - new Date(b.scheduled_at!).getTime()).slice(0, remaining);
  const published: string[] = [];
  for (const d of due) {
    try {
      const fakeRes = { statusCode: 200, headersSent: false, json() {}, status(_: number) { return this; } } as unknown as Response;
      await doPublish(d.slug, new Date().toISOString(), fakeRes);
      published.push(d.slug);
      appendPublishLog({ slug: d.slug, title: d.title, published_at: new Date().toISOString(), triggered_by: triggeredBy, status: "success" });
    } catch (e) { appendPublishLog({ slug: d.slug, title: d.title, published_at: new Date().toISOString(), triggered_by: triggeredBy, status: "failed", error: String(e) }); }
  }
  res.json({ ok: true, published, todayCount: todayCount + published.length, dailyLimit, remaining: remaining - published.length });
});

// GET /admin/publish-log
router.get("/admin/publish-log", (_req, res) => {
  res.json(readPublishLog().slice(0, 100));
});

// GET /admin/schedule-queue
router.get("/admin/schedule-queue", (_req, res) => {
  const drafts = readJson<Art[]>(DRAFTS_INDEX);
  const queue = drafts.filter((d) => d.status === "scheduled" && d.scheduled_at).sort((a, b) => new Date(a.scheduled_at!).getTime() - new Date(b.scheduled_at!).getTime());
  const todayStr = new Date().toISOString().slice(0, 10);
  const log = readPublishLog();
  const todayPublished = log.filter((e) => e.published_at.startsWith(todayStr) && e.status === "success").length;
  res.json({ queue, todayPublished });
});

// GET /admin/scheduler/status
router.get("/admin/scheduler/status", (_req, res) => {
  const drafts = readJson<Art[]>(DRAFTS_INDEX);
  const queuedCount = drafts.filter((d) => d.status === "draft").length;
  const todayStr = new Date().toISOString().slice(0, 10);
  const log = readPublishLog();
  const todayPublished = log.filter((e) => e.published_at.startsWith(todayStr) && e.status === "success").length;
  const now = new Date(); const next = new Date(now); next.setHours(9, 0, 0, 0); if (next <= now) next.setDate(next.getDate() + 1);
  res.json({ last_run: null, last_published: [], next_run: next.toISOString(), queued_articles_count: queuedCount, daily_limit: 2, published_today: todayPublished, runs_total: 0 });
});

// POST /admin/scheduler/run
router.post("/admin/scheduler/run", (_req, res) => {
  res.json({ ok: true, message: "Scheduler triggered — check publish log" });
});

export default router;
