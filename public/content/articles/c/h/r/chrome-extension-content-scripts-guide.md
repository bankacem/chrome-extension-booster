---
id: "b0ad8e34-0392-4e40-97da-d5f177c7eb7e"
title: "Chrome Extension Content Scripts: Where They Run and What They Can Access"
slug: chrome-extension-content-scripts-guide
status: draft
excerpt: "Understand where Chrome extension content scripts execute, how isolated worlds work, what they can touch in the page, and when to inject them using match patterns or activeTab."
meta_description: "Learn content-script scope in Chrome extensions: isolated worlds, DOM access, frames, run_at timing, match patterns, and activeTab. Includes troubleshooting and limitations."
featured_image: /og-image.png
category: "Chrome Extensions"
tags:
  - "Chrome Extensions"
  - "Content Scripts"
  - "Isolated Worlds"
  - "activeTab"
  - "Match Patterns"
  - "Frames"
keywords:
  - "chrome extension content scripts"
  - "isolated world"
  - "match patterns"
  - "activeTab permission"
  - "run_at timing"
  - "iframes"
  - "page interaction"
author: "Miccart Phen"
published_at: 2026-08-23
read_time: 7
---
If you’re building a Chrome extension that reads or modifies a webpage, content scripts are the code that touches the page. This guide explains their runtime behavior—where they execute, what they can access, how isolated worlds work, and when to inject. It also covers frames, match patterns, the activeTab permission, troubleshooting, and key limitations.

## Where content scripts run

Content scripts execute in an isolated world. They run alongside the page but not inside the page’s JavaScript context. As a result:

- You can read and modify the page’s DOM.
- Your variables, functions, and prototypes are separate from those defined by the page. The window you see is a proxied view; page-defined globals aren’t directly visible, and yours aren’t exposed to the page.
- Content scripts have access to only a subset of extension APIs. For unsupported APIs, delegate to a background context via messaging.

This isolation makes content scripts reliable for DOM tasks—parsing, annotating, styling, and adding UI—without colliding with site code.

### Frames and which documents are targeted

Content scripts run in any frame whose document URL matches your targeting rules. Two practical implications:

- Matching is per frame. A cross-origin iframe only gets your script if its own URL matches.
- To run in subframes, opt in to include all frames when you register or declare the script; otherwise only the top frame runs it.

On pages that embed third-party widgets, verify that the iframe’s URL actually matches your patterns.

![Chrome Extension Content Scripts: Where They Run and What They Can Access workflow illustration](/content/images/chrome-extension-content-scripts-guide/chrome-extension-content-scripts-guide-workflow.webp)
*Screenshot: Editorial illustration of the practical chrome extension content scripts workflow described in this guide; it is not a product screenshot.*

## What content scripts can access

- DOM: Query, traverse, and modify elements, attributes, text, and styles. You can listen for events and observe mutations.
- Page-rendered data: Anything present in the DOM (including text and data attributes) is observable. Variables that exist only in page scripts are not.
- A limited set of extension APIs: Messaging, i18n, storage, and others documented for content scripts.

They cannot directly call functions defined by the page or read its variables. When you need to interact with page-level JavaScript, inject a script tag so code runs in the page context, then bridge data via the DOM or custom events. Be aware that the site’s own policies can affect page-context scripts, while content scripts remain isolated.

## How and when content scripts are injected

There are two primary ways to load content scripts into matching tabs:

- Declaratively (manifest): Specify match patterns and timing in the manifest. Chrome loads them automatically when a URL matches.
- Programmatically: Request injection at runtime into a specific tab and frame, often after a user gesture or conditional check.

### Injection timing (run_at)

For declarative injection, choose among:

- document_start: Before DOM construction begins. Good for very early CSS or altering initial HTML.
- document_end: After the document is parsed, before all subresources necessarily finish.
- document_idle: After initial work is likely done. A safe default when you don’t need to race the page.

Programmatic injection effectively lets you pick timing by deciding when to call the API (for example, after a button click).

## Targeting pages with match patterns

Match patterns determine where your scripts run. Key points:

- Scheme matters: http and https are distinct. Use both or <all_urls> when appropriate.
- Host wildcards: *.example.com matches subdomains of example.com, not example.net.
- Paths: /* matches any path; /docs/* limits to that prefix.
- Exclusions: You can exclude specific URLs even if a broader pattern matches.

Remember that frames are matched using their own URLs and that some special schemes and browser pages cannot be matched.

## The role of activeTab

The activeTab permission grants temporary access to the currently active tab after a user gesture that activates your extension (for example, clicking the extension’s action). You can then inject a content script programmatically into that one tab without broad host permissions. This is ideal for on-demand tools and reducing declared host access.

Notes:

- Access is temporary, scoped to the active tab, and triggered by a user gesture.
- Isolation doesn’t change: the script still runs in an isolated world with normal DOM access.
- After navigation, you may need to re-inject, depending on your design.

For broader fundamentals before layering in activeTab, see our [Chrome extension development guide](/blog/chrome-extension-development-guide).

## Choosing how to inject

- Always run on known sites: Prefer manifest-declared scripts for simplicity and reliability.
- Only after user clicks your action: Prefer programmatic injection; pair with activeTab to avoid broad host permissions.
- Conditional logic before injection: Choose programmatic so you can decide based on tab state, user settings, or content.
- Many hosts with different logic: Mix approaches—use a small static bootstrap and inject additional scripts conditionally.

## Why you can see the DOM but not page variables

The isolated world boundary gives content scripts a live view of the page’s DOM but a separate JavaScript scope. That separation protects both your code and the site from accidental interference.

If you must interact with page JavaScript, execute code in the page context and bridge via:

- Custom DOM events and listeners
- Data attributes or hidden elements as a channel
- postMessage between window objects

This preserves content-script isolation while letting the page handle its own logic.

## Common restrictions and gotchas

- Restricted pages: Browser-internal pages (like chrome://) and certain special pages (including the Chrome Web Store) do not allow content scripts.
- Frames surprise: If your code doesn’t run inside an embedded widget, confirm the iframe’s URL matches your patterns and that you opted into subframes.
- Timing mismatch: At document_start, little or no DOM exists. If selectors fail, move to document_end or document_idle, or wait for DOMContentLoaded.
- Limited APIs: If an API isn’t available in content scripts, move that work to a background context and message between contexts.
- Page policies: Page-injected scripts can be constrained by site policies; content scripts remain isolated.

## Troubleshooting: getting a script to actually run

- Confirm the URL match: Test your patterns against the exact URL, including scheme, subdomains, and path.
- Check the frame: Use DevTools and ensure your console is focused on the correct frame context.
- Verify timing: If expected elements appear late, inject at document_idle or wait with a MutationObserver.
- Validate permissions: If relying on activeTab, trigger via a clear user gesture and retry on the active tab.
- Inspect errors: Check both the page console (DOM issues) and the extension console (injection/permission issues).
- Reload the extension: During development, reload after manifest or file updates so Chrome picks up changes.

If your extension is invoked via the address bar keyword, that affects user flow but not content-script isolation. For more on that entry point, see our [Chrome Omnibox guide](/blog/chrome-omnibox-guide).

## Limitations to keep in mind

- No direct access to page-defined variables or functions from content scripts due to isolated worlds.
- Only a subset of extension APIs is available in content scripts; message a background context for privileged work.
- Content scripts run where match patterns allow; they won’t run on restricted pages and schemes.
- Cross-origin iframes require their own URL match; a top-level match isn’t enough.

## FAQ

- Can a content script call a function defined by the page?
  Not directly. Because of isolated worlds, you’d inject a page-context script and communicate indirectly (for example, using DOM events).

- Do content scripts run on the Chrome Web Store?
  No. Chrome restricts extensions from running on certain special pages, including the Web Store and many browser-internal pages.

- Is document_idle the same as “page fully loaded”?
  Not necessarily. It fires when Chrome determines the page is likely done with initial work. If you need a specific element, observe the DOM instead of assuming it’s present.

- Will a content script in the top frame also run in iframes?
  Only if you opt into running in all frames and the iframe’s URL matches your patterns.

## References

- [Content scripts concept](https://developer.chrome.com/docs/extensions/develop/concepts/content-scripts)
- [Match patterns](https://developer.chrome.com/docs/extensions/develop/concepts/match-patterns)
- [activeTab](https://developer.chrome.com/docs/extensions/develop/concepts/activeTab)
