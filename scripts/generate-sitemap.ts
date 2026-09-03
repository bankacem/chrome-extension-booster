import fs from "fs";
import path from "path";

const WEBSITE_URL = "https://extensionto.com";

// All public locales. English is the default (x-default) language of the site.
const ALL_LANGS = ["en", "fr", "es", "pt", "ar"] as const;
type Lang = (typeof ALL_LANGS)[number];

interface Alternate {
  lang: Lang;
  url: string;
}

interface SitemapEntry {
  url: string;
  date: string;
  // When present, an hreflang annotation group (xhtml:link) is emitted for
  // this URL listing every language version of the same page — including
  // itself — plus x-default pointing at the English version when one exists.
  alternates?: Alternate[];
}

/**
 * Escapes a URL for safe inclusion in XML text/attribute values.
 * URLs here are ASCII slugs, but "&" or quotes would still break the document.
 */
function xmlEscape(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

/** Extracts the locale from a URL like https://extensionto.com/ar/blog/x — defaults to "en". */
function guessLangFromUrl(url: string): Lang {
  const m = url.match(/^https:\/\/extensionto\.com\/(fr|es|pt|ar)(\/|$)/);
  return (m ? m[1] : "en") as Lang;
}

function generateSitemapXml(entries: SitemapEntry[]): string {
  const urlBlocks = entries.map(({ url, date, alternates }) => {
    let block = `  <url>\n    <loc>${xmlEscape(url)}</loc>\n    <lastmod>${date}</lastmod>\n`;
    if (alternates && alternates.length > 0) {
      // Every hreflang group must list the page itself (self-reference),
      // not only its translations — Google requires this.
      const group = [...alternates];
      if (!group.some((a) => a.url === url)) {
        group.push({ lang: guessLangFromUrl(url), url });
      }
      // Deterministic ordering: en, fr, es, pt, ar
      group.sort((a, b) => ALL_LANGS.indexOf(a.lang) - ALL_LANGS.indexOf(b.lang));
      // x-default → English version when one exists (EN is the site default).
      const lines = group
        .map((a) => `    <xhtml:link rel="alternate" hreflang="${a.lang}" href="${xmlEscape(a.url)}"/>`);
      const englishUrl = group.find((a) => a.lang === "en")?.url;
      if (englishUrl) {
        lines.push(`    <xhtml:link rel="alternate" hreflang="x-default" href="${xmlEscape(englishUrl)}"/>`);
      }
      block += lines.join("\n") + "\n";
    }
    block += `  </url>`;
    return block;
  });

  return (
    `<?xml version="1.0" encoding="UTF-8"?>\n` +
    `<?xml-stylesheet type="text/xsl" href="/sitemap.xsl"?>\n` +
    `<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:xhtml="http://www.w3.org/1999/xhtml">\n` +
    urlBlocks.join("\n") +
    `\n</urlset>`
  );
}

function normalizeSitemapSlug(slug: string): string {
  return slug
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}

async function generateSitemap() {
  console.log("Generating sitemap from public/content/articles-index.json...");

  const today = new Date().toISOString().split("T")[0];

  // Static pages: build date is correct for these.
  // Locale homepages and localized blogs get full hreflang groups because
  // they are exact translations of "/" and "/blog" respectively.
  const localeHomeAlternates: Alternate[] = [
    { lang: "en", url: `${WEBSITE_URL}/` },
    { lang: "fr", url: `${WEBSITE_URL}/fr` },
    { lang: "es", url: `${WEBSITE_URL}/es` },
    { lang: "pt", url: `${WEBSITE_URL}/pt` },
    { lang: "ar", url: `${WEBSITE_URL}/ar` },
  ];
  const localeBlogAlternates: Alternate[] = localeHomeAlternates.map((a) => ({
    ...a,
    url: a.lang === "en" ? `${WEBSITE_URL}/blog` : a.url.replace(/\/$/, "") + "/blog",
  }));

  const staticEntries: SitemapEntry[] = [
    { url: `${WEBSITE_URL}/`, date: today, alternates: localeHomeAlternates },
    { url: `${WEBSITE_URL}/blog`, date: today, alternates: localeBlogAlternates },
    { url: `${WEBSITE_URL}/privacy`, date: today },
    { url: `${WEBSITE_URL}/terms`, date: today },
    { url: `${WEBSITE_URL}/editorial-policy`, date: today },
    { url: `${WEBSITE_URL}/fr`, date: today, alternates: localeHomeAlternates },
    { url: `${WEBSITE_URL}/es`, date: today, alternates: localeHomeAlternates },
    { url: `${WEBSITE_URL}/pt`, date: today, alternates: localeHomeAlternates },
    { url: `${WEBSITE_URL}/ar`, date: today, alternates: localeHomeAlternates },
    { url: `${WEBSITE_URL}/fr/blog`, date: today, alternates: localeBlogAlternates },
    { url: `${WEBSITE_URL}/es/blog`, date: today, alternates: localeBlogAlternates },
    { url: `${WEBSITE_URL}/pt/blog`, date: today, alternates: localeBlogAlternates },
    { url: `${WEBSITE_URL}/ar/blog`, date: today, alternates: localeBlogAlternates },
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

  // Map of every localized (fr/es/pt/ar) article index, used after the main
  // loop to attach hreflang groups to both EN articles and translations.
  const SUPPORTED_LOCALES = ["fr", "es", "pt", "ar"];
  const localeIndexes: Record<string, { slug?: string; id?: string; published_at?: string; date?: string }[]> = {};

  let newSlugsAdded = 0;
  const articleEntries: SitemapEntry[] = [];

  for (const art of arr) {
    let slug = art.slug || art.id;
    if (!slug) continue;

    // Normalize slug (defensive — index should already be clean)
    slug = normalizeSitemapSlug(slug);

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
    localeIndexes[lang] = locArticles;

    for (const art of locArticles) {
      let slug = art.slug || art.id;
      if (!slug) continue;
      slug = normalizeSitemapSlug(slug);
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

  // --- hreflang annotation groups for articles ---
  // For every English article that has at least one translation, attach the
  // full language group (EN + each locale that translated it + x-default→EN).
  // Translated-only URLs get the same treatment via i18nBySlug below.
  const enSlugsInSitemap = new Set(articleEntries.map((e) => e.url.startsWith(`${WEBSITE_URL}/blog/`) ? e.url : "").filter(Boolean));
  const groupFor = (slug: string): Alternate[] | undefined => {
    const alternates: Alternate[] = [{ lang: "en", url: `${WEBSITE_URL}/blog/${slug}` }];
    for (const lang of SUPPORTED_LOCALES as Lang[]) {
      if (localeIndexes[lang]?.some((a) => normalizeSitemapSlug(a.slug || a.id || "") === slug)) {
        alternates.push({ lang, url: `${WEBSITE_URL}/${lang}/blog/${slug}` });
      }
    }
    return alternates.length > 1 ? alternates : undefined;
  };

  let annotated = 0;
  for (const entry of articleEntries) {
    if (enSlugsInSitemap.has(entry.url)) {
      const slug = entry.url.slice(`${WEBSITE_URL}/blog/`.length);
      const alternates = groupFor(slug);
      if (alternates) {
        entry.alternates = alternates;
        annotated++;
      }
    } else {
      // Translated page: build the group from the translated slug itself.
      const m = entry.url.match(/^https:\/\/extensionto\.com\/(fr|es|pt|ar)\/blog\/(.+)$/);
      if (!m) continue;
      const [, lang, slug] = m;
      const alternates: Alternate[] = [{ lang: lang as Lang, url: entry.url }];
      // English original, if it exists in the sitemap
      if (enSlugsInSitemap.has(`${WEBSITE_URL}/blog/${slug}`)) {
        alternates.push({ lang: "en", url: `${WEBSITE_URL}/blog/${slug}` });
      }
      for (const other of SUPPORTED_LOCALES as Lang[]) {
        if (other === lang) continue;
        if (localeIndexes[other]?.some((a) => normalizeSitemapSlug(a.slug || a.id || "") === slug)) {
          alternates.push({ lang: other, url: `${WEBSITE_URL}/${other}/blog/${slug}` });
        }
      }
      // Deterministic order: en, fr, es, pt, ar
      alternates.sort((a, b) => ALL_LANGS.indexOf(a.lang) - ALL_LANGS.indexOf(b.lang));
      if (alternates.length > 1) {
        entry.alternates = alternates;
        annotated++;
      }
    }
  }
  console.log(`✅ Attached hreflang groups to ${annotated} article URL(s)`);

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

  // --- Self-check: the generated XML must be well-formed before shipping ---
  // Fail loudly (non-zero exit) so a broken sitemap can never reach prod.
  if (typeof sitemapContent !== "string" || !sitemapContent.includes("</urlset>")) {
    throw new Error("Generated sitemap.xml is malformed — aborting build.");
  }
  const urlCount = (sitemapContent.match(/<loc>/g) || []).length;
  const hreflangCount = (sitemapContent.match(/xhtml:link/g) || []).length;
  console.log(`📊 Sitemap summary: ${urlCount} URLs, ${hreflangCount} hreflang annotations`);
}

generateSitemap().catch((e) => {
  console.error("Sitemap generation failed:", e);
  process.exit(1);
});
