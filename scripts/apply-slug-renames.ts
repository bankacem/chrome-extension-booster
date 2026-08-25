/**
 * apply-slug-renames.ts
 *
 * Applies the 136 "ok" status slug renames from
 * scripts/messy-slugs-report.csv. For each renamed article:
 *
 *   1. Move its markdown file to the new partitioned path (based on the
 *      new slug), updating the `slug:` line in its frontmatter.
 *   2. Update its entry in public/content/articles-index.json (slug +
 *      canonicalPath).
 *   3. Rewrite any internal markdown links ("](/blog/<old-slug>)") across
 *      ALL articles that pointed at the old slug, so internal navigation
 *      still works without relying on the redirect.
 *   4. Add a permanent (301) redirect from the old URL to the new one in
 *      vercel.json, so anything that was already indexed/shared/bookmarked
 *      keeps working instead of 404ing.
 *
 * Only rows with status === "ok" are touched. The 153 "needs manual
 * review" rows are left completely untouched.
 */
import fs from "fs-extra";
import path from "path";
import { parse } from "csv-parse/sync";

const ROOT = process.cwd();
const REPORT_PATH = path.join(ROOT, "scripts", "messy-slugs-report.csv");
const ARTICLES_DIR = path.join(ROOT, "public", "content", "articles");
const INDEX_JSON_PATH = path.join(ROOT, "public", "content", "articles-index.json");
const VERCEL_JSON_PATH = path.join(ROOT, "vercel.json");

function normalizeSlug(slug: string): string {
  return slug
    .toLowerCase()
    .replace(/[^a-z0-9]/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");
}

function getPartitionedPath(slug: string): string {
  const s = normalizeSlug(slug);
  const c1 = s[0] || "_";
  const c2 = s[1] || "_";
  const c3 = s[2] || "_";
  return path.join(ARTICLES_DIR, c1, c2, c3, `${s}.md`);
}

async function walkMarkdownFiles(dir: string): Promise<string[]> {
  const out: string[] = [];
  for (const entry of await fs.readdir(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) out.push(...(await walkMarkdownFiles(full)));
    else if (entry.name.endsWith(".md")) out.push(full);
  }
  return out;
}

async function main() {
  const csvText = await fs.readFile(REPORT_PATH, "utf-8");
  const rows: Array<{ old_slug: string; proposed_slug: string; status: string }> = parse(csvText, {
    columns: true,
    skip_empty_lines: true,
  });
  const renames = rows.filter((r) => r.status === "ok" && r.old_slug !== r.proposed_slug);
  console.log(`Applying ${renames.length} slug renames...`);

  const renameMap = new Map(renames.map((r) => [r.old_slug, r.proposed_slug]));

  // 1) Move + rewrite each article's own frontmatter slug field.
  let moved = 0;
  const failures: string[] = [];
  for (const { old_slug, proposed_slug } of renames) {
    const oldPath = getPartitionedPath(old_slug);
    const newPath = getPartitionedPath(proposed_slug);
    let raw: string;
    try {
      raw = await fs.readFile(oldPath, "utf-8");
    } catch {
      failures.push(`${old_slug} (source file not found: ${path.relative(ROOT, oldPath)})`);
      continue;
    }
    if (await fs.pathExists(newPath)) {
      failures.push(`${old_slug} -> ${proposed_slug} (destination already exists, skipped)`);
      continue;
    }
    const updated = raw.replace(/^slug:\s*.*$/m, `slug: ${proposed_slug}`);
    await fs.ensureDir(path.dirname(newPath));
    await fs.writeFile(newPath, updated, "utf-8");
    await fs.remove(oldPath);
    moved++;
  }
  console.log(`✅ Moved + updated frontmatter for ${moved} articles.`);
  if (failures.length) {
    console.log(`⚠️  ${failures.length} skipped:`);
    for (const f of failures.slice(0, 20)) console.log(`   - ${f}`);
  }

  // 2) Update articles-index.json (slug + canonicalPath).
  interface ArticleIndexEntry {
  slug: string;
  canonicalPath?: string;
  [key: string]: unknown;
}
interface RedirectEntry { source: string }

  const index: ArticleIndexEntry[] = await fs.readJson(INDEX_JSON_PATH);
  let indexUpdated = 0;
  for (const a of index) {
    const newSlug = renameMap.get(a.slug);
    if (!newSlug) continue;
    a.slug = newSlug;
    if (typeof a.canonicalPath === "string") {
      a.canonicalPath = a.canonicalPath.replace(/\/blog\/[a-z0-9-]+$/, `/blog/${newSlug}`);
    }
    indexUpdated++;
  }
  await fs.writeJson(INDEX_JSON_PATH, index, { spaces: 2 });
  console.log(`✅ Updated ${indexUpdated} entries in articles-index.json.`);

  // 3) Rewrite internal "](/blog/<old-slug>)" links across all articles.
  const allFiles = await walkMarkdownFiles(ARTICLES_DIR);
  let linksUpdated = 0;
  for (const file of allFiles) {
    let content = await fs.readFile(file, "utf-8");
    let changed = false;
    for (const [oldSlug, newSlug] of renameMap) {
      const pattern = new RegExp(`\\(/blog/${oldSlug}\\)`, "g");
      if (pattern.test(content)) {
        content = content.replace(pattern, `(/blog/${newSlug})`);
        changed = true;
      }
    }
    if (changed) {
      await fs.writeFile(file, content, "utf-8");
      linksUpdated++;
    }
  }
  console.log(`✅ Rewrote internal links in ${linksUpdated} article(s).`);

  // 4) Add 301 redirects to vercel.json.
  const vercelConfig = await fs.readJson(VERCEL_JSON_PATH);
  const existingSources = new Set((vercelConfig.redirects || []).map((r: RedirectEntry) => r.source));
  let redirectsAdded = 0;
  for (const [oldSlug, newSlug] of renameMap) {
    const source = `/blog/${oldSlug}`;
    if (existingSources.has(source)) continue;
    vercelConfig.redirects = vercelConfig.redirects || [];
    // New redirects go first so they're matched before the generic www redirect.
    vercelConfig.redirects.unshift({
      source,
      destination: `/blog/${newSlug}`,
      permanent: true,
    });
    redirectsAdded++;
  }
  await fs.writeJson(VERCEL_JSON_PATH, vercelConfig, { spaces: 2 });
  console.log(`✅ Added ${redirectsAdded} permanent redirects to vercel.json.`);
}

main().catch((e) => {
  console.error("Apply failed:", e);
  process.exit(1);
});
