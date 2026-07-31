/**
 * apply-seo-titles.ts
 *
 * Applies the "high" confidence seo_title proposals from
 * scripts/long-titles-report.csv to the actual article markdown files.
 *
 * Safety properties:
 *   - Only touches articles marked confidence="high" in the report.
 *   - Purely additive: inserts a single new `seo_title: "..."` line right
 *     after the opening `---` of the frontmatter. Nothing else in the file
 *     (title, body, existing YAML formatting) is touched, so there is no
 *     risk of reformatting/corrupting the rest of the frontmatter.
 *   - Skips (with a warning) any file that already has a seo_title line,
 *     rather than duplicating it.
 *   - Idempotent: safe to re-run.
 */
import fs from "fs-extra";
import path from "path";
import { parse } from "csv-parse/sync";

const ROOT = process.cwd();
const REPORT_PATH = path.join(ROOT, "scripts", "long-titles-report.csv");
const ARTICLES_DIR = path.join(ROOT, "public", "content", "articles");

function normalizeSlug(slug: string): string {
  return slug
    .toLowerCase()
    .replace(/[^a-z0-9]/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");
}

function getPartitionedPath(slug: string): string {
  const s = normalizeSlug(slug);
  const c1 = s[0] || "_";
  const c2 = s[1] || "_";
  const c3 = s[2] || "_";
  return path.join(ARTICLES_DIR, c1, c2, c3, `${s}.md`);
}

function yamlDoubleQuote(value: string): string {
  return `"${value.replace(/\\/g, "\\\\").replace(/"/g, '\\"')}"`;
}

async function main() {
  const csvText = await fs.readFile(REPORT_PATH, "utf-8");
  const rows: Array<{
    slug: string;
    original_title: string;
    proposed_seo_title: string;
    confidence: string;
  }> = parse(csvText, { columns: true, skip_empty_lines: true });

  const toApply = rows.filter((r) => r.confidence === "high");
  console.log(`Applying ${toApply.length} high-confidence seo_title values...`);

  let applied = 0;
  let alreadyHad = 0;
  const failures: string[] = [];

  for (const row of toApply) {
    const filePath = getPartitionedPath(row.slug);
    let raw: string;
    try {
      raw = await fs.readFile(filePath, "utf-8");
    } catch {
      failures.push(`${row.slug} (file not found: ${path.relative(ROOT, filePath)})`);
      continue;
    }

    if (/^seo_title:/m.test(raw.split(/^---\s*$/m)[1] || "")) {
      alreadyHad++;
      continue;
    }

    const updated = raw.replace(
      /^---\s*\n/,
      `---\nseo_title: ${yamlDoubleQuote(row.proposed_seo_title)}\n`
    );

    if (updated === raw) {
      failures.push(`${row.slug} (no frontmatter delimiter found)`);
      continue;
    }

    await fs.writeFile(filePath, updated, "utf-8");
    applied++;
  }

  console.log(`✅ Applied seo_title to ${applied} files.`);
  if (alreadyHad) console.log(`   ${alreadyHad} already had a seo_title and were left untouched.`);
  if (failures.length) {
    console.log(`⚠️  ${failures.length} could not be updated:`);
    for (const f of failures.slice(0, 20)) console.log(`   - ${f}`);
  }
}

main().catch((e) => {
  console.error("Apply failed:", e);
  process.exit(1);
});
