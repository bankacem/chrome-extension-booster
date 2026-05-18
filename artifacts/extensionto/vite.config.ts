import { defineConfig, type Plugin } from "vite";
import react from "@vitejs/plugin-react";
import path from "path";
import fs from "fs";
import type { IncomingMessage, ServerResponse } from "http";

// ── Absolute paths ─────────────────────────────────────────────────────────────
const ARTICLES_DIR   = path.join(__dirname, "public/content/articles");
const DRAFTS_INDEX   = path.join(__dirname, "public/content/drafts-index.json");
const ARTICLES_INDEX = path.join(__dirname, "public/content/articles-index.json");

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
    const re = new RegExp(`^(${key}):\\s*.*$`, "m");
    const line = val === null ? `${key}: null` : `${key}: "${val}"`;
    if (re.test(fm)) fm = fm.replace(re, line);
    else fm += `\n${line}`;
  }
  return content.replace(/^---([\s\S]*?)---/, `---${fm}---`);
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
  const drafts: Art[] = readJson(DRAFTS_INDEX);
  const draft = drafts.find((d) => d.slug === slug);
  if (!draft) { res.statusCode = 404; res.end(JSON.stringify({ error: "Draft not found" })); return; }

  const absPath = path.join(__dirname, "public" + draft.filePath);
  if (fs.existsSync(absPath)) {
    let c = fs.readFileSync(absPath, "utf8");
    c = updateFm(c, { status: "published", published_at: publishedAt, scheduled_at: null });
    fs.writeFileSync(absPath, c, "utf8");
  }

  const articles: Art[] = readJson(ARTICLES_INDEX);
  if (!articles.find((a) => a.slug === slug)) {
    const entry: Art = {
      ...draft,
      status: "published",
      published_at: publishedAt,
      scheduled_at: null,
      image_url: draft.featured_image || `/images/blog/${slug}.webp`,
      featured_image: draft.featured_image || `/images/blog/${slug}.webp`,
      reading_time: draft.read_time,
      views: 0,
    };
    articles.unshift(entry);
    writeJson(ARTICLES_INDEX, articles);
  }
  writeJson(DRAFTS_INDEX, drafts.filter((d) => d.slug !== slug));
  // Regenerate sitemap so the newly published article is indexed
  regenerateSitemap();
  res.end(JSON.stringify({ ok: true, slug, published_at: publishedAt }));
}

async function doUnpublish(slug: string, res: ServerResponse) {
  const articles: Art[] = readJson(ARTICLES_INDEX);
  const article = articles.find((a) => a.slug === slug);
  if (!article) { res.statusCode = 404; res.end(JSON.stringify({ error: "Not found" })); return; }

  const absPath = path.join(__dirname, "public" + article.filePath);
  if (fs.existsSync(absPath)) {
    let c = fs.readFileSync(absPath, "utf8");
    c = updateFm(c, { status: "draft", published_at: null });
    fs.writeFileSync(absPath, c, "utf8");
  }
  writeJson(ARTICLES_INDEX, articles.filter((a) => a.slug !== slug));
  const drafts: Art[] = readJson(DRAFTS_INDEX);
  if (!drafts.find((d) => d.slug === slug)) {
    drafts.unshift({ ...article, status: "draft", published_at: null });
    writeJson(DRAFTS_INDEX, drafts);
  }
  res.end(JSON.stringify({ ok: true, slug }));
}

async function doSchedule(slug: string, scheduledAt: string, res: ServerResponse) {
  const drafts: Art[] = readJson(DRAFTS_INDEX);
  const idx = drafts.findIndex((d) => d.slug === slug);
  if (idx === -1) { res.statusCode = 404; res.end(JSON.stringify({ error: "Draft not found" })); return; }

  const absPath = path.join(__dirname, "public" + drafts[idx].filePath);
  if (fs.existsSync(absPath)) {
    let c = fs.readFileSync(absPath, "utf8");
    c = updateFm(c, { status: "scheduled", scheduled_at: scheduledAt });
    fs.writeFileSync(absPath, c, "utf8");
  }
  drafts[idx] = { ...drafts[idx], status: "scheduled", scheduled_at: scheduledAt };
  writeJson(DRAFTS_INDEX, drafts);
  res.end(JSON.stringify({ ok: true, slug, scheduled_at: scheduledAt }));
}

async function doDelete(slug: string, res: ServerResponse) {
  // Remove from both indexes (never deletes the markdown file — it stays on disk)
  const drafts: Art[] = readJson(DRAFTS_INDEX);
  writeJson(DRAFTS_INDEX, drafts.filter((d) => d.slug !== slug));
  const articles: Art[] = readJson(ARTICLES_INDEX);
  const wasPublished = articles.some((a) => a.slug === slug);
  if (wasPublished) {
    writeJson(ARTICLES_INDEX, articles.filter((a) => a.slug !== slug));
    regenerateSitemap();
  }
  res.end(JSON.stringify({ ok: true, slug }));
}

function adminApiPlugin(): Plugin {
  return {
    name: "admin-api",
    configureServer(server) {
      server.middlewares.use(async (req, res, next) => {
        if (!req.url?.startsWith("/api/admin")) return next();

        res.setHeader("Content-Type", "application/json");
        res.setHeader("Cache-Control", "no-store");

        const url      = new URL(req.url, "http://localhost");
        const pathname = url.pathname;
        const method   = req.method ?? "GET";

        try {
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

          // DELETE /api/admin/articles/:slug
          const delM = pathname.match(/^\/api\/admin\/articles\/([^/]+)$/);
          if (delM && method === "DELETE") { await doDelete(delM[1], res); return; }

          // POST /api/admin/bulk
          if (pathname === "/api/admin/bulk" && method === "POST") {
            const body = await readBody(req);
            const { action, slugs } = body as { action: string; slugs: string[] };
            const results: unknown[] = [];
            for (const slug of (slugs || [])) {
              const fake = { statusCode: 200, end() {} } as unknown as ServerResponse;
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
              const fake = { statusCode: 200, end() {} } as unknown as ServerResponse;
              await doPublish(d.slug, d.scheduled_at!, fake);
            }
            res.end(JSON.stringify({ ok: true, published: toPublish.map((d) => d.slug) }));
            return;
          }

          res.statusCode = 404;
          res.end(JSON.stringify({ error: "Unknown route: " + pathname }));
        } catch (err: unknown) {
          res.statusCode = 500;
          res.end(JSON.stringify({ error: String(err) }));
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
  },
});
