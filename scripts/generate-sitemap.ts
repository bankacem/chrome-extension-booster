import { createClient } from "@supabase/supabase-js";
import { extensions } from "../src/lib/extensionsData";
import fs from "fs";
import path from "path";

// Force www prefix for URL consistency
const WEBSITE_URL = "https://www.extensionto.com";

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_PUBLISHABLE_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error("Missing Supabase URL or Key");
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function generateSitemap() {
  console.log("Generating sitemap...");

  // 1. Static pages
  const staticPages = [
    { url: "/", changefreq: "weekly", priority: "1.0" },
    { url: "/blog", changefreq: "daily", priority: "0.8" },
    { url: "/privacy", changefreq: "yearly", priority: "0.3" },
    { url: "/terms", changefreq: "yearly", priority: "0.3" },
  ];

  // 2. Fetch articles from Supabase
  const { data: articles, error } = await supabase
    .from("articles")
    .select("slug, published_at")
    .eq("status", "published");

  if (error) {
    console.error("Error fetching articles:", error);
    process.exit(1);
  }

  const articlePages = articles.map((article) => ({
    url: `/blog/${article.slug}`,
    changefreq: "monthly",
    priority: "0.7",
    lastmod: article.published_at ? new Date(article.published_at).toISOString().split('T')[0] : undefined
  }));

  // 3. Extensions
  const extensionPages = extensions.map((ext) => ({
    url: `/extension/${ext.slug}`,
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
