import fs from "fs";
import path from "path";
import matter from "gray-matter";

const WEBSITE_URL = "https://extensionto.com";

function generateSitemapXml(urls: string[]): string {
  return `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urls.map(url => `  <url>\n    <loc>${url}</loc>\n    <lastmod>${new Date().toISOString().split('T')[0]}</lastmod>\n  </url>`).join('\n')}
</urlset>`;
}

async function generateSitemap() {
  console.log("Generating sitemap...");

  const staticUrls = [
    `${WEBSITE_URL}/`,
    `${WEBSITE_URL}/blog`,
  ];

  const articlesDir = path.join(process.cwd(), "public", "content", "articles");
  const articleUrls: string[] = [];

  function getAllMarkdownFiles(dirPath: string): string[] {
    let files: string[] = [];
    if (!fs.existsSync(dirPath)) return files;
    
    const items = fs.readdirSync(dirPath);
    for (const item of items) {
      const fullPath = path.join(dirPath, item);
      if (fs.statSync(fullPath).isDirectory()) {
        files = [...files, ...getAllMarkdownFiles(fullPath)];
      } else if (item.endsWith(".md")) {
        files.push(fullPath);
      }
    }
    return files;
  }

  const markdownFiles = getAllMarkdownFiles(articlesDir);
  const articlesData: { url: string; date: string }[] = [];

  for (const file of markdownFiles) {
    try {
      const fileContent = fs.readFileSync(file, "utf-8");
      const { data } = matter(fileContent);
      
      let slug = data.slug;
      if (!slug) {
        slug = path.basename(file, ".md");
      }
      
      slug = slug.toLowerCase()
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/(^-|-$)/g, "");

      const date = data.date ? new Date(data.date).toISOString().split('T')[0] : new Date().toISOString().split('T')[0];
      
      articlesData.push({
        url: `${WEBSITE_URL}/blog/${slug}`,
        date: date
      });
    } catch (e) {
      // Skip broken files safely
    }
  }

  articlesData.sort((a, b) => b.date.localeCompare(a.date));
  articlesData.forEach(item => articleUrls.push(item.url));

  const allUrls = [...staticUrls, ...articleUrls];
  console.log(`Added ${articleUrls.length} articles (sorted newest first)`);

  const outputDirs = ["public", "dist"];

  // Scenario A: Standard single sitemap file (< 45000 URLs)
  if (allUrls.length < 45000) {
    const sitemapContent = generateSitemapXml(allUrls);
    
    for (const dir of outputDirs) {
      const dirPath = path.join(process.cwd(), dir);
      if (!fs.existsSync(dirPath)) fs.mkdirSync(dirPath, { recursive: true });
      fs.writeFileSync(path.join(dirPath, "sitemap.xml"), sitemapContent);
      console.log(`✅ Sitemap generated: ${allUrls.length} URLs written to ${dir}/sitemap.xml`);
    }
  } 
  // Scenario B: Large sitemap splitting (> 45000 URLs)
  else {
    const CHUNK_SIZE = 40000;
    const chunks: string[][] = [];
    for (let i = 0; i < allUrls.length; i += CHUNK_SIZE) {
      chunks.push(allUrls.slice(i, i + CHUNK_SIZE));
    }

    const sitemapFiles: string[] = [];
    
    for (const dir of outputDirs) {
      const dirPath = path.join(process.cwd(), dir);
      if (!fs.existsSync(dirPath)) fs.mkdirSync(dirPath, { recursive: true });

      chunks.forEach((chunk, index) => {
        const fileName = `sitemap-${index + 1}.xml`;
        fs.writeFileSync(path.join(dirPath, fileName), generateSitemapXml(chunk));
        if (dir === "public") sitemapFiles.push(fileName);
      });

      const indexContent = `<?xml version="1.0" encoding="UTF-8"?>
<sitemapindex xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${sitemapFiles.map(f => `  <sitemap>\n    <loc>${WEBSITE_URL}/${f}</loc>\n    <lastmod>${new Date().toISOString().split('T')[0]}</lastmod>\n  </sitemap>`).join('\n')}
</sitemapindex>`;

      fs.writeFileSync(path.join(dirPath, "sitemap.xml"), indexContent);
      console.log(`✅ Sitemap index (${chunks.length} parts) written to ${dir}/sitemap.xml`);
    }
  }
}

generateSitemap().catch(console.error);
// force deployment 
