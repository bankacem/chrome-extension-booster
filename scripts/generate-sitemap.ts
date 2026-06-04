import { extensions } from "../src/lib/extensionsData.js";
import fs from "fs";
import path from "path";
import { normalizeSlug } from "../src/utils/articlePath.js";

const WEBSITE_URL = "https://extensionto.com";

interface ArticleRecord {
  title: string;
  slug: string;
  published_at?: string;
  updated_at?: string;
}

interface PageInfo {
  url: string;
  changefreq: string;
  priority: string;
  lastmod?: string;
}

const PILLARS: Record<string, { priority: string; changefreq: string }> = {
  "how-to-fix-chrome-high-memory-usage-2026-complete-guide": { priority: "0.9", changefreq: "weekly" },
  "adblock-chrome-android-complete-guide-2026": { priority: "0.9", changefreq: "weekly" },
  "best-chrome-screenshot-extensions-2026-complete-guide": { priority: "0.9", changefreq: "weekly" },
  "best-chrome-privacy-extensions-2026-complete-guide": { priority: "0.9", changefreq: "weekly" },
  "best-youtube-downloader-chrome-extension-2026": { priority: "0.9", changefreq: "weekly" },
};

function escapeXml(unsafe: string): string {
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

async function generateSitemap() {
  console.log("Generating sitemap...");

  // 1. Static pages
  const staticPages: PageInfo[] = [
    { url: "/", changefreq: "weekly", priority: "1.0" },
    { url: "/blog", changefreq: "daily", priority: "0.8" },
    { url: "/privacy", changefreq: "yearly", priority: "0.3" },
    { url: "/terms", changefreq: "yearly", priority: "0.3" },
  ];

  // 2. Articles from local index — SORTED newest first
  let articlePages: PageInfo[] = [];
  const indexPath = path.join(process.cwd(), "public", "content", "articles-index.json");

  if (fs.existsSync(indexPath)) {
    const articles = JSON.parse(fs.readFileSync(indexPath, 'utf-8')) as ArticleRecord[];

    // ✅ Sort by published_at descending (newest first)
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
        changefreq: pillar?.changefreq || "monthly",
        priority: pillar?.priority || "0.7",
        lastmod: dateStr ? new Date(dateStr).toISOString().split('T')[0] : new Date().toISOString().split('T')[0]
      };
    });

    console.log(`Added ${articlePages.length} articles (sorted newest first, latest: ${articlePages[0]?.lastmod})`);
  } else {
    console.error("CRITICAL: articles-index.json NOT FOUND.");
    process.exit(1);
  }

  // 3. Extensions
  const extensionPages: PageInfo[] = extensions.map((ext) => ({
    url: `/extension/${normalizeSlug(ext.slug)}`,
    changefreq: "monthly",
    priority: "0.6",
  }));

  const allPages = [...staticPages, ...articlePages, ...extensionPages];
  const expectedTotal = allPages.length;
  const CHUNK_SIZE = 45000;

  if (allPages.length <= CHUNK_SIZE) {
    const sitemapContent = generateSitemapXml(allPages);

    // Write to public/ (source) and dist/ (build output served by Vercel).
    // postbuild runs AFTER vite copies public/ → dist/, so dist/ must be
    // updated explicitly or it keeps the stale sitemap from build time.
    const outputDirs = ["public", "dist"];
    for (const dir of outputDirs) {
      const dirPath = path.join(process.cwd(), dir);
      if (!fs.existsSync(dirPath)) continue;
      fs.writeFileSync(path.join(dirPath, "sitemap.xml"), sitemapContent);
      console.log(`✅ Sitemap written to ${dir}/sitemap.xml`);

      // Ensure the XSL stylesheet exists next to the sitemap.
      const xslSrc = path.join(process.cwd(), "public", "sitemap.xsl");
      const xslDst = path.join(dirPath, "sitemap.xsl");
      if (fs.existsSync(xslSrc) && !fs.existsSync(xslDst)) {
        fs.copyFileSync(xslSrc, xslDst);
        console.log(`✅ Copied sitemap.xsl to ${dir}/`);
      }
    }

    const urlCount = (sitemapContent.match(/<url>/g) || []).length;
    console.log(`✅ Sitemap generated: ${urlCount} URLs`);

    if (urlCount !== expectedTotal) {
      console.error(`CRITICAL: Mismatch! Expected ${expectedTotal}, found ${urlCount}`);
      process.exit(1);
    }
  } else {
    // Large volume — sitemap index
    const chunks: PageInfo[][] = [];
    for (let i = 0; i < allPages.length; i += CHUNK_SIZE) {
      chunks.push(allPages.slice(i, i + CHUNK_SIZE));
    }
    const sitemapFiles: string[] = [];
    chunks.forEach((chunk, index) => {
      const fileName = `sitemap-${index + 1}.xml`;
      fs.writeFileSync(path.join(process.cwd(), "public", fileName), generateSitemapXml(chunk));
      sitemapFiles.push(fileName);
    });
    const indexContent = `<?xml version="1.0" encoding="UTF-8"?>
<?xml-stylesheet type="text/xsl" href="/sitemap.xsl"?>
<sitemapindex xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${sitemapFiles.map(f => `  <sitemap>\n    <loc>${WEBSITE_URL}/${f}</loc>\n    <lastmod>${new Date().toISOString().split('T')[0]}</lastmod>\n  </sitemap>`).join('\n')}
</sitemapindex>`;
    fs.writeFileSync(path.join(process.cwd(), "public", "sitemap.xml"), indexContent);
    console.log(`Sitemap index generated with ${chunks.length} parts`);
  }
}

function generateSitemapXml(pages: PageInfo[]): string {
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

generateSitemap().catch(err => {
  console.error(err);
  process.exit(1);
});
