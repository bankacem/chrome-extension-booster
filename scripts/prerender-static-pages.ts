import fs from "fs-extra";
import path from "path";
import yaml from "js-yaml";
import { marked } from "marked";
import { getEditorialProfile } from "../src/lib/editorialProfiles";

const ROOT = process.cwd();
const DIST_DIR = path.join(ROOT, "dist");
const TEMPLATE_PATH = path.join(DIST_DIR, "index.html");
const SITE_URL = "https://extensionto.com";
const SITE_NAME = "ExtensionTo";
const DEFAULT_OG_IMAGE = `${SITE_URL}/og-image.png`;

type FAQItem = { question: string; answer: string };

type SiteLang = "en" | "fr" | "es" | "pt" | "ar";

const LOCALE_BY_LANG: Record<SiteLang, string> = {
  en: "en_US",
  fr: "fr_FR",
  es: "es_ES",
  pt: "pt_BR",
  ar: "ar_SA",
};

type ArticleIndexEntry = {
  id?: string;
  slug: string;
  title: string;
  meta_description?: string;
  description?: string;
  excerpt?: string;
  featured_image?: string;
  category?: string;
  author?: string;
  published_at?: string;
  updated_at?: string;
};

type ExtensionEntry = {
  name: string;
  description: string;
  longDescription: string;
  storeUrl: string;
  slug: string;
  category: string;
  features: string[];
};

function escapeHtml(value: unknown): string {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function normalizeSlug(value: string): string {
  return value.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");
}

function absoluteImage(src?: string): string {
  if (!src) return DEFAULT_OG_IMAGE;
  if (/^https?:\/\//i.test(src)) return src;
  return `${SITE_URL}${src.startsWith("/") ? "" : "/"}${src}`;
}

function getPartitionedPath(baseDir: string, slug: string): string {
  const normalized = normalizeSlug(slug);
  return path.join(baseDir, normalized[0] || "_", normalized[1] || "_", normalized[2] || "_", `${normalized}.md`);
}

function parseMarkdown(raw: string): { frontmatter: Record<string, unknown>; content: string } {
  const match = raw.match(/^---([\s\S]*?)---([\s\S]*)$/);
  if (!match) return { frontmatter: {}, content: raw };
  try {
    return { frontmatter: (yaml.load(match[1]) as Record<string, unknown>) || {}, content: match[2].trim() };
  } catch {
    return { frontmatter: {}, content: raw };
  }
}

function frontmatterString(frontmatter: Record<string, unknown>, key: string): string {
  const value = frontmatter[key];
  return typeof value === "string" ? value : value == null ? "" : String(value);
}

function loadTemplate(): string {
  if (!fs.existsSync(TEMPLATE_PATH)) throw new Error(`Missing ${TEMPLATE_PATH}; run vite build first.`);
  return fs.readFileSync(TEMPLATE_PATH, "utf8");
}

function replaceHead(template: string, head: string): string {
  return template
    .replace(/<title[\s\S]*?<\/title>/i, "")
    .replace(/<meta\s+[^>]*name=["'](?:description|robots|keywords|author)["'][^>]*>\s*/gi, "")
    .replace(/<meta\s+[^>]*property=["'](?:og:[^"']+|article:[^"']+)["'][^>]*>\s*/gi, "")
    .replace(/<meta\s+[^>]*name=["']twitter:[^"']+["'][^>]*>\s*/gi, "")
    .replace(/<link\s+[^>]*rel=["']canonical["'][^>]*>\s*/gi, "")
    .replace(/<link\s+[^>]*rel=["']alternate["'][^>]*>\s*/gi, "")
    .replace(/<script\s+[^>]*type=["']application\/ld\+json["'][^>]*>[\s\S]*?<\/script>\s*/gi, "")
    .replace("</head>", `${head}\n</head>`);
}

function replaceHtmlLang(html: string, lang: string): string {
  // Vite bakes <html lang="en"> into the template at build time. The React
  // SEO component would fix this at runtime via <html lang>, but crawlers
  // see the prerendered HTML before JS runs. We must replace it statically
  // for every FR/ES page, otherwise the page's declared language (in JSON-LD
  // inLanguage and in hreflang alternates) contradicts the <html lang="en">
  // attribute — a mixed signal Google flags.
  return html.replace(/<html\s+lang=["'][^"']*["']/i, `<html lang="${lang}"`);
}

function replaceRoot(template: string, body: string): string {
  return template.replace(/<div id="root">[\s\S]*?<\/div>/i, `<div id="root">${body}</div>`);
}

function buildHead(options: {
  title: string;
  description: string;
  canonicalPath: string;
  type?: "website" | "article";
  image?: string;
  noindex?: boolean;
  schema?: Record<string, unknown>;
    lang?: SiteLang;
    alternateLanguages?: { lang: SiteLang; url: string }[];
}): string {
  const lang = options.lang || "en";
  const canonical = `${SITE_URL}${options.canonicalPath}`;
  const title = `${options.title} | ${SITE_NAME}`;
  const robots = `<meta data-rh="true" name="robots" content="${options.noindex ? "noindex,follow" : "index,follow,max-image-preview:large"}" />`;
  const alternates = (options.alternateLanguages || [])
    .map(({ lang: l, url }) => `<link data-rh="true" rel="alternate" hrefLang="${l}" href="${escapeHtml(url)}" />`)
    .join("\n    ");
  const xDefault = options.alternateLanguages?.some(({ lang: l }) => l === "en")
    ? `<link data-rh="true" rel="alternate" hrefLang="x-default" href="${escapeHtml(options.alternateLanguages.find(({ lang: l }) => l === "en")?.url || canonical)}" />`
    : "";
  // og:locale tells Facebook/LinkedIn/Slack/WhatsApp which language the page
  // is in when generating a social preview. og:locale:alternate advertises
  // the other language versions that exist for this URL. Both are produced
  // by the React SEO.tsx component at runtime, but crawlers that don't run
  // JS would otherwise miss them entirely on the prerendered HTML.
  const ogLocale = LOCALE_BY_LANG[lang] || "en_US";
  const ogAlternateLocales = (options.alternateLanguages || [])
    .filter(({ lang: l }) => l !== lang)
    .map(({ lang: l }) => LOCALE_BY_LANG[l])
    .filter(Boolean);
  const ogLocaleTags = `<meta data-rh="true" property="og:locale" content="${ogLocale}" />${
    ogAlternateLocales.length
      ? "\n    " + ogAlternateLocales.map((l) => `<meta data-rh="true" property="og:locale:alternate" content="${l}" />`).join("\n    ")
      : ""
  }`;
  const schema = options.schema ? `<script data-rh="true" type="application/ld+json">${JSON.stringify(options.schema)}</script>` : "";
  return `
    <title data-rh="true">${escapeHtml(title)}</title>
    <meta data-rh="true" name="description" content="${escapeHtml(options.description)}" />
    ${robots}
    <link data-rh="true" rel="canonical" href="${escapeHtml(canonical)}" />
    ${alternates}
    ${xDefault}
    <meta data-rh="true" property="og:title" content="${escapeHtml(title)}" />
    <meta data-rh="true" property="og:description" content="${escapeHtml(options.description)}" />
    <meta data-rh="true" property="og:url" content="${escapeHtml(canonical)}" />
    <meta data-rh="true" property="og:type" content="${options.type || "website"}" />
    <meta data-rh="true" property="og:image" content="${escapeHtml(options.image || DEFAULT_OG_IMAGE)}" />
    <meta data-rh="true" property="og:site_name" content="${SITE_NAME}" />
    ${ogLocaleTags}
    <meta data-rh="true" name="twitter:card" content="summary_large_image" />
    <meta data-rh="true" name="twitter:title" content="${escapeHtml(title)}" />
    <meta data-rh="true" name="twitter:description" content="${escapeHtml(options.description)}" />
    <meta data-rh="true" name="twitter:image" content="${escapeHtml(options.image || DEFAULT_OG_IMAGE)}" />
    ${schema}`;
}

function buildHomeBody(articles: ArticleIndexEntry[]): string {
  const featuredSlugs = [
    "chrome-extensions-complete-guide",
    "best-chrome-privacy-extensions-2026-complete-guide",
    "the-elite-stack-essential-chrome-extensions-for-work-pro-environments",
  ];
  const featured = featuredSlugs
    .map((slug) => articles.find((article) => normalizeSlug(article.slug) === slug))
    .filter((article): article is ArticleIndexEntry => Boolean(article));
  const links = featured.map((article) => `<li><a href="/blog/${escapeHtml(normalizeSlug(article.slug))}">${escapeHtml(article.title)}</a><p>${escapeHtml(article.excerpt || article.meta_description || article.description || "Practical Chrome extension guide.")}</p></li>`).join("\n");
  return `<main><section><h1>Powerful Chrome Extensions for Productivity</h1><p>Discover Chrome extensions that help you work faster, browse more safely, and improve your everyday workflow.</p><p><a href="/extension/quick-screenshot-lite">Explore featured extensions</a> or <a href="/blog">read Chrome extension guides and reviews</a>.</p></section><section><h2>Start with our reviewed guides</h2><ul>${links}</ul><p><a href="/editorial-policy">Learn how our editorial team reviews extensions</a>.</p></section></main>`;
}

function buildBlogBody(articles: ArticleIndexEntry[]): string {
  // Keep the first response intentionally small. The full catalogue remains
  // available through the client-side index and sitemap.xml, while the first
  // page exposes the most recent articles and a crawlable pagination link.
  const visibleArticles = articles.slice(0, 12);
  const links = visibleArticles.map((article) => {
    const slug = normalizeSlug(article.slug);
    const description = article.excerpt || article.meta_description || article.description || "Chrome extension guide and practical tips.";
    return `<li><a href="/blog/${escapeHtml(slug)}">${escapeHtml(article.title)}</a><p>${escapeHtml(description)}</p></li>`;
  }).join("\n");
  const totalLabel = articles.length === 1 ? "article" : "articles";
  return `<main><article><h1>Chrome Extension Guides and Reviews</h1><p>Practical guides, comparisons, and reviews to help you choose and use Chrome extensions.</p><ul>${links}</ul><p>Showing the latest ${visibleArticles.length} of ${articles.length} ${totalLabel}.</p><p><a href="/blog?page=2" rel="next">Browse older guides</a> · <a href="/sitemap.xml">View the complete sitemap</a></p></article></main>`;
}

function buildExtensionBody(extension: ExtensionEntry): string {
  const features = extension.features.map((feature) => `<li>${escapeHtml(feature)}</li>`).join("\n");
  return `<main><article><h1>${escapeHtml(extension.name)} Chrome Extension</h1><p>${escapeHtml(extension.longDescription)}</p><p><strong>Category:</strong> ${escapeHtml(extension.category)}</p><h2>Key features</h2><ul>${features}</ul><p><a href="${escapeHtml(extension.storeUrl)}" rel="nofollow">View ${escapeHtml(extension.name)} in the Chrome Web Store</a></p><p><a href="/">Back to ExtensionTo</a> · <a href="/blog">Read related guides</a></p></article></main>`;
}

function buildLegalBody(title: string, summary: string, sections: string[]): string {
  const content = sections.map((section) => `<p>${escapeHtml(section)}</p>`).join("\n");
  return `<main><article><h1>${escapeHtml(title)}</h1><p>${escapeHtml(summary)}</p>${content}<p><a href="/">Back to ExtensionTo</a></p></article></main>`;
}

function buildEditorialPolicyBody(): string {
  return `<main><article><h1>Editorial Policy and Review Methodology</h1><p>ExtensionTo publishes practical, transparent guides that explain the benefits, trade-offs, limitations, and privacy considerations of Chrome extensions.</p><h2>How we review</h2><ul><li>We assess the stated use case, setup friction, core workflow, performance, and limitations.</li><li>We consider requested permissions and published privacy information when privacy is relevant.</li><li>We distinguish documented facts, observed behavior, and editorial opinion.</li><li>We review important pages when products, browser policies, or material claims change.</li></ul><h2>Who writes and reviews</h2><p>Articles are credited to James Mitchell or the ExtensionTo Editorial Team. Author labels describe editorial responsibility; readers should use the methodology and documentation to evaluate individual claims.</p><h2>Corrections</h2><p>Readers can contact ExtensionTo about inaccurate claims, outdated details, or broken links so that material corrections can be reviewed and reflected in the article when appropriate.</p><p><a href="/blog">Read the latest guides</a> · <a href="/">Back to ExtensionTo</a></p></article></main>`;
}

function parseExtensions(): ExtensionEntry[] {
  const sourcePath = path.join(ROOT, "src", "lib", "extensionsData.ts");
  const source = fs.readFileSync(sourcePath, "utf8");
  const blocks = source.match(/\{\n\s+id:[\s\S]*?\n\s+\},?/g) || [];
  return blocks.map((block) => {
    const read = (field: string) => block.match(new RegExp(`${field}:\\s*"([^"]*)"`))?.[1] || "";
    const featuresBlock = block.match(/features:\s*\[([\s\S]*?)\]/)?.[1] || "";
    const features = [...featuresBlock.matchAll(/"([^"]*)"/g)].map((match) => match[1]);
    return {
      name: read("name"),
      description: read("description"),
      longDescription: read("longDescription"),
      storeUrl: read("storeUrl"),
      slug: read("slug"),
      category: read("category"),
      features,
    };
  }).filter((entry) => entry.slug && entry.name);
}

async function writeRoute(route: string, template: string, title: string, description: string, body: string, type: "website" | "article", schema?: Record<string, unknown>, alternateLanguages?: { lang: SiteLang; url: string }[], lang: SiteLang = "en", schemas?: Record<string, unknown>[]) {
  let html = replaceRoot(replaceHead(template, buildHead({ title, description, canonicalPath: route, type, schema, alternateLanguages, lang })), body);
  // Replace <html lang="en"> for non-English routes. Vite's index.html
  // template hardcodes lang="en"; without this replacement, every FR/ES
  // page would ship with the wrong document language attribute.
  if (lang !== "en") {
    html = replaceHtmlLang(html, lang);
  }
  // Append additional JSON-LD schemas (e.g. BreadcrumbList, FAQPage) as
  // separate <script> blocks after the main schema. The single-schema
  // path above remains for backwards compatibility with existing callers.
  if (schemas && schemas.length) {
    const extraScripts = schemas.map((s) => `\n    <script data-rh="true" type="application/ld+json">${JSON.stringify(s)}</script>`).join("");
    html = html.replace("</head>", `${extraScripts}\n  </head>`);
  }
  const outputDir = path.join(DIST_DIR, route.replace(/^\//, ""));
  await fs.ensureDir(outputDir);
  await fs.writeFile(path.join(outputDir, "index.html"), html, "utf8");
}

const LOCALE_COPY: Record<Exclude<SiteLang, "en">, { homeTitle: string; blogTitle: string; blogDescription: string }> = {
  fr: { homeTitle: "Extensions Chrome puissantes pour la productivité", blogTitle: "Guides et avis sur les extensions Chrome", blogDescription: "Guides pratiques, comparatifs et avis sur les extensions Chrome." },
  es: { homeTitle: "Extensiones de Chrome potentes para la productividad", blogTitle: "Guías y reseñas de extensiones de Chrome", blogDescription: "Guías prácticas, comparativas y reseñas de extensiones de Chrome." },
  pt: { homeTitle: "Extensões poderosas do Chrome para produtividade", blogTitle: "Guias e avaliações de extensões do Chrome", blogDescription: "Guias práticos, comparações e avaliações de extensões do Chrome." },
  ar: { homeTitle: "إضافات كروم قوية لتعزيز الإنتاجية", blogTitle: "أدلة ومراجعات إضافات كروم", blogDescription: "أدلة عملية ومقارنات ومراجعات تساعدك على اختيار إضافات كروم." },
};

async function prerenderLocalizedContent(template: string, lang: string) {
  const copy = LOCALE_COPY[lang];
  if (!copy) return;
  const contentRoot = path.join(DIST_DIR, "content", "i18n", lang);
  const indexPath = path.join(contentRoot, "articles-index.json");
  if (!fs.existsSync(indexPath)) return;
  const articles = JSON.parse(fs.readFileSync(indexPath, "utf8")) as ArticleIndexEntry[];
  const localePrefix = `/${lang}`;
  const homeBody = `<main><section><h1>${escapeHtml(copy.homeTitle)}</h1><p>${escapeHtml(copy.blogDescription)}</p><p><a href="${localePrefix}/blog">${escapeHtml(copy.blogTitle)}</a></p></section></main>`;
  const homeSchema = { "@context": "https://schema.org", "@type": "WebSite", name: SITE_NAME, url: `${SITE_URL}${localePrefix}`, inLanguage: lang };
  const homeAlternates: { lang: SiteLang; url: string }[] = [
    { lang: "en", url: `${SITE_URL}/` },
    { lang: "fr", url: `${SITE_URL}/fr` },
    { lang: "es", url: `${SITE_URL}/es` },
    { lang: "pt", url: `${SITE_URL}/pt` },
    { lang: "ar", url: `${SITE_URL}/ar` },
  ];
  // Localized home pages pass `lang` so buildHead emits the correct
  // og:locale + og:locale:alternate and replace the template language.
  let homeHtml = replaceRoot(replaceHead(template, buildHead({ title: copy.homeTitle, description: copy.blogDescription, canonicalPath: localePrefix, schema: homeSchema, alternateLanguages: homeAlternates, lang: lang as Exclude<SiteLang, "en"> })), homeBody);
  homeHtml = replaceHtmlLang(homeHtml, lang);
  await fs.ensureDir(path.join(DIST_DIR, lang));
  await fs.writeFile(path.join(DIST_DIR, lang, "index.html"), homeHtml, "utf8");

  const blogLinks = articles.map((article) => `<li><a href="${localePrefix}/blog/${escapeHtml(normalizeSlug(article.slug))}">${escapeHtml(article.title)}</a><p>${escapeHtml(article.excerpt || article.meta_description || article.description || copy.blogDescription)}</p></li>`).join("\n");
  const blogBody = `<main><article><h1>${escapeHtml(copy.blogTitle)}</h1><p>${escapeHtml(copy.blogDescription)}</p><ul>${blogLinks}</ul></article></main>`;
  const blogAlternates: { lang: SiteLang; url: string }[] = [
    { lang: "en", url: `${SITE_URL}/blog` },
    { lang: "fr", url: `${SITE_URL}/fr/blog` },
    { lang: "es", url: `${SITE_URL}/es/blog` },
    { lang: "pt", url: `${SITE_URL}/pt/blog` },
    { lang: "ar", url: `${SITE_URL}/ar/blog` },
  ];
  await writeRoute(`${localePrefix}/blog`, template, copy.blogTitle, copy.blogDescription, blogBody, "website", undefined, blogAlternates, lang as Exclude<SiteLang, "en">);

  let written = 0;
  for (const article of articles) {
    const slug = normalizeSlug(article.slug);
    const markdownPath = getPartitionedPath(path.join(contentRoot, "articles"), slug);
    if (!fs.existsSync(markdownPath)) continue;
    const parsed = parseMarkdown(fs.readFileSync(markdownPath, "utf8"));
    const title = String(article.title || frontmatterString(parsed.frontmatter, "title") || slug).replace(/\s+/g, " ").trim();
    const description = String(article.meta_description || article.excerpt || article.description || frontmatterString(parsed.frontmatter, "meta_description")).replace(/\s+/g, " ").trim();
    const image = absoluteImage(article.featured_image || frontmatterString(parsed.frontmatter, "featured_image") || undefined);
    const bodyHtml = marked.parse(parsed.content, { async: false }) as string;
    // Pull editorial profile (mirrors what prerender-articles.ts does for EN) so the
    // translated page also carries a real, named author with a link to the editorial
    // policy page — instead of just "Editorial team". This closes the EEAT gap between
    // EN and FR/ES article pages.
    const editorialProfile = getEditorialProfile(String(article.author || frontmatterString(parsed.frontmatter, "author") || ""));
    const dateLabel = article.published_at ? String(article.published_at).slice(0, 10) : "";
    const updatedLabel = article.updated_at && article.updated_at !== article.published_at ? String(article.updated_at).slice(0, 10) : "";
    const body = `<article><header><h1>${escapeHtml(title)}</h1><p>Written by <a href="${escapeHtml(editorialProfile.url)}">${escapeHtml(editorialProfile.name)}</a> · ${escapeHtml(editorialProfile.role)}${dateLabel ? ` · Published ${escapeHtml(dateLabel)}` : ""}${updatedLabel ? ` · Updated ${escapeHtml(updatedLabel)}` : ""}</p><p>Reviewed using the <a href="/editorial-policy">ExtensionTo editorial methodology</a>.</p></header>${bodyHtml}</article>`;
    // Build the Article schema with reviewedBy + publisher (matching the EN prerender),
    // plus a BreadcrumbList schema and (if frontmatter.faq exists) a FAQPage schema.
    // The EN prerender (prerender-articles.ts) emits all three; the previous FR/ES
    // code emitted only a stripped-down Article schema, which meant translated pages
    // were invisible to rich-result eligibility (FAQ + Breadcrumb) and lost the
    // reviewedBy signal that helps Google's EEAT scoring.
    const articleSchema = {
      "@context": "https://schema.org",
      "@type": "Article",
      headline: title,
      description,
      image,
      articleSection: article.category || frontmatterString(parsed.frontmatter, "category") || undefined,
      inLanguage: lang,
      author: { "@type": editorialProfile.type, name: editorialProfile.name, url: `${SITE_URL}${editorialProfile.url}` },
      reviewedBy: { "@type": "Organization", name: "ExtensionTo Editorial Team", url: `${SITE_URL}/editorial-policy` },
      datePublished: article.published_at,
      dateModified: article.updated_at || article.published_at,
      publisher: { "@type": "Organization", name: SITE_NAME, logo: { "@type": "ImageObject", url: `${SITE_URL}/og-image.png` } },
      mainEntityOfPage: { "@type": "WebPage", "@id": `${SITE_URL}${localePrefix}/blog/${slug}` },
    };
    const breadcrumbSchema = {
      "@context": "https://schema.org",
      "@type": "BreadcrumbList",
      itemListElement: [
        { "@type": "ListItem", position: 1, name: "Home", item: SITE_URL },
        { "@type": "ListItem", position: 2, name: "Blog", item: `${SITE_URL}${localePrefix}/blog` },
        { "@type": "ListItem", position: 3, name: title, item: `${SITE_URL}${localePrefix}/blog/${slug}` },
      ],
    };
    const rawFaq = parsed.frontmatter.faq;
    const faqItems: FAQItem[] = Array.isArray(rawFaq)
      ? (rawFaq as FAQItem[]).filter((item) => item && typeof item.question === "string" && typeof item.answer === "string")
      : [];
    const faqSchema = faqItems.length
      ? {
          "@context": "https://schema.org",
          "@type": "FAQPage",
          mainEntity: faqItems.map(({ question, answer }) => ({
            "@type": "Question",
            name: question,
            acceptedAnswer: { "@type": "Answer", text: answer },
          })),
        }
      : null;
    const extraSchemas = [breadcrumbSchema, faqSchema].filter((s): s is Record<string, unknown> => s !== null);
    await writeRoute(`${localePrefix}/blog/${slug}`, template, title, description, body, "article", articleSchema, [
      { lang: "en", url: `${SITE_URL}/blog/${slug}` },
      { lang: lang as Exclude<SiteLang, "en">, url: `${SITE_URL}${localePrefix}/blog/${slug}` },
    ], lang as Exclude<SiteLang, "en">, extraSchemas);
    written++;
  }
  console.log(`✅ Prerendered ${written} ${lang} article pages.`);
}

async function main() {
  const template = loadTemplate();
  const articlesPath = path.join(DIST_DIR, "content", "articles-index.json");
  const articles = JSON.parse(fs.readFileSync(articlesPath, "utf8")) as ArticleIndexEntry[];
  const extensions = parseExtensions();

  const homeDescription = "Discover powerful Chrome extensions built to boost productivity, enhance security, and transform how you browse the web.";
  const homeSchema = { "@context": "https://schema.org", "@type": "WebSite", name: SITE_NAME, url: SITE_URL };
  const allLanguageHomeAlternates: { lang: SiteLang; url: string }[] = [
    { lang: "en", url: `${SITE_URL}/` },
    { lang: "fr", url: `${SITE_URL}/fr` },
    { lang: "es", url: `${SITE_URL}/es` },
    { lang: "pt", url: `${SITE_URL}/pt` },
    { lang: "ar", url: `${SITE_URL}/ar` },
  ];
  // EN home — explicitly pass lang="en" so buildHead emits og:locale=en_US plus
  // og:locale:alternate entries for fr/es. The previous buildHead did not emit
  // either tag, so social scrapers had no language hint for the prerendered HTML.
  const homeHtml = replaceRoot(replaceHead(template, buildHead({ title: "Powerful Chrome Extensions for Productivity", description: homeDescription, canonicalPath: "/", schema: homeSchema, alternateLanguages: allLanguageHomeAlternates, lang: "en" })), buildHomeBody(articles));
  await fs.writeFile(path.join(DIST_DIR, "index.html"), homeHtml, "utf8");

  const blogDescription = "Practical Chrome extension guides, comparisons, and reviews for productivity, privacy, performance, and accessibility.";
  const allLanguageBlogAlternates: { lang: SiteLang; url: string }[] = [
    { lang: "en", url: `${SITE_URL}/blog` },
    { lang: "fr", url: `${SITE_URL}/fr/blog` },
    { lang: "es", url: `${SITE_URL}/es/blog` },
    { lang: "pt", url: `${SITE_URL}/pt/blog` },
    { lang: "ar", url: `${SITE_URL}/ar/blog` },
  ];
  await writeRoute("/blog", template, "Chrome Extension Guides and Reviews", blogDescription, buildBlogBody(articles), "website", undefined, allLanguageBlogAlternates, "en");
  await writeRoute("/privacy", template, "Privacy Policy", "Learn how ExtensionTo protects your privacy and handles information on its website and Chrome extensions.", buildLegalBody("Privacy Policy", "ExtensionTo is committed to protecting your privacy.", ["Our Chrome extensions are designed to keep settings local where possible and to avoid unnecessary collection of personal information.", "The website may process information you voluntarily submit through contact forms or subscriptions. Any information is used to provide and improve the service.", "For questions about this policy, contact ExtensionTo through the website contact page."]), "website", undefined, undefined, "en");
  await writeRoute("/terms", template, "Terms of Service", "Read the Terms of Service for ExtensionTo Chrome extensions and website.", buildLegalBody("Terms of Service", "By using the ExtensionTo website or extensions, you agree to these terms.", ["The extensions are provided for their stated browsing and productivity purposes and must be used lawfully.", "The software and website are provided as is. ExtensionTo may update, suspend, or discontinue features and may update these terms.", "For questions about these terms, contact ExtensionTo through the website contact page."]), "website", undefined, undefined, "en");
  await writeRoute("/editorial-policy", template, "Editorial Policy and Review Methodology", "Learn how ExtensionTo researches, reviews, and maintains Chrome extension guides and product pages.", buildEditorialPolicyBody(), "website", undefined, undefined, "en");

  for (const extension of extensions) {
    const description = extension.longDescription || extension.description;
    const schema = {
      "@context": "https://schema.org",
      "@type": "SoftwareApplication",
      name: extension.name,
      description,
      applicationCategory: "BrowserApplication",
      operatingSystem: "Chrome",
      url: `${SITE_URL}/extension/${extension.slug}`,
      downloadUrl: extension.storeUrl,
    };
    await writeRoute(`/extension/${extension.slug}`, template, `${extension.name} Chrome Extension`, description, buildExtensionBody(extension), "website", schema, undefined, "en");
  }

  console.log(`✅ Prerendered home, blog index, and ${extensions.length} extension pages.`);
  for (const lang of ["fr", "es", "pt", "ar"] as const) {
    await prerenderLocalizedContent(template, lang);
  }
}

main().catch((error) => {
  console.error("Static prerender failed:", error);
  process.exit(1);
});
