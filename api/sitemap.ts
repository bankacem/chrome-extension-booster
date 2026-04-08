import { createClient } from "@supabase/supabase-js";
import { extensions } from "../src/lib/extensionsData.js";
import { normalizeSlug } from "../src/utils/articlePath.js";
import fs from "fs";
import path from "path";

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

export default async function handler(req: any, res: any) {
  // 1. Static pages
  const staticPages: PageInfo[] = [
    { url: "/", changefreq: "weekly", priority: "1.0" },
    { url: "/blog", changefreq: "daily", priority: "0.8" },
    { url: "/privacy", changefreq: "yearly", priority: "0.3" },
    { url: "/terms", changefreq: "yearly", priority: "0.3" },
  ];

  // 2. Fetch articles — Supabase FIRST, local fallback second
  let articlePages: PageInfo[] = [];

  if (supabase) {
    try {
      const pageSize = 1000;
      let from = 0;
      let allArticles: ArticleRecord[] = [];

      while (true) {
        const { data, error } = await supabase
          .from("articles")
          .select("slug, published_at, updated_at")
          .ilike("status", "published")
          .order("published_at", { ascending: false })
          .range(from, from + pageSize - 1);

        if (error) {
          console.error("Supabase error:", error);
          break;
        }

        const batch = (data ?? []) as ArticleRecord[];
        allArticles = allArticles.concat(batch);

        if (batch.length < pageSize) break;
        from += pageSize;
      }

      if (allArticles.length > 0) {
        articlePages = allArticles.map((article) => ({
          url: `/blog/${normalizeSlug(article.slug)}`,
          changefreq: "monthly",
          priority: "0.7",
          lastmod: (article.updated_at || article.published_at)
            ? new Date(article.updated_at || article.published_at!).toISOString().split('T')[0]
            : undefined
        }));
        console.log(`Loaded ${articlePages.length} articles from Supabase`);
      }
    } catch (err) {
      console.error("Error fetching from Supabase:", err);
    }
  }

  // Fallback to local articles-index.json
  if (articlePages.length === 0) {
    const indexPath = path.join(process.cwd(), "public", "content", "articles-index.json");
    if (fs.existsSync(indexPath)) {
      try {
        const articles = JSON.parse(fs.readFileSync(indexPath, 'utf-8')) as ArticleRecord[];
        articlePages = articles.map((article) => {
          const dateStr = article.updated_at || article.published_at;
          return {
            url: `/blog/${normalizeSlug(article.slug)}`,
            changefreq: "monthly",
            priority: "0.7",
            lastmod: dateStr ? new Date(dateStr).toISOString().split('T')[0] : undefined
          };
        });
        console.log(`Fallback: Loaded ${articlePages.length} articles from local index`);
      } catch (err) {
        console.error("Error reading local articles index:", err);
      }
    }
  }

  // 3. Extensions
  const extensionPages: PageInfo[] = extensions.map((ext: any) => ({
    url: `/extension/${normalizeSlug(ext.slug)}`,
    changefreq: "monthly",
    priority: "0.6",
  }));

  const allPages = [...staticPages, ...articlePages, ...extensionPages];
  const sitemapXml = generateSitemapXml(allPages);

  console.log(`Generated sitemap: ${allPages.length} URLs (${staticPages.length} static, ${articlePages.length} articles, ${extensionPages.length} extensions)`);

  res.setHeader('Content-Type', 'application/xml; charset=UTF-8');
  res.setHeader('Cache-Control', 'public, s-maxage=3600, stale-while-revalidate=600');
  res.status(200).send(sitemapXml);
}
