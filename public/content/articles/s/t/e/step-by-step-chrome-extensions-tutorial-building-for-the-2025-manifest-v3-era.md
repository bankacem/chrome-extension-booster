---
seo_title: "Build Chrome Extensions with Manifest V3"
id: c18dec57-79d4-44fa-968e-01c6b9c4960e
title: "Step-by-Step Chrome Extensions Tutorial: Building for the Manifest V3 Era"
slug: step-by-step-chrome-extensions-tutorial-building-for-the-2025-manifest-v3-era
excerpt: >-
  A complete, hands-on tutorial for building Chrome extensions with Manifest V3 in 2025.
  Covers project setup, manifest.json structure, service workers, content scripts,
  permissions, and publishing to the Chrome Web Store — including a V2-to-V3 migration
  checklist.
featured_image: >-
  /content/images/step-by-step-chrome-extensions-tutorial-building-for-the-2025-manifest-v3-era/featured.webp
category: "Developer Tools"
tags:
  - developers
  - Manifest V3
  - tutorial
keywords:
  - Manifest V3 tutorial
  - build Chrome extension
  - Chrome service worker
  - publish Chrome extension
meta_description: "Build and publish a Chrome extension with Manifest V3, service workers, content scripts, permissions, testing, and Web Store preparation."
status: published
published_at: '2026-03-18T20:11:00.24+00:00'
scheduled_at: '2026-03-18T20:11:00+00:00'
author: James Mitchell
author_image: /content/images/authors/james-mitchell.png
views: 0
read_time: 14
created_at: '2026-01-19T13:56:52.373854+00:00'
updated_at: '2026-04-23T12:29:22.061228+00:00'
faq:
  - question: Is Manifest V2 still supported in Chrome?
    answer: >-
      No. Google deprecated Manifest V2 in June 2024 and completed the phase-out in mid-2025.
      Chrome no longer loads Manifest V2 extensions. All new and existing extensions must
      use Manifest V3 to function.
  - question: What is the difference between a service worker and a background page?
    answer: >-
      Manifest V2 used persistent background pages — a hidden HTML page running indefinitely
      in the background, consuming memory and CPU. Manifest V3 replaces this with service
      workers that are event-driven: they wake on an event and terminate when idle,
      typically within 30 seconds of inactivity.
  - question: How do content scripts work in Manifest V3?
    answer: >-
      Content scripts inject JavaScript into web pages the user visits. In Manifest V3,
      you declare them statically in manifest.json under the `content_scripts` field, or
      inject them dynamically using `chrome.scripting.executeScript()`. Dynamic injection
      is preferred because it reduces memory footprint and avoids injecting code into
      every matching page.
  - question: What permissions should I request for my Chrome extension?
    answer: >-
      Request the minimum set of permissions necessary. Use `activeTab` instead of broad
      `tabs` permission when you only need access to the current tab on user interaction.
      Use `host_permissions` for specific origins rather than `<all_urls>`. Google's review
      process scrutinizes overly broad permissions and may reject your submission.
  - question: How long does Chrome Web Store review take in 2025?
    answer: >-
      Standard reviews take 48 to 72 hours. Extensions requesting sensitive permissions
      (broad host access, `debugger`, `devtools`) or flagged for additional review can
      take significantly longer. Google enforces a strict "one appeal" policy for policy
      violations, so ensure full compliance before submitting.
howto:
  name: Build a Manifest V3 Chrome Extension
  description: >-
    Step-by-step guide to scaffolding, configuring, and coding a Chrome extension
    using Manifest V3 with a service worker, content script, and side panel UI.
  total_time: PT60M
  tool: VS Code + Chrome
  steps:
    - name: Initialize the project
      text: >-
        Create a new directory for your extension. Open it in VS Code and initialize
        a package.json if you plan to use a build tool like WXT or Plasmo.
    - name: Create manifest.json
      text: >-
        Create a manifest.json file at the project root. Set `manifest_version` to 3,
        declare your permissions, configure the service worker under `background`,
        and register any content scripts or side panel paths.
    - name: Write the service worker
      text: >-
        Create background.js referenced in your manifest. Implement event listeners
        for `chrome.runtime.onMessage`, alarms, or web requests. Remember that
        service workers are stateless — persist data in chrome.storage.
    - name: Build content scripts
      text: >-
        Write a content script that runs in the context of web pages. Use Shadow DOM
        to isolate your UI from host page styles. Register it in manifest.json or
        inject it dynamically with chrome.scripting.executeScript().
    - name: Test in Chrome
      text: >-
        Navigate to chrome://extensions, enable Developer mode, and click "Load unpacked"
        to load your extension directory. Test the service worker, content script, and
        side panel independently using the dedicated DevTools contexts.
    - name: Package and publish
      text: >-
        Zip the extension directory (exclude unnecessary files). Upload to the Chrome
        Web Store Developer Dashboard, fill in the listing details, icon assets,
        privacy policy URL, and submit for review.
---

<img src="/content/images/step-by-step-chrome-extensions-tutorial-building-for-the-2025-manifest-v3-era/featured.webp" alt="Step-by-Step Chrome Extensions Tutorial: Building for the 2025 Manifest V3 Era" width="1200" height="630" loading="lazy" class="featured-image">

You can build and publish Chrome extensions with Manifest V3. Chrome’s official [Manifest V2 support timeline](https://developer.chrome.com/docs/extensions/develop/migrate/mv2-deprecation-timeline) records that Manifest V2 was disabled for all users in Chrome 138 on July 24, 2025, while remaining Manifest V2 extensions are scheduled for removal from the Chrome Web Store on August 31, 2026. This tutorial covers project setup, `manifest.json`, service workers, content scripts, permissions, testing, and publishing.

## Manifest V2 vs V3: What Changed

Understanding the architectural shift is essential before writing any code. The table below covers the key differences that affect how you build, test, and ship extensions.

| Feature | Manifest V2 | Manifest V3 |
|---|---|---|
| Background execution | Persistent background page (HTML) | Event-driven service worker (JS only) |
| Network requests | `chrome.webRequest` (blocking) | `chrome.declarativeNetRequest` (declarative rules) |
| Remote code | Allowed (eval, inline scripts) | Strictly prohibited; all code bundled locally |
| Permissions model | Broad, runtime-grantable | Minimum required; `activeTab` preferred over `tabs` |
| Content Security Policy | Relaxed (customizable) | Strict default; no `unsafe-eval` or `unsafe-inline` |
| Storage | `chrome.storage` (local, sync) | Adds `chrome.storage.session` (memory-backed, clears on browser close) |
| Messaging | `chrome.runtime.sendMessage` | Same API, but service worker may be inactive — handle async wake-up |
| UI surface | Popup (closes on click-away) | Side Panel API (persistent alongside tabs) |

## Project Setup

### Prerequisites

Before writing any code, ensure your environment matches these requirements:

- **Node.js v20+** — required for modern build tools like WXT and Plasmo
- **Google Chrome v130+** — ensures access to the latest Manifest V3 APIs including `chrome.sidePanel`
- **VS Code** (or your preferred editor) with the ESLint and Prettier extensions for consistent code quality
- **TypeScript** — strongly recommended. Chrome's API types are complex, and TypeScript catches mismatches at compile time

### Scaffolding the Project

For this tutorial, we build a vanilla Manifest V3 extension without a framework. This keeps the architecture transparent and makes each component easy to understand. If you prefer HMR and framework integration, run `npm create wxt@latest` or `npx plasmo init` instead. Frameworks handle Manifest V3 configuration [automatically](/blog/stop-video-popups-from-playing-automatically-3), including hot module replacement, content script bundling, and multi-entry-point builds.

1. Create a project directory and open it in VS Code:

```bash
mkdir my-manifest-v3-extension && cd my-manifest-v3-extension
code .
```

2. Create the following file structure:

```
my-manifest-v3-extension/
├── manifest.json
├── background.js
├── content.js
├── sidepanel.html
├── sidepanel.js
├── icons/
│   ├── icon-16.png
│   ├── icon-48.png
│   └── icon-128.png
└── README.md
```

## The manifest.json Structure

The `manifest.json` is the single source of truth for your extension. It declares the extension's identity, permissions, entry points, and capabilities. Manifest V3 enforces stricter validation on this file — malformed declarations will prevent the extension from loading.

Here is a complete `manifest.json` for a modern extension using the Side Panel API:

```json
{
  "manifest_version": 3,
  "name": "Page Analyzer Pro",
  "version": "1.0.0",
  "description": "Analyzes page content using content scripts and displays results in a persistent side panel.",
  "permissions": [
    "sidePanel",
    "activeTab",
    "storage",
    "scripting"
  ],
  "host_permissions": [
    "https://*.example.com/*"
  ],
  "action": {
    "default_title": "Open Side Panel"
  },
  "side_panel": {
    "default_path": "sidepanel.html"
  },
  "background": {
    "service_worker": "background.js",
    "type": "module"
  }
}
```

### Key Fields Explained

- **`manifest_version: 3`** — mandatory. Chrome rejects any other value.
- **`permissions`** — lists API permissions the extension needs. Use `activeTab` instead of `tabs` whenever possible; it grants temporary access to the current tab only upon user action (clicking the extension icon).
- **`host_permissions`** — declares which origins the extension can access via content scripts or `fetch()`. Keep these as narrow as possible.
- **`background.service_worker`** — the path to your service worker script. This replaces V2's `background.page`. Service workers cannot contain DOM APIs (`document`, `window`).
- **`side_panel.default_path`** — sets the HTML file loaded in Chrome's side panel. This is the recommended UI surface in 2025 over the transient popup.

## Service Workers vs Background Pages

This is the single most disruptive change in Manifest V3. In V2, the background page was a persistent HTML document that stayed alive for the lifetime of the browser session. It could hold global state, maintain WebSocket connections, and run intervals indefinitely.

Manifest V3 replaces this with a **service worker** — a JavaScript file with no DOM, no persistent state, and a strict lifecycle:

1. **Wake** — Chrome starts the service worker when a relevant event fires (message, alarm, `chrome.webRequest` event, extension install/update).
2. **Execute** — The worker runs event handler code.
3. **Terminate** — Chrome kills the worker approximately 30 seconds after the last event. All in-memory state is lost.

### Service Worker Implementation

```javascript
// background.js
chrome.sidePanel
  .setPanelBehavior({ openPanelOnActionClick: true })
  .catch((error) => console.error("Side panel setup failed:", error));

// Listen for messages from content scripts or the side panel
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.type === "EXTRACT_PAGE_DATA") {
    chrome.storage.local.set({ pageData: message.payload }, () => {
      sendResponse({ status: "stored" });
    });
    return true; // Keep the message channel open for async response
  }

  if (message.type === "GET_PAGE_DATA") {
    chrome.storage.local.get("pageData", (result) => {
      sendResponse(result.pageData || null);
    });
    return true;
  }
});

// Replace setInterval with chrome.alarms for periodic tasks
chrome.alarms.create("cleanup", { periodInMinutes: 30 });
chrome.alarms.onAlarm.addListener((alarm) => {
  if (alarm.name === "cleanup") {
    chrome.storage.local.remove(["pageData"]);
  }
});
```

### Critical Implications

- **No `setInterval`/`setTimeout` for long-running tasks.** Use `chrome.alarms` API instead, which reliably wakes the service worker at the scheduled time.
- **Global variables are lost on termination.** Persist all necessary state to `chrome.storage.local` or `chrome.storage.session`.
- **Always `return true`** from `onMessage` listeners that call `sendResponse` asynchronously. Without it, the message channel closes before the response is sent.

## Content Scripts

Content scripts run in the context of web pages. They can access the page's DOM but share a separate JavaScript execution environment from the page's own scripts. This isolation prevents conflicts with the host page.

### Static vs Dynamic Injection

You have two options for loading content scripts:

- **Static injection** — declare in `manifest.json` under `content_scripts`. Chrome injects the script automatically on every matching page. Simple but potentially wasteful.
- **Dynamic injection** — use `chrome.scripting.executeScript()` from the service worker or side panel. This injects the script only when needed, on demand. Preferred for performance.

### Content Script Implementation

```javascript
// content.js
(function () {
  // Prevent double-injection
  if (window.__pageAnalyzerInjected) return;
  window.__pageAnalyzerInjected = true;

  // Extract meaningful data from the page
  const pageTitle = document.title;
  const metaDescription = document.querySelector('meta[name="description"]')?.content || "";
  const headingCount = document.querySelectorAll("h1, h2, h3").length;
  const wordCount = document.body.innerText.split(/\s+/).filter(Boolean).length;

  const pageData = {
    title: pageTitle,
    description: metaDescription,
    headings: headingCount,
    words: wordCount,
    url: window.location.href,
    timestamp: Date.now(),
  };

  // Send data to the service worker
  chrome.runtime.sendMessage({
    type: "EXTRACT_PAGE_DATA",
    payload: pageData,
  });
})();
```

### Using Shadow DOM for UI Isolation

If your content script injects UI elements into the page (buttons, floating panels), wrap them in a Shadow DOM to prevent the host page's CSS from affecting your extension's styles:

```javascript
const host = document.createElement("div");
host.id = "my-extension-root";
document.body.appendChild(host);

const shadow = host.attachShadow({ mode: "closed" });
shadow.innerHTML = `
  <style>
    .ext-btn {
      background: #4f46e5;
      color: white;
      border: none;
      padding: 8px 16px;
      border-radius: 6px;
      cursor: pointer;
      font-family: sans-serif;
    }
    .ext-btn:hover { background: #4338ca; }
  </style>
  <button class="ext-btn">Analyze Page</button>
`;
```

## Permissions

Permissions are the most scrutinized aspect of your extension during Chrome Web Store review. A poorly justified permission set is the most common reason extensions are rejected. Follow these principles:

- **Principle of least privilege.** Request only what you need. A text-highlighter extension does not need `history` or `bookmarks`. Every additional permission increases user friction during installation and raises review scrutiny.
- **Use `activeTab` over `tabs`.** The `activeTab` permission grants access to the current tab's URL, title, and favicon only when the user explicitly interacts with your extension (clicking the action button or using a keyboard shortcut). Unlike `tabs`, it does not trigger the permissions warning banner during installation.
- **Scope `host_permissions` narrowly.** Use specific origin patterns like `"https://*.example.com/*"` instead of `"<all_urls>"`. The [Productivity](/blog/a-chrome-extension-built-for-programmers) category on the Chrome Web Store is the most competitive — narrow permissions improve your chances of approval and reduce user anxiety.
- **Separate `permissions` and `host_permissions`.** Manifest V3 splits these into two distinct fields. API permissions (`storage`, `sidePanel`, `scripting`) go in `permissions`. URL access patterns go in `host_permissions`. This separation lets users see exactly which websites the extension can interact with, separate from which browser APIs it accesses.

## Publishing to the Chrome Web Store

### Preparation Checklist

Before uploading, assemble these assets:

- **Icon set:** 16x16, 48x48, and 128x128 PNG files at the root of your extension (declared in `manifest.json` under `icons`)
- **Privacy policy:** A hosted privacy policy page is mandatory, even if your extension collects no data
- **Zip file:** Package the extension directory as a `.zip`. Exclude `node_modules`, `.git`, and test files
- **Developer account:** Two-factor authentication is required for all Chrome Web Store developer accounts

![Navigate to the Chrome Web Store Developer Dashboard and click "New Item" to begin uploading your extension](/content/images/step-by-step-chrome-extensions-tutorial-building-for-the-2025-manifest-v3-era/chrome-web-store-upload.webp)

### Step-by-Step Publishing Process

1. Navigate to the [Chrome Web Store Developer Dashboard](https://chrome.google.com/webstore/devconsole) and sign in with your developer account.

2. Click **"New Item"** and upload your `.zip` file.

![Upload your zipped extension package and wait for the automated validation to complete](/content/images/step-by-step-chrome-extensions-tutorial-building-for-the-2025-manifest-v3-era/extension-upload-validation.webp)

3. Fill in the listing details: name, description, category, language, and screenshots (1280x800 or 640x400 PNG).

4. Under **"Privacy Practices,"** declare every permission and explain why your extension needs it. Be specific — vague justifications trigger manual review.

![Complete the privacy practices section by justifying each permission your extension requests](/content/images/step-by-step-chrome-extensions-tutorial-building-for-the-2025-manifest-v3-era/privacy-practices-form.webp)

5. Submit for review. Standard reviews complete within 48–72 hours.

### The "One Appeal" Rule

Google enforces a strict policy: if your extension is flagged for a serious violation (malware, deceptive practices, policy circumvention), you receive a single appeal. A rejected appeal can result in a permanent developer account ban. Read the [program policies](https://developer.chrome.com/docs/webstore/program-policies/) thoroughly before submitting.

Additionally, Google now enforces a "Verified Uploads" requirement for all new developer accounts. You must verify your identity with a government-issued ID before publishing your first extension. This policy targets supply-chain attacks and compromised developer accounts.

## Manifest V3 Migration Checklist

If you are migrating an existing V2 extension to V3, work through this checklist systematically:

- [ ] **Change `manifest_version` to `3`** in `manifest.json`
- [ ] **Replace `background.page` with `background.service_worker`** and remove all DOM references from the background script
- [ ] **Convert `chrome.webRequest` blocking listeners** to `chrome.declarativeNetRequest` rules
- [ ] **Move all inline scripts and `eval()` calls** into bundled JS files; CSP no longer permits `unsafe-eval` or `unsafe-inline`
- [ ] **Replace `setInterval`/`setTimeout`** in the background script with `chrome.alarms`
- [ ] **Persist all global state** from the background page to `chrome.storage.local` or `chrome.storage.session`
- [ ] **Split permissions:** move URL patterns from `permissions` to `host_permissions`
- [ ] **Replace `chrome.tabs.executeScript`** with `chrome.scripting.executeScript` (requires the `scripting` permission)
- [ ] **Ensure all `sendResponse` calls** in `onMessage` listeners return `true` for async responses
- [ ] **Audit external network requests** — all code must be bundled locally; no remote code execution
- [ ] **Test on Chrome v130+** with Developer Mode enabled via `chrome://extensions`

## Common Pitfalls and How to Avoid Them

### Service Worker Terminates Before Async Work Completes

**Problem:** You start a `fetch()` or `chrome.storage` operation in the service worker, but Chrome terminates the worker before the callback fires.

**Fix:** Return `true` from `onMessage` listeners to keep the worker alive. For non-message-driven work, use `chrome.alarms` to schedule periodic wake-ups, or ensure you await all promises before the event handler returns.

### `chrome.runtime.sendMessage` Fails Silently

**Problem:** Sending a message to a service worker that is not yet awake results in the error: "Could not establish connection. Receiving end does not exist."

**Fix:** Use `chrome.runtime.sendMessage` with error handling, or call `sendMessage` from a context that guarantees the worker is active (e.g., after a user click on the extension action). Alternatively, use `chrome.runtime.getBackgroundPage()` is no longer available — use `chrome.runtime.getBackgroundClient()` or relay through `chrome.storage.onChanged` events.

### Content Script CSS Leaks

**Problem:** Your injected UI inherits styles from the host page, breaking your layout.

**Fix:** Always use Shadow DOM (`element.attachShadow({ mode: "closed" })`) for any UI you inject into web pages. For simple styling without DOM injection, prefix all CSS class names with a unique namespace.

### Overly Broad Permissions Cause Rejection

**Problem:** Your extension requests `<all_urls>` or `"tabs"` when `activeTab` would suffice.

**Fix:** Audit every permission. Use `activeTab` for user-initiated tab access. Use specific `host_permissions` patterns. Document each permission's purpose in the Chrome Web Store privacy practices form.

### Zip Package Includes Unnecessary Files

**Problem:** Your uploaded `.zip` contains `node_modules`, `.git`, or test files, inflating the package size and potentially including sensitive data.

**Fix:** Create a dedicated build script that copies only the required files into a `dist/` directory before zipping:

```bash
mkdir -p dist && cp manifest.json background.js content.js sidepanel.html sidepanel.js dist/
cp -r icons/ dist/
cd dist && zip -r ../extension.zip . && cd ..
```

## Debugging Across Extension Contexts

Debugging a Manifest V3 extension requires monitoring three separate execution contexts:

| Context | How to Access DevTools | Common Issues |
|---|---|---|
| Service Worker | Click "Inspect views: service worker" on `chrome://extensions` | Worker idle timeout; state loss |
| Side Panel / Popup | Right-click the panel and select "Inspect" | CSP violations; script load order |
| Content Script | Standard F12 DevTools on the target web page | DOM not ready; CORS on `fetch()` |

## Frequently Asked Questions

### Is Manifest V2 still supported in Chrome?

No. Google deprecated Manifest V2 in June 2024 and completed the phase-out in mid-2025. Chrome no longer loads Manifest V2 extensions. All new and existing extensions must use Manifest V3 to function.

### What is the difference between a service worker and a background page?

Manifest V2 used persistent background pages — a hidden HTML page running indefinitely in the background, consuming memory and CPU. Manifest V3 replaces this with service workers that are event-driven: they wake on an event and terminate when idle, typically within 30 seconds of inactivity.

### How do content scripts work in Manifest V3?

Content scripts inject JavaScript into web pages the user visits. In Manifest V3, you declare them statically in `manifest.json` under the `content_scripts` field, or inject them dynamically using `chrome.scripting.executeScript()`. Dynamic injection is preferred because it reduces memory footprint and avoids injecting code into every matching page.

### What permissions should I request for my Chrome extension?

Request the minimum set of permissions necessary. Use `activeTab` instead of broad `tabs` permission when you only need access to the current tab on user interaction. Use `host_permissions` for specific origins rather than `<all_urls>`. Google's review process scrutinizes overly broad permissions and may reject your submission.

### How long does Chrome Web Store review take in 2025?

Standard reviews take 48 to 72 hours. Extensions requesting sensitive permissions (broad host access, `debugger`, `devtools`) or flagged for additional review can take significantly longer. Google enforces a strict "one appeal" policy for policy violations, so ensure full compliance before submitting.

---

The [Chrome extension ecosystem](/blog) in 2025 rewards developers who build on modern APIs — service workers for efficiency, the Side Panel for persistent UX, and strict permissions for user trust. The shift from Manifest V2 required rethinking fundamental architecture patterns, but the result is a more secure, performant platform. Start with the vanilla approach in this tutorial, then graduate to frameworks like WXT or Plasmo for production projects that need React support, hot reloading, and automated builds. Open your terminal, run `npm create wxt@latest`, and ship your first [Manifest V3 extension](/blog/screenshot-tool-for-chrome-5) this week.
