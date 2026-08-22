# ExtensionTo Editorial Workboard

**Purpose:** Coordinate parallel article refinement without duplicate ownership, conflicting edits, or unsafe simultaneous updates to the article index.

**Operating rule:** One worker conversation owns one article and one branch. The integration conversation is the only owner of `main`, `public/content/articles-index.json`, and the final sitemap merge.

## Status values

| Status | Meaning |
|---|---|
| `queued` | Selected for the wave but not started |
| `reserved` | Assigned to one worker conversation |
| `in_progress` | Audit or rewrite is underway |
| `ready_for_merge` | Local tests passed and the branch is ready for integration |
| `merged` | Integrated into `main` and passed the release gate |
| `blocked` | Waiting for a decision about intent, safety, facts, or cannibalization |
| `needs_revision` | Returned by integration for a specific correction |

## Wave 1 — nine article workers plus one integration worker

| Worker | Article title | Article path | Slug | Branch | Status | Ownership rule |
|---|---|---|---|---|---|---|
| Worker-01 | How to Get the Most Out of Your Browser with Chrome Extensions | `public/content/articles/h/o/w/how-to-get-the-most-out-of-your-browser-with-extension-chrome-get.md` | `how-to-get-the-most-out-of-your-browser-with-extension-chrome-get` | `refine/recover-worker-01` | `merged` | Recovered and published via PR #309; main commit `a50cf7f9`; Vercel success; HTML 14,940 bytes; Article 1, BreadcrumbList 1, FAQPage 0; full checks passed |
| Worker-02 | Pro Browsing Chrome Extensions: The Ultimate Workflow Upgrade for Power Users | `public/content/articles/p/r/o/pro-browsing-chrome-extensions-the-ultimate-workflow-upgrade-for-power-users.md` | `pro-browsing-chrome-extensions-the-ultimate-workflow-upgrade-for-power-users` | `refine/pro-browsing-chrome-extensions-the-ultimate-workflow-upgrade-for-power-users` | `merged` | Recovered and published via PR #306; merge commit `00c14af3`; HTML 24,540 bytes; Article 1, BreadcrumbList 1, FAQPage 1; full checks passed |
| Worker-03 | How to Fix Chrome High Memory Usage: A Diagnostic Guide | `public/content/articles/h/o/w/how-to-fix-chrome-high-memory-usage-the-ultimate-2026-speed-up-guide.md` | `how-to-fix-chrome-high-memory-usage-the-ultimate-2026-speed-up-guide` | `refine/recover-worker-03` | `merged` | Recovered and published via PR #309; main commit `a50cf7f9`; Vercel success; HTML 15,816 bytes; Article 1, BreadcrumbList 1, FAQPage 0; full checks passed |
| Worker-04 | Chrome Extensions for Students: Build a Practical Academic Stack | `public/content/articles/p/r/o/pro-student-chrome-extensions-the-ultimate-academic-stack.md` | `pro-student-chrome-extensions-the-ultimate-academic-stack` | `refine/recover-worker-04` | `merged` | Recovered and published via PR #309; main commit `a50cf7f9`; Vercel success; HTML 18,052 bytes; Article 1, BreadcrumbList 1, FAQPage 0; full checks passed |
| Worker-05 | Professional Browser Tools Guide | `public/content/articles/p/r/o/professional-browser-tools-guide.md` | `professional-browser-tools-guide` | `refine/professional-browser-tools-guide` | `merged` | Recovered and published via PR #306; merge commit `00c14af3`; HTML 27,210 bytes; Article 1, BreadcrumbList 1, FAQPage 1; full checks passed |
| Worker-06 | Mastering Google Chrome Programmé en | `public/content/articles/g/o/o/google-chrome-programm-en-14.md` | `google-chrome-programm-en-14` | `refine/google-chrome-programm-en-14` | `merged` | Recovered and published via PR #306; merge commit `00c14af3`; HTML 23,948 bytes; Article 1, BreadcrumbList 1, FAQPage 0; evaluator.py excluded, audit added, redirect fixed, full checks passed |
| Worker-07 | Pro Essential Chrome Extensions: The Ultimate Guide | `public/content/articles/p/r/o/pro-essential-chrome-extensions-the-ultimate-guide.md` | `pro-essential-chrome-extensions-the-ultimate-guide` | `refine/pro-essential-chrome-extensions-the-ultimate-guide` | `merged` | Article file and its audit only |
| Worker-08 | How to Create Complex Excel Formulas Easily: A Practical Method | `public/content/articles/h/o/w/how-to-create-complex-excel-formulas-easily.md` | `how-to-create-complex-excel-formulas-easily` | `refine/recover-worker-08` | `merged` | Recovered and published via PR #309; main commit `a50cf7f9`; Vercel success; original article ID preserved; HTML 17,387 bytes; Article 1, BreadcrumbList 1, FAQPage 0; full checks passed |
| Worker-09 | Stop Chrome From Freezing on Low-End PCs | `public/content/articles/s/t/o/stop-chrome-from-freezing-on-low-end-pcs-7.md` | `stop-chrome-from-freezing-on-low-end-pcs-7` | `refine/stop-chrome-from-freezing-on-low-end-pcs-7` | `merged` | Article file and its audit only |
| Worker-10 | Integration and release coordinator | Repository-wide review only | n/a | `integration/wave-1` | `reserved` | Owns sequential merge, index, sitemap, and release gate |

## Pilot batch 001 — coordinated Manus + seo_agent_pro production

The first coordinated pilot contains ten distinct topic records. Only the three rows marked `approved_for_generation` may be sent to `seo_agent_pro` now; the other seven are reserved for intent validation, updates, or consolidation and are not new-article generation jobs yet. This distinction prevents high-volume Android, screenshot, Auto Refresh, and AdBlock terms from creating more duplicate pages.

| Topic | Primary keyword | Action | Target slug | Status | Owner |
|---|---|---|---|---|---|
| tp001 | `tampermonkey chrome` | new article | `tampermonkey-chrome-userscripts-guide` | `merged` | `seo_agent_pro` — PR #315, integration PR #316, main `fc241da5`, live HTTP 200, index once, sitemap present |
| tp002 | `pip chrome` | new article | `picture-in-picture-chrome-guide` | `approved_for_generation` | `seo_agent_pro` |
| tp003 | `gmail mailtrack` | new article | `mailtrack-gmail-chrome-guide` | `approved_for_generation` | `seo_agent_pro` |
| tp004 | `omniboxes` | new article | `chrome-omnibox-guide` | `needs_intent_validation` | `manus` |
| tp005 | `extension zoom chrome` | new article | `zoom-chrome-extension-guide` | `needs_product_validation` | `manus` |
| tp006 | `tag assistant google` | update | `unlocking-the-power-of-google-tag-assistant-extension` | `update_existing` | `manus` |
| tp007 | `autoreload chrome` | update or merge | `extension-auto-refresh-chrome-2` | `update_existing` | `manus` |
| tp008 | `extension chrome android` | consolidate | `chrome-extensions-on-android-2026-guide` | `consolidation_review` | `manus` |
| tp009 | `screenshoter chrome` | consolidate | `fast-screenshot-extension-alternatives-1` | `consolidation_review` | `manus` |
| tp010 | `adblock chrome` | update or merge | `best-ad-block-chrome-extension` | `consolidation_review` | `manus` |

The reservation source of truth is `editorial/pilot-batch-001.json`. tp001 is now merged and live; the remaining generation-approved topics are tp002 and tp003. Each article job must use an explicit keyword and a separate branch. The integration owner alone updates the final index and sitemap.

## Integration decision log

### Worker-07 — `pro-essential-chrome-extensions-the-ultimate-guide`

- **Worker branch and commit:** `refine/pro-essential-chrome-extensions-the-ultimate-guide` at `8d4430f2e4b0a016a2de26a1384491b33398352d`.
- **Integration commit:** `13bd48915056805b467a68a32b8c1518207e83a2`.
- **Files accepted:** assigned article, its audit, the branch-local index change, and the Worker-07 status row. No other article was changed; no shared sitemap change was introduced.
- **Rendered validation:** article HTML `21,035` bytes; `Article` 1, `BreadcrumbList` 1, `FAQPage` 0, `HowTo` 0. The article intentionally has no visible FAQ.
- **Release gate:** `sync-articles`, `build`, `typecheck`, `test:performance`, `test:seo`, `test:links`, and `git diff --check` all passed. The initial sync attempt was blocked by missing local `tsx`; after installing the locked dependencies, the same cycle passed.

### Worker-09 — `stop-chrome-from-freezing-on-low-end-pcs-7`

- **Worker branch and commit:** `refine/stop-chrome-from-freezing-on-low-end-pcs-7` at `cb5ce238ac8d7a671b6500593758241a4f58f400`.
- **Integration commit:** `3188c703` (merge commit).
- **Files accepted:** assigned article, its audit, the Worker-09 status row, and the generated target entry in `public/content/articles-index.json`. `public/sitemap.xml` remained unchanged. No other article was changed.
- **Rendered validation:** article HTML `26,413` bytes; `Article` 1, `BreadcrumbList` 1, `FAQPage` 1 matching the visible six-question FAQ, `HowTo` 0.
- **Release gate:** `sync-articles`, `build`, `typecheck`, `test:performance`, `test:seo`, `test:links`, and `git diff --check` all passed. The index diff was limited to the target slug.

### Recovery integration — Workers 01, 03, 04, and 08

- **Integration branch:** `integration/recover-workers-1348`, based on `origin/main` at `67cc81d0`.
- **Worker commits:** Worker-01 `3434daa6`; Worker-03 `531580d2`; Worker-04 `ce8486b8`; Worker-08 final `7db4ff83` (the final commit preserves the original article ID).
- **Index and sitemap:** `sync-articles` completed with 750 published articles; `generate-sitemap` emitted 764 English/article entries plus static, extension, and localized entries, for 782 sitemap URLs in the SEO smoke test. All four recovered slugs have self-canonical paths and appear in `public/sitemap.xml`.
- **Release gate:** `npm run build`, `npm run typecheck`, `npm run test:performance`, `npm run test:seo`, `npm run test:links`, and `git diff --check` passed. The final SEO smoke test reported 782 sitemap URLs, 750 English articles, 9 extensions, and 20 localized articles; the link test scanned 8,018 links with 0 redirect links and 6 documented exceptions.
- **Decision:** PR #309 was merged into `main` at `a50cf7f9f6b7607ac25556c8d7ebfdaa1c8077c2`. The post-merge Publish Articles Pipeline, Vercel deployment, and SEO Quality Gate all succeeded. The four articles are now published and their four URLs are present in the sitemap.

### Rejected or blocked branches

The historical blocked/needs-revision notes above were superseded by the recovery integration. The current authoritative status is the worker table at the top of this file: Workers 01, 03, 04, and 08 are `merged` on main through PR #309; Workers 02, 05, and 06 are `merged` through PR #306.

## Completed baseline articles

These articles are already refined and must not be assigned again: `fast-screenshot-extension-alternatives-1`, `chrome-ram-guide`, `internet-download-manager-extension`, and `the-ultimate-chrome-extensions-for-browsing-guide`.

## Worker rules

A worker must read the ExtensionTo editorial playbook, reserve its row before editing, create `article-audit-<slug>.md`, analyze intent and internal cannibalization, write a unique plan, edit only its assigned article, run local tests, and set the row to `ready_for_merge`. A worker must not push directly to `main`, modify another article, or rewrite the shared playbook based on one isolated case.

Workers may update their own branch copy of `articles-index.json` to verify the result, but the integration worker owns the final sequential index update. This avoids simultaneous writes to the shared index and sitemap.

## Integration rules

The integration worker merges one ready branch at a time. After each merge it rebuilds the article index, regenerates the sitemap when required, runs build, typecheck, performance, SEO, and link tests, and only then continues to the next branch. A failed branch moves to `needs_revision`; it is never silently merged.

## Wave completion rule

Wave 1 is complete when all nine article branches are either `merged` or explicitly `blocked`, the integration checks pass, and every decision is recorded in the corresponding audit file. Only then should the next wave be selected.
