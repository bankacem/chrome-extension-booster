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
    { url: `${WEBSITE_URL}/editorial-policy`, date: today },
    { url: `${WEBSITE_URL}/fr`, date: today },
    { url: `${WEBSITE_URL}/es`, date: today },
    { url: `${WEBSITE_URL}/fr/blog`, date: today },
    { url: `${WEBSITE_URL}/es/blog`, date: today },
  ];

  // --- Extension product pages (/extension/:slug) ---
  // These are static product pages (src/pages/ExtensionPage.tsx, data in
  // src/lib/extensionsData.ts), NOT articles — they were never covered by
  // this script at all, so all 9 of them were completely invisible to
  // Google despite being real, live, linked-to pages (blog articles link
  // to them regularly). Extracted via regex rather than importing the .ts
  // file directly, since this script runs under plain Node without a
  // TS/JSX loader. Uses today's date like the other static pages above —
  // there's no meaningful per-extension "content changed" date to freeze,
  // unlike articles which have a real published_at.
  const extensionsDataPath = path.join(process.cwd(), "src", "lib", "extensionsData.ts");
  const extensionEntries: SitemapEntry[] = [];
  if (fs.existsSync(extensionsDataPath)) {
    const extensionsSource = fs.readFileSync(extensionsDataPath, "utf-8");
    const slugMatches = [...extensionsSource.matchAll(/slug:\s*"([^"]+)"/g)];
    const seenExtensionSlugs = new Set<string>();
    for (const m of slugMatches) {
      const slug = m[1];
      if (seenExtensionSlugs.has(slug)) continue; // getExtensionBySlug helper also matches "slug:" text — dedupe
      seenExtensionSlugs.add(slug);
      extensionEntries.push({ url: `${WEBSITE_URL}/extension/${slug}`, date: today });
    }
    console.log(`✅ Found ${extensionEntries.length} extension product page(s) in extensionsData.ts`);
  } else {
    console.log("ℹ️  src/lib/extensionsData.ts not found — skipping extension product pages.");
  }

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

    // Skip articles whose canonicalPath points to a DIFFERENT URL.
    // These are thin/duplicate pages that intentionally defer their SEO
    // signal elsewhere — including them in the sitemap would contradict
    // their own canonical tag and send Google a mixed signal.
    if (art.canonicalPath && art.canonicalPath !== `/blog/${slug}`) {
      continue;
    }

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

  // --- Translated content (i18n) ---
  // Same frozen-date discipline as English articles, keyed as "{lang}:{slug}"
  // in sitemap-dates.json so a translation's lastmod never collides with or
  // overwrites its English original's entry.
  const SUPPORTED_LOCALES = ["fr", "es"];
  for (const lang of SUPPORTED_LOCALES) {
    const locIndexPath = path.join(process.cwd(), "public", "content", "i18n", lang, "articles-index.json");
    if (!fs.existsSync(locIndexPath)) continue;

    interface LocaleArticle { slug?: string; id?: string; published_at?: string; date?: string }
    let locArticles: LocaleArticle[] = [];
    try {
      locArticles = JSON.parse(fs.readFileSync(locIndexPath, "utf-8")) as LocaleArticle[];
    } catch (e) {
      console.error(`❌ Failed to parse i18n index for ${lang} — skipping:`, e);
      continue;
    }

    for (const art of locArticles) {
      let slug = art.slug || art.id;
      if (!slug) continue;
      slug = slug
        .toLowerCase()
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/(^-|-$)/g, "");
      if (!slug) continue;

      const dateKey = `${lang}:${slug}`;
      if (frozenDates[dateKey]) {
        articleEntries.push({ url: `${WEBSITE_URL}/${lang}/blog/${slug}`, date: frozenDates[dateKey] });
      } else {
        const rawDate = art.published_at || art.date;
        if (!rawDate) {
          console.warn(`⚠️  Skipping i18n slug with no date: ${dateKey}`);
          continue;
        }
        const lockedDate = String(rawDate).split("T")[0];
        frozenDates[dateKey] = lockedDate;
        newSlugsAdded++;
        articleEntries.push({ url: `${WEBSITE_URL}/${lang}/blog/${slug}`, date: lockedDate });
      }
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

  const allEntries = [...staticEntries, ...extensionEntries, ...articleEntries];
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
