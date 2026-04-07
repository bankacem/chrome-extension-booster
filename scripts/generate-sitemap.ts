import { createClient } from "@supabase/supabase-js";
import { extensions } from "../src/lib/extensionsData";
import fs from "fs";
import path from "path";
import { normalizeSlug } from "../src/utils/articlePath";

// Use non-www version for URL consistency - matches Google indexed version
const WEBSITE_URL = "https://extensionto.com";

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_PUBLISHABLE_KEY;

const supabase = (supabaseUrl && supabaseKey) ? createClient(supabaseUrl, supabaseKey) : null;

interface ArticleRecord {
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

  // 2. Fetch articles (prefer local index data if exists)
  let articlePages: PageInfo[] = [];
  const indexPath = path.join(process.cwd(), "public", "content", "articles-index.json");

  if (fs.existsSync(indexPath)) {
    console.log("Using local articles-index.json for sitemap generation...");
    const articles = JSON.parse(fs.readFileSync(indexPath, 'utf-8')) as ArticleRecord[];
    articlePages = articles.map((article) => {
      const slug = normalizeSlug(article.slug);
      const dateStr = article.updated_at || article.published_at;

      return {
        url: `/blog/${slug}`,
        changefreq: "monthly",
        priority: "0.7",
        lastmod: dateStr ? new Date(dateStr).toISOString().split('T')[0] : new Date().toISOString().split('T')[0]
      };
    });
  } else if (supabase) {
    console.log("Fetching articles from Supabase...");
    const { data: articles, error } = await supabase
      .from("articles")
      .select("slug, published_at")
      .eq("status", "published");

    if (error) {
      console.error("Error fetching articles:", error);
      process.exit(1);
    }

    articlePages = (articles as ArticleRecord[]).map((article) => ({
      url: `/blog/${normalizeSlug(article.slug)}`,
      changefreq: "monthly",
      priority: "0.7",
      lastmod: article.published_at ? new Date(article.published_at).toISOString().split('T')[0] : undefined
    }));
  } else {
    console.warn("No articles index found and Supabase credentials missing. Skipping article pages.");
  }

  // 3. Extensions
  const extensionPages: PageInfo[] = extensions.map((ext) => ({
    url: `/extension/${normalizeSlug(ext.slug)}`,
    changefreq: "monthly",
    priority: "0.6",
  }));

  const allPages = [...staticPages, ...articlePages, ...extensionPages];

  // For SEO and scalability, if we exceed 45,000 URLs, we use a sitemap index.
  // Sitemap protocol limit is 50,000 URLs or 50MB, but 45k is a safer buffer.
  const CHUNK_SIZE = 45000;

  if (allPages.length <= CHUNK_SIZE) {
    const sitemapContent = generateSitemapXml(allPages);
    const outputPath = path.join(process.cwd(), "public", "sitemap.xml");
    fs.writeFileSync(outputPath, sitemapContent);
    console.log(`Sitemap generated successfully at ${outputPath}`);
  } else {
    console.log(`Large volume detected (${allPages.length} URLs). Generating sitemap index...`);

    const chunks: PageInfo[][] = [];
    for (let i = 0; i < allPages.length; i += CHUNK_SIZE) {
      chunks.push(allPages.slice(i, i + CHUNK_SIZE));
    }

    const sitemapFiles: string[] = [];
    chunks.forEach((chunk, index) => {
      const fileName = `sitemap-${index + 1}.xml`;
      const content = generateSitemapXml(chunk);
      const outputPath = path.join(process.cwd(), "public", fileName);
      fs.writeFileSync(outputPath, content);
      sitemapFiles.push(fileName);
      console.log(`Part sitemap generated: ${fileName}`);
    });

    const indexContent = `<?xml version="1.0" encoding="UTF-8"?>
<sitemapindex xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${sitemapFiles.map(file => `  <sitemap>
    <loc>${WEBSITE_URL}/${file}</loc>
    <lastmod>${new Date().toISOString().split('T')[0]}</lastmod>
  </sitemap>`).join('\n')}
</sitemapindex>`;

    const indexPath = path.join(process.cwd(), "public", "sitemap.xml");
    fs.writeFileSync(indexPath, indexContent);
    console.log(`Sitemap index generated at ${indexPath}`);
  }

  console.log(`Total URLs processed: ${allPages.length}`);
}

function generateSitemapXml(pages: PageInfo[]): string {
  return `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${pages
  .map(
    (page) => `  <url>
    <loc>${escapeXml(WEBSITE_URL + page.url)}</loc>
    <changefreq>${escapeXml(page.changefreq)}</changefreq>
    <priority>${escapeXml(page.priority)}</priority>${page.lastmod ? `
    <lastmod>${escapeXml(page.lastmod)}</lastmod>` : ''}
  </url>`
  )
  .join("\n")}
</urlset>`;
}

generateSitemap();
