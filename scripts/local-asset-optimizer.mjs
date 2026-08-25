import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'fs';
import { readFile, writeFile, mkdir } from 'fs/promises';
import { resolve, dirname, relative } from 'path';
import { fileURLToPath } from 'url';
import { glob } from 'fs';
import matter from 'gray-matter';
import sharp from 'sharp';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, '..');
const ARTICLES_DIR = resolve(ROOT, 'articles');
const OUTPUT_ROOT = resolve(ROOT, 'public', 'content', 'images');

const isTest = process.argv.includes('--test');

// ── Color palette from slug hash ──────────────────────────────────────
function hashColor(slug, index) {
  let hash = 0;
  for (let i = 0; i < slug.length; i++) {
    hash = ((hash << 5) - hash) + slug.charCodeAt(i);
    hash |= 0;
  }
  const base = [
    ['#0f2027','#203a43','#2c5364'],
    ['#1a1a2e','#16213e','#0f3460'],
    ['#0d1117','#161b22','#21262d'],
    ['#1b0030','#2d0040','#3d0066'],
    ['#0b2b40','#114455','#1a6b80'],
    ['#2c1810','#3d2218','#4e3020'],
    ['#1a0a2e','#1f0f3a','#2a1a5e'],
    ['#0a192f','#0d2b4a','#1a4a7a'],
  ];
  const palette = base[Math.abs(hash) % base.length];
  return palette[index % 3];
}

function hexToRgb(hex) {
  const r = parseInt(hex.slice(1,3), 16);
  const g = parseInt(hex.slice(3,5), 16);
  const b = parseInt(hex.slice(5,7), 16);
  return { r, g, b };
}

function colorStops(slug) {
  const c1 = hexToRgb(hashColor(slug, 0));
  const c2 = hexToRgb(hashColor(slug, 1));
  const c3 = hexToRgb(hashColor(slug, 2));
  return `
    <linearGradient id="bg" x1="0" y1="0" x2="100%" y2="100%">
      <stop offset="0%" stop-color="rgb(${c1.r},${c1.g},${c1.b})"/>
      <stop offset="50%" stop-color="rgb(${c2.r},${c2.g},${c2.b})"/>
      <stop offset="100%" stop-color="rgb(${c3.r},${c3.g},${c3.b})"/>
    </linearGradient>
    <linearGradient id="accent" x1="0" y1="0" x2="100%" y2="0%">
      <stop offset="0%" stop-color="#e94560"/>
      <stop offset="100%" stop-color="#ff6b6b"/>
    </linearGradient>
  `;
}

// ── Should we generate an image? ──────────────────────────────────────
function needsGeneration(featuredImage) {
  if (!featuredImage) return true;
  if (featuredImage === 'null') return true;
  if (featuredImage.trim() === '') return true;
  if (featuredImage.startsWith('http')) return true;
  if (featuredImage.endsWith('.svg')) return true;
  return false;
}

// ── Generate SVG overlay for the title ─────────────────────────────────
function buildTitleSvg(title, slug) {
  const safeTitle = title
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');

  // Split title into lines (max ~40 chars per line)
  const words = safeTitle.split(' ');
  const lines = [];
  let current = '';
  for (const w of words) {
    if ((current + ' ' + w).length > 42 && current.length > 0) {
      lines.push(current);
      current = w;
    } else {
      current = current ? current + ' ' + w : w;
    }
  }
  if (current) lines.push(current);

  const lineHeight = 58;
  const startY = 220;
  const totalHeight = lines.length * lineHeight;
  const offsetY = Math.max(0, (630 - startY - totalHeight) / 2);

  const tspans = lines.map((line, i) =>
    `<tspan x="60" dy="${i === 0 ? 0 : lineHeight}">${line}</tspan>`
  ).join('');

  const fontSize = lines.length > 3 ? 36 : lines.length > 2 ? 40 : 44;

  return `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="630" viewBox="0 0 1200 630">
  <defs>
    ${colorStops(slug)}
    <filter id="shadow" x="-5%" y="-5%" width="110%" height="110%">
      <feDropShadow dx="0" dy="2" stdDeviation="4" flood-color="rgba(0,0,0,0.3)"/>
    </filter>
  </defs>

  <!-- Background gradient -->
  <rect width="1200" height="630" fill="url(#bg)"/>

  <!-- Subtle grid pattern -->
  <g opacity="0.04">
    <line x1="0" y1="0" x2="0" y2="630" stroke="#fff" stroke-width="0.5"/>
    <line x1="100" y1="0" x2="100" y2="630" stroke="#fff" stroke-width="0.5"/>
    <line x1="200" y1="0" x2="200" y2="630" stroke="#fff" stroke-width="0.5"/>
    <line x1="300" y1="0" x2="300" y2="630" stroke="#fff" stroke-width="0.5"/>
    <line x1="400" y1="0" x2="400" y2="630" stroke="#fff" stroke-width="0.5"/>
    <line x1="500" y1="0" x2="500" y2="630" stroke="#fff" stroke-width="0.5"/>
    <line x1="600" y1="0" x2="600" y2="630" stroke="#fff" stroke-width="0.5"/>
    <line x1="700" y1="0" x2="700" y2="630" stroke="#fff" stroke-width="0.5"/>
    <line x1="800" y1="0" x2="800" y2="630" stroke="#fff" stroke-width="0.5"/>
    <line x1="900" y1="0" x2="900" y2="630" stroke="#fff" stroke-width="0.5"/>
    <line x1="1000" y1="0" x2="1000" y2="630" stroke="#fff" stroke-width="0.5"/>
    <line x1="1100" y1="0" x2="1100" y2="630" stroke="#fff" stroke-width="0.5"/>
  </g>

  <!-- Decorative circles -->
  <circle cx="1000" cy="120" r="220" fill="rgba(255,255,255,0.03)"/>
  <circle cx="1100" cy="500" r="160" fill="rgba(255,255,255,0.02)"/>
  <circle cx="80" cy="550" r="100" fill="rgba(255,255,255,0.02)"/>

  <!-- Site name -->
  <rect x="60" y="40" width="200" height="34" rx="17" fill="rgba(255,255,255,0.08)"/>
  <text x="160" y="61" font-family="'Segoe UI','Arial',sans-serif" font-size="14" fill="#ffffff" text-anchor="middle" font-weight="bold" letter-spacing="1">extensionto.com</text>

  <!-- Article title -->
  <text filter="url(#shadow)" x="60" y="${220 + offsetY}" font-family="'Segoe UI','Arial',sans-serif" font-size="${fontSize}" fill="#ffffff" font-weight="bold">
    ${tspans}
  </text>

  <!-- Accent bar at bottom -->
  <rect x="0" y="610" width="1200" height="20" fill="url(#accent)" opacity="0.8"/>
</svg>`;
}

// ── Generate the WebP image ───────────────────────────────────────────
async function generateImage(title, slug, outputPath) {
  const svgString = buildTitleSvg(title, slug);
  const svgBuffer = Buffer.from(svgString);

  await sharp(svgBuffer)
    .resize(1200, 630, { fit: 'fill' })
    .webp({ quality: 85, effort: 4 })
    .toFile(outputPath);

  const stat = await import('fs/promises').then(fs => fs.stat(outputPath));
  return stat.size;
}

// ── Main ──────────────────────────────────────────────────────────────
async function main() {
  if (!existsSync(resolve(ROOT, 'node_modules', 'sharp'))) {
    console.error('ERROR: Dependencies not installed. Run: npm install');
    process.exit(1);
  }

  // Collect all markdown files
  const { glob } = await import('glob');
  const pattern = resolve(ARTICLES_DIR, '**', '*.md').replace(/\\/g, '/');
  const files = await glob(pattern);

  console.log(`\n📁 Found ${files.length} markdown articles\n`);

  // Filter for test mode
  const toProcess = isTest ? files.slice(0, 3) : files;
  if (isTest) {
    console.log('🧪 TEST MODE — processing 3 articles only\n');
  }

  let generated = 0;
  let skipped = 0;
  let errors = 0;

  for (const filePath of toProcess) {
    const relativePath = relative(ARTICLES_DIR, filePath);
    try {
      const raw = readFileSync(filePath, 'utf-8');
      const parsed = matter(raw);

      const oldFrontmatter = { ...parsed.data };
      const title = parsed.data.title;
      const slug = parsed.data.slug;

      if (!slug) {
        console.warn(`  ⚠️  Skip (no slug): ${relativePath}`);
        skipped++;
        continue;
      }

      const oldFi = parsed.data.featured_image;
      const needsGen = needsGeneration(oldFi);

      if (!needsGen) {
        console.log(`  ✅ Already optimized: ${slug}`);
        skipped++;
        continue;
      }

      // Prepare output directory
      const imageDir = resolve(OUTPUT_ROOT, slug);
      const imagePath = resolve(imageDir, 'featured.webp');
      const webPath = `/content/images/${slug}/featured.webp`;

      mkdirSync(imageDir, { recursive: true });

      // Generate image
      const sizeBytes = await generateImage(title, slug, imagePath);
      const sizeKB = (sizeBytes / 1024).toFixed(1);

      // Update frontmatter
      parsed.data.featured_image = webPath;

      // Inject img tag at start of content body (after the frontmatter)
      const imgTag = `\n<img src="${webPath}" alt="${title.replace(/"/g, '&quot;')}" width="1200" height="630" loading="lazy" class="featured-image">\n`;
      const content = parsed.content;
      // Insert right after the first heading or just before the first paragraph
      const bodyMatch = content.match(/^/);
      parsed.content = imgTag + content;

      // Write updated file
      const newContent = matter.stringify(parsed.content, parsed.data);
      writeFileSync(filePath, newContent, 'utf-8');

      generated++;

      // Print detail
      console.log(`\n  📄 ${slug}`);
      console.log(`     Title: ${title?.slice(0, 60)}${title?.length > 60 ? '...' : ''}`);
      console.log(`     Before: ${oldFi === 'null' || !oldFi ? 'null' : oldFi?.slice(0, 60) + '...'}`);
      console.log(`     After:  ${webPath}`);
      console.log(`     Image:  ${sizeKB} KB → ${imagePath}`);

      if (isTest) {
        console.log(`\n  ── Frontmatter changes ──`);
        console.log(`     featured_image: "${oldFi === 'null' || !oldFi ? 'null' : oldFi?.slice(0, 50) + '...'}" → "${webPath}"`);
        console.log(`  ───────────────────────\n`);
      }

    } catch (err) {
      console.error(`  ❌ Error: ${relativePath}: ${err.message}`);
      errors++;
    }
  }

  const total = toProcess.length;
  console.log(`\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`);
  console.log(`  Total:    ${total}`);
  console.log(`  ✅ Done:  ${generated}`);
  console.log(`  ⏭️  Skip:  ${skipped}`);
  console.log(`  ❌ Error: ${errors}`);
  console.log(`━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n`);
}

main().catch(err => {
  console.error('Fatal:', err);
  process.exit(1);
});
