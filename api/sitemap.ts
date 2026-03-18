import { createClient } from "@supabase/supabase-js";
import { extensions } from "../src/lib/extensionsData";
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

function generateSitemapXml(pages: PageInfo[]): string {
  return `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${pages
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
}

export default async function handler(req: any, res: any) {
  // 1. Static pages
  const staticPages: PageInfo[] = [
    { url: "/", changefreq: "weekly", priority: "1.0" },
    { url: "/blog", changefreq: "daily", priority: "0.8" },
    { url: "/privacy", changefreq: "yearly", priority: "0.3" },
    { url: "/terms", changefreq: "yearly", priority: "0.3" },
  ];

  // 2. Fetch latest 500 articles from Supabase
  let articlePages: PageInfo[] = [];

  if (supabase) {
    const { data: articles, error } = await supabase
      .from("articles")
      .select("slug, published_at")
      .eq("status", "published")
      .order("published_at", { ascending: false })
      .limit(500);

    if (error) {
      console.error("Error fetching articles:", error);
    } else if (articles) {
      articlePages = (articles as ArticleRecord[]).map((article) => ({
        url: `/blog/${normalizeSlug(article.slug)}`,
        changefreq: "monthly",
        priority: "0.7",
        lastmod: article.published_at ? new Date(article.published_at).toISOString().split('T')[0] : undefined
      }));
    }
  }

  // 3. Extensions
  const extensionPages: PageInfo[] = extensions.map((ext) => ({
    url: `/extension/${normalizeSlug(ext.slug)}`,
    changefreq: "monthly",
    priority: "0.6",
  }));

  const allPages = [...staticPages, ...articlePages, ...extensionPages];
  const sitemapXml = generateSitemapXml(allPages);

  res.setHeader('Content-Type', 'application/xml');
  // Cache for 1 hour (3600s), stale-while-revalidate for 10 minutes (600s)
  res.setHeader('Cache-Control', 'public, s-maxage=3600, stale-while-revalidate=600');
  res.status(200).send(sitemapXml);
}
