# Batch 005 editorial audit — 20 additional drafts

## Scope

Batch 005 contains 20 additional Chrome extension articles. It is intentionally scheduled after the active 50-article program, with five releases per day from 2026-09-03 through 2026-09-06 in the Africa/Algiers timezone. All 20 remain `draft` until their scheduled release. No article is a duplicate slug in the current 755-item English index or the active 50-entry schedule.

## Intent and collision decisions

The topics were selected as narrow user or developer tasks rather than broad “best extensions” listicles. The set covers sync diagnosis, popup and toolbar visibility, delayed updates, data recovery, backup planning, storage quotas, Web Store review states, MV3 APIs, CSP, resource exposure, Guest mode, restricted Chrome pages, clipboard boundaries, context-specific debugging, version verification, tab-group recovery, and read-later workflow design.

The collision review explicitly excluded the current 50-article intents: generic extension permissions, host permissions, Incognito, file URLs, generic website troubleshooting, installation errors, developer mode, service workers, content scripts, side panels, context menus, notifications, profile switching, manual updates, and the existing product guides. Close pairs inside Batch 005 were kept only where the task differs: sync diagnosis versus popup behavior, lost settings versus planned backup, and Web Store rejection versus resource exposure.

## Source and claim policy

The drafts cite official Chrome or Google Help documentation for API behavior, version boundaries, storage limits, update lifecycle, Web Store policy, and browser context restrictions. Search snippets were used only for topic discovery. No claim says that Google rankings are weak, that an article will rank first, or that ExtensionTo personally tested a product. Current UI labels and limits should be rechecked when an article is eventually updated for publication.

## Visual decision

Every draft has one unique inline explanatory illustration and one unique Hero image. Both are stored as WebP and AVIF siblings, with article-specific filenames, alt text, and captions. The captions identify the visuals as editorial illustrations rather than product screenshots. This preserves the approved Zoom standard without fabricating a screenshot or claiming a personal test.

## Release gate

The Batch 005 workflow checks that the article is still a draft, the release slot is enabled, the inline WebP and AVIF exist, and the featured WebP and AVIF exist. After a successful release it rebuilds the article index and Sitemap in the same run. The workflow is idempotent and does not send Google Indexing API requests; Search Console remains the evidence source for Google indexing.

## Validation record

The local batch passed article/image QA, build, typecheck, performance budgets, SEO smoke tests, internal-link smoke tests, and `git diff --check`. The QA record is stored in `batch-005-article-image-qa.json`; the source topic and visual records are stored next to this file under `editorial/`.
