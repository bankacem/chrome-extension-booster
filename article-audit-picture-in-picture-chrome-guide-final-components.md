# Final component audit: Picture-in-Picture Chrome

## Scope

This update completes the requested technical components for the existing `picture-in-picture-chrome-guide`. It preserves the article’s established search intent, authoritative tone, published date, existing troubleshooting content, and current internal links. The four image items are detailed production briefs only; no screenshots were generated or inserted because the request was for specifications.

## Decisions

1. The Standard Video PiP versus Document PiP comparison is placed after the Document PiP explanation, where the reader already has the necessary context. The table contrasts target element, trigger, controls, developer effort, and browser compatibility without claiming that an extension can bypass site policy.
2. HowTo data is stored in article frontmatter and the prerenderer emits it with the matching FAQPage inside one `@graph` script in the document head. The visible Markdown contains no raw JSON-LD code block, preventing duplicate or confusing display to readers.
3. The HowTo steps describe the visible built-in workflow and the official extension fallback. FAQPage contains only questions whose answers are visibly present in the article. Google’s general structured-data guidance is treated as the quality boundary: markup must describe visible content and may enable, but never guarantees, a rich result.
4. Three contextual internal links point to existing ExtensionTo guides: the power-user workflow, extension management, and complete extension selection. No exact-match PiP anchor is used for a non-PiP destination.
5. The four image briefs specify neutral screenshots, privacy-safe crops, filenames, SEO alt text, captions, and acceptance checks. They are deliberately separate from the article body to keep the rendered page compact.

## Validation

The final local build prerendered 752 English articles with no missing Markdown warning. The final target HTML was 29,863 bytes after the comparison-table and real-head Schema changes, remaining within the project’s 30 KB budget. The final rendered page contains one Article, one BreadcrumbList, one FAQPage, and one HowTo in the head `@graph`; the body contains no JSON-LD script. The deliverable JSON-LD block exactly matches the generated `@graph`. The three internal-link destinations each occur exactly once.

`npm run typecheck`, `npm run build`, `npm run test:performance`, `npm run test:seo`, `npm run test:links`, and `git diff --check` passed. No Google ranking or indexing outcome is asserted without Search Console data.

## References

- [Chrome Developers: Picture-in-Picture for any element, not just video](https://developer.chrome.com/docs/web-platform/document-picture-in-picture)
- [Google Search Central: Introduction to structured data markup in Google Search](https://developers.google.com/search/docs/appearance/structured-data/intro-structured-data)
