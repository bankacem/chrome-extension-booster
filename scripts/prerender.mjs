import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import yaml from "js-yaml";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, "..");
const DIST = path.join(ROOT, "dist");
const INDEX_JSON = path.join(ROOT, "public/content/articles-index.json");
const CONTENT_DIR = path.join(ROOT, "public/content/articles");
const WEBSITE_URL = "https://extensionto.com";

function readJson(p) {
  return JSON.parse(fs.readFileSync(p, "utf8"));
}

function escapeHtml(str) {
  return String(str ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function normalizeSlug(slug) {
  return String(slug || "")
    .toLowerCase()
    .replace(/[^a-z0-9]/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");
}

function getPartitionedPath(slug) {
  const s = normalizeSlug(slug);
  return path.join(CONTENT_DIR, s[0] || "_", s[1] || "_", s[2] || "_", `${s}.md`);
}

function parseMarkdown(text) {
  const match = text.match(/^---\n([\s\S]*?)\n---\n?([\s\S]*)$/);
  if (!match) return { frontmatter: {}, content: text };
  try {
    const frontmatter = yaml.load(match[1]) || {};
    return { frontmatter, content: match[2].trim() };
  } catch (e) {
    console.error("Error parsing frontmatter:", e);
    return { frontmatter: {}, content: text };
  }
}

function buildHead({ title, description, canonicalPath, image, type = "website", jsonLd }) {
  const canonical = `${WEBSITE_URL}${canonicalPath}`;
  const ogImage = image && image.startsWith("http")
    ? image
    : `${WEBSITE_URL}/og-image.png`;
  return `
    <title>${escapeHtml(title)}</title>
    <meta name="description" content="${escapeHtml(description)}" />
    <meta name="robots" content="index, follow" />
    <link rel="canonical" href="${canonical}" />
    <meta property="og:title" content="${escapeHtml(title)}" />
    <meta property="og:description" content="${escapeHtml(description)}" />
    <meta property="og:type" content="${type}" />
    <meta property="og:url" content="${canonical}" />
    <meta property="og:image" content="${ogImage}" />
    <meta property="og:site_name" content="ExtensionTo" />
    <meta name="twitter:card" content="summary_large_image" />
    <meta name="twitter:title" content="${escapeHtml(title)}" />
    <meta name="twitter:description" content="${escapeHtml(description)}" />
    <meta name="twitter:image" content="${ogImage}" />
    ${jsonLd ? `\n    <script type="application/ld+json">${jsonLd}</script>` : ""}
  `;
}

function resolveAssetTags(template) {
  const scripts = [];
  const links = [];
  const reScript = /<script[^>]*src="([^"]+)"[^>]*><\/script>/g;
  const reLink = /<link[^>]*href="([^"]+\.(?:css|js))"[^>]*>/g;
  let m;
  while ((m = reScript.exec(template))) scripts.push(m[0]);
  while ((m = reLink.exec(template))) links.push(m[0]);
  return { scripts, links };
}

function articleJsonLd(a) {
  return JSON.stringify({
    "@context": "https://schema.org",
    "@type": "Article",
    headline: a.title,
    description: a.meta_description || a.excerpt || a.description || "",
    image: a.featured_image || a.image_url || undefined,
    datePublished: a.published_at || undefined,
    dateModified: a.updated_at || a.published_at || undefined,
    author: { "@type": "Organization", name: "ExtensionTo" },
    publisher: {
      "@type": "Organization",
      name: "ExtensionTo",
      logo: { "@type": "ImageObject", url: `${WEBSITE_URL}/favicon.png` },
    },
    mainEntityOfPage: `${WEBSITE_URL}/blog/${normalizeSlug(a.slug)}`,
  });
}

function renderArticlePage(article, content, { scripts, links }) {
  const slug = normalizeSlug(article.slug);
  const title = article.title;
  const description = article.meta_description || article.excerpt || article.description || "";
  const head = buildHead({
    title,
    description,
    canonicalPath: `/blog/${slug}`,
    image: article.featured_image || article.image_url,
    type: "article",
    jsonLd: articleJsonLd(article),
  });

  return `<!doctype html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
${head}
    <link rel="icon" type="image/png" href="/favicon.png" />
    ${links.join("\n    ")}
  </head>
  <body>
    <div id="root">
      <div style="max-width: 768px; margin: 0 auto; padding: 2rem 1rem;">
        <a href="/" style="color:#0891b2; text-decoration:none; font-weight:600;">&larr; ExtensionTo</a>
        <h1 style="font-size:2rem; line-height:1.3; margin:1.5rem 0 0.5rem;">${escapeHtml(title)}</h1>
        <p style="color:#64748b; font-size:0.9rem; margin-bottom:1.5rem;">${escapeHtml(description)}</p>
        <article style="line-height:1.7;">
${content}
        </article>
        <p style="margin-top:2rem; color:#64748b; font-size:0.85rem;"><a href="/blog" style="color:#0891b2;">View all articles</a></p>
      </div>
    </div>
    ${scripts.join("\n    ")}
  </body>
</html>
`;
}

function renderHomePage(articles, { scripts, links }) {
  const head = buildHead({
    title: "ExtensionTo - Powerful Chrome Extensions for Productivity, Security & Privacy",
    description:
      "Discover powerful Chrome extensions built to boost your productivity, enhance security, and transform how you browse the web.",
    canonicalPath: "/",
  });

  const latest = articles.slice(0, 12).map((a) => {
    const slug = normalizeSlug(a.slug);
    const desc = a.meta_description || a.excerpt || a.description || "";
    return `          <a href="/blog/${slug}" style="display:block; margin-bottom:1.25rem; padding:1rem; border:1px solid #e2e8f0; border-radius:0.75rem; text-decoration:none; color:inherit;">
            <h3 style="margin:0 0 0.4rem; font-size:1.1rem; color:#0f172a;">${escapeHtml(a.title)}</h3>
            <p style="margin:0; color:#64748b; font-size:0.9rem;">${escapeHtml(desc)}</p>
          </a>`;
  }).join("\n");

  return `<!doctype html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
${head}
    <link rel="icon" type="image/png" href="/favicon.png" />
    ${links.join("\n    ")}
  </head>
  <body>
    <div id="root">
      <div style="max-width: 1024px; margin: 0 auto; padding: 2rem 1rem;">
        <header style="text-align:center; padding: 3rem 0 1rem;">
          <h1 style="font-size:2.75rem; line-height:1.2; margin:0 0 1rem;">Supercharge Your <span style="color:#0891b2;">Chrome Browser</span> Experience</h1>
          <p style="font-size:1.15rem; color:#64748b; max-width:40rem; margin:0 auto;">Discover powerful Chrome extensions built to boost your productivity, enhance security, and transform how you browse the web.</p>
        </header>
        <section style="padding: 2rem 0;">
          <h2 style="font-size:1.75rem; margin-bottom:1.5rem;">Latest Articles</h2>
${latest}
        </section>
        <footer style="text-align:center; padding:2rem 0; color:#94a3b8; font-size:0.85rem;">
          <a href="/blog" style="color:#0891b2;">All articles</a> &middot; <a href="/privacy" style="color:#0891b2;">Privacy</a> &middot; <a href="/terms" style="color:#0891b2;">Terms</a>
        </footer>
      </div>
    </div>
    ${scripts.join("\n    ")}
  </body>
</html>
`;
}

function renderBlogListing(articles, { scripts, links }) {
  const head = buildHead({
    title: "Blog - Latest Articles & Tips | ExtensionTo",
    description:
      "Browse the latest articles about Chrome extensions: productivity tools, security, privacy, and more.",
    canonicalPath: "/blog",
  });

  const list = articles.map((a) => {
    const slug = normalizeSlug(a.slug);
    return `          <li style="margin-bottom:0.75rem;"><a href="/blog/${slug}" style="color:#0891b2; text-decoration:none;">${escapeHtml(a.title)}</a></li>`;
  }).join("\n");

  return `<!doctype html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
${head}
    <link rel="icon" type="image/png" href="/favicon.png" />
    ${links.join("\n    ")}
  </head>
  <body>
    <div id="root">
      <div style="max-width: 768px; margin: 0 auto; padding: 2rem 1rem;">
        <a href="/" style="color:#0891b2; text-decoration:none; font-weight:600;">&larr; ExtensionTo</a>
        <h1 style="font-size:2.25rem; margin:1.5rem 0 1rem;">Latest Articles</h1>
        <ul style="line-height:1.8;">
${list}
        </ul>
      </div>
    </div>
    ${scripts.join("\n    ")}
  </body>
</html>
`;
}

function main() {
  if (!fs.existsSync(path.join(DIST, "index.html"))) {
    console.error("dist/index.html not found. Run `vite build` first.");
    process.exit(1);
  }

  const template = fs.readFileSync(path.join(DIST, "index.html"), "utf8");
  const { scripts, links } = resolveAssetTags(template);

  const index = readJson(INDEX_JSON);
  const articles = index.slice().sort((a, b) =>
    new Date(b.published_at || 0) - new Date(a.published_at || 0)
  );
  console.log(`Prerendering ${articles.length} articles + home + blog listing...`);

  let ok = 0;
  let failed = 0;

  for (const article of articles) {
    const slug = normalizeSlug(article.slug);
    const mdPath = getPartitionedPath(article.slug);
    if (!fs.existsSync(mdPath)) {
      console.warn(`  MISSING md: ${slug}`);
      failed++;
      continue;
    }
    const text = fs.readFileSync(mdPath, "utf8");
    const { frontmatter, content } = parseMarkdown(text);
    const merged = { ...article, ...frontmatter };
    const html = renderArticlePage(merged, content, { scripts, links });
    const outDir = path.join(DIST, "blog", slug);
    fs.mkdirSync(outDir, { recursive: true });
    fs.writeFileSync(path.join(outDir, "index.html"), html);
    ok++;
  }

  fs.writeFileSync(path.join(DIST, "index.html"), renderHomePage(articles, { scripts, links }));
  fs.mkdirSync(path.join(DIST, "blog"), { recursive: true });
  fs.writeFileSync(path.join(DIST, "blog", "index.html"), renderBlogListing(articles, { scripts, links }));

  console.log(`Done. Articles: ${ok} ok, ${failed} failed. Home + /blog listing regenerated.`);
}

main();
