/**
 * rewrite-remaining-titles.ts (READ-ONLY / ANALYSIS ONLY)
 *
 * For the 677 titles the automated pass couldn't safely shorten, this
 * generates several CANDIDATE short titles per article, then only accepts
 * one if it's cross-verified against the article's own declared primary
 * keyword (frontmatter `keywords:`) - i.e. generation is gated by the same
 * verification method that caught the keyword-loss bug earlier, instead of
 * guessing which side of a colon/dash holds the real content.
 *
 * Output: scripts/manual-titles-report.csv (still requires review before
 * apply-seo-titles.ts is run against it).
 */
import fs from "fs-extra";
import path from "path";

const ROOT = process.cwd();
const INDEX_JSON_PATH = path.join(ROOT, "public", "content", "articles-index.json");
const ARTICLES_DIR = path.join(ROOT, "public", "content", "articles");
const OUT_CSV = path.join(ROOT, "scripts", "manual-titles-report.csv");

const SUFFIX = " | ExtensionTo";
const TARGET_LEN = 60 - SUFFIX.length; // 46
const MIN_LEN = 15;

const STOPWORDS = new Set([
  "the", "a", "an", "for", "to", "of", "in", "on", "with", "and", "or",
  "your", "you", "chrome", "extension", "extensions", "2026", "2025", "guide", "new",
]);

function getPartitionedPath(slug: string): string {
  return path.join(ARTICLES_DIR, slug[0], slug[1], slug[2], `${slug}.md`);
}

function significantWords(s: string): string[] {
  return s
    .toLowerCase()
    .split(/[^a-z0-9]+/)
    .filter((w) => w.length > 2 && !STOPWORDS.has(w));
}

function keywordLooksValid(keyword: string): boolean {
  if (!keyword) return false;
  if (/\.(com|net|org|io)\b/i.test(keyword)) return false; // domain name, not a real topic keyword
  if (/[a-z]\d{2,}\b/i.test(keyword)) return false; // corrupted artifact like "to020"
  return true;
}

function containsKeyword(candidate: string, keyword: string): boolean {
  if (!keywordLooksValid(keyword)) return false;
  const kwWords = significantWords(keyword);
  if (kwWords.length < 2) return false; // too weak a signal to validate against reliably
  const candLower = candidate.toLowerCase();
  const matched = kwWords.filter((w) => candLower.includes(w));
  // Require at least 2/3 of the keyword's significant words to survive.
  return matched.length / kwWords.length >= 0.66;
}

const FILLER_PHRASE_RE = /\b(the ultimate guide|a comprehensive guide|the complete guide|a step-by-step guide)\b/gi;

function clean(s: string): string {
  return s
    .replace(FILLER_PHRASE_RE, "")
    .replace(/([:\-–—])\s*(to|for|on)\s+/i, "$1 ")
    .replace(/^\s*(to|for|on)\s+/i, "")
    .replace(/\s*[:\-–—]\s*$/, "")
    .replace(/\s{2,}/g, " ")
    .trim();
}

function candidatesFor(title: string): string[] {
  const out: string[] = [];
  const cleaned = clean(title);
  out.push(cleaned);

  for (const delim of [": ", " — ", " – ", " - ", " | "]) {
    const idx = title.indexOf(delim);
    if (idx > MIN_LEN) {
      out.push(clean(title.slice(0, idx)));
      out.push(clean(title.slice(idx + delim.length)));
    }
  }
  // Also try splitting the already-filler-cleaned string, in case the
  // delimiter only became reachable after removing "the ultimate guide" etc.
  for (const delim of [": ", " — ", " – ", " - ", " | "]) {
    const idx = cleaned.indexOf(delim);
    if (idx > MIN_LEN) {
      out.push(clean(cleaned.slice(0, idx)));
      out.push(clean(cleaned.slice(idx + delim.length)));
    }
  }
  return out;
}

async function main() {
  const articles: Array<{ slug: string; title: string }> = await fs.readJson(INDEX_JSON_PATH);
  const rows: string[] = ["slug,original_title,proposed_seo_title,proposed_len,keyword_used"];
  let total = 0;
  let resolved = 0;

  for (const a of articles) {
    const title = (a.title || "").trim();
    if (title.length + SUFFIX.length <= 60) continue;
    total++;

    let raw = "";
    try {
      raw = await fs.readFile(getPartitionedPath(a.slug), "utf-8");
    } catch {
      continue;
    }
    if (/^seo_title:/m.test(raw)) continue; // already fixed in an earlier pass

    const kwMatch = raw.match(/^keywords:\n((?:\s+-\s+.+\n)+)/m);
    const keyword = kwMatch ? kwMatch[1].split("\n")[0].replace(/^\s*-\s*/, "").trim() : "";

    const candidates = candidatesFor(title)
      .filter((c) => c.length >= MIN_LEN && c.length <= TARGET_LEN)
      .filter((c, i, arr) => arr.indexOf(c) === i); // dedupe

    // Prefer the LONGEST candidate that still passes keyword verification
    // (more context is better, as long as it's validated and in budget).
    candidates.sort((x, y) => y.length - x.length);

    let chosen: string | null = null;
    for (const c of candidates) {
      if (containsKeyword(c, keyword)) {
        chosen = c;
        break;
      }
    }

    if (chosen) {
      resolved++;
      const finalTitle = chosen[0].toUpperCase() + chosen.slice(1);
      rows.push(
        [a.slug, `"${title.replace(/"/g, '""')}"`, `"${finalTitle.replace(/"/g, '""')}"`, String(finalTitle.length), `"${keyword.replace(/"/g, '""')}"`].join(",")
      );
    }
  }

  await fs.writeFile(OUT_CSV, rows.join("\n"), "utf-8");
  console.log(`${total} titles still needed shortening.`);
  console.log(`-> ${resolved} resolved with a keyword-verified candidate.`);
  console.log(`-> ${total - resolved} still need actual manual/creative rewriting.`);
  console.log(`Report: ${path.relative(ROOT, OUT_CSV)}`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
