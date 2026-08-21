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
| Worker-01 | How to Get the Most Out of Your Browser with Extension Get Chrome | `public/content/articles/h/o/w/how-to-get-the-most-out-of-your-browser-with-extension-chrome-get.md` | `how-to-get-the-most-out-of-your-browser-with-extension-chrome-get` | `refine/how-to-get-the-most-out-of-your-browser-with-extension-chrome-get` | `queued` | Article file and its audit only |
| Worker-02 | Pro Browsing Chrome Extensions: The Ultimate Workflow Upgrade for Power Users | `public/content/articles/p/r/o/pro-browsing-chrome-extensions-the-ultimate-workflow-upgrade-for-power-users.md` | `pro-browsing-chrome-extensions-the-ultimate-workflow-upgrade-for-power-users` | `refine/pro-browsing-chrome-extensions-the-ultimate-workflow-upgrade-for-power-users` | `queued` | Article file and its audit only |
| Worker-03 | How to Fix Chrome High Memory Usage: The Ultimate 2026 Speed Up Guide | `public/content/articles/h/o/w/how-to-fix-chrome-high-memory-usage-the-ultimate-2026-speed-up-guide.md` | `how-to-fix-chrome-high-memory-usage-the-ultimate-2026-speed-up-guide` | `refine/how-to-fix-chrome-high-memory-usage-the-ultimate-2026-speed-up-guide` | `queued` | Article file and its audit only |
| Worker-04 | Pro Student Chrome Extensions: The Ultimate Academic Stack | `public/content/articles/p/r/o/pro-student-chrome-extensions-the-ultimate-academic-stack.md` | `pro-student-chrome-extensions-the-ultimate-academic-stack` | `refine/pro-student-chrome-extensions-the-ultimate-academic-stack` | `queued` | Article file and its audit only |
| Worker-05 | Professional Browser Tools Guide | `public/content/articles/p/r/o/professional-browser-tools-guide.md` | `professional-browser-tools-guide` | `refine/professional-browser-tools-guide` | `queued` | Article file and its audit only |
| Worker-06 | Mastering Google Chrome Programmé en | `public/content/articles/g/o/o/google-chrome-programm-en-14.md` | `google-chrome-programm-en-14` | `refine/google-chrome-programm-en-14` | `queued` | Article file and its audit only |
| Worker-07 | Pro Essential Chrome Extensions: The Ultimate Guide | `public/content/articles/p/r/o/pro-essential-chrome-extensions-the-ultimate-guide.md` | `pro-essential-chrome-extensions-the-ultimate-guide` | `refine/pro-essential-chrome-extensions-the-ultimate-guide` | `merged` | Article file and its audit only |
| Worker-08 | How to Create Complex Excel Formulas Easily | `public/content/articles/h/o/w/how-to-create-complex-excel-formulas-easily.md` | `how-to-create-complex-excel-formulas-easily` | `refine/how-to-create-complex-excel-formulas-easily` | `queued` | Article file and its audit only |
| Worker-09 | Stop Chrome From Freezing on Low-End PCs | `public/content/articles/s/t/o/stop-chrome-from-freezing-on-low-end-pcs-7.md` | `stop-chrome-from-freezing-on-low-end-pcs-7` | `refine/stop-chrome-from-freezing-on-low-end-pcs-7` | `ready_for_merge` | Article file and its audit only |
| Worker-10 | Integration and release coordinator | Repository-wide review only | n/a | `integration/wave-1` | `reserved` | Owns sequential merge, index, sitemap, and release gate |

## Integration decision log

### Worker-07 — `pro-essential-chrome-extensions-the-ultimate-guide`

- **Worker branch and commit:** `refine/pro-essential-chrome-extensions-the-ultimate-guide` at `8d4430f2e4b0a016a2de26a1384491b33398352d`.
- **Integration commit:** `13bd48915056805b467a68a32b8c1518207e83a2`.
- **Files accepted:** assigned article, its audit, the branch-local index change, and the Worker-07 status row. No other article was changed; no shared sitemap change was introduced.
- **Rendered validation:** article HTML `21,035` bytes; `Article` 1, `BreadcrumbList` 1, `FAQPage` 0, `HowTo` 0. The article intentionally has no visible FAQ.
- **Release gate:** `sync-articles`, `build`, `typecheck`, `test:performance`, `test:seo`, `test:links`, and `git diff --check` all passed. The initial sync attempt was blocked by missing local `tsx`; after installing the locked dependencies, the same cycle passed.

## Completed baseline articles

These articles are already refined and must not be assigned again: `fast-screenshot-extension-alternatives-1`, `chrome-ram-guide`, `internet-download-manager-extension`, and `the-ultimate-chrome-extensions-for-browsing-guide`.

## Worker rules

A worker must read the ExtensionTo editorial playbook, reserve its row before editing, create `article-audit-<slug>.md`, analyze intent and internal cannibalization, write a unique plan, edit only its assigned article, run local tests, and set the row to `ready_for_merge`. A worker must not push directly to `main`, modify another article, or rewrite the shared playbook based on one isolated case.

Workers may update their own branch copy of `articles-index.json` to verify the result, but the integration worker owns the final sequential index update. This avoids simultaneous writes to the shared index and sitemap.

## Integration rules

The integration worker merges one ready branch at a time. After each merge it rebuilds the article index, regenerates the sitemap when required, runs build, typecheck, performance, SEO, and link tests, and only then continues to the next branch. A failed branch moves to `needs_revision`; it is never silently merged.

## Wave completion rule

Wave 1 is complete when all nine article branches are either `merged` or explicitly `blocked`, the integration checks pass, and every decision is recorded in the corresponding audit file. Only then should the next wave be selected.
