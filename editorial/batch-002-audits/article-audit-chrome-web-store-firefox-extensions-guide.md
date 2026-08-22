# Audit — `chrome-web-store-firefox-extensions-guide`

**Primary keyword:** `web store firefox`  
**KeywordStats signal:** 500 average monthly searches; competition `Faible`; indexed competition `0`. These are planning data, not Search Console performance.

**Proposed title:** Chrome Web Store vs Firefox Add-ons: Compatibility, Migration, and Safe Installation  
**Reserved slug:** `chrome-web-store-firefox-extensions-guide`  
**Search intent:** understand Chrome Web Store versus Firefox Add-ons and move extensions through supported compatibility paths

## Internal overlap decision

Existing Chrome Web Store guides focus on finding/installing Chrome extensions; this page must own cross-browser compatibility and must not claim direct Chrome Web Store installation in Firefox.

## Competitor/content gap to address

Explain Add-ons stores, WebExtensions compatibility, manifest/API differences, testing, migration of settings, and safe alternatives for users who cannot port an extension.

## Editorial plan

The article must open with the reader decision represented by the intent above, then give a task-specific setup or compatibility path, followed by limitations, privacy/security considerations, troubleshooting, and a concise final decision. It must not copy a generic introduction, TL;DR, FAQ, comparison table, or image from another article. Any product claim must be checked against the first-party sources below at generation time.

## Acceptance constraints

The agent must use the exact reserved slug and write only the assigned article plus its audit on its own branch. The content PR must not modify `public/content/articles-index.json`, `public/sitemap.xml`, or another article. The article remains `status: draft` until human review; this batch is intentionally not published or scheduled.

## Sources

[1]: https://extensionworkshop.com/documentation/develop/porting-a-google-chrome-extension/
[2]: https://developer.mozilla.org/en-US/docs/Mozilla/Add-ons/WebExtensions/Chrome_incompatibilities
[3]: https://support.mozilla.org/en-US/kb/switching-chrome-firefox

## Reserved status

`approved_for_generation` — generation is authorized for this controlled batch, not publication authorization.
