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
  `${BASE_URL}/blog/a-chrome-extension-for-saving-media-files`,
  `${BASE_URL}/blog/ai-tab-manager-chrome-extension-a-verification-first-buyers-guide`,
  `${BASE_URL}/blog/best-chrome-extensions-for-accessibility-boost-your-browsing-experience`,
  `${BASE_URL}/blog/best-chrome-extensions-for-remote-workers-2026`,
  `${BASE_URL}/blog/best-free-popup-blocker-for-chrome-2026`,
  `${BASE_URL}/blog/best-memory-saver-extension-for-chrome-4`,
  `${BASE_URL}/blog/best-spreadsheet-tools-for-small-business-owners-5`,
  `${BASE_URL}/blog/best-tab-suspender-for-4gb-ram-laptops-1`,
  `${BASE_URL}/blog/best-youtube-to-mp3-chrome-extension`,
  `${BASE_URL}/blog/best-youtube-to-mp3-chrome-extension-2026-top-5-free-safe-converters`,
  `${BASE_URL}/blog/chrome-extension-security-risks-permission-audit-guide`,
  `${BASE_URL}/ar/blog/chrome-extension-security-risks-permission-audit-guide`,
  `${BASE_URL}/pt/blog/chrome-extension-security-risks-permission-audit-guide`,
  `${BASE_URL}/blog/chrome-extensions-for-reading-pdfs-online`,
  `${BASE_URL}/blog/chrome-extensions-that-actually-respect-your-privacy`,
  `${BASE_URL}/blog/chrome-manifest-v3-migration-guide-what-users-need-to-know`,
  `${BASE_URL}/blog/extension-android-google-chrome`,
  `${BASE_URL}/blog/extension-chrome-screen-page-16`,
  `${BASE_URL}/blog/extension-get-chrome-3`,
  `${BASE_URL}/blog/extension-google-chrome-adblock-android-5`,
  `${BASE_URL}/blog/google-chrome-programm-en-14`,
  `${BASE_URL}/blog/how-to-disable-chrome-extensions-on-specific-sites`,
  `${BASE_URL}/blog/how-to-fix-chrome-high-memory-usage-the-ultimate-2026-speed-up-guide`,
  `${BASE_URL}/blog/how-to-fix-chrome-memory-2026`,
  `${BASE_URL}/blog/how-to-hibernate-inactive-tabs-automatically-6`,
  `${BASE_URL}/blog/how-to-install-chrome-extensions-a-complete-step-by-step-tutorial`,
  `${BASE_URL}/blog/how-to-manage-chrome-extensions-organize-disable-clean-up`,
  `${BASE_URL}/blog/ie-tab-chrome-legacy-sites-guide`,
  `${BASE_URL}/blog/privacy-badger-chrome`,
  `${BASE_URL}/blog/protab-suspender-vs-google-memory-saver-2026-which-saves-more-ram`,
  `${BASE_URL}/blog/remove-chrome-extension-installed-by-enterprise-policy`,
  `${BASE_URL}/blog/the-best-chrome-plugins-for-downloading-media`,
  `${BASE_URL}/blog/the-safest-youtube-to-mp3-extension-in-2026`,
  `${BASE_URL}/blog/top-rated-privacy-extensions-for-google-chrome`,
  `${BASE_URL}/blog/unlocking-the-power-of-google-tag-assistant-extension`,
  `${BASE_URL}/blog/vpn-article10-windscribe-review`,
  `${BASE_URL}/blog/writing-vlookup-formulas-for-beginners-2`
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
