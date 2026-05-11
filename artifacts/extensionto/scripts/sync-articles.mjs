#!/usr/bin/env node
/**
 * sync-articles.mjs
 * Rebuilds public/content/articles-index.json from disk markdown files.
 * Run: node scripts/sync-articles.mjs
 */

import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ARTICLES_DIR = path.join(__dirname, "../public/content/articles");
const INDEX_PATH = path.join(__dirname, "../public/content/articles-index.json");

function walkDir(dir, files = []) {
  if (!fs.existsSync(dir)) return files;
  for (const f of fs.readdirSync(dir)) {
    const fp = path.join(dir, f);
    if (fs.statSync(fp).isDirectory()) walkDir(fp, files);
    else if (fp.endsWith(".md")) files.push(fp);
  }
  return files;
}

/**
 * Parse YAML frontmatter robustly — handles >- and |- block scalars.
 */
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

const mdFiles = walkDir(ARTICLES_DIR);
console.log(`Found ${mdFiles.length} markdown files`);

const items = [];
let errors = 0;

for (const f of mdFiles) {
  try {
    const content = fs.readFileSync(f, "utf8");
    const fm = parseFrontmatter(content);

    if (!fm) { console.warn(`⚠ No frontmatter: ${path.basename(f)}`); errors++; continue; }
    if (!fm.slug) { console.warn(`⚠ No slug: ${path.basename(f)}`); errors++; continue; }

    const status = (fm.status || "").replace(/"/g, "").trim();
    if (status !== "published") continue;

    const slug = normalizeSlug(fm.slug);
    const c1 = slug[0] || "_";
    const c2 = slug[1] || "_";
    const c3 = slug[2] || "_";

    items.push({
      id: fm.id || slug,
      title: fm.title || "",
      slug,
      description: fm.meta_description || fm.description || fm.excerpt || "",
      excerpt: fm.excerpt || fm.description || "",
      published_at: fm.published_at || fm.created_at || new Date().toISOString(),
      updated_at: fm.updated_at || fm.published_at || new Date().toISOString(),
      category: fm.category || "Uncategorized",
      author: fm.author || "Admin",
      image_url: fm.featured_image || fm.image_url || "",
      featured_image: fm.featured_image || fm.image_url || "",
      reading_time: parseInt(fm.read_time) || 5,
      read_time: parseInt(fm.read_time) || 5,
      views: parseInt(fm.views) || 0,
      tags: [],
      keywords: [],
      canonicalPath: `/blog/${slug}`,
      filePath: `/content/articles/${c1}/${c2}/${c3}/${slug}.md`,
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
console.log(`✓ Written articles-index.json: ${deduped.length} articles (${errors} errors)`);
