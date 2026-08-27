# Agent-created article inventory and review record

**Date:** 2026-08-27

## New article created in this run

The `seo_agent_pro` pipeline generated `chrome-storage-onchanged-not-firing-mv3-troubleshooting-playbook` with `builtin-gpt-5-mini`, using an explicit keyword and a five-result manually audited research snapshot. The pipeline returned `final_status: needs_human_review`, `approved: true` at the model-evaluation layer, score 86, `competitor_source: manual_real_search`, and `auto_publish: false`. The article is stored in this branch with `status: draft`. The temporary run did not modify the shared keyword queue or the production repository.

The article remains a draft because the evaluator identified incomplete checklist-to-example pairing, missing minimal manifest/reproduction instructions, a missing canonical `onChanged(changes, areaName)` example, and lifecycle/DevTools details that require human review. No lesson was promoted to permanent memory from this run.

## Existing agent PRs checked

A read-only GitHub audit checked every open PR whose head branch starts with `agentic-review/` and reads the changed article frontmatter. It found **23 open agent article PRs; all 23 have `status: draft`**. PR #349 was closed as a duplicate and is not counted as an active draft.

| PR | Branch | Article file | Verified status |
|---:|---|---|---|
| 366 | `agentic-review/chrome-extension-match-patterns-a-complete-guide` | `public/content/articles/c/h/r/chrome-extension-match-patterns-a-complete-guide.md` | `draft` |
| 365 | `agentic-review/chrome-extension-badge-not-showing-advanced-troubleshooting-guide` | `public/content/articles/c/h/r/chrome-extension-badge-not-showing-advanced-troubleshooting-guide.md` | `draft` |
| 364 | `agentic-review/mastering-chrome-extension-devtools-panels-best-practices-and-troubleshooting` | `public/content/articles/m/a/s/mastering-chrome-extension-devtools-panels-best-practices-and-troubleshooting.md` | `draft` |
| 363 | `agentic-review/chrome-extension-native-messaging-troubleshooting-security-and-comparisons` | `public/content/articles/c/h/r/chrome-extension-native-messaging-troubleshooting-security-and-comparisons.md` | `draft` |
| 362 | `agentic-review/chrome-extension-page-capture-with-mhtml-a-practical-guide` | `public/content/articles/c/h/r/chrome-extension-page-capture-with-mhtml-a-practical-guide.md` | `draft` |
| 361 | `agentic-review/mastering-the-chromeprivacy-api-advanced-use-cases-and-troubleshooting` | `public/content/articles/m/a/s/mastering-the-chromeprivacy-api-advanced-use-cases-and-troubleshooting.md` | `draft` |
| 360 | `agentic-review/chrome-extension-proxy-api-a-complete-guide-for-beginner-developers` | `public/content/articles/c/h/r/chrome-extension-proxy-api-a-complete-guide-for-beginner-developers.md` | `draft` |
| 359 | `agentic-review/mastering-chrome-desktop-capture-extensions-a-complete-user-guide` | `public/content/articles/m/a/s/mastering-chrome-desktop-capture-extensions-a-complete-user-guide.md` | `draft` |
| 358 | `agentic-review/the-ultimate-guide-to-chrome-tab-capture-extensions-features-setup-and-advanced-use-cases` | `public/content/articles/t/h/e/the-ultimate-guide-to-chrome-tab-capture-extensions-features-setup-and-advanced-use-cases.md` | `draft` |
| 357 | `agentic-review/understanding-the-chrome-extension-browser-namespace-practical-implementation-guide` | `public/content/articles/u/n/d/understanding-the-chrome-extension-browser-namespace-practical-implementation-guide.md` | `draft` |
| 356 | `agentic-review/mastering-chrome-extension-message-passing-with-chromeruntime-apis` | `public/content/articles/m/a/s/mastering-chrome-extension-message-passing-with-chromeruntime-apis.md` | `draft` |
| 355 | `agentic-review/chrome-webnavigation-api-guide-troubleshooting-and-performance-optimization` | `public/content/articles/c/h/r/chrome-webnavigation-api-guide-troubleshooting-and-performance-optimization.md` | `draft` |
| 354 | `agentic-review/chrome-extension-management-api-guide-use-cases-best-practices` | `public/content/articles/c/h/r/chrome-extension-management-api-guide-use-cases-best-practices.md` | `draft` |
| 353 | `agentic-review/chrome-extension-oauth-login-identity-api-implementation-security-guide` | `public/content/articles/c/h/r/chrome-extension-oauth-login-identity-api-implementation-security-guide.md` | `draft` |
| 352 | `agentic-review/mastering-the-chrome-extension-cookies-api-a-beginner-friendly-guide` | `public/content/articles/m/a/s/mastering-the-chrome-extension-cookies-api-a-beginner-friendly-guide.md` | `draft` |
| 351 | `agentic-review/chrome-extension-history-api-a-developers-guide-to-mastery` | `public/content/articles/c/h/r/chrome-extension-history-api-a-developers-guide-to-mastery.md` | `draft` |
| 350 | `agentic-review/chrome-extension-downloads-api-a-comprehensive-guide-for-developers` | `public/content/articles/c/h/r/chrome-extension-downloads-api-a-comprehensive-guide-for-developers.md` | `draft` |
| 348 | `agentic-review/chrome-extension-declarative-content-api-a-comprehensive-guide-with-examples` | `public/content/articles/c/h/r/chrome-extension-declarative-content-api-a-comprehensive-guide-with-examples.md` | `draft` |
| 347 | `agentic-review/chrome-extension-bookmarks-api-a-developers-comprehensive-guide` | `public/content/articles/c/h/r/chrome-extension-bookmarks-api-a-developers-comprehensive-guide.md` | `draft` |
| 346 | `agentic-review/chrome-extension-alarm-not-firing-step-by-step-debugging-guide` | `public/content/articles/c/h/r/chrome-extension-alarm-not-firing-step-by-step-debugging-guide.md` | `draft` |
| 338 | `agentic-review/chrome-logger-your-guide-to-streamlined-debugging-in-chrome` | `public/content/articles/c/h/r/chrome-logger-your-guide-to-streamlined-debugging-in-chrome.md` | `draft` |
| 337 | `agentic-review/how-to-use-chrome-extensions-in-incognito-mode-a-complete-guide` | `public/content/articles/h/o/w/how-to-use-chrome-extensions-in-incognito-mode-a-complete-guide.md` | `draft` |
| 336 | `agentic-review/zoom-chrome-extension-a-practical-guide-for-productivity-and-troubleshooting` | `public/content/articles/z/o/o/zoom-chrome-extension-a-practical-guide-for-productivity-and-troubleshooting.md` | `draft` |

## Merged agent outputs

The pilot workboard separately records four earlier `seo_agent_pro` pilot topics as merged/live outputs. They were not converted back to Draft because doing so would be an unrequested retroactive unpublish operation. They remain outside this new Draft-only batch and must be handled through a separate explicit editorial decision if the owner wants to revert them.

The repository also contains other historical Draft files that are not automatically attributable to `seo_agent_pro`. Therefore, the 98 Draft files found in `origin/main` must not be mass-edited merely because they are Draft; ownership and provenance must be established per article.

## Safety boundary

No published article was changed to Draft. No index or Sitemap entry was added for the new article. No Google indexing request, schedule, workflow dispatch, or auto-publish operation was executed. Human review is required before any article PR is merged or any status is changed to `published`.
