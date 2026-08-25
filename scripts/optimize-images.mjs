import fs from "node:fs/promises";
import path from "node:path";
import sharp from "sharp";

const ROOT = process.cwd();
const PUBLIC_DIR = path.join(ROOT, "public");
const EXTENSIONS = /\.(png|jpe?g|webp)$/i;
const SKIP_DIRS = new Set(["dist", "node_modules"]);
const MAX_WIDTH = 1600;
const MAX_HEIGHT = 900;
const CONCURRENCY = 4;

async function collectImages(dir, results = []) {
  for (const entry of await fs.readdir(dir, { withFileTypes: true })) {
    if (SKIP_DIRS.has(entry.name)) continue;
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) await collectImages(fullPath, results);
    else if (EXTENSIONS.test(entry.name)) results.push(fullPath);
  }
  return results;
}

function outputPath(inputPath, extension) {
  return inputPath.replace(/\.(png|jpe?g|webp)$/i, extension);
}

async function isFresh(outputPath, inputPath) {
  try {
    const [outputStat, inputStat] = await Promise.all([fs.stat(outputPath), fs.stat(inputPath)]);
    return outputStat.mtimeMs >= inputStat.mtimeMs;
  } catch {
    return false;
  }
}

async function optimize(inputPath) {
  const webpPath = outputPath(inputPath, ".webp");
  const avifPath = outputPath(inputPath, ".avif");
  const webpReady = inputPath.endsWith(".webp") || await isFresh(webpPath, inputPath);
  const avifReady = await isFresh(avifPath, inputPath);
  if (webpReady && avifReady) return { skipped: true };

  const image = sharp(inputPath, { failOn: "none" });
  const metadata = await image.metadata();
  const resize = metadata.width > MAX_WIDTH || metadata.height > MAX_HEIGHT
    ? { width: MAX_WIDTH, height: MAX_HEIGHT, fit: "inside", withoutEnlargement: true }
    : undefined;
  const base = resize ? image.resize(resize) : image;

  if (!webpReady) await base.clone().webp({ quality: 82, effort: 4 }).toFile(webpPath);
  if (!avifReady) await base.clone().avif({ quality: 55, effort: 4 }).toFile(avifPath);

  const [inputStat, webpStat, avifStat] = await Promise.all([
    fs.stat(inputPath),
    fs.stat(inputPath.endsWith(".webp") ? inputPath : webpPath),
    fs.stat(avifPath),
  ]);
  return {
    input: path.relative(ROOT, inputPath),
    originalBytes: inputStat.size,
    webpBytes: webpStat.size,
    avifBytes: avifStat.size,
    width: metadata.width,
    height: metadata.height,
  };
}

async function mapWithConcurrency(items, worker, limit) {
  const results = [];
  let cursor = 0;
  async function run() {
    while (cursor < items.length) {
      const index = cursor++;
      results[index] = await worker(items[index]);
    }
  }
  await Promise.all(Array.from({ length: Math.min(limit, items.length) }, run));
  return results;
}

const images = await collectImages(PUBLIC_DIR);
const results = (await mapWithConcurrency(images, async (image) => {
  try {
    return await optimize(image);
  } catch (error) {
    console.error(`Image optimization failed for ${path.relative(ROOT, image)}: ${error.message}`);
    process.exitCode = 1;
    return null;
  }
}, CONCURRENCY)).filter(Boolean);

const processed = results.filter((item) => !item.skipped);
const totalOriginal = processed.reduce((sum, item) => sum + item.originalBytes, 0);
const totalWebp = processed.reduce((sum, item) => sum + item.webpBytes, 0);
const totalAvif = processed.reduce((sum, item) => sum + item.avifBytes, 0);
console.log(`Checked ${images.length} source images; optimized ${processed.length}, skipped ${results.length - processed.length}.`);
console.log(`Processed original bytes: ${totalOriginal}`);
console.log(`Processed WebP bytes: ${totalWebp}`);
console.log(`Processed AVIF bytes: ${totalAvif}`);
