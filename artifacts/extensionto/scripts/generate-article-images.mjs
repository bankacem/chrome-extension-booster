import sharp from "sharp";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, "..");
const OUTPUT_DIR = path.join(ROOT, "public/images/blog");
const ARTICLES_INDEX = path.join(ROOT, "public/content/articles-index.json");

const CATEGORY_GRADIENTS = {
  "Privacy & Security":   ["#1a1a2e", "#16213e", "#0f3460"],
  "Productivity":         ["#0f2027", "#203a43", "#2c5364"],
  "Ad Blocking":          ["#200122", "#6f0000", "#200122"],
  "Chrome Extensions":    ["#141e30", "#243b55", "#1a3a5c"],
  "Developer Tools":      ["#0d0d0d", "#1a1a2e", "#162032"],
  "Tab Management":       ["#0f0c29", "#302b63", "#24243e"],
  "Dark Mode":            ["#16222a", "#3a6073", "#16222a"],
  "Screenshot Tools":     ["#1f1c18", "#2c3e50", "#1f1c18"],
  "Password Manager":     ["#1a1a2e", "#2d1b69", "#11998e"],
  "default":              ["#141e30", "#243b55", "#0f2027"],
};

function getGradient(category) {
  return CATEGORY_GRADIENTS[category] || CATEGORY_GRADIENTS["default"];
}

function wrapText(text, maxChars) {
  const words = text.split(" ");
  const lines = [];
  let current = "";
  for (const word of words) {
    if ((current + " " + word).trim().length > maxChars) {
      if (current) lines.push(current.trim());
      current = word;
    } else {
      current = current ? current + " " + word : word;
    }
  }
  if (current) lines.push(current.trim());
  return lines.slice(0, 3);
}

function generateSvg(title, category) {
  const [c1, c2, c3] = getGradient(category);
  const lines = wrapText(title, 38);
  const lineHeight = 62;
  const totalHeight = lines.length * lineHeight;
  const startY = 300 - totalHeight / 2;

  const textElements = lines
    .map((line, i) => {
      const y = startY + i * lineHeight;
      return `<text x="600" y="${y}" text-anchor="middle" font-family="'Segoe UI', Arial, sans-serif" font-size="44" font-weight="700" fill="white" opacity="0.97">${line.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;")}</text>`;
    })
    .join("\n    ");

  const catLabel = category || "Chrome Extensions";

  return `<svg width="1200" height="630" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <linearGradient id="bg" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="${c1}"/>
      <stop offset="50%" stop-color="${c2}"/>
      <stop offset="100%" stop-color="${c3}"/>
    </linearGradient>
    <linearGradient id="accent" x1="0%" y1="0%" x2="100%" y2="0%">
      <stop offset="0%" stop-color="#6366f1"/>
      <stop offset="100%" stop-color="#8b5cf6"/>
    </linearGradient>
    <filter id="glow">
      <feGaussianBlur stdDeviation="8" result="coloredBlur"/>
      <feMerge><feMergeNode in="coloredBlur"/><feMergeNode in="SourceGraphic"/></feMerge>
    </filter>
  </defs>
  <rect width="1200" height="630" fill="url(#bg)"/>
  <circle cx="150" cy="150" r="200" fill="${c2}" opacity="0.3"/>
  <circle cx="1050" cy="480" r="180" fill="${c3}" opacity="0.25"/>
  <circle cx="600" cy="315" r="300" fill="${c2}" opacity="0.08"/>
  <rect x="80" y="40" width="140" height="6" rx="3" fill="url(#accent)" opacity="0.9"/>
  <text x="80" y="90" font-family="'Segoe UI', Arial, sans-serif" font-size="22" font-weight="600" fill="#a5b4fc" letter-spacing="3" opacity="0.9">EXTENSIONTO.COM</text>
  <rect x="80" y="510" width="1040" height="1" fill="white" opacity="0.1"/>
  <text x="80" y="555" font-family="'Segoe UI', Arial, sans-serif" font-size="18" fill="#a5b4fc" opacity="0.8">${catLabel.replace(/&/g, "&amp;")}</text>
  <text x="1120" y="555" text-anchor="end" font-family="'Segoe UI', Arial, sans-serif" font-size="18" fill="white" opacity="0.5">2026</text>
  <rect x="0" y="580" width="1200" height="50" fill="url(#accent)" opacity="0.15"/>
  ${textElements}
</svg>`;
}

async function generateImage(slug, title, category) {
  const outPath = path.join(OUTPUT_DIR, `${slug}.webp`);
  if (fs.existsSync(outPath)) return { slug, skipped: true };
  try {
    const svg = generateSvg(title, category);
    await sharp(Buffer.from(svg))
      .webp({ quality: 90 })
      .toFile(outPath);
    return { slug, ok: true };
  } catch (err) {
    return { slug, error: String(err) };
  }
}

async function main() {
  fs.mkdirSync(OUTPUT_DIR, { recursive: true });
  const articles = JSON.parse(fs.readFileSync(ARTICLES_INDEX, "utf8"));
  const needsImage = articles.filter(a => !a.featured_image || !fs.existsSync(path.join(ROOT, "public" + a.featured_image)));

  console.log(`Generating images for ${needsImage.length} articles...`);

  const batchSize = 20;
  let done = 0, skipped = 0, errors = 0;

  for (let i = 0; i < needsImage.length; i += batchSize) {
    const batch = needsImage.slice(i, i + batchSize);
    const results = await Promise.all(
      batch.map(a => generateImage(a.slug, a.title, a.category))
    );
    for (const r of results) {
      if (r.error) { errors++; console.error("  ✗", r.slug, r.error); }
      else if (r.skipped) skipped++;
      else done++;
    }
    process.stdout.write(`\r  Progress: ${i + batch.length}/${needsImage.length} (${done} generated, ${skipped} skipped, ${errors} errors)`);
  }

  console.log(`\nDone! ${done} generated, ${skipped} skipped, ${errors} errors`);

  // Update articles-index.json to set featured_image for all articles
  const updated = articles.map(a => {
    if (a.featured_image && fs.existsSync(path.join(ROOT, "public" + a.featured_image))) return a;
    const imgPath = `/images/blog/${a.slug}.webp`;
    return { ...a, featured_image: imgPath, image_url: imgPath };
  });
  fs.writeFileSync(ARTICLES_INDEX, JSON.stringify(updated, null, 2), "utf8");
  console.log("Updated articles-index.json with image paths.");
}

main().catch(console.error);
