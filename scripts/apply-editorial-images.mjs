import fs from "node:fs/promises";
import path from "node:path";
import matter from "gray-matter";

const ROOT = process.cwd();
const ARTICLES_DIR = path.join(ROOT, "public", "content", "articles");
const INDEX_PATH = path.join(ROOT, "public", "content", "articles-index.json");

const imageMap = {
  "best-chrome-extensions-for-web-accessibility-testing": "/content/images/generated/best-chrome-extensions-for-web-accessibility-testing.jpg",
  "chrome-extensions-for-comparing-prices-while-shopping": "/content/images/generated/chrome-extensions-for-comparing-prices-while-shopping.jpg",
  "chrome-extensions-for-time-zone-conversion": "/content/images/generated/chrome-extensions-for-time-zone-conversion.jpg",
  "how-to-disable-chrome-notifications": "/content/images/generated/how-to-disable-chrome-notifications.jpg",
  "best-chrome-extensions-for-note-taking": "/content/images/generated/best-chrome-extensions-for-note-taking.jpg",
  "chrome-extensions-for-online-privacy-2026": "/content/images/generated/chrome-extensions-for-online-privacy-2026.jpg",
  "chrome-extensions-for-reading-pdfs-online": "/content/images/generated/chrome-extensions-for-reading-pdfs-online.jpg",
  "chrome-extensions-for-tracking-package-deliveries": "/content/images/generated/chrome-extensions-for-tracking-package-deliveries.jpg",
  "how-to-manage-chrome-bookmarks-efficiently": "/content/images/generated/how-to-manage-chrome-bookmarks-efficiently.jpg",
  "how-to-sync-chrome-bookmarks-across-devices": "/content/images/generated/how-to-sync-chrome-bookmarks-across-devices.jpg",
  "best-chrome-extensions-for-language-learning": "/content/images/generated/best-chrome-extensions-for-language-learning.jpg",
  "how-to-clear-chrome-cache-and-cookies-a-complete-guide-with-comparisons-tips-and-real-world-insights": "/content/images/generated/how-to-clear-chrome-cache-and-cookies.jpg",
  "best-chrome-extensions-for-accessibility-boost-your-browsing-experience": "/content/images/generated/best-chrome-extensions-for-accessibility-boost-your-browsing-experience.jpg",
};

async function collectMarkdown(dir, results = []) {
  for (const entry of await fs.readdir(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) await collectMarkdown(full, results);
    else if (entry.name.endsWith(".md")) results.push(full);
  }
  return results;
}

const files = await collectMarkdown(ARTICLES_DIR);
const updated = new Set();
for (const file of files) {
  const raw = await fs.readFile(file, "utf8");
  const parsed = matter(raw);
  const slug = String(parsed.data.slug || "").trim();
  const image = imageMap[slug];
  if (!image) continue;
  parsed.data.featured_image = image;
  await fs.writeFile(file, matter.stringify(parsed.content, parsed.data), "utf8");
  updated.add(slug);
}

const indexData = JSON.parse(await fs.readFile(INDEX_PATH, "utf8"));
const articles = Array.isArray(indexData) ? indexData : indexData.articles || [];
for (const article of articles) {
  const image = imageMap[String(article.slug || article.id || "").trim()];
  if (image) article.featured_image = image;
}
if (Array.isArray(indexData)) await fs.writeFile(INDEX_PATH, JSON.stringify(articles, null, 2) + "\n", "utf8");
else await fs.writeFile(INDEX_PATH, JSON.stringify({ ...indexData, articles }, null, 2) + "\n", "utf8");

const missing = Object.keys(imageMap).filter((slug) => !updated.has(slug));
if (missing.length) {
  console.error(`Could not find markdown files for: ${missing.join(", ")}`);
  process.exit(1);
}
console.log(`Updated ${updated.size} article Markdown files and the public article index.`);
