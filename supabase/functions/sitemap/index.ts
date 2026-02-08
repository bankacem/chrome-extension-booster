import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Content-Type": "application/xml; charset=utf-8",
};

const WEBSITE_URL = "https://extensionto.com";

// Extensions data (synchronized with src/lib/extensionsData.ts)
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

Deno.serve(async (req) => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Fetch all published articles
    const { data: articles, error } = await supabase
      .from("articles")
      .select("slug, updated_at, published_at")
      .eq("status", "published")
      .order("published_at", { ascending: false });

    if (error) {
      console.error("Error fetching articles:", error);
      throw error;
    }

    console.log(`Fetched ${articles?.length || 0} published articles`);

    // Static pages
    const staticPages = [
      { url: "/", changefreq: "weekly", priority: "1.0" },
      { url: "/blog", changefreq: "daily", priority: "0.8" },
      { url: "/privacy", changefreq: "yearly", priority: "0.3" },
      { url: "/terms", changefreq: "yearly", priority: "0.3" },
    ];

    // Article pages
    const articlePages = (articles || []).map((article) => ({
      url: `/blog/${article.slug}`,
      changefreq: "monthly",
      priority: "0.7",
      lastmod: article.updated_at 
        ? new Date(article.updated_at).toISOString().split("T")[0]
        : article.published_at 
          ? new Date(article.published_at).toISOString().split("T")[0]
          : undefined,
    }));

    // Extension pages
    const extensionPages = extensionSlugs.map((slug) => ({
      url: `/extension/${slug}`,
      changefreq: "monthly",
      priority: "0.6",
    }));

    const allPages = [...staticPages, ...articlePages, ...extensionPages];

    // Generate XML
    const sitemapXml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${allPages
  .map(
    (page) => `  <url>
    <loc>${WEBSITE_URL}${page.url}</loc>
    <changefreq>${page.changefreq}</changefreq>
    <priority>${page.priority}</priority>${
      page.lastmod
        ? `
    <lastmod>${page.lastmod}</lastmod>`
        : ""
    }
  </url>`
  )
  .join("\n")}
</urlset>`;

    console.log(`Generated sitemap with ${allPages.length} URLs (${staticPages.length} static, ${articlePages.length} articles, ${extensionPages.length} extensions)`);

    return new Response(sitemapXml, {
      status: 200,
      headers: corsHeaders,
    });
  } catch (error) {
    console.error("Sitemap generation error:", error);
    return new Response(
      `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
  <url>
    <loc>${WEBSITE_URL}/</loc>
    <changefreq>weekly</changefreq>
    <priority>1.0</priority>
  </url>
</urlset>`,
      {
        status: 200,
        headers: corsHeaders,
      }
    );
  }
});
