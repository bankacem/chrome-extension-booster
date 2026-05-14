# CHANGELOG — P0 SEO Recovery Fixes
**Date:** 2026-05-14  
**Operator:** Lead SEO Recovery Engineer (Controlled Execution Mode)  
**Phase:** P0 — Critical SEO Breakage  
**Authorization:** Explicitly confirmed by user  
**Files modified this batch:** 6 (3 created, 3 deleted, 3 moved, 1 JSON updated)  
**Sitemap touched:** NO  
**Taxonomy changed:** NO  
**Bulk operations:** NO — each change is atomic and individually reversible via git

---

## P0-A — Corrupted Slug Fix #1

### Summary
A content generation pipeline bug concatenated the article title with itself mid-word, producing a corrupted filename, slug, frontmatter title, and index entry.

### Before
| Field | Value |
|---|---|
| File | `articles/u/n/l/unlocking-the-power-of-chrome-captureunlocking-the-power-of-chrome-capture-tools-2025-a-comprehensive-guide-tools-2025-a.md` |
| Frontmatter `slug` | `unlocking-the-power-of-chrome-captureunlocking-the-power-of-chrome-capture-tools-2025-a-comprehensive-guide-tools-2025-a` |
| Frontmatter `title` | `Unlocking the Power of Chrome CaptureUnlocking the Power of Chrome Capture Tools 2025: A Comprehensive Guide Tools 2025: A Comprehensive Guide` |
| Index `canonicalPath` | `/blog/unlocking-the-power-of-chrome-captureunlocking-the-power-of-chrome-capture-tools-2025-a-comprehensive-guide-tools-2025-a` |
| Index `quality_flags` | `["corrupted_slug", "slug_too_long"]` |

### After
| Field | Value |
|---|---|
| File | `articles/u/n/l/unlocking-the-power-of-chrome-capture-tools-2025.md` |
| Frontmatter `slug` | `unlocking-the-power-of-chrome-capture-tools-2025` |
| Frontmatter `title` | `Unlocking the Power of Chrome Capture Tools 2025: A Comprehensive Guide` |
| Index `canonicalPath` | `/blog/unlocking-the-power-of-chrome-capture-tools-2025` |
| Index `quality_flags` | *(removed — no longer applicable)* |

### Changes Made
1. **Created** new file `articles/u/n/l/unlocking-the-power-of-chrome-capture-tools-2025.md` with corrected frontmatter and original body content
2. **Deleted** old file `articles/u/n/l/unlocking-the-power-of-chrome-captureunlocking-the-power-of-chrome-capture-tools-2025-a-comprehensive-guide-tools-2025-a.md`
3. **Updated** `articles-index.json` — entry ID `31b52fdd-0f04-41b6-bb51-30819f438792`: title, slug, canonicalPath, filePath, quality_flags

### Body Content
Unchanged — original article body was intact and correct. Only the frontmatter was corrupted.

### Reversible?
Yes — `git diff` will show the before/after; `git checkout HEAD -- <old-path>` restores the original.

---

## P0-A — Corrupted Slug Fix #2

### Summary
Same generation bug — title was concatenated mid-word in the second article, producing a 152-character corrupted slug.

### Before
| Field | Value |
|---|---|
| File | `articles/u/n/l/unlock-the-power-of-visual-content-a-compunlock-the-power-of-visual-content-a-comprehensive-guide-to-chrome-screenshot-a.md` |
| Frontmatter `slug` | `unlock-the-power-of-visual-content-a-compunlock-the-power-of-visual-content-a-comprehensive-guide-to-chrome-screenshot-a` |
| Frontmatter `title` | `Unlock the Power of Visual Content: A CompUnlock the Power of Visual Content: A Comprehensive Guide to Chrome Screenshot Addonsrehensive Guide to Chrome Screenshot Addons` |
| Index `canonicalPath` | `/blog/unlock-the-power-of-visual-content-a-compunlock-the-power-of-visual-content-a-comprehensive-guide-to-chrome-screenshot-a` |
| Index `quality_flags` | `["corrupted_slug", "slug_too_long"]` |

### After
| Field | Value |
|---|---|
| File | `articles/u/n/l/unlock-the-power-of-visual-content-chrome-screenshot-addons.md` |
| Frontmatter `slug` | `unlock-the-power-of-visual-content-chrome-screenshot-addons` |
| Frontmatter `title` | `Unlock the Power of Visual Content: A Comprehensive Guide to Chrome Screenshot Addons` |
| Index `canonicalPath` | `/blog/unlock-the-power-of-visual-content-chrome-screenshot-addons` |
| Index `quality_flags` | *(removed — no longer applicable)* |

### Changes Made
1. **Created** new file `articles/u/n/l/unlock-the-power-of-visual-content-chrome-screenshot-addons.md` with corrected frontmatter and original body content
2. **Deleted** old file `articles/u/n/l/unlock-the-power-of-visual-content-a-compunlock-the-power-of-visual-content-a-comprehensive-guide-to-chrome-screenshot-a.md`
3. **Updated** `articles-index.json` — entry ID `394205cf-041f-4eab-9b17-3825c7d5d1a0`: title, slug, canonicalPath, filePath, quality_flags

### Body Content
Unchanged — body was intact. Frontmatter only was corrupted.

### Reversible?
Yes — reversible via git.

---

## P0-B — Underscore Slug Fix

### Summary
A manually authored article used underscores instead of hyphens in its filename (no `slug` field, non-standard frontmatter with malformed `--` opening delimiter instead of `---`). Underscores are not treated as word separators by Google, preventing correct keyword ranking.

### Before
| Field | Value |
|---|---|
| File | `articles/t/e/s/best_website_blocker_schedule_chrome_2026.md` |
| Frontmatter `slug` | *(absent)* |
| Frontmatter opening delimiter | `--` (malformed — 2 dashes instead of 3) |
| Directory | `t/e/s/` (incorrect — slug starts with 'b') |
| In articles-index.json | No |
| In sitemap.xml | No |

### After
| Field | Value |
|---|---|
| File | `articles/b/e/s/best-website-blocker-schedule-chrome-2026.md` |
| Frontmatter `slug` | `best-website-blocker-schedule-chrome-2026` |
| Frontmatter opening delimiter | `---` (corrected) |
| Directory | `b/e/s/` (correct for slug starting with 'b') |

### Changes Made
1. **Created** new file `articles/b/e/s/best-website-blocker-schedule-chrome-2026.md` with corrected frontmatter (hyphen slug, added `slug` field, fixed `---` delimiter) and full original body content (258 lines preserved)
2. **Deleted** old file `articles/t/e/s/best_website_blocker_schedule_chrome_2026.md`
3. **No articles-index.json update** — article was not indexed; not in scope to add it to index at this stage
4. **No sitemap.xml update** — article was not in sitemap; not in scope at this stage

### Body Content
Fully preserved — 258-line article body (7 tools reviewed + comparison table + FAQ) intact.

### Reversible?
Yes — reversible via git.

---

## P0-C — Strategy Documents Removed from Public Directory

### Summary
Three internal editorial strategy documents were located inside `public/content/` — a publicly accessible and crawlable directory. These files contained competitor-sensitive content strategy plans and guest post outreach lists. They were not articles, had no article IDs, and were not in the sitemap.

### Files Moved

| Old Path (public, crawlable) | New Path (private) |
|---|---|
| `artifacts/extensionto/public/content/outreach-strategy.md` | `docs/strategy/outreach-strategy.md` |
| `artifacts/extensionto/public/content/pillar-adblock-android-outline.md` | `docs/strategy/pillar-adblock-android-outline.md` |
| `artifacts/extensionto/public/content/strategy-ram-cluster.md` | `docs/strategy/strategy-ram-cluster.md` |

### Changes Made
1. **Created** directory `docs/strategy/`
2. **Moved** 3 files from `public/content/` to `docs/strategy/`
3. **No index or sitemap changes** — these files were never indexed

### Reversible?
Yes — `git mv` is reversible; files are still in git history.

---

## Totals

| Action | Count |
|---|---|
| Files created (corrected replacements) | 3 |
| Files deleted (corrupted originals) | 3 |
| Files moved (strategy docs) | 3 |
| JSON entries updated | 2 |
| Sitemap entries modified | 0 |
| Taxonomy changes | 0 |
| Bulk operations | 0 |
| Net article file count change | 0 (500 before, 500 after) |

---

## Verification Status

| Check | Result |
|---|---|
| Old corrupted file 1 absent | PASS |
| Old corrupted file 2 absent | PASS |
| Old underscore file absent | PASS |
| New corrected file 1 present (13KB, 169 lines) | PASS |
| New corrected file 2 present (16KB, 163 lines) | PASS |
| New hyphen file present (22KB, 259 lines) | PASS |
| Strategy docs moved to docs/strategy/ | PASS |
| articles-index.json slug 1 updated | PASS |
| articles-index.json slug 2 updated | PASS |
| articles-index.json quality_flags cleared | PASS |
| Sitemap unchanged | PASS |
| No AI hash slugs modified | PASS |
| No bulk operations performed | PASS |

---

## Awaiting Confirmation for P1

The following items are queued but **not started**:

- **P1-A:** 5 partial content files (crawlable, incomplete) — awaiting option selection (noindex / move / complete)
- **P1-B:** 18 files missing from sitemap — awaiting decision on which pillar pages to add
- **P1-C:** Category taxonomy mismatch — awaiting review
