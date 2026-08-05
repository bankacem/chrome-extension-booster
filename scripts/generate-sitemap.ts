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

  const today = new Date().toISOString().split("T")[0];

  // Static pages: build date is correct for these
  const staticEntries: SitemapEntry[] = [
    { url: `${WEBSITE_URL}/`, date: today },
    { url: `${WEBSITE_URL}/blog`, date: today },
    { url: `${WEBSITE_URL}/privacy`, date: today },
    { url: `${WEBSITE_URL}/terms`, date: today },
  ];

  // --- sitemap-dates.json: frozen first-publish dates per slug ---
  // This file acts as a lock: once a slug's date is written here it never
  // changes unless the article content is intentionally updated.
  // New slugs are added on first build; existing slugs are NEVER overwritten.
  const datesFilePath = path.join(process.cwd(), "public", "content", "sitemap-dates.json");
  let frozenDates: Record<string, string> = {};

  if (fs.existsSync(datesFilePath)) {
    try {
      frozenDates = JSON.parse(fs.readFileSync(datesFilePath, "utf-8"));
      console.log(`✅ Loaded ${Object.keys(frozenDates).length} frozen dates from sitemap-dates.json`);
    } catch (e) {
      console.error("❌ Failed to parse sitemap-dates.json — starting fresh:", e);
      frozenDates = {};
    }
  } else {
    console.log("ℹ️  sitemap-dates.json not found — will create it.");
  }

  // Read articles index
  const jsonPath = path.join(process.cwd(), "public", "content", "articles-index.json");
  if (!fs.existsSync(jsonPath)) {
    console.log("❌ Error: public/content/articles-index.json not found!");
    return;
  }

  const data = fs.readFileSync(jsonPath, "utf-8");
  const articles = JSON.parse(data);
  const arr = Array.isArray(articles) ? articles : (articles.articles || []);

  let newSlugsAdded = 0;
  const articleEntries: SitemapEntry[] = [];

  for (const art of arr) {
    let slug = art.slug || art.id;
    if (!slug) continue;

    // Normalize slug (defensive — index should already be clean)
    slug = slug
      .toLowerCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/(^-|-$)/g, "");

    if (!slug) continue;

    if (frozenDates[slug]) {
      // Use the frozen date — never update it from articles-index
      articleEntries.push({ url: `${WEBSITE_URL}/blog/${slug}`, date: frozenDates[slug] });
    } else {
      // New slug: lock in its published_at date right now
      const rawDate = art.published_at || art.date;
      if (!rawDate) {
        // No date at all — skip adding to sitemap until it has one
        console.warn(`⚠️  Skipping slug with no date: ${slug}`);
        continue;
      }
      const lockedDate = String(rawDate).split("T")[0];
      frozenDates[slug] = lockedDate;
      newSlugsAdded++;
      articleEntries.push({ url: `${WEBSITE_URL}/blog/${slug}`, date: lockedDate });
    }
  }

  if (newSlugsAdded > 0) {
    console.log(`🆕 Locked in dates for ${newSlugsAdded} new slug(s) in sitemap-dates.json`);
    // Write updated frozen dates back — only additive, never destructive
    fs.writeFileSync(datesFilePath, JSON.stringify(frozenDates, null, 2));
    console.log(`✅ sitemap-dates.json updated (${Object.keys(frozenDates).length} total slugs)`);
  } else {
    console.log("✅ No new slugs — sitemap-dates.json unchanged");
  }

  // Sort articles newest first
  articleEntries.sort((a, b) => b.date.localeCompare(a.date));
  console.log(`Added ${articleEntries.length} articles to sitemap`);

  const allEntries = [...staticEntries, ...articleEntries];
  const sitemapContent = generateSitemapXml(allEntries);

  const outputDirs = ["public", "dist"];
  for (const dir of outputDirs) {
    const dirPath = path.join(process.cwd(), dir);
    if (!fs.existsSync(dirPath)) fs.mkdirSync(dirPath, { recursive: true });
    fs.writeFileSync(path.join(dirPath, "sitemap.xml"), sitemapContent);
    console.log(`✅ Sitemap written to ${dir}/sitemap.xml`);
  }
}

generateSitemap().catch(console.error);
