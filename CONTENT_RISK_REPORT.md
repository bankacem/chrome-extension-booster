# Content Risk Report — extensionto.com
**Audit Date:** May 13, 2026
**Status:** READ-ONLY. No changes made.

---

## Executive Summary

The content library of 499 articles carries significant risk of Google manual action or algorithmic demotion under the Helpful Content System and Spam policies. The key risks are: mass AI generation without human review, a broken category system producing meaningless taxonomy, dozens of partial/thin articles, and boilerplate metadata repeated across hundreds of pages. Approximately **40–60% of the content library** presents content quality risks that could trigger site-wide ranking suppression.

---

## 1. AI-Generated Content at Scale

### 1.1 Author Attribution

| Author Label | Count | Risk |
|---|---|---|
| "AI Generator" | 337 | Explicit AI signal in Open Graph author tags |
| "Admin" | 160 | Neutral (human or AI, unknown) |
| "Generator" | 1 | AI signal |
| "Jules" | 1 | Human (no risk) |

337 out of 499 articles (67.5%) explicitly declare `author: AI Generator` in frontmatter. This value is output directly to the HTML as `<meta property="article:author" content="AI Generator">`, which Google reads as a direct AI authorship signal.

### 1.2 AI Title Template Patterns

The AI generator used systematic title templates that are replicated across hundreds of articles. Google's spam classifier is specifically trained to recognize these patterns:

**"Unlock the Power of / Unlocking the Power of" cluster:**
- 102 articles with "unlock-the-power-of" in the slug
- 61 articles with "unlocking-the-power-of" in the slug
- **163 articles total** — 32.7% of the entire library

**"Discover the Best / Discover the" cluster:**
- 30 articles with "discover-the-best" in slug
- Total ~35+ articles

**"Comprehensive Guide / Ultimate Guide" cluster:**
- 58 articles with "comprehensive" in slug
- 47 articles with "ultimate" in slug
- Many overlap

**Other AI signal phrases in titles/slugs:**
- "seamless browsing experience" — 17 articles
- "boost your" — 14+ articles
- "effortless" — 3 articles
- "supercharge your" — multiple articles
- "enhance your online" — 5 articles

**The concern:** These phrase patterns are characteristic of a single AI prompt template run in bulk. They produce content that:
1. Reads identically in structure and tone
2. Often provides generic, non-specific advice
3. Competes directly with each other for the same queries (cannibalization)
4. May trigger Google's "AI content at scale" spam classifier

---

## 2. Thin Content

### 2.1 Critically Thin Articles (< 200 words)

| File | Word Count | Issue |
|---|---|---|
| `privacy-security-guide.md` | 161 | Stub/placeholder |
| `youtube-tools-guide.md` | 173 | Stub/placeholder |
| `chrome-screenshot-guide.md` | 178 | Stub/placeholder |
| `adblock-android-guide.md` | 190 | Stub/placeholder |

These 4 articles are effectively stubs — they exist in the sitemap, are indexed by Google, and consume crawl budget while providing no value. 161 words is less than a typical product description.

### 2.2 Partial Articles (Explicitly Incomplete)

Five files in the content directory are explicitly marked as partial/incomplete:

| File | Issue |
|---|---|
| `adblock-for-android-chrome-partial.md` | Incomplete — partial generation |
| `chrome-popup-blocker-partial.md` | Incomplete — partial generation |
| `how-to-speed-up-chrome-partial.md` | Incomplete — partial generation |
| `pop-up-blocker-for-chrome-partial.md` | Incomplete — partial generation |
| `privacy-badger-chrome-partial.md` | Incomplete — partial generation |

These 5 articles have the word `-partial` in their filename, appear to be mid-generation saves, and are publicly indexed (they appear in the articles-index.json and sitemap.xml). They serve live HTML to visitors and Googlebot.

### 2.3 Thin Content by Excerpt Length

53 articles have excerpts under 100 characters — typically a sign that the content itself is thin, as the excerpt is meant to summarize the article:

- Excerpts of 50–99 characters cannot meaningfully summarize any topic
- These are most likely the stub/introductory articles that were never fully developed

---

## 3. Duplicate and Near-Duplicate Content

### 3.1 Boilerplate Excerpt Duplication

**40 articles** share the exact same boilerplate excerpt text (first 80 characters):
> *"Discover the future of browser extensions with our curated, high-performance directory..."*

This excerpt is factually irrelevant to the article topic in every case — it appears to be a default template value that was never replaced. Google detects duplicate descriptions across pages as a thin/low-quality signal.

### 3.2 Near-Duplicate Excerpt Clusters

| Shared Excerpt Start | Count |
|---|---|
| "Are you tired of annoying ads disrupting your browsing experience on your Androi..." | 9 |
| "Are you tired of annoying ads interrupting your YouTube videos?..." | 3 |
| "Are you tired of annoying popups and intrusive ads ruining your online experienc..." | 3 |
| "As we navigate the vast expanse of the internet, it's becoming increasingly impo..." | 3 |
| "With the vast amount of video content available online..." | 2 |
| "Are you concerned about your online privacy and security?..." | 2 |

The "Are you tired of..." opener is a classic AI writing pattern that signals template-generated content to both users and Google.

### 3.3 Meta Description Coverage

**All 499 articles are missing `meta_description` in the articles index.** The meta description is stored only in individual markdown frontmatter files. This means:
- The Blog listing page and loading state for all articles render without a description
- If Google crawls these pages before JavaScript executes, they will see no description
- Google will auto-generate its own snippet from page content, potentially unfavorable

---

## 4. Topic Cluster Oversaturation

The following topics have been severely over-produced, with many articles targeting near-identical search intent:

| Topic Cluster | Article Count | Risk |
|---|---|---|
| Screenshot tools for Chrome | 51 | Extreme cannibalization |
| Download extensions for Chrome | 50 | Extreme cannibalization |
| RAM/Memory management Chrome | 39 | High cannibalization |
| Ad blocker Chrome | 33 | High cannibalization |
| Privacy extensions Chrome | 24 | High cannibalization |
| Popup blocker Chrome | 23 | High cannibalization |
| Dark mode extensions | 10 | Medium cannibalization |

**51 screenshot articles** competing against each other is the single largest cannibalization cluster on the site. These articles not only compete with each other but also cannibalise the dedicated "Quick Screenshot Lite" extension page.

---

## 5. Corrupted / Malformed Content Files

Two article filenames are corrupted — the title appears duplicated and then truncated mid-word, suggesting a filesystem write error during generation:

```
unlock-the-power-of-visual-content-a-compunlock-the-power-of-visual-content-a-comprehensive-guide-to-chrome-screenshot-a.md
```
(123 chars — truncated with the title repeated halfway through)

```
unlocking-the-power-of-chrome-captureunlocking-the-power-of-chrome-capture-tools-2025-a-comprehensive-guide-tools-2025-a.md
```
(123 chars — same corruption pattern)

These articles are in the sitemap and indexed. Their slugs are corrupt and will not resolve correctly.

---

## 6. Category Mislabeling as Content Quality Risk

The `Screenshots & Screen Capture` category contains 217 articles — 43% of the entire library. Spot-check reveals the vast majority are NOT about screenshots:

| Article in "Screenshots & Screen Capture" | Actual Topic |
|---|---|
| "Activate Dark Mode on Wikipedia for Night Reading" | Dark Mode |
| "Chrome Memory Saver Extension Review" | RAM/Performance |
| "Dark Mode for Twitter" | Dark Mode |
| "Boost Your Browsing with Faster Downloads" | Download Manager |
| "Discover Chrome Extension Like IDM" | Download Manager |
| "Chrome Web Store Android Extensions Download" | Mobile Chrome |
| "Extension Google Chrome Adblock Android" | Ad Blocking |
| "How to Fix Chrome High Memory Usage" | Performance |

This mislabeling means:
1. The internal linking system (`relatedArticles` filtered by category) will suggest screenshots articles for every dark mode, adblock, and RAM article
2. Users clicking a category are shown completely unrelated content
3. Topic clustering signals sent to Google are incoherent

---

## 7. Multilingual Content Risk

**4 French-language articles** are mixed into the English content library:

| Slug | Language | Issue |
|---|---|---|
| `ajouter-extension-chrome-8` | French | No `lang="fr"`, indexed as English |
| `extension-chrome-indispensable-12` | French | No `lang="fr"`, indexed as English |
| `extension-chrome-rafraichissement-automatique-15` | French | No `lang="fr"`, indexed as English |
| `extension-utile-chrome-12` | French | No `lang="fr"`, indexed as English |

These articles:
- Have no `hreflang` annotation
- Appear in the English sitemap at full priority 0.7
- Will confuse both users and Google crawlers about the site's target language
- May be flagged as inconsistent content for an English-language site

---

## 8. Numeric Suffix Duplicate Groups

Multiple articles exist as explicitly numbered variations (e.g., `-1`, `-2`, `-3` suffixes on the same base topic):

**Screenshot-related:**
- `best-screenshot-extensions-for-chrome-1.md`
- `best-screenshot-tools-for-chrome-2.md`
- `best-quick-screenshot-chrome-tools-3.md`
- `best-screenshot-extension-for-developers-and-designers-3.md`
- `best-screenshot-editor-chrome-6.md`

**Screen capture sequence:**
- `capture-screen-chrome-comparison-2.md`
- `capture-screen-chrome-tutorial-3.md`
- `capture-screen-chrome-guide-4.md`
- `capture-screen-chrome-review-5.md`
- `capture-screen-in-chrome-7.md`

**Quick screenshot sequence:**
- `quick-screenshot-chrome-tutorial-1.md`
- `quick-screenshot-chrome-guide-2.md`
- `quick-screenshot-chrome-review-3.md`
- `quick-screenshot-chrome-alternative-4.md` / `quick-screenshot-chrome-overview-4.md`
- `fast-screenshot-extension-2025-9.md`

These numeric suffixes were likely added by the slug collision system but resulted in published duplicate-topic articles rather than resolving slug conflicts.

---

## 9. Content Recommendations Priority Matrix

| Issue | Articles Affected | Priority |
|---|---|---|
| Remove/redirect partial files | 5 | P0 - Immediate |
| Remove/redirect stub articles (<200 words) | 4 | P0 - Immediate |
| Fix corrupted filename articles | 2 | P0 - Immediate |
| Fix boilerplate excerpts | 40 | P1 - Urgent |
| Consolidate screenshot cannibalization | 51 | P1 - Urgent |
| Consolidate download cannibalization | 50 | P1 - Urgent |
| Fix category mislabeling | 200+ | P1 - Urgent |
| Remove French articles or create FR section | 4 | P2 - Important |
| Rewrite "AI Generator" author attribution | 337 | P2 - Important |
| Consolidate RAM/memory cannibalization | 39 | P2 - Important |
| Add meta descriptions to all articles | 499 | P2 - Important |
