import fs from 'fs';
import path from 'path';
import { notifyIndexing } from './google-indexing';

async function indexUserUrls() {
  const CLEANED_URLS_PATH = path.join(process.cwd(), 'scripts', 'cleaned-urls.json');

  if (!fs.existsSync(CLEANED_URLS_PATH)) {
    console.error(`Cleaned URLs file not found at ${CLEANED_URLS_PATH}`);
    return;
  }

  const urlsToPush = JSON.parse(fs.readFileSync(CLEANED_URLS_PATH, 'utf-8'));

  console.log(`Attempting to index ${urlsToPush.length} URLs...`);

  for (const url of urlsToPush) {
    console.log(`[Indexing] Notifying Google about: ${url}`);
    await notifyIndexing(url).catch(e => console.error(`Failed to notify ${url}:`, e));
    // Small delay to avoid rate limits
    await new Promise(resolve => setTimeout(resolve, 100));
  }

  console.log('Indexing notification process completed.');
}

indexUserUrls().catch(console.error);
