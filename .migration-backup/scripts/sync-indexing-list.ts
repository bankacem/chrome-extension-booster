import fs from 'fs';
import path from 'path';

const sitemapPath = path.join(process.cwd(), 'public', 'sitemap.xml');
const cleanedUrlsPath = path.join(process.cwd(), 'scripts', 'cleaned-urls.json');

console.log('Synchronizing indexing queue (RESET MODE)...');

if (!fs.existsSync(sitemapPath)) {
  console.error('Sitemap not found at', sitemapPath);
  process.exit(1);
}

const sitemapXml = fs.readFileSync(sitemapPath, 'utf-8');

// Extract all <loc> tags from sitemap
const urlRegex = /<loc>(https?:\/\/[^<]+)<\/loc>/g;
const sitemapUrls = [];
let match;
while ((match = urlRegex.exec(sitemapXml)) !== null) {
  sitemapUrls.push(match[1]);
}

// In RESET mode, we trust the sitemap as the current truth
const combinedUrls = [...new Set(sitemapUrls)];
combinedUrls.sort();

fs.writeFileSync(cleanedUrlsPath, JSON.stringify(combinedUrls, null, 2));

console.log(`Synchronization complete.`);
console.log(`New count: ${combinedUrls.length}`);
