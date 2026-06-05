import * as fs from "fs";
import * as path from "path";
import * as yaml from "js-yaml";

/**
 * One-off cleanup script: removes duplicate articles.
 *
 * Duplicates are grouped by a normalized title key. Within each group the
 * "best" file is kept (cleanest/shortest slug, then newest updated_at) and the
 * rest are reported (and, with --apply, deleted).
 *
 * SAFETY: runs in DRY-RUN mode by default — it only prints what it WOULD
 * delete. Review the output, then re-run with --apply to actually delete.
 *
 * Usage:
 *   bun scripts/dedupe-articles.ts            # dry-run, deletes nothing
 *   bun scripts/dedupe-articles.ts --apply    # actually delete duplicates
 *
 * After applying, run `bun run sync-articles` to rebuild the index + sitemap.
 */

const ARTICLES_DIR = path.join(process.cwd(), "public", "content", "articles");
const APPLY = process.argv.includes("--apply");

interface FileInfo {
  filePath: string;
  slug: string;
  title: string;
  updatedAt: number;
}

function walkDir(dir: string, out: string[] = []): string[] {
  if (!fs.existsSync(dir)) return out;
  for (const entry of fs.readdirSync(dir)) {
    const full = path.join(dir, entry);
    if (fs.statSync(full).isDirectory()) walkDir(full, out);
    else if (full.endsWith(".md")) out.push(full);
  }
  return out;
}

/** Normalized grouping key based on the article title. */
function titleKey(title: string): string {
  return title
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim()
    .replace(/\s+/g, " ");
}

/**
 * Lower score = preferred (kept). We prefer the shortest slug (clean slugs
 * without random ID suffixes are usually shorter); newest updated_at breaks ties.
 */
function preferenceScore(a: FileInfo): [number, number] {
  return [a.slug.length, -a.updatedAt];
}

function isBetter(candidate: FileInfo, current: FileInfo): boolean {
  const [cs, ct] = preferenceScore(candidate);
  const [bs, bt] = preferenceScore(current);
  if (cs !== bs) return cs < bs;
  return ct < bt;
}

function run() {
  const files = walkDir(ARTICLES_DIR);
  console.log(`Scanned ${files.length} markdown files.`);

  const groups = new Map<string, FileInfo[]>();

  for (const filePath of files) {
    try {
      const content = fs.readFileSync(filePath, "utf-8");
      const match = content.match(/^---([\s\S]*?)---/);
      if (!match) {
        console.warn(`[Dedupe] No frontmatter, skipping: ${filePath}`);
        continue;
      }
      const meta = (yaml.load(match[1]) || {}) as Record<string, unknown>;
      const title = String(meta.title || "").trim();
      const slug = String(meta.slug || path.basename(filePath, ".md"));
      const updatedAt = new Date(
        String(meta.updated_at || meta.published_at || 0)
      ).getTime() || 0;

      if (!title) {
        console.warn(`[Dedupe] No title, skipping: ${filePath}`);
        continue;
      }

      const key = titleKey(title);
      const info: FileInfo = { filePath, slug, title, updatedAt };
      const arr = groups.get(key);
      if (arr) arr.push(info);
      else groups.set(key, [info]);
    } catch (e) {
      console.error(`[Dedupe] Error reading ${filePath}:`, e);
    }
  }

  const toDelete: FileInfo[] = [];
  let duplicateGroups = 0;

  for (const [, arr] of groups) {
    if (arr.length < 2) continue;
    duplicateGroups++;

    let keep = arr[0];
    for (const candidate of arr.slice(1)) {
      if (isBetter(candidate, keep)) keep = candidate;
    }
    for (const info of arr) {
      if (info.filePath !== keep.filePath) toDelete.push(info);
    }

    console.log(`\nDuplicate group: "${arr[0].title}"`);
    console.log(`  KEEP:   ${path.relative(process.cwd(), keep.filePath)}`);
    for (const info of arr) {
      if (info.filePath !== keep.filePath) {
        console.log(`  DELETE: ${path.relative(process.cwd(), info.filePath)}`);
      }
    }
  }

  console.log(`\n=== Summary ===`);
  console.log(`Total files:        ${files.length}`);
  console.log(`Duplicate groups:   ${duplicateGroups}`);
  console.log(`Files to delete:    ${toDelete.length}`);
  console.log(`Files remaining:    ${files.length - toDelete.length}`);

  if (!APPLY) {
    console.log(`\nDRY-RUN: nothing was deleted. Re-run with --apply to delete.`);
    return;
  }

  let deleted = 0;
  for (const info of toDelete) {
    try {
      fs.unlinkSync(info.filePath);
      deleted++;
    } catch (e) {
      console.error(`[Dedupe] Failed to delete ${info.filePath}:`, e);
    }
  }
  console.log(`\nDeleted ${deleted} duplicate files.`);
  console.log(`Next step: run \`bun run sync-articles\` to rebuild the index and sitemap.`);
}

run();
