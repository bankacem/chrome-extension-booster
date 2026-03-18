import { createClient } from "@supabase/supabase-js";
import { extensions } from "../src/lib/extensionsData.js";
import { normalizeSlug } from "../src/utils/articlePath.js";
import fs from "fs";
import path from "path";

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

  // 2. Fetch articles (prefer local index data if exists)
  let articlePages: PageInfo[] = [];
  const indexPath = path.join(process.cwd(), "public", "content", "articles-index.json");

  if (fs.existsSync(indexPath)) {
    try {
      const articles = JSON.parse(fs.readFileSync(indexPath, 'utf-8'));
      articlePages = articles.map((article: any) => {
        const slug = normalizeSlug(article.slug);
        // Use updated_at if available, otherwise published_at
        const dateStr = article.updated_at || article.published_at;

        return {
          url: `/blog/${slug}`,
          changefreq: "monthly",
          priority: "0.7",
          lastmod: dateStr ? new Date(dateStr).toISOString().split('T')[0] : undefined
        };
      });
      console.log(`Included ${articlePages.length} articles from local index.`);
    } catch (err) {
      console.error("Error reading local articles index:", err);
    }
  }

  // Fallback to Supabase if no local articles were found
  if (articlePages.length === 0 && supabase) {
    const { data: articles, error } = await supabase
      .from("articles")
      .select("slug, published_at, updated_at")
      .eq("status", "published")
      .order("published_at", { ascending: false })
      .limit(500);

    if (error) {
      console.error("Error fetching articles from Supabase:", error);
    } else if (articles) {
      articlePages = (articles as any[]).map((article) => ({
        url: `/blog/${normalizeSlug(article.slug)}`,
        changefreq: "monthly",
        priority: "0.7",
        lastmod: (article.updated_at || article.published_at)
          ? new Date(article.updated_at || article.published_at).toISOString().split('T')[0]
          : undefined
      }));
    }
  }

  // 3. Extensions
  const extensionPages: PageInfo[] = extensions.map((ext) => ({
    url: `/extension/${normalizeSlug(ext.slug)}`,
    changefreq: "monthly",
    priority: "0.6",
  }));

  // 4. Supplemental URLs (User requested to ensure indexing)
  const supplementalPages: PageInfo[] = [
    { url: "/blog/best-full-page-screenshot-chrome-4", changefreq: "monthly", priority: "0.7" },
    { url: "/blog/extension-chrome-youtube-mp3-downloader", changefreq: "monthly", priority: "0.7" },
    { url: "/blog/how-to-speed-up-chrome", changefreq: "monthly", priority: "0.7" },
    { url: "/blog/onetab-firefox-1", changefreq: "monthly", priority: "0.7" },
    { url: "/blog/protab-suspender-vs-google-memory-saver-comparison-5", changefreq: "monthly", priority: "0.7" },
    { url: "/blog/unlocking-the-power-of-chrome-extensions-on-android-a-comprehensive-guide", changefreq: "monthly", priority: "0.7" },
  ];

  const allPages = [...staticPages, ...articlePages, ...extensionPages, ...supplementalPages];
  const sitemapXml = generateSitemapXml(allPages);

  res.setHeader('Content-Type', 'application/xml');
  // Cache for 1 hour (3600s), stale-while-revalidate for 10 minutes (600s)
  res.setHeader('Cache-Control', 'public, s-maxage=3600, stale-while-revalidate=600');
  res.status(200).send(sitemapXml);
}
