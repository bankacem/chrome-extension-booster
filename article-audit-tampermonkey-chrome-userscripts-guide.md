# Editorial audit — Tampermonkey Chrome: Install and Run Userscripts Safely

## Scope and ownership

This is the first approved new-article job in pilot batch 001. The original seo_agent_pro draft was generated on its own review branch and returned with `status: draft` / `needs_human_review`. This revision remains on that branch and preserves the original article ID while aligning the file path and slug with the reserved topic record `tp001`.

## Search intent

Primary intent: a Chrome user wants to install Tampermonkey, authorize userscript execution, understand how to install or create a first script, and safely disable or troubleshoot it.

Secondary intent: a beginner or power user needs a practical security checklist for script scope, `@match`, `@grant`, `@require`, update behavior, and testing on non-sensitive pages.

Out of scope: a generic “best userscripts” list, claims that every script is safe, browser-specific instructions not verified for current Chrome, and instructions for bypassing site controls or downloading protected media.

## Internal cannibalization review

The reserved topic was checked against the current article index and refined article memory. No existing ExtensionTo article directly owns Tampermonkey or Chrome userscript installation. The article links once to the existing general Chrome-extension management guide, but it does not compete with that guide: the linked page covers extension discovery and management, while this page covers executable userscript review and scope control.

## Competitor gap and unique angle

The original draft followed a generic installation-plus-popular-scripts template. The revised article differentiates itself through a safety-first workflow: official store verification, current authorization requirements, metadata review, narrow `@match` scope, a harmless `example.com` script, rollback instructions, and diagnostic branching. It does not copy competitor headings, tables, FAQs, or examples.

## Fact corrections

- Replaced the generic Chrome Web Store URL with the official Tampermonkey listing URL and publisher/privacy checks.
- Added the current Tampermonkey FAQ distinction between Chrome 138+ “Allow User Scripts” and the documented Developer mode path.
- Removed unsupported named “popular scripts” and avoided claims about ad skipping, media downloading, or universal safety.
- Removed the unverified claim that Tampermonkey has folders and the unsupported “Tampermonkey console” wording.
- Replaced broad and potentially risky examples with a one-domain `@match` example using `@grant none`.
- Added explicit warnings about external `@require` code, sensitive accounts, updates, and broad site scope.
- Corrected the malformed installation heading and replaced the old generic conclusion with a decision checklist.

## On-page and technical decisions

- Target keyword: `tampermonkey chrome`.
- Reserved slug: `tampermonkey-chrome-userscripts-guide`.
- Category: `Chrome Extensions`.
- Visible FAQ: four questions, written specifically for this page.
- FAQPage Schema: not manually added in the article; the site renderer must only emit schema when its visible FAQ contract is satisfied.
- HowTo Schema: not used; the page contains guidance and troubleshooting rather than a standalone structured HowTo implementation.
- Featured image: the workflow supplied the site fallback `/og-image.png`; no fake image path is introduced. A custom educational image can be added as a separate approved asset task if the project’s image pipeline produces a real file.
- Internal links: only a verified existing ExtensionTo blog path is used; external links point to official Tampermonkey and Chrome Web Store sources.

## Acceptance criteria

Before merge, verify that the slug occurs once, the article remains below the 30KB HTML budget, the generated title and description are within project limits, the canonical is self-referential, no placeholder image or `#` link exists, and all build, typecheck, performance, SEO, links, and whitespace checks pass. The article must remain `draft` until Manus reviews the generated page and approves the final status through the normal PR gate.

## Sources

1. Tampermonkey official home and feature overview: https://www.tampermonkey.net/
2. Tampermonkey FAQ Q209, permission to execute userscripts: https://www.tampermonkey.net/faq.php?locale=en&q=Q209
3. Official Tampermonkey Chrome Web Store listing: https://chromewebstore.google.com/detail/tampermonkey/dhdgffkkebhmkfjojejmpbldmpobfkfo?hl=en
