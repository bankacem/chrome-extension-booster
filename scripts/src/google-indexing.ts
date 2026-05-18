import { google } from 'googleapis';
import * as fs from 'fs';
import * as path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const KEY_FILE = path.resolve(__dirname, '..', '..', 'service-account.json');
const INDEX_FILE = path.resolve(__dirname, '..', '..', 'artifacts', 'extensionto', 'public', 'content', 'articles-index.json');
const STATE_FILE = path.resolve(__dirname, '..', 'indexed-urls.json');
const LOG_FILE = path.resolve(__dirname, '..', '..', 'google-indexing.log');
const BASE_URL = process.env.VITE_WEBSITE_URL || 'https://extensionto.com';

const DELAY_MS = 1000; // 1 second delay between requests

interface Article {
  slug: string;
  published_at: string;
  updated_at: string;
}

/**
 * Notifies Google Indexing API about a new or updated URL.
 */
export async function notifyIndexing(url: string, type: 'URL_UPDATED' | 'URL_DELETED' = 'URL_UPDATED') {
  const authOptions: { scopes: string[]; credentials?: any; keyFile?: string } = {
    scopes: ['https://www.googleapis.com/auth/indexing'],
  };

  if (process.env.GOOGLE_INDEXING_KEY) {
    try {
      const keyData = JSON.parse(process.env.GOOGLE_INDEXING_KEY);
      if (keyData.private_key) {
        keyData.private_key = keyData.private_key.replace(/\\n/g, '\n');
      }
      authOptions.credentials = keyData;
    } catch (e) {
      console.error('[Indexing] Error parsing GOOGLE_INDEXING_KEY:', (e as Error).message);
      return;
    }
  } else if (fs.existsSync(KEY_FILE)) {
    authOptions.keyFile = KEY_FILE;
  } else {
    console.warn(`[Indexing] Skip: No key found (set GOOGLE_INDEXING_KEY or service-account.json)`);
    return;
  }

  try {
    const auth = new google.auth.GoogleAuth(authOptions);
    const authClient = await auth.getClient();
    const indexing = google.indexing({
      version: 'v3',
      auth: authClient as any,
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
  console.log('--- Starting Mass Indexing Event (Recently Updated First) ---');

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

  // Load articles from index
  if (!fs.existsSync(INDEX_FILE)) {
    console.error(`[Indexing] Articles index not found at ${INDEX_FILE}`);
    return;
  }

  const articles: Article[] = JSON.parse(fs.readFileSync(INDEX_FILE, 'utf-8'));
  console.log(`Found ${articles.length} articles in index.`);

  // Sort by updated_at DESC (recently updated first)
  articles.sort((a, b) => {
    const dateA = new Date(a.updated_at || a.published_at).getTime();
    const dateB = new Date(b.updated_at || b.published_at).getTime();
    return dateB - dateA;
  });

  const articleUrls = articles.map(a => `${BASE_URL}/blog/${a.slug}`);
  const allTargetUrls = [...staticPages, ...articleUrls];

  const pendingUrls = allTargetUrls.filter(u => !indexedUrls.includes(u));

  console.log(`${pendingUrls.length} URLs pending indexing.`);

  let successCount = 0;
  let failCount = 0;

  for (let i = 0; i < pendingUrls.length; i++) {
    const url = pendingUrls[i];

    try {
      console.log(`[${i + 1}/${pendingUrls.length}] Notifying: ${url}`);
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
  console.log(`Total URLs targeted: ${allTargetUrls.length}`);
  console.log(`Successful notifications: ${successCount}`);
  console.log(`Failed notifications: ${failCount}`);
}

// Run if called directly
if (process.argv[1] === fileURLToPath(import.meta.url)) {
  massIndexing().catch(console.error);
}
