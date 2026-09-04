const fs = require('fs');
const path = require('path');

const WEBSITE_URL = 'https://extensionto.com';

const PILLARS = {
  'how-to-fix-chrome-high-memory-usage-2026-complete-guide': { priority: '0.9', changefreq: 'weekly' },
  'adblock-chrome-android-complete-guide-2026': { priority: '0.9', changefreq: 'weekly' },
  'best-chrome-screenshot-extensions-2026-complete-guide': { priority: '0.9', changefreq: 'weekly' },
  'best-chrome-privacy-extensions-2026-complete-guide': { priority: '0.9', changefreq: 'weekly' },
  'best-youtube-downloader-chrome-extension-2026': { priority: '0.9', changefreq: 'weekly' }
};

function escapeXml(unsafe) {
  return unsafe.replace(/[<>&'"]/g, (c) => {
    switch (c) {
      case '<': return '&lt;';
      case '>': return '&gt;';
      case '&': return '&amp;';
      case "'": return '&apos;';
      case '"': return '&quot;';
      default: return c;
    }
  });
}

function normalizeSlug(slug) {
  return slug.toLowerCase().replace(/[^a-z0-9-]/g, '-').replace(/-+/g, '-').replace(/^-|-$/g, '');
}

function generateSitemapXml(pages) {
  return `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${pages
  .map(
    (page) => `  <url>
    <loc>${escapeXml(WEBSITE_URL + page.url)}</loc>
    <changefreq>${page.changefreq}</changefreq>
    <priority>${page.priority}</priority>${page.lastmod ? `\n    <lastmod>${page.lastmod}</lastmod>` : ''}
  </url>`
  )
  .join('\n')}
</urlset>`;
}

async function generateSitemap() {
  console.log('🔨 Generating sitemap...');

  // 1. Static pages
  const staticPages = [
    { url: '/', changefreq: 'weekly', priority: '1.0' },
    { url: '/blog', changefreq: 'daily', priority: '0.8' },
    { url: '/privacy', changefreq: 'yearly', priority: '0.3' },
    { url: '/terms', changefreq: 'yearly', priority: '0.3' }
  ];

  // 2. Articles from local index
  let articlePages = [];
  const indexPath = path.join(process.cwd(), 'public', 'content', 'articles-index.json');

  if (fs.existsSync(indexPath)) {
    try {
      const articles = JSON.parse(fs.readFileSync(indexPath, 'utf-8'));

      // Sort by published_at descending (newest first)
      articles.sort((a, b) => {
        const da = a.published_at || a.updated_at || '';
        const db = b.published_at || b.updated_at || '';
        return db.localeCompare(da);
      });

      articlePages = articles.map((article) => {
        const slug = normalizeSlug(article.slug);
        const pillar = PILLARS[slug];
        const dateStr = article.updated_at || article.published_at;
        return {
          url: `/blog/${slug}`,
          changefreq: pillar?.changefreq || 'monthly',
          priority: pillar?.priority || '0.7',
          lastmod: dateStr ? new Date(dateStr).toISOString().split('T')[0] : new Date().toISOString().split('T')[0]
        };
      });

      console.log(`✅ Added ${articlePages.length} articles`);
    } catch (err) {
      console.warn('⚠️  articles-index.json parse error, generating empty sitemap:', err.message);
    }
  } else {
    console.warn('⚠️  articles-index.json NOT FOUND - generating fallback sitemap');
  }

  // 3. Extensions (fallback if file missing)
  let extensionPages = [];
  try {
    const extensionsPath = path.join(process.cwd(), 'src', 'lib', 'extensionsData.json');
    if (fs.existsSync(extensionsPath)) {
      const extensionsData = JSON.parse(fs.readFileSync(extensionsPath, 'utf-8'));
      extensionPages = (extensionsData.extensions || []).map((ext) => ({
        url: `/extension/${normalizeSlug(ext.slug)}`,
        changefreq: 'monthly',
        priority: '0.6'
      }));
    }
  } catch (err) {
    console.warn('⚠️  extensions data not found, skipping...');
  }

  const allPages = [...staticPages, ...articlePages, ...extensionPages];
  const sitemapContent = generateSitemapXml(allPages);
  const outputPath = path.join(process.cwd(), 'public', 'sitemap.xml');

  // Ensure directory exists
  const outputDir = path.dirname(outputPath);
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }

  fs.writeFileSync(outputPath, sitemapContent);
  const urlCount = (sitemapContent.match(/<url>/g) || []).length;
  console.log(`✨ Sitemap generated: ${urlCount} URLs at ${outputPath}`);
}

generateSitemap().catch(err => {
  console.error('❌ Error:', err);
  process.exit(1);
});
