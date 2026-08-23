/**
 * prerender-articles.ts
 *
 * Generates a static HTML file for every published article at build time
 * (dist/blog/<slug>/index.html) so that:
 *   - Googlebot and every other crawler/bot gets the correct <title>,
 *     meta description, canonical, Open Graph, Twitter, and JSON-LD tags
 *     on the very first response (no JS execution required).
 *   - Social platforms (Twitter/X, Facebook, LinkedIn, Slack, WhatsApp)
 *     show the real article preview instead of the generic homepage one.
 *   - The real, hydrated React app still takes over immediately for actual
 *     visitors (createRoot() replaces #root's children on mount), so the
 *     UI/UX for humans is completely unchanged.
 *
 * This does NOT change routing, components, or the live site's behavior
 * for users — it only adds extra static files next to the existing SPA
 * build. If anything goes wrong here, the build should fail loudly rather
 * than silently ship a broken dist.
 *
 * Run automatically after `vite build` via the `postbuild` npm script.
 */
import fs from "fs-extra";
import path from "path";
import yaml from "js-yaml";
import { marked } from "marked";
import { getEditorialProfile } from "../src/lib/editorialProfiles";

const ROOT = process.cwd();
const DIST_DIR = path.join(ROOT, "dist");
const TEMPLATE_PATH = path.join(DIST_DIR, "index.html");
const INDEX_JSON_PATH = path.join(DIST_DIR, "content", "articles-index.json");
const ARTICLES_DIR = path.join(DIST_DIR, "content", "articles");

const SITE_NAME = "ExtensionTo";
const SITE_URL = "https://extensionto.com";
const DEFAULT_OG_IMAGE = `${SITE_URL}/og-image.png`;

interface IndexArticle {
  id: string;
  slug: string;
  title: string;
  meta_description?: string;
  excerpt?: string;
  description?: string;
  featured_image?: string;
  category?: string;
  author?: string;
  published_at?: string;
  updated_at?: string;
  canonicalPath?: string;
}

function normalizeSlug(slug: string): string {
  return slug
    .toLowerCase()
    .replace(/[^a-z0-9]/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");
}

function getPartitionedPath(slug: string): string {
  const s = normalizeSlug(slug);
  const c1 = s[0] || "_";
  const c2 = s[1] || "_";
  const c3 = s[2] || "_";
  return path.join(ARTICLES_DIR, c1, c2, c3, `${s}.md`);
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

type FAQItem = { question: string; answer: string };
type HowToStep = { name: string; text: string };
type HowToData = { name: string; description?: string; total_time?: string; tool?: string; steps: HowToStep[] };

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

const LOCALE_BY_LANG: Record<string, string> = {
  en: "en_US",
  fr: "fr_FR",
  es: "es_ES",
};

function buildHead(opts: {
  title: string;
  description: string;
  canonicalPath: string;
  ogImage: string;
  publishedTime?: string;
  modifiedTime?: string;
  author?: string;
  alternateLanguages?: { lang: "en" | "fr" | "es"; url: string }[];
  noindex?: boolean;
}): string {
  const fullTitle = `${opts.title} | ${SITE_NAME}`;
  const canonicalUrl = `${SITE_URL}${opts.canonicalPath}`;
  const t = escapeHtml(fullTitle);
    const d = escapeHtml(opts.description);
  const alternates = (opts.alternateLanguages || [])
    .map(({ lang, url }) => `<link data-rh="true" rel="alternate" hrefLang="${lang}" href="${escapeHtml(url)}" />`)
    .join("\n    ");
  const xDefault = opts.alternateLanguages?.some(({ lang }) => lang === "en")
    ? `<link data-rh="true" rel="alternate" hrefLang="x-default" href="${escapeHtml(canonicalUrl)}" />`
    : "";

  // og:locale + og:locale:alternate. This script only emits English articles
  // (canonicalUrl = /blog/<slug>), so the current page language is always "en"
  // and any other languages come from alternateLanguages. The React SEO.tsx
  // component also emits these at runtime, but crawlers and social scrapers
  // that don't run JS would otherwise miss them on the prerendered HTML —
  // a real gap identified during the SEO audit.
  const ogLocale = "en_US";
  const ogAlternateLocales = (opts.alternateLanguages || [])
    .filter(({ lang }) => lang !== "en")
    .map(({ lang }) => LOCALE_BY_LANG[lang])
    .filter(Boolean);
  const ogLocaleTags = `<meta data-rh="true" property="og:locale" content="${ogLocale}" />${
    ogAlternateLocales.length
      ? "\n    " + ogAlternateLocales.map((l) => `<meta data-rh="true" property="og:locale:alternate" content="${l}" />`).join("\n    ")
      : ""
  }`;

  return `<title data-rh="true">${t}</title>
    <meta data-rh="true" name="robots" content="${opts.noindex ? "noindex,follow" : "index,follow,max-image-preview:large"}" />
    <meta data-rh="true" name="description" content="${d}" />
    <link data-rh="true" rel="canonical" href="${canonicalUrl}" />
    ${alternates}
    ${xDefault}

    <meta data-rh="true" property="og:title" content="${t}" />
    <meta data-rh="true" property="og:description" content="${d}" />
    <meta data-rh="true" property="og:url" content="${canonicalUrl}" />
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

function buildSchema(article: IndexArticle, title: string, description: string, ogImage: string, canonicalPath: string, faq?: FAQItem[], howTo?: HowToData): string {
  const schema = {
    "@context": "https://schema.org",
    "@type": "Article",
    headline: title,
    description,
    image: ogImage,
    articleSection: article.category || undefined,
    author: (() => {
      const profile = getEditorialProfile(article.author);
      return { "@type": profile.type, name: profile.name, url: `${SITE_URL}${profile.url}` };
    })(),
    reviewedBy: { "@type": "Organization", name: "ExtensionTo Editorial Team", url: `${SITE_URL}/editorial-policy` },
    datePublished: article.published_at,
    dateModified: article.updated_at || article.published_at,
    publisher: {
      "@type": "Organization",
      name: SITE_NAME,
      logo: { "@type": "ImageObject", url: `${SITE_URL}/og-image.png` },
    },
    inLanguage: "en",
    mainEntityOfPage: { "@type": "WebPage", "@id": `${SITE_URL}${canonicalPath}` },
  };

  const breadcrumb = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      { "@type": "ListItem", position: 1, name: "Home", item: SITE_URL },
      { "@type": "ListItem", position: 2, name: "Blog", item: `${SITE_URL}/blog` },
      { "@type": "ListItem", position: 3, name: title, item: `${SITE_URL}/blog/${article.slug}` },
    ],
  };

  const faqPage = faq?.length ? {
    "@type": "FAQPage",
    mainEntity: faq.map(({ question, answer }) => ({
      "@type": "Question",
      name: question,
      acceptedAnswer: { "@type": "Answer", text: answer },
    })),
  } : null;

  const howToSchema = howTo?.steps?.length ? {
    "@type": "HowTo",
    name: howTo.name,
    description: howTo.description || description,
    totalTime: howTo.total_time,
    tool: howTo.tool ? { "@type": "HowToTool", name: howTo.tool } : undefined,
    step: howTo.steps.map(({ name, text }) => ({ "@type": "HowToStep", name, text })),
  } : null;
  const richSchemas = [howToSchema, faqPage].filter(Boolean);
  const richSchemaGraph = richSchemas.length ? `\n    <script type="application/ld+json">${JSON.stringify({ "@context": "https://schema.org", "@graph": richSchemas })}</script>` : "";

  return `<script type="application/ld+json">${JSON.stringify(schema)}</script>
    <script type="application/ld+json">${JSON.stringify(breadcrumb)}</script>${richSchemaGraph}`;
}

async function main() {
  console.log("Prerendering article pages for SEO...");

  if (!(await fs.pathExists(TEMPLATE_PATH))) {
    throw new Error(`Missing ${TEMPLATE_PATH} — run "vite build" first.`);
  }
  if (!(await fs.pathExists(INDEX_JSON_PATH))) {
    throw new Error(`Missing ${INDEX_JSON_PATH} — is public/content/articles-index.json present?`);
  }

  const template = await fs.readFile(TEMPLATE_PATH, "utf-8");
  const articles: IndexArticle[] = await fs.readJson(INDEX_JSON_PATH);

  let ok = 0;
  let skipped = 0;
  const failures: string[] = [];

  for (const a of articles) {
    const slug = normalizeSlug(a.slug || a.id);
    if (!slug) { skipped++; continue; }

    const mdPath = getPartitionedPath(slug);
    let raw: string;
    try {
      raw = await fs.readFile(mdPath, "utf-8");
    } catch {
      failures.push(`${slug} (missing markdown file: ${path.relative(ROOT, mdPath)})`);
      continue;
    }

    const { frontmatter, content } = parseMarkdown(raw);
    // articles-index.json (a.title) is the source of truth; frontmatter.title
    // can carry a stale copy from initial import (see BlogPost.tsx for the
    // same precedence fix on the client-render path).
    const fullTitle: string = String(a.title || frontmatter.title || slug).replace(/\s+/g, " ").trim();
    const seoTitle: string = String(frontmatter.seo_title || fullTitle).replace(/\s+/g, " ").trim();
    const description: string = String(
      frontmatter.meta_description || a.meta_description || frontmatter.excerpt || a.excerpt || a.description || ""
    ).replace(/\s+/g, " ").trim();
    const ogImage = absoluteImage(frontmatter.featured_image || a.featured_image);
    const publishedTime = frontmatter.published_at || a.published_at;
    const modifiedTime = frontmatter.updated_at || a.updated_at || publishedTime;
    const editorialProfile = getEditorialProfile(String(frontmatter.author || a.author || ""));

    const canonicalPath = typeof a.canonicalPath === "string" && a.canonicalPath.startsWith("/blog/")
      ? a.canonicalPath
      : `/blog/${slug}`;
    const hasNonSelfCanonical = canonicalPath !== `/blog/${slug}`;
    const alternateLanguages: { lang: "en" | "fr" | "es"; url: string }[] = hasNonSelfCanonical
      ? []
      : [{ lang: "en", url: `${SITE_URL}/blog/${slug}` }];
    for (const lang of ["fr", "es"] as const) {
      const localizedIndexPath = path.join(DIST_DIR, "content", "i18n", lang, "articles-index.json");
      if (!fs.existsSync(localizedIndexPath)) continue;
      const localizedArticles = JSON.parse(await fs.readFile(localizedIndexPath, "utf-8")) as { slug?: string; id?: string }[];
      if (localizedArticles.some((entry) => normalizeSlug(entry.slug || entry.id || "") === slug)) {
        alternateLanguages.push({ lang, url: `${SITE_URL}/${lang}/blog/${slug}` });
      }
    }

    const head = buildHead({
      title: seoTitle,
      description,
      canonicalPath,
      ogImage,
      publishedTime,
      modifiedTime,
      author: editorialProfile.name,
      alternateLanguages,
      noindex: hasNonSelfCanonical,
    });
    // Schema.org headline/breadcrumb reflect the real editorial title (matches the
    // on-page H1), while the <title>/OG tags above use the shortened seoTitle.
    const faq = Array.isArray(frontmatter.faq)
      ? (frontmatter.faq as FAQItem[]).filter((item) => item && typeof item.question === "string" && typeof item.answer === "string")
      : undefined;
    const rawHowTo = frontmatter.howto as Partial<HowToData> | undefined;
    const howTo = rawHowTo && Array.isArray(rawHowTo.steps)
      ? {
          name: String(rawHowTo.name || fullTitle),
          description: rawHowTo.description ? String(rawHowTo.description) : undefined,
          total_time: rawHowTo.total_time ? String(rawHowTo.total_time) : undefined,
          tool: rawHowTo.tool ? String(rawHowTo.tool) : undefined,
          steps: rawHowTo.steps.filter((item): item is HowToStep => Boolean(item && typeof item.name === "string" && typeof item.text === "string")),
        }
      : undefined;
    const schema = buildSchema({ ...a, slug }, fullTitle, description, ogImage, canonicalPath, faq, howTo);

    let bodyHtml = "";
    try {
      bodyHtml = marked.parse(content, { async: false }) as string;
    } catch (e) {
      console.warn(`  ! Failed to render markdown for ${slug}:`, (e as Error).message);
    }

    const dateLabel = publishedTime ? new Date(publishedTime).toISOString().slice(0, 10) : "";
    const updatedLabel = modifiedTime && modifiedTime !== publishedTime ? new Date(modifiedTime).toISOString().slice(0, 10) : "";
    const articleHtml = `<article><header><h1>${escapeHtml(fullTitle)}</h1><p>Written by <a href="${escapeHtml(editorialProfile.url)}">${escapeHtml(editorialProfile.name)}</a> · ${escapeHtml(editorialProfile.role)}${dateLabel ? ` · Published ${escapeHtml(dateLabel)}` : ""}${updatedLabel ? ` · Updated ${escapeHtml(updatedLabel)}` : ""}</p><p>Reviewed using the <a href="/editorial-policy">ExtensionTo editorial methodology</a>.</p></header>${bodyHtml}</article>`;

    let html = template
      .replace(/<title[\s\S]*?<\/title>/i, "")
      .replace(/<meta\s+[^>]*name=["'](?:description|robots|keywords|author)["'][^>]*>\s*/gi, "")
      .replace(/<meta\s+[^>]*property=["'](?:og:[^"']+|article:[^"']+)["'][^>]*>\s*/gi, "")
      .replace(/<meta\s+[^>]*name=["']twitter:[^"']+["'][^>]*>\s*/gi, "")
      .replace(/<link\s+[^>]*rel=["']canonical["'][^>]*>\s*/gi, "")
      .replace(/<link\s+[^>]*rel=["']alternate["'][^>]*>\s*/gi, "")
      .replace(/<script\s+[^>]*type=["']application\/ld\+json["'][^>]*>[\s\S]*?<\/script>\s*/gi, "");

    html = html.replace("</head>", `  ${head}\n    ${schema.replaceAll('<script type="application/ld+json">', '<script data-rh="true" type="application/ld+json">')}\n  </head>`);
    html = html.replace('<div id="root"></div>', `<div id="root">${articleHtml}</div>`);

    const outDir = path.join(DIST_DIR, "blog", slug);
    await fs.ensureDir(outDir);
    await fs.writeFile(path.join(outDir, "index.html"), html, "utf-8");
    ok++;
  }

  console.log(`✅ Prerendered ${ok} article pages into dist/blog/<slug>/index.html`);
  if (skipped) console.log(`   Skipped ${skipped} entries with no usable slug.`);
  if (failures.length) {
    console.log(`⚠️  ${failures.length} article(s) had no matching markdown file and were left as SPA-only:`);
    for (const f of failures.slice(0, 20)) console.log(`   - ${f}`);
    if (failures.length > 20) console.log(`   ...and ${failures.length - 20} more`);
  }
}

main().catch((e) => {
  console.error("Prerender failed:", e);
  process.exit(1);
});
