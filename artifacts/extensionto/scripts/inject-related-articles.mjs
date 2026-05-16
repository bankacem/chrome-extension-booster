#!/usr/bin/env node
/**
 * inject-related-articles.mjs  (Phase 2 P1 — SEO Recovery)
 *
 * PURPOSE:
 *   Appends permanent "## Related Articles" sections to markdown files.
 *   This converts the client-side-only internal linking system into real
 *   crawlable HTML links that Googlebot can discover without JavaScript.
 *
 * SAFETY GUARANTEES:
 *   - REVERSIBLE: section is clearly demarcated, removable with sed
 *   - IDEMPOTENT: skips files that already have "## Related Articles"
 *   - NON-DESTRUCTIVE: only appends to file; never modifies existing content
 *   - LOGGED: every modification printed to stdout
 *   - DRY-RUN: pass --dry-run to preview without writing
 *
 * USAGE:
 *   node scripts/inject-related-articles.mjs           # apply to all articles
 *   node scripts/inject-related-articles.mjs --dry-run # preview only
 *   node scripts/inject-related-articles.mjs --slug some-slug  # single article
 *   node scripts/inject-related-articles.mjs --reset   # REMOVE all injected sections
 *
 * TO REVERSE:
 *   node scripts/inject-related-articles.mjs --reset
 *   OR: sed -i '/^---$/,/^## Related Articles/{ /^## Related Articles/,$ d }' FILE
 */

import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ARTICLES_DIR = path.join(__dirname, "../public/content/articles");
const INDEX_PATH   = path.join(__dirname, "../public/content/articles-index.json");
const SITE_URL     = "https://extensionto.com";

// ── CLI flags ─────────────────────────────────────────────────────────────────
const args = process.argv.slice(2);
const DRY_RUN = args.includes("--dry-run");
const RESET   = args.includes("--reset");
const SLUG_FILTER = (() => {
  const idx = args.indexOf("--slug");
  return idx !== -1 ? args[idx + 1] : null;
})();

// ── Configuration ─────────────────────────────────────────────────────────────
const MAX_OUTBOUND = 5;    // max related links per article
const MAX_INBOUND  = 20;   // max inbound links per article (prevents hub over-concentration)
const MIN_WORDS    = 300;  // skip thin articles as link sources (they shouldn't link out)
const SECTION_MARKER = "## Related Articles";
const SECTION_SEP    = "\n\n---\n\n";

// ── Stop words for keyword extraction ────────────────────────────────────────
const STOP_WORDS = new Set([
  "the","and","for","with","that","this","from","are","was","were","has","have",
  "been","will","would","could","should","how","what","when","where","which",
  "your","their","they","you","its","our","can","get","use","make","best",
  "top","all","more","also","into","about","than","then","them","some","any",
  "used","using","but","not","may","over","only","just","most","after","before",
  "does","did","each","even","such","both","while","these","those","there",
  "here","need","keep","like","2025","2026","2024","chrome","extension","extensions",
  "browser","guide","complete","ultimate","free","new","now","lets","way","ways",
]);

// ── Load articles index ───────────────────────────────────────────────────────
console.log("Loading articles index...");
const allArticles = JSON.parse(fs.readFileSync(INDEX_PATH, "utf8"));
console.log(`  ${allArticles.length} articles loaded`);

// ── Build keyword sets per article ───────────────────────────────────────────
function extractKeywords(article) {
  const words = new Set();
  // From explicit keywords/tags
  (article.keywords || []).forEach(k => k.split(/\s+/).forEach(w => {
    if (w.length > 3 && !STOP_WORDS.has(w.toLowerCase())) words.add(w.toLowerCase());
  }));
  (article.tags || []).forEach(t => t.split(/\s+/).forEach(w => {
    if (w.length > 3 && !STOP_WORDS.has(w.toLowerCase())) words.add(w.toLowerCase());
  }));
  // From title
  (article.title || "").split(/\s+/).forEach(w => {
    const clean = w.replace(/[^a-z0-9]/gi, "").toLowerCase();
    if (clean.length > 4 && !STOP_WORDS.has(clean)) words.add(clean);
  });
  // From slug parts
  (article.slug || "").split("-").forEach(w => {
    if (w.length > 4 && !STOP_WORDS.has(w)) words.add(w);
  });
  return words;
}

// ── Score relevance between two articles ─────────────────────────────────────
function scorePair(a, b) {
  if (a.slug === b.slug) return -1;
  let score = 0;
  // Category match is worth 3 points
  if (a.category === b.category) score += 3;
  // Keyword overlap
  const kwA = extractKeywords(a);
  const kwB = extractKeywords(b);
  for (const w of kwA) {
    if (kwB.has(w)) score += 1;
  }
  // Prefer articles with more content (quality signal)
  score += Math.min((b.word_count || 0) / 500, 2);
  return score;
}

// ── Build related map ─────────────────────────────────────────────────────────
console.log("Computing related articles...");
const relatedMap = {}; // slug → [{ slug, title, score }]
const inboundCount = {}; // slug → number of articles linking TO it

// Initialize
allArticles.forEach(a => {
  relatedMap[a.slug] = [];
  inboundCount[a.slug] = 0;
});

// For each article, find top-N related
for (const article of allArticles) {
  if (SLUG_FILTER && article.slug !== SLUG_FILTER) continue;
  if ((article.word_count || 0) < MIN_WORDS) continue;

  const candidates = allArticles
    .filter(b => b.slug !== article.slug && (b.word_count || 0) >= MIN_WORDS)
    .map(b => ({ ...b, _score: scorePair(article, b) }))
    .filter(b => b._score > 0)
    .sort((a, b) => b._score - a._score);

  // Pick top MAX_OUTBOUND, respecting inbound cap
  const picked = [];
  for (const candidate of candidates) {
    if (picked.length >= MAX_OUTBOUND) break;
    if ((inboundCount[candidate.slug] || 0) >= MAX_INBOUND) continue;
    picked.push(candidate);
    inboundCount[candidate.slug] = (inboundCount[candidate.slug] || 0) + 1;
  }

  relatedMap[article.slug] = picked;
}

// ── Build slug → file path map ────────────────────────────────────────────────
const slugToFile = {};
for (const article of allArticles) {
  const s = article.slug;
  const c1 = s[0] || "_";
  const c2 = s[1] || "_";
  const c3 = s[2] || "_";
  slugToFile[s] = path.join(ARTICLES_DIR, c1, c2, c3, `${s}.md`);
}

// ── Process files ─────────────────────────────────────────────────────────────
let modified = 0;
let skipped  = 0;
let missing  = 0;
let reset    = 0;
let errors   = 0;

const articlesToProcess = SLUG_FILTER
  ? allArticles.filter(a => a.slug === SLUG_FILTER)
  : allArticles;

console.log(`\n${RESET ? "RESET MODE" : DRY_RUN ? "DRY RUN MODE" : "WRITE MODE"} — processing ${articlesToProcess.length} articles...\n`);

for (const article of articlesToProcess) {
  const filePath = slugToFile[article.slug];

  if (!filePath || !fs.existsSync(filePath)) {
    missing++;
    continue;
  }

  try {
    const raw = fs.readFileSync(filePath, "utf8");

    // ── RESET MODE: remove injected sections ─────────────────────────────────
    if (RESET) {
      const markerPos = raw.indexOf(`\n${SECTION_SEP.trim()}\n`);
      if (markerPos === -1) {
        // Try alternate: find "## Related Articles" heading
        const altPos = raw.lastIndexOf(`\n\n---\n\n## Related Articles`);
        if (altPos === -1) {
          skipped++;
          continue;
        }
        const cleaned = raw.slice(0, altPos).trimEnd() + "\n";
        if (!DRY_RUN) fs.writeFileSync(filePath, cleaned, "utf8");
        console.log(`  RESET: ${article.slug}`);
        reset++;
      } else {
        const cleaned = raw.slice(0, markerPos).trimEnd() + "\n";
        if (!DRY_RUN) fs.writeFileSync(filePath, cleaned, "utf8");
        console.log(`  RESET: ${article.slug}`);
        reset++;
      }
      continue;
    }

    // ── Skip if already has related articles section ──────────────────────────
    if (raw.includes(SECTION_MARKER)) {
      skipped++;
      continue;
    }

    // ── Skip thin articles as link sources ────────────────────────────────────
    if ((article.word_count || 0) < MIN_WORDS) {
      skipped++;
      continue;
    }

    // ── Build related articles list ───────────────────────────────────────────
    const related = relatedMap[article.slug] || [];
    if (related.length === 0) {
      skipped++;
      continue;
    }

    // ── Build markdown section ────────────────────────────────────────────────
    const listItems = related
      .map(r => `- [${r.title}](${SITE_URL}/blog/${r.slug})`)
      .join("\n");

    const section = `${SECTION_SEP}${SECTION_MARKER}\n\n${listItems}\n`;

    // ── Write ─────────────────────────────────────────────────────────────────
    const updated = raw.trimEnd() + section;

    if (DRY_RUN) {
      console.log(`  [DRY-RUN] Would update: ${article.slug}`);
      console.log(`    Related: ${related.map(r => r.slug).join(", ")}`);
    } else {
      fs.writeFileSync(filePath, updated, "utf8");
      console.log(`  ✓ Updated: ${article.slug} → ${related.length} links`);
      related.forEach(r => console.log(`      → ${r.slug}`));
    }

    modified++;

  } catch (e) {
    console.error(`  ✗ Error processing ${article.slug}:`, e.message);
    errors++;
  }
}

// ── Print inbound distribution stats ─────────────────────────────────────────
if (!RESET) {
  const distribution = Object.values(inboundCount);
  const withLinks = distribution.filter(n => n > 0).length;
  const orphans = allArticles.length - withLinks;
  const avg = distribution.reduce((s, n) => s + n, 0) / (allArticles.length || 1);

  console.log("\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
  console.log(`INJECTION SUMMARY`);
  console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
  console.log(`  Mode:     ${DRY_RUN ? "DRY RUN (no files written)" : "LIVE (files updated)"}`);
  console.log(`  Modified: ${modified} articles`);
  console.log(`  Skipped:  ${skipped} articles (already have section OR thin OR no matches)`);
  console.log(`  Missing:  ${missing} files not found on disk`);
  console.log(`  Errors:   ${errors}`);
  console.log("");
  console.log(`  Inbound link distribution (after injection):`);
  console.log(`  Articles with ≥1 inbound link: ${withLinks} / ${allArticles.length}`);
  console.log(`  Orphans (0 inbound):           ${orphans} / ${allArticles.length} (${Math.round(orphans/allArticles.length*100)}%)`);
  console.log(`  Avg inbound links per article: ${avg.toFixed(1)}`);
  console.log("");

  if (!DRY_RUN && modified > 0) {
    console.log("  NEXT STEPS:");
    console.log("  1. Re-run: node scripts/sync-articles.mjs");
    console.log("  2. Re-run: node scripts/generate-sitemap.mjs");
    console.log("  3. Verify sample article in browser to confirm 'Related Articles' renders");
  }
}

if (RESET) {
  console.log(`\nRESET COMPLETE: ${reset} sections removed`);
}
