#!/usr/bin/env node
/**
 * fix-nested-broken-links.mjs
 * Second-pass fix for broken <a href="/blog/..."> tags that have nested <a> tags inside.
 * These were not matched by the first-pass regex (which required plain-text inner content).
 *
 * Strategy: For each broken slug found in a file, use depth-counting to locate
 * the exact matching </a> for the outer broken link, then remove:
 *   - the outer opening <a href="/blog/BROKEN" ...> tag
 *   - the matching closing </a>
 * This preserves all valid inner links intact.
 *
 * Run: node scripts/fix-nested-broken-links.mjs
 */

import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ARTICLES_DIR = path.join(__dirname, "../public/content/articles");
const INDEX_PATH   = path.join(__dirname, "../public/content/articles-index.json");

const index = JSON.parse(fs.readFileSync(INDEX_PATH, "utf8"));
const validSlugs = new Set(index.map((a) => a.slug));

function walkDir(dir, files = []) {
  if (!fs.existsSync(dir)) return files;
  for (const f of fs.readdirSync(dir)) {
    const fp = path.join(dir, f);
    if (fs.statSync(fp).isDirectory()) walkDir(fp, files);
    else if (fp.endsWith(".md")) files.push(fp);
  }
  return files;
}

function normalizeSlug(slug) {
  return slug
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");
}

/**
 * Finds broken <a href="/blog/SLUG"> opening tags in content.
 * Returns array of { start, end, slug, fullTag } for each match.
 */
function findBrokenOpenTags(content) {
  const results = [];
  // Match full opening <a ...> tags that reference /blog/
  const re = /<a\s[^>]*href=["']\/blog\/([^"'#?\s]+)["'][^>]*>/g;
  let m;
  while ((m = re.exec(content)) !== null) {
    const slug = m[1];
    if (!validSlugs.has(slug)) {
      const norm = normalizeSlug(decodeURIComponent(slug));
      results.push({
        start:    m.index,
        end:      m.index + m[0].length,
        fullTag:  m[0],
        slug,
        fixedSlug: validSlugs.has(norm) ? norm : null,
      });
    }
  }
  return results;
}

/**
 * Given content and the position just after an opening <a> tag,
 * find the position of the matching closing </a> using depth counting.
 * Returns { start, end } of the </a> text, or null if not found.
 */
function findMatchingClose(content, afterOpenTag) {
  let depth = 1;
  let i = afterOpenTag;

  while (i < content.length && depth > 0) {
    // Look for next <a or </a
    const openIdx  = content.indexOf("<a", i);
    const closeIdx = content.indexOf("</a>", i);

    if (closeIdx === -1) break; // no more closing tags

    if (openIdx !== -1 && openIdx < closeIdx) {
      // Another opening <a> before the next </a> — check it's a real tag
      const nextChar = content[openIdx + 2];
      if (nextChar === " " || nextChar === "\t" || nextChar === "\n" || nextChar === "\r" || nextChar === ">") {
        depth++;
        i = openIdx + 2;
      } else {
        i = openIdx + 1; // not a real tag, skip
      }
    } else {
      depth--;
      if (depth === 0) {
        return { start: closeIdx, end: closeIdx + 4 }; // 4 = length of "</a>"
      }
      i = closeIdx + 4;
    }
  }

  return null;
}

/**
 * Remove the outer broken <a> wrapper from content.
 * Processes all broken open tags, working from the END of the string
 * backwards so that string indices stay valid after each replacement.
 */
function removeOuterBrokenTags(content, brokenTags) {
  // Sort by position descending so we can safely splice from the end
  const sorted = [...brokenTags].sort((a, b) => b.start - a.start);

  let result = content;

  for (const tag of sorted) {
    const closeMatch = findMatchingClose(result, tag.end);

    if (tag.fixedSlug) {
      // REPLACE: update the href to the correct slug
      result =
        result.slice(0, tag.start) +
        tag.fullTag.replace(`/blog/${tag.slug}`, `/blog/${tag.fixedSlug}`) +
        result.slice(tag.end);
    } else if (closeMatch) {
      // REMOVE: strip the outer opening tag and its matching </a>
      // Work from end first so indices don't shift for the opening tag removal
      result =
        result.slice(0, closeMatch.start) +
        result.slice(closeMatch.end);

      // Now remove the opening tag (indices still valid since closeMatch was after it)
      result =
        result.slice(0, tag.start) +
        result.slice(tag.end);
    } else {
      // No matching </a> found — just strip the opening tag
      result =
        result.slice(0, tag.start) +
        result.slice(tag.end);
    }
  }

  return result;
}

// ─── Main ─────────────────────────────────────────────────────────────────────
const mdFiles = walkDir(ARTICLES_DIR);
let filesFixed = 0;
let linksFixed = 0;
let remaining  = 0;

for (const f of mdFiles) {
  const original = fs.readFileSync(f, "utf8");
  const broken   = findBrokenOpenTags(original);

  if (broken.length === 0) continue;

  const fixed = removeOuterBrokenTags(original, broken);

  if (fixed !== original) {
    fs.writeFileSync(f, fixed);
    filesFixed++;
    linksFixed += broken.length;
  } else {
    remaining += broken.length;
    console.warn(`  ⚠ Could not fix: ${path.basename(f)} (${broken.length} tags)`);
  }
}

console.log(`\n✓ Second-pass nested fix complete`);
console.log(`  Files fixed:   ${filesFixed}`);
console.log(`  Links fixed:   ${linksFixed}`);
console.log(`  Still remaining (manual): ${remaining}`);
