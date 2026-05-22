import fs from "fs";
import path from "path";
import cron from "node-cron";
import { logger } from "./lib/logger";

const EXTENSIONTO_ROOT = path.resolve(process.cwd(), "../extensionto");
const DRAFTS_INDEX     = path.join(EXTENSIONTO_ROOT, "public/content/drafts-index.json");
const ARTICLES_INDEX   = path.join(EXTENSIONTO_ROOT, "public/content/articles");
const ARTICLES_IDX     = path.join(EXTENSIONTO_ROOT, "public/content/articles-index.json");
const SITEMAP_PATH     = path.join(EXTENSIONTO_ROOT, "public/sitemap.xml");
const WEBSITE_URL      = "https://extensionto.com";

interface Art {
  id: string; title: string; slug: string; category?: string | null;
  status: string; published_at?: string | null; scheduled_at?: string | null;
  filePath: string; canonicalPath: string; featured_image?: string | null;
  image_url?: string; read_time?: number; reading_time?: number; views?: number;
  meta_description?: string; description?: string; excerpt?: string;
  author?: string; tags?: string[]; keywords?: string[]; updated_at?: string | null;
}

function readJson<T>(p: string): T {
  try { return JSON.parse(fs.readFileSync(p, "utf8")) as T; }
  catch { return [] as unknown as T; }
}
function writeJson(p: string, data: unknown) {
  fs.writeFileSync(p, JSON.stringify(data, null, 2), "utf8");
}

function escXml(s: string) {
  return String(s).replace(/[<>&'"]/g, (c) => ({"<":"&lt;",">":"&gt;","&":"&amp;","'":"&apos;",'"':"&quot;"})[c as keyof object] as string);
}

function toDateStr(iso?: string | null) {
  if (!iso) return new Date().toISOString().split("T")[0];
  try { return new Date(iso).toISOString().split("T")[0]; } catch { return new Date().toISOString().split("T")[0]; }
}

const PILLAR_SLUGS = new Set([
  "how-to-fix-chrome-high-memory-usage-2026-complete-guide",
  "adblock-chrome-android-complete-guide-2026",
  "best-chrome-screenshot-extensions-2026-complete-guide",
  "best-chrome-privacy-extensions-2026-complete-guide",
]);
const DISQUALIFYING = new Set(["thin", "partial", "corrupted_slug"]);

function regenerateSitemap() {
  try {
    const articles = readJson<Art[]>(ARTICLES_IDX);
    const STATIC = [
      { url: "/", changefreq: "weekly", priority: "1.0" },
      { url: "/blog", changefreq: "daily", priority: "0.9" },
      { url: "/privacy", changefreq: "yearly", priority: "0.3" },
      { url: "/terms", changefreq: "yearly", priority: "0.3" },
    ];
    const EXTENSIONS = ["quick-screenshot-lite","auto-dark-mode-switcher","redirect-shield","protab-suspender","light-popup-blocker","formula-builder-pro","securakey-pro","offline-reader-pro","cookie-banner-blocker"];
    const articlePages = articles
      .filter((a) => { const flags: string[] = (a as unknown as Record<string, string[]>).quality_flags || []; return !flags.some((f) => DISQUALIFYING.has(f)) && !a.slug.includes("-partial"); })
      .map((a) => {
        const isPillar = PILLAR_SLUGS.has(a.slug);
        const age = a.published_at ? Math.floor((Date.now() - new Date(a.published_at).getTime()) / 86400000) : 9999;
        const isNew = age < 30;
        return { url: `/blog/${a.slug}`, changefreq: isPillar || isNew ? "weekly" : "monthly", priority: isPillar ? "0.85" : isNew ? "0.8" : "0.7", lastmod: toDateStr((a as unknown as Record<string, string>)["updated_at"] || a.published_at) };
      });
    const extPages = EXTENSIONS.map((s) => ({ url: `/extension/${s}`, changefreq: "monthly", priority: "0.9", lastmod: undefined as string | undefined }));
    const all = [...STATIC.map(p => ({ ...p, lastmod: undefined as string | undefined })), ...articlePages, ...extPages];
    const xml = `<?xml version="1.0" encoding="UTF-8"?>\n<?xml-stylesheet type="text/xsl" href="/sitemap.xsl"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${all.map((p) => `  <url>\n    <loc>${escXml(WEBSITE_URL + p.url)}</loc>\n    <changefreq>${p.changefreq}</changefreq>\n    <priority>${p.priority}</priority>${p.lastmod ? `\n    <lastmod>${p.lastmod}</lastmod>` : ""}\n  </url>`).join("\n")}\n</urlset>`;
    fs.writeFileSync(SITEMAP_PATH, xml, "utf8");
    logger.info("[scheduler] sitemap regenerated");
  } catch (e) { logger.warn({ err: e }, "[scheduler] sitemap regeneration failed"); }
}

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

function normalizeSlug(s: string) {
  return s.toLowerCase().replace(/[^a-z0-9]/g, "-").replace(/-+/g, "-").replace(/^-|-$/g, "");
}

function findArticleFile(slug: string, fallback?: string | null) {
  const norm = normalizeSlug(slug);
  const [c1, c2, c3] = [norm[0] || "_", norm[1] || "_", norm[2] || "_"];
  const rel = `/content/articles/${c1}/${c2}/${c3}/${norm}.md`;
  const abs = path.join(EXTENSIONTO_ROOT, "public" + rel);
  if (fs.existsSync(abs)) return { absPath: abs, relFilePath: rel };
  if (fallback) {
    const fa = path.join(EXTENSIONTO_ROOT, "public" + fallback);
    if (fs.existsSync(fa)) return { absPath: fa, relFilePath: fallback };
  }
  return null;
}

async function publishScheduled() {
  const now = Date.now();
  const drafts = readJson<Art[]>(DRAFTS_INDEX);
  const toPublish = drafts.filter(d =>
    d.status === "scheduled" &&
    d.scheduled_at &&
    new Date(d.scheduled_at).getTime() <= now
  );

  if (toPublish.length === 0) return;

  logger.info(`[scheduler] publishing ${toPublish.length} scheduled articles`);

  const articles = readJson<Art[]>(ARTICLES_IDX);
  let changed = false;

  for (const draft of toPublish) {
    try {
      const publishedAt = new Date().toISOString();
      const found = findArticleFile(draft.slug, draft.filePath);

      if (found) {
        let c = fs.readFileSync(found.absPath, "utf8");
        c = updateFm(c, { status: "published", published_at: publishedAt, scheduled_at: null });
        fs.writeFileSync(found.absPath, c, "utf8");
      }

      const entry: Art = {
        ...draft,
        status: "published",
        published_at: publishedAt,
        scheduled_at: null,
        filePath: found?.relFilePath ?? draft.filePath,
        canonicalPath: `/blog/${draft.slug}`,
        image_url: draft.featured_image ?? draft.image_url ?? `/images/blog/${draft.slug}.webp`,
        featured_image: draft.featured_image ?? draft.image_url ?? `/images/blog/${draft.slug}.webp`,
        reading_time: draft.read_time ?? draft.reading_time,
        views: draft.views ?? 0,
        updated_at: publishedAt,
      };

      const without = articles.filter(a => a.slug !== draft.slug);
      without.unshift(entry);
      articles.length = 0;
      articles.push(...without);
      changed = true;

      logger.info(`[scheduler] published: ${draft.slug}`);
    } catch (err) {
      logger.error({ err, slug: draft.slug }, "[scheduler] failed to publish article");
    }
  }

  if (changed) {
    writeJson(ARTICLES_IDX, articles);
    const publishedSlugs = new Set(toPublish.map(d => d.slug));
    writeJson(DRAFTS_INDEX, drafts.filter(d => !publishedSlugs.has(d.slug)));
    regenerateSitemap();
  }
}

export function startScheduler() {
  logger.info("[scheduler] starting — checks every minute for scheduled articles");
  cron.schedule("* * * * *", () => {
    publishScheduled().catch(err => logger.error({ err }, "[scheduler] error"));
  });
  publishScheduled().catch(() => {});
}
