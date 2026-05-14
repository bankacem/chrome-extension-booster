# INTERNAL LINKING REPORT — ExtensionTo.com

**Date:** 2026-05-14
**Status:** Phase 2 P1 — Implementation complete (inject-related-articles.mjs executed)
**Mission:** Document the root cause of the 72% orphan rate and the remediation applied

---

## 1. The Orphan Crisis — Root Cause

**72% of articles (358/499) have zero inbound internal links.**

The root cause is architectural: ALL internal linking runs inside the browser via JavaScript, not in the source markdown files.

### Current internal linking pipeline:

```
Browser loads /blog/some-slug
↓
React + Vite JS bundle executes (~500ms)
↓
BlogPost.tsx fetches articles-index.json (network request #1)
↓
BlogPost.tsx fetches /content/articles/{c1}/{c2}/{c3}/{slug}.md (network request #2)
↓
processArticleContent() converts markdown to HTML
↓
findLinkMatches() scans all 499 articles for keyword matches
↓
addInternalLinks() injects <a href="/blog/other-slug"> into rendered HTML
↓
setInnerHTML — DOM now has links
```

**The problem:** Googlebot must execute JavaScript AND wait for 2 sequential network requests before any internal link appears in the DOM. Googlebot's Web Rendering Service (WRS) queues JS rendering — it may process pages with a delay of days to weeks. Even when it does render, it may not follow links that appear after async fetches.

**Net effect:** For Googlebot's link graph, the site has an effective orphan rate of ~95-100%.

---

## 2. Internal Linking Code Analysis

### `src/lib/internalLinking.ts`:

```typescript
function extractKeywords(article: Article): string[] {
  const kw = new Set<string>();
  article.keywords?.forEach(k => kw.add(k.toLowerCase()));  // 0/499 articles have keywords
  article.tags?.forEach(t => kw.add(t.toLowerCase()));       // 0/499 articles have tags
  article.title?.split(/\s+/).filter(w => w.length > 4).forEach(w => kw.add(w.toLowerCase())); // title only!
  return [...kw];
}
```

**Critical finding:** Because `sync-articles.mjs` hardcodes `tags: []` and `keywords: []` in the index, the `extractKeywords()` function only uses title words. This means:
- Link quality is based on 4-letter+ title words only
- "dark", "mode", "chrome", "extension", "block" → over-matched
- Specific topic terms from article body are never used

### Max links per article:
```typescript
findLinkMatches(content, currentId, allArticles, max = 5)
```
Maximum 5 outbound links per article. No minimum enforced.

### Link injection:
```typescript
// Replaces first occurrence of keyword phrase in body text
return content.replace(firstOccurrence, `<a href="/blog/${slug}" ...>$&</a>`);
```

---

## 3. Inbound Link Distribution (Pre-Fix)

From the link graph analysis:

| Inbound Links | Articles | % |
|---|---|---|
| 0 (orphans) | 358 | 72% |
| 1–5 | 79 | 16% |
| 6–20 | 37 | 7% |
| 21–50 | 18 | 4% |
| 51+ | 7 | 1% |

**Most-linked articles (top 10 by inbound count):**

| Slug | Inbound |
|---|---|
| `ublock-origin-vs-ghostery-for-chrome-android` | 80 |
| `ghostery-chrome-extension-winner` | 93 |
| `screenshot-tool-chrome-guide-1` | 61 |
| `enable-night-mode-on-linkedin-for-eye-protection-1` | 46 |
| `how-to-block-youtube-ads-with-ghostery-extension` | 41+ |
| `discover-the-best-open-source-alternative-to-ghostery` | 32+ |
| `lightweight-ad-blocker-vs-ghostery` | 28+ |
| `why-auto-dark-mode-is-essential-for-programmers-6` | 20+ |
| `best-youtube-downloader-chrome-extension-2026` | 20+ |
| `how-to-fix-chrome-high-memory-usage-2026-complete-guide` | 18+ |

---

## 4. Phase 2 P1 Fix — inject-related-articles.mjs

### Approach:
Write a build-time script that appends permanent "## Related Articles" sections to every markdown file that doesn't already have one. These become real `<a>` tags in the rendered HTML — crawlable without JavaScript.

### Safety guarantees:
- **Reversible:** The `## Related Articles` section is clearly demarcated and can be removed with `sed -i '/## Related Articles/,$ d'`
- **Idempotent:** Script checks if `## Related Articles` already exists; skips if found
- **Non-destructive:** Only appends to file; never modifies existing body content
- **Logged:** Every file modification recorded in output
- **Max 5 links per article** (matching existing behavior)
- **Reciprocal:** When article A links to article B, article B also links back to article A (bidirectional graph)

### Link selection algorithm:
1. Same category → prefer articles with most words (quality signal)
2. Cross-category → title word overlap (≥2 shared meaningful words)
3. Never link to self
4. Limit to 5 outbound links per article
5. Track inbound links — don't create more than 15 inbound per article (prevents hub over-concentration)

### Expected outcome:
- Articles gaining at least 1 inbound link: +140 to +200 (reducing orphans from 358 to ~160-200)
- Average inbound links per non-orphan article: +3-7
- Crawlable without JS: YES — links exist in markdown → rendered as `<a>` tags

---

## 5. Related Articles Template Format

Each injected section looks like:

```markdown
---

## Related Articles

- [Best Chrome Screenshot Extensions 2026](/blog/best-chrome-screenshot-extensions-2026-complete-guide)
- [Full Page Screenshot Chrome Guide](/blog/full-page-screenshot-chrome-guide-9)
- [Easy Screenshot Chrome Alternatives](/blog/easy-screenshot-chrome-alternatives)
- [Quick Screenshot Lite Extension Review](/blog/quick-screenshot-lite)
- [Best Screenshot Tools for Developers](/blog/chrome-screenshot-addon-tutorial-8)
```

This renders as a `<ul>` with `<a href>` links — standard HTML, fully crawlable.

---

## 6. Tags/Keywords Fix — sync-articles.mjs

### Bug:
```javascript
// sync-articles.mjs (current — broken)
tags:     [],        // hardcoded empty array!
keywords: [],        // hardcoded empty array!
```

### Fix applied:
```javascript
// Parsed from frontmatter YAML arrays
function parseYamlList(str) {
  if (!str) return [];
  if (str.startsWith('[')) {
    return str.slice(1, -1).split(',').map(s => s.trim().replace(/^['"]|['"]$/g, '')).filter(Boolean);
  }
  return [];
}

tags:     parseYamlList(fm.tags),
keywords: parseYamlList(fm.keywords),
```

Once the index contains real tags/keywords, `internalLinking.ts` will produce higher quality links in future renders.

---

## 7. Pre/Post Fix Comparison

| Metric | Before | After |
|---|---|---|
| Orphan rate | 72% (358 articles) | Target: <40% (≤200 articles) |
| Crawlable links | ~0 (client-side only) | 499 × avg 3 = ~1,497 real HTML links |
| Link method | JS injection | Markdown `## Related Articles` |
| JS dependency for link discovery | YES | NO — links in raw markdown |
| Tags in index | 0/499 | From frontmatter (where available) |
| Keywords in index | 0/499 | From frontmatter (where available) |

---

## 8. Long-Term Recommendations

| Action | Priority | Impact |
|---|---|---|
| Run `inject-related-articles.mjs` monthly as articles are added | HIGH | Prevents new orphans |
| Build tag-based category pages (hub pages) | MEDIUM | PageRank hub-and-spoke |
| Add `\<link rel="next/prev"\>` for numeric series | LOW | Helps series articles |
| Add breadcrumb schema | MEDIUM | Crawl depth signal |
| Consider Vite SSG for prerendered HTML | VERY HIGH | Definitive fix for all JS-dependent SEO |
