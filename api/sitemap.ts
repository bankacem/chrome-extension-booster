import { createClient } from "@supabase/supabase-js";
import { extensions } from "../src/lib/extensionsData.js";
import { normalizeSlug } from "../src/utils/articlePath.js";
import fs from "fs";
import path from "path";

const WEBSITE_URL = "https://extensionto.com";

const supabaseUrl =
  process.env.VITE_SUPABASE_URL ||
  process.env.SUPABASE_URL ||
  "https://svzfurufpzsrqoxlwxgx.supabase.co";

const supabaseKey =
  process.env.VITE_SUPABASE_PUBLISHABLE_KEY ||
  process.env.SUPABASE_PUBLISHABLE_KEY ||
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InN2emZ1cnVmcHpzcnFveGx3eGd4Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njg1MjEyNzQsImV4cCI6MjA4NDA5NzI3NH0.pGcICWref_LNLMkhMCjhjg3KCxi9xsIkTEr1piH80uQ";

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

const PILLAR_SLUGS: Record<string, { priority: string; changefreq: string }> = {
  "how-to-fix-chrome-high-memory-usage-2026-complete-guide": { priority: "0.9", changefreq: "weekly" },
  "adblock-chrome-android-complete-guide-2026": { priority: "0.9", changefreq: "weekly" },
  "best-chrome-screenshot-extensions-2026-complete-guide": { priority: "0.9", changefreq: "weekly" },
  "best-chrome-privacy-extensions-2026-complete-guide": { priority: "0.9", changefreq: "weekly" },
  "best-youtube-downloader-chrome-extension-2026": { priority: "0.9", changefreq: "weekly" },
};

function escapeXml(s: string): string {
  return s.replace(/[<>&'"]/g, (c) =>
    ({ "<": "&lt;", ">": "&gt;", "&": "&amp;", "'": "&apos;", '"': "&quot;" }[c] ?? c)
  );
}

function generateSitemapXml(pages: PageInfo[]): string {
  return `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${pages.map((p) => `  <url>
    <loc>${escapeXml(WEBSITE_URL + p.url)}</loc>
    <changefreq>${p.changefreq}</changefreq>
    <priority>${p.priority}</priority>${p.lastmod ? `\n    <lastmod>${p.lastmod}</lastmod>` : ""}
  </url>`).join("\n")}
</urlset>`;
}

export default async function handler(req: any, res: any) {
  const staticPages: PageInfo[] = [
    { url: "/", changefreq: "weekly", priority: "1.0" },
    { url: "/blog", changefreq: "daily", priority: "0.8" },
    { url: "/privacy", changefreq: "yearly", priority: "0.3" },
    { url: "/terms", changefreq: "yearly", priority: "0.3" },
  ];

  let articlePages: PageInfo[] = [];

  try {
    const pageSize = 1000;
    let from = 0;
    const allArticles: ArticleRecord[] = [];
    while (true) {
      const { data, error } = await supabase
        .from("articles")
        .select("slug, published_at, updated_at")
        .ilike("status", "published")
        .order("published_at", { ascending: false })
        .range(from, from + pageSize - 1);
      if (error) { console.error("Supabase error:", error); break; }
      const batch = (data ?? []) as ArticleRecord[];
      allArticles.push(...batch);
      if (batch.length < pageSize) break;
      from += pageSize;
    }
    if (allArticles.length > 0) {
      articlePages = allArticles.map((a) => {
        const slug = normalizeSlug(a.slug);
        const pillar = PILLAR_SLUGS[slug];
        const dateStr = a.updated_at || a.published_at;
        return {
          url: `/blog/${slug}`,
          changefreq: pillar ? pillar.changefreq : "monthly",
          priority: pillar ? pillar.priority : "0.7",
          lastmod: dateStr ? new Date(dateStr).toISOString().split("T")[0] : undefined,
        };
      });
      console.log(`Loaded ${articlePages.length} articles from Supabase`);
    }
  } catch (err) {
    console.error("Supabase fetch error:", err);
  }

  if (articlePages.length === 0) {
    const indexPath = path.join(process.cwd(), "public", "content", "articles-index.json");
    if (fs.existsSync(indexPath)) {
      const articles = JSON.parse(fs.readFileSync(indexPath, "utf-8")) as ArticleRecord[];
      articlePages = articles.map((a) => {
        const slug = normalizeSlug(a.slug);
        const pillar = PILLAR_SLUGS[slug];
        const dateStr = a.updated_at || a.published_at;
        return {
          url: `/blog/${slug}`,
          changefreq: pillar ? pillar.changefreq : "monthly",
          priority: pillar ? pillar.priority : "0.7",
          lastmod: dateStr ? new Date(dateStr).toISOString().split("T")[0] : undefined,
        };
      });
      console.log(`Fallback: ${articlePages.length} articles from local index`);
    }
  }

  const extensionPages: PageInfo[] = (extensions as Array<{ slug: string }>).map((e) => ({
    url: `/extension/${normalizeSlug(e.slug)}`,
    changefreq: "monthly",
    priority: "0.6",
  }));

  const allPages = [...staticPages, ...articlePages, ...extensionPages];
  const xml = generateSitemapXml(allPages);
  console.log(`Sitemap: ${allPages.length} URLs (${articlePages.length} articles)`);
  res.setHeader("Content-Type", "application/xml; charset=UTF-8");
  res.setHeader("Cache-Control", "public, s-maxage=300, stale-while-revalidate=60");
  res.status(200).send(xml);
}
