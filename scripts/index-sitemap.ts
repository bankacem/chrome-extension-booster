import { notifyIndexing } from './google-indexing';

const SITEMAP_URL = 'https://extensionto.com/sitemap.xml';
const DELAY_BETWEEN_REQUESTS = 1000; // 1 second delay to respect rate limits

async function indexSitemap() {
  console.log(`🔍 [Sitemap-Indexing] Fetching sitemap from: ${SITEMAP_URL}`);

  try {
    const response = await fetch(SITEMAP_URL);
    if (!response.ok) {
      throw new Error(`Failed to fetch sitemap: ${response.status} ${response.statusText}`);
    }

    const xml = await response.text();

    // Simple regex to extract <loc> URLs
    const urlRegex = /<loc>(https?:\/\/[^<]+)<\/loc>/g;
    const urls: string[] = [];
    let match;

    while ((match = urlRegex.exec(xml)) !== null) {
      urls.push(match[1]);
    }

    if (urls.length === 0) {
      console.warn('⚠️ [Sitemap-Indexing] No URLs found in sitemap.');
      return;
    }

    console.log(`📊 [Sitemap-Indexing] Found ${urls.length} URLs in sitemap.`);

    // De-duplicate URLs
    const uniqueUrls = Array.from(new Set(urls));
    console.log(`📊 [Sitemap-Indexing] Unique URLs to process: ${uniqueUrls.length}`);

    let successCount = 0;
    let failCount = 0;
    const failures: { url: string; error: string }[] = [];

    for (const url of uniqueUrls) {
      try {
        console.log(`📤 [Sitemap-Indexing] Processing: ${url}`);
        await notifyIndexing(url);
        successCount++;

        // ✅ Respect rate limits (Google Indexing API limit is 200/day per project usually)
        await new Promise(resolve => setTimeout(resolve, DELAY_BETWEEN_REQUESTS));
      } catch (error) {
        failCount++;
        const errorMsg = (error as Error).message;
        failures.push({ url, error: errorMsg });
        console.error(`❌ [Sitemap-Indexing] Failed to notify ${url}:`, errorMsg);

        // ✅ Halt if we hit quota limits (429 Too Many Requests)
        if (errorMsg.toLowerCase().includes('quota') || errorMsg.toLowerCase().includes('429')) {
          console.error('🚫 [Sitemap-Indexing] Quota exceeded or too many requests, stopping process.');
          break;
        }
      }
    }

    console.log('\n📈 --- Sitemap Indexing Summary ---');
    console.log(`Total URLs Found: ${uniqueUrls.length}`);
    console.log(`Successfully Submitted: ${successCount}`);
    console.log(`Failed Submissions: ${failCount}`);

    if (failures.length > 0) {
      console.log('\n❌ --- Failure Details ---');
      failures.slice(0, 10).forEach(f => console.log(`${f.url}: ${f.error}`));
      if (failures.length > 10) {
        console.log(`... and ${failures.length - 10} more failures.`);
      }
    }

  } catch (error) {
    console.error('❌ [Sitemap-Indexing] Error:', (error as Error).message);
    process.exit(1);
  }
}

indexSitemap().catch(console.error);
