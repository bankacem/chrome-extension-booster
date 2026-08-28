/**
 * prerender-i18n-articles.ts
 *
 * Companion to prerender-articles.ts (which only covers English /blog pages).
 * This script generates a static HTML file for every LOCALIZED article
 * (fr, es, pt, ar) at build time — dist/<lang>/blog/<slug>/index.html — so:
 *
 *   - Googlebot crawls real, localized <title>, meta description, canonical,
 *     hreflang alternates, Open Graph (with og:locale), Twitter tags, and
 *     JSON-LD Article schema on the FIRST response, with zero JS execution.
 *     Before this script existed, every translated page was an empty SPA
 *     shell to crawlers — the single biggest international-SEO gap.
 *   - Arabic pages ship with dir="rtl" lang="ar" on <html> so the first
 *     paint (and the crawler snapshot) renders right-to-left.
 *   - The hydrated React app still takes over immediately for real visitors
 *     (createRoot() replaces #root's children on mount), so the UI/UX for
 *     humans is completely unchanged.
 *
 * This does NOT change routing, components, or live-site behavior — it only
 * adds static files next to the existing SPA build. Any failure here should
 * fail the build loudly rather than silently ship a broken dist.
 *
 * Run automatically after `vite build` via the `postbuild` npm script
 * (after prerender-articles.ts, which we depend on only for ordering —
 * both scripts read the same template independently).
 */
import fs from "fs-extra";
import path from "path";
import yaml from "js-yaml";
import { marked } from "marked";

const ROOT = process.cwd();
const DIST_DIR = path.join(ROOT, "dist");
const TEMPLATE_PATH = path.join(DIST_DIR, "index.html");

const SITE_NAME = "ExtensionTo";
const SITE_URL = "https://extensionto.com";
const DEFAULT_OG_IMAGE = `${SITE_URL}/og-image.png`;

const LOCALES = ["fr", "es", "pt", "ar"] as const;
type Locale = (typeof LOCALES)[number];
type SiteLang = "en" | Locale;

const LOCALE_BY_LANG: Record<SiteLang, string> = {
  en: "en_US",
  fr: "fr_FR",
  es: "es_ES",
  pt: "pt_BR",
  ar: "ar_SA",
};

const RTL_LANGUAGES = new Set<string>(["ar"]);

// Localized UI strings used in the prerendered article header/breadcrumb.
const UI: Record<Locale, { by: string; published: string; updated: string; home: string; blog: string; reviewed: string; editorial: string; authorAlt: string }> = {
  fr: { by: "Écrit par", published: "Publié le", updated: "Mis à jour le", home: "Accueil", blog: "Blog", reviewed: "Révisé selon la", editorial: "méthodologie éditoriale d'ExtensionTo", authorAlt: "portrait de l'auteur" },
  es: { by: "Escrito por", published: "Publicado", updated: "Actualizado", home: "Inicio", blog: "Blog", reviewed: "Revisado según la", editorial: "metodología editorial de ExtensionTo", authorAlt: "retrato del autor" },
  pt: { by: "Escrito por", published: "Publicado em", updated: "Atualizado em", home: "Início", blog: "Blog", reviewed: "Revisado segundo a", editorial: "metodologia editorial da ExtensionTo", authorAlt: "retrato do autor" },
  ar: { by: "كتبه", published: "نُشر في", updated: "حُدِّث في", home: "الرئيسية", blog: "المدونة", reviewed: "مراجَع وفق", editorial: "منهجية ExtensionTo التحريرية", authorAlt: "صورة الكاتب" },
};

interface IndexArticle {
  slug?: string;
  id?: string;
  title: string;
  seo_title?: string;
  meta_description?: string;
  excerpt?: string;
  description?: string;
  featured_image?: string;
  category?: string;
  author?: string;
  published_at?: string;
  updated_at?: string;
}

interface FaqItem { question?: unknown; answer?: unknown }

function normalizeSlug(slug: string): string {
  return slug
    .toLowerCase()
    .replace(/[^a-z0-9]/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");
}

function escapeHtml(str: string): string {
  return String(str)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function absoluteImage(src?: string): string {
  if (!src) return DEFAULT_OG_IMAGE;
  if (/^https?:\/\//i.test(src)) return src;
  return `${SITE_URL}${src.startsWith("/") ? "" : "/"}${src}`;
}

type FrontmatterRecord = Record<string, unknown>;

function parseMarkdown(raw: string): { frontmatter: FrontmatterRecord; content: string } {
  const match = raw.match(/^---([\s\S]*?)---([\s\S]*)$/);
  if (!match) return { frontmatter: {}, content: raw };
  try {
    const frontmatter = (yaml.load(match[1]) as FrontmatterRecord) || {};
    return { frontmatter, content: match[2].trim() };
  } catch (e) {
    console.warn("  ! Failed to parse frontmatter:", (e as Error).message);
    return { frontmatter: {}, content: raw };
  }
}

/**
 * Removes a leading H1 from the markdown body. The prerendered header block
 * already renders the title as <h1>; keeping the markdown's own "# …" line
 * would produce TWO H1s in the crawler-visible HTML (bad for SEO).
 */
function stripLeadingH1(content: string): string {
  return content.replace(/^\s*#\s+[^\n]*\n+/, "").trim();
}

/** Renders a table-of-contents-free markdown fragment to HTML. */
function renderMarkdown(content: string): string {
  try {
    return marked.parse(content, { async: false }) as string;
  } catch (e) {
    console.warn("  ! Failed to render markdown:", (e as Error).message);
    return "";
  }
}

function buildHead(opts: {
  title: string;
  description: string;
  canonicalUrl: string;
  ogImage: string;
  lang: SiteLang;
  alternateLanguages: { lang: SiteLang; url: string }[];
  publishedTime?: string;
  modifiedTime?: string;
  author?: string;
}): string {
  const fullTitle = `${opts.title} | ${SITE_NAME}`;
  const t = escapeHtml(fullTitle);
  const d = escapeHtml(opts.description);
  const alternates = opts.alternateLanguages
    .map(({ lang, url }) => `<link data-rh="true" rel="alternate" hrefLang="${lang}" href="${escapeHtml(url)}" />`)
    .join("\n    ");
  // x-default points at the English original when one exists; otherwise the
  // localized page itself is the best available default.
  const englishAlternate = opts.alternateLanguages.find(({ lang }) => lang === "en");
  const xDefault = englishAlternate
    ? `<link data-rh="true" rel="alternate" hrefLang="x-default" href="${escapeHtml(englishAlternate.url)}" />`
    : "";

  const ogLocale = LOCALE_BY_LANG[opts.lang];
  const ogAlternateLocales = opts.alternateLanguages
    .filter(({ lang }) => lang !== opts.lang)
    .map(({ lang }) => LOCALE_BY_LANG[lang])
    .filter(Boolean);
  const ogLocaleTags = `<meta data-rh="true" property="og:locale" content="${ogLocale}" />${
    ogAlternateLocales.length
      ? "\n    " + ogAlternateLocales.map((l) => `<meta data-rh="true" property="og:locale:alternate" content="${l}" />`).join("\n    ")
      : ""
  }`;

  return `<title data-rh="true">${t}</title>
    <meta data-rh="true" name="robots" content="index,follow,max-image-preview:large" />
    <meta data-rh="true" name="description" content="${d}" />
    <link data-rh="true" rel="canonical" href="${escapeHtml(opts.canonicalUrl)}" />
    ${alternates}
    ${xDefault}

    <meta data-rh="true" property="og:title" content="${t}" />
    <meta data-rh="true" property="og:description" content="${d}" />
    <meta data-rh="true" property="og:url" content="${escapeHtml(opts.canonicalUrl)}" />
    <meta data-rh="true" property="og:type" content="article" />
    <meta data-rh="true" property="og:image" content="${escapeHtml(opts.ogImage)}" />
    <meta data-rh="true" property="og:site_name" content="${SITE_NAME}" />
    ${ogLocaleTags}
    ${opts.publishedTime ? `<meta data-rh="true" property="article:published_time" content="${escapeHtml(opts.publishedTime)}" />` : ""}
    ${opts.modifiedTime ? `<meta data-rh="true" property="article:modified_time" content="${escapeHtml(opts.modifiedTime)}" />` : ""}
    ${opts.author ? `<meta data-rh="true" property="article:author" content="${escapeHtml(opts.author)}" />` : ""}

    <meta data-rh="true" name="twitter:card" content="summary_large_image" />
    <meta data-rh="true" name="twitter:title" content="${t}" />
    <meta data-rh="true" name="twitter:description" content="${d}" />
    <meta data-rh="true" name="twitter:image" content="${escapeHtml(opts.ogImage)}" />`;
}

function buildSchema(opts: {
  headline: string;
  description: string;
  ogImage: string;
  canonicalUrl: string;
  lang: SiteLang;
  category?: string;
  author?: string;
  publishedTime?: string;
  modifiedTime?: string;
  faq?: { question: string; answer: string }[];
}): string {
  const schema = {
    "@context": "https://schema.org",
    "@type": "Article",
    headline: opts.headline,
    description: opts.description,
    image: opts.ogImage,
    articleSection: opts.category || undefined,
    author: opts.author
      ? { "@type": "Person", name: opts.author }
      : { "@type": "Organization", name: `${SITE_NAME} Editorial Team`, url: `${SITE_URL}/editorial-policy` },
    reviewedBy: { "@type": "Organization", name: `${SITE_NAME} Editorial Team`, url: `${SITE_URL}/editorial-policy` },
    datePublished: opts.publishedTime,
    dateModified: opts.modifiedTime || opts.publishedTime,
    publisher: {
      "@type": "Organization",
      name: SITE_NAME,
      logo: { "@type": "ImageObject", url: `${SITE_URL}/og-image.png` },
    },
    inLanguage: opts.lang,
    mainEntityOfPage: { "@type": "WebPage", "@id": opts.canonicalUrl },
  };

  // This script only prerenders fr/es/pt/ar pages, so a UI string lookup
  // always succeeds; the guard merely keeps TypeScript honest.
  const ui = UI[opts.lang as Locale];
  const breadcrumb = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      { "@type": "ListItem", position: 1, name: ui.home, item: opts.lang === "en" ? SITE_URL : `${SITE_URL}/${opts.lang}` },
      { "@type": "ListItem", position: 2, name: ui.blog, item: `${SITE_URL}/${opts.lang}/blog` },
      { "@type": "ListItem", position: 3, name: opts.headline, item: opts.canonicalUrl },
    ],
  };

  const faqPage = opts.faq?.length
    ? {
        "@type": "FAQPage",
        mainEntity: opts.faq.map(({ question, answer }) => ({
          "@type": "Question",
          name: question,
          acceptedAnswer: { "@type": "Answer", text: answer },
        })),
      }
    : null;

  const richSchemas = [faqPage].filter(Boolean);
  const richSchemaGraph = richSchemas.length
    ? `\n    <script type="application/ld+json">${JSON.stringify({ "@context": "https://schema.org", "@graph": richSchemas })}</script>`
    : "";

  return `<script type="application/ld+json">${JSON.stringify(schema)}</script>
    <script type="application/ld+json">${JSON.stringify(breadcrumb)}</script>${richSchemaGraph}`;
}

async function main() {
  console.log("Prerendering LOCALIZED (fr/es/pt/ar) article pages for SEO...");

  if (!(await fs.pathExists(TEMPLATE_PATH))) {
    throw new Error(`Missing ${TEMPLATE_PATH} — run "vite build" first.`);
  }

  const template = await fs.readFile(TEMPLATE_PATH, "utf-8");

  // English index is needed to decide whether each localized article has an
  // EN original (for hreflang alternates + x-default).
  const enIndexPath = path.join(DIST_DIR, "content", "articles-index.json");
  let enSlugs = new Set<string>();
  if (await fs.pathExists(enIndexPath)) {
    const enArticles = (await fs.readJson(enIndexPath)) as { slug?: string; id?: string; canonicalPath?: string }[];
    enSlugs = new Set(
      enArticles
        .map((a) => normalizeSlug(a.slug || a.id || ""))
        .filter(Boolean)
    );
  }

  const STRIP_HEAD = [
    /<title[\s\S]*?<\/title>/i,
    /<meta\s+[^>]*name=["'](?:description|robots|keywords|author)["'][^>]*>\s*/gi,
    /<meta\s+[^>]*property=["'](?:og:[^"']+|article:[^"']+)["'][^>]*>\s*/gi,
    /<meta\s+[^>]*name=["']twitter:[^"']+["'][^>]*>\s*/gi,
    /<link\s+[^>]*rel=["']canonical["'][^>]*>\s*/gi,
    /<link\s+[^>]*rel=["']alternate["'][^>]*>\s*/gi,
    /<script\s+[^>]*type=["']application\/ld\+json["'][^>]*>[\s\S]*?<\/script>\s*/gi,
  ];

  let ok = 0;
  let skippedNoMd = 0;
  const perLocaleCounts: Record<string, number> = {};

  for (const lang of LOCALES) {
    const locIndexPath = path.join(DIST_DIR, "content", "i18n", lang, "articles-index.json");
    if (!(await fs.pathExists(locIndexPath))) {
      console.log(`ℹ️  No i18n index for ${lang} — skipping.`);
      continue;
    }
    const locArticles = (await fs.readJson(locIndexPath)) as IndexArticle[];
    const locArticlesDir = path.join(DIST_DIR, "content", "i18n", lang, "articles");
    const ui = UI[lang];
    perLocaleCounts[lang] = 0;

    for (const a of locArticles) {
      const slug = normalizeSlug(a.slug || a.id || "");
      if (!slug) continue;

      const c1 = slug[0] || "_";
      const c2 = slug[1] || "_";
      const c3 = slug[2] || "_";
      const mdPath = path.join(locArticlesDir, c1, c2, c3, `${slug}.md`);
      if (!(await fs.pathExists(mdPath))) {
        console.warn(`  ⚠️  ${lang}/${slug}: markdown missing (${path.relative(ROOT, mdPath)}) — skipped.`);
        skippedNoMd++;
        continue;
      }

      const raw = await fs.readFile(mdPath, "utf-8");
      const { frontmatter, content } = parseMarkdown(raw);

      // articles-index.json title is the source of truth (same precedence as
      // the EN prerenderer and BlogPost.tsx client path).
      const fullTitle: string = String(a.title || frontmatter.title || slug).replace(/\s+/g, " ").trim();
      const seoTitle: string = String(frontmatter.seo_title || a.seo_title || fullTitle).replace(/\s+/g, " ").trim();
      const description: string = String(
        frontmatter.meta_description || a.meta_description || frontmatter.excerpt || a.excerpt || a.description || ""
      ).replace(/\s+/g, " ").trim();
      const ogImage = absoluteImage(String(frontmatter.featured_image || a.featured_image || ""));
      const publishedTime = String(frontmatter.published_at || a.published_at || "");
      const modifiedTime = String(frontmatter.updated_at || a.updated_at || publishedTime);
      const author = String(frontmatter.author || a.author || "ExtensionTo");

      const canonicalUrl = `${SITE_URL}/${lang}/blog/${slug}`;
      const alternateLanguages: { lang: SiteLang; url: string }[] = [];
      if (enSlugs.has(slug)) {
        alternateLanguages.push({ lang: "en", url: `${SITE_URL}/blog/${slug}` });
      }
      for (const other of LOCALES) {
        if (other === lang) continue;
        const otherIndexPath = path.join(DIST_DIR, "content", "i18n", other, "articles-index.json");
        if (!(await fs.pathExists(otherIndexPath))) continue;
        const others = (await fs.readJson(otherIndexPath)) as IndexArticle[];
        if (others.some((e) => normalizeSlug(e.slug || e.id || "") === slug)) {
          alternateLanguages.push({ lang: other, url: `${SITE_URL}/${other}/blog/${slug}` });
        }
      }
      alternateLanguages.push({ lang, url: canonicalUrl });
      // Deterministic order: en, fr, es, pt, ar, then self is guaranteed present
      alternateLanguages.sort((x, y) => {
        const order: SiteLang[] = ["en", "fr", "es", "pt", "ar"];
        return order.indexOf(x.lang) - order.indexOf(y.lang);
      });

      // FAQ from frontmatter (localized content in the target language).
      const faq = Array.isArray(frontmatter.faq)
        ? (frontmatter.faq as FaqItem[])
            .filter((item): item is { question: string; answer: string } =>
              Boolean(item) && typeof item.question === "string" && typeof item.answer === "string")
        : undefined;

      const head = buildHead({
        title: seoTitle,
        description,
        canonicalUrl,
        ogImage,
        lang,
        alternateLanguages,
        publishedTime,
        modifiedTime,
        author,
      });
      const schema = buildSchema({
        headline: fullTitle,
        description,
        ogImage,
        canonicalUrl,
        lang,
        category: a.category,
        author: author === "ExtensionTo" ? undefined : author,
        publishedTime,
        modifiedTime,
        faq,
      });

      const bodyHtml = renderMarkdown(stripLeadingH1(content));

      const dateLabel = publishedTime ? publishedTime.slice(0, 10) : "";
      const updatedLabel = modifiedTime && modifiedTime !== publishedTime ? modifiedTime.slice(0, 10) : "";
      const articleHtml = `<article><header><h1>${escapeHtml(fullTitle)}</h1><p>${escapeHtml(ui.by)} <a href="/editorial-policy">${escapeHtml(author)}</a>${dateLabel ? ` · ${escapeHtml(ui.published)} ${escapeHtml(dateLabel)}` : ""}${updatedLabel ? ` · ${escapeHtml(ui.updated)} ${escapeHtml(updatedLabel)}` : ""}</p><p>${escapeHtml(ui.reviewed)} <a href="/editorial-policy">${escapeHtml(ui.editorial)}</a>.</p></header>${bodyHtml}</article>`;

      let html = template;
      for (const re of STRIP_HEAD) html = html.replace(re, "");
      html = html.replace("</head>", `  ${head}\n    ${schema.replaceAll('<script type="application/ld+json">', '<script data-rh="true" type="application/ld+json">')}\n  </head>`);
      html = html.replace('<div id="root"></div>', `<div id="root">${articleHtml}</div>`);

      // RTL + lang attribute for Arabic (crawler snapshot + first paint).
      if (RTL_LANGUAGES.has(lang)) {
        html = html.replace(/<html([^>]*)>/i, (_m, attrs: string) => {
          let next = attrs.replace(/\slang=["'][^"']*["']/gi, "").replace(/\sdir=["'][^"']*["']/gi, "");
          return `<html${next} lang="ar" dir="rtl">`;
        });
      } else {
        html = html.replace(/<html([^>]*)>/i, (_m, attrs: string) => {
          if (/\slang=["']/.test(attrs)) return `<html${attrs.replace(/\slang=["'][^"']*["']/i, ` lang="${lang}"`)}>`;
          return `<html${attrs} lang="${lang}">`;
        });
      }

      const outDir = path.join(DIST_DIR, lang, "blog", slug);
      await fs.ensureDir(outDir);
      await fs.writeFile(path.join(outDir, "index.html"), html, "utf-8");
      ok++;
      perLocaleCounts[lang]++;
    }
  }

  console.log(`✅ Prerendered ${ok} localized article pages into dist/<lang>/blog/<slug>/index.html`);
  for (const lang of LOCALES) {
    if (perLocaleCounts[lang] !== undefined) console.log(`   - ${lang}: ${perLocaleCounts[lang]} page(s)`);
  }
  if (skippedNoMd) {
    console.log(`⚠️  ${skippedNoMd} localized entr(ies) had no markdown file and were left as SPA-only.`);
  }
}

main().catch((e) => {
  console.error("i18n prerender failed:", e);
  process.exit(1);
});
