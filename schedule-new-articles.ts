import * as fs from 'fs';
import * as path from 'path';
import matter from 'gray-matter';
import { normalizeSlug, getPartitionedPath } from './src/utils/articlePath.js';
 
const contentDir = path.join(process.cwd(), 'public', 'content');
const publicDir = path.join(process.cwd(), 'public');
 
const APPLY = process.argv.includes('--apply');
 
// تاريخ أول مقال (اليوم)، وكل مقال يليه سيزيد يوماً واحداً تلقائياً
const START_DATE = '2026-06-07';
 
function dateForIndex(index: number): string {
  const base = new Date(`${START_DATE}T00:00:00.000Z`);
  base.setUTCDate(base.getUTCDate() + index);
  return base.toISOString().split('T')[0];
}
 
function listLooseMarkdown(): string[] {
  if (!fs.existsSync(contentDir)) return [];
  return fs.readdirSync(contentDir)
    .map(name => path.join(contentDir, name))
    .filter(fullPath => fs.statSync(fullPath).isFile() && fullPath.endsWith('.md'))
    .sort((a, b) => path.basename(a).localeCompare(path.basename(b)));
}
 
function schedule() {
  console.log(APPLY ? '[Schedule] APPLY mode: files WILL be modified and moved.' : '[Schedule] DRY-RUN mode: no changes will be made. Pass --apply to execute.');
 
  const files = listLooseMarkdown();
  console.log(`Found ${files.length} loose markdown files directly in public/content/.`);
 
  let processed = 0;
  let errors = 0;
  const collisions: string[] = [];
 
  files.forEach((filePath, index) => {
    try {
      const raw = fs.readFileSync(filePath, 'utf-8');
      const parsed = matter(raw);
      const data = parsed.data as Record<string, unknown>;
 
      const rawSlug = String(data.slug || path.basename(filePath, '.md'));
      const normalizedSlug = normalizeSlug(rawSlug);
      const publishedAt = dateForIndex(index);
 
      data.slug = normalizedSlug;
      data.status = 'published';
      data.published_at = publishedAt;
 
      const webPath = getPartitionedPath(normalizedSlug);
      const targetPath = path.join(publicDir, webPath);
 
      if (fs.existsSync(targetPath) && path.resolve(targetPath) !== path.resolve(filePath)) {
        console.warn(`[Schedule] COLLISION: target already exists, skipping:\n  from: ${filePath}\n  to:   ${targetPath}`);
        collisions.push(targetPath);
        errors++;
        return;
      }
 
      console.log(`[Schedule] ${index + 1}/${files.length} slug="${normalizedSlug}" published_at=${publishedAt}\n  from: ${filePath}\n  to:   ${targetPath}`);
 
      if (APPLY) {
        const newContent = matter.stringify(parsed.content, data);
        fs.mkdirSync(path.dirname(targetPath), { recursive: true });
        fs.writeFileSync(targetPath, newContent, 'utf-8');
        if (path.resolve(targetPath) !== path.resolve(filePath)) {
          fs.unlinkSync(filePath);
        }
      }
      processed++;
    } catch (e) {
      console.error(`[Schedule] Failed to process ${filePath}:`, (e as Error).message);
      errors++;
    }
  });
 
  console.log('\n--- Schedule Summary ---');
  console.log(`${APPLY ? 'Processed' : 'Would process'}: ${processed}`);
  console.log(`Errors / collisions: ${errors}`);
  if (collisions.length > 0) {
    console.log('Collisions (resolve manually):');
    collisions.forEach(c => console.log(`  ${c}`));
  }
  if (APPLY) {
    console.log('\nNext step: run `bun run sync-articles` to rebuild articles-index.json and the sitemap.');
  }
}
 
schedule();