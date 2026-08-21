import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

const repo = path.resolve(import.meta.dirname, '..');
const slug = 'ai-tab-manager-chrome-extension-a-verification-first-buyers-guide';
const articlePath = path.join(
  repo,
  'public/content/articles/a/i/-',
  `${slug}.md`,
);

function read(file) {
  return fs.readFileSync(path.join(repo, file), 'utf8');
}

test('published AI tab manager article has safe publication metadata', () => {
  const article = fs.readFileSync(articlePath, 'utf8');
  assert.match(article, /^status: published$/m);
  assert.match(article, /^seo_title: "AI Tab Manager Chrome Extension"$/m);
  assert.doesNotMatch(article, /\]\(#\)/);
  assert.match(article, /^# AI Tab Manager Chrome Extension:/m);
  assert.match(article, /^## FAQ$/m);
  assert.match(article, /chrome:\/\/inspect\/#service-worker/);
  assert.match(article, /mitmweb/);
});

test('published AI tab manager article is indexed in the generated site files', () => {
  const index = read('public/content/articles-index.json');
  const sitemap = read('public/sitemap.xml');
  assert.match(index, new RegExp(`"slug": "${slug}"`));
  assert.match(index, new RegExp(`"canonicalPath": "/blog/${slug}"`));
  assert.match(sitemap, new RegExp(`https://extensionto\\.com/blog/${slug}`));
});
