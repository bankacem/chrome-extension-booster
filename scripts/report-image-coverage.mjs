import fs from "node:fs";
import path from "node:path";

const root = process.cwd();
const readJson = (file) => JSON.parse(fs.readFileSync(path.join(root, file), "utf8"));
const index = readJson("public/content/articles-index.json");
const articles = Array.isArray(index) ? index : index.articles || [];
const articleFiles = [];
const walk = (dir) => {
  if (!fs.existsSync(dir)) return;
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) walk(full);
    else if (entry.name.endsWith(".md")) articleFiles.push(full);
  }
};
walk(path.join(root, "public/content/articles"));

const bySlug = new Map();
for (const file of articleFiles) {
  const raw = fs.readFileSync(file, "utf8");
  const match = raw.match(/^---([\s\S]*?)---/);
  const slug = raw.match(/^slug:\s*["']?([^"'\n]+)["']?/m)?.[1]?.trim();
  const image = match?.[1]?.match(/^featured_image:\s*["']?([^"'\n]+)["']?/m)?.[1]?.trim() || "";
  if (slug) bySlug.set(slug, { file: path.relative(root, file), image });
}

const normalize = (value) => String(value || "").toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");
const missing = [];
const placeholder = [];
const imageRefs = new Map();
for (const article of articles) {
  const slug = normalize(article.slug || article.id);
  const record = bySlug.get(article.slug) || bySlug.get(slug);
  const image = article.featured_image || record?.image || "";
  if (!image) missing.push({ slug, title: article.title, file: record?.file || null });
  else {
    imageRefs.set(image, (imageRefs.get(image) || 0) + 1);
    if (/og-image|placeholder|default/i.test(image)) placeholder.push({ slug, title: article.title, image });
  }
}

const imageFiles = [];
const imageRoot = path.join(root, "public/content/images");
walk(imageRoot);
for (const file of articleFiles) void file;
const mediaFiles = [];
const walkMedia = (dir) => {
  if (!fs.existsSync(dir)) return;
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) walkMedia(full);
    else if (/\.(png|jpe?g|webp|avif|gif)$/i.test(entry.name)) mediaFiles.push({ file: path.relative(root, full), bytes: fs.statSync(full).size });
  }
};
walkMedia(path.join(root, "public"));
mediaFiles.sort((a, b) => b.bytes - a.bytes);

console.log(JSON.stringify({
  totalArticles: articles.length,
  markdownFiles: articleFiles.length,
  missingFeaturedImage: missing.length,
  placeholderImageReferences: placeholder.length,
  uniqueImageReferences: imageRefs.size,
  imageFiles: mediaFiles.length,
  totalImageBytes: mediaFiles.reduce((sum, file) => sum + file.bytes, 0),
  missing: missing.slice(0, 100),
  placeholder: placeholder.slice(0, 100),
  largestImages: mediaFiles.slice(0, 20),
}, null, 2));
