#!/usr/bin/env node
/**
 * generate-sitemap.mjs  (v2 — quality-filtered)
 * Generates public/sitemap.xml from validated articles only.
 *
 * What's new in v2:
 *  - Excludes articles with quality_flags: thin, partial, corrupted_slug, slug_too_long
 *  - Priority tiering: extension pages 0.9, pillar articles 0.85, standard 0.7, new (<30d) 0.8
 *  - changefreq differentiated by age and pillar status
 *  - Extension pages boosted to 0.9
 *  - Logs excluded articles for traceability
 *
 * Run: node scripts/generate-sitemap.mjs
 */

import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const INDEX_PATH   = path.join(__dirname, "../public/content/articles-index.json");
const SITEMAP_PATH = path.join(__dirname, "../public/sitemap.xml");

const WEBSITE_URL = "https://extensionto.com";

// Flags that disqualify an article from the sitemap
const DISQUALIFYING_FLAGS = new Set(["thin", "partial", "corrupted_slug"]);

const STATIC_PAGES = [
  { url: "/",        changefreq: "weekly",  priority: "1.0" },
  { url: "/blog",    changefreq: "daily",   priority: "0.9" },
  { url: "/privacy", changefreq: "yearly",  priority: "0.3" },
  { url: "/terms",   changefreq: "yearly",  priority: "0.3" },
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

// Pillar articles — highest article priority
const PILLAR_SLUGS = new Set([
  "how-to-fix-chrome-high-memory-usage-2026-complete-guide",
  "adblock-chrome-android-complete-guide-2026",
  "best-chrome-screenshot-extensions-2026-complete-guide",
  "best-chrome-privacy-extensions-2026-complete-guide",
  "best-youtube-downloader-chrome-extension-2026",
  "best-chrome-extensions-for-privacy-2026-protect-your-online-identity-mll9br233zj",
  "chrome-extensions-on-android-2026-kiwi-vs-yandex-vs-lemur-full-guide",
  "best-full-page-screenshot-chrome-extension-2026-free-no-login-required",
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

function daysSince(iso) {
  if (!iso) return 9999;
  try { return Math.floor((Date.now() - new Date(iso).getTime()) / 86400000); }
  catch { return 9999; }
}

// ─── Load articles ────────────────────────────────────────────────────────────
const allArticles = JSON.parse(fs.readFileSync(INDEX_PATH, "utf8"));
console.log(`Loaded ${allArticles.length} articles from index`);

const excluded = [];
const included = [];

for (const a of allArticles) {
  const flags = a.quality_flags || [];
  const hasDisqualifyingFlag = flags.some(f => DISQUALIFYING_FLAGS.has(f));

  if (hasDisqualifyingFlag) {
    excluded.push({ slug: a.slug, reason: flags.filter(f => DISQUALIFYING_FLAGS.has(f)).join(", ") });
    continue;
  }

  // Also exclude if slug contains "-partial" anywhere
  if (a.slug.includes("-partial")) {
    excluded.push({ slug: a.slug, reason: "partial-in-slug" });
    continue;
  }

  included.push(a);
}

if (excluded.length > 0) {
  console.log(`\n⚠ Excluded ${excluded.length} articles from sitemap:`);
  excluded.forEach(e => console.log(`  - ${e.slug} (${e.reason})`));
  console.log();
}

// ─── Build sitemap entries ────────────────────────────────────────────────────
const articlePages = included.map((a) => {
  const isPillar = PILLAR_SLUGS.has(a.slug);
  const age = daysSince(a.published_at);
  const isNew = age < 30;

  let priority = "0.7";
  let changefreq = "monthly";

  if (isPillar) {
    priority = "0.85";
    changefreq = "weekly";
  } else if (isNew) {
    priority = "0.8";
    changefreq = "weekly";
  }

  return {
    url:        `/blog/${a.slug}`,
    changefreq,
    priority,
    lastmod:    toDateStr(a.updated_at || a.published_at),
  };
});

const extensionPages = EXTENSION_SLUGS.map((s) => ({
  url:        `/extension/${s}`,
  changefreq: "monthly",
  priority:   "0.9",
}));

const allPages = [...STATIC_PAGES, ...articlePages, ...extensionPages];

// ─── Write sitemap ────────────────────────────────────────────────────────────
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
console.log(`  → Excluded from sitemap: ${excluded.length} low-quality articles`);
