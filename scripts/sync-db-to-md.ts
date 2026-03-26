import { createClient } from "@supabase/supabase-js";
import * as fs from 'fs';
import * as path from 'path';
import * as yaml from 'js-yaml';
import * as dotenv from 'dotenv';
import { getPartitionedPath } from '../src/utils/articlePath';

// Load environment variables
dotenv.config();

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_PUBLISHABLE_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error("Missing Supabase URL or Key. Ensure VITE_SUPABASE_URL and VITE_SUPABASE_PUBLISHABLE_KEY are set in .env");
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

const articlesDir = path.join(process.cwd(), 'public', 'content', 'articles');

interface ArticleRecord {
  id: string;
  title: string;
  slug: string;
  content: string;
  excerpt: string | null;
  featured_image: string | null;
  category: string | null;
  tags: string[] | null;
  keywords: string[] | null;
  meta_description: string | null;
  status: string;
  published_at: string | null;
  scheduled_at: string | null;
  author: string | null;
  views: number | null;
  read_time: number | null;
  created_at: string;
  updated_at: string;
}

interface Frontmatter {
  id: string;
  title: string;
  slug: string;
  excerpt: string | null;
  featured_image: string | null;
  category: string | null;
  tags: string[];
  keywords: string[];
  meta_description: string | null;
  status: string;
  published_at: string | null;
  scheduled_at: string | null;
  author: string | null;
  views: number | null;
  read_time: number | null;
  created_at: string;
  updated_at: string;
}

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

async function syncDbToMd() {
  console.log('Fetching articles from Supabase...');
  const { data, error } = await supabase
    .from('articles')
    .select('*');

  if (error) {
    console.error('Error fetching articles from Supabase:', error);
    process.exit(1);
  }

  const articles = data as ArticleRecord[];
  console.log(`Found ${articles.length} articles in Supabase.`);

  if (!fs.existsSync(articlesDir)) {
    fs.mkdirSync(articlesDir, { recursive: true });
  }

  console.log('Crawling local articles to build ID map...');
  const allMdFiles = walkDir(articlesDir);
  const idToFilePath = new Map<string, string>();

  for (const filePath of allMdFiles) {
    try {
      const fileContent = fs.readFileSync(filePath, 'utf-8');
      const match = fileContent.match(/^---\r?\n([\s\S]*?)\r?\n---\r?\n/);
      if (match) {
        const metadata = yaml.load(match[1]) as Record<string, unknown>;
        if (metadata && metadata.id) {
          idToFilePath.set(String(metadata.id), filePath);
        }
      }
    } catch (e) {
      console.warn(`[Sync] Error reading frontmatter from ${filePath}:`, e);
    }
  }

  let updatedCount = 0;
  let createdCount = 0;
  let renamedCount = 0;

  for (const article of articles) {
    const existingFilePath = idToFilePath.get(article.id);
    const targetSubPath = getPartitionedPath(article.slug);

    const relativePath = targetSubPath.replace('/content/articles/', '');
    const targetFilePath = path.join(articlesDir, relativePath);

    const frontmatter: Frontmatter = {
      id: article.id,
      title: article.title,
      slug: article.slug,
      excerpt: article.excerpt,
      featured_image: article.featured_image,
      category: article.category,
      tags: article.tags || [],
      keywords: article.keywords || [],
      meta_description: article.meta_description,
      status: article.status,
      published_at: article.published_at,
      scheduled_at: article.scheduled_at,
      author: article.author,
      views: article.views,
      read_time: article.read_time,
      created_at: article.created_at,
      updated_at: article.updated_at
    };

    const yamlStr = yaml.dump(frontmatter, {
        forceQuotes: false,
        quotingType: '"',
        noRefs: true
    });

    const newFileContent = `---\n${yamlStr}---\n\n${article.content || ''}`;

    if (existingFilePath) {
      if (path.resolve(existingFilePath) !== path.resolve(targetFilePath)) {
        console.log(`[Rename] ${article.slug}: ${existingFilePath} -> ${targetFilePath}`);
        if (fs.existsSync(existingFilePath)) {
          fs.unlinkSync(existingFilePath);
        }
        renamedCount++;
      }

      const dir = path.dirname(targetFilePath);
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }

      fs.writeFileSync(targetFilePath, newFileContent);
      updatedCount++;
    } else {
      console.log(`[Create] ${article.slug}: ${targetFilePath}`);
      const dir = path.dirname(targetFilePath);
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }
      fs.writeFileSync(targetFilePath, newFileContent);
      createdCount++;
    }
  }

  console.log(`Sync complete!`);
  console.log(`Updated/Created: ${updatedCount + createdCount}`);
  console.log(`- New files: ${createdCount}`);
  console.log(`- Renamed: ${renamedCount}`);
}

syncDbToMd().catch(console.error);
