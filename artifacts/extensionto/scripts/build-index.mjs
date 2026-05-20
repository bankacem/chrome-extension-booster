#!/usr/bin/env node
/**
 * build-index.mjs
 * Reads all .md files and rebuilds articles-index.json + drafts-index.json from disk.
 * Run: node scripts/build-index.mjs
 * (used by GitHub Actions after publishing; also aliased as `pnpm sync-articles`)
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname      = path.dirname(fileURLToPath(import.meta.url));
const ARTICLES_DIR   = path.resolve(__dirname, '../public/content/articles');
const ARTICLES_INDEX = path.resolve(__dirname, '../public/content/articles-index.json');
const DRAFTS_INDEX   = path.resolve(__dirname, '../public/content/drafts-index.json');

function parseFrontmatter(content) {
  const match = content.match(/^---([\s\S]*?)---/);
  if (!match) return {};
  const fm = {};
  for (const line of match[1].split('\n')) {
    const kv = line.match(/^([a-zA-Z_][a-zA-Z0-9_]*):\s*(.*)/);
    if (!kv) continue;
    let v = kv[2].trim();
    // strip YAML block scalars (>-, |-)
    if (v === '>-' || v === '|-' || v === '>' || v === '|') continue;
    if ((v.startsWith('"') && v.endsWith('"')) || (v.startsWith("'") && v.endsWith("'"))) {
      v = v.slice(1, -1);
    }
    fm[kv[1]] = v;
  }
  return fm;
}

function walkDir(dir) {
  const results = [];
  if (!fs.existsSync(dir)) return results;
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) results.push(...walkDir(full));
    else if (entry.name.endsWith('.md')) results.push(full);
  }
  return results;
}

const allFiles = walkDir(ARTICLES_DIR);
console.log(`Found ${allFiles.length} markdown files`);

const articles = [];
const drafts   = [];
const seenSlugs = new Set();

for (const absPath of allFiles) {
  let content;
  try { content = fs.readFileSync(absPath, 'utf8'); } catch { continue; }

  const fm     = parseFrontmatter(content);
  const slug   = (fm.slug || path.basename(absPath, '.md')).toLowerCase().replace(/[^a-z0-9]/g, '-').replace(/-+/g, '-').replace(/^-|-$/g, '');
  const status = fm.status || 'published';
  const rel    = absPath.replace(path.resolve(__dirname, '../public'), '');

  if (seenSlugs.has(slug)) {
    console.warn(`  SKIP duplicate slug: ${slug}`);
    continue;
  }
  seenSlugs.add(slug);

  const wordCount = content.split(/\s+/).length;
  const readTime  = Math.max(1, Math.round(wordCount / 200));

  const entry = {
    id:               slug,
    title:            fm.title || slug,
    slug,
    category:         fm.category || null,
    status,
    published_at:     fm.published_at || null,
    scheduled_at:     fm.scheduled_at || null,
    created_at:       fm.date || fm.created_at || null,
    updated_at:       fm.updated_at || null,
    read_time:        readTime,
    reading_time:     readTime,
    word_count:       wordCount,
    featured_image:   fm.featured_image || fm.image_url || null,
    image_url:        fm.featured_image || fm.image_url || `/images/blog/${slug}.webp`,
    meta_description: fm.meta_description || fm.description || '',
    description:      fm.description || fm.meta_description || '',
    excerpt:          fm.excerpt || '',
    filePath:         rel,
    canonicalPath:    `/blog/${slug}`,
    tags:             fm.tags ? String(fm.tags).split(',').map(t => t.trim()).filter(Boolean) : [],
    keywords:         fm.keywords ? String(fm.keywords).split(',').map(k => k.trim()).filter(Boolean) : [],
    author:           fm.author || 'ExtensionTo',
    views:            0,
  };

  if (status === 'published') {
    articles.push(entry);
  } else {
    drafts.push(entry);
  }
}

articles.sort((a, b) => new Date(b.published_at || 0) - new Date(a.published_at || 0));
drafts.sort((a, b)   => new Date(b.created_at   || 0) - new Date(a.created_at   || 0));

fs.writeFileSync(ARTICLES_INDEX, JSON.stringify(articles, null, 2), 'utf8');
fs.writeFileSync(DRAFTS_INDEX,   JSON.stringify(drafts,   null, 2), 'utf8');

console.log(`✅ articles-index.json: ${articles.length} published`);
console.log(`✅ drafts-index.json:   ${drafts.length} drafts/scheduled`);
