import fs from 'fs';
import path from 'path';

const sitemapPath = path.join(process.cwd(), 'public', 'sitemap.xml');
const cleanedUrlsPath = path.join(process.cwd(), 'scripts', 'cleaned-urls.json');

console.log('Synchronizing indexing queue...');

const sitemapXml = fs.readFileSync(sitemapPath, 'utf-8');
const cleanedUrls = JSON.parse(fs.readFileSync(cleanedUrlsPath, 'utf-8'));

// Extract all <loc> tags from sitemap
const urlRegex = /<loc>(https?:\/\/[^<]+)<\/loc>/g;
const sitemapUrls = [];
let match;
while ((match = urlRegex.exec(sitemapXml)) !== null) {
  sitemapUrls.push(match[1]);
}

// Combine and deduplicate
const combinedUrls = [...new Set([...cleanedUrls, ...sitemapUrls])];

// Sort to keep it organized (optional but helpful)
combinedUrls.sort();

fs.writeFileSync(cleanedUrlsPath, JSON.stringify(combinedUrls, null, 2));

console.log(`Synchronization complete.`);
console.log(`Original count: ${cleanedUrls.length}`);
console.log(`New count: ${combinedUrls.length}`);
console.log(`Added: ${combinedUrls.length - cleanedUrls.length} URLs.`);
