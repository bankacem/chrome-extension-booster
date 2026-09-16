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
  // Completed articles 100% (FAQ + Verdict)
  `${BASE_URL}/blog/unlocking-the-power-of-chrome-extensions-on-android-a-comprehensive-guide`,
  `${BASE_URL}/blog/unlocking-the-power-of-chrome-how-to-find-the-best-extension-to-chrome-for-your-needs`,
  `${BASE_URL}/blog/unlock-the-full-potential-of-kiwi-browser`,
  `${BASE_URL}/blog/unlocking-the-power-of-extension-microsoft-edge`,
  `${BASE_URL}/blog/unlocking-online-security-the-power-of-avast-extension-google-chrome`,
  `${BASE_URL}/blog/unlocking-the-full-potential-of-chrome-mobile`,
  `${BASE_URL}/blog/unlocking-the-power-of-avast-password-chrome-secure-browsing`,
  `${BASE_URL}/blog/which-android-browser-handles-extensions-best`,
  `${BASE_URL}/blog/using-a-chrome-extension-on-your-android-phone`,
  `${BASE_URL}/blog/how-to-fix-chrome-memory-2026`,

  // Refined articles (2,500+ words)
  `${BASE_URL}/blog/unlocking-the-power-of-extension-chrome-joko`,
  `${BASE_URL}/blog/chatgpt-export-chat-chrome-extension`,
  `${BASE_URL}/blog/tts-chrome-5`,
  `${BASE_URL}/blog/using-dark-mode-on-quora-for-better-focus-4`,
  `${BASE_URL}/blog/unlock-the-power-of-responsive-design`,
  `${BASE_URL}/blog/unlocking-the-power-of-avast-extension-chrome`,
  `${BASE_URL}/blog/extension-get-chrome-3`,
  `${BASE_URL}/blog/unlocking-the-power-of-extension-bsr-amazon-boosting-sales`,
  `${BASE_URL}/blog/why-you-need-an-antivirus-extension-for-chrome`,
  `${BASE_URL}/blog/unlocking-data-visualization-the-power-of-tableau-chrome-extension`,
  `${BASE_URL}/blog/unlocking-the-power-of-browser-extensions-extension-to`,
  `${BASE_URL}/blog/unlock-lightning-fast-video-playback-extension-accelerer-video`,
  `${BASE_URL}/blog/unlocking-the-power-of-meta-tags-chrome-extension-for-meta-tags`,
  `${BASE_URL}/blog/unlocking-efficiency-the-best-spreadsheets-software-for-small-business`,
  `${BASE_URL}/blog/stop-wasting-time-typing-the-same-prompts`,
  `${BASE_URL}/blog/download-chrome-extension-opera-10`,
  `${BASE_URL}/blog/unlock-ad-free-youtube-browsing-youtube-ad-blocker-extension-chrome`,
  `${BASE_URL}/blog/unlocking-the-full-potential-of-your-browser-extensiontocom`,
  `${BASE_URL}/blog/a-game-changer-for-productivity`,
  `${BASE_URL}/blog/chatgpt-conversation-search-extension-2026`,
  `${BASE_URL}/blog/unlocking-the-power-of-extensionhub-enhancing-your-browser-experience`,
  `${BASE_URL}/blog/unlock-the-power-of-youtube-subtitle-downloader-chrome`,
  `${BASE_URL}/blog/unlocking-productivity-the-best-chrome-extensions-for-web-developers`,
  `${BASE_URL}/blog/unlocking-the-power-of-password-management`,
  `${BASE_URL}/blog/extension-chrome-couleur`,

  // Adblock column survivor/pillar URLs
  `${BASE_URL}/blog/adblock-chrome-android-complete-guide-2026`,
  `${BASE_URL}/blog/adblock-plus-vs-ublock-origin-2026`,
  `${BASE_URL}/blog/best-adblock-browser-for-android-2026`,
  `${BASE_URL}/blog/poper-blocker-vs-adblock-plus-2026`
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
  const allTargetUrls = Array.from(new Set([
    ...staticPages,
    ...MANUAL_PRIORITY_URLS,
    ...articleUrls
  ]));

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
