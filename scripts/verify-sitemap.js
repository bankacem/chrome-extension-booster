import fs from 'fs';
import path from 'path';

async function verifySitemap() {
  const sitemapPath = path.join(process.cwd(), 'public', 'sitemap.xml');

  if (!fs.existsSync(sitemapPath)) {
    console.error(`Verification FAILED: ${sitemapPath} does not exist.`);
    process.exit(1);
  }

  const sitemapXml = fs.readFileSync(sitemapPath, 'utf-8');
  const cleanedUrls = JSON.parse(fs.readFileSync('scripts/cleaned-urls.json', 'utf-8'));
  const missingInSitemap = [];

  for (const url of cleanedUrls) {
    if (!sitemapXml.includes(`<loc>${url}</loc>`)) {
      missingInSitemap.push(url);
    }
  }

  if (missingInSitemap.length === 0) {
    console.log(`Verification SUCCESS: All ${cleanedUrls.length} URLs are present in public/sitemap.xml.`);
  } else {
    console.log(`Verification FAILED: ${missingInSitemap.length} URLs from cleaned-urls.json are missing from public/sitemap.xml.`);
    console.log(JSON.stringify(missingInSitemap, null, 2));
    process.exit(1);
  }

  // Basic XML validation
  if (sitemapXml.startsWith('<?xml') && sitemapXml.includes('</urlset>')) {
    console.log('Verification SUCCESS: XML format seems valid.');
  } else {
    console.log('Verification FAILED: XML format is invalid.');
    process.exit(1);
  }
}

verifySitemap().catch(err => {
  console.error(err);
  process.exit(1);
});
