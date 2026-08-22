# Editorial audit — Worker-01 recovery

## Before editing

- **Slug:** `how-to-get-the-most-out-of-your-browser-with-extension-chrome-get`
- **Published:** 2026-05-04
- **Previous update:** 2026-05-04
- **Editorial priority:** The source article was a generic 12KB listicle with no usable heading structure for the parser, no contextual references to official Chrome documentation, repeated promotional blocks, broken table-of-contents anchors, an unsupported statement that Chrome extensions are exclusive to Chrome, and an FAQ/table that repeated generic claims.
- **Primary search intent:** A reader wants to discover, install, evaluate, and manage Chrome extensions safely—not receive an undifferentiated list of popular add-ons.
- **Primary keyphrase:** `extension chrome get`.
- **Supporting concepts:** find Chrome extensions, install Chrome extensions, manage Chrome extensions, extension permissions, site access, remove unused extensions.
- **Internal-cannibalization decision:** Keep this page as the task-oriented discovery and maintenance guide. It should not compete with the dedicated power-user workflow article, the professional browser-tools guide, or standalone security/performance articles. Those pages are linked only where the reader needs a deeper, separate task.
- **Competitor gap:** Existing generic management guides explain permission types but do not provide a compact discovery-to-maintenance workflow with a permission-fit table and a troubleshooting path.

## Sources consulted

1. Google Chrome Web Store Help, “Install and manage extensions”: https://support.google.com/chrome_webstore/answer/2664769?hl=en
2. Chrome for Developers, “Declare permissions”: https://developer.chrome.com/docs/extensions/develop/concepts/declare-permissions
3. Compliance Specialists, “Browser Security: A Quick Guide to Managing Your Browser Extensions”: https://compliancespecialistsusa.com/browser-security-a-quick-guide-to-managing-your-browser-extensions/

## Edit plan and decisions

1. Replace the generic listicle opening with a clear task-based promise.
2. Add a five-step discovery and vetting workflow.
3. Align installation and permission language with current Chrome documentation.
4. Add a unique site-access decision table for one-off, domain-specific, and broad-access use cases.
5. Remove unsupported safety guarantees, fabricated performance outcomes, and the false claim that extensions work only in Chrome.
6. Keep ExtensionTo product links contextual and limited to relevant tasks; remove the repeated promotional card and unrelated comparison table.
7. Add a unique FAQ that answers installation, access, maintenance, and removal questions without adding FAQ schema by default.
8. Keep the existing featured image because it is assigned to this slug; no image was copied from another article.

## After editing

- The article uses a self-canonical default because no `canonicalPath` override is present.
- `status` remains `published` so the normal sync pipeline can index it.
- `updated_at` is advanced to 2026-08-22.
- No shared index or sitemap file was edited on this worker branch.
- Validation required before merge: index sync, build, typecheck, performance, SEO, links, and `git diff --check`.
