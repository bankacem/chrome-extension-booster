import * as fs from "fs";
import * as path from "path";
import * as yaml from "js-yaml";

/**
 * CAUTIOUS, DRY-RUN-BY-DEFAULT SEO fixer.
 *
 * Scope is deliberately narrow and safe:
 *   1. Truncate meta descriptions longer than 160 chars at a word/sentence
 *      boundary before 155 chars and append "...".
 *   2. Collect (do NOT auto-fill) articles missing `title` or a meta
 *      description into a diagnostic report file for human review later.
 *
 * Explicitly OUT OF SCOPE (by design):
 *   - No broken-link rewriting or <a> tag stripping (false positives + the
 *     bodies contain nested HTML that regex would corrupt).
 *   - No boilerplate/templated titles or meta descriptions.
 *   - No file deletion.
 *   - Article BODIES are never touched. Only the `meta_description` value in
 *     frontmatter may be rewritten, and only for the too-long case.
 *
 * SAFETY:
 *   - Dry-run by default: prints proposed before/after, writes no .md files.
 *   - Pass --apply to actually write the truncation changes to disk.
 *   - The diagnostic report is a new, separate file; pass --no-report to skip.
 *
 * Usage:
 *   bun scripts/seo-fixer.ts                 # dry-run, writes nothing except report
 *   bun scripts/seo-fixer.ts --apply         # apply truncations to .md files
 *   bun scripts/seo-fixer.ts --no-report     # skip writing the report file
 *
 * After --apply, run `bun run sync-articles` to rebuild the index + sitemap,
 * then review the git diff and commit yourself.
 */

const ROOT = process.cwd();
const ARTICLES_DIR = path.join(ROOT, "public", "content", "articles");
const REPORT_FILE = path.join(ROOT, "missing-meta-report.txt");

const APPLY = process.argv.includes("--apply");
const WRITE_REPORT = !process.argv.includes("--no-report");

const META_MAX = 160;
const TRUNCATE_AT = 155;

interface Frontmatter {
  title?: string;
  slug?: string;
  description?: string;
  meta_description?: string;
  [key: string]: unknown;
}

interface MissingEntry {
  relPath: string;
  slug: string;
  missingTitle: boolean;
  missingMeta: boolean;
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

/** Split a file into frontmatter text + body. Returns null if no frontmatter. */
function splitFrontmatter(content: string): { fmText: string; body: string } | null {
  const match = content.match(/^(---\n[\s\S]*?\n---)([\s\S]*)$/);
  if (!match) return null;
  return { fmText: match[1], body: match[2] };
}

function parseFm(fmText: string): Frontmatter {
  try {
    const inner = fmText.replace(/^---\n/, "").replace(/\n---$/, "");
    return (yaml.load(inner) || {}) as Frontmatter;
  } catch {
    return {};
  }
}

/**
 * Truncate at a sentence boundary before `limit` if a reasonable one exists,
 * otherwise at the last word boundary. Always appends "...".
 */
function smartTruncate(text: string, limit: number): string {
  const slice = text.slice(0, limit);
  const sentenceEnd = Math.max(
    slice.lastIndexOf(". "),
    slice.lastIndexOf("! "),
    slice.lastIndexOf("? ")
  );
  if (sentenceEnd >= 80) {
    return `${slice.slice(0, sentenceEnd + 1)}...`;
  }
  const lastSpace = slice.lastIndexOf(" ");
  const base = lastSpace > 0 ? slice.slice(0, lastSpace) : slice;
  return `${base.replace(/[\s,;:.!?-]+$/, "")}...`;
}

/** YAML-escape a value as a double-quoted single-line scalar. */
function toQuotedScalar(value: string): string {
  const escaped = value.replace(/\\/g, "\\\\").replace(/"/g, '\\"');
  return `"${escaped}"`;
}

/**
 * Replace ONLY the meta_description block in the raw frontmatter text with a
 * single quoted line, leaving every other byte untouched. Handles folded/literal
 * scalars (`>-`, `|`) spanning indented lines as well as inline values.
 * Returns null if the key can't be located (caller then skips the file).
 */
function replaceMetaDescription(fmText: string, newValue: string): string | null {
  const lines = fmText.split("\n");
  const keyIdx = lines.findIndex((l) => /^meta_description\s*:/.test(l));
  if (keyIdx === -1) return null;

  // The value block ends at the next top-level key or the closing fence.
  let endIdx = keyIdx + 1;
  for (; endIdx < lines.length; endIdx++) {
    const line = lines[endIdx];
    if (line === "---") break;
    if (/^[^\s][^:]*:/.test(line)) break; // next top-level key
  }

  const replacement = `meta_description: ${toQuotedScalar(newValue)}`;
  return [...lines.slice(0, keyIdx), replacement, ...lines.slice(endIdx)].join("\n");
}

function isMissing(v: unknown): boolean {
  const s = String(v ?? "").trim().toLowerCase();
  return s === "" || s === "null" || s === "undefined";
}

function run(): void {
  console.log("=== SEO Fixer (cautious / dry-run by default) ===");
  console.log(APPLY ? "MODE: --apply (will write truncations)" : "MODE: dry-run (no .md writes)");
  console.log("");

  const files = walkDir(ARTICLES_DIR);
  console.log(`Scanned ${files.length} markdown files.\n`);

  const truncations: { relPath: string; before: string; after: string }[] = [];
  const missing: MissingEntry[] = [];
  let written = 0;
  let skippedUnsafe = 0;

  for (const file of files) {
    const relPath = path.relative(ROOT, file);
    let content: string;
    try {
      content = fs.readFileSync(file, "utf-8");
    } catch (e) {
      console.error(`[Fixer] Cannot read ${relPath}:`, e);
      continue;
    }

    const split = splitFrontmatter(content);
    if (!split) {
      console.warn(`[Fixer] No frontmatter, skipping: ${relPath}`);
      continue;
    }

    const fm = parseFm(split.fmText);
    const slug = String(fm.slug || path.basename(file, ".md"));
    const meta = String(fm.description || fm.meta_description || "").trim();

    // --- (2) Diagnostic collection: missing title / meta. NO auto-fill. ---
    const missingTitle = isMissing(fm.title);
    const missingMeta = meta.length === 0;
    if (missingTitle || missingMeta) {
      missing.push({ relPath, slug, missingTitle, missingMeta });
    }

    // --- (1) Safe truncation: only when too long AND stored in meta_description ---
    if (meta.length > META_MAX) {
      // Only rewrite the `meta_description` field. If the long value lives only
      // in `description`, leave it alone (out of scope, avoids surprise edits).
      if (isMissing(fm.meta_description)) continue;

      const truncated = smartTruncate(meta, TRUNCATE_AT);
      const newFmText = replaceMetaDescription(split.fmText, truncated);
      if (newFmText === null) {
        console.warn(`[Fixer] Could not safely locate meta_description, skipping: ${relPath}`);
        skippedUnsafe++;
        continue;
      }
      truncations.push({ relPath, before: meta, after: truncated });

      if (APPLY) {
        try {
          fs.writeFileSync(file, newFmText + split.body, "utf-8");
          written++;
        } catch (e) {
          console.error(`[Fixer] Failed to write ${relPath}:`, e);
        }
      }
    }
  }

  // --- Report: truncations ---
  console.log(`## Meta descriptions too long (>${META_MAX}) — truncation candidates: ${truncations.length}\n`);
  for (const t of truncations.slice(0, 40)) {
    console.log(`- ${t.relPath}`);
    console.log(`    before (${t.before.length}): ${t.before}`);
    console.log(`    after  (${t.after.length}): ${t.after}`);
  }
  if (truncations.length > 40) console.log(`  ...and ${truncations.length - 40} more`);

  // --- Report: missing title / meta (diagnostic only) ---
  console.log(`\n## Missing title or meta description (review manually): ${missing.length}`);
  console.log("(These are NOT auto-filled — collected for human review.)");

  if (WRITE_REPORT) {
    const lines: string[] = [];
    lines.push("SEO Fixer — Missing Title / Meta Description Report");
    lines.push(`Generated: ${new Date().toISOString()}`);
    lines.push(`Total flagged: ${missing.length}`);
    lines.push("");
    lines.push("file\tmissing_title\tmissing_meta\tslug");
    for (const m of missing) {
      lines.push(`${m.relPath}\t${m.missingTitle ? "YES" : "-"}\t${m.missingMeta ? "YES" : "-"}\t${m.slug}`);
    }
    try {
      fs.writeFileSync(REPORT_FILE, lines.join("\n") + "\n", "utf-8");
      console.log(`\nDiagnostic report written to: ${path.relative(ROOT, REPORT_FILE)}`);
    } catch (e) {
      console.error(`[Fixer] Failed to write report file:`, e);
    }
  }

  // --- Summary ---
  console.log("\n=== Summary ===");
  console.log(`Files scanned:                 ${files.length}`);
  console.log(`Too-long meta (truncatable):   ${truncations.length}`);
  console.log(`Skipped (unsafe to locate):    ${skippedUnsafe}`);
  console.log(`Missing title/meta (flagged):  ${missing.length}`);
  if (APPLY) {
    console.log(`Files written (truncations):   ${written}`);
    console.log("\nNext: run `bun run sync-articles`, review the git diff, then commit yourself.");
  } else {
    console.log("\nDRY-RUN: no .md files were modified. Re-run with --apply to write truncations.");
  }
}

run();
