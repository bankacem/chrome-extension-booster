import fs from "node:fs";
import path from "node:path";

const root = process.cwd();
const dist = path.join(root, "dist");
const read = (file) => fs.readFileSync(path.join(root, file), "utf8");
const assert = (condition, message) => {
  if (!condition) throw new Error(`SEO smoke test failed: ${message}`);
};
const htmlPathFor = (url) => {
  const pathname = new URL(url).pathname.replace(/^\//, "").replace(/\/$/, "");
  return path.join(dist, pathname, "index.html");
};
const htmlFor = (url) => fs.readFileSync(htmlPathFor(url), "utf8");
const count = (html, pattern) => [...html.matchAll(pattern)].length;
const seoAssertions = (html, url, expectedCanonical = url) => {
  assert(count(html, /<title\b[^>]*>/gi) === 1, `${url} must contain exactly one title`);
  assert(count(html, /<meta\b[^>]*name=["']description["'][^>]*>/gi) === 1, `${url} must contain exactly one meta description`);
  assert(count(html, /<link\b[^>]*rel=["']canonical["'][^>]*>/gi) === 1, `${url} must contain exactly one canonical`);
  assert(count(html, /<meta\b[^>]*property=["']og:title["'][^>]*>/gi) === 1, `${url} must contain exactly one og:title`);
  assert(count(html, /<meta\b[^>]*property=["']og:description["'][^>]*>/gi) === 1, `${url} must contain exactly one og:description`);
  assert(count(html, /<meta\b[^>]*name=["']robots["'][^>]*>/gi) === 1, `${url} must contain exactly one robots directive`);
  assert(html.includes(`href="${expectedCanonical}"`), `${url} has an unexpected canonical target`);
};

assert(fs.existsSync(dist), "dist directory is missing; run npm run build first");
const vercel = JSON.parse(read("vercel.json"));
const rewrites = vercel.rewrites || [];
assert(!rewrites.some((rewrite) => rewrite.source === "/:path*" || /\(\?/.test(rewrite.source || "")), "vercel.json must not contain a catch-all rewrite");

const baseRoutes = [
  "https://extensionto.com/",
  "https://extensionto.com/blog",
  "https://extensionto.com/privacy",
  "https://extensionto.com/terms",
  "https://extensionto.com/editorial-policy",
  "https://extensionto.com/fr",
  "https://extensionto.com/es",
  "https://extensionto.com/pt",
  "https://extensionto.com/ar",
  "https://extensionto.com/fr/blog",
  "https://extensionto.com/es/blog",
  "https://extensionto.com/pt/blog",
  "https://extensionto.com/ar/blog",
];
for (const url of baseRoutes) {
  const html = htmlFor(url);
  const pathname = new URL(url).pathname === "/" ? "/" : new URL(url).pathname;
  assert(/<h1\b/i.test(html), `${pathname} has no prerendered H1`);
  seoAssertions(html, url);
}

const articleIndex = JSON.parse(read("public/content/articles-index.json"));
const articles = Array.isArray(articleIndex) ? articleIndex : articleIndex.articles || [];
assert(articles.length > 0, "English article index is empty");
const articleSample = articles.slice(0, Math.min(10, articles.length));
for (const article of articleSample) {
  const slug = String(article.slug || article.id).toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
  const url = `https://extensionto.com/blog/${slug}`;
  const html = htmlFor(url);
  assert(/<h1\b/i.test(html), `${url} has no prerendered H1`);
  const expectedCanonical = article.canonicalPath ? (article.canonicalPath.startsWith("http") ? article.canonicalPath : `https://extensionto.com${article.canonicalPath}`) : url;
  seoAssertions(html, url, expectedCanonical);
  assert(/<article\b/i.test(html), `${url} has no article element`);
  assert(/Written by/.test(html), `${url} has no visible author attribution`);
  assert(/editorial-policy/.test(html), `${url} has no editorial methodology link`);
  assert(/reviewedBy/.test(html), `${url} has no reviewedBy schema signal`);
}

const extensionSource = read("src/lib/extensionsData.ts");
const extensionSlugs = [...extensionSource.matchAll(/slug:\s*"([^"]+)"/g)].map((match) => match[1]);
assert(extensionSlugs.length === 9, `expected 9 extension slugs, found ${extensionSlugs.length}`);
for (const slug of extensionSlugs) {
  const url = `https://extensionto.com/extension/${slug}`;
  const html = htmlFor(url);
  assert(/<h1\b/i.test(html), `${url} has no prerendered H1`);
  seoAssertions(html, url);
  assert(/SoftwareApplication/.test(html), `${url} has no SoftwareApplication schema`);
}

let localizedArticleCount = 0;
for (const lang of ["fr", "es", "pt", "ar"]) {
  const indexPath = `public/content/i18n/${lang}/articles-index.json`;
  const localized = JSON.parse(read(indexPath));
  assert(localized.length > 0, `expected at least one ${lang} article`);
  localizedArticleCount += localized.length;
  for (const article of localized) {
    const slug = String(article.slug || article.id).toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
    const url = `https://extensionto.com/${lang}/blog/${slug}`;
    const html = htmlFor(url);
    assert(/<h1\b/i.test(html), `${url} has no prerendered H1`);
    seoAssertions(html, url);
    assert(/hreflang="en"/i.test(html) && new RegExp(`hreflang="${lang}"`, "i").test(html), `${url} is missing reciprocal hreflang`);
  }
}

const sitemap = read("dist/sitemap.xml");
const urls = [...sitemap.matchAll(/<loc>([^<]+)<\/loc>/g)].map((match) => match[1]);
const mergedArticles = JSON.parse(read("public/content/merged-articles.json"));
const redirectMap = new Map((vercel.redirects || []).map((redirect) => [redirect.source, redirect.destination]));
for (const [source, entry] of Object.entries(mergedArticles)) {
  const sourcePath = `/blog/${source}`;
  assert(!urls.includes(`https://extensionto.com${sourcePath}`), `merged source remains in sitemap: ${sourcePath}`);
  assert(redirectMap.get(sourcePath) === entry.redirect_to, `missing direct redirect for merged source: ${sourcePath}`);
  assert(!redirectMap.has(entry.redirect_to), `redirect target is itself another redirect: ${entry.redirect_to}`);
}
assert(urls.length > 0, "sitemap is empty");
assert(new Set(urls).size === urls.length, "sitemap contains duplicate URLs");
for (const requiredUrl of [
  "https://extensionto.com/",
  "https://extensionto.com/blog",
  "https://extensionto.com/fr",
  "https://extensionto.com/es",
  "https://extensionto.com/pt",
  "https://extensionto.com/ar",
  "https://extensionto.com/fr/blog",
  "https://extensionto.com/es/blog",
  "https://extensionto.com/pt/blog",
  "https://extensionto.com/ar/blog",
]) {
  assert(urls.includes(requiredUrl), `required static route missing from sitemap: ${requiredUrl}`);
}
for (const url of urls) {
  const pathname = new URL(url).pathname;
  if (pathname === "/" || pathname === "/blog" || pathname === "/privacy" || pathname === "/terms" || pathname === "/editorial-policy") continue;
  assert(fs.existsSync(htmlPathFor(url)), `sitemap URL has no static HTML: ${url}`);
}

console.log(`SEO smoke tests passed: ${urls.length} sitemap URLs, ${articles.length} English articles, ${extensionSlugs.length} extensions, ${localizedArticleCount} localized articles.`);
