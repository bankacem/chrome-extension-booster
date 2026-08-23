---
id: "30c36fb5-a5f7-4a5e-8211-729ee4a63103"
title: "Chrome Extension Context Menu: Add-Ons That Work from Right-Click"
slug: chrome-extension-context-menu-guide
status: draft
excerpt: "Understand how Chrome extension context menus decide when to appear, how to target links, selections, and media with URL patterns, and how to troubleshoot missing right‑click items."
meta_description: "Learn how Chrome extension context menus work, when items appear on right‑click, how to use documentUrlPatterns and targetUrlPatterns, and how to troubleshoot missing menu items."
featured_image: /og-image.png
category: "Chrome Extensions"
tags:
  - "Chrome extensions"
  - "Context menu"
  - "Troubleshooting"
  - "Development"
keywords:
  - "chrome extension context menu"
  - "contextMenus API"
  - "documentUrlPatterns"
  - "targetUrlPatterns"
  - "right-click actions"
  - "Chrome match patterns"
author: "Miccart Phen"
published_at: 2026-08-23
read_time: 7
---
Why one extension shows only on right‑clicking a link, another only on images, and a third never appears comes down to how the contextMenus API scopes visibility. This guide clarifies the contexts that control when items appear, how URL patterns narrow where they show, and the fastest fixes when your item seems to be missing.

## What a Chrome extension context menu is
A context menu item is an action your extension adds to Chrome’s right‑click menu via the contextMenus API. Each item declares:
- contexts: page, selection, link, image, video, audio, editable, and others
- Optional URL filters that further limit visibility: documentUrlPatterns and targetUrlPatterns

Using contextMenus requires the contextMenus permission in your manifest. Items can be nested, and you handle clicks in listeners. The official API reference covers all options and events.

![Chrome Extension Context Menu: Add-Ons That Work from Right-Click workflow illustration](/content/images/chrome-extension-context-menu-guide/chrome-extension-context-menu-guide-workflow.webp)
*Screenshot: Editorial illustration of the practical chrome extension context menu workflow described in this guide; it is not a product screenshot.*

## Minimal setup: permission, background, and one item
Start small so visibility issues are obvious.

```json
// manifest.json (Manifest V3)
{
  "name": "Right‑Click Demo",
  "manifest_version": 3,
  "version": "1.0.0",
  "permissions": ["contextMenus"],
  "background": {"service_worker": "background.js"}
}
```

```js
// background.js
chrome.runtime.onInstalled.addListener(() => {
  chrome.contextMenus.create({
    id: "demo-selection",
    title: "Do something with selection",
    contexts: ["selection"]
  });
});

chrome.contextMenus.onClicked.addListener((info, tab) => {
  if (info.menuItemId === "demo-selection" && info.selectionText) {
    // Handle the selected text here.
  }
});
```

If you right‑click selected text, the item should appear. If it doesn’t, jump to Troubleshooting.

## Contexts vs. URL filters: when an item appears
Contexts decide what kind of element the user clicked. URL filters decide where on the web the item can show.

- contexts: Choose where the item makes sense (page, selection, link, image, video, audio, editable, etc.).
- documentUrlPatterns: Filters by the page’s URL where the right‑click happened (for example, https://docs.example.com/*).
- targetUrlPatterns: Filters by the clicked element’s own URL, if it has one (the href of a link or the src of an image/video/audio).

Match patterns follow a scheme://host/path format with specific wildcard rules. Some schemes and pages are not matchable; test broad, then narrow.

### Picking the right combination
- Right‑clicked empty page area or general background
  - contexts: ["page"]
  - Restrict with documentUrlPatterns
- Right‑clicked highlighted/selected text
  - contexts: ["selection"]
  - Restrict with documentUrlPatterns
- Right‑clicked a hyperlink
  - contexts: ["link"]
  - Restrict with targetUrlPatterns (for the link’s href), optionally documentUrlPatterns
- Right‑clicked image, video, or audio
  - contexts: ["image"] / ["video"] / ["audio"]
  - Restrict with targetUrlPatterns (for src), optionally documentUrlPatterns
- Right‑clicked an editable field (input/textarea/contentEditable)
  - contexts: ["editable"]
  - Restrict with documentUrlPatterns

Tip: targetUrlPatterns is meaningful only if the element exposes its own URL (links and media). For page or selection, use documentUrlPatterns.

## Practical examples with match patterns
Use precise patterns to keep menus relevant.

1) Only on specific domains (any path):
```js
chrome.contextMenus.create({
  id: "page-acme",
  title: "Action on Acme pages",
  contexts: ["page"],
  documentUrlPatterns: ["https://acme.com/*", "https://*.acme.com/*"]
});
```

2) Only on links to PDFs (clicked link ends with .pdf):
```js
chrome.contextMenus.create({
  id: "link-pdf",
  title: "Handle PDF link",
  contexts: ["link"],
  targetUrlPatterns: ["*://*/*.pdf"]
});
```

3) Only on images from a CDN, on one site:
```js
chrome.contextMenus.create({
  id: "img-cdn",
  title: "Process CDN image",
  contexts: ["image"],
  documentUrlPatterns: ["https://docs.example.com/*"],
  targetUrlPatterns: ["https://cdn.example.com/*"]
});
```

Note: Some URL schemes and internal browser pages are not matchable. When in doubt, start broad and then tighten.

## Handling clicks and passing data safely
When a user clicks your item, onClicked receives useful fields:
- menuItemId: your created ID
- selectionText: selected text, if any
- linkUrl: link target URL, if on a link
- srcUrl: media source URL, if on image/video/audio
- pageUrl: the page URL

Use these rather than querying the DOM after the fact. If your action modifies the page, you may also need host permissions or to inject a script via extension APIs. The contextMenus docs describe the payload and options.

## Why your menu item is missing (and how to fix it)
Work through these checks in order.

1) Missing permission
- Ensure "permissions": ["contextMenus"] is in manifest.json.
- Reload the extension after changes.

2) Wrong context
- An item with contexts: ["selection"] won’t appear on plain page clicks. If you want both, use ["page", "selection"].

3) URL filters don’t match
- documentUrlPatterns filters the page; targetUrlPatterns filters the clicked element. Mixing them up is common.
- Test without patterns, confirm it appears, then add patterns incrementally.
- Check schemes. If you target file:// or other non‑HTTP(S), verify the pattern syntax.

4) Hidden in a long menu
- With many items from multiple extensions, Chrome may group or collapse menus. Fewer top‑level items or a parent/child structure makes yours easier to spot.

5) Click fires, but nothing happens
- Confirm chrome.contextMenus.onClicked is registered in your background service worker.
- Log the handler to verify selectionText, linkUrl, or srcUrl are present as expected.

6) Appears only on some elements on the same page
- That’s expected with specific contexts or targetUrlPatterns.
- Inspect the element: is it an <a> with an href, or a JavaScript handler without a real link? Only true link targets expose linkUrl.

## Designing clear, predictable right‑click actions
- Keep one top‑level verb per use case; use a submenu (parentId) for variants.
- Default to the narrowest useful context. If your feature acts on selected text, prefer selection over page.
- Use documentUrlPatterns to limit where the item appears, keeping unrelated sites uncluttered.
- For links and media, prefer targetUrlPatterns when you care about the destination URL.

If you also support keyboard‑driven workflows, pair right‑click with the address bar. See our [Chrome Omnibox guide](/blog/chrome-omnibox-guide) for command‑style navigation that complements context menus.

## Known limitations and edge cases
- Limited coverage on special pages: Some schemes and internal pages are not matchable, so items won’t appear there.
- Element must expose a target URL: targetUrlPatterns applies only to link/media targets with href/src.
- UI differences across Chrome versions: Presentation of long or nested menus can vary. Lean menus and testing with/without filters keep behavior predictable.

If your use case involves capturing or annotating images, compare native right‑click actions with focused tools in this overview of [quick screenshot Chrome tools](/blog/best-quick-screenshot-chrome-tools-3).

## Quick checklist before you ship
- contexts set to the minimum needed for clarity
- documentUrlPatterns and targetUrlPatterns tested on representative pages/elements
- onClicked handler consumes selectionText, linkUrl, srcUrl, and pageUrl as needed
- Submenus used for related actions; avoid excessive top‑level items
- Permissions limited to what the API requires

## FAQ
- Why doesn’t my item show on a site’s right‑click menu at all?
  Some pages and schemes are not matchable by design. Remove URL patterns first; if it still doesn’t appear with a broad context (like page), consult match pattern rules to confirm the scheme is allowed.

- Can I make an item that appears only on videos from a particular CDN?
  Yes. Use contexts: ["video"] with targetUrlPatterns that match that CDN’s host and path.

- What’s the difference between documentUrlPatterns and targetUrlPatterns in one sentence?
  documentUrlPatterns filters by the page URL of the click; targetUrlPatterns filters by the clicked element’s own URL (for links and media).

- Do I need host permissions just to show a context menu item?
  To show the item, you need the contextMenus permission. If your action reads or modifies page content, additional permissions may be required depending on the APIs you use.

## References
- [contextMenus API documentation](https://developer.chrome.com/docs/extensions/reference/api/contextMenus)
- [Chrome match patterns](https://developer.chrome.com/docs/extensions/develop/concepts/match-patterns)
