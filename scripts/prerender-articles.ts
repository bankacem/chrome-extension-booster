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

function parseMarkdown(raw: string): { frontmatter: Record<string, any>; content: string } {
  const match = raw.match(/^---([\s\S]*?)---([\s\S]*)$/);
  if (!match) return { frontmatter: {}, content: raw };
  try {
    const frontmatter = (yaml.load(match[1]) as Record<string, any>) || {};
    return { frontmatter, content: match[2].trim() };
  } catch (e) {
    console.warn("  ! Failed to parse frontmatter:", (e as Error).message);
    return { frontmatter: {}, content: raw };
  }
}

function buildHead(opts: {
  title: string;
  description: string;
  canonicalPath: string;
  ogImage: string;
  publishedTime?: string;
  author?: string;
}): string {
  const fullTitle = `${opts.title} | ${SITE_NAME}`;
  const canonicalUrl = `${SITE_URL}${opts.canonicalPath}`;
  const t = escapeHtml(fullTitle);
  const d = escapeHtml(opts.description);

  return `<title>${t}</title>
    <meta name="description" content="${d}" />
    <link rel="canonical" href="${canonicalUrl}" />

    <meta property="og:title" content="${t}" />
    <meta property="og:description" content="${d}" />
    <meta property="og:url" content="${canonicalUrl}" />
    <meta property="og:type" content="article" />
    <meta property="og:image" content="${escapeHtml(opts.ogImage)}" />
    <meta property="og:site_name" content="${SITE_NAME}" />
    ${opts.publishedTime ? `<meta property="article:published_time" content="${escapeHtml(opts.publishedTime)}" />` : ""}
    ${opts.author ? `<meta property="article:author" content="${escapeHtml(opts.author)}" />` : ""}

    <meta name="twitter:card" content="summary_large_image" />
    <meta name="twitter:title" content="${t}" />
    <meta name="twitter:description" content="${d}" />
    <meta name="twitter:image" content="${escapeHtml(opts.ogImage)}" />`;
}

function buildSchema(article: IndexArticle, title: string, description: string, ogImage: string): string {
  const schema = {
    "@context": "https://schema.org",
    "@type": "Article",
    headline: title,
    description,
    image: ogImage,
    articleSection: article.category || undefined,
    author: { "@type": "Person", name: article.author || "Admin" },
    datePublished: article.published_at,
    dateModified: article.updated_at || article.published_at,
    publisher: {
      "@type": "Organization",
      name: SITE_NAME,
      logo: { "@type": "ImageObject", url: `${SITE_URL}/og-image.png` },
    },
    mainEntityOfPage: { "@type": "WebPage", "@id": `${SITE_URL}/blog/${article.slug}` },
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

  return `<script type="application/ld+json">${JSON.stringify(schema)}</script>
    <script type="application/ld+json">${JSON.stringify(breadcrumb)}</script>`;
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
    const fullTitle: string = String(frontmatter.title || a.title || slug).replace(/\s+/g, " ").trim();
    const seoTitle: string = String(frontmatter.seo_title || fullTitle).replace(/\s+/g, " ").trim();
    const description: string = String(
      frontmatter.meta_description || a.meta_description || frontmatter.excerpt || a.excerpt || a.description || ""
    ).replace(/\s+/g, " ").trim();
    const ogImage = absoluteImage(frontmatter.featured_image || a.featured_image);
    const publishedTime = frontmatter.published_at || a.published_at;

    const head = buildHead({
      title: seoTitle,
      description,
      canonicalPath: `/blog/${slug}`,
      ogImage,
      publishedTime,
      author: frontmatter.author || a.author,
    });
    // Schema.org headline/breadcrumb reflect the real editorial title (matches the
    // on-page H1), while the <title>/OG tags above use the shortened seoTitle.
    const schema = buildSchema({ ...a, slug }, fullTitle, description, ogImage);

    let bodyHtml = "";
    try {
      bodyHtml = marked.parse(content, { async: false }) as string;
    } catch (e) {
      console.warn(`  ! Failed to render markdown for ${slug}:`, (e as Error).message);
    }

    const articleHtml = `<article><h1>${escapeHtml(fullTitle)}</h1>${bodyHtml}</article>`;

    let html = template
      .replace(/<title>[\s\S]*?<\/title>/, "")
      .replace(/<meta name="description"[^>]*>/, "")
      .replace(/<meta property="og:title"[^>]*>\s*/, "")
      .replace(/<meta property="og:description"[^>]*>\s*/, "")
      .replace(/<meta property="og:type"[^>]*>\s*/, "")
      .replace(/<meta property="og:image"[^>]*>\s*/, "")
      .replace(/<meta property="og:site_name"[^>]*>\s*/, "")
      .replace(/<meta name="twitter:card"[^>]*>\s*/, "")
      .replace(/<meta name="twitter:image"[^>]*>\s*/, "")
      .replace(/<meta name="twitter:site"[^>]*>\s*/, "");

    html = html.replace("</head>", `  ${head}\n    ${schema}\n  </head>`);
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
