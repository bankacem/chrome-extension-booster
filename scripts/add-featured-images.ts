import * as fs from 'fs';
import * as path from 'path';
import matter from 'gray-matter';

const articlesDir = path.join(process.cwd(), 'public', 'content', 'articles');
const imagesDir = path.join(process.cwd(), 'public', 'content', 'images');

const APPLY = process.argv.includes('--apply');
const ACCESS_KEY = process.env.UNSPLASH_ACCESS_KEY;

// Polite delay between API calls to respect rate limits.
const DELAY_MS = 1500;

interface FoundFile {
  filePath: string;
  data: Record<string, unknown>;
  content: string;
}

function walkDir(dir: string, fileList: string[] = []): string[] {
  if (!fs.existsSync(dir)) return fileList;
  for (const file of fs.readdirSync(dir)) {
    const fullPath = path.join(dir, file);
    if (fs.statSync(fullPath).isDirectory()) {
      walkDir(fullPath, fileList);
    } else if (fullPath.endsWith('.md')) {
      fileList.push(fullPath);
    }
  }
  return fileList;
}

/**
 * Builds an Unsplash search query from the article title.
 * Maps a few common topics to stronger visual keywords, else falls back
 * to the most significant words of the title plus "technology".
 */
function buildQuery(title: string): string {
  const lower = title.toLowerCase();
  const topicMap: Array<[RegExp, string]> = [
    [/\bvpn\b|privacy|secur|cyber/, 'cybersecurity network server'],
    [/\bai\b|chatgpt|deepseek|gpt|machine learning/, 'artificial intelligence futuristic technology'],
    [/screenshot|capture/, 'computer screen workspace'],
    [/excel|sheets|formula|spreadsheet/, 'data spreadsheet analytics'],
    [/download|idm|manager/, 'data transfer technology'],
    [/memory|ram|performance|speed|gaming/, 'computer hardware performance'],
  ];
  for (const [re, q] of topicMap) {
    if (re.test(lower)) return q;
  }
  const words = title
    .replace(/[^a-zA-Z0-9\s]/g, ' ')
    .split(/\s+/)
    .filter(w => w.length > 3)
    .slice(0, 3)
    .join(' ');
  return `${words} technology`.trim();
}

/**
 * Fetches a random Unsplash photo URL for the given query.
 */
async function fetchImageUrl(query: string): Promise<string | null> {
  const url = `https://api.unsplash.com/photos/random?query=${encodeURIComponent(query)}&orientation=landscape`;
  const res = await fetch(url, {
    headers: { Authorization: `Client-ID ${ACCESS_KEY}` },
  });
  if (!res.ok) {
    console.error(`[Images] Unsplash API error (${res.status}) for query "${query}"`);
    return null;
  }
  const data = await res.json() as { urls?: { regular?: string; full?: string } };
  return data.urls?.regular || data.urls?.full || null;
}

async function downloadImage(imageUrl: string, destPath: string): Promise<void> {
  const res = await fetch(imageUrl);
  if (!res.ok) throw new Error(`Download failed (${res.status})`);
  const arrayBuffer = await res.arrayBuffer();
  fs.writeFileSync(destPath, Buffer.from(arrayBuffer));
}

async function run() {
  console.log(APPLY ? '[Images] APPLY mode: images WILL be downloaded and frontmatter updated.' : '[Images] DRY-RUN mode: no downloads/writes. Pass --apply to execute.');

  if (APPLY && !ACCESS_KEY) {
    console.error('[Images] Missing UNSPLASH_ACCESS_KEY environment variable. Aborting.');
    process.exit(1);
  }

  const files = walkDir(articlesDir);
  const candidates: FoundFile[] = [];

  for (const filePath of files) {
    const parsed = matter(fs.readFileSync(filePath, 'utf-8'));
    const data = parsed.data as Record<string, unknown>;
    if (data.featured_image) continue; // already has an image
    candidates.push({ filePath, data, content: parsed.content });
  }

  console.log(`Found ${candidates.length} articles without a featured_image.`);

  let processed = 0;
  let errors = 0;

  for (const item of candidates) {
    const slug = String(item.data.slug || path.basename(item.filePath, '.md'));
    const title = String(item.data.title || slug);
    const query = buildQuery(title);
    const localPath = `/content/images/${slug}.jpg`;
    const destPath = path.join(imagesDir, `${slug}.jpg`);

    console.log(`[Images] "${title}" → query="${query}" → ${localPath}`);

    if (!APPLY) {
      processed++;
      continue;
    }

    try {
      const imageUrl = await fetchImageUrl(query);
      if (!imageUrl) {
        errors++;
        continue;
      }
      fs.mkdirSync(imagesDir, { recursive: true });
      await downloadImage(imageUrl, destPath);

      item.data.featured_image = localPath;
      item.data.image_url = localPath;
      fs.writeFileSync(item.filePath, matter.stringify(item.content, item.data), 'utf-8');

      processed++;
      await new Promise(resolve => setTimeout(resolve, DELAY_MS));
    } catch (e) {
      console.error(`[Images] Failed for ${slug}:`, (e as Error).message);
      errors++;
    }
  }

  console.log('\n--- Featured Images Summary ---');
  console.log(`${APPLY ? 'Processed' : 'Would process'}: ${processed}`);
  console.log(`Errors: ${errors}`);
  if (APPLY) {
    console.log('\nNext step: run `bun run sync-articles` to rebuild articles-index.json and the sitemap.');
  }
}

run().catch((err) => {
  console.error(err);
  process.exit(1);
});
