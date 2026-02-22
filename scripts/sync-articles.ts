import { createClient } from '@supabase/supabase-js';
import * as fs from 'fs';
import * as path from 'path';
import * as yaml from 'js-yaml';
import * as dotenv from 'dotenv';
import { getPartitionedPath } from '../src/utils/articlePath';

dotenv.config();

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_PUBLISHABLE_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('Missing Supabase environment variables');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function fetchAllArticles() {
  let allArticles: any[] = [];
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
      allArticles = [...allArticles, ...data];
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

async function sync() {
  console.log('Fetching articles from Supabase...');
  const articles = await fetchAllArticles();
  console.log(`Found ${articles.length} published articles.`);

  const articlesDir = path.join(process.cwd(), 'public', 'content', 'articles');
  const indexFile = path.join(process.cwd(), 'public', 'content', 'articles-index.json');

  // Ensure base directory exists
  if (!fs.existsSync(articlesDir)) {
    fs.mkdirSync(articlesDir, { recursive: true });
  }

  const articleIndex: any[] = [];

  for (const article of articles) {
    const { content, ...metadata } = article;

    // Add to index
    articleIndex.push({
      id: metadata.id,
      title: metadata.title,
      slug: metadata.slug,
      description: metadata.description,
      published_at: metadata.published_at,
      category: metadata.category,
      author: metadata.author,
      image_url: metadata.image_url,
      reading_time: metadata.reading_time,
      views: metadata.views
    });

    // Create Markdown content
    const frontmatter = yaml.dump(metadata);
    const markdownContent = `---\n${frontmatter}---\n\n${content}`;

    // Get partitioned path
    const relativePath = getPartitionedPath(article.slug);
    const fullPath = path.join(process.cwd(), 'public', relativePath);
    const dir = path.dirname(fullPath);

    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }

    fs.writeFileSync(fullPath, markdownContent);
  }

  // Save index
  // Note: For 1M articles, this should be paginated or optimized.
  // For now, we save it as a single file but acknowledge the scale limit.
  fs.writeFileSync(indexFile, JSON.stringify(articleIndex, null, 2));
  console.log(`Successfully synced ${articles.length} articles to GitHub structure.`);
}

sync().catch(console.error);
