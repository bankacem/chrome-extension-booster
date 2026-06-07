import { readdirSync, statSync, mkdirSync, renameSync, existsSync } from "fs";
import { join, dirname, basename } from "path";
import matter from "gray-matter";

const ARTICLES_DIR = join(process.cwd(), "public", "content", "articles");

function normalizeSlug(slug: string): string {
  return slug
    .toLowerCase()
    .replace(/[^a-z0-9]/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");
}

function getPartitionedPath(slug: string): string {
  const normalized = normalizeSlug(slug);
  if (normalized.length < 3) return join(ARTICLES_DIR, normalized + ".md");
  const p1 = normalized[0];
  const p2 = normalized[1];
  const p3 = normalized[2];
  return join(ARTICLES_DIR, p1, p2, p3, `${normalized}.md`);
}

function getFilesRecursively(dir: string): string[] {
  let results: string[] = [];
  if (!existsSync(dir)) return results;
  const list = readdirSync(dir);
  for (const file of list) {
    const path = join(dir, file);
    const stat = statSync(path);
    if (stat && stat.isDirectory()) {
      results = results.concat(getFilesRecursively(path));
    } else if (file.endsWith(".md")) {
      results.push(path);
    }
  }
  return results;
}

const isApply = process.argv.includes("--apply");
console.log(isApply ? "🚀 Running repartition in APPLY mode..." : "🔍 Running repartition in DRY-RUN mode...");

const files = getFilesRecursively(ARTICLES_DIR);
let movedCount = 0;

for (const filePath of files) {
  try {
    const { data } = matter.read(filePath);
    const slug = data.slug;

    if (!slug) continue;

    const expectedPath = getPartitionedPath(slug);

    if (filePath !== expectedPath) {
      console.log(`[MISPLACED] -> Moving: ${basename(filePath)}`);
      if (isApply) {
        const targetDir = dirname(expectedPath);
        if (!existsSync(targetDir)) {
          mkdirSync(targetDir, { recursive: true });
        }
        renameSync(filePath, expectedPath);
      }
      movedCount++;
    }
  } catch (err) {
    console.error(`❌ Error processing file ${filePath}:`, err);
  }
}

console.log(`✨ Done! Misplaced files handled: ${movedCount}`);