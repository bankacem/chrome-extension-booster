#!/usr/bin/env node
/**
 * sync-and-build-sitemap.cjs
 * Run with: node sync-and-build-sitemap.cjs <path-to-articles-export.json>
 * Or:       node sync-and-build-sitemap.cjs   (uses public/content/articles-export.json if present)
 */

const fs = require('fs');
const path = require('path');

const ROOT = process.cwd();
const exportArg = process.argv[2];

// ── 1. Load export ──────────────────────────────────────────────────────────
let exportPath = exportArg;

if (!exportPath) {
  const possiblePaths = [
    path.join(ROOT, 'public', 'content', 'articles-export.json'),
    path.join(ROOT, 'articles-export.json')
  ];
  for (const p of possiblePaths) {
    if (fs.existsSync(p)) {
      exportPath = p;
      break;
    }
  }
}

if (!exportPath || !fs.existsSync(exportPath)) {
  console.error(`ERROR: export file not found at ${exportPath || 'default locations'}`);
  console.error('Usage: node sync-and-build-sitemap.cjs <path-to-articles-export.json>');
  process.exit(1);
}

console.log(`Loading export from: ${exportPath}`);
const allArticles = JSON.parse(fs.readFileSync(exportPath, 'utf-8'));

// ── 2. Filter & map ─────────────────────────────────────────────────────────
const published = allArticles.filter(a => a.status === 'published');
console.log(`Published articles: ${published.length}`);

const validEntries = [];
const skipped = [];

for (const a of published) {
  const slug = (a.slug || '').trim();
  // Skip bad slugs (title used as slug)
  if (!slug || slug.length > 200 || /\s/.test(slug)) {
    skipped.push({ slug: slug.slice(0, 80), title: a.title });
    continue;
  }
  validEntries.push({
    id: a.id || '',
    title: a.title || '',
    slug,
    description: a.meta_description || a.excerpt || '',
    excerpt: a.excerpt || '',
    published_at: a.published_at || '',
    category: a.category || '',
    author: a.author || '',
    image_url: a.featured_image || '',
    read_time: a.read_time || 5,
    views: a.views || 0,
    tags: a.tags || [],
    keywords: a.keywords || [],
    canonicalPath: `/blog/${slug}`,
    updated_at: a.updated_at || a.published_at || '',
  });
}

// Sort newest first
validEntries.sort((a, b) => (b.published_at || '').localeCompare(a.published_at || ''));

console.log(`Valid entries: ${validEntries.length}`);
if (skipped.length) {
  console.log(`Skipped (bad slug): ${skipped.length}`);
  skipped.forEach(s => console.log(`  SKIP: ${s.slug || s.title}`));
}

// ── 3. Write articles-index.json ────────────────────────────────────────────
const indexPath = path.join(ROOT, 'public', 'content', 'articles-index.json');
fs.writeFileSync(indexPath, JSON.stringify(validEntries, null, 2), 'utf-8');
console.log(`\n✅ articles-index.json written: ${validEntries.length} articles`);
console.log(`   Latest: ${validEntries[0]?.published_at?.slice(0, 10)}`);

// ── 4. Generate sitemap.xml ─────────────────────────────────────────────────
const WEBSITE_URL = 'https://extensionto.com';
const PILLARS = {
  'how-to-fix-chrome-high-memory-usage': ['0.9', 'weekly'],
  'adblock-chrome-android': ['0.9', 'weekly'],
  'best-chrome-screenshot-extensions': ['0.9', 'weekly'],
  'best-chrome-privacy-extensions': ['0.9', 'weekly'],
  'best-youtube-downloader-chrome-extension': ['0.9', 'weekly'],
};

function escapeXml(s) {
  return String(s)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function makeUrl(url, freq, priority, lastmod) {
  let s = `  <url>\n    <loc>${escapeXml(WEBSITE_URL + url)}</loc>\n`;
  s += `    <changefreq>${freq}</changefreq>\n`;
  s += `    <priority>${priority}</priority>`;
  if (lastmod) s += `\n    <lastmod>${lastmod}</lastmod>`;
  s += '\n  </url>';
  return s;
}

const urls = [];

// Static pages
urls.push(makeUrl('/', 'weekly', '1.0'));
urls.push(makeUrl('/blog', 'daily', '0.8'));
urls.push(makeUrl('/privacy', 'yearly', '0.3'));
urls.push(makeUrl('/terms', 'yearly', '0.3'));

// Article pages
for (const a of validEntries) {
  // Check if slug contains any of our pillar keywords
  const pillarKey = Object.keys(PILLARS).find(p => a.slug.includes(p));
  const pillar = pillarKey ? PILLARS[pillarKey] : null;

  const priority = pillar ? pillar[0] : '0.7';
  const freq = pillar ? pillar[1] : 'monthly';
  const dateStr = (a.updated_at || a.published_at || '').slice(0, 10);
  urls.push(makeUrl(`/blog/${a.slug}`, freq, priority, dateStr || undefined));
}

// Extension pages — read from src/lib/extensionsData.ts
let extSlugs = [];
const extDataPath = path.join(ROOT, 'src', 'lib', 'extensionsData.ts');
if (fs.existsSync(extDataPath)) {
  const extContent = fs.readFileSync(extDataPath, 'utf-8');
  extSlugs = [...extContent.matchAll(/slug:\s*['"]([^'"]+)['"]/g)].map(m => m[1]);
}
for (const slug of extSlugs) {
  urls.push(makeUrl(`/extension/${slug}`, 'monthly', '0.6'));
}

const xml = [
  '<?xml version="1.0" encoding="UTF-8"?>',
  '<?xml-stylesheet type="text/xsl" href="/sitemap.xsl"?>',
  '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">',
  urls.join('\n'),
  '</urlset>',
].join('\n');

const sitemapPath = path.join(ROOT, 'public', 'sitemap.xml');
fs.writeFileSync(sitemapPath, xml, 'utf-8');

const urlCount = (xml.match(/<url>/g) || []).length;
console.log(`✅ sitemap.xml written: ${urlCount} URLs`);
console.log(`   Articles: ${validEntries.length}, Extensions: ${extSlugs.length}, Static: 4`);

// ── 5. Quick sanity check ────────────────────────────────────────────────────
const mayCount = validEntries.filter(a => (a.published_at || '').startsWith('2026-05')).length;
const aprCount = validEntries.filter(a => (a.published_at || '').startsWith('2026-04')).length;
console.log(`\n📊 Article breakdown:`);
console.log(`   Jan 2026: ${validEntries.filter(a => a.published_at?.startsWith('2026-01')).length}`);
console.log(`   Feb 2026: ${validEntries.filter(a => a.published_at?.startsWith('2026-02')).length}`);
console.log(`   Mar 2026: ${validEntries.filter(a => a.published_at?.startsWith('2026-03')).length}`);
console.log(`   Apr 2026: ${aprCount}`);
console.log(`   May 2026: ${mayCount}`);
console.log(`\n✅ Done. Commit both files to deploy.`);
