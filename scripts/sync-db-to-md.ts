import { createClient } from "@supabase/supabase-js";
import * as fs from 'fs';
import * as path from 'path';
import * as yaml from 'js-yaml';
import * as dotenv from 'dotenv';
import { getPartitionedPath } from '../src/utils/articlePath';

// Load environment variables
dotenv.config();

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_PUBLISHABLE_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error("Missing Supabase credentials. Set VITE_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY (or VITE_SUPABASE_PUBLISHABLE_KEY) in .env");
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
  console.log('Fetching all articles from Supabase (bypassing RLS)...');

  // Fetch ALL articles using strict pagination (200-row batches) to guarantee reliability
  const pageSize = 200;
  let from = 0;
  let allArticles: ArticleRecord[] = [];

  while (true) {
    const { data, error } = await supabase
      .from('articles')
      .select('*')
      .order('created_at', { ascending: false })
      .range(from, from + pageSize - 1);

    if (error) {
      console.error('Error fetching from Supabase:', error.message);
      process.exit(1);
    }

    const batch = (data ?? []) as ArticleRecord[];
    allArticles = allArticles.concat(batch);

    if (batch.length < pageSize) break;
    from += pageSize;
  }

  console.log(`Found ${allArticles.length} articles in Supabase.`);

  if (!fs.existsSync(articlesDir)) {
    fs.mkdirSync(articlesDir, { recursive: true });
  }

  // Build map of existing MD files by article ID
  console.log('Scanning local markdown files...');
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

  for (const article of allArticles) {
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

    // Handle rename if slug changed
    if (existingFilePath && path.resolve(existingFilePath) !== path.resolve(targetFilePath)) {
      console.log(`[Rename] ${article.slug}: ${path.basename(existingFilePath)} -> ${path.basename(targetFilePath)}`);
      if (fs.existsSync(existingFilePath)) {
        fs.unlinkSync(existingFilePath);
      }
      renamedCount++;
    }

    // Write the file
    const dir = path.dirname(targetFilePath);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }

    fs.writeFileSync(targetFilePath, newFileContent);

    if (!existingFilePath) {
      console.log(`[Create] ${article.slug}`);
      createdCount++;
    } else {
      updatedCount++;
    }
  }

  console.log(`\nSync complete!`);
  console.log(`  Total from Supabase: ${allArticles.length}`);
  console.log(`  New files created:   ${createdCount}`);
  console.log(`  Files updated:       ${updatedCount}`);
  console.log(`  Files renamed:       ${renamedCount}`);
}

syncDbToMd().catch(console.error);
