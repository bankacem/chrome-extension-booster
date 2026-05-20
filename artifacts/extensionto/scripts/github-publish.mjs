#!/usr/bin/env node
/**
 * github-publish.mjs
 * Runs in GitHub Actions — publishes scheduled articles that are due now.
 * No Supabase, no Vite — works directly on Markdown files.
 * Run: node scripts/github-publish.mjs
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname      = path.dirname(fileURLToPath(import.meta.url));
const ARTICLES_DIR   = path.resolve(__dirname, '../public/content/articles');
const DRAFTS_INDEX   = path.resolve(__dirname, '../public/content/drafts-index.json');
const ARTICLES_INDEX = path.resolve(__dirname, '../public/content/articles-index.json');
const DAILY_LIMIT    = 2;

function readJson(p) {
  try { return JSON.parse(fs.readFileSync(p, 'utf8')); } catch { return []; }
}
function writeJson(p, data) {
  fs.writeFileSync(p, JSON.stringify(data, null, 2), 'utf8');
}

function parseFm(content) {
  const m = content.match(/^---([\s\S]*?)---/);
  if (!m) return {};
  const out = {};
  for (const line of m[1].split('\n')) {
    const kv = line.match(/^([a-zA-Z_][a-zA-Z0-9_]*):\s*(.*)/);
    if (!kv) continue;
    let v = kv[2].trim();
    if ((v.startsWith('"') && v.endsWith('"')) || (v.startsWith("'") && v.endsWith("'"))) v = v.slice(1, -1);
    out[kv[1]] = v;
  }
  return out;
}

function updateFm(content, updates) {
  const m = content.match(/^---([\s\S]*?)---/);
  if (!m) return content;
  let fm = m[1];
  for (const [key, val] of Object.entries(updates)) {
    // Match key line + any indented continuation lines (handles YAML block scalars)
    const re = new RegExp(`^${key}:[ \\t]*[^\\n]*(?:\\n[ \\t]+[^\\n]*)*`, 'm');
    const line = val === null ? `${key}: null` : `${key}: "${val}"`;
    if (re.test(fm)) fm = fm.replace(re, line);
    else fm += `\n${line}`;
  }
  return content.replace(/^---([\s\S]*?)---/, `---${fm}---`);
}

function findMdFile(slug) {
  const norm = slug.toLowerCase().replace(/[^a-z0-9]/g, '-').replace(/-+/g, '-').replace(/^-|-$/g, '');
  const [c1 = '_', c2 = '_', c3 = '_'] = norm.split('');
  const p = path.join(ARTICLES_DIR, c1, c2, c3, `${norm}.md`);
  return fs.existsSync(p) ? p : null;
}

async function main() {
  const now = new Date();
  const todayStr = now.toISOString().slice(0, 10);
  console.log(`[github-publish] Running at ${now.toISOString()}`);

  const drafts   = readJson(DRAFTS_INDEX);
  const articles = readJson(ARTICLES_INDEX);

  // Idempotency: count how many were already published today
  const todayPublished = articles.filter(a =>
    a.published_at && a.published_at.startsWith(todayStr)
  ).length;

  console.log(`[github-publish] Published today: ${todayPublished}/${DAILY_LIMIT}`);

  if (todayPublished >= DAILY_LIMIT) {
    console.log(`[github-publish] Daily limit reached. Nothing to publish.`);
    return;
  }

  const remaining = DAILY_LIMIT - todayPublished;

  // Only publish articles with status === "scheduled" that are due now
  const due = drafts
    .filter(d => d.status === 'scheduled' && d.scheduled_at && new Date(d.scheduled_at).getTime() <= now.getTime())
    .sort((a, b) => new Date(a.scheduled_at).getTime() - new Date(b.scheduled_at).getTime())
    .slice(0, remaining);

  if (due.length === 0) {
    console.log(`[github-publish] No scheduled articles are due now.`);
    return;
  }

  console.log(`[github-publish] Articles to publish: ${due.map(d => d.slug).join(', ')}`);

  const publishedSlugs = [];

  for (const draft of due) {
    const publishedAt = now.toISOString();
    const mdPath = findMdFile(draft.slug);

    if (!mdPath) {
      console.error(`[github-publish] ERROR: Markdown file not found for slug "${draft.slug}" — skipping.`);
      continue;
    }

    // Update frontmatter
    let content = fs.readFileSync(mdPath, 'utf8');
    content = updateFm(content, {
      status: 'published',
      published_at: publishedAt,
      scheduled_at: null,
    });
    fs.writeFileSync(mdPath, content, 'utf8');

    // Move from drafts to articles index
    const relPath = mdPath.replace(path.resolve(__dirname, '../public'), '');
    const entry = {
      ...draft,
      status: 'published',
      published_at: publishedAt,
      scheduled_at: null,
      updated_at: publishedAt,
      filePath: relPath,
      canonicalPath: `/blog/${draft.slug}`,
    };

    articles.unshift(entry);
    publishedSlugs.push(draft.slug);
    console.log(`✅ Published: ${draft.slug}`);
  }

  if (publishedSlugs.length === 0) {
    console.log(`[github-publish] No articles were published (all had missing files).`);
    return;
  }

  // Save updated indexes
  const remainingDrafts = drafts.filter(d => !publishedSlugs.includes(d.slug));
  writeJson(ARTICLES_INDEX, articles);
  writeJson(DRAFTS_INDEX, remainingDrafts);

  console.log(`[github-publish] Done. Published ${publishedSlugs.length} article(s).`);
}

main().catch(e => { console.error(e); process.exit(1); });
