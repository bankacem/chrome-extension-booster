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
const MERGED_ARTICLES_FILE = path.join(process.cwd(), 'public', 'content', 'merged-articles.json');
const BASE_URL = process.env.VITE_WEBSITE_URL || 'https://extensionto.com';

const DELAY_MS = 1000; // 1 second delay between requests

// URLs requested by user for priority indexing
const MANUAL_PRIORITY_URLS = [
  `${BASE_URL}/blog/a-game-changer-for-efficient-browsing`,
  `${BASE_URL}/blog/a-download-manager-extension-worth-installing`,
  `${BASE_URL}/blog/windscribe-extension-to-chrome-9`,
  `${BASE_URL}/blog/extension-chrome-capture-page-web`,
  `${BASE_URL}/blog/unlocking-enhanced-browser-security-kaspersky-chrome`,
  `${BASE_URL}/blog/unlocking-the-power-of-yandex-browser-on-chrome-web-store`,
  `${BASE_URL}/blog/extension-chrome-mobile-6`,
  `${BASE_URL}/blog/the-no-ads-chrome-extension-worth-installing`,
  `${BASE_URL}/blog/screenshot-tool-chrome-tutorial`,
  `${BASE_URL}/blog/download-video-instagram-extension-chrome-6`,
  `${BASE_URL}/blog/unlock-the-power-of-facebook-pixel-with-the-extension-chrome-facebook-pixel-helper`,
  `${BASE_URL}/blog/extension-ad-block-plus-faster-browsing`,
  `${BASE_URL}/blog/exploring-poper-blocker-alternatives`,
  `${BASE_URL}/blog/how-to-enable-dark-mode-on-google-search`,
  `${BASE_URL}/blog/discover-the-best-spreadsheets-software-for-small-business`,
  `${BASE_URL}/blog/safe-video-downloader-for-chrome`,
  `${BASE_URL}/blog/extension-idm-to-chrome-12`,
  `${BASE_URL}/blog/unlocking-efficiency-the-best-productivity-tools-for-chrome-browser`,
  `${BASE_URL}/blog/save-images-from-protected-sites-chrome`,
  `${BASE_URL}/blog/extension-bypass-chrome-enhancing-your-browsing-experience`,
  `${BASE_URL}/blog/enhancing-your-browsing-experience-with-avast-online-security-chrome`,
  `${BASE_URL}/blog/the-power-of-extension-adblock-chrome-android`,
  `${BASE_URL}/blog/unlocking-the-power-of-extension-brave-mobile`,
  `${BASE_URL}/blog/the-best-adblock-for-android-chrome`,
  `${BASE_URL}/blog/the-best-popup-blocker-for-chrome-in-2026`,
  `${BASE_URL}/blog/ghostery-vs-privacy-badger-full-2026-comparison`,
  `${BASE_URL}/blog/how-to-enable-extensions-in-chrome-android`,
  `${BASE_URL}/blog/how-to-block-youtube-ads-with-ghostery-extension`,
  `${BASE_URL}/blog/unlocking-the-power-of-google-chat-extension`,
  `${BASE_URL}/blog/why-you-should-avoid-cloud-based-password-managers-2`,
  `${BASE_URL}/blog/boosting-productivity-with-light-browser-extensions-for-slow-pc`,
  `${BASE_URL}/blog/extension-chrome-color-2`,
  `${BASE_URL}/blog/how-to-install-ublock-origin-on-android-chrome`,
  `${BASE_URL}/blog/screen-grab-chrome-2025-1`,
  `${BASE_URL}/blog/protecting-your-online-security`,
  `${BASE_URL}/blog/discover-the-best-privacy-extension-chrome`,
  `${BASE_URL}/blog/extension-auto-refresh-plus-3`,
  `${BASE_URL}/blog/best-chrome-extensions-for-online-safety`,
  `${BASE_URL}/blog/chrome-privacy-extensions-worth-adding-today`,
  `${BASE_URL}/blog/the-best-chrome-extension-for-bulk-downloads`
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
  const mergedArticles: Record<string, { redirect_to: string }> = fs.existsSync(MERGED_ARTICLES_FILE)
    ? JSON.parse(fs.readFileSync(MERGED_ARTICLES_FILE, 'utf-8')) as Record<string, { redirect_to: string }>
    : {};
  const mdFiles = walkDir(ARTICLES_DIR);
  const articles: ArticleMeta[] = [];

  for (const file of mdFiles) {
    const meta = getArticleMeta(file);
    if (meta && meta.status?.toLowerCase() === 'published' && !mergedArticles[meta.slug]) {
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
