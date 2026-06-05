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

interface ArticleInfo {
  path: string;
  id?: string;
  title: string;
  cleanTitle: string;
  slug: string;
}

const normalizeTitle = (t: string) => t.toLowerCase().replace(/[^a-z0-9]/g, '').trim();

async function dedupe() {
  const apply = process.argv.includes('--apply');
  console.log(`Mode: ${apply ? 'APPLY' : 'DRY-RUN'}`);

  const allFiles = walkDir(articlesDir);
  console.log(`Found ${allFiles.length} markdown files in ${articlesDir}`);

  const groups = new Map<string, ArticleInfo[]>();

  console.log('Analyzing files...');
  for (const filePath of allFiles) {
    try {
      const content = fs.readFileSync(filePath, 'utf-8');
      const match = content.match(/^---\r?\n([\s\S]*?)\r?\n---\r?\n/);
      if (!match) continue;

      const metadata = yaml.load(match[1]) as any;
      if (!metadata) continue;

      const title = metadata.title ? String(metadata.title) : '';
      const info: ArticleInfo = {
        path: filePath,
        id: metadata.id ? String(metadata.id) : undefined,
        title: title,
        cleanTitle: normalizeTitle(title),
        slug: (metadata.slug || path.basename(filePath, '.md')).toLowerCase().trim()
      };

      const groupKey = info.id || `title:${info.cleanTitle}`;

      if (!groups.has(groupKey)) {
        groups.set(groupKey, []);
      }
      groups.get(groupKey)!.push(info);
    } catch (e) {
      console.error(`Error reading ${filePath}:`, e);
    }
  }

  const titleToIds = new Map<string, Set<string>>();
  for (const [key, files] of groups.entries()) {
    for (const f of files) {
      if (f.cleanTitle) {
        if (!titleToIds.has(f.cleanTitle)) titleToIds.set(f.cleanTitle, new Set());
        titleToIds.get(f.cleanTitle)!.add(key);
      }
    }
  }

  const finalGroups: ArticleInfo[][] = [];
  const processedKeys = new Set<string>();

  for (const [cleanTitle, keys] of titleToIds.entries()) {
    const combinedFiles: ArticleInfo[] = [];
    for (const key of keys) {
      if (!processedKeys.has(key)) {
        combinedFiles.push(...(groups.get(key) || []));
        processedKeys.add(key);
      }
    }
    if (combinedFiles.length > 0) {
      finalGroups.push(combinedFiles);
    }
  }

  for (const [key, files] of groups.entries()) {
    if (!processedKeys.has(key)) {
      finalGroups.push(files);
      processedKeys.add(key);
    }
  }

  let totalDeleted = 0;
  const suffixRegex = /-[a-z0-9]{11}$/;

  console.log('Processing duplicate groups...');
  for (const files of finalGroups) {
    if (files.length <= 1) continue;

    files.sort((a, b) => {
      if (a.id && !b.id) return -1;
      if (!a.id && b.id) return 1;

      const aHasSuffix = suffixRegex.test(a.slug);
      const bHasSuffix = suffixRegex.test(b.slug);
      if (!aHasSuffix && bHasSuffix) return -1;
      if (aHasSuffix && !bHasSuffix) return 1;

      if (a.slug.length !== b.slug.length) {
        return a.slug.length - b.slug.length;
      }
      return a.path.length - b.path.length;
    });

    const keep = files[0];
    const toDelete = files.slice(1);

    console.log(`\nGroup [${keep.title || keep.id}]: Found ${files.length} versions`);
    console.log(`  KEEP -> ${keep.path} (${keep.slug})`);

    for (const f of toDelete) {
      console.log(`  DEL  -> ${f.path} (${f.slug})`);
      if (apply) {
        try {
          fs.unlinkSync(f.path);
        } catch (err) {
          console.error(`Failed to delete ${f.path}:`, err);
        }
      }
      totalDeleted++;
    }
  }

  console.log(`\n--- Summary ---`);
  console.log(`Total files scanned: ${allFiles.length}`);
  console.log(`Duplicate files identified: ${totalDeleted}`);
}

dedupe().catch(console.error);
