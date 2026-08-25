import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Static sitemap content - keep it updated or generate on-the-fly
const WEBSITE_URL = "https://extensionto.com";

const staticPages = [
  { url: "/", changefreq: "weekly", priority: "1.0" },
  { url: "/blog", changefreq: "daily", priority: "0.8" },
  { url: "/privacy", changefreq: "yearly", priority: "0.3" },
  { url: "/terms", changefreq: "yearly", priority: "0.3" },
];

function escapeXml(unsafe) {
  return unsafe.replace(/[<>&'"]/g, (c) => {
    switch (c) {
      case '<': return '&lt;';
      case '>': return '&gt;';
      case '&': return '&amp;';
      case '\'': return '&apos;';
      case '"': return '&quot;';
      default: return c;
    }
  });
}

function generateSitemapXml(pages) {
  return `<?xml version="1.0" encoding="UTF-8"?>
<?xml-stylesheet type="text/xsl" href="/sitemap.xsl"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${pages
  .map(
    (page) => `  <url>
    <loc>${escapeXml(WEBSITE_URL + page.url)}</loc>
    <changefreq>${page.changefreq}</changefreq>
    <priority>${page.priority}</priority>${page.lastmod ? `\n    <lastmod>${page.lastmod}</lastmod>` : ''}
  </url>`
  )
  .join("\n")}
</urlset>`;
}

export default function handler(req, res) {
  try {
    // Try to read from public/sitemap.xml if it exists
    const publicSitemapPath = path.join(__dirname, '..', 'public', 'sitemap.xml');
    
    if (fs.existsSync(publicSitemapPath)) {
      const sitemapContent = fs.readFileSync(publicSitemapPath, 'utf-8');
      res.setHeader('Content-Type', 'application/xml; charset=utf-8');
      res.setHeader('Cache-Control', 'public, max-age=3600'); // Cache for 1 hour
      return res.status(200).send(sitemapContent);
    }

    // Fallback: generate minimal sitemap
    console.warn('public/sitemap.xml not found, generating fallback...');
    const fallbackPages = [
      ...staticPages,
      { url: "/blog/chrome-extension-booster", changefreq: "monthly", priority: "0.7" }
    ];
    
    const sitemapContent = generateSitemapXml(fallbackPages);
    res.setHeader('Content-Type', 'application/xml; charset=utf-8');
    res.setHeader('Cache-Control', 'public, max-age=3600');
    return res.status(200).send(sitemapContent);
  } catch (error) {
    console.error('Sitemap generation error:', error);
    res.setHeader('Content-Type', 'application/xml; charset=utf-8');
    res.status(500).send(`<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
  <url>
    <loc>${WEBSITE_URL}/</loc>
    <changefreq>weekly</changefreq>
    <priority>1.0</priority>
  </url>
</urlset>`);
  }
}
