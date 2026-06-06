import fs from 'fs';
import path from 'path';
import { notifyIndexing } from './google-indexing';

const WEBSITE_URL = 'https://extensionto.com';
const INDEX_PATH = path.join(process.cwd(), 'public', 'content', 'articles-index.json');

async function bulkIndex() {
  if (!fs.existsSync(INDEX_PATH)) {
    console.error(`Index file not found at ${INDEX_PATH}`);
    process.exit(1);
  }

  const articles = JSON.parse(fs.readFileSync(INDEX_PATH, 'utf-8'));
  console.log(`Starting bulk indexing for ${articles.length} articles...`);

  // We should also index static pages
  const staticPages = [
    '/',
    '/blog',
    '/privacy',
    '/terms'
  ];

  const allUrls = [
    ...staticPages.map(p => `${WEBSITE_URL}${p}`),
    ...articles.map((a: { slug: string }) => `${WEBSITE_URL}/blog/${a.slug}`)
  ];

  console.log(`Total URLs to notify: ${allUrls.length}`);

  for (const url of allUrls) {
    console.log(`[Bulk-Index] Notifying Google about: ${url}`);
    await notifyIndexing(url).catch(e => console.error(`Failed to notify ${url}:`, e));

    // To avoid hitting API rate limits too quickly, we can add a small delay
    await new Promise(resolve => setTimeout(resolve, 100));
  }

  console.log('Bulk indexing notification process completed.');
}

bulkIndex().catch(console.error);
