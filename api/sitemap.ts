import { extensions } from "../src/lib/extensionsData.js";
import fs from "fs";
import path from "path";

const WEBSITE_URL = "https://extensionto.com";

interface ArticleRecord {
  slug: string;
  published_at?: string | null;
  updated_at?: string | null;
  id?: string;
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

function normalizeSlug(slug: string): string {
  if (!slug) return "";
  return slug.toLowerCase()
    .replace(/[^a-z0-9]/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '');
}

function escapeXml(s: string): string {
  return s.replace(/[<>&'"]/g, (c) => ({"<":"&lt;",">":"&gt;","&":"&amp;","'":"&apos;",'"':"&quot;"}[c] ?? c));
}

function isValidDate(dateString: any): boolean {
  if (!dateString) return false;
  const d = new Date(dateString);
  return d instanceof Date && !isNaN(d.getTime());
}

function buildXml(pages: PageInfo[]): string {
  return `<?xml version="1.0" encoding="UTF-8"?>
<?xml-stylesheet type="text/xsl" href="/sitemap.xsl"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${pages.map(p => `  <url>
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
  const jsonPath = path.join(process.cwd(), "public", "content", "articles-index.json");

  try {
    if (fs.existsSync(jsonPath)) {
      const data = fs.readFileSync(jsonPath, "utf-8");
      const articles = JSON.parse(data) as ArticleRecord[];

      articlePages = articles
        .filter(a => {
          const slug = a.slug || "";
          // Filter out garbage slugs like '1111111111111111111111111111111'
          return slug && !slug.includes("1111");
        })
        .map(a => {
          const slug = normalizeSlug(a.slug);
          const pillar = PILLARS[slug];
          const date = a.updated_at || a.published_at;

          let lastmod: string | undefined;
          if (isValidDate(date)) {
            lastmod = new Date(date!).toISOString().split("T")[0];
          }

          return {
            url: `/blog/${slug}`,
            changefreq: pillar?.changefreq ?? "monthly",
            priority: pillar?.priority ?? "0.7",
            lastmod
          };
        });
    }
  } catch (error) {
    console.error("Error reading articles index:", error);
  }

  const extensionPages: PageInfo[] = (extensions as any[]).map(e => ({
    url: `/extension/${normalizeSlug(e.slug)}`,
    changefreq: "monthly",
    priority: "0.6"
  }));

  const xml = buildXml([...staticPages, ...articlePages, ...extensionPages]);

  res.setHeader("Content-Type", "application/xml; charset=UTF-8");
  res.setHeader("Cache-Control", "public, s-maxage=3600, stale-while-revalidate=600");
  res.status(200).send(xml);
}
