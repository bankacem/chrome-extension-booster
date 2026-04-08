import { notifyIndexing } from './google-indexing';

const SITEMAP_URL = 'https://extensionto.com/sitemap.xml';
// ✅ FIX: 1 second delay between requests to avoid Google quota (200 req/day)
const DELAY_MS = 1000;

async function indexSitemap() {
  console.log(`[Sitemap-Indexing] Fetching sitemap from: ${SITEMAP_URL}`);

  let xml: string;
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
      console.log(`[${i + 1}/${uniqueUrls.length}] Notifying: ${url}`);
      await notifyIndexing(url);
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
