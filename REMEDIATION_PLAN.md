# REMEDIATION PLAN
**Site:** extensionto.com  
**Phase:** 2 — Strategy Mode (Planning Only)  
**Generated:** 2026-05-14  
**Basis:** AUDIT_REPORT.md · SAFE_AUDIT_REPORT.md · SEO_RISK_REPORT.md · VALIDATION_STATUS.md

---

## STATEMENT OF COMPLIANCE

> **NO CHANGES WERE MADE.**  
> This document is a planning artifact only.  
> No files were modified, created, deleted, or moved to produce it.  
> All execution requires explicit user approval in Phase 3.

---

## CURRENT STATE SUMMARY

| Category | Count | Status |
|---|---|---|
| Total article files | 500 | Baseline |
| P0 issues | 3 | ALL RESOLVED (prior approved session) |
| P1 issues | 3 groups | OPEN — plan below |
| P2 issues | 4 groups | DEFERRED — plan below |
| Broken internal links | 0 | Clean |
| Underscore slugs | 0 | Clean |
| Strategy docs in public | 0 | Clean |

---

## DEPENDENCY MAP

Some fixes depend on others. This map shows what must be resolved first.

```
P1-A (partial files)
  └─► P1-B (sitemap additions) — do not add partials to sitemap until P1-A decided

P1-C (category taxonomy) — independent, but requires content review

[INFRA] 301 redirect infrastructure
  └─► P2-A (AI hash slug renames)
        └─► P2-C (overlong slugs) — concurrent with P2-A
  └─► P2-B (serial variant consolidation)

P2-D (internal linking) — independent of infra, but requires cluster map first
```

**Safe execution order:** P1-A → P1-B → P1-C → [INFRA] → P2-A + P2-C → P2-B → P2-D

---

## PHASE 3 TASK LIST

Tasks are ordered by safety and dependency. Each task is atomic — one operation, one approval, one stop.

---

### TIER 1 — P1 FIXES (Safe, No Redirect Needed)

---

#### TASK 1.1 — Add `noindex` to 5 Partial Content Files
**Risk addressed:** P1-A  
**Dependency:** None  
**Reversible:** Yes (remove frontmatter field)  
**Redirect required:** No

**What:** Add `robots: noindex` to the frontmatter of each partial file. This instructs Google to drop the page from its index within approximately 14 days. No URL changes, no redirects, no index edits.

**Files to modify (one at a time, one approval each):**

| # | File Path | Current `robots` field |
|---|---|---|
| 1.1.1 | `articles/a/d/b/adblock-for-android-chrome-partial.md` | None |
| 1.1.2 | `articles/c/h/r/chrome-popup-blocker-partial.md` | None |
| 1.1.3 | `articles/h/o/w/how-to-speed-up-chrome-partial.md` | None |
| 1.1.4 | `articles/p/o/p/pop-up-blocker-for-chrome-partial.md` | None |
| 1.1.5 | `articles/p/r/i/privacy-badger-chrome-partial.md` | None |

**Change per file:** Add `robots: noindex` to YAML frontmatter block. Body content untouched.  
**Verification:** Confirm field present in frontmatter, confirm body unchanged.  
**CHANGELOG entry:** Required for each file.

> **Alternative options (user must choose one before execution begins):**
> - **Option A (recommended):** Add `noindex` — fastest, reversible, no redirects
> - **Option B:** Move files to `docs/` — removes from public entirely
> - **Option C:** Complete the content, remove `-partial` from slug — requires redirect and index update

---

#### TASK 1.2 — Add Missing URLs to Sitemap
**Risk addressed:** P1-B  
**Dependency:** Task 1.1 must be decided first (do not add partial files to sitemap)  
**Reversible:** Yes (remove `<url>` block)  
**Redirect required:** No

**What:** Add `<url>` entries to `sitemap.xml` for the pages below. These are clean, complete articles that currently have no sitemap entry.

**Group A — P0-corrected slugs (2 entries):**

| # | Slug | Proposed priority | Proposed changefreq |
|---|---|---|---|
| 1.2.1 | `unlocking-the-power-of-chrome-capture-tools-2025` | 0.7 | monthly |
| 1.2.2 | `unlock-the-power-of-visual-content-chrome-screenshot-addons` | 0.7 | monthly |

**Group B — Pillar / hub pages (5 entries, user approves each individually):**

| # | Slug | Proposed priority | Proposed changefreq |
|---|---|---|---|
| 1.2.3 | `youtube-tools-guide` | 0.9 | weekly |
| 1.2.4 | `internet-download-manager-extension` | 0.9 | weekly |
| 1.2.5 | `privacy-security-guide` | 0.9 | weekly |
| 1.2.6 | `adblock-android-guide` | 0.9 | weekly |
| 1.2.7 | `chrome-popup-blocker-master-guide` | 0.9 | weekly |

**Group C — Stubs (3 entries, user must review content quality first):**

| # | Slug | Notes |
|---|---|---|
| 1.2.8 | `best-website-blocker-schedule-chrome-2026` | P0-B fixed slug — not yet indexed |
| 1.2.9 | `adblocker-for-android-chrome` | Short stub — quality review needed |
| 1.2.10 | `chrome-screenshot-guide` | Short stub — quality review needed |

> **Do not add** partial files (P1-A group) to sitemap until Task 1.1 is resolved.

**Change per entry:** Add one `<url>` block with `<loc>`, `<changefreq>`, and `<priority>` tags.  
**Verification:** Confirm URL count increments by 1; confirm URL resolves to correct file.  
**CHANGELOG entry:** Required for each addition.

---

#### TASK 1.3 — Audit and Correct Category Taxonomy
**Risk addressed:** P1-C  
**Dependency:** None (but complex — requires content review before each change)  
**Reversible:** Yes  
**Redirect required:** No

**What:** 468 of 499 `articles-index.json` entries have a mismatch between `original_category` and `category`. This task corrects the `category` field to match the actual article content.

**Before starting this task, answer these two questions:**
1. Is `category` currently rendered in HTML breadcrumbs, structured data (`<script type="application/ld+json">`), or URL paths? If yes, every correction has an immediate on-page effect.
2. Is `original_category` or `category` the source of truth for topic classification?

**Sub-tasks (each requires individual approval):**

| # | Sub-task | Scope |
|---|---|---|
| 1.3.1 | Confirm which field is rendered in HTML | Read-only check |
| 1.3.2 | Define correct category for each of the 11 topic groups | Planning review |
| 1.3.3 | Correct category field — one index entry at a time | Execution, atomic |

> This task has the largest scope of any P1 item. Given 468 affected entries, it will require many individual approvals. A batch strategy (e.g., fix all entries in one category group per approval) can be proposed if the user prefers.

---

### TIER 2 — INFRASTRUCTURE PREREQUISITE

---

#### TASK 2.0 — Confirm 301 Redirect Infrastructure
**Risk addressed:** Prerequisite for all P2 tasks  
**Dependency:** Must complete before any P2-A, P2-B, or P2-C execution  
**Action required from user (not from agent):** Confirm that server-side 301 redirects are operational

**What this means:**
- When a URL is renamed, the old URL must return HTTP 301 pointing to the new URL.
- This must be handled at the server/CDN level (not client-side JavaScript).
- Without this, any slug rename creates an immediate 404 for users and crawlers following old links.

**Verification step (read-only, agent can do this):**
- Check if a redirect configuration file exists (e.g., `_redirects`, `vercel.json`, `netlify.toml`, `nginx.conf`, `.htaccess`)
- Report findings before any P2 execution begins

---

### TIER 3 — P2 FIXES (Require Redirect Infrastructure)

---

#### TASK 3.1 — Rename AI Hash-Suffix Slugs
**Risk addressed:** P2-A  
**Dependency:** Task 2.0 confirmed  
**Reversible:** Only if redirect infra is active (otherwise permanent 404)  
**Redirect required:** YES — one 301 per renamed slug

**Scale:** 209 slugs  
**Batch size:** Maximum 20 per approved batch  
**Estimated batches:** 11  

**Execution protocol per batch:**
1. User approves list of 20 slugs for rename
2. Agent renames each file (one at a time, stop after each)
3. Agent updates `articles-index.json` entry (slug, canonicalPath, filePath)
4. Agent confirms redirect rule is in place
5. Agent logs change in `CHANGELOG.md`
6. STOP — wait for confirmation before next slug

**Naming convention for cleaned slugs:**  
Remove the `-mm[a-z0-9]+` suffix. Trim to ≤75 characters. Use hyphens only.

**Example:**
```
BEFORE: mastering-tab-management-the-best-chrome-extensions-to-organize-tabs-for-enhanced-productivity-mmdrqpzd2wa
AFTER:  mastering-tab-management-best-chrome-extensions-for-productivity
```

> Do not begin this task until Task 2.0 is confirmed and a batch list is user-approved.

---

#### TASK 3.2 — Consolidate Keyword Cannibalization / Serial Variants
**Risk addressed:** P2-B  
**Dependency:** Task 2.0 confirmed; content review per group required  
**Reversible:** Only with active redirect infra  
**Redirect required:** YES

**Scale:** 103 numeric-suffix slugs; 18 topic groups with 3+ variants  
**Approach:** Per topic group, identify the strongest variant (longest, most structured, most internally linked) and redirect all others to it via 301.

**Execution protocol per group:**
1. User reviews content quality of all variants in a group
2. User selects canonical variant
3. Agent adds redirect rules for non-canonical variants
4. Agent updates `articles-index.json` to mark non-canonical entries
5. Non-canonical files moved out of public (or deleted, per user decision)
6. CHANGELOG updated
7. STOP

> This is the highest editorial-effort task in the plan. Content team review is strongly recommended before execution.

---

#### TASK 3.3 — Shorten Overlong / Truncated Slugs
**Risk addressed:** P2-C  
**Dependency:** Task 2.0 confirmed; concurrent with Task 3.1 (all 64 overlong slugs also carry hash suffixes)  
**Reversible:** Only with active redirect infra  
**Redirect required:** YES

**Scale:** 64 slugs (subset of P2-A)  
**Recommendation:** Handle as part of Task 3.1 batches — rename the slug, remove hash suffix, and shorten in one operation. No separate batch needed.

---

#### TASK 3.4 — Internal Linking by Topic Cluster
**Risk addressed:** P2-D  
**Dependency:** Category taxonomy (Task 1.3) should be correct first; no redirect infra needed  
**Reversible:** Yes (body content edit)  
**Redirect required:** No

**Scale:** ~480 orphan pages across 11 topic categories  
**Approach:** Define one hub article per category. Add 3–5 contextual internal links from spoke articles to the hub, and from the hub to spoke articles. Work one cluster at a time.

**Execution protocol per cluster:**
1. User approves cluster definition (hub + list of spoke articles)
2. Agent proposes specific link placements (anchor text + target) for each spoke article
3. User approves each placement
4. Agent inserts link — one article at a time
5. CHANGELOG updated
6. STOP

---

## FULL TASK REFERENCE TABLE

| Task | Action | Resolves | Files Affected | Redirect? | Dependency |
|---|---|---|---|---|---|
| 1.1.1–1.1.5 | Add `noindex` to 5 partial files | P1-A | 5 MD files | No | None |
| 1.2.1–1.2.10 | Add missing URLs to sitemap | P1-B | sitemap.xml | No | 1.1 decided |
| 1.3.1–1.3.3 | Correct category taxonomy in index | P1-C | articles-index.json | No | None |
| 2.0 | Confirm redirect infrastructure | Prerequisite | None (infra check) | N/A | None |
| 3.1 | Rename 209 AI hash slugs (batched ≤20) | P2-A | MD files + index | YES | 2.0 |
| 3.2 | Consolidate serial variant duplicates | P2-B | MD files + index | YES | 2.0 |
| 3.3 | Shorten overlong slugs (with 3.1) | P2-C | MD files + index | YES | 2.0 |
| 3.4 | Insert internal links by cluster | P2-D | MD files (body) | No | 1.3 complete |

**Total atomic operations (minimum):** 5 (noindex) + 10 (sitemap) + 468 (taxonomy, batched) + 209 (hash renames) + ~50 (variant consolidations) + ~100 (internal links) = **~842 individual operations, all requiring approval**

---

## RECOMMENDED STARTING POINT FOR PHASE 3

The lowest-risk, highest-impact first action is **Task 1.1** — adding `noindex` to the 5 partial files. It requires:
- No redirects
- No index changes
- One frontmatter line per file
- Fully reversible

**To begin Phase 3, state which task to start with and which option you select for Task 1.1 (noindex / move / complete).**

---

*REMEDIATION_PLAN.md — Planning only. No changes were made. Awaiting Phase 3 approval.*
