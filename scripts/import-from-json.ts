import * as fs from "fs";
import * as path from "path";
import * as yaml from "js-yaml";
import { normalizeSlug } from "../src/utils/articlePath.js";

/**
 * One-off migration script.
 *
 * Reads a Supabase export (articles-export-2026-06-04.json) from the project
 * root and creates any missing Markdown articles under the partitioned
 * directory structure (public/content/articles/<a>/<b>/<c>/<slug>.md).
 *
 * Existing files are never overwritten. After running this, run:
 *   bun run sync-articles
 * to rebuild public/content/articles-index.json and the sitemap.
 *
 * Usage: bun scripts/import-from-json.ts
 */

const EXPORT_FILE = path.join(process.cwd(), "articles-export-2026-06-04.json");
const ARTICLES_DIR = path.join(process.cwd(), "public", "content", "articles");

interface ExportedArticle {
  id?: string;
  title?: string;
  slug?: string;
  content?: string;
  excerpt?: string;
  description?: string;
  meta_description?: string;
  featured_image?: string;
  image_url?: string;
  category?: string;
  author?: string;
  tags?: string[];
  keywords?: string[];
  read_time?: number;
  reading_time?: number;
  views?: number;
  published_at?: string;
  updated_at?: string;
  created_at?: string;
  status?: string;
  [key: string]: unknown;
}

/** Build the partitioned filesystem path for a slug (mirrors getPartitionedPath). */
function getFilePath(slug: string): string {
  const s = normalizeSlug(slug);
  const c1 = s[0] || "_";
  const c2 = s[1] || "_";
  const c3 = s[2] || "_";
  return path.join(ARTICLES_DIR, c1, c2, c3, `${s}.md`);
}

function buildFrontmatter(article: ExportedArticle, normalizedSlug: string): string {
  // Only include defined fields; force status to "published".
  const fm: Record<string, unknown> = {
    id: article.id || normalizedSlug,
    title: article.title || normalizedSlug,
    slug: normalizedSlug,
    excerpt: article.excerpt || article.description || article.meta_description || "",
    meta_description: article.meta_description || article.description || article.excerpt || "",
    featured_image: article.featured_image || article.image_url || null,
    category: article.category || "Uncategorized",
    tags: article.tags || [],
    keywords: article.keywords || [],
    author: article.author || "AI Generator",
    views: article.views ?? 0,
    read_time: article.read_time || article.reading_time || 5,
    status: "published",
    published_at: article.published_at || new Date().toISOString(),
    updated_at: article.updated_at || article.published_at || new Date().toISOString(),
  };
  if (article.created_at) fm.created_at = article.created_at;

  // yaml.dump produces a valid, safely-escaped YAML block.
  return `---\n${yaml.dump(fm, { lineWidth: -1 })}---\n`;
}

async function run() {
  if (!fs.existsSync(EXPORT_FILE)) {
    console.error(`Export file not found: ${EXPORT_FILE}`);
    console.error("Place articles-export-2026-06-04.json in the project root and retry.");
    process.exit(1);
  }

  let articles: ExportedArticle[];
  try {
    articles = JSON.parse(fs.readFileSync(EXPORT_FILE, "utf-8")) as ExportedArticle[];
  } catch (e) {
    console.error("Failed to parse export JSON:", e);
    process.exit(1);
    return;
  }

  if (!Array.isArray(articles)) {
    console.error("Export JSON is not an array of articles.");
    process.exit(1);
  }

  console.log(`Read ${articles.length} articles from export.`);

  let created = 0;
  let skippedExisting = 0;
  let skippedInvalid = 0;
  let skippedNotPublished = 0;

  for (const article of articles) {
    const rawSlug = String(article.slug || "");
    if (!rawSlug) {
      console.warn(`[Import] Skipping article with no slug (id: ${article.id ?? "?"}).`);
      skippedInvalid++;
      continue;
    }

    // Match the site's filter: only published articles.
    const status = String(article.status || "").toLowerCase();
    if (status && status !== "published") {
      skippedNotPublished++;
      continue;
    }

    const normalizedSlug = normalizeSlug(rawSlug);
    if (!normalizedSlug) {
      console.warn(`[Import] Skipping article with empty normalized slug: "${rawSlug}".`);
      skippedInvalid++;
      continue;
    }

    const filePath = getFilePath(normalizedSlug);

    if (fs.existsSync(filePath)) {
      skippedExisting++;
      continue;
    }

    const frontmatter = buildFrontmatter(article, normalizedSlug);
    const body = (article.content || "").trim();
    const fileContents = `${frontmatter}\n${body}\n`;

    try {
      fs.mkdirSync(path.dirname(filePath), { recursive: true });
      fs.writeFileSync(filePath, fileContents, "utf-8");
      console.log(`[Import] Created: ${path.relative(process.cwd(), filePath)}`);
      created++;
    } catch (e) {
      console.error(`[Import] Failed to write ${filePath}:`, e);
      skippedInvalid++;
    }
  }

  console.log("\n=== Import summary ===");
  console.log(`Created:            ${created}`);
  console.log(`Skipped (existing): ${skippedExisting}`);
  console.log(`Skipped (drafts):   ${skippedNotPublished}`);
  console.log(`Skipped (invalid):  ${skippedInvalid}`);
  console.log("\nNext step: run `bun run sync-articles` to rebuild the index and sitemap.");
}

run().catch((err) => {
  console.error(err);
  process.exit(1);
});
