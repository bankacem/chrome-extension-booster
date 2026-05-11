#!/usr/bin/env node
/**
 * generate-sitemap.mjs
 * Generates public/sitemap.xml from:
 *   - Static pages
 *   - articles-index.json (from disk, not Supabase)
 *   - Extension pages
 *
 * Run: node scripts/generate-sitemap.mjs
 * Or after sync: node scripts/sync-articles.mjs && node scripts/generate-sitemap.mjs
 */

import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const INDEX_PATH = path.join(__dirname, "../public/content/articles-index.json");
const SITEMAP_PATH = path.join(__dirname, "../public/sitemap.xml");

const WEBSITE_URL = "https://extensionto.com";

const STATIC_PAGES = [
  { url: "/", changefreq: "weekly", priority: "1.0" },
  { url: "/blog", changefreq: "daily", priority: "0.9" },
  { url: "/privacy", changefreq: "yearly", priority: "0.3" },
  { url: "/terms", changefreq: "yearly", priority: "0.3" },
];

const EXTENSION_SLUGS = [
  "quick-screenshot-lite",
  "auto-dark-mode-switcher",
  "redirect-shield",
  "protab-suspender",
  "light-popup-blocker",
  "formula-builder-pro",
  "securakey-pro",
  "offline-reader-pro",
  "cookie-banner-blocker",
];

// Pillar articles get boosted priority
const PILLAR_SLUGS = new Set([
  "how-to-fix-chrome-high-memory-usage-2026-complete-guide",
  "adblock-chrome-android-complete-guide-2026",
  "best-chrome-screenshot-extensions-2026-complete-guide",
  "best-chrome-privacy-extensions-2026-complete-guide",
  "best-youtube-downloader-chrome-extension-2026",
]);

function escapeXml(s) {
  return String(s).replace(
    /[<>&'"]/g,
    (c) => ({ "<": "&lt;", ">": "&gt;", "&": "&amp;", "'": "&apos;", '"': "&quot;" }[c])
  );
}

function toDateStr(iso) {
  if (!iso) return new Date().toISOString().split("T")[0];
  try { return new Date(iso).toISOString().split("T")[0]; }
  catch { return new Date().toISOString().split("T")[0]; }
}

const articles = JSON.parse(fs.readFileSync(INDEX_PATH, "utf8"));
console.log(`Loaded ${articles.length} articles from index`);

const articlePages = articles.map((a) => ({
  url: `/blog/${a.slug}`,
  changefreq: PILLAR_SLUGS.has(a.slug) ? "weekly" : "monthly",
  priority: PILLAR_SLUGS.has(a.slug) ? "0.9" : "0.7",
  lastmod: toDateStr(a.updated_at || a.published_at),
}));

const extensionPages = EXTENSION_SLUGS.map((s) => ({
  url: `/extension/${s}`,
  changefreq: "monthly",
  priority: "0.6",
}));

const allPages = [...STATIC_PAGES, ...articlePages, ...extensionPages];

const xml = `<?xml version="1.0" encoding="UTF-8"?>
<?xml-stylesheet type="text/xsl" href="/sitemap.xsl"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${allPages
  .map(
    (p) => `  <url>
    <loc>${escapeXml(WEBSITE_URL + p.url)}</loc>
    <changefreq>${p.changefreq}</changefreq>
    <priority>${p.priority}</priority>${
      p.lastmod ? `\n    <lastmod>${p.lastmod}</lastmod>` : ""
    }
  </url>`
  )
  .join("\n")}
</urlset>`;

fs.writeFileSync(SITEMAP_PATH, xml);
const urlCount = (xml.match(/<url>/g) || []).length;
console.log(
  `✓ Written sitemap.xml: ${urlCount} URLs (${STATIC_PAGES.length} static + ${articlePages.length} articles + ${extensionPages.length} extensions)`
);
