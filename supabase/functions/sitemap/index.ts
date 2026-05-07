import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Content-Type": "application/xml; charset=utf-8",
};

const WEBSITE_URL = "https://extensionto.com";

const extensionSlugs = [
  "quick-screenshot-lite",
  "auto-dark-mode-switcher",
  "redirect-shield",
  "protab-suspender",
  "light-popup-blocker",
  "formula-builder-pro",
  "securakey-pro",
  "offline-reader-pro",
  "cookie-banner-blocker",
];

const escapeXml = (value: string) =>
  value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");

function normalizeSlug(slug: string): string {
  return slug
    .toLowerCase()
    .replace(/[^a-z0-9-]/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");
}

const buildLoc = (path: string) => escapeXml(`${WEBSITE_URL}${path}`);

type ArticleRow = {
  slug: string;
  updated_at: string | null;
  published_at: string | null;
  created_at: string | null;
};

async function fetchAllPublishedArticles(supabase: any) {
  const pageSize = 1000;
  let from = 0;
  let all: ArticleRow[] = [];

  while (true) {
    const { data, error } = await supabase
      .from("articles")
      .select("slug, updated_at, published_at, created_at")
      .ilike("status", "published")
      .order("published_at", { ascending: false, nullsFirst: false })
      .order("created_at", { ascending: false })
      .range(from, from + pageSize - 1);

    if (error) throw error;

    const batch = (data ?? []) as ArticleRow[];
    all = all.concat(batch);

    if (batch.length < pageSize) break;
    from += pageSize;
  }

  console.log(`Fetched ${all.length} published articles`);
  return all;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    const supabase = createClient(supabaseUrl, supabaseKey);

    const articles = await fetchAllPublishedArticles(supabase);

    const staticPages = [
      { url: "/", changefreq: "weekly", priority: "1.0" },
      { url: "/blog", changefreq: "daily", priority: "0.8" },
      { url: "/privacy", changefreq: "yearly", priority: "0.3" },
      { url: "/terms", changefreq: "yearly", priority: "0.3" },
    ];

    const articlePages = (articles || []).map((article) => ({
      url: `/blog/${normalizeSlug(article.slug)}`,
      changefreq: "monthly",
      priority: "0.7",
      lastmod: article.updated_at
        ? new Date(article.updated_at).toISOString().split("T")[0]
        : article.published_at
          ? new Date(article.published_at).toISOString().split("T")[0]
          : undefined,
    }));

    const extensionPages = extensionSlugs.map((slug) => ({
      url: `/extension/${slug}`,
      changefreq: "monthly",
      priority: "0.6",
    }));

    const allPages = [...staticPages, ...articlePages, ...extensionPages];

    const sitemapXml = `<?xml version="1.0" encoding="UTF-8"?>
<?xml-stylesheet type="text/xsl" href="/sitemap.xsl"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${allPages
  .map(
    (page) => `  <url>
    <loc>${buildLoc(page.url)}</loc>
    <changefreq>${page.changefreq}</changefreq>
    <priority>${page.priority}</priority>${
      page.lastmod ? `\n    <lastmod>${page.lastmod}</lastmod>` : ""
    }
  </url>`
  )
  .join("\n")}
</urlset>`;

    console.log(`Generated sitemap: ${allPages.length} URLs (${staticPages.length} static, ${articlePages.length} articles, ${extensionPages.length} extensions)`);

    return new Response(sitemapXml, { status: 200, headers: corsHeaders });
  } catch (error) {
    console.error("Sitemap generation error:", error);
    return new Response(
      `<?xml version="1.0" encoding="UTF-8"?>
<?xml-stylesheet type="text/xsl" href="/sitemap.xsl"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
  <url>
    <loc>${WEBSITE_URL}/</loc>
    <changefreq>weekly</changefreq>
    <priority>1.0</priority>
  </url>
</urlset>`,
      { status: 200, headers: corsHeaders }
    );
  }
});
