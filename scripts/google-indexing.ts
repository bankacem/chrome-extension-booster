import { google } from 'googleapis';
import * as fs from 'fs';
import * as path from 'path';
import * as yaml from 'js-yaml';

const KEY_FILE = path.join(process.cwd(), 'service-account.json');
const ALT_KEY_FILE = path.join(process.cwd(), 'google-indexing-key.json');
const NEW_KEY_FILE = path.join(process.cwd(), 'google-services.json');
const STATE_FILE = path.join(process.cwd(), 'scripts', 'indexed-urls.json');
const LOG_FILE = path.join(process.cwd(), 'google-indexing.log');
const ARTICLES_DIR = path.join(process.cwd(), 'public', 'content', 'articles');
const BASE_URL = process.env.VITE_WEBSITE_URL || 'https://extensionto.com';

const DELAY_MS = 1000; // 1 second delay between requests

interface ArticleMeta {
  path: string;
  slug: string;
  status: string;
  published_at: string | null;
}

interface IndexingKey {
  private_key?: string;
  client_email?: string;
}

/**
 * Recursively scans directory for .md files
 */
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
 * Extracts metadata from article markdown file
 */
function getArticleMeta(filePath: string): ArticleMeta | null {
  try {
    const content = fs.readFileSync(filePath, 'utf-8');
    const match = content.match(/^---\r?\n([\s\S]*?)\r?\n---\r?\n/);
    if (match) {
      const metadata = yaml.load(match[1]) as Record<string, unknown>;
      return {
        path: filePath,
        slug: String(metadata.slug || ''),
        status: String(metadata.status || ''),
        published_at: metadata.published_at ? String(metadata.published_at) : null
      };
    }
  } catch (e) {
    console.error(`[Indexing] Error parsing ${filePath}:`, (e as Error).message);
  }
  return null;
}

/**
 * Notifies Google Indexing API about a new or updated URL.
 */
export async function notifyIndexing(url: string, type: 'URL_UPDATED' | 'URL_DELETED' = 'URL_UPDATED') {
  const authOptions: { scopes: string[]; credentials?: IndexingKey; keyFile?: string } = {
    scopes: ['https://www.googleapis.com/auth/indexing'],
  };

  if (process.env.GOOGLE_INDEXING_KEY) {
    try {
      const keyData = JSON.parse(process.env.GOOGLE_INDEXING_KEY) as IndexingKey;
      if (keyData.private_key) {
        keyData.private_key = keyData.private_key.replace(/\\n/g, '\n');
      }
      authOptions.credentials = keyData;
    } catch (e) {
      console.error('[Indexing] Error parsing GOOGLE_INDEXING_KEY:', (e as Error).message);
      return;
    }
  } else if (fs.existsSync(NEW_KEY_FILE)) {
    authOptions.keyFile = NEW_KEY_FILE;
  } else if (fs.existsSync(KEY_FILE)) {
    authOptions.keyFile = KEY_FILE;
  } else if (fs.existsSync(ALT_KEY_FILE)) {
    authOptions.keyFile = ALT_KEY_FILE;
  } else {
    console.warn(`[Indexing] Skip: No key found`);
    return;
  }

  try {
    const auth = new google.auth.GoogleAuth(authOptions);
    const client = await auth.getClient();
    const indexing = google.indexing({
      version: 'v3',
      auth: client,
    });

    const res = await indexing.urlNotifications.publish({
      requestBody: { url, type },
    });

    const logEntry = `${new Date().toISOString()} - ${type} - ${url} - Status: ${res.statusText || 'OK'}\n`;
    fs.appendFileSync(LOG_FILE, logEntry);
    return res.data;
  } catch (error) {
    const errorResponse = error as { response?: { data?: { error?: { message?: string } } } };
    const errorMsg = errorResponse.response?.data?.error?.message || (error as Error).message;
    const logEntry = `${new Date().toISOString()} - ERROR - ${url} - ${errorMsg}\n`;
    fs.appendFileSync(LOG_FILE, logEntry);
    throw error;
  }
}

async function massIndexing() {
  console.log('--- Starting Mass Indexing Event ---');

  const staticPages = [
    '/',
    '/blog',
    '/privacy',
    '/terms'
  ].map(p => `${BASE_URL}${p}`);

  // Load existing state
  let indexedUrls: string[] = [];
  if (fs.existsSync(STATE_FILE)) {
    try {
      indexedUrls = JSON.parse(fs.readFileSync(STATE_FILE, 'utf-8'));
    } catch (e) {
      console.warn('[Indexing] Could not parse state file, starting fresh.');
    }
  }

  // Scan disk
  console.log(`Scanning articles in ${ARTICLES_DIR}...`);
  const mdFiles = walkDir(ARTICLES_DIR);
  const articles: ArticleMeta[] = [];

  for (const file of mdFiles) {
    const meta = getArticleMeta(file);
    if (meta && meta.status?.toLowerCase() === 'published') {
      articles.push(meta);
    }
  }

  console.log(`Found ${articles.length} published articles on disk.`);

  // Prioritize April 2026
  articles.sort((a, b) => {
    const dateA = a.published_at ? String(a.published_at) : '';
    const dateB = b.published_at ? String(b.published_at) : '';

    const isAPriority = dateA.startsWith('2026-04');
    const isBPriority = dateB.startsWith('2026-04');

    if (isAPriority && !isBPriority) return -1;
    if (!isAPriority && isBPriority) return 1;
    return 0;
  });

  const articleUrls = articles.map(a => `${BASE_URL}/blog/${a.slug}`);
  const allTargetUrls = [...staticPages, ...articleUrls];

  const pendingUrls = allTargetUrls.filter(u => !indexedUrls.includes(u));
  console.log(`${pendingUrls.length} URLs pending indexing.`);

  let successCount = 0;
  let failCount = 0;

  for (let i = 0; i < pendingUrls.length; i++) {
    const url = pendingUrls[i];
    const article = articles.find(a => `${BASE_URL}/blog/${a.slug}` === url);

    try {
      const isPriority = article?.published_at ? String(article.published_at).startsWith('2026-04') : false;
      console.log(`[${i + 1}/${pendingUrls.length}] Notifying: ${url}${isPriority ? ' (PRIORITY)' : ''}`);
      await notifyIndexing(url, 'URL_UPDATED');

      successCount++;
      indexedUrls.push(url);
      fs.writeFileSync(STATE_FILE, JSON.stringify(indexedUrls, null, 2));

      await new Promise(resolve => setTimeout(resolve, DELAY_MS));
    } catch (error) {
      failCount++;
      const errorMsg = (error as Error).message;
      console.error(`[Indexing] Failed: ${url} - ${errorMsg}`);

      if (errorMsg.toLowerCase().includes('quota') || errorMsg.includes('429')) {
        console.error('[Indexing] Quota exceeded. Stopping.');
        break;
      }
    }
  }

  console.log('\n--- Mass Indexing Summary ---');
  console.log(`Total scanned on disk: ${articles.length}`);
  console.log(`Successful notifications: ${successCount}`);
  console.log(`Failed notifications: ${failCount}`);
}

// Run if called directly
if (import.meta.url === `file://${process.argv[1]}` || process.argv[1]?.endsWith('google-indexing.ts')) {
  massIndexing().catch(console.error);
}
