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
}

interface PageInfo {
  url: string;
  changefreq: string;
  priority: string;
  lastmod?: string;
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
    articlePages = articles.map((article) => ({
      url: `/blog/${normalizeSlug(article.slug)}`,
      changefreq: "monthly",
      priority: "0.7",
      lastmod: article.published_at ? new Date(article.published_at).toISOString().split('T')[0] : new Date().toISOString().split('T')[0]
    }));
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

  const sitemapContent = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${allPages
  .map(
    (page) => `  <url>
    <loc>${WEBSITE_URL}${page.url}</loc>
    <changefreq>${page.changefreq}</changefreq>
    <priority>${page.priority}</priority>${page.lastmod ? `
    <lastmod>${page.lastmod}</lastmod>` : ''}
  </url>`
  )
  .join("\n")}
</urlset>`;

  const outputPath = path.join(process.cwd(), "public", "sitemap.xml");
  fs.writeFileSync(outputPath, sitemapContent);
  console.log(`Sitemap generated successfully at ${outputPath}`);
  console.log(`Total URLs: ${allPages.length}`);
}

generateSitemap();
