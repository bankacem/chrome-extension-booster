---
title: "How to Stop Automatic Redirects in Chrome (2026)"
slug: how-to-stop-automatic-redirects-chrome-2
description: "Fix automatic redirects in Chrome by blocking redirect scripts, checking for malware, and using the right extension. Step-by-step guide for 2026."
meta_description: "Fix automatic redirects in Chrome by blocking redirect scripts, checking for malware, and using the right extension. Step-by-step guide for 2026."
category: "Chrome Extensions"
author: "ExtensionTo Team"
status: published
published_at: "2026-05-19T21:51:23.946Z"
updated_at: "2026-05-19T21:51:23.946Z"
read_time: 5
---

# How to Stop Automatic Redirects in Chrome (2026)

**Quick Answer:** Go to **Chrome Settings → Privacy and security → Site Settings → Pop-ups and redirects → Block**. If redirects continue, scan for malware and check your extensions for malicious ones.

---

## Table of Contents
1. [Why Chrome Redirects You Automatically](#why)
2. [Fix 1: Block Redirects in Chrome Settings](#settings)
3. [Fix 2: Check for Malicious Extensions](#extensions)
4. [Fix 3: Scan for Malware](#malware)
5. [Fix 4: Reset Chrome Settings](#reset)
6. [Fix 5: Use uBlock Origin](#ublock)
7. [FAQ](#faq)

---

## Why Chrome Redirects You Automatically {#why}

Automatic redirects in Chrome happen for several reasons:
- **Website design** — legitimate redirects from HTTP to HTTPS or from old URLs
- **Aggressive advertising** — sites using redirect scripts to send you to ad pages
- **Browser hijacking** — malware or rogue extensions changing your homepage or search engine
- **Phishing campaigns** — redirecting you to fake login pages

The fix depends on the cause. Work through the steps below in order.

---

## Fix 1: Block Redirects in Chrome Settings {#settings}

1. Open Chrome → click **three-dot menu → Settings**
2. Click **Privacy and security**
3. Click **Site Settings**
4. Under Content, click **Pop-ups and redirects**
5. Select **"Don't allow sites to send pop-ups or use redirects"**

This blocks most redirect scripts immediately.

---

## Fix 2: Check for Malicious Extensions {#extensions}

A rogue extension is often the cause of persistent redirects.

1. Go to `chrome://extensions`
2. Look for extensions you don't recognize or didn't install
3. Click **Remove** on any suspicious extension
4. Restart Chrome and test

**Signs of a malicious extension:**
- You don't remember installing it
- It requests "read and change all your data on websites"
- It has very few reviews or a suspicious developer name

---

## Fix 3: Scan for Malware {#malware}

Chrome has a built-in malware scanner:

1. Go to **Chrome Settings → Reset and clean up**
2. Click **"Clean up computer"** (Windows only)
3. Click **Find** — Chrome scans for harmful software
4. Remove anything found

Also run a full scan with your antivirus software.

---

## Fix 4: Reset Chrome Settings {#reset}

If redirects persist, reset Chrome to factory defaults:

1. Chrome Settings → **Reset and clean up**
2. Click **"Restore settings to their original defaults"**
3. Click **"Reset settings"**

This resets your homepage, search engine, startup pages, and extensions (disabled). It does NOT delete bookmarks or saved passwords.

---

## Fix 5: Use uBlock Origin {#ublock}

Install **uBlock Origin** from the Chrome Web Store. It blocks redirect scripts at the network level before they even execute. This is the most proactive protection.

---

## FAQ {#faq}

**Why does Chrome keep redirecting me to a different search engine?**
Your search engine may have been changed by a malicious extension or software. Go to Chrome Settings → Search engine → Change to Google (or your preferred engine).

**Why am I redirected when I click links?**
The site may be using redirect tracking (common in email newsletters). uBlock Origin blocks most of these. Some are legitimate click-tracking systems used by the site.

**Can redirects install malware on my computer?**
A redirect itself doesn't install malware. But if a redirect lands you on a phishing site or a drive-by download page, malware could be installed. Keep Chrome updated and enable Enhanced Safe Browsing.

---

*Published by [ExtensionTo](https://extensionto.com) — Your guide to Chrome extensions.*
