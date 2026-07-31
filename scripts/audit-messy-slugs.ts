/**
 * audit-messy-slugs.ts (READ-ONLY / ANALYSIS ONLY)
 *
 * Finds articles whose slug ends in an auto-generated ID (e.g. "-mkzmcqu32kf")
 * and proposes a clean, keyword-based replacement slug - without touching
 * any file. Output is a CSV for human review before anything is applied.
 *
 * Detection logic for "messy": the last hyphen-segment of the slug is >= 8
 * characters AND contains at least one digit AND at least one letter, AND
 * is not a recognizable meaningful word/term (checked against a small
 * allowlist of common tech terms that happen to contain digits, e.g.
 * "1password", "2fa", "365", "4k").
 *
 * This intentionally does NOT touch the ~153 slugs that just end in a
 * plain small number (e.g. "-2", "-6") - those are a separate, lower-risk
 * case (simple duplicate-numbering) that can be handled later if needed.
 */
import fs from "fs-extra";
import path from "path";

const ROOT = process.cwd();
const INDEX_JSON_PATH = path.join(ROOT, "public", "content", "articles-index.json");
const OUT_CSV = path.join(ROOT, "scripts", "messy-slugs-report.csv");

const MEANINGFUL_ALNUM_TERMS = new Set([
  "1password", "2fa", "365", "4k", "5g", "4g", "360", "3d", "8gb", "16gb", "32gb", "64gb",
  "2026", "2025", "2024", "web3", "m3u8", "mp3", "mp4", "wifi6", "usb-c", "oauth2",
]);

function csvEscape(v: string): string {
  const s = String(v ?? "");
  return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

function isMessySuffix(seg: string): boolean {
  if (seg.length < 8) return false;
  const hasDigit = /\d/.test(seg);
  const hasLetter = /[a-z]/i.test(seg);
  if (!hasDigit || !hasLetter) return false;
  if (MEANINGFUL_ALNUM_TERMS.has(seg.toLowerCase())) return false;
  return true;
}

const FILLER_PHRASE_RE = /\b(the ultimate guide|a comprehensive guide|the complete guide|a step-by-step guide)\b/gi;
const TAIL_PATTERNS: RegExp[] = [
  /:\s*full\s+\d{4}\s+review(\s+after\s+[^:]+)?$/i,
  /\s+for\s+2026$/i,
];

function stripFiller(title: string): string {
  let t = title;
  for (const re of TAIL_PATTERNS) t = t.replace(re, "");
  // Remove only the generic "guide" phrase text itself. Deliberately does NOT
  // try to guess whether the real keyword sits before or after a hook verb
  // like "Unlocking X: ..." - that guess was tested and got it wrong in both
  // directions (sometimes ate "Store Extension Chrome", sometimes ate
  // "Extension Bing"). Safer to keep all real words and let the length check
  // below flag anything still too long for manual review instead of guessing.
  t = t.replace(FILLER_PHRASE_RE, "").replace(/\s{2,}/g, " ");
  t = t.replace(/([:\-–—])\s*(to|for|on)\s+/i, "$1 ");
  t = t.replace(/\s*[:\-–—]\s*$/, "");
  return t.replace(/\s{2,}/g, " ").trim();
}

function slugify(text: string): string {
  return text
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9\s-]/g, "")
    .trim()
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");
}

async function main() {
  const articles: Array<{ slug: string; title: string; seo_title?: string }> = await fs.readJson(
    INDEX_JSON_PATH
  );

  const existingSlugs = new Set(articles.map((a) => a.slug));
  const proposedSlugCounts = new Map<string, number>();

  const rows: string[] = ["old_slug,title,proposed_slug,status"];
  let flagged = 0;
  let needsReview = 0;

  for (const a of articles) {
    const lastSeg = a.slug.split("-").pop() || "";
    if (!isMessySuffix(lastSeg)) continue;
    flagged++;

    const basis = a.seo_title || a.title || a.slug;
    const defillered = stripFiller(basis);
    let candidate = slugify(defillered.length >= 6 ? defillered : basis);

    let status = "ok";
    if (candidate.length > 70) {
      // Filler-stripping alone wasn't enough to get a clean, reasonably
      // short slug - don't blind-truncate and risk cutting the keyword.
      // Leave the old slug in place; flag for manual review instead.
      status = "still-too-long-needs-manual-review";
      candidate = a.slug;
      needsReview++;
    }
    if (!candidate) candidate = a.slug; // never produce an empty slug
    // Collision with an existing (non-messy) article slug -> keep old slug, flag for manual review.
    if (status === "ok" && existingSlugs.has(candidate) && candidate !== a.slug) {
      status = "collision-with-existing";
      candidate = a.slug;
      needsReview++;
    } else if (status === "ok") {
      const count = (proposedSlugCounts.get(candidate) || 0) + 1;
      proposedSlugCounts.set(candidate, count);
      if (count > 1) {
        status = "collision-with-another-proposal";
        candidate = a.slug;
        needsReview++;
      }
    }

    rows.push([a.slug, csvEscape(a.title), candidate, status].join(","));
  }

  await fs.writeFile(OUT_CSV, rows.join("\n"), "utf-8");
  console.log(`Flagged ${flagged} articles with a messy auto-generated slug suffix.`);
  console.log(`  -> ${flagged - needsReview} have a clean, safe proposed slug.`);
  console.log(`  -> ${needsReview} need manual review (collision or still too long) - left unchanged for now.`);
  console.log(`Report written to ${path.relative(ROOT, OUT_CSV)}`);
}

main().catch((e) => {
  console.error("Audit failed:", e);
  process.exit(1);
});
