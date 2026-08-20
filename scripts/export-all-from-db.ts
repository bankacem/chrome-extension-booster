/**
 * One-off (and re-runnable) full export from Supabase to local markdown.
 *
 * Goal: make the repo the single source of truth so the site can run
 * fully independent of Supabase (sitemap, build, deploy).
 *
 * - Fetches ALL published articles (paginated, no 1000-row cap).
 * - Generates CLEAN slugs from the article TITLE only (no random `-mmXXXX` suffix).
 * - On collision, appends `-2`, `-3`, … (in deterministic order — newest wins the base slug).
 * - Writes each article to `public/content/articles/<a>/<b>/<c>/<slug>.md`.
 * - Removes stale files for the same article id (slug changed) so the tree stays clean.
 * - Emits a slug-redirect map to `public/content/slug-redirects.json` so we can wire
 *   301s for the legacy `-mmXXXX` URLs.
 *
 * Run:  bun scripts/export-all-from-db.ts
 */
import { createClient } from "@supabase/supabase-js";
import * as fs from "fs";
import * as path from "path";
import * as yaml from "js-yaml";
import * as dotenv from "dotenv";
import { cleanSlug, stripLegacySuffix } from "../src/utils/slug";
import { getPartitionedPath, normalizeSlug } from "../src/utils/articlePath";

dotenv.config();

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_PUBLISHABLE_KEY;
if (!supabaseUrl || !supabaseKey) {
  console.error("Missing VITE_SUPABASE_URL / VITE_SUPABASE_PUBLISHABLE_KEY");
  process.exit(1);
}
const supabase = createClient(supabaseUrl, supabaseKey);

const articlesDir = path.join(process.cwd(), "public", "content", "articles");
const redirectsFile = path.join(process.cwd(), "public", "content", "slug-redirects.json");

interface ArticleRow {
  id: string;
  title: string;
  slug: string;
  content: string;
  excerpt: string | null;
  featured_image: string | null;
  category: string | null;
  tags: string[] | null;
  keywords: string[] | null;
  meta_description: string | null;
  status: string;
  published_at: string | null;
  scheduled_at: string | null;
  author: string | null;
  views: number | null;
  read_time: number | null;
  created_at: string;
  updated_at: string;
}

function walk(dir: string, out: string[] = []): string[] {
  if (!fs.existsSync(dir)) return out;
  for (const f of fs.readdirSync(dir)) {
    const p = path.join(dir, f);
    if (fs.statSync(p).isDirectory()) walk(p, out);
    else if (p.endsWith(".md")) out.push(p);
  }
  return out;
}

async function fetchAll(): Promise<ArticleRow[]> {
  const pageSize = 1000;
  let from = 0;
  const all: ArticleRow[] = [];
  while (true) {
    const { data, error } = await supabase
      .from("articles")
      .select("*")
      .ilike("status", "published")
      .order("published_at", { ascending: false, nullsFirst: false })
      .order("created_at", { ascending: false })
      .range(from, from + pageSize - 1);
    if (error) throw error;
    const batch = (data ?? []) as ArticleRow[];
    all.push(...batch);
    if (batch.length < pageSize) break;
    from += pageSize;
  }
  return all;
}

function pickDate(a: ArticleRow): number {
  return new Date(a.published_at || a.updated_at || a.created_at).getTime();
}

async function main() {
  console.log("Fetching all published articles…");
  const articles = await fetchAll();
  console.log(`→ ${articles.length} published rows`);

  // Sort so newest gets the base slug (no suffix).
  articles.sort((a, b) => pickDate(b) - pickDate(a));

  // Assign unique clean slugs.
  const used = new Map<string, string>(); // slug -> article id
  const finalSlugs = new Map<string, string>(); // article id -> final slug
  const redirects: Record<string, string> = {}; // oldSlug -> newSlug

  for (const a of articles) {
    const base = cleanSlug(a.title || a.slug || a.id);
    let candidate = base || cleanSlug(a.slug) || a.id.slice(0, 8);
    let n = 2;
    while (used.has(candidate)) {
      candidate = `${base}-${n++}`;
    }
    used.set(candidate, a.id);
    finalSlugs.set(a.id, candidate);

    const legacy = normalizeSlug(a.slug);
    const legacyStripped = normalizeSlug(stripLegacySuffix(a.slug));
    if (legacy && legacy !== candidate) redirects[legacy] = candidate;
    if (legacyStripped && legacyStripped !== candidate && legacyStripped !== legacy)
      redirects[legacyStripped] = candidate;
  }

  // Map existing files by id so we can delete stale ones (slug rename).
  console.log("Scanning existing markdown…");
  const existing = walk(articlesDir);
  const idToPaths = new Map<string, string[]>();
  for (const file of existing) {
    try {
      const content = fs.readFileSync(file, "utf-8");
      const m = content.match(/^---\r?\n([\s\S]*?)\r?\n---/);
      if (!m) continue;
      const fm = yaml.load(m[1]) as Record<string, unknown> | null;
      if (!fm) continue;
      const id = String(fm.id || "");
      if (!id) continue;
      const arr = idToPaths.get(id) || [];
      arr.push(file);
      idToPaths.set(id, arr);
    } catch (error) {
      console.warn("Skipping unreadable existing article file:", error);
    }
  }

  let created = 0;
  let updated = 0;
  let renamed = 0;
  let removed = 0;

  for (const a of articles) {
    const slug = finalSlugs.get(a.id)!;
    const rel = getPartitionedPath(slug).replace("/content/articles/", "");
    const target = path.join(articlesDir, rel);

    const frontmatter = {
      id: a.id,
      title: a.title,
      slug,
      excerpt: a.excerpt,
      featured_image: a.featured_image,
      category: a.category,
      tags: a.tags || [],
      keywords: a.keywords || [],
      meta_description: a.meta_description,
      status: a.status.toLowerCase(),
      published_at: a.published_at,
      scheduled_at: a.scheduled_at,
      author: a.author,
      views: a.views,
      read_time: a.read_time,
      created_at: a.created_at,
      updated_at: a.updated_at,
    };

    const yamlStr = yaml.dump(frontmatter, {
      forceQuotes: false,
      quotingType: '"',
      noRefs: true,
      lineWidth: 200,
    });
    const fileContent = `---\n${yamlStr}---\n\n${a.content || ""}`;

    // Remove stale files for this id (different path).
    const stale = (idToPaths.get(a.id) || []).filter(
      (p) => path.resolve(p) !== path.resolve(target),
    );
    for (const p of stale) {
      try {
        fs.unlinkSync(p);
        removed++;
      } catch (error) {
        console.warn("Could not remove stale article file:", p, error);
      }
    }
    if (stale.length) renamed++;

    fs.mkdirSync(path.dirname(target), { recursive: true });
    const isNew = !fs.existsSync(target);
    fs.writeFileSync(target, fileContent);
    if (isNew) created++;
    else updated++;
  }

  // Clean orphan files (articles deleted/unpublished in DB).
  const validPaths = new Set(
    articles.map((a) => {
      const slug = finalSlugs.get(a.id)!;
      const rel = getPartitionedPath(slug).replace("/content/articles/", "");
      return path.resolve(path.join(articlesDir, rel));
    }),
  );
  let orphans = 0;
  for (const file of walk(articlesDir)) {
    if (!validPaths.has(path.resolve(file))) {
      try {
        fs.unlinkSync(file);
        orphans++;
      } catch (error) {
        console.warn("Could not remove orphan article file:", file, error);
      }
    }
  }

  fs.writeFileSync(redirectsFile, JSON.stringify(redirects, null, 2));

  console.log("\nDone.");
  console.log(`  Created:        ${created}`);
  console.log(`  Updated:        ${updated}`);
  console.log(`  Renamed (id):   ${renamed}`);
  console.log(`  Stale removed:  ${removed}`);
  console.log(`  Orphans purged: ${orphans}`);
  console.log(`  Redirects:      ${Object.keys(redirects).length} → ${redirectsFile}`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
