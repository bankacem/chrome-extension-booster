# SEO RECOVERY MASTER AUDIT — ExtensionTo.com

**Date:** 2026-05-14
**Role:** Lead SEO Recovery Engineer
**Mode:** Phase 1 — Full Read-Only Architecture Analysis
**Status:** COMPLETE — implementation follows in Phase 2

---

## 1. Architecture Overview

| Layer | Technology | SEO Implication |
|---|---|---|
| Framework | React 18 + Vite (SPA) | No server-rendered HTML — Googlebot must execute JS |
| Router | React Router DOM v7 (BrowserRouter) | All routing client-side; no static HTML per URL |
| Metadata | react-helmet-async | Meta tags injected after JS hydration |
| Canonical | SEO.tsx component via `<link rel="canonical">` | Correct logic, JS-dependent delivery |
| Schema | JSON-LD via SchemaMarkup.tsx + index.html | Article schema injected post-load; WebSite/Org schema in raw HTML |
| Content | 500 markdown files, partitioned by 3-char slug prefix | Static file serving — no CMS |
| Article index | `public/content/articles-index.json` (635KB) | Single source of truth for all metadata |
| Sitemap | `public/sitemap.xml` (generated script) | Quality-filtered; 485 article URLs |
| Internal linking | `src/lib/internalLinking.ts` | **CLIENT-SIDE ONLY** — links injected after React hydration |
| Analytics | Google Analytics 4 (G-94C4MW583Z) in index.html | Working correctly |
| Admin routes | `/admin`, `/settings/**` | NoIndex meta + robots.txt disallow |

---

## 2. Routing System Analysis

**Route map:**
```
/                        → Index (homepage)
/blog                    → Blog listing (all 499 articles, client-side fetched)
/blog/:slug              → BlogPost (dynamic, SPA)
/extension/:slug         → ExtensionPage
/admin                   → AdminLogin [noindex]
/settings                → AdminLogin [noindex]
/settings/manage         → Admin [noindex]
/settings/ai-generator   → AIGenerator [noindex]
/settings/seo-dashboard  → SEODashboard [noindex]
/settings/seo/:slug      → SEOAnalyzer [noindex]
/privacy                 → Privacy
/terms                   → Terms
/*                       → NotFound (404)
```

**Routing SEO risks:**
- All routes are client-side — Googlebot must execute JS to discover content
- No `<noscript>` fallback for any route
- No 404 status code returned for missing articles — NotFound page renders with 200 OK (SPA behavior)
- The "fuzzy match / Search-and-Rescue" in BlogPost.tsx can match wrong articles to broken URLs, creating soft redirect signals without HTTP 301

**Crawl depth via link graph:**
- Depth 1: Homepage
- Depth 2: `/blog` listing
- Depth 3: All 499 articles (reachable via blog listing links)
- Note: Crawl depth = 3 for ALL articles. However, with 0 tags/keywords in the index, the blog listing has no pagination — all 499 articles render in one giant list that Googlebot must scroll through

---

## 3. Article Generation System

**Pipeline:**
1. Admin uses `/settings/ai-generator` (noindexed)
2. Article generated via AI API (Lovable/OpenRouter/OpenAI/Gemini/Groq)
3. Saved to Supabase `articles` table
4. `publish-to-github` Supabase Edge Function publishes markdown to GitHub
5. `sync-articles.mjs` reads markdown → rebuilds `articles-index.json`
6. `generate-sitemap.mjs` reads index → rebuilds `sitemap.xml`

**Slug generation:**
- Current (fixed): `cleanSlug(title)` from `src/utils/slug.ts` — strips accents, lowercases, max 80 chars
- Historical bug: Earlier batch runs appended `mm[a-z0-9]{6,12}` machine IDs (261 articles affected)
- Collision handling: `withCollisionSuffix()` appends 4-char random ID only on true DB slug collision

**Multi-language support:**
- Generator supports: English, Arabic, French, Spanish, German
- This explains the French-language articles (`how-to-ajouter-extension-chrome-8` etc.)
- Non-English articles are indexed with English taxonomy → category mismatch

---

## 4. Slug Generation Logic — Full Analysis

**`src/utils/slug.ts`:**
```typescript
stripLegacySuffix(slug)  // removes -mm[a-z0-9]{6,12} — but only when building NEW slugs
cleanSlug(input, 80)     // NFKD normalize → strip accents → lowercase → kebab → max 80 chars
withCollisionSuffix(slug) // appends 4-char random hex only on real collision
```

**Assessment:** Slug generation is NOW correct for new articles. The 261 legacy machine-ID slugs cannot be cleaned without breaking existing URLs and backlinks. They must stay as-is with canonical tags pointing to themselves.

**Slug quality breakdown:**

| Issue | Count | % | Action |
|---|---|---|---|
| Machine ID suffix (legacy `mm`, `ml`, `m` patterns) | 261 | 52% | Keep as canonical — cannot change safely |
| Slug > 100 characters | 66 | 13% | Keep as canonical — cannot change safely |
| Numeric variant suffix (`-1` through `-15`) | ~85 | 17% | Keep as canonical — cannot change safely |
| Year-dated (`2025`, `2026`) | 67 | 13% | Acceptable — monitor yearly |
| Stub slugs (< 20 chars) | 7 | 1.4% | Mark for deletion |
| Corrupted (self-duplicated) | 2 | 0.4% | Redirect to clean equivalent |

**CRITICAL RULE:** Do NOT mass-regenerate slugs. Every URL change on an indexed page destroys ranking equity and backlink value. All existing slugs must be preserved as-is with proper canonical tags.

---

## 5. Sitemap Generation — Analysis

**`generate-sitemap.mjs` (v2):**
- Excludes: `thin`, `partial`, `corrupted_slug` quality flags
- Includes: 485 article URLs (14 excluded)
- Priorities: pillar 0.85, new (<30d) 0.8, standard 0.7
- Extension pages: 9 URLs at priority 0.9
- Static pages: 4 URLs
- **Total: ~511 URLs**

**Gaps and risks:**
1. `slug_too_long` flag is NOT a disqualifying flag — 66 long-slug articles are in the sitemap. This is correct (they should stay indexed) but should be monitored.
2. Pillar slugs hardcoded in script — must be kept in sync with actual content decisions
3. No `<image:image>` sitemap entries — featured images not indexed by Google Images
4. No sitemap index file (acceptable at <50K URLs)
5. `updated_at` field falls back to `published_at` — no true modification date tracking

---

## 6. Markdown Rendering System

**`BlogPost.tsx` processing pipeline:**
1. Fetch `articles-index.json` → extract SEO metadata immediately (fast canonical/title render)
2. "Search-and-Rescue" fuzzy matching (≥3 word overlap) — finds correct article for broken URLs
3. Fetch markdown file via partitioned path `/content/articles/{c1}/{c2}/{c3}/{slug}.md`
4. Parse YAML frontmatter (js-yaml)
5. `processArticleContent()` — resolves images, converts MD images to `<img>`, YouTube embeds, H4-H6 → H3 demotion
6. `findLinkMatches()` + `addInternalLinks()` — **client-side internal linking injection**
7. `dangerouslySetInnerHTML` renders final HTML

**Critical finding — Internal linking:**
The internal linking step (6) runs in the browser AFTER React hydration. This means:
- Links are present in the DOM Googlebot sees IF it executes JS and waits for React
- Links are NOT in the raw HTML response — no `<link>` or `<a>` tags in initial payload
- For the 72% orphan pages: Googlebot may never discover them via link traversal
- Even if Googlebot executes JS, it won't wait for async fetches of articles-index.json before crawling

**Resolution:** Links must be baked into the markdown source files at build/sync time. The `inject-related-articles.mjs` script (Phase 2 P1) addresses this.

---

## 7. Canonical URL System — Analysis

**Current implementation:**
```tsx
// SEO.tsx
const canonicalUrl = `${SITE_URL}${safePath}`;
<link rel="canonical" href={canonicalUrl} />
```

**BlogPost.tsx canonical logic:**
```tsx
canonicalPath={article.canonicalPath || `/blog/${article.slug}`}
```

**`sync-articles.mjs` sets:**
```js
canonicalPath: `/blog/${slug}`,
```

**Assessment:**
- Every article has a correct `canonicalPath` in the index
- Canonical tag is JS-rendered (react-helmet-async) — not in raw HTML
- Googlebot must execute JS to see canonical — this is the standard SPA tradeoff
- No `www` vs `non-www` canonical conflict detected (site consistently uses `https://extensionto.com`)
- **The 1 exact duplicate** (`is-ghostery-safe-to-use-a-professional-2026-review`) — both articles set themselves as canonical. The weaker one (`mmb7ltlowx4`, 1 inbound) needs to be redirected to the dominant (`mmb7srbz193`, 18 inbound).

---

## 8. Internal Linking System — Analysis

**`src/lib/internalLinking.ts`:**
- `extractKeywords(article)` — extracts from keywords[], tags[], title words
- `findLinkMatches(content, currentId, allArticles, max=5)` — keyword-based matching, max 5 links
- `addInternalLinks(content, matches)` — replaces first occurrence of keyword with `<a href="/blog/slug">`

**Critical finding:**
```
Articles with tags in index:    0 / 499
Articles with keywords in index: 0 / 499
```

The `sync-articles.mjs` sets `tags: []` and `keywords: []` unconditionally. The frontmatter may contain tags/keywords but they are NOT being read. This means `extractKeywords()` falls back only to title word extraction, severely limiting link quality.

**Impact:** Internal linker runs on a degraded keyword set — only title words, no explicit keyword or tag data.

**Phase 2 fix:** `sync-articles.mjs` must read `tags` and `keywords` from frontmatter.

---

## 9. Robots.txt — Analysis

```
User-agent: *
Allow: /
Disallow: /admin
Disallow: /settings
Disallow: /settings/
Disallow: /settings/manage
Disallow: /settings/ai-generator
Disallow: /settings/seo-dashboard
Disallow: /settings/seo/
Sitemap: https://extensionto.com/sitemap.xml
```

**Assessment:**
- Admin routes correctly disallowed
- NoIndex meta tags also applied to admin routes (double protection)
- `/blog` and `/extension/` routes correctly allowed
- No crawl rate limiting — acceptable for current size
- Missing: `Crawl-delay` not set (Google ignores it; Bing/others respect it)

---

## 10. Metadata Generation — Analysis

**Per-article metadata (from `sync-articles.mjs`):**
- `title` — from frontmatter
- `meta_description` — from frontmatter or derived from first 160 chars of body
- `canonicalPath` — always `/blog/{slug}`
- `author` — sanitized ("AI Generator" → "ExtensionTo Editorial")
- `tags` — **hardcoded to [] (BUG)** — frontmatter tags not read
- `keywords` — **hardcoded to [] (BUG)** — frontmatter keywords not read

**SEO.tsx per-page:**
- `<title>{title} | ExtensionTo</title>` — correct
- `<meta name="description">` — correct
- `<link rel="canonical">` — correct (JS-rendered)
- `<meta property="og:*">` — correct
- Article JSON-LD via SchemaMarkup.tsx — correct

**index.html static:**
- WebSite + Organization JSON-LD — correct, in raw HTML
- Google Analytics 4 — correct

---

## 11. Dynamic Routes — Analysis

**`/blog/:slug` — key behaviors:**
1. **Fuzzy search-and-rescue**: If slug doesn't match, finds closest by 3+ shared words. Silently does `window.history.replaceState()` — this is a client-side soft redirect, NOT a 301.
2. **Missing content**: If article is in index but markdown file missing → shows error state with canonical tag set to broken URL
3. **404 behavior**: SPA returns 200 with client-rendered 404 UI — search engines may index "not found" pages

**Risk:** The fuzzy search-and-rescue could match wrong articles, causing Googlebot to associate the wrong URL with the wrong content. If `slug A` → fuzzy matches `slug B`, and Googlebot crawls `slug A`, it sees `slug B`'s content rendered at `slug A`'s URL.

---

## 12. SSR/SSG Behavior

**Status: Pure SPA — no SSR, no SSG, no prerendering**

**Implication for SEO:**
- Googlebot must execute JavaScript to see ANY content
- Title and meta description from `articles-index.json` render after first async fetch
- Article content renders after second async fetch (markdown file)
- Total time to full render: 2 network round trips minimum
- Google's JS rendering service (WRS) queues JS rendering — may lag by days/weeks

**Mitigation already in place:**
- `articles-index.json` is fetched first → title/canonical available quickly
- `slugToTitle()` fallback provides instant (slug-derived) title before index loads
- Loading skeleton shows H1 title immediately

**Recommended (not implemented):** Vite SSG via `vite-ssg` or similar. This is HIGH effort but would be the definitive fix for the SPA rendering risk. Currently out of scope for safe recovery.

---

## 13. Article Storage Structure

```
public/content/
├── articles-index.json      ← source of truth (635KB)
├── articles/
│   ├── a/
│   │   ├── c/
│   │   │   └── t/
│   │   │       └── activate-dark-mode-on-wikipedia-for-night-reading-2.md
│   │   └── d/
│   │       └── ...
│   ├── b/
│   │   └── ...
│   └── [a-z0-9]/ (partitioned by first 3 chars of slug)
```

**Partition scheme:** 3-char prefix → max ~26³ = 17,576 buckets. At 500 articles, avg ~1 file per bucket. No scalability concerns.

**Risk:** If slug starts with non-alphanumeric char, `normalizeSlug()` may change the path. Currently handled correctly — all slugs normalize to `[a-z0-9-]` before path construction.

---

## 14. Duplicate Content Patterns

### Exact duplicates (same canonical intent):
- **1 exact slug duplicate:** `is-ghostery-safe-to-use-a-professional-2026-review` exists under 2 machine IDs
  - `...mmb7srbz193` (winner: 18 inbound, 1,072 words)
  - `...mmb7ltlowx4` (loser: 1 inbound, 1,067 words)

### Near-duplicate title groups (155 pairs at ≥55% Jaccard similarity):
- **12 pairs at 100% title similarity** (word-order variants)
- Concentrated in: Ghostery (23 articles), Adblock Android (13), Screenshot (20), Popup Blocker (12)

### Template duplicate patterns:
- Title template: "Unlocking [X]: The Ultimate/Comprehensive Guide to [Y]" used in ~180 articles
- Opening template: "Are you tired of [X]? Discover how [Y]..." in ~160 articles
- Closing template: "In conclusion, [restate thesis]" in ~280 articles

---

## 15. Orphan Page Detection

**Total orphans (0 inbound internal links): 358 / 499 (72%)**

Root cause: All internal links are injected client-side after JS hydration. Even articles WITH inbound links in the link graph have those links injected dynamically — they don't exist in the raw HTML or static markdown.

**Effective orphan rate for Googlebot: ~95-100%** (unless Googlebot's WRS executes JS and waits for async fetch completion before crawling links)

**Mitigation:** `inject-related-articles.mjs` script (Phase 2 P1) writes permanent `## Related Articles` sections into markdown files. These render as real `<a>` tags in the HTML that Googlebot can crawl without JS.

---

## 16. Crawl/Indexation Risks Summary

| Risk | Severity | Current State | Fix |
|---|---|---|---|
| SPA — content behind JS | HIGH | No SSR/SSG | Bake links in markdown (partial fix) |
| Client-side internal links | HIGH | 72% orphan rate | inject-related-articles.mjs |
| Exact duplicate article | HIGH | 1 pair identified | Redirect weaker slug → canonical |
| Machine ID slugs | MEDIUM | 261 articles, cannot change URLs | Canonical tags correct; monitor |
| Missing tags/keywords in index | MEDIUM | 0/499 have tags | Fix sync-articles.mjs |
| AI content pattern signals | MEDIUM | 56% boilerplate | Editorial improvement needed |
| Soft 404 (SPA, returns 200) | MEDIUM | All 404s return 200 | Acceptable — Googlebot handles this |
| Fuzzy URL match without redirect | LOW | Can serve wrong content | Monitor; low occurrence rate |
| No image sitemap | LOW | Featured images not in sitemap | Add image:image tags |

---

## 17. AI Spam Footprint Signals

| Signal | Rate | Risk Level |
|---|---|---|
| "In conclusion" boilerplate closing | 56% | HIGH |
| "Are you tired of..." pain opener | 32% | HIGH |
| "In this article we will..." template intro | 22% | MEDIUM |
| Machine ID slugs (52% of URLs) | 52% | HIGH |
| Numeric variant series (-1 through -15) | 17% | HIGH |
| Near-identical title pairs (12 exact dupes) | 2.4% | HIGH |
| French-language articles mixed in English site | ~3% | LOW |

---

## 18. Redirect Risks

**SAFE redirects (can implement without risk):**
- `is-ghostery-safe-to-use-a-professional-2026-review-mmb7ltlowx4` → `is-ghostery-safe-to-use-a-professional-2026-review-mmb7srbz193`
- Corrupted slug articles → closest valid equivalent

**DANGEROUS redirects (do NOT implement):**
- Mass slug cleanup (261 articles) → would destroy all backlinks and rankings
- Numeric variant redirects → target articles may themselves be orphans

**NEVER:**
- Create redirect chains (A → B → C)
- Mass-redirect entire slug patterns
- Redirect before confirming target page is healthy and indexed

---

## 19. Traffic Loss Risks

**If incorrectly executed, these actions would destroy traffic:**
1. Mass slug regeneration → breaks all existing Google-indexed URLs
2. Mass deletion of articles → removes crawled content from index
3. Changing `canonicalPath` logic in sync-articles.mjs → could point all canonicals to wrong URLs
4. Breaking the 3-char partition path scheme → all article file fetches fail
5. Modifying robots.txt to disallow /blog → immediate deindexation of all articles

---

## 20. SAFE vs DANGEROUS Fix Classification

### SAFE (implement now):
| Fix | Risk | Reversibility |
|---|---|---|
| Add Related Articles sections to markdown files | LOW | HIGH — find/remove section |
| Fix sync-articles.mjs to read tags/keywords from frontmatter | LOW | HIGH — revert JS change |
| Redirect single Ghostery duplicate in App.tsx | LOW | HIGH — remove Route |
| Build redirect-map.json (documentation only) | NONE | N/A |
| Add Phase 4 validation scripts (read-only) | NONE | N/A |
| Add image sitemap entries | LOW | HIGH |

### DANGEROUS (do not implement without review):
| Fix | Risk | Reason |
|---|---|---|
| Clean 261 machine-ID slugs | CRITICAL | Destroys all backlinks + ranking equity |
| Delete thin/partial articles from disk | HIGH | Cannot undo; may break inbound links |
| Mass-rewrite article content | CRITICAL | HCU risk if done programmatically |
| Add SSR/prerendering | HIGH | Complex infrastructure change |
| Change partition path scheme | CRITICAL | Breaks all article file fetches |

---

## 21. Overall Risk Assessment

| Category | Score | Grade |
|---|---|---|
| Architecture stability | Stable SPA | B |
| Canonical correctness | Correct but JS-dependent | B+ |
| Internal link infrastructure | Client-side only — critical gap | F |
| Slug hygiene (future) | Fixed (cleanSlug in use) | A |
| Slug hygiene (legacy) | 52% machine IDs | F |
| Content duplication | 19 clusters, 1 exact dupe | D |
| Metadata completeness | 100% meta desc, 0% tags | C |
| Sitemap quality | Quality-filtered, 97% coverage | A |
| Robots.txt | Correct | A |
| Schema markup | Article + WebSite + Org | A |
| **Overall** | | **C+** |
