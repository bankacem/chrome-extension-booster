#!/usr/bin/env node
/**
 * import-articles.mjs
 * Imports .md files from ZIP archives into the articles directory.
 * - Normalizes frontmatter to match existing article format
 * - Adds status: published + published_at if missing
 * - Partitions into c1/c2/c3 directory structure
 * - Handles slug conflicts with -2 suffix (never overwrites existing articles)
 * - Runs sync-articles.mjs + generate-sitemap.mjs after import
 *
 * Usage: node scripts/import-articles.mjs [zip1] [zip2] ...
 *        (defaults to checking attached_assets for known ZIPs)
 */

import fs from "fs";
import path from "path";
import { createRequire } from "module";
import { fileURLToPath } from "url";
import { execSync } from "child_process";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ARTICLES_DIR = path.join(__dirname, "../public/content/articles");
const INDEX_PATH = path.join(__dirname, "../public/content/articles-index.json");

// ─── normalizeSlug (must match vite.config.ts and sync-articles.mjs) ─────────
function normalizeSlug(slug) {
  return slug
    .toLowerCase()
    .replace(/[^a-z0-9]/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");
}

// ─── Parse YAML frontmatter (handles block scalars, quoted values, arrays) ───
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
      if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
        val = val.slice(1, -1);
      }
      result[key] = val;
      i++;
    }
  }
  return result;
}

// ─── Build the set of slugs already on disk ───────────────────────────────────
function collectExistingSlugsOnDisk() {
  const slugs = new Set();
  function walk(dir) {
    if (!fs.existsSync(dir)) return;
    for (const f of fs.readdirSync(dir)) {
      const fp = path.join(dir, f);
      if (fs.statSync(fp).isDirectory()) walk(fp);
      else if (fp.endsWith(".md")) {
        const raw = fs.readFileSync(fp, "utf8");
        const fm = parseFrontmatter(raw);
        if (fm?.slug) slugs.add(normalizeSlug(fm.slug));
        else slugs.add(normalizeSlug(path.basename(fp, ".md")));
      }
    }
  }
  walk(ARTICLES_DIR);
  return slugs;
}

// ─── Rewrite frontmatter to normalised form ───────────────────────────────────
function buildNormalisedMarkdown(fm, originalBody, slug, publishedAt) {
  // Map incoming field names to canonical names
  const title     = (fm.title || "").replace(/^"|"$/g, "").trim();
  const desc      = (fm.description || fm.meta_description || "").replace(/^"|"$/g, "").trim();
  const author    = (fm.author || "ExtensionTo Editorial").replace(/^"|"$/g, "").trim();
  const category  = (fm.category || "Chrome Extensions").replace(/^"|"$/g, "").trim();
  const imageUrl  = (fm.image || fm.featured_image || fm.image_url || "").replace(/^"|"$/g, "").trim();

  // Tags — may be YAML array like [tag1, tag2] or a string
  let tagsRaw = fm.tags || "";
  if (typeof tagsRaw === "string") {
    tagsRaw = tagsRaw.replace(/[\[\]]/g, "").split(",").map(t => t.trim()).filter(Boolean);
  }

  const fmLines = [
    `---`,
    `title: "${title.replace(/"/g, '\\"')}"`,
    `slug: ${slug}`,
    `description: "${desc.replace(/"/g, '\\"')}"`,
    `meta_description: "${desc.replace(/"/g, '\\"')}"`,
    `category: "${category}"`,
    `author: "${author}"`,
    `status: published`,
    `published_at: "${publishedAt}"`,
    `updated_at: "${publishedAt}"`,
    imageUrl ? `featured_image: "${imageUrl}"` : null,
    imageUrl ? `image_url: "${imageUrl}"` : null,
    `read_time: 5`,
    `---`,
  ].filter(line => line !== null).join("\n");

  return fmLines + "\n\n" + originalBody.trim() + "\n";
}

// ─── Extract body (everything after closing ---) ──────────────────────────────
function extractBody(content) {
  const m = content.match(/^---[\s\S]*?---\s*([\s\S]*)$/);
  return m ? m[1] : content;
}

// ─── Read ZIP using Node.js AdmZip (or fall back to Python extraction) ────────
async function extractMarkdownFiles(zipPath) {
  // Use Python to extract since unzip binary is unavailable
  const tmpDir = `/tmp/import_${Date.now()}`;
  fs.mkdirSync(tmpDir, { recursive: true });
  execSync(`python3 -c "
import zipfile, os, sys
z=zipfile.ZipFile('${zipPath}')
for name in z.namelist():
    if name.endswith('.md'):
        data=z.read(name)
        out=os.path.join('${tmpDir}', os.path.basename(name))
        open(out,'wb').write(data)
"`, { stdio: "pipe" });

  const files = fs.readdirSync(tmpDir).filter(f => f.endsWith(".md"));
  const result = [];
  for (const f of files) {
    const absPath = path.join(tmpDir, f);
    result.push({ filename: f, content: fs.readFileSync(absPath, "utf8") });
    fs.unlinkSync(absPath);
  }
  fs.rmdirSync(tmpDir, { recursive: true });
  return result;
}

// ─── Main ─────────────────────────────────────────────────────────────────────
const ZIP_PATHS = [
  path.join(__dirname, "../../../attached_assets/extensionto-52-articles_1778979788138.zip"),
  path.join(__dirname, "../../../attached_assets/extensionto-52-articles_1778979843892.zip"),
];

// Also accept CLI args
const cliZips = process.argv.slice(2).filter(a => a.endsWith(".zip") && fs.existsSync(a));
const allZips = cliZips.length ? cliZips : ZIP_PATHS.filter(p => fs.existsSync(p));

if (allZips.length === 0) {
  console.error("No ZIP files found. Pass paths as arguments or place them in attached_assets/.");
  process.exit(1);
}

console.log(`\n📦 Found ${allZips.length} ZIP file(s):\n${allZips.map(z => "  " + z).join("\n")}\n`);

// Collect all markdown files from all ZIPs, deduplicate by filename (same file in both ZIPs)
const seenFilenames = new Set();
const allArticles = [];
for (const zipPath of allZips) {
  console.log(`Extracting: ${path.basename(zipPath)} …`);
  const files = await extractMarkdownFiles(zipPath);
  for (const f of files) {
    if (!seenFilenames.has(f.filename)) {
      seenFilenames.add(f.filename);
      allArticles.push(f);
    }
  }
}
console.log(`\n📄 Total unique .md files across all ZIPs: ${allArticles.length}\n`);

// Collect existing slugs on disk
const existingSlugs = collectExistingSlugsOnDisk();
console.log(`📚 Existing articles on disk: ${existingSlugs.size}\n`);

// Published date to use for all imported articles
const publishedAt = new Date().toISOString();

let imported = 0;
let skippedDuplicates = 0;
let renamedConflicts = 0;
let parseErrors = 0;

for (const { filename, content } of allArticles) {
  const fm = parseFrontmatter(content);
  if (!fm) {
    console.warn(`  ⚠ No frontmatter — skipping: ${filename}`);
    parseErrors++;
    continue;
  }

  // Determine slug — prefer frontmatter slug, fall back to filename without prefix number
  const rawSlug = fm.slug || path.basename(filename, ".md").replace(/^\d+-/, "");
  let slug = normalizeSlug(rawSlug);

  if (!slug) {
    console.warn(`  ⚠ Could not determine slug — skipping: ${filename}`);
    parseErrors++;
    continue;
  }

  // Handle slug conflict — do NOT overwrite existing
  let finalSlug = slug;
  if (existingSlugs.has(slug)) {
    // Try -2 suffix, then -imported
    const candidate2 = `${slug}-2`;
    if (!existingSlugs.has(candidate2)) {
      finalSlug = candidate2;
      console.log(`  ⚠ Conflict: "${slug}" → renamed to "${finalSlug}"`);
      renamedConflicts++;
    } else {
      console.log(`  ⏭ Duplicate (both base and -2 exist): "${slug}" — skipping`);
      skippedDuplicates++;
      continue;
    }
  }

  // Compute canonical partition path
  const c1 = finalSlug[0] || "_";
  const c2 = finalSlug[1] || "_";
  const c3 = finalSlug[2] || "_";
  const partitionDir = path.join(ARTICLES_DIR, c1, c2, c3);
  const destPath = path.join(partitionDir, `${finalSlug}.md`);

  // Build normalised markdown content
  const body = extractBody(content);
  const normalised = buildNormalisedMarkdown(fm, body, finalSlug, publishedAt);

  // Write file
  fs.mkdirSync(partitionDir, { recursive: true });
  fs.writeFileSync(destPath, normalised, "utf8");
  existingSlugs.add(finalSlug);
  imported++;

  const relPath = `/content/articles/${c1}/${c2}/${c3}/${finalSlug}.md`;
  console.log(`  ✓ ${finalSlug}  →  ${relPath}`);
}

console.log(`
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
📊 Import Summary
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  ✅ Successfully imported : ${imported}
  ⚠  Renamed (conflict -2) : ${renamedConflicts}
  ⏭  Skipped (duplicates)  : ${skippedDuplicates}
  ✗  Parse errors          : ${parseErrors}
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
`);

// ─── Rebuild index + sitemap ──────────────────────────────────────────────────
console.log("🔄 Running sync-articles …");
execSync("node scripts/sync-articles.mjs", {
  cwd: path.join(__dirname, ".."),
  stdio: "inherit",
});

console.log("\n🗺  Regenerating sitemap …");
execSync("node scripts/generate-sitemap.mjs", {
  cwd: path.join(__dirname, ".."),
  stdio: "inherit",
});

// Final count from rebuilt index
const finalIndex = JSON.parse(fs.readFileSync(INDEX_PATH, "utf8"));
console.log(`\n✅ Done. articles-index.json now contains ${finalIndex.length} published articles.\n`);
