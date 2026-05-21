/**
 * api-server.mjs — Standalone HTTP server for all /api/admin/* routes.
 *
 * Runs on port 3001 (Replit externalPort 3001). Vite proxies /api/* to this
 * server so browser requests that come through the Replit HTTPS proxy reach
 * the API correctly.
 *
 * Start with: node api-server.mjs
 */

import http from "http";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { createRequire } from "module";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const require = createRequire(import.meta.url);

// ── Paths ─────────────────────────────────────────────────────────────────────
const ARTICLES_DIR   = path.join(__dirname, "public/content/articles");
const DRAFTS_INDEX   = path.join(__dirname, "public/content/drafts-index.json");
const ARTICLES_INDEX = path.join(__dirname, "public/content/articles-index.json");
const PUBLISH_LOG    = path.join(__dirname, "public/content/publish-log.json");
const SITEMAP_PATH   = path.join(__dirname, "public/sitemap.xml");
const WEBSITE_URL    = "https://extensionto.com";
const PORT           = parseInt(process.env.API_PORT || "3001");

// ── JSON helpers ──────────────────────────────────────────────────────────────
function readJson(p) {
  try { return JSON.parse(fs.readFileSync(p, "utf8")); }
  catch { return []; }
}
function writeJson(p, data) {
  fs.writeFileSync(p, JSON.stringify(data, null, 2), "utf8");
}

// ── Publish log ───────────────────────────────────────────────────────────────
function readPublishLog() {
  try { return JSON.parse(fs.readFileSync(PUBLISH_LOG, "utf8")); }
  catch { return []; }
}
function appendPublishLog(entry) {
  const log = readPublishLog();
  log.unshift(entry);
  fs.writeFileSync(PUBLISH_LOG, JSON.stringify(log.slice(0, 500), null, 2), "utf8");
}

// ── Frontmatter helpers ───────────────────────────────────────────────────────
function parseFm(content) {
  const m = content.match(/^---([\s\S]*?)---/);
  if (!m) return {};
  const out = {};
  for (const line of m[1].split("\n")) {
    const kv = line.match(/^([a-zA-Z_][a-zA-Z0-9_]*):\s*(.*)/);
    if (!kv) continue;
    let v = kv[2].trim();
    if ((v.startsWith('"') && v.endsWith('"')) || (v.startsWith("'") && v.endsWith("'"))) v = v.slice(1, -1);
    out[kv[1]] = v;
  }
  return out;
}

function updateFm(content, updates) {
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

function findArticleFile(slug, fallbackFilePath) {
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

function toDateStr(iso) {
  if (!iso) return new Date().toISOString().split("T")[0];
  try { return new Date(iso).toISOString().split("T")[0]; } catch { return new Date().toISOString().split("T")[0]; }
}
function escXml(s) {
  return String(s).replace(/[<>&'"]/g, (c) => ({"<":"&lt;",">":"&gt;","&":"&amp;","'":"&apos;",'"':"&quot;"})[c]);
}

function regenerateSitemap() {
  try {
    const articles = readJson(ARTICLES_INDEX);
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
        const flags = a.quality_flags || [];
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
          lastmod: toDateStr(a.updated_at || a.published_at),
        };
      });
    const extPages = EXTENSIONS.map((s) => ({ url: `/extension/${s}`, changefreq: "monthly", priority: "0.9" }));
    const all = [...STATIC.map(p => ({...p, lastmod: undefined})), ...articlePages, ...extPages];
    const xml = `<?xml version="1.0" encoding="UTF-8"?>\n<?xml-stylesheet type="text/xsl" href="/sitemap.xsl"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${
      all.map((p) => `  <url>\n    <loc>${escXml(WEBSITE_URL + p.url)}</loc>\n    <changefreq>${p.changefreq}</changefreq>\n    <priority>${p.priority}</priority>${p.lastmod ? `\n    <lastmod>${p.lastmod}</lastmod>` : ""}\n  </url>`).join("\n")
    }\n</urlset>`;
    fs.writeFileSync(SITEMAP_PATH, xml, "utf8");
  } catch (e) {
    console.warn("[api-server] sitemap regeneration failed:", e);
  }
}

// ── Body reader ───────────────────────────────────────────────────────────────
function readBody(req) {
  return new Promise((resolve) => {
    let body = "";
    req.on("data", (c) => { body += c; });
    req.on("end", () => { try { resolve(JSON.parse(body)); } catch { resolve({}); } });
    req.on("error", () => resolve({}));
  });
}

// ── Response helpers ──────────────────────────────────────────────────────────
function json(res, data, status = 200) {
  res.writeHead(status, {
    "Content-Type": "application/json",
    "Cache-Control": "no-store",
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "GET,POST,PATCH,DELETE,OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type",
  });
  res.end(JSON.stringify(data));
}

// ── Core operations ───────────────────────────────────────────────────────────
async function doPublish(slug, publishedAt, res) {
  console.log("[PUBLISH]", slug, "START");
  const drafts = readJson(DRAFTS_INDEX);
  const draft = drafts.find((d) => d.slug === slug);
  if (!draft) { json(res, { error: "Draft not found" }, 404); return; }

  const found = findArticleFile(slug, draft.filePath);
  if (!found) {
    console.warn(`[api-server] publish: markdown file not found for slug "${slug}"`);
    json(res, { error: `Markdown file not found for slug: ${slug}` }, 404);
    return;
  }

  let c = fs.readFileSync(found.absPath, "utf8");
  c = updateFm(c, { status: "published", published_at: publishedAt, scheduled_at: null });
  fs.writeFileSync(found.absPath, c, "utf8");

  const articles = readJson(ARTICLES_INDEX);
  const entry = {
    ...draft,
    status: "published",
    published_at: publishedAt,
    scheduled_at: null,
    filePath: found.relFilePath,
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

  json(res, { ok: true, slug, published_at: publishedAt });
  console.log("[PUBLISH]", slug, "END");
  setImmediate(() => regenerateSitemap());
}

async function doUnpublish(slug, res) {
  const articles = readJson(ARTICLES_INDEX);
  const article = articles.find((a) => a.slug === slug);
  if (!article) { json(res, { error: "Not found" }, 404); return; }

  const found = findArticleFile(slug, article.filePath);
  if (found) {
    let c = fs.readFileSync(found.absPath, "utf8");
    c = updateFm(c, { status: "draft", published_at: null });
    fs.writeFileSync(found.absPath, c, "utf8");
  }
  writeJson(ARTICLES_INDEX, articles.filter((a) => a.slug !== slug));
  const drafts = readJson(DRAFTS_INDEX);
  const draftEntry = { ...article, status: "draft", published_at: null, filePath: found?.relFilePath ?? article.filePath };
  const draftsWithout = drafts.filter((d) => d.slug !== slug);
  draftsWithout.unshift(draftEntry);
  writeJson(DRAFTS_INDEX, draftsWithout);
  json(res, { ok: true, slug });
  setImmediate(() => regenerateSitemap());
}

async function doSchedule(slug, scheduledAt, res) {
  const drafts = readJson(DRAFTS_INDEX);
  const idx = drafts.findIndex((d) => d.slug === slug);
  if (idx === -1) { json(res, { error: "Draft not found" }, 404); return; }

  const found = findArticleFile(slug, drafts[idx].filePath);
  if (found) {
    let c = fs.readFileSync(found.absPath, "utf8");
    c = updateFm(c, { status: "scheduled", scheduled_at: scheduledAt });
    fs.writeFileSync(found.absPath, c, "utf8");
    drafts[idx] = { ...drafts[idx], status: "scheduled", scheduled_at: scheduledAt, filePath: found.relFilePath };
  } else {
    drafts[idx] = { ...drafts[idx], status: "scheduled", scheduled_at: scheduledAt };
  }
  writeJson(DRAFTS_INDEX, drafts);
  json(res, { ok: true, slug, scheduled_at: scheduledAt });
}

async function doDelete(slug, res) {
  const drafts = readJson(DRAFTS_INDEX);
  writeJson(DRAFTS_INDEX, drafts.filter((d) => d.slug !== slug));
  const articles = readJson(ARTICLES_INDEX);
  const wasPublished = articles.some((a) => a.slug === slug);
  if (wasPublished) writeJson(ARTICLES_INDEX, articles.filter((a) => a.slug !== slug));
  json(res, { ok: true, slug });
  if (wasPublished) setImmediate(() => regenerateSitemap());
}

async function doUpdate(slug, patch, res) {
  const updatedAt = new Date().toISOString();
  const updated = [];
  const articles = readJson(ARTICLES_INDEX);
  const drafts = readJson(DRAFTS_INDEX);
  const existing = articles.find((a) => a.slug === slug) ?? drafts.find((d) => d.slug === slug);
  if (!existing) { json(res, { error: `Article not found: ${slug}` }, 404); return; }

  const found = findArticleFile(slug, existing.filePath);
  if (!found) { json(res, { error: `Markdown file not found for slug: ${slug}` }, 404); return; }

  let content = fs.readFileSync(found.absPath, "utf8");
  const fmPatch = { updated_at: updatedAt };
  if (typeof patch.title === "string" && patch.title.trim()) { fmPatch.title = patch.title.trim(); updated.push("title"); }
  if (typeof patch.meta_description === "string" && patch.meta_description.trim()) { fmPatch.meta_description = patch.meta_description.trim(); updated.push("meta_description"); }
  content = updateFm(content, fmPatch);
  if (typeof patch.body === "string" && patch.body.trim()) {
    const fmEnd = content.indexOf("---", 3);
    if (fmEnd !== -1) content = content.slice(0, fmEnd + 3) + "\n\n" + patch.body.trim() + "\n";
    updated.push("body");
  }
  fs.writeFileSync(found.absPath, content, "utf8");
  json(res, { ok: true, slug, updated, updated_at: updatedAt });

  setImmediate(() => {
    try {
      const indexPatch = { updated_at: updatedAt };
      if (fmPatch.title) indexPatch.title = fmPatch.title;
      if (fmPatch.meta_description) indexPatch.meta_description = fmPatch.meta_description;
      const arts = readJson(ARTICLES_INDEX);
      const ai = arts.findIndex((a) => a.slug === slug);
      if (ai !== -1) { arts[ai] = { ...arts[ai], ...indexPatch }; writeJson(ARTICLES_INDEX, arts); }
      else {
        const drfs = readJson(DRAFTS_INDEX);
        const di = drfs.findIndex((d) => d.slug === slug);
        if (di !== -1) { drfs[di] = { ...drfs[di], ...indexPatch }; writeJson(DRAFTS_INDEX, drfs); }
      }
    } catch (e) { console.warn("[api-server] update: index patch failed:", e); }
  });
}

// ── Scheduler ─────────────────────────────────────────────────────────────────
const DAILY_AUTO_LIMIT = 2;
const schedulerState = { last_run: null, last_published: [], runs_total: 0 };

function nextRunAt() {
  const now = new Date();
  const next = new Date(now);
  next.setHours(9, 0, 0, 0);
  if (next <= now) next.setDate(next.getDate() + 1);
  return next.toISOString();
}

async function runScheduledPublish() {
  console.log("[SCHEDULER] Running daily job...");
  const drafts = readJson(DRAFTS_INDEX);
  const now = Date.now();
  const candidates = drafts
    .filter((d) => d.status === "scheduled" && d.scheduled_at && new Date(d.scheduled_at).getTime() <= now)
    .sort((a, b) => new Date(a.scheduled_at).getTime() - new Date(b.scheduled_at).getTime())
    .slice(0, DAILY_AUTO_LIMIT);

  const publishedSlugs = [];
  for (const draft of candidates) {
    try {
      const fake = { headersSent: false, writeHead() {}, end() {} };
      const publishedAt = new Date().toISOString();
      await doPublish(draft.slug, publishedAt, fake);
      publishedSlugs.push(draft.slug);
      appendPublishLog({ slug: draft.slug, title: draft.title, published_at: publishedAt, triggered_by: "auto", status: "success" });
    } catch (e) {
      console.error("[SCHEDULER] Failed to publish", draft.slug, e);
      appendPublishLog({ slug: draft.slug, title: draft.title, published_at: new Date().toISOString(), triggered_by: "auto", status: "failed", error: String(e) });
    }
  }
  schedulerState.last_run = new Date().toISOString();
  schedulerState.last_published = publishedSlugs;
  schedulerState.runs_total += 1;
  console.log("[SCHEDULER] Completed. Published:", publishedSlugs.join(", ") || "(none)");
}

// Register cron — schedule at 09:00 every day
let cronRegistered = false;
async function startCron() {
  try {
    // dynamic import node-cron (it's a CJS module in this workspace)
    const nodeCron = await import("node-cron");
    const cron = nodeCron.default || nodeCron;
    cron.schedule("0 9 * * *", () => {
      runScheduledPublish().catch((e) => console.error("[SCHEDULER] Error:", e));
    });
    cronRegistered = true;
    console.log("[SCHEDULER] Cron registered — next run:", nextRunAt());
  } catch (e) {
    console.warn("[SCHEDULER] node-cron not available, skipping cron:", e.message);
  }
}

// ── HTTP server ───────────────────────────────────────────────────────────────
const server = http.createServer(async (req, res) => {
  const url = new URL(req.url, `http://localhost:${PORT}`);
  const pathname = url.pathname;
  const method = req.method ?? "GET";

  // CORS preflight
  if (method === "OPTIONS") {
    res.writeHead(204, {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "GET,POST,PATCH,DELETE,OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type",
    });
    res.end();
    return;
  }

  // Only handle /api/admin routes
  if (!pathname.startsWith("/api/admin")) {
    json(res, { error: "Not found" }, 404);
    return;
  }

  try {
    // GET /api/admin/stats
    if (pathname === "/api/admin/stats" && method === "GET") {
      const articles = readJson(ARTICLES_INDEX).map((a) => ({ ...a, status: a.status || "published" }));
      const drafts = readJson(DRAFTS_INDEX);
      const scheduled = drafts.filter((d) => d.status === "scheduled").length;
      const cats = {};
      for (const a of [...articles, ...drafts]) if (a.category) cats[a.category] = (cats[a.category] || 0) + 1;
      json(res, {
        published: articles.length,
        drafts: drafts.filter((d) => d.status === "draft").length,
        scheduled, total: articles.length + drafts.length, categories: cats,
        recentPublished: [...articles].sort((a, b) => new Date(b.published_at ?? 0).getTime() - new Date(a.published_at ?? 0).getTime()).slice(0, 10),
        recentDrafts: drafts.slice(0, 10),
      });
      return;
    }

    // GET /api/admin/articles
    if (pathname === "/api/admin/articles" && method === "GET") {
      const page = Math.max(1, parseInt(url.searchParams.get("page") ?? "1"));
      const limit = Math.min(50, Math.max(1, parseInt(url.searchParams.get("limit") ?? "20")));
      const q = (url.searchParams.get("q") ?? "").toLowerCase();
      const cat = url.searchParams.get("category") ?? "";
      let data = readJson(ARTICLES_INDEX).map((a) => ({ ...a, status: a.status || "published" }));
      if (q) data = data.filter((a) => a.title.toLowerCase().includes(q) || a.slug.includes(q));
      if (cat && cat !== "All") data = data.filter((a) => a.category === cat);
      const total = data.length;
      json(res, { data: data.slice((page-1)*limit, page*limit), total, page, pages: Math.ceil(total/limit), limit });
      return;
    }

    // GET /api/admin/drafts
    if (pathname === "/api/admin/drafts" && method === "GET") {
      const page = Math.max(1, parseInt(url.searchParams.get("page") ?? "1"));
      const limit = Math.min(50, Math.max(1, parseInt(url.searchParams.get("limit") ?? "20")));
      const q = (url.searchParams.get("q") ?? "").toLowerCase();
      const cat = url.searchParams.get("category") ?? "";
      const status = url.searchParams.get("status") ?? "";
      let data = readJson(DRAFTS_INDEX);
      if (q) data = data.filter((d) => d.title.toLowerCase().includes(q) || d.slug.includes(q));
      if (cat && cat !== "All") data = data.filter((d) => d.category === cat);
      if (status && status !== "all") data = data.filter((d) => d.status === status);
      const total = data.length;
      json(res, { data: data.slice((page-1)*limit, page*limit), total, page, pages: Math.ceil(total/limit), limit });
      return;
    }

    // POST /api/admin/articles/:slug/publish
    const pubM = pathname.match(/^\/api\/admin\/articles\/([^/]+)\/publish$/);
    if (pubM && method === "POST") {
      const body = await readBody(req);
      await doPublish(pubM[1], (body.published_at) || new Date().toISOString(), res);
      return;
    }

    // POST /api/admin/articles/:slug/unpublish
    const unpubM = pathname.match(/^\/api\/admin\/articles\/([^/]+)\/unpublish$/);
    if (unpubM && method === "POST") { await doUnpublish(unpubM[1], res); return; }

    // POST /api/admin/articles/:slug/schedule
    const schedM = pathname.match(/^\/api\/admin\/articles\/([^/]+)\/schedule$/);
    if (schedM && method === "POST") {
      const body = await readBody(req);
      if (!body.scheduled_at) { json(res, { error: "scheduled_at required" }, 400); return; }
      await doSchedule(schedM[1], body.scheduled_at, res);
      return;
    }

    // PATCH /api/admin/articles/:slug/update
    const updateM = pathname.match(/^\/api\/admin\/articles\/([^/]+)\/update$/);
    if (updateM && method === "PATCH") {
      const body = await readBody(req);
      const patch = {};
      if (typeof body.title === "string") patch.title = body.title;
      if (typeof body.meta_description === "string") patch.meta_description = body.meta_description;
      if (typeof body.body === "string") patch.body = body.body;
      if (!Object.keys(patch).length) { json(res, { error: "Provide at least one field: title, meta_description, body" }, 400); return; }
      await doUpdate(updateM[1], patch, res);
      return;
    }

    // DELETE /api/admin/articles/:slug
    const delM = pathname.match(/^\/api\/admin\/articles\/([^/]+)$/);
    if (delM && method === "DELETE") { await doDelete(delM[1], res); return; }

    // POST /api/admin/bulk
    if (pathname === "/api/admin/bulk" && method === "POST") {
      const body = await readBody(req);
      const { action, slugs } = body;
      const results = [];
      for (const slug of (slugs || [])) {
        const fake = { headersSent: false, writeHead() {}, end() {} };
        try {
          if (action === "publish") await doPublish(slug, new Date().toISOString(), fake);
          else if (action === "draft") await doUnpublish(slug, fake);
          else if (action === "delete") await doDelete(slug, fake);
          results.push({ slug, ok: true });
        } catch (e) { results.push({ slug, ok: false, error: String(e) }); }
      }
      json(res, { ok: true, results });
      return;
    }

    // POST /api/admin/check-scheduled
    if (pathname === "/api/admin/check-scheduled" && method === "POST") {
      const drafts = readJson(DRAFTS_INDEX);
      const now = Date.now();
      const toPublish = drafts.filter((d) => d.status === "scheduled" && d.scheduled_at && new Date(d.scheduled_at).getTime() <= now);
      for (const d of toPublish) {
        const fake = { headersSent: false, writeHead() {}, end() {} };
        await doPublish(d.slug, d.scheduled_at, fake);
        appendPublishLog({ slug: d.slug, title: d.title, published_at: new Date().toISOString(), triggered_by: "scheduled", status: "success" });
      }
      json(res, { ok: true, published: toPublish.map((d) => d.slug) });
      return;
    }

    // POST /api/admin/auto-publish
    if (pathname === "/api/admin/auto-publish" && method === "POST") {
      const body = await readBody(req);
      const dailyLimit = Math.min(10, Math.max(1, parseInt(String(body.limit ?? "2"))));
      const triggeredBy = body.triggered_by === "manual" ? "manual" : "auto";
      const todayStr = new Date().toISOString().slice(0, 10);
      const log = readPublishLog();
      const todayCount = log.filter((e) => e.published_at.startsWith(todayStr) && e.status === "success").length;
      const remaining = Math.max(0, dailyLimit - todayCount);
      if (remaining === 0) {
        json(res, { ok: true, published: [], todayCount, dailyLimit, remaining: 0, message: `Daily limit of ${dailyLimit} already reached for ${todayStr}` });
        return;
      }
      const drafts = readJson(DRAFTS_INDEX);
      const now = Date.now();
      const due = drafts
        .filter((d) => d.status === "scheduled" && d.scheduled_at && new Date(d.scheduled_at).getTime() <= now)
        .sort((a, b) => new Date(a.scheduled_at).getTime() - new Date(b.scheduled_at).getTime())
        .slice(0, remaining);
      const published = [];
      for (const d of due) {
        try {
          const fake = { headersSent: false, writeHead() {}, end() {} };
          await doPublish(d.slug, new Date().toISOString(), fake);
          published.push(d.slug);
          appendPublishLog({ slug: d.slug, title: d.title, published_at: new Date().toISOString(), triggered_by: triggeredBy, status: "success" });
        } catch (e) {
          appendPublishLog({ slug: d.slug, title: d.title, published_at: new Date().toISOString(), triggered_by: triggeredBy, status: "failed", error: String(e) });
        }
      }
      json(res, { ok: true, published, todayCount: todayCount + published.length, dailyLimit, remaining: remaining - published.length });
      return;
    }

    // GET /api/admin/publish-log
    if (pathname === "/api/admin/publish-log" && method === "GET") {
      json(res, readPublishLog().slice(0, 100));
      return;
    }

    // GET /api/admin/schedule-queue
    if (pathname === "/api/admin/schedule-queue" && method === "GET") {
      const drafts = readJson(DRAFTS_INDEX);
      const queue = drafts
        .filter((d) => d.status === "scheduled" && d.scheduled_at)
        .sort((a, b) => new Date(a.scheduled_at).getTime() - new Date(b.scheduled_at).getTime());
      const todayStr = new Date().toISOString().slice(0, 10);
      const log = readPublishLog();
      const todayPublished = log.filter((e) => e.published_at.startsWith(todayStr) && e.status === "success").length;
      json(res, { queue, todayPublished });
      return;
    }

    // GET /api/admin/scheduler/status
    if (pathname === "/api/admin/scheduler/status" && method === "GET") {
      const drafts = readJson(DRAFTS_INDEX);
      const queuedCount = drafts.filter((d) => d.status === "draft").length;
      const todayStr = new Date().toISOString().slice(0, 10);
      const log = readPublishLog();
      const todayPublished = log.filter((e) => e.published_at.startsWith(todayStr) && e.status === "success").length;
      json(res, {
        last_run: schedulerState.last_run,
        last_published: schedulerState.last_published,
        next_run: nextRunAt(),
        queued_articles_count: queuedCount,
        daily_limit: DAILY_AUTO_LIMIT,
        published_today: todayPublished,
        runs_total: schedulerState.runs_total,
      });
      return;
    }

    // POST /api/admin/scheduler/run
    if (pathname === "/api/admin/scheduler/run" && method === "POST") {
      json(res, { ok: true, message: "Scheduler triggered — check publish log" });
      setImmediate(() => runScheduledPublish().catch((e) => console.error("[SCHEDULER] Manual trigger error:", e)));
      return;
    }

    json(res, { error: "Unknown route: " + pathname }, 404);
  } catch (err) {
    console.error("[api-server] Error:", err);
    json(res, { error: String(err) }, 500);
  }
});

server.listen(PORT, "0.0.0.0", () => {
  console.log(`[api-server] Listening on port ${PORT}`);
  startCron();
});
