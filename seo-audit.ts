import * as fs from "fs";
import * as path from "path";
import * as yaml from "js-yaml";
import { normalizeSlug } from "./src/utils/articlePath.js";

/**
 * READ-ONLY SEO & technical audit for public/content/articles/.
 * NEVER writes/edits/deletes — only reads and prints. Run: bun seo-audit.ts
 *
 * Built around the project's ACTUAL conventions:
 *  - Bodies use HTML (<a href>, <img src>), not markdown — both are scanned.
 *  - Meta field is `meta_description` (with `description` fallback), mirroring
 *    scripts/sync-articles.ts.
 *  - Internal links use /blog/<slug> (and /articles/<slug>).
 *  - Slugs/partitioning follow src/utils/articlePath.ts.
 */

const ROOT = process.cwd();
const ARTICLES_DIR = path.join(ROOT, "public", "content", "articles");
const INDEX_FILE = path.join(ROOT, "public", "content", "articles-index.json");
const IMAGE_BASE_DIRS = [
  path.join(ROOT, "public", "content", "images"),
  path.join(ROOT, "public", "images"),
  path.join(ROOT, "public"),
];
const META_MIN = 120;
const META_MAX = 160;

interface Frontmatter {
  title?: string;
  slug?: string;
  description?: string;
  meta_description?: string;
  status?: string;
  published_at?: string;
  featured_image?: string | null;
  image_url?: string | null;
  [key: string]: unknown;
}

interface Report {
  relPath: string;
  missingFields: string[];
  metaIssue: string | null; // "missing" | "short" | "long" | null
  internalLinkCount: number;
  brokenInternal: string[];
  malformedExternal: string[];
  missingImages: string[];
  isOrphan: boolean;
}

function walkDir(dir: string, out: string[] = []): string[] {
  if (!fs.existsSync(dir)) return out;
  for (const entry of fs.readdirSync(dir)) {
    const full = path.join(dir, entry);
    if (fs.statSync(full).isDirectory()) walkDir(full, out);
    else if (full.endsWith(".md")) out.push(full);
  }
  return out;
}

function parseFrontmatter(content: string): { fm: Frontmatter; body: string } {
  const match = content.match(/^---([\s\S]*?)---([\s\S]*)$/);
  if (!match) return { fm: {}, body: content };
  try {
    return { fm: (yaml.load(match[1]) || {}) as Frontmatter, body: match[2] || "" };
  } catch {
    return { fm: {}, body: match[2] || "" };
  }
}

function matchAll(body: string, re: RegExp): string[] {
  const out: string[] = [];
  let m: RegExpExecArray | null;
  while ((m = re.exec(body)) !== null) out.push(m[1]);
  return out;
}

function extractLinks(body: string): string[] {
  return [
    ...matchAll(body, /href\s*=\s*["']([^"']+)["']/gi),
    ...matchAll(body, /\[[^\]]*\]\(([^)\s]+)(?:\s+["'][^"']*["'])?\)/g),
  ];
}

function extractImages(body: string): string[] {
  return [
    ...matchAll(body, /<img[^>]*\ssrc\s*=\s*["']([^"']+)["']/gi),
    ...matchAll(body, /!\[[^\]]*\]\(([^)\s]+)(?:\s+["'][^"']*["'])?\)/g),
  ];
}

function isExternal(url: string): boolean {
  return /^https?:\/\//i.test(url) || url.startsWith("//");
}

function isMalformedExternal(url: string): boolean {
  try {
    const u = new URL(url.startsWith("//") ? `https:${url}` : url);
    return !u.hostname || !u.hostname.includes(".") || /\s/.test(url);
  } catch {
    return true;
  }
}

function isMissingImageValue(v: unknown): boolean {
  const s = String(v ?? "").trim().toLowerCase();
  return s === "" || s === "null" || s === "undefined";
}

function imageExists(ref: string): boolean {
  const clean = ref.split("?")[0].split("#")[0].trim();
  if (!clean) return false;
  const rel = clean.replace(/^\//, "");
  const candidates = [path.join(ROOT, "public", rel)];
  for (const base of IMAGE_BASE_DIRS) {
    candidates.push(path.join(base, rel));
    candidates.push(path.join(base, path.basename(clean)));
  }
  return candidates.some((c) => fs.existsSync(c));
}

function buildSlugSet(files: string[]): Set<string> {
  const slugs = new Set<string>();
  for (const f of files) {
    slugs.add(normalizeSlug(path.basename(f, ".md")));
    try {
      const { fm } = parseFrontmatter(fs.readFileSync(f, "utf-8"));
      if (fm.slug) slugs.add(normalizeSlug(String(fm.slug)));
    } catch {
      /* ignore */
    }
  }
  if (fs.existsSync(INDEX_FILE)) {
    try {
      const idx = JSON.parse(fs.readFileSync(INDEX_FILE, "utf-8")) as Array<{ slug?: string }>;
      for (const item of idx) if (item.slug) slugs.add(normalizeSlug(String(item.slug)));
    } catch {
      /* ignore */
    }
  }
  return slugs;
}

function auditArticle(file: string, slugSet: Set<string>): Report {
  const relPath = path.relative(ROOT, file);
  const { fm, body } = parseFrontmatter(fs.readFileSync(file, "utf-8"));

  // 1. Frontmatter completeness.
  const missingFields: string[] = [];
  if (!fm.title || !String(fm.title).trim()) missingFields.push("title");
  if (!fm.slug || !String(fm.slug).trim()) missingFields.push("slug");
  if (!fm.status || !String(fm.status).trim()) missingFields.push("status");
  if (!fm.published_at || !String(fm.published_at).trim()) missingFields.push("published_at");
  if (isMissingImageValue(fm.featured_image)) missingFields.push("featured_image");

  const meta = String(fm.description || fm.meta_description || "").trim();
  let metaIssue: string | null = null;
  if (!meta) metaIssue = "missing";
  else if (meta.length < META_MIN) metaIssue = "short";
  else if (meta.length > META_MAX) metaIssue = "long";

  // 2. Links.
  let internalLinkCount = 0;
  const brokenInternal = new Set<string>();
  const malformedExternal = new Set<string>();
  for (const raw of extractLinks(body)) {
    const url = raw.trim();
    if (!url || url.startsWith("#") || url.startsWith("mailto:")) continue;
    if (isExternal(url)) {
      if (isMalformedExternal(url)) malformedExternal.add(url);
      continue;
    }
    const match = url.match(/^\/(?:blog|articles)\/([^/?#]+)/);
    if (match) {
      internalLinkCount++;
      if (!slugSet.has(normalizeSlug(match[1]))) brokenInternal.add(url);
    }
  }

  // 3. Images (frontmatter + inline); external/data URIs skipped.
  const missingImages = new Set<string>();
  const refs = [
    ...(isMissingImageValue(fm.featured_image) ? [] : [String(fm.featured_image)]),
    ...(isMissingImageValue(fm.image_url) ? [] : [String(fm.image_url)]),
    ...extractImages(body),
  ];
  for (const ref of refs) {
    const r = ref.trim();
    if (!r || isExternal(r) || r.startsWith("data:")) continue;
    if (!imageExists(r)) missingImages.add(r);
  }

  return {
    relPath,
    missingFields,
    metaIssue,
    internalLinkCount,
    brokenInternal: [...brokenInternal],
    malformedExternal: [...malformedExternal],
    missingImages: [...missingImages],
    isOrphan: internalLinkCount === 0, // 4. Orphan = zero outgoing internal links.
  };
}

function pct(n: number, total: number): string {
  return total ? `${((n / total) * 100).toFixed(1)}%` : "0%";
}

function list(label: string, items: string[], limit = 25): void {
  console.log(`\n${label} (${items.length}):`);
  if (items.length === 0) {
    console.log("  (none)");
    return;
  }
  for (const item of items.slice(0, limit)) console.log(`  - ${item}`);
  if (items.length > limit) console.log(`  ...and ${items.length - limit} more`);
}

function run(): void {
  console.log("=== READ-ONLY SEO & Technical Audit ===\n");

  const existingImageDirs = IMAGE_BASE_DIRS.filter((d) => fs.existsSync(d));
  console.log("Image base dirs present on disk:");
  if (existingImageDirs.length === 0)
    console.log("  (none found — every local image will be reported as missing; verify your asset convention)");
  else for (const d of existingImageDirs) console.log(`  - ${path.relative(ROOT, d) || "."}`);
  console.log(`articles-index.json present: ${fs.existsSync(INDEX_FILE)}\n`);

  const files = walkDir(ARTICLES_DIR);
  console.log(`Scanned ${files.length} markdown files under ${path.relative(ROOT, ARTICLES_DIR)}\n`);

  const slugSet = buildSlugSet(files);
  const reports = files.map((f) => auditArticle(f, slugSet));
  const total = reports.length;

  const missingTitle = reports.filter((r) => r.missingFields.includes("title"));
  const missingFeatured = reports.filter((r) => r.missingFields.includes("featured_image"));
  const missingMeta = reports.filter((r) => r.metaIssue === "missing");
  const shortMeta = reports.filter((r) => r.metaIssue === "short");
  const longMeta = reports.filter((r) => r.metaIssue === "long");
  const brokenLinks = reports.filter((r) => r.brokenInternal.length > 0);
  const malformedExt = reports.filter((r) => r.malformedExternal.length > 0);
  const brokenImages = reports.filter((r) => r.missingImages.length > 0);
  const orphans = reports.filter((r) => r.isOrphan);

  // 5. Summary table + prioritized action lists.
  console.log("## Health Summary\n");
  console.log("| Check | Affected | % of total |");
  console.log("| --- | --- | --- |");
  const row = (label: string, n: number) => console.log(`| ${label} | ${n} | ${pct(n, total)} |`);
  row("Missing title", missingTitle.length);
  row("Missing/empty featured_image (frontmatter)", missingFeatured.length);
  row("Missing meta description", missingMeta.length);
  row(`Meta description too short (<${META_MIN})`, shortMeta.length);
  row(`Meta description too long (>${META_MAX})`, longMeta.length);
  row("Articles with broken internal links", brokenLinks.length);
  row("Articles with malformed external links", malformedExt.length);
  row("Articles with broken images", brokenImages.length);
  row("Orphan articles (0 internal links)", orphans.length);

  console.log("\n## Top-Priority Problem Articles\n");
  list("Missing title", missingTitle.map((r) => r.relPath));
  list("Missing meta description", missingMeta.map((r) => r.relPath));
  list(`Meta description too short (<${META_MIN} chars)`, shortMeta.map((r) => r.relPath));
  list(`Meta description too long (>${META_MAX} chars)`, longMeta.map((r) => r.relPath));
  list("Missing/empty featured_image", missingFeatured.map((r) => r.relPath));
  list(
    "Broken internal links",
    brokenLinks.map((r) => `${r.relPath} -> ${r.brokenInternal.join(", ")}`)
  );
  list(
    "Malformed external links",
    malformedExt.map((r) => `${r.relPath} -> ${r.malformedExternal.join(", ")}`)
  );
  list(
    "Broken images",
    brokenImages.map((r) => `${r.relPath} -> ${r.missingImages.join(", ")}`)
  );
  list("Orphan articles", orphans.map((r) => r.relPath));

  console.log("\n=== End of audit (no files were modified) ===");
}

run();
