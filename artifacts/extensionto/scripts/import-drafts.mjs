#!/usr/bin/env node
/**
 * import-drafts.mjs
 * Imports .md files from a ZIP archive as DRAFTS only.
 *
 * Rules:
 * - status is always set to "draft" — nothing is published
 * - articles-index.json is NEVER touched
 * - sitemap is NEVER touched
 * - Existing files are NEVER overwritten (slug conflict → append -2, -3 …)
 * - SHA-256 deduplication: identical content (by hash) is skipped once
 * - Partitions file into c1/c2/c3 structure using normalizeSlug()
 * - Updates drafts-index.json only
 *
 * Usage:
 *   node scripts/import-drafts.mjs [path/to/file.zip]
 *   (default: searches attached_assets/ for articles-individual*.zip)
 */

import fs from "fs";
import path from "path";
import crypto from "crypto";
import { execSync } from "child_process";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PROJECT_ROOT   = path.join(__dirname, "..");
const ARTICLES_DIR   = path.join(PROJECT_ROOT, "public/content/articles");
const DRAFTS_INDEX   = path.join(PROJECT_ROOT, "public/content/drafts-index.json");
const ARTICLES_INDEX = path.join(PROJECT_ROOT, "public/content/articles-index.json");

// ─── Helpers ─────────────────────────────────────────────────────────────────

function normalizeSlug(slug) {
  return slug
    .toLowerCase()
    .replace(/[^a-z0-9]/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");
}

function sha256(data) {
  return crypto.createHash("sha256").update(data).digest("hex");
}

function readJson(p) {
  try { return JSON.parse(fs.readFileSync(p, "utf8")); } catch { return []; }
}

function writeJson(p, data) {
  fs.writeFileSync(p, JSON.stringify(data, null, 2), "utf8");
}

// Parse YAML frontmatter (handles block scalars and YAML arrays)
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
        block.push(lines[i].trim()); i++;
      }
      result[key] = block.filter(Boolean).join(val.startsWith(">") ? " " : "\n");
    } else {
      if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
        val = val.slice(1, -1);
      }
      result[key] = val;
      i++;
    }
  }
  return result;
}

// Parse YAML tags array (e.g. "[a, b, c]" or plain string)
function parseTags(raw) {
  if (!raw) return [];
  if (typeof raw !== "string") return [];
  const s = raw.trim();
  if (s.startsWith("[")) {
    return s.replace(/^\[|\]$/g, "").split(",").map(t => t.trim().replace(/^['"]|['"]$/g, "")).filter(Boolean);
  }
  return [s].filter(Boolean);
}

// Extract body (everything after closing ---)
function extractBody(content) {
  const m = content.match(/^---[\s\S]*?---\s*([\s\S]*)$/);
  return m ? m[1] : content;
}

// Build normalised draft markdown
function buildDraftMarkdown(fm, body, slug, now) {
  const title       = (fm.title       || "").replace(/^"|"$/g, "").trim();
  const description = (fm.description || fm.meta_description || "").replace(/^"|"$/g, "").trim();
  const author      = (fm.author      || "ExtensionTo Editorial").replace(/^"|"$/g, "").trim();
  const category    = (fm.category    || "Chrome Extensions").replace(/^"|"$/g, "").trim();
  const imageUrl    = (fm.image || fm.featured_image || fm.image_url || "").replace(/^"|"$/g, "").trim();
  const safeTitle   = title.replace(/"/g, '\\"');
  const safeDesc    = description.replace(/"/g, '\\"');

  const lines = [
    `---`,
    `title: "${safeTitle}"`,
    `slug: ${slug}`,
    `description: "${safeDesc}"`,
    `meta_description: "${safeDesc}"`,
    `category: "${category}"`,
    `author: "${author}"`,
    `status: draft`,
    `published_at: null`,
    `updated_at: "${now}"`,
    `created_at: "${now}"`,
    imageUrl ? `featured_image: "${imageUrl}"` : null,
    imageUrl ? `image_url: "${imageUrl}"` : null,
    `read_time: 5`,
    `---`,
  ].filter(line => line !== null).join("\n");

  return lines + "\n\n" + body.trim() + "\n";
}

// Build a drafts-index entry
function buildDraftEntry(fm, slug, filePath, now, tags) {
  const description = (fm.description || fm.meta_description || "").replace(/^"|"$/g, "").trim();
  const author      = (fm.author || "ExtensionTo Editorial").replace(/^"|"$/g, "").trim();
  const category    = (fm.category || "Chrome Extensions").replace(/^"|"$/g, "").trim();
  const imageUrl    = (fm.image || fm.featured_image || fm.image_url || "").replace(/^"|"$/g, "").trim();
  return {
    id:              crypto.randomUUID(),
    title:           (fm.title || "").replace(/^"|"$/g, "").trim(),
    slug,
    meta_description: description.slice(0, 160),
    description:     description.slice(0, 160),
    excerpt:         description.slice(0, 200),
    category,
    tags,
    keywords:        tags,
    author,
    status:          "draft",
    published_at:    null,
    scheduled_at:    null,
    created_at:      now,
    updated_at:      now,
    read_time:       5,
    views:           0,
    featured_image:  imageUrl || null,
    image_url:       imageUrl || null,
    filePath,
    canonicalPath:   `/blog/${slug}`,
  };
}

// Extract .md files from ZIP using Python (no unzip binary in NixOS)
function extractFromZip(zipPath) {
  const tmpDir = `/tmp/import_drafts_${Date.now()}`;
  fs.mkdirSync(tmpDir, { recursive: true });
  execSync(`python3 -c "
import zipfile, os
z = zipfile.ZipFile('${zipPath.replace(/'/g, "\\'")}')
for name in z.namelist():
    if name.endswith('.md'):
        data = z.read(name)
        out = os.path.join('${tmpDir}', os.path.basename(name))
        open(out, 'wb').write(data)
"`, { stdio: "pipe" });

  const files = fs.readdirSync(tmpDir)
    .filter(f => f.endsWith(".md"))
    .map(f => {
      const absPath = path.join(tmpDir, f);
      const buf = fs.readFileSync(absPath);
      fs.unlinkSync(absPath);
      return { filename: f, content: buf.toString("utf8"), hash: sha256(buf) };
    });
  try { fs.rmSync(tmpDir, { recursive: true, force: true }); } catch {}
  return files;
}

// ─── Find ZIP ─────────────────────────────────────────────────────────────────
const cliArg = process.argv[2];
let zipPath;

if (cliArg && fs.existsSync(cliArg)) {
  zipPath = cliArg;
} else {
  // Auto-detect: prefer articles-individual*.zip, fall back to any zip in attached_assets
  const assetDir = path.join(PROJECT_ROOT, "../../attached_assets");
  const candidates = fs.existsSync(assetDir)
    ? fs.readdirSync(assetDir)
        .filter(f => f.endsWith(".zip"))
        .sort((a, b) => {
          // articles-individual*.zip has priority
          const pa = a.includes("articles-individual") ? 0 : 1;
          const pb = b.includes("articles-individual") ? 0 : 1;
          return pa - pb || a.localeCompare(b);
        })
    : [];
  if (candidates.length === 0) {
    console.error("❌ No ZIP file found. Pass path as argument or upload to attached_assets/.");
    process.exit(1);
  }
  zipPath = path.join(assetDir, candidates[0]);
}

console.log(`\n📦 ZIP: ${path.basename(zipPath)}\n`);

// ─── Extract ──────────────────────────────────────────────────────────────────
console.log("🔓 Extracting …");
const extracted = extractFromZip(zipPath);
console.log(`   Found ${extracted.length} .md files in ZIP\n`);

// ─── Collect existing slugs (published + drafts) ──────────────────────────────
const publishedIndex = readJson(ARTICLES_INDEX);
const draftsIndex    = readJson(DRAFTS_INDEX);

const existingSlugs  = new Set([
  ...publishedIndex.map(a => a.slug),
  ...draftsIndex.map(a => a.slug),
]);

// SHA-256 hashes already on disk (to skip true byte-for-byte duplicates)
const existingHashes = new Set();
function walkHashes(dir) {
  if (!fs.existsSync(dir)) return;
  for (const f of fs.readdirSync(dir)) {
    const fp = path.join(dir, f);
    if (fs.statSync(fp).isDirectory()) walkHashes(fp);
    else if (fp.endsWith(".md")) {
      existingHashes.add(sha256(fs.readFileSync(fp)));
    }
  }
}
walkHashes(ARTICLES_DIR);

console.log(`📚 Existing published: ${publishedIndex.length}`);
console.log(`📝 Existing drafts:    ${draftsIndex.length}`);
console.log(`🔑 Existing slug set:  ${existingSlugs.size}\n`);

// ─── Process each file ───────────────────────────────────────────────────────
const now = new Date().toISOString();
const newDraftEntries = [];
const seenHashesThisRun = new Set(); // deduplicate within this ZIP run

let countImported = 0;
let countSkipped  = 0;
let countRenamed  = 0;
let countErrors   = 0;

for (const { filename, content, hash } of extracted) {
  // Skip exact byte-for-byte duplicates (same content already on disk or in this run)
  if (existingHashes.has(hash) || seenHashesThisRun.has(hash)) {
    console.log(`  ⏭  Duplicate hash — skipping: ${filename}`);
    countSkipped++;
    continue;
  }
  seenHashesThisRun.add(hash);

  const fm = parseFrontmatter(content);
  if (!fm) {
    console.warn(`  ⚠  No frontmatter — skipping: ${filename}`);
    countErrors++;
    continue;
  }

  // Determine slug
  const rawSlug = (fm.slug || "").toString().trim() ||
                  path.basename(filename, ".md").replace(/^\d+-/, "");
  let slug = normalizeSlug(rawSlug);
  if (!slug) {
    console.warn(`  ⚠  Cannot determine slug — skipping: ${filename}`);
    countErrors++;
    continue;
  }

  // Resolve slug conflicts — never overwrite
  if (existingSlugs.has(slug)) {
    let suffix = 2;
    while (existingSlugs.has(`${slug}-${suffix}`)) suffix++;
    const renamed = `${slug}-${suffix}`;
    console.log(`  ⚠  Slug conflict "${slug}" → renamed to "${renamed}"`);
    slug = renamed;
    countRenamed++;
  }

  // Canonical partition path
  const c1 = slug[0] || "_";
  const c2 = slug[1] || "_";
  const c3 = slug[2] || "_";
  const partitionDir = path.join(ARTICLES_DIR, c1, c2, c3);
  const destPath     = path.join(partitionDir, `${slug}.md`);
  const relFilePath  = `/content/articles/${c1}/${c2}/${c3}/${slug}.md`;

  // Write markdown file (status: draft)
  const body       = extractBody(content);
  const tags       = parseTags(fm.tags);
  const normalised = buildDraftMarkdown(fm, body, slug, now);

  fs.mkdirSync(partitionDir, { recursive: true });
  fs.writeFileSync(destPath, normalised, "utf8");
  existingSlugs.add(slug);
  existingHashes.add(hash);

  // Build index entry
  newDraftEntries.push(buildDraftEntry(fm, slug, relFilePath, now, tags));
  countImported++;
  console.log(`  ✓  ${slug}  →  ${relFilePath}`);
}

// ─── Update drafts-index.json only ───────────────────────────────────────────
if (newDraftEntries.length > 0) {
  // Prepend new entries, keeping existing ones unchanged
  const updatedDrafts = [...newDraftEntries, ...draftsIndex];
  writeJson(DRAFTS_INDEX, updatedDrafts);
  console.log(`\n✅ drafts-index.json updated: ${updatedDrafts.length} total drafts`);
} else {
  console.log(`\n⚠  No new drafts to add.`);
}

// ─── Final report ─────────────────────────────────────────────────────────────
console.log(`
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
📊 Import Report
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  📦  ZIP file             : ${path.basename(zipPath)}
  📄  Total .md extracted  : ${extracted.length}
  ✅  Imported as drafts   : ${countImported}
  ⚠   Renamed (-2/-3 etc)  : ${countRenamed}
  ⏭   Skipped (exact dupe) : ${countSkipped}
  ✗   Parse errors         : ${countErrors}
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  📝  drafts-index.json    : ${readJson(DRAFTS_INDEX).length} entries
  📚  articles-index.json  : ${publishedIndex.length} entries (UNCHANGED)
  🗺   sitemap.xml          : UNCHANGED
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
`);
