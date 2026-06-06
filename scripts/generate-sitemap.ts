import fs from "fs";
import path from "path";

const WEBSITE_URL = "https://extensionto.com";

function generateSitemapXml(urls: string[]): string {
  return "<?xml version=\"1.0\" encoding=\"UTF-8\"?>\n<urlset xmlns=\"http://www.sitemaps.org/schemas/sitemap/0.9\">\n" + 
    urls.map(url => `  <url>\n    <loc>${url}</loc>\n    <lastmod>${new Date().toISOString().split('T')[0]}</lastmod>\n  </url>`).join("\n") + 
    "\n</urlset>";
}

async function generateSitemap() {
  console.log("Generating sitemap from optimized_articles.json...");
  const staticUrls = [`${WEBSITE_URL}/`, `${WEBSITE_URL}/blog`];
  const articleUrls: string[] = [];
  const jsonPath = path.join(process.cwd(), "optimized_articles.json");
  
  if (!fs.existsSync(jsonPath)) {
    console.log("❌ Error: optimized_articles.json not found!");
    return;
  }
  
  try {
    const data = fs.readFileSync(jsonPath, "utf-8");
    const articles = JSON.parse(data);
    const arr = Array.isArray(articles) ? articles : (articles.articles || []);
    
    const articlesData = arr.map((art: any) => {
      let slug = art.newSlug || art.slug || art.id;
      if (!slug) return null;
      
      slug = slug.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");
      const date = art.date || art.published_at || new Date().toISOString();
      return { url: `${WEBSITE_URL}/blog/${slug}`, date: date.split('T')[0] };
    }).filter(Boolean);
    
    articlesData.sort((a: any, b: any) => b.date.localeCompare(a.date));
    articlesData.forEach((item: any) => articleUrls.push(item.url));
  } catch (e) {
    console.error("❌ JSON Error:", e);
  }
  
  const allUrls = [...staticUrls, ...articleUrls];
  console.log(`Added ${articleUrls.length} articles (sorted newest first)`);
  
  const sitemapContent = generateSitemapXml(allUrls);
  const outputDirs = ["public", "dist"];
  
  for (const dir of outputDirs) {
    const dirPath = path.join(process.cwd(), dir);
    if (!fs.existsSync(dirPath)) fs.mkdirSync(dirPath, { recursive: true });
    fs.writeFileSync(path.join(dirPath, "sitemap.xml"), sitemapContent);
    console.log(`✅ Sitemap generated written to ${dir}/sitemap.xml`);
  }
}

generateSitemap().catch(console.error);