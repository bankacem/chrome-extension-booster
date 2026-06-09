import * as fs from "fs";
import * as path from "path";
import * as yaml from "js-yaml";
 
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
 
function toQuotedScalar(value: string): string {
  const escaped = value.replace(/\\/g, "\\\\").replace(/"/g, '\\"');
  return `"${escaped}"`;
}
 
function replaceMetaDescription(fmText: string, newValue: string): string | null {
  const lines = fmText.split("\n");
  const keyIdx = lines.findIndex((l) => /^meta_description\s*:/.test(l));
  if (keyIdx === -1) return null;
 
  let endIdx = keyIdx + 1;
  for (; endIdx < lines.length; endIdx++) {
    const line = lines[endIdx];
    if (line === "---") break;
    if (/^[^\s][^:]*:/.test(line)) break; 
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
 
    const missingTitle = isMissing(fm.title);
    const missingMeta = meta.length === 0;
    if (missingTitle || missingMeta) {
      missing.push({ relPath, slug, missingTitle, missingMeta });
    }
 
    if (meta.length > META_MAX) {
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
 
  console.log(`## Meta descriptions too long (>${META_MAX}) — truncation candidates: ${truncations.length}\n`);
  for (const t of truncations.slice(0, 20)) {
    console.log(`- ${t.relPath}`);
    console.log(`    before (${t.before.length}): ${t.before}`);
    console.log(`    after  (${t.after.length}): ${t.after}`);
  }
  if (truncations.length > 20) console.log(`  ...and ${truncations.length - 20} more`);
 
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