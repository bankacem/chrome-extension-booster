---
title: "How to Stop Chrome from Redirecting to Other Sites (2026)"
slug: how-to-stop-chrome-from-redirecting-to-other-sites-2
description: "Chrome keeps redirecting you to unknown sites? Fix it with these step-by-step methods for removing hijackers, malicious extensions, and adware in 2026."
meta_description: "Chrome keeps redirecting you to unknown sites? Fix it with these step-by-step methods for removing hijackers, malicious extensions, and adware in 2026."
category: "Chrome Extensions"
author: "ExtensionTo Team"
status: published
published_at: "2026-05-19T21:51:23.946Z"
updated_at: "2026-05-19T21:51:23.946Z"
read_time: 5
---

# How to Stop Chrome from Redirecting to Other Sites (2026)

**Quick Answer:** Block redirects in Chrome Settings → Site Settings → Pop-ups and redirects → Block. If redirects continue: remove suspicious extensions, run Malwarebytes, reset your search engine, and reset Chrome to defaults.

---

## Table of Contents
1. [Identify the Type of Redirect](#identify)
2. [Fix 1: Block Redirects in Settings](#settings)
3. [Fix 2: Remove Malicious Extensions](#extensions)
4. [Fix 3: Reset Your Search Engine](#search)
5. [Fix 4: Run Malwarebytes](#malware)
6. [Fix 5: Reset Chrome](#reset)
7. [Prevent Future Redirects](#prevent)
8. [FAQ](#faq)

---

## Identify the Type of Redirect {#identify}

Before fixing, identify what's happening:

- **You're redirected when you search** → Your search engine was hijacked
- **You're redirected when opening a new tab** → New tab page or startup page was changed
- **You're redirected on specific websites** → That site is using aggressive redirect scripts
- **Random redirects on any website** → Likely malicious extension or adware
- **Redirected to a specific domain always** → Browser hijacker (most serious case)

Each cause has a different fix.

---

## Fix 1: Block Redirects in Settings {#settings}

1. Chrome menu → **Settings**
2. **Privacy and security → Site Settings**
3. Click **Pop-ups and redirects**
4. Select **"Don't allow sites to send pop-ups or use redirects"**

This blocks JavaScript-triggered redirects on websites. It won't stop hijacker-level redirects (from extensions or system malware).

---

## Fix 2: Remove Malicious Extensions {#extensions}

1. Go to `chrome://extensions`
2. Enable **Developer mode** to see all extensions
3. Review the list — remove anything you didn't install or don't recognize
4. Restart Chrome and test

Common names of hijacker extensions: "Search Manager," "Web Companion," "Easy Forms," "PDF Converter," "Quick Search."

---

## Fix 3: Reset Your Search Engine {#search}

1. Chrome → **Settings → Search engine**
2. Click **Manage search engines and site search**
3. Delete any search engine you don't recognize
4. Set Google or your preferred engine as default

Also check:
- **On startup:** Settings → On startup → should be "Open the New Tab page" or your preferred page
- **Home button:** Settings → Appearance → should be a URL you set yourself

---

## Fix 4: Run Malwarebytes {#malware}

1. Download **Malwarebytes Free** from [malwarebytes.com](https://malwarebytes.com)
2. Run a **Threat Scan**
3. Remove all detected threats
4. Restart your computer
5. Test Chrome again

Malwarebytes catches browser hijackers that standard antivirus misses.

**Also use Chrome's built-in cleaner:**
Chrome Settings → Reset and clean up → Clean up computer → Find → Remove

---

## Fix 5: Reset Chrome {#reset}

If none of the above fixes the problem, reset Chrome to factory defaults:

1. Chrome → **Settings → Reset and clean up**
2. **"Restore settings to their original defaults"**
3. Click **"Reset settings"**

This resets search engine, homepage, extensions (disabled), and content settings. Preserves bookmarks and passwords.

---

## Prevent Future Redirects {#prevent}

- Install **uBlock Origin** — blocks redirect scripts proactively
- Only download software from official websites
- Choose "Custom install" when installing free software and opt out of extras
- Audit `chrome://extensions` monthly
- Keep Chrome updated to the latest version

---

## FAQ {#faq}

**Why does Chrome redirect me to Bing instead of Google?**
A browser hijacker changed your default search engine to Bing (or a Bing-based fake engine). Fix 3 above restores it.

**Chrome redirects me only on certain sites. Is this a virus?**
Not necessarily. Some sites legitimately redirect for affiliate tracking. uBlock Origin blocks most of these. If it's happening on sites that didn't redirect before, check for malicious extensions.

**What if Chrome resets my settings again after I fix them?**
A process or extension is actively changing them. Find and remove the extension first (Fix 2), then run Malwarebytes (Fix 4), then reset (Fix 5).

---

*Published by [ExtensionTo](https://extensionto.com) — Your guide to Chrome extensions.*
