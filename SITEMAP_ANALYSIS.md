# Sitemap Analysis — extensionto.com
**Audit Date:** May 13, 2026
**File:** `artifacts/extensionto/public/sitemap.xml`
**Generator Script:** `artifacts/extensionto/scripts/generate-sitemap.mjs`
**Status:** READ-ONLY. No changes made.

---

## 1. Sitemap Overview

| Metric | Value |
|---|---|
| Total entries | 512 |
| Blog article entries | 499 |
| Static page entries | 4 |
| Extension page entries | 9 |
| File size (estimated) | ~3,062 lines |
| Format | Single flat XML file |
| Sitemap index file | None |
| XSL stylesheet | Yes (`/sitemap.xsl`) |
| Encoded in sitemap.xml | UTF-8 |

---

## 2. Index ↔ Sitemap ↔ Disk Cross-Reference

| Check | Result |
|---|---|
| Articles in index (`articles-index.json`) | 499 |
| Articles in sitemap | 499 |
| Article files on disk | 499 |
| In index but NOT in sitemap | **0** |
| In sitemap but NOT in index | **0** |
| Files on disk NOT in index | **0** |
| In index but file missing on disk | **0** |

**Conclusion:** Index, sitemap, and disk are in perfect sync. The build pipeline (`sync-articles.mjs → generate-sitemap.mjs`) functions correctly for synchronization purposes. This is the healthiest part of the SEO architecture.

---

## 3. Sitemap Generation Logic

The sitemap is generated at build time by `generate-sitemap.mjs`. Key behavior:

**Static pages included:**
```
/ (priority 1.0, weekly)
/blog (priority 0.9, daily)
/privacy (priority 0.3, yearly)
/terms (priority 0.3, yearly)
```

**Extension pages included:**
```
/extension/quick-screenshot-lite (priority 0.8, monthly)
/extension/auto-dark-mode-switcher
/extension/redirect-shield
/extension/protab-suspender
/extension/light-popup-blocker
/extension/formula-builder-pro
/extension/securakey-pro
/extension/offline-reader-pro
/extension/cookie-banner-blocker
```

**Blog articles:**
- All articles from `articles-index.json`
- Default priority: `0.7`
- Default changefreq: `monthly`
- 5 designated "pillar" slugs receive `priority: 0.9`

**Pillar slugs with boosted priority:**
```
how-to-fix-chrome-high-memory-usage-2026-complete-guide
adblock-chrome-android-complete-guide-2026
best-chrome-screenshot-extensions-2026-complete-guide
best-chrome-privacy-extensions-2026-complete-guide
best-youtube-downloader-chrome-extension-2026
```

---

## 4. Sitemap Issues

### 4.1 No Sitemap Index File (MEDIUM)

With 512 URLs, a single `sitemap.xml` is within Google's 50,000-URL limit. However, best practice for sites with more than ~100 URLs is to use a **sitemap index** that references separate sitemaps (e.g., `sitemap-articles.xml`, `sitemap-extensions.xml`, `sitemap-static.xml`). This allows:
- Partial resubmission when only articles change
- Faster Google reconciliation of new vs. changed content
- Separate monitoring in Google Search Console per content type

**Current risk:** Low. The single sitemap works, but will not scale gracefully as content grows.

### 4.2 All Blog Articles Have Identical Priority (MEDIUM)

497 of 499 articles share `priority="0.7"`. Only 5 pillar slugs receive `priority="0.9"`. This flattening provides Google with no signal about which articles are most important, authoritative, or frequently updated.

**Missing priority differentiation signals:**
- Article word count / depth
- Number of internal links pointing to article
- Article age / freshness
- Pillar vs. supporting content role
- Category/topic cluster authority

### 4.3 `lastmod` Dates Are Static After Generation (LOW-MEDIUM)

The `lastmod` value for each article is set to `published_at` at build time. If an article is later updated (content edited, errors fixed), the `lastmod` date in the sitemap will NOT update unless the article's `published_at` frontmatter field is also updated. This means Google may deprioritize recrawling updated content.

### 4.4 `changefreq: monthly` for All Articles (LOW)

All 499 articles are tagged as `monthly` change frequency. This is fine for stable evergreen content, but:
- Articles about "2026" trends that are updated or revised should be `weekly`
- Pillar articles should be `weekly` to signal active maintenance
- New articles in the first month of publishing could reasonably be `daily` or `weekly` to attract faster indexing

### 4.5 Extension Pages Not Differentiated from Blog in Priority (LOW)

Extension pages (`/extension/*`) are core product pages — they are the primary commercial purpose of the site. They share `priority: 0.8` with `/blog`, only slightly above articles. Recommend:
- Extension pages: `priority: 0.9`
- `/blog` listing: `priority: 0.9`
- Pillar articles: `priority: 0.8`
- Standard articles: `priority: 0.6`–`0.7`

### 4.6 Corrupted Slugs Included in Sitemap (HIGH)

Two articles with corrupted/truncated filenames are included in the sitemap:

```
https://extensionto.com/blog/unlock-the-power-of-visual-content-a-compunlock-the-power-of-visual-content-a-comprehensive-guide-to-chrome-screenshot-a
```
(123-character slug with title repeated mid-word)

```
https://extensionto.com/blog/unlocking-the-power-of-chrome-captureunlocking-the-power-of-chrome-capture-tools-2025-a-comprehensive-guide-tools-2025-a
```
(123-character slug with title repeated)

These URLs will return content (the corrupted files exist on disk), but are:
- Unsightly and untrustworthy in SERPs
- Not discoverable through normal navigation
- Likely never to rank for any meaningful query

### 4.7 Partial Articles Indexed in Sitemap (HIGH)

Five incomplete "partial" articles are included in the sitemap:

```
https://extensionto.com/blog/adblock-for-android-chrome-partial
https://extensionto.com/blog/chrome-popup-blocker-partial
https://extensionto.com/blog/how-to-speed-up-chrome-partial
https://extensionto.com/blog/pop-up-blocker-for-chrome-partial
https://extensionto.com/blog/privacy-badger-chrome-partial
```

These are partial/incomplete articles that should never have been published. Their `-partial` slug suffix makes them appear as broken or test content to users landing from search.

### 4.8 4 French Articles in English Sitemap (MEDIUM)

The English-language sitemap includes 4 French articles with no language annotation:
```
https://extensionto.com/blog/ajouter-extension-chrome-8
https://extensionto.com/blog/extension-chrome-indispensable-12
https://extensionto.com/blog/extension-chrome-rafraichissement-automatique-15
https://extensionto.com/blog/extension-utile-chrome-12
```

Google will attempt to index these as English-language content, producing a language mismatch signal.

---

## 5. Sitemap vs. Backup Sitemap Comparison

The `.migration-backup/public/sitemap.xml` (prior version) had **586 URL entries** vs. the current **512**. This means **74 articles** were removed or consolidated during the migration. The current sitemap correctly reflects the active article library.

Key differences noted:
- Old sitemap: `/blog` had `priority: 0.8`
- New sitemap: `/blog` has `priority: 0.9` (improvement)
- Old sitemap had different URL patterns for some articles (migration cleaned slugs)

---

## 6. Sitemap Submission Status

No evidence in the codebase of automated sitemap submission or Google Search Console integration at the sitemap level. The `google-indexing.ts` and `bulk-index.ts` scripts in the migration backup used Google's Indexing API, but these are not present in the current `artifacts/extensionto/scripts/` directory (only `sync-articles.mjs` and `generate-sitemap.mjs` exist).

**Recommended actions for sitemap submission:**
1. Submit `https://extensionto.com/sitemap.xml` manually in Google Search Console
2. Verify all 512 URLs are reported as "Submitted"
3. Monitor the "Excluded" tab for any URLs being blocked or errored

---

## 7. Crawl Budget Concerns

At 512 pages and growing with AI generation, crawl budget allocation matters:

| Page Type | Count | Value | Recommendation |
|---|---|---|---|
| Homepage | 1 | High | Always crawl |
| Extension pages | 9 | High | Always crawl |
| Blog listing | 1 | High | Always crawl |
| Pillar articles | 5 | High | Weekly crawl |
| Thin articles (<200 words) | 4 | Low/None | Noindex or remove |
| Partial articles | 5 | None | Noindex or remove |
| Corrupted slug articles | 2 | None | Redirect or remove |
| Admin/settings pages | 5 | None | Noindex/disallow |
| Standard articles | ~474 | Medium | Monthly crawl |

**Immediate crawl budget wins:**
- Noindex/remove: 11 pages (thin + partial + corrupted)
- Disallow in robots.txt: 5 admin/settings pages

---

## 8. Recommendations

| Priority | Action |
|---|---|
| P0 | Add `noindex` to all `/settings/*` and `/admin` routes |
| P0 | Add `Disallow: /settings` and `Disallow: /admin` to robots.txt |
| P0 | Remove or redirect the 5 partial articles from sitemap |
| P0 | Remove or redirect the 4 stub articles (<200 words) |
| P0 | Fix or remove the 2 corrupted-slug articles |
| P1 | Create a sitemap index with separate article/extension/static sitemaps |
| P1 | Add priority tiers: extensions 0.9, pillars 0.8, standard 0.6, stubs noindex |
| P1 | Fix `lastmod` to update when article content changes |
| P1 | Move 4 French articles to a separate hreflang sitemap or remove them |
| P2 | Add `changefreq: weekly` to articles updated within last 30 days |
| P2 | Connect sitemap generation to Google Search Console Indexing API |
