---
seo_title: "Tampermonkey Chrome: Safe Userscript Setup"
id: f275ef3c-c412-432a-a97a-ac56b7f8dfeb
title: "Tampermonkey Chrome: Install and Run Userscripts Safely"
slug: tampermonkey-chrome-userscripts-guide
status: published
excerpt: "Learn how to install Tampermonkey in Chrome, review userscripts, grant the right permission, and create a small script without exposing every website to unknown code."
meta_description: "Install Tampermonkey in Chrome, review userscripts, grant the right permission, and run a small script safely with a practical checklist."
featured_image: /og-image.png
category: Chrome Extensions
tags:
  - tampermonkey
  - userscripts
  - chrome security
keywords:
  - tampermonkey chrome
  - install tampermonkey
  - chrome userscripts
  - userscript permissions
author: Miccart Phen
published_at: 2026-08-22
read_time: 8
---

Tampermonkey is a userscript manager for Chrome. It lets you run small JavaScript programs that change a page or add a narrowly defined feature, but it also places executable code between you and the websites you visit. The useful question is therefore not simply “How do I install Tampermonkey?” It is “Which script should run, on which pages, with which permissions, and how can I turn it off?”

This guide follows that safer workflow. You will install the extension from the official Chrome Web Store, enable the permission required by current Chrome-based browsers, inspect a script before installing it, create a harmless test script, and troubleshoot the most common reasons a userscript does not run. It does not recommend a list of anonymous scripts or promise that any script is safe merely because it has many installs.

## Tampermonkey Chrome at a glance

| If your goal is… | Start with… | Main caution |
|---|---|---|
| Run a script written by someone else | Verify its source, update history, and `@match` rules before installing | A userscript is executable JavaScript, not a passive bookmark |
| Make one small page change yourself | Begin with one domain and `@grant none` | Do not start with broad matches such as `*://*/*` |
| Fix a script that stopped working | Check the match rule, site permission, console error, and recent site changes | A script can fail without being a Chrome problem |
| Share a script | Document its purpose, scope, dependencies, and rollback steps | External `@require` code adds a supply-chain dependency |

## What Tampermonkey does

A userscript is a JavaScript file with a metadata block at the top. The block tells the manager when the script may run and what special APIs it requests. Tampermonkey can install, enable, disable, update, edit, and organize those scripts. Its official website also describes a dashboard, automatic update checks, a built-in editor, synchronization options, and compatibility features for some older scripts.[1]

That flexibility is also the security boundary. If a script matches a page containing personal, financial, or work information, the script may be able to inspect or modify what the page exposes to JavaScript. Treat the script source and its update path as carefully as you would treat a small browser extension.

## How to install Tampermonkey in Chrome

1. Open the [official Tampermonkey listing in the Chrome Web Store](https://chromewebstore.google.com/detail/tampermonkey/dhdgffkkebhmkfjojejmpbldmpobfkfo?hl=en). Check the publisher, website, current version, and privacy section before selecting **Add to Chrome**. The listing identifies the official website and discloses data-use categories; those details can change, so read the current listing rather than relying on an old screenshot.[2]
2. Confirm Chrome's installation dialog. After installation, open the Extensions menu using the puzzle-piece button and pin Tampermonkey if you want quick access.
3. Open **Manage extension** from Tampermonkey's menu. On Chrome-based browsers that require the newer userscript authorization flow, Tampermonkey's current FAQ says Chrome 138+ users may need to enable **Allow User Scripts**; the alternative described there is enabling **Developer mode** on the extensions page.[3]
4. Return to the Tampermonkey dashboard. Do not install a script yet. First confirm that the extension is enabled and understand where its script list, settings, and editor are located.

The permission step matters. Installing an extension and authorizing it to execute userscripts are separate decisions in current Chrome-based browsers. If the dashboard says that userscripts are not authorized, follow the permission message instead of randomly changing unrelated Chrome settings.

## How to review a userscript before installing it

Userscript directories can be useful starting points, but a directory is not a security guarantee. Before you select **Install**, use this short review:

1. **Identify the author and source.** Prefer a page with a maintained source, changelog, issue history, or a link to a public repository. Be cautious when the only evidence is a copied description.
2. **Read the metadata block.** Pay particular attention to `@match`, `@include`, `@exclude`, `@grant`, and `@require`. A script that claims to improve one site should not need access to every site.
3. **Search the code for network and data operations.** Look for `fetch`, `XMLHttpRequest`, form submission, clipboard access, storage calls, obfuscated code, and external libraries. These are not automatically malicious, but they should have a clear reason.
4. **Check update behavior.** Automatic updates are convenient, yet an update can change executable code. Keep the update source visible and disable automatic updates for a script you cannot maintain or review.
5. **Use a low-risk test account or a non-sensitive page first.** Never test an unknown script while logged in to banking, administration, or confidential work systems.

A useful rule is: **scope first, code second, trust third**. A popular script can still be outdated, and a small script can still be dangerous if it runs on the wrong pages.

## Install a script with the smallest possible scope

A maintained userscript page normally provides an installation button that opens Tampermonkey's review screen. Stop at that screen and inspect the code before confirming. If the script asks for a permission or page scope that does not match its stated purpose, cancel the installation and investigate.

For a script you write yourself, begin with an explicit domain. This minimal example changes the title only on `example.com`; it does not request special Tampermonkey APIs:

```javascript
// ==UserScript==
// @name         Example page title test
// @namespace    extensionto.local
// @version      1.0.0
// @description  A harmless one-domain test
// @match        https://example.com/*
// @grant        none
// ==/UserScript==

(() => {
  document.title = `Test page — ${document.title}`;
})();
```

The `@match` line is the most important safety decision in this example. Replace it with the exact domain and path you need. Do not use a wildcard for all websites merely to avoid debugging a match rule. If the page is a single-page application, the first document may load before the element you want exists; in that case, wait for the specific element or observe controlled DOM changes rather than polling the entire page indefinitely.

## Manage, pause, and remove scripts

Use the Tampermonkey popup or dashboard to see which scripts are enabled and whether they match the current page. Keep a small inventory with the script name, source URL, purpose, scope, and last review date. This makes an unexpected page change easier to trace.

When a page behaves strangely, disable the most recently installed or updated script first. If the problem disappears, inspect that script's update history and match rules before enabling it again. You can also disable Tampermonkey temporarily from `chrome://extensions` to separate a userscript problem from a general browser problem.

For removal, open `chrome://extensions`, find Tampermonkey, and choose **Remove**. If you only want to remove one script, delete or disable it from the Tampermonkey dashboard instead. Keep a backup only when you understand what the backup contains; userscripts may include private configuration values or tokens.

## Troubleshoot a script that does not run

### The script is installed but nothing changes

First confirm that Tampermonkey is enabled, the script itself is enabled, and the current URL matches its `@match` or `@include` rule. Then reload the page after installation. A script cannot run on a URL it does not match, and a page opened before the script was enabled may need a full reload.

### Chrome says userscripts are not authorized

Open the extension's management page and follow Tampermonkey's current instruction for **Allow User Scripts** or **Developer mode**. The required path depends on the Chrome-based browser and version; do not copy a years-old tutorial that assumes the old permission model.[3]

### The script works on one page but not another

Compare the two URLs, including subdomains, paths, and query parameters. Review `@match`, `@exclude`, and any site-specific checks in the JavaScript. A script written for `www.example.com` may not match `app.example.com`, and a site redesign may have removed the selector the script expects.

### The script produces an error

Open Chrome DevTools, select the **Console** tab, reload the page, and record the first relevant error rather than copying the entire console. If the error points to a missing element, the script may be running before the page is ready. If it points to a permission or blocked request, review the `@grant` and `@require` lines and the script's source documentation.

### A page becomes slow or unstable

Disable the script and compare the page again. Multiple scripts that observe the DOM, inject large libraries, or run on every page can add work to each navigation. Keep only the scripts you can explain and remove abandoned ones instead of collecting them indefinitely.

## Tampermonkey, Greasemonkey, and Violentmonkey

These tools all address the general userscript use case, but compatibility is not automatic. A script written for one manager may depend on a particular API, metadata rule, or browser permission. Choose the manager that fits your browser and the scripts you can inspect, then test one script at a time. Switching managers is not a security upgrade by itself; narrowing scope and reviewing source code are the more important controls.

If you are still learning how Chrome extensions work, first review this [practical guide to finding and managing Chrome extensions](/blog/how-to-get-the-most-out-of-your-browser-with-extension-chrome-get). Tampermonkey is more flexible than a normal point-and-click extension, so its review step deserves extra attention.

## Frequently asked questions

### Is Tampermonkey safe to install in Chrome?

The extension is distributed through the Chrome Web Store, but installing the manager does not make every userscript safe. Review the publisher, the current privacy disclosure, each script's source, its page scope, and its update behavior separately.[2]

### Why do I need Developer mode or Allow User Scripts?

Tampermonkey's current FAQ explains that Chrome-based browsers use an additional authorization step for userscript execution. On Chrome 138 and later, the extension may expose **Allow User Scripts**; the FAQ also documents Developer mode as an alternative path in the relevant browsers.[3]

### Can a userscript access my passwords?

A userscript should not be given unlimited trust. Its effective access depends on where it runs, what the page exposes, and which APIs or network operations its code uses. Do not install or test an unknown script on a logged-in sensitive service, and remove scripts that request a scope unrelated to their purpose.

### How do I stop one userscript without uninstalling Tampermonkey?

Open the Tampermonkey popup or dashboard, locate the script, and switch it off. Reload the affected page. If the problem persists, disable the entire extension temporarily from `chrome://extensions` to confirm whether the userscript is the cause.

## Final checklist

Before you leave Tampermonkey running, confirm four things: the extension came from the official store; userscript execution is authorized intentionally; every script has a narrow, understandable scope; and you know how to disable, inspect, update, or remove it. That workflow gives you the flexibility of userscripts without treating executable code as harmless page decoration.

### Sources

- [Tampermonkey official home and feature overview](https://www.tampermonkey.net/)
- [Tampermonkey FAQ: permission to execute userscripts](https://www.tampermonkey.net/faq.php?locale=en&q=Q209)
- [Tampermonkey listing in the Chrome Web Store](https://chromewebstore.google.com/detail/tampermonkey/dhdgffkkebhmkfjojejmpbldmpobfkfo?hl=en)
