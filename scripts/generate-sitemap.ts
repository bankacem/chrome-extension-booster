import fs from "fs";
import path from "path";

const WEBSITE_URL = "https://extensionto.com";

interface ArticleItem {
  id: string;
  slug: string;
  lang: string;
  published_at?: string;
  date?: string;
}

function generateSitemapXml(staticUrls: string[], articlesWithAlternates: Array<{ url: string; date: string; alternatesXml: string }>): string {
  let xml = "<?xml version=\"1.0\" encoding=\"UTF-8\"?>\n";
  xml += "<urlset xmlns=\"http://www.sitemaps.org/schemas/sitemap/0.9\"\n";
  xml += "        xmlns:xhtml=\"http://www.w3.org/1999/xhtml\">\n";

  // Static URLs
  staticUrls.forEach(url => {
    xml += `  <url>\n    <loc>${url}</loc>\n    <lastmod>${new Date().toISOString().split('T')[0]}</lastmod>\n  </url>\n`;
  });

  // Article URLs with alternates
  articlesWithAlternates.forEach(item => {
    xml += `  <url>\n    <loc>${item.url}</loc>\n    <lastmod>${item.date}</lastmod>\n${item.alternatesXml}\n  </url>\n`;
  });

  xml += "</urlset>";
  return xml;
}

async function generateSitemap() {
  console.log("Generating sitemap from public/content/articles-index.json...");
  const staticUrls = [`${WEBSITE_URL}/`, `${WEBSITE_URL}/blog`, `${WEBSITE_URL}/privacy`, `${WEBSITE_URL}/terms`];
  const jsonPath = path.join(process.cwd(), "public", "content", "articles-index.json");
  
  if (!fs.existsSync(jsonPath)) {
    console.log("❌ Error: public/content/articles-index.json not found!");
    return;
  }
  
  try {
    const data = fs.readFileSync(jsonPath, "utf-8");
    const articles = JSON.parse(data) as ArticleItem[];
    const arr = Array.isArray(articles) ? articles : ((articles as any).articles || []);
    
    // Group articles by ID to discover alternate translations
    const articlesById = new Map<string, Array<{ slug: string; lang: string }>>();
    arr.forEach((art: any) => {
      const id = art.id;
      const slug = art.slug || art.id;
      const lang = art.lang || 'en';
      if (!id || !slug) return;
      if (!articlesById.has(id)) {
        articlesById.set(id, []);
      }
      articlesById.get(id)!.push({ slug, lang });
    });

    const articlesData = arr.map((art: any) => {
      let slug = art.slug || art.id;
      if (!slug) return null;
      
      const id = art.id;
      const lang = art.lang || 'en';
      slug = slug.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");

      const dateRaw = art.published_at || art.date || new Date().toISOString();
      const date = dateRaw.split('T')[0];
      const url = `${WEBSITE_URL}${lang === 'en' ? '' : `/${lang}`}/blog/${slug}`;

      // Generate localized hreflang alternates XML
      const translations = articlesById.get(id) || [];
      const alternatesXml = translations.map(t => {
        const href = `${WEBSITE_URL}${t.lang === 'en' ? '' : `/${t.lang}`}/blog/${t.slug}`;
        return `    <xhtml:link rel="alternate" hreflang="${t.lang}" href="${href}"/>`;
      }).join("\n");

      const enTrans = translations.find(t => t.lang === 'en');
      const xDefaultXml = enTrans ? `\n    <xhtml:link rel="alternate" hreflang="x-default" href="${WEBSITE_URL}/blog/${enTrans.slug}"/>` : "";

      return {
        url: url,
        date: date,
        alternatesXml: `${alternatesXml}${xDefaultXml}`
      };
    }).filter(Boolean);
    
    // Sort articles by date descending (newest first)
    articlesData.sort((a: any, b: any) => b.date.localeCompare(a.date));

    console.log(`Added ${articlesData.length} articles with international hreflang alternate links (sorted newest first)`);
    const sitemapContent = generateSitemapXml(staticUrls, articlesData);

    const outputDirs = ["public", "dist"];
    for (const dir of outputDirs) {
      const dirPath = path.join(process.cwd(), dir);
      if (!fs.existsSync(dirPath)) fs.mkdirSync(dirPath, { recursive: true });
      fs.writeFileSync(path.join(dirPath, "sitemap.xml"), sitemapContent);
      console.log(`✅ Sitemap generated written to ${dir}/sitemap.xml`);
    }
  } catch (e) {
    console.error("❌ JSON Error:", e);
  }
}

generateSitemap().catch(console.error);