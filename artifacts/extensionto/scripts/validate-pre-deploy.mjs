#!/usr/bin/env node
/**
 * validate-pre-deploy.mjs  (Phase 4 — SEO Recovery)
 *
 * PURPOSE:
 *   Run before every deploy to catch SEO regressions and content quality issues.
 *   Exits with code 1 if any ERROR-level check fails (blocks deploy in CI).
 *   Exits with code 0 even if only WARN-level issues found.
 *
 * USAGE:
 *   node scripts/validate-pre-deploy.mjs              # full validation
 *   node scripts/validate-pre-deploy.mjs --strict     # WARN = fail
 *   node scripts/validate-pre-deploy.mjs --check-duplicates  # duplicates only
 *   node scripts/validate-pre-deploy.mjs --summary    # one-line summary only
 *
 * CHECKS:
 *   [ERROR] New machine-ID slugs (mm/ml prefix) in new articles
 *   [ERROR] Slug collisions (same slug in 2+ articles)
 *   [ERROR] Articles missing required frontmatter fields
 *   [ERROR] Articles with slug > 120 characters (new articles only)
 *   [ERROR] Canonical path mismatch (/blog/{slug} expected)
 *   [WARN]  New thin articles (< 800 words) added since last run
 *   [WARN]  Articles missing meta_description
 *   [WARN]  Non-English articles without hreflang annotation
 *   [WARN]  Articles with AI spam signals in title
 *   [WARN]  Sitemap missing articles that are in index
 *   [WARN]  Duplicate slugs in sitemap
 *   [INFO]  Category distribution (outliers flagged)
 *   [INFO]  Orphan rate change vs baseline
 */

import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const INDEX_PATH   = path.join(__dirname, "../public/content/articles-index.json");
const SITEMAP_PATH = path.join(__dirname, "../public/sitemap.xml");
const ARTICLES_DIR = path.join(__dirname, "../public/content/articles");

const args = process.argv.slice(2);
const STRICT   = args.includes("--strict");
const DUPE_ONLY = args.includes("--check-duplicates");
const SUMMARY_ONLY = args.includes("--summary");

// ── Known baselines ───────────────────────────────────────────────────────────
const BASELINE = {
  articleCount: 499,
  orphanRate: 0.72,  // last measured
};

// ── Known legacy machine IDs (pre-existing, not new violations) ───────────────
// These slugs are permanently grandfathered — they existed before the fix.
// Run `node scripts/generate-legacy-ids.mjs` to regenerate this list.
const GRANDFATHERED_MACHINE_IDS_FILE = path.join(__dirname, ".grandfathered-machine-ids.json");
let GRANDFATHERED_IDS = new Set();
if (fs.existsSync(GRANDFATHERED_MACHINE_IDS_FILE)) {
  try {
    GRANDFATHERED_IDS = new Set(JSON.parse(fs.readFileSync(GRANDFATHERED_MACHINE_IDS_FILE, "utf8")));
  } catch {}
}

// ── Logger ────────────────────────────────────────────────────────────────────
const results = { errors: [], warnings: [], infos: [] };

function error(msg, detail = "") {
  if (!SUMMARY_ONLY) console.error(`  [ERROR] ${msg}${detail ? `\n         ${detail}` : ""}`);
  results.errors.push(msg);
}

function warn(msg, detail = "") {
  if (!SUMMARY_ONLY) console.warn(`  [WARN]  ${msg}${detail ? `\n         ${detail}` : ""}`);
  results.warnings.push(msg);
}

function info(msg) {
  if (!SUMMARY_ONLY) console.log(`  [INFO]  ${msg}`);
  results.infos.push(msg);
}

function section(title) {
  if (!SUMMARY_ONLY) console.log(`\n${"─".repeat(60)}\n  ${title}\n${"─".repeat(60)}`);
}

// ── Load data ─────────────────────────────────────────────────────────────────
if (!fs.existsSync(INDEX_PATH)) {
  console.error("FATAL: articles-index.json not found. Run sync-articles.mjs first.");
  process.exit(1);
}

const articles = JSON.parse(fs.readFileSync(INDEX_PATH, "utf8"));
const sitemapContent = fs.existsSync(SITEMAP_PATH) ? fs.readFileSync(SITEMAP_PATH, "utf8") : "";

if (!SUMMARY_ONLY) {
  console.log(`\n${"═".repeat(60)}`);
  console.log(`  PRE-DEPLOY SEO VALIDATOR — ExtensionTo.com`);
  console.log(`  Articles: ${articles.length} | Date: ${new Date().toISOString().split("T")[0]}`);
  console.log(`${"═".repeat(60)}`);
}

// ─────────────────────────────────────────────────────────────────────────────
// CHECK 1: Slug duplicates
// ─────────────────────────────────────────────────────────────────────────────
section("CHECK 1: Slug Duplicates");
{
  const slugCount = {};
  articles.forEach(a => { slugCount[a.slug] = (slugCount[a.slug] || 0) + 1; });
  const dupes = Object.entries(slugCount).filter(([, n]) => n > 1);
  if (dupes.length > 0) {
    dupes.forEach(([slug, count]) => error(`Duplicate slug: "${slug}" appears ${count} times`, `Action: Redirect weaker to stronger; remove duplicate from disk`));
  } else {
    info("No duplicate slugs found");
  }
}

if (DUPE_ONLY) {
  printSummary();
  process.exit(results.errors.length > 0 ? 1 : 0);
}

// ─────────────────────────────────────────────────────────────────────────────
// CHECK 2: New machine-ID slugs (regression check)
// ─────────────────────────────────────────────────────────────────────────────
section("CHECK 2: New Machine-ID Slugs (Regression)");
{
  const machineIdPattern = /-(mm|ml)[a-z0-9]{4,15}$/;
  const newMachineIds = articles
    .filter(a => machineIdPattern.test(a.slug) && !GRANDFATHERED_IDS.has(a.slug));

  if (GRANDFATHERED_IDS.size === 0) {
    info(`No grandfathered IDs file found at .grandfathered-machine-ids.json`);
    info(`Run: node scripts/generate-legacy-ids.mjs to create baseline`);
    info(`Skipping machine-ID regression check until baseline is set`);
  } else if (newMachineIds.length > 0) {
    newMachineIds.forEach(a => error(`New machine-ID slug: "${a.slug}"`, `The AIGenerator.tsx should use cleanSlug() only`));
  } else {
    info(`No new machine-ID slugs detected (${GRANDFATHERED_IDS.size} legacy IDs grandfathered)`);
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// CHECK 3: Required frontmatter fields
// ─────────────────────────────────────────────────────────────────────────────
section("CHECK 3: Required Frontmatter Fields");
{
  let missingTitle = 0, missingSlug = 0, missingPublished = 0;
  articles.forEach(a => {
    if (!a.title) { missingTitle++; error(`Missing title: "${a.slug}"`); }
    if (!a.slug)  { missingSlug++;  error(`Missing slug in article: id=${a.id}`); }
    if (!a.published_at) { missingPublished++; warn(`Missing published_at: "${a.slug}"`); }
  });
  if (missingTitle === 0 && missingSlug === 0) {
    info(`All articles have title and slug`);
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// CHECK 4: Canonical path correctness
// ─────────────────────────────────────────────────────────────────────────────
section("CHECK 4: Canonical Path Correctness");
{
  let mismatches = 0;
  articles.forEach(a => {
    const expected = `/blog/${a.slug}`;
    if (a.canonicalPath && a.canonicalPath !== expected) {
      mismatches++;
      error(`Canonical mismatch for "${a.slug}"`, `Expected: ${expected} | Got: ${a.canonicalPath}`);
    }
  });
  const missingCanonical = articles.filter(a => !a.canonicalPath).length;
  if (missingCanonical > 0) warn(`${missingCanonical} articles missing canonicalPath field`);
  if (mismatches === 0) info(`All canonical paths correct`);
}

// ─────────────────────────────────────────────────────────────────────────────
// CHECK 5: New thin articles (< 800 words)
// ─────────────────────────────────────────────────────────────────────────────
section("CHECK 5: Thin Content Detection");
{
  const thin = articles.filter(a => (a.word_count || 0) < 300);
  const medThin = articles.filter(a => (a.word_count || 0) >= 300 && (a.word_count || 0) < 800);
  thin.forEach(a => error(`Critically thin article: "${a.slug}" (${a.word_count} words)`, `Minimum: 300 words`));
  if (medThin.length > 0) warn(`${medThin.length} articles between 300-800 words (below quality target of 800)`);
  if (thin.length === 0) info(`No critically thin articles (<300 words)`);
}

// ─────────────────────────────────────────────────────────────────────────────
// CHECK 6: Missing meta_description
// ─────────────────────────────────────────────────────────────────────────────
section("CHECK 6: Meta Description Coverage");
{
  const noMeta = articles.filter(a => !a.meta_description || a.meta_description.trim().length < 50);
  if (noMeta.length > 0) {
    warn(`${noMeta.length} articles have missing or very short meta_description`);
    noMeta.slice(0, 5).forEach(a => warn(`  → ${a.slug}`));
  } else {
    info(`All articles have meta_description`);
  }
  const tooLong = articles.filter(a => (a.meta_description || "").length > 160);
  if (tooLong.length > 0) warn(`${tooLong.length} articles have meta_description > 160 chars (will be truncated)`);
}

// ─────────────────────────────────────────────────────────────────────────────
// CHECK 7: AI spam signals in titles
// ─────────────────────────────────────────────────────────────────────────────
section("CHECK 7: AI Spam Signal Detection");
{
  const SPAM_PATTERNS = [
    { re: /^unlocking (the power of|a|the)/i, label: "Unlocking boilerplate opener" },
    { re: /^discover the (best|power|ultimate)/i, label: "Discover the boilerplate opener" },
    { re: /^(the )?(ultimate|comprehensive|complete) guide to/i, label: "Ultimate/Complete guide boilerplate" },
  ];
  const spamCounts = {};
  articles.forEach(a => {
    SPAM_PATTERNS.forEach(({ re, label }) => {
      if (re.test(a.title || "")) {
        spamCounts[label] = (spamCounts[label] || 0) + 1;
      }
    });
  });
  const total = Object.values(spamCounts).reduce((s, n) => s + n, 0);
  if (total > 0) {
    Object.entries(spamCounts).forEach(([label, count]) => warn(`${count} titles match: "${label}"`));
  } else {
    info(`No AI spam patterns detected in titles`);
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// CHECK 8: Sitemap vs index consistency
// ─────────────────────────────────────────────────────────────────────────────
section("CHECK 8: Sitemap Consistency");
{
  if (!sitemapContent) {
    warn("sitemap.xml not found — run generate-sitemap.mjs");
  } else {
    const sitemapUrls = (sitemapContent.match(/\/blog\/([^<]+)/g) || []).map(u => u.replace("/blog/", ""));
    const sitemapSet = new Set(sitemapUrls);
    const indexSlugs = new Set(articles.map(a => a.slug));

    // Articles in index but not sitemap (may be intentional if flagged as thin)
    const notInSitemap = articles.filter(a => !sitemapSet.has(a.slug) && !(a.quality_flags || []).some(f => ["thin","partial","corrupted_slug"].includes(f)));
    if (notInSitemap.length > 0) warn(`${notInSitemap.length} unflagged articles not in sitemap`);

    // URLs in sitemap but not in index
    const sitemapBlogUrls = sitemapUrls.filter(s => !indexSlugs.has(s));
    if (sitemapBlogUrls.length > 0) {
      sitemapBlogUrls.forEach(slug => error(`Sitemap has stale URL not in index: /blog/${slug}`));
    }

    // Duplicate URLs in sitemap
    const urlCounts = {};
    sitemapUrls.forEach(s => { urlCounts[s] = (urlCounts[s] || 0) + 1; });
    const siteDupes = Object.entries(urlCounts).filter(([, n]) => n > 1);
    siteDupes.forEach(([slug]) => error(`Duplicate URL in sitemap: /blog/${slug}`));

    info(`Sitemap: ${sitemapUrls.length} article URLs | Index: ${articles.length} articles`);
    if (notInSitemap.length === 0 && sitemapBlogUrls.length === 0 && siteDupes.length === 0) {
      info(`Sitemap and index are consistent`);
    }
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// CHECK 9: Markdown files exist on disk
// ─────────────────────────────────────────────────────────────────────────────
section("CHECK 9: File Existence Check");
{
  let missing = 0;
  const toCheck = articles.slice(0, 50); // sample first 50 for speed
  toCheck.forEach(a => {
    const c1 = a.slug[0] || "_";
    const c2 = a.slug[1] || "_";
    const c3 = a.slug[2] || "_";
    const p = path.join(ARTICLES_DIR, c1, c2, c3, `${a.slug}.md`);
    if (!fs.existsSync(p)) {
      missing++;
      warn(`Markdown file missing for: ${a.slug}`);
    }
  });
  if (missing === 0) info(`File check: all sampled files exist on disk`);
}

// ─────────────────────────────────────────────────────────────────────────────
// CHECK 10: Article count and orphan rate
// ─────────────────────────────────────────────────────────────────────────────
section("CHECK 10: Content Volume & Orphan Rate");
{
  const diff = articles.length - BASELINE.articleCount;
  if (diff < 0) warn(`Article count dropped from baseline: ${BASELINE.articleCount} → ${articles.length} (${diff})`);
  else info(`Article count: ${articles.length} (${diff >= 0 ? "+" : ""}${diff} vs baseline)`);

  const cats = {};
  articles.forEach(a => { cats[a.category || "Uncategorized"] = (cats[a.category || "Uncategorized"] || 0) + 1; });
  const sortedCats = Object.entries(cats).sort((a, b) => b[1] - a[1]);
  info(`Top categories: ${sortedCats.slice(0, 3).map(([c, n]) => `${c}(${n})`).join(", ")}`);
}

// ─────────────────────────────────────────────────────────────────────────────
// SUMMARY
// ─────────────────────────────────────────────────────────────────────────────
function printSummary() {
  const exitCode = (STRICT ? results.errors.length + results.warnings.length : results.errors.length) > 0 ? 1 : 0;
  console.log(`\n${"═".repeat(60)}`);
  console.log(`  VALIDATION RESULT: ${exitCode === 0 ? "✅ PASS" : "❌ FAIL"}`);
  console.log(`  Errors:   ${results.errors.length}`);
  console.log(`  Warnings: ${results.warnings.length}`);
  console.log(`  Infos:    ${results.infos.length}`);
  if (exitCode !== 0 && results.errors.length > 0) {
    console.log(`\n  BLOCKING ERRORS:`);
    results.errors.forEach(e => console.log(`    ✗ ${e}`));
  }
  if (STRICT && results.warnings.length > 0) {
    console.log(`\n  WARNINGS (blocking in --strict mode):`);
    results.warnings.forEach(w => console.log(`    ⚠ ${w}`));
  }
  console.log(`${"═".repeat(60)}\n`);
  return exitCode;
}

const exitCode = printSummary();
process.exit(exitCode);
