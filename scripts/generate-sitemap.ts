import fs from "fs";
import path from "path";

const WEBSITE_URL = "https://extensionto.com";

interface SitemapEntry {
  url: string;
  date: string;
}

function generateSitemapXml(entries: SitemapEntry[]): string {
  return "<?xml version=\"1.0\" encoding=\"UTF-8\"?>\n<urlset xmlns=\"http://www.sitemaps.org/schemas/sitemap/0.9\">\n" + 
    entries.map(({ url, date }) => `  <url>\n    <loc>${url}</loc>\n    <lastmod>${date}</lastmod>\n  </url>`).join("\n") + 
    "\n</urlset>";
}

async function generateSitemap() {
  console.log("Generating sitemap from public/content/articles-index.json...");
  const today = new Date().toISOString().split('T')[0];
  const staticEntries: SitemapEntry[] = [
    { url: `${WEBSITE_URL}/`, date: today },
    { url: `${WEBSITE_URL}/blog`, date: today },
    { url: `${WEBSITE_URL}/privacy`, date: today },
    { url: `${WEBSITE_URL}/terms`, date: today },
  ];
  const articleEntries: SitemapEntry[] = [];
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
      // Use the article's own modification date so unchanged articles keep their
      // original lastmod instead of being bumped to today's date on every run.
      const date = art.updated_at || art.published_at || art.date || new Date().toISOString();
      return { url: `${WEBSITE_URL}/blog/${slug}`, date: date.split('T')[0] };
    }).filter(Boolean) as SitemapEntry[];
    
    // Sort articles by date descending (newest first)
    articlesData.sort((a: SitemapEntry, b: SitemapEntry) => b.date.localeCompare(a.date));
    articlesData.forEach((item: SitemapEntry) => articleEntries.push(item));
  } catch (e) {
    console.error("❌ JSON Error:", e);
  }
  
  const allEntries = [...staticEntries, ...articleEntries];
  console.log(`Added ${articleEntries.length} articles (sorted newest first)`);
  
  const sitemapContent = generateSitemapXml(allEntries);
  const outputDirs = ["public", "dist"];
  
  for (const dir of outputDirs) {
    const dirPath = path.join(process.cwd(), dir);
    if (!fs.existsSync(dirPath)) fs.mkdirSync(dirPath, { recursive: true });
    fs.writeFileSync(path.join(dirPath, "sitemap.xml"), sitemapContent);
    console.log(`✅ Sitemap generated written to ${dir}/sitemap.xml`);
  }
}

generateSitemap().catch(console.error);