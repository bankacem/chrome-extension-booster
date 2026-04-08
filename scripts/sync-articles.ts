import * as fs from 'fs';
import * as path from 'path';
import * as yaml from 'js-yaml';
import { execSync } from 'child_process';
import { normalizeSlug } from '../src/utils/articlePath';

interface ArticleIndexItem {
  id: string;
  title: string;
  slug: string;
  description: string;
  excerpt?: string;
  published_at: string;
  category: string;
  author: string;
  image_url?: string;
  featured_image?: string;
  reading_time?: number;
  read_time?: number;
  views: number;
  tags?: string[];
  keywords?: string[];
  canonicalPath?: string;
  updated_at: string;
}

const articlesDir = path.join(process.cwd(), 'public', 'content', 'articles');
const indexFile = path.join(process.cwd(), 'public', 'content', 'articles-index.json');

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

async function rebuildIndex() {
  console.log('🔄 Starting articles synchronization...');
  const allMdFiles = walkDir(articlesDir);
  console.log(`📄 Found ${allMdFiles.length} markdown files.`);

  // Use Map to deduplicate by ID
  const idMap = new Map<string, ArticleIndexItem>();

  for (const filePath of allMdFiles) {
    try {
      const fileContent = fs.readFileSync(filePath, 'utf-8');
      const match = fileContent.match(/^---([\s\S]*?)---([\s\S]*)$/);

      if (!match) {
        console.warn(`[Skip] No frontmatter: ${filePath}`);
        continue;
      }

      const metadata = yaml.load(match[1]) as Record<string, unknown>;

      // ✅ Check article status - should be published
      const status = String(metadata.status || '');
      if (!status.toLowerCase().includes('publish')) {
        console.log(`[Skip] Non-published article: ${metadata.slug} (Status: ${status})`);
        continue;
      }

      const normalizedSlug = normalizeSlug(String(metadata.slug || ""));
      const id = String(metadata.id || normalizedSlug);

      const newItem: ArticleIndexItem = {
        id: id,
        title: metadata.title as string,
        slug: normalizedSlug,
        description: (metadata.description || metadata.excerpt || "") as string,
        excerpt: metadata.excerpt as string,
        published_at: metadata.published_at as string,
        category: (metadata.category || "Uncategorized") as string,
        author: (metadata.author || "Admin") as string,
        image_url: (metadata.image_url || metadata.featured_image) as string,
        featured_image: metadata.featured_image as string,
        reading_time: (metadata.reading_time || metadata.read_time || 5) as number,
        read_time: (metadata.read_time || 5) as number,
        views: (metadata.views || 0) as number,
        tags: (metadata.tags || []) as string[],
        keywords: (metadata.keywords || []) as string[],
        canonicalPath: metadata.canonicalPath as string | undefined,
        updated_at: (metadata.updated_at || metadata.published_at || new Date().toISOString()) as string
      };

      // ✅ Deduplication Logic by ID:
      const existingById = idMap.get(id);
      if (existingById) {
        const existingDate = new Date(existingById.updated_at).getTime();
        const newDate = new Date(newItem.updated_at).getTime();
        if (newDate > existingDate) {
          idMap.set(id, newItem);
          console.log(`[Update] ID ${id} updated with newer content from ${normalizedSlug}`);
        } else {
          console.log(`[Keep] ID ${id} already has newer or same content, skipping ${normalizedSlug}`);
        }
      } else {
        idMap.set(id, newItem);
      }
    } catch (e) {
      console.error(`[Error] Processing ${filePath}:`, e);
    }
  }

  // ✅ Second pass to ensure slug uniqueness (important for SEO/Routing)
  const slugMap = new Map<string, ArticleIndexItem>();
  for (const item of idMap.values()) {
    const existingBySlug = slugMap.get(item.slug);
    if (existingBySlug) {
      const existingDate = new Date(existingBySlug.updated_at).getTime();
      const newDate = new Date(item.updated_at).getTime();
      if (newDate > existingDate) {
        slugMap.set(item.slug, item);
        console.warn(`[Collision] Slug ${item.slug} collision, kept newer ID ${item.id}`);
      }
    } else {
      slugMap.set(item.slug, item);
    }
  }

  const articleIndex = Array.from(slugMap.values());

  // ✅ Sort by published_at descending (newest first)
  articleIndex.sort((a, b) => new Date(b.published_at).getTime() - new Date(a.published_at).getTime());

  fs.writeFileSync(indexFile, JSON.stringify(articleIndex, null, 2));
  console.log(`✅ Successfully rebuilt index with ${articleIndex.length} unique articles.`);

  // ✅ Automatically update sitemap
  console.log('🗺️  Updating sitemap...');
  try {
    execSync('bun run sitemap', { stdio: 'inherit' });
    console.log('✅ Sitemap updated successfully.');
  } catch (error) {
    console.error('[Error] Updating sitemap:', error);
  }
}

rebuildIndex().catch(console.error);
