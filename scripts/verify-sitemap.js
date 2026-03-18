import fs from 'fs';
import path from 'path';
import sitemapHandler from '../api/sitemap.ts';

async function verifySitemap() {
  const req = {};
  let sitemapXml = '';
  const res = {
    setHeader: () => {},
    status: function(code) {
      return this;
    },
    send: (data) => {
      sitemapXml = data;
    }
  };

  await sitemapHandler(req, res);

  const cleanedUrls = JSON.parse(fs.readFileSync('scripts/cleaned-urls.json', 'utf-8'));
  const missingInSitemap = [];

  for (const url of cleanedUrls) {
    if (!sitemapXml.includes(`<loc>${url}</loc>`)) {
      missingInSitemap.push(url);
    }
  }

  if (missingInSitemap.length === 0) {
    console.log('Verification SUCCESS: All 208 URLs are present in the sitemap.');
  } else {
    console.log(`Verification FAILED: ${missingInSitemap.length} URLs are missing from sitemap.`);
    console.log(JSON.stringify(missingInSitemap, null, 2));
  }

  // Basic XML validation (just check if it looks like XML)
  if (sitemapXml.startsWith('<?xml') && sitemapXml.includes('</urlset>')) {
    console.log('Verification SUCCESS: XML format seems valid.');
  } else {
    console.log('Verification FAILED: XML format is invalid.');
    // console.log(sitemapXml.substring(0, 100));
  }
}

verifySitemap().catch(console.error);
