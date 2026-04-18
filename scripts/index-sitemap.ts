import { notifyIndexing } from './google-indexing';
import * as fs from 'fs';
import * as path from 'path';

// Load environment variables if not handled by runtime (e.g. Bun does it, but good for safety)
import 'dotenv/config';

const SITEMAP_URL = 'https://extensionto.com/sitemap.xml';
const LOCAL_SITEMAP_PATH = path.join(process.cwd(), 'public', 'sitemap.xml');
// ✅ FIX: 1 second delay between requests to avoid Google quota (200 req/day)
const DELAY_MS = 1000;

async function indexSitemap() {
  // Check for credentials early
  const hasEnvKey = !!process.env.GOOGLE_INDEXING_KEY;
  const hasFileKey = fs.existsSync(path.join(process.cwd(), 'service-account.json')) ||
                     fs.existsSync(path.join(process.cwd(), 'google-indexing-key.json'));

  if (!hasEnvKey && !hasFileKey) {
    console.error('[Sitemap-Indexing] Error: No Google Indexing credentials found. Please set GOOGLE_INDEXING_KEY or provide service-account.json.');
    process.exit(1);
  }

  let xml: string;

  if (fs.existsSync(LOCAL_SITEMAP_PATH)) {
    console.log(`[Sitemap-Indexing] Reading local sitemap from: ${LOCAL_SITEMAP_PATH}`);
    xml = fs.readFileSync(LOCAL_SITEMAP_PATH, 'utf-8');
  } else {
    console.log(`[Sitemap-Indexing] Fetching sitemap from: ${SITEMAP_URL}`);
    try {
      const response = await fetch(SITEMAP_URL);
      if (!response.ok) {
        throw new Error(`Failed to fetch sitemap: ${response.status} ${response.statusText}`);
      }
      xml = await response.text();
    } catch (err) {
      console.error('[Sitemap-Indexing] Cannot fetch sitemap:', (err as Error).message);
      process.exit(1);
    }
  }

  const urlRegex = /<loc>(https?:\/\/[^<]+)<\/loc>/g;
  const urls: string[] = [];
  let match;
  while ((match = urlRegex.exec(xml)) !== null) {
    urls.push(match[1]);
  }

  if (urls.length === 0) {
    console.warn('[Sitemap-Indexing] No URLs found in sitemap.');
    return;
  }

  const uniqueUrls = Array.from(new Set(urls));
  console.log(`[Sitemap-Indexing] Found ${uniqueUrls.length} unique URLs to notify.`);

  let successCount = 0;
  let failCount = 0;
  const failures: { url: string; error: string }[] = [];

  for (let i = 0; i < uniqueUrls.length; i++) {
    const url = uniqueUrls[i];
    try {
      console.log(`[${i + 1}/${uniqueUrls.length}] Notifying (URL_UPDATED): ${url}`);
      // Explicitly use URL_UPDATED as requested
      await notifyIndexing(url, 'URL_UPDATED');
      successCount++;
      // ✅ FIX: Mandatory 1s delay to respect Google's rate limits
      await new Promise(resolve => setTimeout(resolve, DELAY_MS));
    } catch (error) {
      failCount++;
      const errorMsg = (error as Error).message;
      failures.push({ url, error: errorMsg });
      console.error(`[Sitemap-Indexing] Failed: ${url} — ${errorMsg}`);

      // Stop immediately on quota exceeded
      if (
        errorMsg.toLowerCase().includes('quota') ||
        errorMsg.toLowerCase().includes('429') ||
        errorMsg.toLowerCase().includes('rate')
      ) {
        console.error('[Sitemap-Indexing] Quota exceeded. Stopping to avoid further errors.');
        break;
      }
    }
  }

  console.log('\n--- Sitemap Indexing Summary ---');
  console.log(`Submitted:  ${successCount} / ${uniqueUrls.length}`);
  console.log(`Failed:     ${failCount}`);

  if (failures.length > 0) {
    console.log('\n--- Failures ---');
    failures.forEach(f => console.log(`  ${f.url}: ${f.error}`));
  }
}

indexSitemap().catch(console.error);
