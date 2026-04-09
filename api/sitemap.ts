import { createClient } from "@supabase/supabase-js";
import { extensions } from "../src/lib/extensionsData.js";
import { normalizeSlug } from "../src/utils/articlePath.js";
import fs from "fs";
import path from "path";

const WEBSITE_URL = "https://extensionto.com";

// ✅ FIX: Hardcoded fallback so Vercel always has Supabase access
// even if env vars are missing in Vercel Dashboard.
// The anon key is safe to expose — it's already in the client-side bundle.
const supabaseUrl = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL || "https://svzfurufpzsrqoxlwxgx.supabase.co";

const supabaseKey = process.env.VITE_SUPABASE_PUBLISHABLE_KEY || process.env.SUPABASE_PUBLISHABLE_KEY || "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InN2emZ1cnVmcHpzcnFveGx3eGd4Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njg1MjEyNzQsImV4cCI6MjA4NDA5NzI3NH0.pGcICWref_LNLMkhMCjhjg3KCxi9xsIkTEr1piH80uQ";

const supabase = createClient(supabaseUrl, supabaseKey);

interface ArticleRecord {
  slug: string;
  published_at?: string | null;
  updated_at?: string | null;
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
      case "<": return "&lt;";
      case ">": return "&gt;";
      case "&": return "&amp;";
      case "'": return "&apos;";
      case '"': return "&quot;";
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

export default async function handler(_req: unknown, res: { setHeader: (k: string, v: string) => void; status: (s: number) => { send: (b: string) => void } }) {
  // 1. Static pages
  const staticPages: PageInfo[] = [
    { url: "/", changefreq: "weekly", priority: "1.0" },
    { url: "/blog", changefreq: "daily", priority: "0.8" },
    { url: "/privacy", changefreq: "yearly", priority: "0.3" },
    { url: "/terms", changefreq: "yearly", priority: "0.3" },
  ];

  // 2. Fetch ALL published articles from Supabase (with pagination)
  let articlePages: PageInfo[] = [];

  try {
    const pageSize = 1000;
    let from = 0;
    const allArticles: ArticleRecord[] = [];

    while (true) {
      const { data, error } = await supabase
        .from("articles")
        .select("slug, published_at, updated_at")
        // ✅ ilike is case-insensitive: matches "published", "Published", "PUBLISHED"
        .ilike("status", "published")
        .order("published_at", { ascending: false })
        .range(from, from + pageSize - 1);

      if (error) {
        console.error("Supabase error:", error);
        break;
      }

      const batch = (data ?? []) as ArticleRecord[];
      allArticles.push(...batch);

      if (batch.length < pageSize) break;
      from += pageSize;
    }

    if (allArticles.length > 0) {
      articlePages = allArticles.map((article) => {
        const dateStr = article.updated_at || article.published_at;
        return {
          url: `/blog/${normalizeSlug(article.slug)}`,
          changefreq: "monthly",
          priority: "0.7",
          lastmod: dateStr
            ? new Date(dateStr).toISOString().split("T")[0]
            : undefined,
        };
      });
      console.log(`✅ Loaded ${articlePages.length} articles from Supabase`);
    } else {
      console.warn("⚠️ Supabase returned 0 articles — using local fallback");
    }
  } catch (err) {
    console.error("Error fetching from Supabase:", err);
  }

  // Fallback to local articles-index.json only if Supabase returned nothing
  if (articlePages.length === 0) {
    const indexPath = path.join(
      process.cwd(),
      "public",
      "content",
      "articles-index.json"
    );
    if (fs.existsSync(indexPath)) {
      try {
        const articles = JSON.parse(
          fs.readFileSync(indexPath, "utf-8")
        ) as ArticleRecord[];
        articlePages = articles.map((article) => {
          const dateStr = article.updated_at || article.published_at;
          return {
            url: `/blog/${normalizeSlug(article.slug)}`,
            changefreq: "monthly",
            priority: "0.7",
            lastmod: dateStr
              ? new Date(dateStr).toISOString().split("T")[0]
              : undefined,
          };
        });
        console.log(
          `⚠️ Fallback: Loaded ${articlePages.length} articles from local index`
        );
      } catch (err) {
        console.error("Error reading local articles index:", err);
      }
    }
  }

  // 3. Extension pages
  const extensionPages: PageInfo[] = (extensions as Array<{ slug: string }>).map((ext) => ({
    url: `/extension/${normalizeSlug(ext.slug)}`,
    changefreq: "monthly",
    priority: "0.6",
  }));

  const allPages = [...staticPages, ...articlePages, ...extensionPages];
  const sitemapXml = generateSitemapXml(allPages);

  console.log(
    `Generated sitemap: ${allPages.length} URLs — ${staticPages.length} static | ${articlePages.length} articles | ${extensionPages.length} extensions`
  );

  // Short cache (5 min) so new articles appear quickly
  res.setHeader("Content-Type", "application/xml; charset=UTF-8");
  res.setHeader("Cache-Control", "public, s-maxage=300, stale-while-revalidate=60");
  res.status(200).send(sitemapXml);
}
