---
title: "How to Stay on the Same Page in Chrome (Stop Redirects)"
slug: how-to-stay-on-same-page-chrome-2
description: "Chrome keeps taking you away from the page you want? Learn how to stay on the same page by blocking redirects, scripts, and page changes in Chrome."
meta_description: "Chrome keeps taking you away from the page you want? Learn how to stay on the same page by blocking redirects, scripts, and page changes in Chrome."
category: "Chrome Extensions"
author: "ExtensionTo Team"
status: published
published_at: "2026-05-19T21:51:23.946Z"
updated_at: "2026-05-19T21:51:23.946Z"
read_time: 5
---

# How to Stay on the Same Page in Chrome (Stop Redirects)

**Quick Answer:** Block page redirects via **Chrome Settings → Site Settings → Pop-ups and redirects → Block**. Install uBlock Origin to stop JavaScript-based redirects that Chrome's settings alone can't catch.

---

## Table of Contents
1. [Why Chrome Leaves the Page You're On](#why)
2. [Block Redirects in Chrome Settings](#settings)
3. [Use uBlock Origin to Block Script Redirects](#ublock)
4. [Stop "Leave Page?" Prompts](#leave)
5. [Block Specific Sites from Redirecting](#specific)
6. [FAQ](#faq)

---

## Why Chrome Leaves the Page You're On {#why}

Chrome can take you away from a page for several reasons:

- **Redirect scripts:** JavaScript code on the page sends you elsewhere after a timer or on click
- **Pop-under redirects:** Opening the page triggers a new tab and redirects the original
- **Back button hijacking:** Scripts manipulate browser history so the back button doesn't work
- **Clickjacking:** Invisible overlay links make any click navigate away
- **Malware:** Extensions or system software forcing redirects

---

## Block Redirects in Chrome Settings {#settings}

1. Chrome menu → **Settings → Privacy and security**
2. Click **Site Settings**
3. Click **Pop-ups and redirects**
4. Select **"Don't allow sites to send pop-ups or use redirects"**

This blocks the most common redirect mechanisms.

---

## Use uBlock Origin to Block Script Redirects {#ublock}

Some redirects are embedded in page JavaScript and bypass Chrome's setting. uBlock Origin catches these at the network level.

**For a specific site that keeps redirecting:**
1. Click the **uBlock Origin icon**
2. Click the **element picker** (dropper icon)
3. Select the element that triggers the redirect
4. Click "Create" to block it permanently

**Enable strict blocking for a specific site:**
1. Click uBlock Origin icon
2. Click the **blue power button** to block all scripts on that page

---

## Stop "Leave Page?" Prompts {#leave}

Some sites show dialogs like "Are you sure you want to leave?" to keep you on the page. These are browser-native dialogs.

To disable them for a specific site:
1. When the dialog appears, check **"Don't show more alerts from this page"** if available
2. Click **Leave**

Chrome automatically suppresses these dialogs from sites that trigger them too frequently.

---

## Block Specific Sites from Redirecting {#specific}

If one site keeps redirecting you:
1. Visit the site
2. Click the **lock icon** in the address bar
3. Click **Site settings**
4. Set **Pop-ups and redirects** to **Block**

This creates a site-specific rule that overrides any defaults.

---

## FAQ {#faq}

**Why does the back button not work on some sites?**
Some sites use JavaScript to push fake history entries, trapping you in a redirect loop. Press and **hold** the back button to see your full navigation history and jump back several pages.

**Can I stop a page redirect mid-redirect?**
Sometimes. Click the stop button (X) in Chrome's address bar immediately when you see the URL changing. Then navigate away.

**Why do news sites redirect me to an app download page on mobile?**
They use scripts to detect mobile browsers and redirect to the app store. uBlock Origin in Kiwi Browser can block these on Android.

---

*Published by [ExtensionTo](https://extensionto.com) — Your guide to Chrome extensions.*
