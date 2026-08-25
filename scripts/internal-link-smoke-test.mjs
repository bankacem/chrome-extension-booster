import fs from "node:fs";
import path from "node:path";

const root = process.cwd();
const contentRoots = [path.join(root, "public", "content", "articles")];
const index = JSON.parse(fs.readFileSync(path.join(root, "public", "content", "articles-index.json"), "utf8"));
const articleSlugs = new Set(index.map((article) => article.slug || article.id));
const localizedSlugs = new Map();
for (const lang of ["fr", "es", "pt", "ar"]) {
  const localizedIndexPath = path.join(root, "public", "content", "i18n", lang, "articles-index.json");
  if (!fs.existsSync(localizedIndexPath)) continue;
  const localizedIndex = JSON.parse(fs.readFileSync(localizedIndexPath, "utf8"));
  localizedSlugs.set(lang, new Set(localizedIndex.map((article) => article.slug || article.id)));
  contentRoots.push(path.join(root, "public", "content", "i18n", lang, "articles"));
}
const extensionsSource = fs.readFileSync(path.join(root, "src", "lib", "extensionsData.ts"), "utf8");
const extensionIds = [...extensionsSource.matchAll(/\bid:\s*["']([^"']+)["']/g)].map((match) => match[1]);
const validPaths = new Set(["/", "/blog", "/privacy", "/terms", "/editorial-policy", ...["fr", "es", "pt", "ar"].flatMap((lang) => [`/${lang}`, `/${lang}/blog`]), ...extensionIds.map((id) => `/extension/${id}`), ...[...articleSlugs].map((slug) => `/blog/${slug}`)]);
for (const [lang, slugs] of localizedSlugs) {
  for (const slug of slugs) validPaths.add(`/${lang}/blog/${slug}`);
}
const merged = JSON.parse(fs.readFileSync(path.join(root, "public", "content", "merged-articles.json"), "utf8"));
const vercel = JSON.parse(fs.readFileSync(path.join(root, "vercel.json"), "utf8"));
const redirects = new Map((vercel.redirects || []).map((redirect) => [redirect.source, redirect.destination]));
const knownExceptions = new Set([
  "/blog/unlocking-the-power-of-chrome",
  "/blog/the-definitive-guide-to-chrome-extension-download-youtube-video-high-quality-enhancing-your-offline--mliju5mvrvj",
  "/support",
  "/the-ultimate-chrome-extensions-guide-for-2025-maximize-your-browsers-potential",
  "/the-2025-chrome-extension-power-guide-how-to-actually-level-up-your-browser",
  "/10-essential-chrome-extensions-to-actually-secure",
]);

function filesIn(dir) {
  const result = [];
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) result.push(...filesIn(full));
    else if (entry.name.endsWith(".md")) result.push(full);
  }
  return result;
}
function normalize(raw) {
  let value = raw.trim().replace(/^https?:\/\/extensionto\.com/, "");
  value = value.split("#", 1)[0].split("?", 1)[0].replace(/\/+/g, "/");
  if (!value.startsWith("/")) return null;
  if (value !== "/") value = value.replace(/\/$/, "");
  return value;
}
const broken = new Map();
const redirectLinks = new Map();
let links = 0;
for (const contentRoot of contentRoots) {
  for (const file of filesIn(contentRoot)) {
  const text = fs.readFileSync(file, "utf8");
  const matches = [
    ...text.matchAll(/href=["']([^"']+)["']/gi),
    ...text.matchAll(/(?<!!)\[[^\]]*\]\(([^)\s]+)(?:\s+["'][^)]*)?\)/g),
  ];
  for (const match of matches) {
    const target = normalize(match[1]);
    if (!target) continue;
    links += 1;
    if (redirects.has(target)) redirectLinks.set(target, (redirectLinks.get(target) || 0) + 1);
    else if (!validPaths.has(target) && !Object.hasOwn(merged, target.replace(/^\/blog\//, ""))) broken.set(target, (broken.get(target) || 0) + 1);
  }
  }
}
const unexpected = [...broken.keys()].filter((target) => !knownExceptions.has(target));
if (redirectLinks.size) throw new Error(`Internal links still point to redirects: ${JSON.stringify(Object.fromEntries(redirectLinks))}`);
if (unexpected.length) throw new Error(`Unexpected broken internal links: ${JSON.stringify(unexpected)}`);
console.log(`Internal link smoke test passed: ${links} links scanned, 0 redirect links, ${broken.size} documented exceptions.`);
