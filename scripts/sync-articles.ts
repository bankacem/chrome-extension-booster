import { createClient } from '@supabase/supabase-js';
import * as fs from 'fs';
import * as path from 'path';
import * as yaml from 'js-yaml';
import * as dotenv from 'dotenv';
import { execSync } from 'child_process';
import { getPartitionedPath, normalizeSlug } from '../src/utils/articlePath';
import { notifyIndexing } from './google-indexing';

dotenv.config();

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_PUBLISHABLE_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('Missing Supabase environment variables');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

interface ArticleData {
  id: string;
  title: string;
  slug: string;
  content: string;
  description?: string;
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
  meta_description?: string;
  updated_at: string;
}

async function fetchAllArticles(): Promise<ArticleData[]> {
  let allArticles: ArticleData[] = [];
  let page = 0;
  const pageSize = 1000;
  let hasMore = true;

  while (hasMore) {
    const { data, error } = await supabase
      .from('articles')
      .select('*')
      .range(page * pageSize, (page + 1) * pageSize - 1)
      .order('published_at', { ascending: false });

    if (error) {
      console.error('Error fetching articles:', error);
      break;
    }

    if (data && data.length > 0) {
      allArticles = [...allArticles, ...data as ArticleData[]];
      page++;
      if (data.length < pageSize) {
        hasMore = false;
      }
    } else {
      hasMore = false;
    }
  }

  return allArticles;
}

interface OptimizedItem {
  originalSlug: string;
  optimizedTitle: string;
  newSlug: string;
  metaDescription: string;
}

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
  updated_at: string;
}

function cleanContent(content: string): string {
  if (!content) return content;

  let cleaned = content;

  // If content is JSON-wrapped, handle the inner content
  let isJson = false;
  let jsonData: { optimizedContent?: string } | null = null;
  try {
    if (content.trim().startsWith('{')) {
      jsonData = JSON.parse(content);
      if (jsonData && jsonData.optimizedContent) {
        cleaned = jsonData.optimizedContent;
        isJson = true;
      }
    }
  } catch (e) {
    // Not JSON or failed to parse, continue with raw content
  }

  // Fix nested links: <a ...><a ...>...</a></a> -> <a ...>...</a>
  // We keep the innermost link's content but potentially the outermost link's href?
  // Actually, the nested links I saw were multiple <a> tags wrapping the same text.
  // Example: <a href="A"><a href="B">Text</a></a>
  // Usually we want to keep the inner one if it's more specific, or the outer one if it's the intended one.
  // The corruption I saw had many levels of the same link.

  let previous;
  do {
    previous = cleaned;
    // Strip nested <a> tags, keeping the innermost content
    // This regex looks for <a>...<a ...>...</a>...</a> and keeps the inner part.
    // However, if they are nested like <a href="A"><a href="B">Text</a></a>,
    // it's safer to just remove the outer <a> if it's immediately wrapping another <a>.
    // We use a non-greedy match that ensures we don't skip over an </a> when looking for the inner <a>.
    cleaned = cleaned.replace(/<a[^>]*>((?:(?!<\/a>).)*?<a[^>]*>.*?<\/a>.*?)\s*<\/a>/gs, '$1');
  } while (cleaned !== previous);

  if (isJson && jsonData) {
    jsonData.optimizedContent = cleaned;
    return JSON.stringify(jsonData, null, 2);
  }

  return cleaned;
}

async function sync() {
  console.log('Fetching articles from Supabase...');
  const articles = await fetchAllArticles();
  console.log(`Found ${articles.length} articles.`);

  let syncedCount = 0;
  let skippedCount = 0;

  // Load optimized metadata if available to override truncated/unoptimized data from DB
  const optimizedMap = new Map<string, OptimizedItem>();
  const optimizedFile = path.join(process.cwd(), 'optimized_articles.json');
  if (fs.existsSync(optimizedFile)) {
    console.log('Loading optimized metadata from optimized_articles.json...');
    const optimizedData = JSON.parse(fs.readFileSync(optimizedFile, 'utf-8')) as OptimizedItem[];
    for (const item of optimizedData) {
      optimizedMap.set(item.originalSlug, item);
    }
  }

  const articlesDir = path.join(process.cwd(), 'public', 'content', 'articles');
  const indexFile = path.join(process.cwd(), 'public', 'content', 'articles-index.json');

  // Load existing index for change detection
  const oldIndexMap = new Map<string, ArticleIndexItem>();
  if (fs.existsSync(indexFile)) {
    console.log('Loading existing index for change detection...');
    try {
      const oldIndex = JSON.parse(fs.readFileSync(indexFile, 'utf-8')) as ArticleIndexItem[];
      for (const item of oldIndex) {
        oldIndexMap.set(item.slug, item);
      }
    } catch (e) {
      console.warn('Failed to parse existing index file, change detection will treat all as new.');
    }
  }

  const changedUrls: string[] = [];
  const WEBSITE_URL = 'https://extensionto.com';

  // Ensure base directory exists
  if (!fs.existsSync(articlesDir)) {
    fs.mkdirSync(articlesDir, { recursive: true });
  }

  const articleIndex: ArticleIndexItem[] = [];
  const currentFiles = new Set<string>();
  const processedIds = new Set<string>();
  const processedSlugs = new Set<string>();

  for (const article of articles) {
    let { content } = article;
    const dbMetadata: Record<string, unknown> = { ...article };
    delete dbMetadata.content;

    const rawSlugFromDb = String(dbMetadata.slug || "").trim();
    if (!rawSlugFromDb) {
      console.warn(`[Validation] Skipping article ${article.id}: Missing slug.`);
      skippedCount++;
      continue;
    }

    const normalizedSlug = normalizeSlug(rawSlugFromDb);

    // Get partitioned path to check for existing local file (Zero-Touch Flow)
    const relativePath = getPartitionedPath(normalizedSlug);
    const fullPath = path.join(process.cwd(), 'public', relativePath);

    let localMetadata: Record<string, unknown> = {};
    if (fs.existsSync(fullPath)) {
      try {
        const localFileContent = fs.readFileSync(fullPath, 'utf-8');
        const match = localFileContent.match(/^---\r?\n([\s\S]*?)\r?\n---\r?\n([\s\S]*)$/);
        if (match) {
          localMetadata = yaml.load(match[1]) as Record<string, unknown>;
          content = match[2];
          console.log(`[Zero-Touch] Using local content for: ${normalizedSlug}`);
        }
      } catch (e) {
        console.warn(`[Zero-Touch] Failed to read local file for ${normalizedSlug}, falling back to DB.`);
      }
    }

    // Merge metadata: Prioritize local, but preserve critical DB fields
    const metadata: Record<string, unknown> = {
      ...dbMetadata,
      ...localMetadata,
      id: dbMetadata.id, // Always use DB ID
      views: dbMetadata.views, // Always use live DB views
      status: dbMetadata.status, // Always use live DB status
      updated_at: dbMetadata.updated_at // Always use live DB updated_at
    };

    // Clean metadata
    const m = metadata as Record<string, unknown>;
    for (const key in m) {
      const val = m[key];
      if (typeof val === 'string') {
        m[key] = val.trim();
      } else if (Array.isArray(val)) {
        m[key] = val.map((item: unknown) => typeof item === 'string' ? item.trim() : item);
      }
    }

    // Handle missing category
    if (!metadata.category) {
      metadata.category = "Uncategorized";
    }

    // Clean content (only if not from local, or always clean?)
    // Project memory says sync-articles.ts includes a cleanup phase.
    content = cleanContent(content);

    // Validation Check
    if (!metadata.title || !content) {
      console.warn(`[Validation] Skipping article ${article.id}: Missing title or content.`);
      skippedCount++;
      continue;
    }

    // Apply SEO optimizations if article is published and not already optimized locally
    if (metadata.status === 'published') {
      const optimized = optimizedMap.get(normalizedSlug) || optimizedMap.get(rawSlugFromDb);
      if (optimized) {
        metadata.title = String(optimized.optimizedTitle).trim();
        metadata.meta_description = String(optimized.metaDescription).trim();
        if (!metadata.description) metadata.description = metadata.meta_description;
      }
    }

    metadata.slug = normalizedSlug;

    // Immediate Indexing for published articles
    if (metadata.status === 'published') {
      const oldEntry = oldIndexMap.get(normalizedSlug);
      if (!oldEntry || oldEntry.updated_at !== metadata.updated_at) {
        const url = `${WEBSITE_URL}/blog/${normalizedSlug}`;
        console.log(`[Indexing] Notifying Google about new/updated published article: ${url}`);
        await notifyIndexing(url).catch(e => console.error(`Indexing failed for ${url}`, e));
      }
    }

    // Add to index (Only include published articles in public index/sitemap)
    if (metadata.status === 'published') {
      articleIndex.push({
        id: metadata.id as string,
        title: metadata.title as string,
        slug: normalizedSlug,
        description: (metadata.description || metadata.excerpt || "") as string,
        excerpt: metadata.excerpt as string,
        published_at: metadata.published_at as string,
        category: metadata.category as string,
        author: metadata.author as string,
        image_url: (metadata.image_url || metadata.featured_image) as string,
        featured_image: metadata.featured_image as string,
        reading_time: (metadata.reading_time || metadata.read_time) as number,
        read_time: metadata.read_time as number,
        views: metadata.views as number,
        tags: metadata.tags as string[],
        keywords: metadata.keywords as string[],
        updated_at: metadata.updated_at as string
      });
    }

    // Create Markdown content
    const frontmatter = yaml.dump(metadata);
    // Use trim() on content to avoid extra newlines at the start/end
    const markdownContent = `---\n${frontmatter}---\n\n${content.trim()}`;

    // Path is already calculated as 'fullPath'
    const dir = path.dirname(fullPath);

    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }

    fs.writeFileSync(fullPath, markdownContent);
    currentFiles.add(fullPath);
    processedIds.add(metadata.id as string);
    processedSlugs.add(normalizedSlug);
    syncedCount++;
  }

  // Process Local-Only Pillar Articles
  console.log('Processing local-only pillar articles...');
  function walkDirForLocal(dir: string) {
    if (!fs.existsSync(dir)) return;
    const files = fs.readdirSync(dir);
    for (const file of files) {
      const fullPath = path.join(dir, file);
      if (fs.statSync(fullPath).isDirectory()) {
        walkDirForLocal(fullPath);
      } else if (fullPath.endsWith('.md') && !currentFiles.has(fullPath)) {
        try {
          const localFileContent = fs.readFileSync(fullPath, 'utf-8');
          const match = localFileContent.match(/^---\r?\n([\s\S]*?)\r?\n---\r?\n([\s\S]*)$/);
          if (match) {
            const metadata = yaml.load(match[1]) as Record<string, unknown>;
            if (metadata.status === 'published') {
              const normalizedSlug = normalizeSlug(String(metadata.slug || ""));
              const id = (metadata.id || normalizedSlug) as string;

              // Check if already processed
              if (processedIds.has(id) || processedSlugs.has(normalizedSlug)) {
                console.log(`[Pillar] Skipping already processed article: ${normalizedSlug}`);
                continue;
              }

              // Add to index
              articleIndex.push({
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
                updated_at: (metadata.updated_at || new Date().toISOString()) as string
              });

              currentFiles.add(fullPath);
              processedIds.add(id);
              processedSlugs.add(normalizedSlug);
              console.log(`[Pillar] Indexed local-only article: ${normalizedSlug}`);
            }
          }
        } catch (e) {
          console.warn(`[Pillar] Failed to process local article at ${fullPath}:`, e);
        }
      }
    }
  }
  walkDirForLocal(articlesDir);

  // Cleanup: Remove files that are no longer in the database list
  console.log('Cleaning up orphaned article files...');
  function walkDir(dir: string) {
    const files = fs.readdirSync(dir);
    for (const file of files) {
      const fullPath = path.join(dir, file);
      if (fs.statSync(fullPath).isDirectory()) {
        walkDir(fullPath);
        // Remove empty directories
        if (fs.readdirSync(fullPath).length === 0) {
          fs.rmdirSync(fullPath);
        }
      } else if (fullPath.endsWith('.md') && !currentFiles.has(fullPath)) {
        fs.unlinkSync(fullPath);
      }
    }
  }
  if (fs.existsSync(articlesDir)) {
    walkDir(articlesDir);
  }

  // Save index
  fs.writeFileSync(indexFile, JSON.stringify(articleIndex, null, 2));

  console.log('\n--- Sync Report ---');
  console.log(`Total articles fetched: ${articles.length}`);
  console.log(`Successfully synced: ${syncedCount}`);
  console.log(`Skipped due to validation: ${skippedCount}`);
  console.log('-------------------\n');

  // Automatically update sitemap
  console.log('Updating sitemap...');
  try {
    execSync('bun run sitemap', { stdio: 'inherit' });
  } catch (error) {
    console.error('Error updating sitemap:', error);
  }
}

sync().catch(console.error);
