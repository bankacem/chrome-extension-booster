/**
 * audit-long-titles.ts (READ-ONLY / ANALYSIS ONLY)
 *
 * Finds articles whose <title> tag ("<title> | ExtensionTo") would be
 * truncated in Google search results, and proposes a shortened `seo_title`
 * for each — without touching any file.
 *
 * Important: Google truncates based on the FULL displayed string, which for
 * this site is `${title} | ExtensionTo` (the " | ExtensionTo" suffix adds
 * 14 characters). So the safe budget for the `title` field itself is closer
 * to ~50 characters, not 60 - this script uses that realistic budget.
 *
 * The proposed seo_title is meant to be reviewed by a human before being
 * written into article frontmatter (see apply-seo-titles.ts for that step).
 *
 * Output: scripts/long-titles-report.csv
 */
import fs from "fs-extra";
import path from "path";

const ROOT = process.cwd();
const INDEX_JSON_PATH = path.join(ROOT, "public", "content", "articles-index.json");
const OUT_CSV = path.join(ROOT, "scripts", "long-titles-report.csv");

const SUFFIX = " | ExtensionTo"; // 14 characters
const TARGET_TITLE_LEN = 60 - SUFFIX.length; // 46 - keeps the full displayed string within Google's ~60-char budget
const MIN_ACCEPTABLE_LEN = 20; // never shorten a title down to something too thin to be meaningful

function csvEscape(v: string): string {
  const s = String(v ?? "");
  return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

// Generic marketing boilerplate that shows up across a large share of this
// site's AI-generated titles ("Unlocking X: A Comprehensive Guide to Y").
// Stripping these first preserves the actual keyword phrase instead of
// gambling on which side of a colon is more meaningful.
const FILLER_PATTERNS: RegExp[] = [
  /\b(the ultimate guide|a comprehensive guide|the complete guide|a step-by-step guide)\b/gi,
  /:\s*full\s+\d{4}\s+review(\s+after\s+[^:]+)?$/i,
  /\s+for\s+2026$/i,
];

function stripFiller(title: string): string {
  let t = title;
  for (const re of FILLER_PATTERNS) t = t.replace(re, "");
  t = t.replace(/([:\-–—])\s*(to|for|on)\s+/i, "$1 ");
  t = t.replace(/^(to|for|on)\s+/i, "");
  t = t.replace(/\s*[:\-–—]\s*$/, "");
  return t.replace(/\s{2,}/g, " ").trim();
}

function proposeSeoTitle(original: string): { seoTitle: string; confidence: "high" | "skipped" } {
  const title = original.trim();
  if (title.length <= TARGET_TITLE_LEN) return { seoTitle: title, confidence: "high" };

  const defillered = stripFiller(title);
  if (defillered.length <= TARGET_TITLE_LEN && defillered.length >= MIN_ACCEPTABLE_LEN) {
    return { seoTitle: defillered[0].toUpperCase() + defillered.slice(1), confidence: "high" };
  }
  // No safe reduction found - stripping the generic filler phrase wasn't
  // enough to get under budget, and guessing which side of a colon/dash
  // holds the real keyword was tested in the slug-rename project and
  // caused verified keyword loss in both directions. Skip it: leave the
  // original title in place. Google will still auto-truncate it gracefully
  // with "…" at display time, same as it does today - no regression.
  return { seoTitle: title, confidence: "skipped" };
}

async function main() {
  const articles: Array<{ slug: string; title: string }> = await fs.readJson(INDEX_JSON_PATH);

  const rows: string[] = [
    "slug,original_title,original_display_len,proposed_seo_title,proposed_display_len,confidence",
  ];
  let flagged = 0;
  let highConfidence = 0;
  let skipped = 0;
  const seenTitles = new Map<string, string>(); // proposed title -> first slug that used it

  for (const a of articles) {
    const title = (a.title || "").trim();
    const originalDisplayLen = title.length + SUFFIX.length;
    if (originalDisplayLen <= 60) continue; // already fine, not flagged

    flagged++;
    let { seoTitle, confidence } = proposeSeoTitle(title);

    // Safety net: if this proposed title collides with a different article's
    // proposed title, don't risk duplicate meta titles - skip both instead.
    if (confidence === "high") {
      const clashSlug = seenTitles.get(seoTitle.toLowerCase());
      if (clashSlug && clashSlug !== a.slug) {
        confidence = "skipped";
        seoTitle = title;
      } else {
        seenTitles.set(seoTitle.toLowerCase(), a.slug);
      }
    }

    if (confidence === "high") highConfidence++;
    else skipped++;

    const proposedDisplayLen = seoTitle.length + SUFFIX.length;
    rows.push(
      [
        a.slug,
        csvEscape(title),
        String(originalDisplayLen),
        csvEscape(seoTitle),
        String(proposedDisplayLen),
        confidence,
      ].join(",")
    );
  }

  await fs.writeFile(OUT_CSV, rows.join("\n"), "utf-8");
  console.log(`Flagged ${flagged} / ${articles.length} articles whose "title | ExtensionTo" exceeds ~60 characters.`);
  console.log(`  -> ${highConfidence} have a safe, high-confidence shortened seo_title proposed.`);
  console.log(`  -> ${skipped} were left unchanged (no safe rewrite found - avoids risking quality/duplicates).`);
  console.log(`Report written to ${path.relative(ROOT, OUT_CSV)}`);
}

main().catch((e) => {
  console.error("Audit failed:", e);
  process.exit(1);
});
