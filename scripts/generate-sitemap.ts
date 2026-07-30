import fs from "fs";
import path from "path";

const WEBSITE_URL = "https://extensionto.com";

interface ArticleData {
  id: string;
  slug: string;
  lang?: string;
  published_at?: string;
  updated_at?: string;
}

function generateSitemapXml(staticUrls: string[], articles: ArticleData[]): string {
  let xml = '<?xml version="1.0" encoding="UTF-8"?>\n';
  xml += '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:xhtml="http://www.w3.org/1999/xhtml">\n';

  // Static Pages
  for (const url of staticUrls) {
    xml += '  <url>\n';
    xml += `    <loc>${url}</loc>\n`;
    xml += `    <lastmod>${new Date().toISOString().split('T')[0]}</lastmod>\n`;
    xml += '  </url>\n';
  }

  // Group articles by id to handle multilingual translations
  const groups: Record<string, ArticleData[]> = {};
  for (const art of articles) {
    const id = art.id || art.slug;
    if (!id) continue;
    if (!groups[id]) {
      groups[id] = [];
    }
    groups[id].push(art);
  }

  // Articles
  for (const id of Object.keys(groups)) {
    const group = groups[id];

    for (const art of group) {
      const lang = (art.lang || "en").toLowerCase();
      const prefix = lang === "en" ? "" : `/${lang}`;
      const url = `${WEBSITE_URL}${prefix}/blog/${art.slug}`;
      const date = (art.updated_at || art.published_at || new Date().toISOString()).split("T")[0];

      xml += '  <url>\n';
      xml += `    <loc>${url}</loc>\n`;
      xml += `    <lastmod>${date}</lastmod>\n`;

      // If there are translations, add xhtml:link alternates
      if (group.length > 1) {
        for (const alt of group) {
          const altLang = (alt.lang || "en").toLowerCase();
          const altPrefix = altLang === "en" ? "" : `/${altLang}`;
          const altUrl = `${WEBSITE_URL}${altPrefix}/blog/${alt.slug}`;
          xml += `    <xhtml:link rel="alternate" hreflang="${altLang}" href="${altUrl}" />\n`;
        }
        // Add x-default pointing to English translation (or first translation if no English)
        const englishAlt = group.find(alt => (alt.lang || "en").toLowerCase() === "en") || group[0];
        const defaultPrefix = (englishAlt.lang || "en").toLowerCase() === "en" ? "" : `/${(englishAlt.lang || "en").toLowerCase()}`;
        const defaultUrl = `${WEBSITE_URL}${defaultPrefix}/blog/${englishAlt.slug}`;
        xml += `    <xhtml:link rel="alternate" hreflang="x-default" href="${defaultUrl}" />\n`;
      }

      xml += '  </url>\n';
    }
  }

  xml += '</urlset>';
  return xml;
}

async function generateSitemap() {
  console.log("Generating sitemap from public/content/articles-index.json...");
  const staticUrls = [
    `${WEBSITE_URL}/`,
    `${WEBSITE_URL}/blog`,
    `${WEBSITE_URL}/privacy`,
    `${WEBSITE_URL}/terms`,
    `${WEBSITE_URL}/ar`,
    `${WEBSITE_URL}/ar/blog`
  ];
  
  const jsonPath = path.join(process.cwd(), "public", "content", "articles-index.json");
  if (!fs.existsSync(jsonPath)) {
    console.log("❌ Error: public/content/articles-index.json not found!");
    return;
  }
  
  try {
    const data = fs.readFileSync(jsonPath, "utf-8");
    const articles = JSON.parse(data) as ArticleData[];
    
    // Sort articles by published_at/updated_at descending
    articles.sort((a, b) => {
      const dateA = a.updated_at || a.published_at || "";
      const dateB = b.updated_at || b.published_at || "";
      return dateB.localeCompare(dateA);
    });

    const sitemapContent = generateSitemapXml(staticUrls, articles);
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