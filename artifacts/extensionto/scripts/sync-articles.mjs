#!/usr/bin/env node
/**
 * sync-articles.mjs  (v2 — SEO hardened)
 * Rebuilds public/content/articles-index.json from disk markdown files.
 *
 * What's new in v2:
 *  - meta_description exported into index (fixes Phase 2 / loading-state SEO)
 *  - Taxonomy auto-classifier rewrites wrong categories (fixes Phase 3)
 *  - Word-count + quality flags per article (feeds sitemap filter in Phase 4)
 *  - Author sanitisation — "AI Generator" → "ExtensionTo Editorial" (Phase 5)
 *  - Corrupted / partial slug detection
 *
 * Run: node scripts/sync-articles.mjs
 */

import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ARTICLES_DIR = path.join(__dirname, "../public/content/articles");
const INDEX_PATH   = path.join(__dirname, "../public/content/articles-index.json");

// ─── Taxonomy auto-classifier ────────────────────────────────────────────────
// Rules are evaluated in order — first match wins.
const TAXONOMY_RULES = [
  // Downloads & Media
  { re: /youtube.?(mp3|mp4|audio|downloader|converter)/i,          cat: "Downloads & Media" },
  { re: /download(er|ing)?|idm.?chrome|video.?saver|image.?downlo|bulk.?download|media.?downlo/i, cat: "Downloads & Media" },
  // Ad Blocking & Popup Blocking
  { re: /adblock|ad.?block|adblocker|block.?ads|remove.?ads|no.?ads|ad.?free|youtube.?block/i, cat: "Ad Blocking" },
  { re: /popup|pop.?up|poper.?blocker|anti.?popup/i,               cat: "Ad Blocking" },
  // Screenshot & Screen Capture
  { re: /screenshot|screen.?cap|screen.?grab|snip(ping)?|capture.?screen|full.?page.?screen/i, cat: "Screenshot & Screen Capture" },
  // Dark Mode & Themes
  { re: /dark.?mode|night.?mode|amoled|auto.?dark|dark.?theme/i,  cat: "Dark Mode & Themes" },
  // Privacy & Security (passwords, trackers, redirects)
  { re: /password|keepass|bitwarden|lastpass|dashlane|secura|vault|password.?manag/i, cat: "Privacy & Security" },
  { re: /privacy|tracker|ghostery|anti.?track|fingerprint|vpn|data.?protect|no.?track/i, cat: "Privacy & Security" },
  { re: /redirect|hijack|phishing|malware|safe.?browsing|block.?malicious/i, cat: "Privacy & Security" },
  // Performance & Memory
  { re: /\bram\b|memory.?saver|tab.?suspend|tab.?discard|tab.?manager|great.?suspender|high.?memory|cpu.?usage|freeze.?(tabs?|chrome)|slow.?pc|speed.?up.?chrome|protab/i, cat: "Performance & Memory" },
  // Developer Tools
  { re: /developer|devtool|debug|inspect.?element|json.?format|css.?viewer|api.?test|\bcors\b|react.?dev|lighthouse|wappalyzer|seo.?extens|font.?finder|color.?picker/i, cat: "Developer Tools" },
  // Mobile & Android
  { re: /android|mobile.?browser|kiwi.?browser|lemur.?browser|yandex.?browser|\bphone\b|\btablet\b/i, cat: "Mobile & Android" },
  // Social Media
  { re: /linkedin|twitter|facebook.?pixel|meta.?pixel|instagram|tiktok|social.?media/i, cat: "Social Media" },
  // Productivity & Workflow
  { re: /formula|spreadsheet|google.?sheet|excel/i,                cat: "Productivity & Workflow" },
  { re: /productivity|workflow|focus|schedule|bookmark|grammarly|grammar|writing/i, cat: "Productivity & Workflow" },
  // Chrome Extensions (general)
  { re: /chrome.?extension|chrome.?web.?store|manifest.?v3|install.?extension/i, cat: "Chrome Extensions" },
];

const BRAND_AUTHOR = "Daniel Carter";

function autoCategory(slug, title) {
  const text = `${slug} ${title}`.toLowerCase();
  for (const { re, cat } of TAXONOMY_RULES) {
    if (re.test(text)) return cat;
  }
  return "Chrome Extensions";
}

// ─── Slug quality checks ─────────────────────────────────────────────────────
function slugQualityFlags(slug, rawFilename) {
  const flags = [];
  if (rawFilename.includes("-partial")) flags.push("partial");
  // Corrupted: title duplicated mid-string (detected by repeated long segment)
  const half = slug.slice(0, Math.floor(slug.length / 2));
  if (slug.length > 60 && slug.indexOf(half.slice(0, 20), 20) !== -1) flags.push("corrupted_slug");
  if (slug.length > 100) flags.push("slug_too_long");
  return flags;
}

// ─── Content word count (body only, after frontmatter) ───────────────────────
function countWords(raw) {
  const afterFm = raw.replace(/^---[\s\S]*?---\s*/m, "");
  return afterFm
    .replace(/<[^>]+>/g, " ")
    .replace(/[^a-zA-Z0-9\s]/g, " ")
    .split(/\s+/)
    .filter(Boolean).length;
}

// ─── Fallback meta_description from body text ─────────────────────────────────
function deriveMeta(raw, existing) {
  if (existing && existing.trim() && !existing.startsWith("Discover the future of browser extensions")) {
    return existing.trim().slice(0, 160);
  }
  const body = raw.replace(/^---[\s\S]*?---\s*/m, "");
  const firstParagraph = body
    .replace(/<[^>]+>/g, " ")
    .replace(/#+\s+[^\n]+\n/g, "")
    .trim()
    .split(/\n+/)
    .find(l => l.trim().length > 60);
  return (firstParagraph || "").trim().slice(0, 160);
}

// ─── YAML frontmatter parser (handles >- and |- block scalars) ───────────────
function parseFrontmatter(content) {
  const match = content.match(/^---([\s\S]*?)---/);
  if (!match) return null;

  const lines = match[1].split("\n");
  const result = {};
  let i = 0;

  while (i < lines.length) {
    const line = lines[i];
    const keyMatch = line.match(/^([a-zA-Z_][a-zA-Z0-9_]*):\s*(.*)/);
    if (!keyMatch) { i++; continue; }

    const key = keyMatch[1];
    let val = keyMatch[2].trim();

    if (val === ">-" || val === "|-" || val === ">" || val === "|") {
      const block = [];
      i++;
      while (i < lines.length && (lines[i].startsWith("  ") || lines[i] === "")) {
        block.push(lines[i].trim());
        i++;
      }
      result[key] = block.filter(Boolean).join(val.startsWith(">") ? " " : "\n");
    } else {
      if (
        (val.startsWith('"') && val.endsWith('"')) ||
        (val.startsWith("'") && val.endsWith("'"))
      ) {
        val = val.slice(1, -1);
      }
      result[key] = val;
      i++;
    }
  }

  return result;
}

function normalizeSlug(slug) {
  return slug
    .toLowerCase()
    .replace(/[^a-z0-9]/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");
}

function sanitizeAuthor(raw) {
  if (!raw) return BRAND_AUTHOR;
  const trimmed = raw.trim();
  if (["AI Generator", "Generator", "AI", ""].includes(trimmed)) return BRAND_AUTHOR;
  return trimmed;
}

// ─── Walk directory ───────────────────────────────────────────────────────────
function walkDir(dir, files = []) {
  if (!fs.existsSync(dir)) return files;
  for (const f of fs.readdirSync(dir)) {
    const fp = path.join(dir, f);
    if (fs.statSync(fp).isDirectory()) walkDir(fp, files);
    else if (fp.endsWith(".md")) files.push(fp);
  }
  return files;
}

// ─── Main ─────────────────────────────────────────────────────────────────────
const mdFiles = walkDir(ARTICLES_DIR);
console.log(`Found ${mdFiles.length} markdown files`);

const items = [];
let errors = 0;
const stats = { thin: 0, partial: 0, corrupted: 0, noMeta: 0, reclassified: 0, authorFixed: 0 };

for (const f of mdFiles) {
  try {
    const raw = fs.readFileSync(f, "utf8");
    const fm = parseFrontmatter(raw);
    const filename = path.basename(f, ".md");

    if (!fm) { console.warn(`⚠ No frontmatter: ${filename}`); errors++; continue; }
    if (!fm.slug) { console.warn(`⚠ No slug: ${filename}`); errors++; continue; }

    const status = (fm.status || "").replace(/"/g, "").trim();
    if (status !== "published") continue;

    const slug = normalizeSlug(fm.slug);
    const c1 = slug[0] || "_";
    const c2 = slug[1] || "_";
    const c3 = slug[2] || "_";

    // Word count
    const wordCount = countWords(raw);

    // Quality flags
    const qualityFlags = slugQualityFlags(slug, filename);
    if (wordCount < 300) { qualityFlags.push("thin"); stats.thin++; }
    if (wordCount < 300) { /* already counted */ }

    // Taxonomy auto-classifier
    const originalCat = (fm.category || "Uncategorized").replace(/"/g, "").trim();
    const detectedCat = autoCategory(slug, fm.title || "");
    const finalCat = detectedCat;
    if (finalCat !== originalCat) stats.reclassified++;

    // Author sanitisation
    const rawAuthor = (fm.author || "").replace(/"/g, "").trim();
    const author = sanitizeAuthor(rawAuthor);
    if (author !== rawAuthor && rawAuthor !== "") stats.authorFixed++;

    // meta_description — use existing or derive from body
    const rawMeta = fm.meta_description || fm.description || "";
    const metaDescription = deriveMeta(raw, rawMeta);
    if (!metaDescription) stats.noMeta++;

    // Excerpt — prefer frontmatter, fallback to truncated meta
    const excerpt = (fm.excerpt || metaDescription || "").slice(0, 200);

    // Partial flag from filename
    if (filename.includes("-partial")) { stats.partial++; qualityFlags.push("partial"); }

    // Corrupted slug flag stats
    if (qualityFlags.includes("corrupted_slug")) stats.corrupted++;

    items.push({
      id:               fm.id || slug,
      title:            (fm.title || "").replace(/"/g, "").trim(),
      slug,
      meta_description: metaDescription,
      description:      metaDescription,
      excerpt,
      published_at:     fm.published_at || fm.created_at || new Date().toISOString(),
      updated_at:       fm.updated_at   || fm.published_at || new Date().toISOString(),
      category:         finalCat,
      original_category: originalCat !== finalCat ? originalCat : undefined,
      author,
      image_url:        fm.image || fm.featured_image || fm.image_url || "",
      featured_image:   fm.image || fm.featured_image || fm.image_url || "",
      reading_time:     parseInt(fm.read_time) || 5,
      read_time:        parseInt(fm.read_time) || 5,
      views:            parseInt(fm.views) || 0,
      tags:             [],
      keywords:         [],
      canonicalPath:    `/blog/${slug}`,
      filePath:         `/content/articles/${c1}/${c2}/${c3}/${slug}.md`,
      word_count:       wordCount,
      quality_flags:    qualityFlags.length ? qualityFlags : undefined,
    });
  } catch (e) {
    console.error(`Error parsing ${path.basename(f)}:`, e.message);
    errors++;
  }
}

// Deduplicate by slug — keep the one with newest updated_at
const slugMap = {};
for (const item of items) {
  const existing = slugMap[item.slug];
  if (!existing || new Date(item.updated_at) > new Date(existing.updated_at)) {
    slugMap[item.slug] = item;
  }
}

const deduped = Object.values(slugMap).sort(
  (a, b) => new Date(b.published_at) - new Date(a.published_at)
);

fs.writeFileSync(INDEX_PATH, JSON.stringify(deduped, null, 2));

console.log(`✓ Written articles-index.json: ${deduped.length} articles (${errors} parse errors)`);
console.log(`  → Categories reclassified: ${stats.reclassified}`);
console.log(`  → Authors sanitised:       ${stats.authorFixed}`);
console.log(`  → Thin articles (<300w):   ${stats.thin}`);
console.log(`  → Partial files detected:  ${stats.partial}`);
console.log(`  → Corrupted slugs:         ${stats.corrupted}`);
console.log(`  → Missing meta fallback:   ${stats.noMeta}`);
