import * as fs from 'fs';
import * as path from 'path';
import * as yaml from 'js-yaml';

const articlesDir = path.join(process.cwd(), 'public', 'content', 'articles');

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

function normalizeSlug(slug: string): string {
  return slug.toLowerCase()
    .replace(/[^a-z0-9]/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '');
}

async function checkConsistency() {
  console.log('--- Consistency Check ---');
  const files = walkDir(articlesDir);
  const ids = new Map<string, string>();
  const slugs = new Map<string, string>();
  let errors = 0;

  for (const file of files) {
    try {
      const content = fs.readFileSync(file, 'utf8');
      const match = content.match(/^---([\s\S]*?)---/);
      if (!match) continue;

      const meta = yaml.load(match[1]) as any;
      if (meta.status !== 'published') continue;

      const id = meta.id ? String(meta.id) : null;
      const slug = normalizeSlug(String(meta.slug || ''));

      if (id && ids.has(id)) {
        console.error(`❌ Duplicate ID [${id}] found:`);
        console.error(`   1. ${ids.get(id)}`);
        console.error(`   2. ${file}`);
        errors++;
      } else {
        ids.set(id, file);
      }

      if (slugs.has(slug)) {
        console.error(`❌ Duplicate Slug [${slug}] found:`);
        console.error(`   1. ${slugs.get(slug)}`);
        console.error(`   2. ${file}`);
        errors++;
      } else {
        slugs.set(slug, file);
      }
    } catch (e) {
      console.error(`❌ Error parsing ${file}:`, e);
      errors++;
    }
  }

  if (errors === 0) {
    console.log('✅ All published articles are consistent!');
  } else {
    console.log(`\nFound ${errors} issues that might cause problems in the index/sitemap.`);
    process.exit(1);
  }
}

checkConsistency().catch(console.error);
