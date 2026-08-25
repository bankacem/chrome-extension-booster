---
seo_title: "How to Build a Chrome Extension with Manifest V3"
title: "How to Build a Chrome Extension with Manifest V3: Beginner Guide"
id: ecc80886-f055-442b-8d2e-4135cf4deaf6
slug: "google-chrome-programm-en-14"
excerpt: "Learn the current building blocks of a Chrome extension: manifest.json, a popup, permissions, and a practical Manifest V3 starter project."
featured_image: /content/images/google-chrome-programmé-en-14/featured.webp
category: "Chrome Extensions"
tags:
  - chrome extensions
  - manifest v3
  - javascript
keywords:
  - build a Chrome extension
  - Chrome extension Manifest V3
meta_description: "Build a small Chrome extension with Manifest V3. Learn manifest.json, permissions, service workers, popup code, and safe testing steps."
faq:
  - question: "What do I need to build a Chrome extension?"
    answer: "You need a manifest.json file and the HTML, CSS, and JavaScript files required by your extension. A popup, service worker, and content script are optional components chosen for the behavior you want."
  - question: "What is Manifest V3 in Chrome extensions?"
    answer: "Manifest V3 is the current Chrome extensions platform model. It uses service workers for event-driven background work and restricts remotely hosted executable code."
  - question: "Can a Chrome extension use a service worker as a permanent background page?"
    answer: "No. A Manifest V3 service worker is event-driven and can be stopped when idle, so persistent state should be stored with an extension storage API rather than only in a JavaScript variable."
  - question: "What permissions should a beginner request?"
    answer: "Request only the permissions needed for the feature. Use a narrow permission such as activeTab when it fits, and explain broader host access clearly to users."
  - question: "How do I test a Chrome extension before publishing it?"
    answer: "Load the project as an unpacked extension from chrome://extensions with Developer mode enabled, test the user flow, inspect the service worker console when relevant, and review the requested permissions."
status: published
published_at: '2026-02-03T02:11:00.834+00:00'
scheduled_at: '2026-02-03T02:11:00+00:00'
author: James Mitchell
author_image: /content/images/authors/james-mitchell.png
views: 0
read_time: 7
created_at: '2026-01-24T18:21:55.433546+00:00'
updated_at: '2026-08-25T00:00:00.000Z'
canonicalPath: /blog/google-chrome-programm-en-14
description: "Build a small Chrome extension with Manifest V3. Learn manifest.json, permissions, service workers, popup code, and safe testing steps."
---
Chrome extensions are small web applications that can add browser actions, page features, or background behavior. They are built with HTML, CSS, JavaScript, and a manifest that declares the extension's identity and capabilities. This guide uses the current Manifest V3 model and a small popup example; the [official Chrome for Developers documentation](https://developer.chrome.com/docs/extensions) remains the source of truth for API details and platform changes.

> **Quick answer:** To build a Chrome extension, start with `manifest.json`, choose the narrowest permissions that fit the feature, and add only the components you need: a popup for user controls, a service worker for event-driven background work, or a content script for page interaction. Load the project unpacked from `chrome://extensions`, test it in Chrome, and consult the current Manifest V3 documentation before publishing.

## Table of Contents

[Introduction to Building Chrome Extensions](#introduction-to-building-chrome-extensions)
[Extension Architecture: Picking the Right Pattern](#extension-architecture-picking-the-right-pattern)
[Manifest V3 and the Service Worker Change](#manifest-v3-and-the-service-worker-change)
[Benefits of Programming Your Own Chrome Behavior](#benefits-of-programming-your-own-chrome-behavior)
[Build Your First Extension: A Real Walkthrough](#build-your-first-extension-a-real-walkthrough)
[Common Mistakes When Programming Chrome Extensions](#common-mistakes-when-programming-chrome-extensions)
[Tools and Languages Worth Knowing](#tools-and-languages-worth-knowing)
[Getting Started: Your Action Plan](#getting-started-your-action-plan)
[Frequently Asked Questions](#frequently-asked-questions)

## Introduction to Building Chrome Extensions

Before writing code, decide what the extension should do, which page or browser event it needs to access, and whether the feature needs a popup, a service worker, or a content script. Starting with that narrow scope makes the manifest easier to review and reduces unnecessary permissions.

### The manifest.json File: Where Every Extension Starts

Every Chrome extension, no matter how simple or complex, starts with a single required file: `manifest.json`. It tells Chrome what the extension is called, what it's allowed to do, and which files to run. Here's the minimum you actually need:

```
{
  "manifest_version": 3,
  "name": "My First Extension",
  "version": "1.0",
  "description": "Does one simple thing well",
  "action": {
    "default_popup": "popup.html"
  },
  "permissions": ["activeTab"]
}
```

That is enough for a minimal popup extension, but each field should match the feature you are implementing. Manifest V3 also does not allow an extension to execute remotely hosted JavaScript; executable logic must be included in the reviewed extension package. See the [official manifest reference](https://developer.chrome.com/docs/extensions/reference/manifest) for the fields and restrictions that apply to the current platform.

## Extension Architecture: Picking the Right Pattern

Before writing any code, it's worth knowing that almost every Chrome extension follows one of four architecture patterns. Picking the wrong one is the single most common reason beginner projects get overcomplicated:

| Pattern | What It Can Do | Complexity | Typical Use Case |
| --- | --- | --- | --- |
| Popup only | Runs code only while its popup is open; no background activity | Lowest | A calculator, color picker, or quick-reference tool |
| Popup + Service Worker | Popup starts actions; the service worker responds to supported events after the popup closes | Low-Medium | Alarms, event handling, or scheduled work |
| Popup + Service Worker + Content Script | User controls, event-driven background work, and page interaction | Medium-High | Tools that coordinate settings with page behavior |
| Content Script only | Runs automatically on matching pages, no popup or persistent background needed | Low | Dark mode injectors, readability tools, simple page modifiers |

If you're building your first extension, start with the smallest pattern that can deliver the feature. A content script that needs privileged extension APIs should communicate with the extension's service worker or another permitted context; it should not assume that page code can call every Chrome API directly.

## Manifest V3 and the Service Worker Change

If you find an older tutorial, check whether it uses Manifest V2. Manifest V3 uses an event-driven service worker instead of a long-lived background page. The worker wakes for supported events and may be stopped when idle, so code must not depend on a global variable remaining in memory between events. Store persistent state with `chrome.storage` when the feature requires it. See Chrome’s [Manifest V3 overview](https://developer.chrome.com/docs/extensions/develop/migrate/what-is-mv3) and [service worker migration guide](https://developer.chrome.com/docs/extensions/develop/migrate/to-service-workers).

This single change is responsible for the most common error beginners hit when following an outdated guide:

```
Error: The "background.scripts" key cannot be used with manifest_version 3.
Use the "background.service_worker" key instead.
```

The migration is not just a label change: replace the old background-page declaration with the Manifest V3 `background.service_worker` field and review the rest of the APIs used by the tutorial. Keep site access in the appropriate permission fields, request only what the feature needs, and test the extension after loading it unpacked. Chrome’s migration documentation lists the platform changes rather than assuming an old example still applies.

### Benefits of Programming Your Own Chrome Behavior

The benefits are concrete, not abstract:

- Automate repetitive tasks, saving time and increasing productivity
- Customize their browsing experience to fit their specific needs
- Enhance their workflow with powerful tools and extensions
- Improve their overall browsing experience with features like our [Redirect Shield](/extension/redirect-shield) to protect against malicious redirects

## Build Your First Extension: A Real Walkthrough

Theory only gets you so far. Here's a complete, working extension — a popup that changes the current page's background color, the same "hello world" project most official tutorials use because it touches every core piece (manifest, popup, and a script that talks to the active tab).

**1. Create `manifest.json`:**

```
{
  "manifest_version": 3,
  "name": "Background Color Changer",
  "version": "1.0",
  "description": "Changes the background color of the current page",
  "action": { "default_popup": "popup.html" },
  "permissions": ["activeTab", "scripting"]
}
```

**2. Create `popup.html`:**

```
<!DOCTYPE html>
<html>
<body style="width: 150px">
  <button id="changeColor">Turn page blue</button>
  <script src="popup.js"></script>
</body>
</html>
```

**3. Create `popup.js`:**

```
document.getElementById("changeColor").addEventListener("click", async () => {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  chrome.scripting.executeScript({
    target: { tabId: tab.id },
    func: () => { document.body.style.backgroundColor = "#0ea5e9"; }
  });
});
```

That's a complete, functional extension in three files. The `scripting` permission and `chrome.scripting.executeScript` call are what let the popup reach into the active tab and change it — this is the "Popup + Content Script" pattern from the table above, without needing a persistent service worker at all, since nothing needs to happen after the popup closes.

## Common Mistakes When Programming Chrome Extensions

A few issues account for most of the frustration beginners run into:

- **Following an old Manifest V2 tutorial.** If a guide uses a persistent background page, check the current Manifest V3 migration requirements and update the example rather than copying it unchanged.
- **Requesting broader permissions than needed.** Use a narrow permission when it fits the feature, explain any broader host access, and review the current Chrome Web Store permission and disclosure requirements before publishing.
- **Expecting the service worker to stay alive.** Any state you store in a plain JavaScript variable inside the service worker disappears when it goes idle. Use `chrome.storage` for anything that needs to persist — not `localStorage`, which service workers can't reliably access at all.
- **Assuming content scripts can do anything.** They can read and modify the page's DOM, but they can't call most privileged Chrome APIs directly — that has to be routed through the service worker via message passing.
- **Not knowing how to debug a service worker.** Unlike a regular webpage, a service worker doesn't show up if you right-click and "Inspect" the page. Go to `chrome://extensions`, find your extension, and click the "service worker" link under its name — that opens a dedicated DevTools console for it, including any errors that happened while it was asleep.

## Tools and Languages Worth Knowing

You don't need a long list of tools to get started — a text editor and Chrome's own Developer Mode are enough.

### Chrome Extensions Worth Studying

Looking at how existing extensions are built is one of the fastest ways to learn. [Quick Screenshot Lite](/extension/quick-screenshot-lite) (screenshots), [Light Popup Blocker](/extension/light-popup-blocker) (blocking popups), and [ProTab Suspender](/extension/protab-suspender) (suspending inactive tabs) each solve one specific problem well — a good pattern to copy for your first extension.

### The Only Language You Actually Need: JavaScript

The extension package commonly uses HTML, CSS, and JavaScript. A service worker can respond to extension events, while a content script can read or modify permitted page content. Both are declared through the manifest and must follow the permissions and platform rules for the feature; a separate server is optional, not required for a basic extension.

## Getting Started: Your Action Plan

The fastest way in isn't reading more theory — it's building one small thing:

1. Create a folder with the three files from the walkthrough above (`manifest.json`, `popup.html`, `popup.js`)
2. Load it into Chrome via `chrome://extensions` → enable Developer Mode → "Load unpacked"
3. Click your new toolbar icon and confirm the button actually changes the page color
4. Once that works, look at how an extension like our [SecuraKey Pro](/extension/securakey-pro) handles secure storage, for a sense of what a "real" extension's code looks like. The [official Get Started tutorial](https://developer.chrome.com/docs/extensions/get-started) is a solid next step once you've built this first one.

## Conclusion

A small Manifest V3 extension can start with a manifest, a popup, and a focused JavaScript action. Build the smallest useful version, load it unpacked, inspect errors in the relevant DevTools context, and expand permissions only when the feature requires them. For related reading, see our [Chrome high-memory troubleshooting guide](/blog/how-to-fix-chrome-high-memory-usage-the-ultimate-2026-speed-up-guide) and [essential Chrome extensions guide](/blog/pro-essential-chrome-extensions-the-ultimate-guide).

## Frequently Asked Questions

### What do I need to build a Chrome extension?

You need a `manifest.json` file and the HTML, CSS, and JavaScript files required by your extension. A popup, service worker, and content script are optional components chosen for the behavior you want.

### What is Manifest V3 in Chrome extensions?

Manifest V3 is the current Chrome extensions platform model. It uses service workers for event-driven background work and restricts remotely hosted executable code.

### Can a Chrome extension use a service worker as a permanent background page?

No. A Manifest V3 service worker is event-driven and can be stopped when idle, so persistent state should be stored with an extension storage API rather than only in a JavaScript variable.

### What permissions should a beginner request?

Request only the permissions needed for the feature. Use a narrow permission such as `activeTab` when it fits, and explain broader host access clearly to users.

### How do I test a Chrome extension before publishing it?

Load the project as an unpacked extension from `chrome://extensions` with Developer mode enabled, test the user flow, inspect the service worker console when relevant, and review the requested permissions.
