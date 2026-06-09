import fs from "fs";
import path from "path";

const WEBSITE_URL = "https://extensionto.com";

function generateSitemapXml(urls: string[]): string {
  return "<?xml version=\"1.0\" encoding=\"UTF-8\"?>\n<urlset xmlns=\"http://www.sitemaps.org/schemas/sitemap/0.9\">\n" + 
    urls.map(url => `  <url>\n    <loc>${url}</loc>\n    <lastmod>${new Date().toISOString().split('T')[0]}</lastmod>\n  </url>`).join("\n") + 
    "\n</urlset>";
}

async function generateSitemap() {
  console.log("Generating sitemap from public/content/articles-index.json...");
  const staticUrls = [`${WEBSITE_URL}/`, `${WEBSITE_URL}/blog`, `${WEBSITE_URL}/privacy`, `${WEBSITE_URL}/terms`];
  const articleUrls: string[] = [];
  const jsonPath = path.join(process.cwd(), "public", "content", "articles-index.json");
  
  if (!fs.existsSync(jsonPath)) {
    console.log("❌ Error: public/content/articles-index.json not found!");
    return;
  }
  
  try {
    const data = fs.readFileSync(jsonPath, "utf-8");
    const articles = JSON.parse(data);
    const arr = Array.isArray(articles) ? articles : (articles.articles || []);
    
    const articlesData = arr.map((art: any) => {
      let slug = art.slug || art.id;
      if (!slug) return null;
      
      // Clean slug just in case, though articles-index.json should be clean
      slug = slug.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");
      const date = art.published_at || art.date || new Date().toISOString();
      return { url: `${WEBSITE_URL}/blog/${slug}`, date: date.split('T')[0] };
    }).filter(Boolean);
    
    // Sort articles by date descending (newest first)
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