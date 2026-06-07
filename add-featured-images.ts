import * as fs from 'fs';
import * as path from 'path';
import matter from 'gray-matter';
 
const articlesDir = path.join(process.cwd(), 'public', 'content', 'articles');
const imagesDir = path.join(process.cwd(), 'public', 'content', 'images');
 
const APPLY = process.argv.includes('--apply');
const DELAY_MS = 500; // سرعة فائقة لأنه لا توجد قيود
 
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
 
function getKeyword(title: string): string {
  const lower = title.toLowerCase();
  if (/\bvpn\b|privacy|secur|cyber/.test(lower)) return 'cybersecurity,server';
  if (/\bai\b|chatgpt|deepseek|gpt|machine/.test(lower)) return 'artificial-intelligence,technology';
  if (/excel|sheets|formula|spreadsheet/.test(lower)) return 'data,workspace';
  if (/memory|ram|performance|speed|gaming/.test(lower)) return 'computer,hardware';
  return 'technology,abstract';
}
 
async function downloadImage(imageUrl: string, destPath: string): Promise<void> {
  const res = await fetch(imageUrl);
  if (!res.ok) throw new Error(`Download failed (${res.status})`);
  const arrayBuffer = await res.arrayBuffer();
  fs.writeFileSync(destPath, Buffer.from(arrayBuffer));
}
 
async function run() {
  console.log(APPLY ? '[Images] APPLY mode: downloading images...' : '[Images] DRY-RUN mode. Pass --apply to execute.');
 
  const files = walkDir(articlesDir);
  const candidates: FoundFile[] = [];
 
  for (const filePath of files) {
    const parsed = matter(fs.readFileSync(filePath, 'utf-8'));
    const data = parsed.data as Record<string, unknown>;
    if (data.featured_image) continue; // تخطي المقالات التي تمتلك صوراً مسبقاً
    candidates.push({ filePath, data, content: parsed.content });
  }
 
  console.log(`Found ${candidates.length} articles looking for images.`);
 
  let processed = 0;
  let errors = 0;
 
  for (const item of candidates) {
    const slug = String(item.data.slug || path.basename(item.filePath, '.md'));
    const title = String(item.data.title || slug);
    const keyword = getKeyword(title);
    
    // استخدام رابط Unsplash مباشر ومفتوح ومجاني بناءً على الكلمة المفتاحية والعنوان الفريد
    const imageUrl = `https://images.unsplash.com/photo-1518770660439-4636190af475?auto=format&fit=crop&w=800&q=80&sig=${Math.random()}`;
    const directUrl = `https://source.unsplash.com/featured/800x600/?${keyword}&sig=${slug}`;
    
    // رابط بديل مستقر وفائق السرعة ومفتوح 100% ومتوافق مع الكلمات المفتاحية
    const finalApiUrl = `https://loremflickr.com/800/600/${keyword}?lock=${slug.length + processed}`;
 
    const localPath = `/content/images/${slug}.jpg`;
    const destPath = path.join(imagesDir, `${slug}.jpg`);
 
    console.log(`[Images] Processing: "${title}" → Category: [${keyword}]`);
 
    if (!APPLY) {
      processed++;
      continue;
    }
 
    try {
      fs.mkdirSync(imagesDir, { recursive: true });
      await downloadImage(finalApiUrl, destPath);
 
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
 
  console.log('\n--- Finished Successfully ---');
  console.log(`Images Generated: ${processed}`);
  if (APPLY) {
    console.log('\nNext step: run sync-articles to update index.');
  }
}
 
run().catch((err) => {
  console.error(err);
  process.exit(1);
});