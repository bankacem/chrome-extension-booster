import { createClient } from '@supabase/supabase-js';
import * as fs from 'fs';
import * as path from 'path';
import * as yaml from 'js-yaml';
import * as dotenv from 'dotenv';
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
      .eq('status', 'published')
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
  console.log(`Found ${articles.length} published articles.`);

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
  } else {
    // Clean up old articles to avoid mixed case/normalized issues
    fs.rmSync(articlesDir, { recursive: true, force: true });
    fs.mkdirSync(articlesDir, { recursive: true });
  }

  const articleIndex: ArticleIndexItem[] = [];

  for (const article of articles) {
    let { content } = article;
    const metadata: Record<string, unknown> = { ...article };
    delete metadata.content;

    // Clean metadata
    for (const key in metadata) {
      const val = metadata[key];
      if (typeof val === 'string') {
        metadata[key] = val.trim();
      } else if (Array.isArray(val)) {
        metadata[key] = val.map((item: unknown) => typeof item === 'string' ? item.trim() : item);
      }
    }

    // Clean content
    content = cleanContent(content);

    // Check for optimized overrides
    const optimized = optimizedMap.get(metadata.slug);
    if (optimized) {
      metadata.title = optimized.optimizedTitle;
      metadata.slug = optimized.newSlug;
      metadata.meta_description = optimized.metaDescription;
      // Also update description/excerpt if they are missing or should match meta_description
      if (!metadata.description) metadata.description = optimized.metaDescription;
    }

    const originalSlug = metadata.slug;
    const normalizedSlug = normalizeSlug(originalSlug);

    // Update slug in metadata to ensure it's ALWAYS normalized
    metadata.slug = normalizedSlug;

    // Change detection for Indexing API
    const oldEntry = oldIndexMap.get(normalizedSlug);
    if (!oldEntry || oldEntry.updated_at !== metadata.updated_at) {
      changedUrls.push(`${WEBSITE_URL}/blog/${normalizedSlug}`);
    }

    // Add to index
    articleIndex.push({
      id: metadata.id,
      title: metadata.title,
      slug: normalizedSlug,
      description: (metadata.description || metadata.excerpt || ""),
      excerpt: metadata.excerpt,
      published_at: metadata.published_at,
      category: metadata.category,
      author: metadata.author,
      image_url: metadata.image_url || metadata.featured_image,
      featured_image: metadata.featured_image,
      reading_time: metadata.reading_time || metadata.read_time,
      read_time: metadata.read_time,
      views: metadata.views,
      tags: metadata.tags,
      keywords: metadata.keywords,
      updated_at: metadata.updated_at
    });

    // Create Markdown content
    const frontmatter = yaml.dump(metadata);
    const markdownContent = `---\n${frontmatter}---\n\n${content}`;

    // Get partitioned path
    const relativePath = getPartitionedPath(normalizedSlug);
    const fullPath = path.join(process.cwd(), 'public', relativePath);
    const dir = path.dirname(fullPath);

    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }

    fs.writeFileSync(fullPath, markdownContent);
  }

  // Save index
  fs.writeFileSync(indexFile, JSON.stringify(articleIndex, null, 2));
  console.log(`Successfully synced ${articles.length} articles to GitHub structure.`);

  // Trigger Google Indexing for changed articles
  if (changedUrls.length > 0) {
    console.log(`Notifying Google Indexing API about ${changedUrls.length} changed articles...`);
    for (const url of changedUrls) {
      await notifyIndexing(url);
    }
  } else {
    console.log('No new or updated articles detected for indexing.');
  }
}

sync().catch(console.error);
