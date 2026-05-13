# Architecture Recommendations — extensionto.com
**Audit Date:** May 13, 2026
**Status:** READ-ONLY. No changes made. Recommendations only.

---

## Executive Summary

The site has a solid foundation (React + Vite, clean markdown pipeline, working sync scripts) but three architectural decisions are creating compounding SEO harm: **(1) pure client-side rendering**, **(2) an unstructured content pipeline that produces volume over quality**, and **(3) dormant internal linking infrastructure that was never activated**. Fixing these three issues — in order of priority — will have the largest impact on organic visibility.

---

## 1. Rendering Architecture

### Current State

```
Browser → GET /blog/slug → Returns index.html (empty shell)
                          → React boots
                          → Fetches /content/articles-index.json (635 KB)
                          → Finds matching article metadata
                          → Fetches /content/articles/{3-char-path}/slug.md
                          → Parses frontmatter + markdown
                          → Injects SEO meta via react-helmet-async
                          → Renders content
```

**Total round trips before content visible:** 3+ (HTML, index JSON, markdown file)
**Time before Googlebot sees indexable content:** 300ms–2000ms+ (requires JS execution)
**Meta tags visible in raw HTML:** None (empty `<head>` in initial response)

### Recommended: Static Site Generation (SSG) at Build Time

The current build pipeline already runs `sync-articles.mjs` at build time. Extending this to pre-render article HTML is architecturally straightforward.

**Option A: Vite SSG (minimal change)**
Use `vite-plugin-ssg` or `vite-ssg` to pre-render all article routes at build time. This produces static HTML files for every route with meta tags baked in.

```
Build step: sync-articles → generate-sitemap → vite-ssg build
Output: /dist/blog/[slug]/index.html (pre-rendered with meta, content, schema)
```

**Option B: Migrate to Next.js or Astro (larger change)**
- **Astro** is ideal for a content-heavy markdown site — it outputs zero-JS static HTML by default
- **Next.js** provides `getStaticProps` + `generateStaticParams` for SSG with React

**Recommendation:** Implement vite-ssg in the short term (lowest friction) and evaluate Astro for a future rebuild.

**Expected SEO improvement from SSG:** High — meta tags, canonical URLs, and structured data visible in raw HTML immediately. Articles discoverable by crawlers that do not execute JavaScript.

---

## 2. Internal Linking — Activate the Existing System

### Current State

The file `artifacts/extensionto/src/lib/internalLinking.ts` contains a complete, working internal linking engine:
- `extractKeywords()` — pulls keywords from article metadata
- `findLinkMatches()` — matches keywords against the article corpus
- `addInternalLinks()` — injects `<a href="/blog/{slug}">` tags into content
- `generateRelatedArticlesSection()` — builds a related articles block

**This system is entirely unused.** `BlogPost.tsx` calls `processArticleContent()` which only handles image resolution, YouTube embeds, and heading demotion. `addInternalLinks()` is never invoked anywhere.

### Recommended Fix

In `BlogPost.tsx`, after fetching the article index and the markdown content, call the internal linking pipeline:

```typescript
// After fetching allArticles and processing content:
import { findLinkMatches, addInternalLinks } from "@/lib/internalLinking";

const matches = findLinkMatches(
  processedContent,
  fullArticle.id,
  allArticles,
  5 // max 5 internal links per article
);

const linkedContent = matches.length > 0
  ? addInternalLinks(processedContent, matches)
  : processedContent;
```

**Note:** The internal linking regex in `addInternalLinks()` uses `\b` word boundaries which may not work correctly for hyphenated keywords or phrases. Review the regex before activating for production.

**Expected impact:** Each article gains 3–5 contextual internal links, distributing PageRank across the site and providing Google with topic cluster signals.

### Related Articles Improvement

The current related articles system (`relatedArticles` in BlogPost.tsx) filters only by `category`. Given that 217 articles share the same wrong category ("Screenshots & Screen Capture"), this produces entirely unrelated recommendations for most articles.

**Recommended:** Use tag overlap + keyword overlap scoring instead of (or in addition to) category matching. The `generateRelatedArticlesSection` function in `internalLinking.ts` already implements this logic.

---

## 3. Content Pipeline Quality Gates

### Current State

The AI generation pipeline (Supabase Edge Function `generate-article/index.ts`) produces articles with:
- No minimum word count enforcement
- No category validation (all new articles default to wrong categories)
- No uniqueness check against existing articles before publishing
- No meta description requirement before publishing
- `author: AI Generator` hardcoded

### Recommended Quality Gates

Add pre-publish validation checks to the generation pipeline:

**Gate 1: Minimum Content Requirements**
- Word count ≥ 600 words (currently some articles are 161 words)
- `meta_description` must be populated (currently missing for all 499 in index)
- `excerpt` must be unique (currently 40 articles share identical boilerplate excerpt)
- `category` must be one of a defined enum (currently produces 15 inconsistent values)

**Gate 2: Cannibalization Check**
Before publishing a new article, check if 3+ existing articles already cover the same primary keyword:
```
if (existingArticlesForKeyword >= 3) {
  → Flag for human review instead of auto-publishing
  → Suggest: update existing pillar article instead
}
```

**Gate 3: Author Attribution**
Replace "AI Generator" with a human-sounding editorial handle (e.g., "ExtensionTo Editorial Team") for articles that have been reviewed. Set "AI Generator" as a draft-only author label that gets replaced on publish.

---

## 4. Routing & Canonical URL Architecture

### Current Issues

**Issue 1: SPA fallback causes canonical ambiguity**

The production config uses:
```toml
[[services.production.rewrites]]
from = "/*"
to = "/index.html"
```

This means `/blog/slug` and `/blog/slug/` and any typo route all serve the same `index.html` shell. Without server-side canonical header injection, Google may index multiple URL variants.

**Recommendation:** Add explicit redirect rules for trailing slashes and case normalization in the rewrite config.

**Issue 2: Search-and-Rescue fuzzy URL rewriting**

`BlogPost.tsx` uses `window.history.replaceState()` to silently rewrite the URL when a fuzzy match is found. This is a client-side URL change with no server-side 301 redirect — meaning:
- The old URL remains crawlable and indexable
- Both URLs serve the same content with the same canonical
- Google may choose either URL to index

**Recommendation:** When a fuzzy match corrects a URL, issue a server-side 301 redirect instead of a client-side replaceState. In a SPA this requires a redirect table maintained server-side or in the static config.

**Issue 3: `/admin` and `/settings` routes are publicly crawlable**

These pages are accessible to all crawlers. Add `<meta name="robots" content="noindex, nofollow">` to all admin routes immediately.

---

## 5. Database Architecture

### Current State

The Supabase PostgreSQL database has the following tables (from migration files):

**`public.articles` table:**
```sql
id UUID PRIMARY KEY
title TEXT NOT NULL
slug TEXT UNIQUE NOT NULL
content TEXT NOT NULL
excerpt TEXT
featured_image TEXT
category TEXT DEFAULT 'General'
tags TEXT[]
keywords TEXT[]
meta_description TEXT
status TEXT CHECK (draft|published|scheduled)
published_at TIMESTAMPTZ
scheduled_at TIMESTAMPTZ
author TEXT DEFAULT 'Admin'
views INTEGER DEFAULT 0
read_time INTEGER DEFAULT 5
created_at TIMESTAMPTZ
updated_at TIMESTAMPTZ
```

**`public.seo_agent_memory` table:**
```sql
id UUID PRIMARY KEY
user_id UUID
keyword TEXT NOT NULL
niche TEXT
model TEXT
strategy JSONB
competitor_data JSONB
cluster JSONB
ctr JSONB
word_count INTEGER
successful_patterns JSONB
created_at TIMESTAMPTZ
```

**Current usage:** The app no longer reads from Supabase at render time — content is served from flat markdown files. The database appears to be used only by the admin interface for editing and the AI generator for creation, with `sync-articles.mjs` exporting to markdown.

### Recommended Schema Improvements

**Add missing fields to `articles` table:**
```sql
ALTER TABLE articles ADD COLUMN canonical_path TEXT;
ALTER TABLE articles ADD COLUMN schema_json JSONB;
ALTER TABLE articles ADD COLUMN word_count INTEGER;
ALTER TABLE articles ADD COLUMN language TEXT DEFAULT 'en';
ALTER TABLE articles ADD COLUMN noindex BOOLEAN DEFAULT false;
ALTER TABLE articles ADD COLUMN redirect_to TEXT;
ALTER TABLE articles ADD COLUMN quality_score INTEGER;
ALTER TABLE articles ADD COLUMN reviewed_by TEXT;
```

**Add category constraint:**
```sql
ALTER TABLE articles ADD CONSTRAINT valid_category 
CHECK (category IN (
  'Ad Blocking', 'Privacy & Security', 'Performance & Memory',
  'Screenshot & Screen Capture', 'Downloads & Media', 'Productivity',
  'Dark Mode & Themes', 'Developer Tools', 'Tab Management',
  'Mobile Extensions', 'Social Media', 'Video & YouTube', 'General'
));
```

**Add word count guard:**
```sql
-- Add a check that rejects articles under 400 words from being published
ALTER TABLE articles ADD CONSTRAINT minimum_content_length
CHECK (status != 'published' OR length(content) > 2000);
```

---

## 6. Category Taxonomy — Define a Canonical Taxonomy

### Current State (Broken)

15 inconsistent category values with no constraint:
- "Screenshots & Screen Capture" vs "Screenshot Tools" (2 variants)
- "Security & Privacy" vs "Privacy & Security" (reversed)
- "Performance & Memory" vs "Performance" (inconsistent)
- "Productivity & Tools" vs "Productivity" (inconsistent)
- "Media & Downloads" (1 article) vs no downloads category for 50 other articles

### Recommended Canonical Taxonomy (13 categories)

| Category Slug | Display Name | Target Articles |
|---|---|---|
| `screenshot` | Screenshot & Screen Capture | ~20 |
| `download` | Downloads & Media | ~15 |
| `ad-blocking` | Ad Blocking | ~10 |
| `privacy-security` | Privacy & Security | ~15 |
| `performance-memory` | Performance & Memory | ~15 |
| `tab-management` | Tab Management | ~10 |
| `dark-mode-themes` | Dark Mode & Themes | ~10 |
| `productivity` | Productivity & Workflow | ~20 |
| `developer-tools` | Developer Tools | ~15 |
| `mobile-extensions` | Mobile & Android | ~15 |
| `social-media` | Social Media | ~10 |
| `video-youtube` | Video & YouTube | ~15 |
| `general` | General Chrome Extensions | ~30 |

This taxonomy should be enforced at the database level with a CHECK constraint and at the UI level with a validated dropdown in the admin panel.

---

## 7. Slug Quality Improvements

### Issues Found

1. **221 articles have slugs > 80 characters** — despite the `cleanSlug()` utility having `maxLen = 80`
2. **2 articles have corrupted/doubled slugs** (title duplicated mid-word at the ~50-char mark)
3. **204 articles retain `mm`-hash suffixes** in filenames (e.g., `-mme0ixsa1fx`) — the `stripLegacySuffix()` utility exists but is not applied to existing files
4. **Numeric suffixes** used for collision avoidance instead of meaningful disambiguation (e.g., `-1`, `-2`, `-3` on the same base topic)

### Recommendations

**Short-term:**
- Apply `stripLegacySuffix()` to all 204 mm-hash slugs during the consolidation rewrite
- Fix the 2 corrupted files (delete and recreate with correct slugs + 301 redirects)
- Enforce the 80-char slug limit in the generation pipeline (currently violated for 221 articles)

**Slug collision strategy:** Instead of appending a number (`-2`, `-3`), use a meaningful disambiguator:
```
best-screenshot-extensions-for-chrome      ← pillar
best-screenshot-extensions-for-developers  ← developer sub-topic
best-screenshot-extensions-for-full-page   ← use-case sub-topic
```

---

## 8. Immediate Action Plan (Priority Ordered)

### Phase 0 — Emergency Fixes (No build required, edit files directly)

| Action | Files | Impact |
|---|---|---|
| Add `noindex` to admin/settings routes | `App.tsx` | Protect crawl budget |
| Add `Disallow: /settings /admin` to robots.txt | `public/robots.txt` | Stop crawl waste |
| Remove 5 partial articles from index + sitemap | `articles-index.json`, `sitemap.xml` | Remove thin content |
| Noindex 4 stub articles (<200 words) | Article frontmatter | Remove thin content |

### Phase 1 — Content Consolidation (2–4 weeks)

| Action | Articles Affected | Impact |
|---|---|---|
| Merge screenshot cluster → 3–5 articles + 301s | 51 | Major ranking improvement |
| Merge download cluster → 5–8 articles + 301s | 50 | Major ranking improvement |
| Fix boilerplate excerpts for 40 articles | 40 | Snippet quality |
| Fix category mislabeling | 200+ | Internal linking accuracy |
| Correct meta descriptions in index export | 499 | SERP display quality |

### Phase 2 — Technical SEO (4–8 weeks)

| Action | Complexity | Impact |
|---|---|---|
| Implement vite-ssg or similar SSG | High | CRITICAL — makes meta tags crawlable |
| Activate internal linking pipeline | Low | Medium — distributes PageRank |
| Add sitemap index file | Low | Medium — better crawl management |
| Fix related articles to use tag/keyword matching | Low | Medium — better user experience |
| Add priority tiering to sitemap | Low | Low-Medium |

### Phase 3 — Pipeline Quality (Ongoing)

| Action | Impact |
|---|---|
| Add pre-publish quality gates to AI generator | Prevents future cannibalization |
| Enforce canonical category taxonomy | Prevents future mislabeling |
| Add minimum word count to publishing flow | Prevents future thin content |
| Implement human review step before publishing | Aligns with Google's helpfulness signals |
| Replace "AI Generator" author with editorial name | Reduces AI content signals |
