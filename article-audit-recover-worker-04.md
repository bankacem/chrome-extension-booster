# Editorial audit — Worker-04 recovery

## Before editing

- **Slug:** `pro-student-chrome-extensions-the-ultimate-academic-stack`
- **Published:** 2026-01-27
- **Previous update:** 2026-02-02
- **Editorial priority:** The source was a broad listicle with keyword stuffing, unverified plan limits and product capabilities, unqualified AI/privacy claims, an aggressive sales tone, and an appended offline section in a different format. The historical Worker-04 branch was not available, so this is a fresh recovery branch from `origin/main`.
- **Primary search intent:** Help a student assemble a small, task-based browser workflow for research, deadlines, reading, drafting, focus, accessibility, and privacy.
- **Primary keyphrase:** `Chrome extensions for students`.
- **Supporting concepts:** student Chrome extensions, academic browser workflow, research citation extension, study tools, extension permissions.
- **Internal-cannibalization decision:** This page owns the student academic workflow. It is not a generic productivity roundup, a professional tools guide, a memory guide, or a standalone AI-writing article. Internal links remain contextual and do not duplicate another page's structure.
- **Competitor gap:** Student listicles enumerate tools but usually do not map each tool to an academic task, explain exit/export plans, distinguish capture from citation verification, or address institutional policy and privacy.

## Sources consulted

1. Zotero, “Connectors”: https://www.zotero.org/download/connectors
2. Google Chrome Web Store Help, “Install and manage extensions”: https://support.google.com/chrome_webstore/answer/2664769?hl=en
3. Chrome for Developers, “Declare permissions”: https://developer.chrome.com/docs/extensions/develop/concepts/declare-permissions
4. Chrome Web Store Education category: https://chromewebstore.google.com/category/extensions/productivity/education

## Edit plan and decisions

1. Replace the broad “academic arsenal” listicle with a task-to-tool planning table.
2. Keep Zotero as a source-capture example, while stating that metadata must be checked and that the desktop application is separate.
3. Add practical workflows for capture, tasks, annotation, drafting, focus, accessibility, and privacy.
4. Remove unsupported prices, plan limits, “industry-leading” claims, and guarantees about AI or offline behavior.
5. Add responsible-use guidance for AI and academic authorship.
6. Reduce ExtensionTo promotion to one relevant screenshot example and avoid turning the article into an advertising page.
7. Add a unique FAQ focused on student workflow and institutional constraints; no FAQ schema is added by default.
8. Keep the existing assigned featured image; no image was copied from another article.

## After editing

- `status` remains `published` for normal indexing.
- `updated_at` is advanced to 2026-08-22.
- No shared index or sitemap file was edited on this worker branch.
- Validation required before merge: index sync, build, typecheck, performance, SEO, links, and `git diff --check`.
