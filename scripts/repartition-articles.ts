import * as fs from 'fs';
import * as path from 'path';
import * as yaml from 'js-yaml';
import { normalizeSlug, getPartitionedPath } from '../src/utils/articlePath.js';

const articlesDir = path.join(process.cwd(), 'public', 'content', 'articles');
const publicDir = path.join(process.cwd(), 'public');

const APPLY = process.argv.includes('--apply');

function walkDir(dir: string, fileList: string[] = []): string[] {
  if (!fs.existsSync(dir)) return fileList;
  const files = fs.readdirSync(dir);
  for (const file of files) {
    const fullPath = path.join(dir, file);
    if (fs.statSync(fullPath).isDirectory()) {
      walkDir(fullPath, fileList);
    } else if (fullPath.endsWith('.md')) {
      fileList.push(fullPath);
    }
  }
  return fileList;
}

/**
 * Reads the frontmatter `slug` from a markdown file.
 */
function readSlug(filePath: string): string | null {
  try {
    const content = fs.readFileSync(filePath, 'utf-8');
    const match = content.match(/^---([\s\S]*?)---/);
    if (!match) return null;
    const metadata = yaml.load(match[1]) as Record<string, unknown>;
    const rawSlug = String(metadata.slug || '');
    return rawSlug || null;
  } catch (e) {
    console.error(`[Repartition] Error reading ${filePath}:`, (e as Error).message);
    return null;
  }
}

function repartition() {
  console.log(`Scanning articles in ${articlesDir}...`);
  console.log(APPLY ? '[Repartition] APPLY mode: files WILL be moved.' : '[Repartition] DRY-RUN mode: no files will be moved. Pass --apply to move.');

  const allFiles = walkDir(articlesDir);
  console.log(`Found ${allFiles.length} markdown files.`);

  let moved = 0;
  let skipped = 0;
  let errors = 0;
  const collisions: string[] = [];

  for (const filePath of allFiles) {
    const rawSlug = readSlug(filePath);
    if (!rawSlug) {
      console.warn(`[Repartition] Skipping (no frontmatter slug): ${filePath}`);
      skipped++;
      continue;
    }

    const normalizedSlug = normalizeSlug(rawSlug);
    // getPartitionedPath returns a web path like /content/articles/c/o/o/slug.md
    const webPath = getPartitionedPath(normalizedSlug);
    const targetPath = path.join(publicDir, webPath);

    if (path.resolve(filePath) === path.resolve(targetPath)) {
      skipped++;
      continue; // already in the correct place
    }

    if (fs.existsSync(targetPath)) {
      console.warn(`[Repartition] COLLISION: target already exists, not overwriting:\n  from: ${filePath}\n  to:   ${targetPath}`);
      collisions.push(targetPath);
      errors++;
      continue;
    }

    console.log(`[Repartition] MOVE\n  from: ${filePath}\n  to:   ${targetPath}`);

    if (APPLY) {
      try {
        fs.mkdirSync(path.dirname(targetPath), { recursive: true });
        fs.renameSync(filePath, targetPath);
        moved++;
      } catch (e) {
        console.error(`[Repartition] Failed to move ${filePath}:`, (e as Error).message);
        errors++;
      }
    } else {
      moved++; // counts as "would move"
    }
  }

  console.log('\n--- Repartition Summary ---');
  console.log(`${APPLY ? 'Moved' : 'Would move'}: ${moved}`);
  console.log(`Already correct / skipped: ${skipped}`);
  console.log(`Errors / collisions: ${errors}`);
  if (collisions.length > 0) {
    console.log('Collisions (resolve manually):');
    collisions.forEach(c => console.log(`  ${c}`));
  }
  if (APPLY) {
    console.log('\nNext step: run `bun run sync-articles` to rebuild articles-index.json and the sitemap.');
  }
}

repartition();
