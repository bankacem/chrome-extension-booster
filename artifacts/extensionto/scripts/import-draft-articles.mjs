#!/usr/bin/env node
/**
 * import-draft-articles.mjs
 * Imports markdown articles as DRAFTS — disk only (no Supabase required).
 *
 * What it does:
 *   1. Parses each .md file from the import directory
 *   2. Enriches frontmatter (category, TOC, related links, SEO fields)
 *   3. Saves to public/content/articles/{c1}/{c2}/{c3}/{slug}.md with status: draft
 *   4. Rebuilds public/content/drafts-index.json (all draft articles)
 *
 * SAFETY: status is hard-locked to "draft". Articles NEVER appear on the
 * public blog until manually published from the Admin Dashboard.
 *
 * Run: node scripts/import-draft-articles.mjs [/path/to/md/dir]
 */

import fs   from "fs";
import path from "path";
import { randomUUID } from "crypto";
import { fileURLToPath } from "url";

const __dirname   = path.dirname(fileURLToPath(import.meta.url));
const ARTICLES_DIR = path.join(__dirname, "../public/content/articles");
const DRAFTS_INDEX = path.join(__dirname, "../public/content/drafts-index.json");
const IMPORT_DIR   = process.argv[2] || "/tmp/articles-import/extensionto-articles";
const AUTHOR       = "Daniel Carter";
const SITE_URL     = "https://extensionto.com";

// ── Taxonomy ──────────────────────────────────────────────────────────────────
const TAXONOMY_RULES = [
  { re: /youtube.?(mp3|mp4|audio|downloader|converter)/i,               cat: "Downloads & Media" },
  { re: /download(er|ing)?|idm.?chrome|video.?saver|bulk.?download/i,   cat: "Downloads & Media" },
  { re: /adblock|ad.?block|block.?ads|no.?ads|ad.?free|youtube.?block/i, cat: "Ad Blocking" },
  { re: /popup|pop.?up|poper.?blocker|anti.?popup/i,                    cat: "Ad Blocking" },
  { re: /screenshot|screen.?cap|screen.?grab|snip|full.?page.?screen/i, cat: "Screenshot & Screen Capture" },
  { re: /dark.?mode|night.?mode|amoled|dark.?theme/i,                   cat: "Dark Mode & Themes" },
  { re: /password|keepass|bitwarden|lastpass|dashlane|vault/i,           cat: "Privacy & Security" },
  { re: /privacy|tracker|ghostery|anti.?track|fingerprint|vpn/i,         cat: "Privacy & Security" },
  { re: /redirect|hijack|phishing|malware|cookie/i,                      cat: "Privacy & Security" },
  { re: /\bram\b|memory|onetab|suspender|slow.?chrome|speed.?up/i,      cat: "Performance & Memory" },
  { re: /developer|devtool|debug|inspect|json.?format|api.?test/i,       cat: "Developer Tools" },
  { re: /android|mobile.?browser|kiwi.?browser|yandex.?browser|\bphone\b/i, cat: "Mobile & Android" },
  { re: /linkedin|twitter|facebook|instagram|tiktok|social.?media/i,     cat: "Social Media" },
  { re: /productivity|workflow|focus|bookmark|organize|backup|profile|incognito|offline|export/i, cat: "Productivity & Workflow" },
];

function autoCategory(slug, title) {
  const text = `${slug} ${title}`.toLowerCase();
  for (const { re, cat } of TAXONOMY_RULES) { if (re.test(text)) return cat; }
  return "Chrome Extensions";
}

// ── Frontmatter parser ────────────────────────────────────────────────────────
function parseFrontmatter(content) {
  const match = content.match(/^---([\s\S]*?)---/);
  if (!match) return {};
  const result = {};
  for (const line of match[1].split("\n")) {
    const m = line.match(/^([a-zA-Z_][a-zA-Z0-9_]*):\s*(.*)/);
    if (!m) continue;
    let val = m[2].trim();
    if ((val.startsWith('"') && val.endsWith('"')) ||
        (val.startsWith("'") && val.endsWith("'"))) val = val.slice(1, -1);
    result[m[1]] = val;
  }
  return result;
}

function getBody(content) {
  return content.replace(/^---[\s\S]*?---\s*/m, "").trim();
}

function normalizeSlug(s) {
  return (s || "").toLowerCase().replace(/[^a-z0-9]/g, "-").replace(/-+/g, "-").replace(/^-|-$/g, "");
}

function wordCount(body) {
  return body.replace(/<[^>]+>/g, " ").split(/\s+/).filter(Boolean).length;
}

function estimateReadTime(body) {
  return Math.max(1, Math.round(wordCount(body) / 200));
}

function buildExcerpt(description, body) {
  if (description && description.length > 20) return description.slice(0, 160);
  return body.replace(/#+\s[^\n]+/g, "").replace(/[*_`#>\-]/g, "").replace(/\s+/g, " ").trim().slice(0, 160);
}

// ── Auto-generate TOC from H2/H3 ────────────────────────────────────────────
function generateTOC(body) {
  const headings = body.split("\n").filter(l => /^#{2,3}\s/.test(l));
  if (headings.length < 2) return "";
  const items = headings.map(h => {
    const level  = h.match(/^(#{2,3})/)[1].length;
    const text   = h.replace(/^#{2,3}\s+/, "").replace(/\s*\{#[^}]+\}$/, "").trim();
    const anchor = text.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
    return `${level === 3 ? "  " : ""}- [${text}](#${anchor})`;
  });
  return `## Table of Contents\n\n${items.join("\n")}\n\n---\n\n`;
}

// ── Cluster map for internal linking ─────────────────────────────────────────
function buildClusters(articles) {
  const clusters = {};
  for (const a of articles) {
    if (!clusters[a.category]) clusters[a.category] = [];
    clusters[a.category].push({ slug: a.slug, title: a.title });
  }
  return clusters;
}

function buildRelatedBlock(slug, category, clusters) {
  const peers = (clusters[category] || []).filter(a => a.slug !== slug).slice(0, 4);
  if (!peers.length) return "";
  return `\n\n---\n\n## Related Articles\n\n${peers.map(p => `- [${p.title}](/blog/${p.slug})`).join("\n")}\n`;
}

// ── Walk existing articles dir for slug collision check ───────────────────────
function existingSlugSet() {
  const slugs = new Set();
  function walk(dir) {
    if (!fs.existsSync(dir)) return;
    for (const f of fs.readdirSync(dir)) {
      const fp = path.join(dir, f);
      if (fs.statSync(fp).isDirectory()) walk(fp);
      else if (f.endsWith(".md")) slugs.add(path.basename(f, ".md"));
    }
  }
  walk(ARTICLES_DIR);
  return slugs;
}

// ── Main ─────────────────────────────────────────────────────────────────────
const mdFiles = fs.readdirSync(IMPORT_DIR).filter(f => f.endsWith(".md")).sort();
console.log(`\n📂  Found ${mdFiles.length} markdown files in ${IMPORT_DIR}\n`);

const existingSlugs = existingSlugSet();

// First pass: parse to build cluster map
const parsed = [];
for (const file of mdFiles) {
  const raw   = fs.readFileSync(path.join(IMPORT_DIR, file), "utf8");
  const fm    = parseFrontmatter(raw);
  const body  = getBody(raw);
  const slug  = normalizeSlug(fm.slug || file.replace(/^\d+-/, "").replace(/\.md$/, ""));
  const title = fm.title || slug.replace(/-/g, " ");
  parsed.push({ file, raw, fm, body, slug, title, category: autoCategory(slug, title) });
}

const clusters = buildClusters(parsed);

console.log("📊  Category clusters:");
for (const [cat, arts] of Object.entries(clusters)) {
  console.log(`   ${cat}: ${arts.length} articles`);
}
console.log();

// Read existing drafts-index (to merge into, not overwrite)
let existingDrafts = [];
if (fs.existsSync(DRAFTS_INDEX)) {
  try { existingDrafts = JSON.parse(fs.readFileSync(DRAFTS_INDEX, "utf8")); } catch {}
}
const existingDraftSlugs = new Set(existingDrafts.map(d => d.slug));

// Second pass: enrich and save
const now = new Date().toISOString();
const newDraftEntries = [];
const results = { saved: [], skipped: [], errors: [] };

for (const { file, fm, body, slug, title, category } of parsed) {
  try {
    if (existingSlugs.has(slug) || existingDraftSlugs.has(slug)) {
      console.log(`⏭  SKIP (already exists): ${slug}`);
      results.skipped.push(slug);
      continue;
    }

    const id          = randomUUID();
    const description = fm.description || fm.meta_description || "";
    const excerpt     = buildExcerpt(description, body);
    const metaDesc    = (description || excerpt).slice(0, 160);
    const tags        = fm.tags
      ? fm.tags.replace(/[\[\]]/g, "").split(",").map(t => t.trim()).filter(Boolean)
      : [];
    const keywords    = [...new Set([slug.replace(/-/g, " "), ...tags])].slice(0, 8);
    const readTime    = estimateReadTime(body);
    const wc          = wordCount(body);

    // Enrich body: prepend TOC, append related links
    const toc          = generateTOC(body);
    const relatedBlock = buildRelatedBlock(slug, category, clusters);
    const enrichedBody = toc + body + relatedBlock;

    // Build enriched frontmatter
    const enrichedFm = [
      `---`,
      `id: ${id}`,
      `title: "${title.replace(/"/g, '\\"')}"`,
      `slug: ${slug}`,
      `meta_description: "${metaDesc.replace(/"/g, '\\"')}"`,
      `excerpt: "${excerpt.replace(/"/g, '\\"')}"`,
      `description: "${metaDesc.replace(/"/g, '\\"')}"`,
      `category: ${category}`,
      `tags: [${tags.map(t => `"${t}"`).join(", ")}]`,
      `keywords: [${keywords.map(k => `"${k}"`).join(", ")}]`,
      `author: "${AUTHOR}"`,
      `status: draft`,
      `published_at: null`,
      `scheduled_at: null`,
      `created_at: "${now}"`,
      `updated_at: "${now}"`,
      `read_time: ${readTime}`,
      `views: 0`,
      `canonical: "${SITE_URL}/blog/${slug}"`,
      `---`,
    ].join("\n");

    const finalContent = `${enrichedFm}\n\n${enrichedBody}`;

    // Save markdown to nested directory
    const c1  = slug[0] || "_";
    const c2  = slug[1] || "_";
    const c3  = slug[2] || "_";
    const dir = path.join(ARTICLES_DIR, c1, c2, c3);
    fs.mkdirSync(dir, { recursive: true });
    fs.writeFileSync(path.join(dir, `${slug}.md`), finalContent, "utf8");

    // Draft index entry
    newDraftEntries.push({
      id,
      title,
      slug,
      meta_description: metaDesc,
      description:      metaDesc,
      excerpt,
      category,
      tags,
      keywords,
      author:      AUTHOR,
      status:      "draft",
      published_at: null,
      scheduled_at: null,
      created_at:  now,
      updated_at:  now,
      read_time:   readTime,
      word_count:  wc,
      views:       0,
      featured_image: null,
      filePath:    `/content/articles/${c1}/${c2}/${c3}/${slug}.md`,
      canonicalPath: `/blog/${slug}`,
    });

    console.log(`✅  DRAFT  (${wc}w · ${readTime}min · ${category}): ${slug}`);
    results.saved.push({ slug, title, category, wordCount: wc });
  } catch (err) {
    console.error(`❌  ERROR: ${slug} — ${err.message}`);
    results.errors.push({ slug, error: err.message });
  }
}

// Merge and write drafts-index.json
const mergedDrafts = [...existingDrafts, ...newDraftEntries];
fs.writeFileSync(DRAFTS_INDEX, JSON.stringify(mergedDrafts, null, 2), "utf8");
console.log(`\n📝  drafts-index.json updated — ${mergedDrafts.length} total drafts`);

// ── Summary ───────────────────────────────────────────────────────────────────
console.log("\n" + "═".repeat(62));
console.log("IMPORT COMPLETE");
console.log("═".repeat(62));
console.log(`✅  Imported as draft : ${results.saved.length}`);
console.log(`⏭  Skipped (exists)  : ${results.skipped.length}`);
console.log(`❌  Errors            : ${results.errors.length}`);

if (results.saved.length > 0) {
  console.log("\n📋  Imported articles:");
  results.saved.forEach((a, i) =>
    console.log(`   ${String(i + 1).padStart(2)}. [${a.category}] ${a.title}`)
  );
}
if (results.errors.length > 0) {
  console.log("\n⚠️  Errors:");
  results.errors.forEach(e => console.log(`   ${e.slug}: ${e.error}`));
}

console.log(`
🔒  All ${results.saved.length} articles saved as status=draft.
    ✔ NOT visible on the public blog (/blog)
    ✔ Visible in Admin Dashboard (/admin/dashboard)
    ✔ drafts-index.json written to public/content/
    ✔ Markdown files saved to public/content/articles/
`);
