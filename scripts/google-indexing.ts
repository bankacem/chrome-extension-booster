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

// URLs requested by user for priority indexing
const MANUAL_PRIORITY_URLS = [
  `${BASE_URL}/blog/internet-download-manager-extension`,
  `${BASE_URL}/blog/top-10-google-sheets-extensions-for-accounting-8`,
  `${BASE_URL}/terms`,
  `${BASE_URL}/blog/extension-chrome-rafraichissement-automatique-15`,
  `${BASE_URL}/blog/screenshot-tool-chrome-guide-1`,
  `${BASE_URL}/blog/fast-screenshot-extension-alternatives-1`,
  `${BASE_URL}/blog/chrome-extensions-on-android-2026-kiwi-vs-yandex-vs-lemur-full-guide`,
  `${BASE_URL}/blog/pro-developer-chrome-extensions`,
  `${BASE_URL}/blog/extension-idm-to-chrome-12`,
  `${BASE_URL}/blog/best-annotated-screenshot-chrome-5`,
  `${BASE_URL}/blog/unlocking-the-power-of-chrome-how-to-find-the-best-extension-to-chrome-for-your-needs`,
  `${BASE_URL}/blog/the-best-security-chrome-extensions-free-to-install-in-2025`,
  `${BASE_URL}/blog/extension-chrome-wapi-17`,
  `${BASE_URL}/blog/best-chrome-extensions-for-privacy-2026-protect-your-online-identity-mll9br233zj`,
  `${BASE_URL}/blog/essential-chrome-extensions-for-ad-free-browsing-user-experience-speed-productivity-clean-web-9`,
  `${BASE_URL}/blog/google-chrome-programm-en-14`,
  `${BASE_URL}/blog/unlock-the-power-of-ad-blocking-on-android-a-comprehensive-guide-to-adblock-chrome-addon-android-mm3scnuyzcs`,
  `${BASE_URL}/blog/professional-browser-tools-guide`,
  `${BASE_URL}/blog/the-ultimate-chrome-extensions-for-browsing-guide`,
  `${BASE_URL}/blog/how-to-install-chrome-extensions-a-complete-step-by-step-tutorial`,
  `${BASE_URL}/blog/add-extension-to-chrome-7`,
  `${BASE_URL}/blog/extension-utile-chrome-12`,
  `${BASE_URL}/blog/free-screenshot-extensions-for-chrome`,
  `${BASE_URL}/blog/the-ultimate-guide-to-finding-a-safe-youtube-downloader-extension-no-ads-mliju6qrdal`,
  `${BASE_URL}/blog/how-to-add-extensions-to-chrome-mobile-a-step-by-step-guide-mmthoys728s`,
  `${BASE_URL}/blog/extension-norton-chrome-8`,
  `${BASE_URL}/blog/vpn-extension-to-chrome-1`,
  `${BASE_URL}/blog/best-screenshot-extensions-for-chrome-1`,
  `${BASE_URL}/blog/unlock-the-power-of-linkedin-with-the-best-extension-linkedin-chrome-tools`,
  `${BASE_URL}/blog/best-quick-screenshot-chrome-tools-3`,
  `${BASE_URL}/blog/capture-screen-chrome-review-5`,
  `${BASE_URL}/blog/chrome-web-store-2`,
  `${BASE_URL}/blog/the-ultimate-chrome-extension-reviews-guide-how-to-find-the-best-browser-tools`,
  `${BASE_URL}/blog/extension-grammaire-chrome-6`,
  `${BASE_URL}/blog/extension-chrome-screen-page-16`
];

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

  const envKey = process.env.GOOGLE_INDEXING_KEY;
  let keyPath = '';

  if (fs.existsSync(NEW_KEY_FILE)) keyPath = NEW_KEY_FILE;
  else if (fs.existsSync(KEY_FILE)) keyPath = KEY_FILE;
  else if (fs.existsSync(ALT_KEY_FILE)) keyPath = ALT_KEY_FILE;

  if (envKey) {
    try {
      const keyData = JSON.parse(envKey) as IndexingKey;
      if (keyData.private_key) {
        keyData.private_key = keyData.private_key.replace(/\\n/g, '\n');
      }
      authOptions.credentials = keyData;
    } catch (e) {
      console.error('[Indexing] Error parsing GOOGLE_INDEXING_KEY:', (e as Error).message);
      return;
    }
  } else if (keyPath) {
    try {
      console.log(`[Indexing] Using key file: ${keyPath}`);
      const keyData = JSON.parse(fs.readFileSync(keyPath, 'utf-8')) as IndexingKey;
      if (keyData.private_key) {
        keyData.private_key = keyData.private_key.replace(/\\n/g, '\n');
      }
      authOptions.credentials = keyData;
    } catch (e) {
      console.error(`[Indexing] Error reading key file ${keyPath}:`, (e as Error).message);
      return;
    }
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

  // Sort articles by published_at ASCENDING (oldest first)
  articles.sort((a, b) => {
    const dateA = a.published_at ? new Date(a.published_at).getTime() : 0;
    const dateB = b.published_at ? new Date(b.published_at).getTime() : 0;
    return dateA - dateB;
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
