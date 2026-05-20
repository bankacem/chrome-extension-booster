---
title: "How to Block Popups on Chrome Without Extensions (2026)"
slug: how-to-block-popups-on-chrome-without-extensions-2
description: "Block all Chrome popups without installing any extension using Chrome's built-in popup blocker settings. Works on desktop and Android."
meta_description: "Block all Chrome popups without installing any extension using Chrome's built-in popup blocker settings. Works on desktop and Android."
category: "Chrome Extensions"
author: "ExtensionTo Team"
status: published
published_at: "2026-05-19T21:51:23.946Z"
updated_at: "2026-05-19T21:51:23.946Z"
read_time: 5
---

# How to Block Popups on Chrome Without Extensions (2026)

**Quick Answer:** Go to **Chrome Settings → Privacy and security → Site Settings → Pop-ups and redirects → Don't allow sites to send pop-ups**. No extension needed. This blocks the majority of popups across all websites instantly.

---

## Table of Contents
1. [Block All Popups in Chrome Settings](#all)
2. [Block Notification Popups (No Extension)](#notifications)
3. [Block Popups on One Specific Site](#specific)
4. [Block JavaScript Popups via DevTools](#devtools)
5. [When You Do Need an Extension](#when)
6. [FAQ](#faq)

---

## Block All Popups in Chrome Settings {#all}

**On Desktop (Windows/Mac/Linux):**

1. Open Chrome
2. Click the **three-dot menu** → **Settings**
3. Click **Privacy and security** → **Site Settings**
4. Under "Content," click **Pop-ups and redirects**
5. Select **"Don't allow sites to send pop-ups or use redirects"**

**On Android:**
1. Chrome menu → **Settings → Site settings**
2. Tap **Pop-ups and redirects**
3. Toggle to **Blocked**

This stops new windows and tabs from opening automatically on most sites.

---

## Block Notification Popups (No Extension) {#notifications}

Notification popups come through Chrome's notification system, not webpage pop-ups. Block them separately:

1. Chrome → **Settings → Privacy and security → Site Settings**
2. Click **Notifications**
3. Select **"Don't allow sites to send notifications"**

**Remove existing notification permissions:**
- Scroll to "Allowed to send notifications"
- Click each site → Change to **Block**

---

## Block Popups on One Specific Site {#specific}

If a specific site is breaking through the global block:

1. Visit that site
2. Click the **lock icon** in the address bar
3. Click **Site settings**
4. Set "Pop-ups and redirects" → **Block**
5. Reload the page

This creates a site-specific block rule.

---

## Block JavaScript Popups via DevTools {#devtools}

For overlay-style popups that JavaScript creates (not new windows), you can block them with Chrome DevTools:

1. Press **F12** to open DevTools
2. Go to the **Sources** tab
3. Press **F8** to pause JavaScript execution when a popup appears
4. Find the popup element in the Elements tab
5. Right-click → **Delete element** for one-time removal

For permanent removal, use the **Styles** pane to add `display: none !important` to the popup element's CSS.

---

## When You Do Need an Extension {#when}

Chrome's built-in tools handle most popups. You may need an extension (uBlock Origin) for:

- **Overlay popups** — full-screen newsletter signup dialogs that dim the page
- **Countdown redirects** — "You'll be redirected in 5 seconds..."
- **Aggressive ad networks** using sophisticated popup techniques
- **Back-button redirect traps** — scripts that capture your back button

uBlock Origin blocks all of these without any additional configuration.

---

## FAQ {#faq}

**Does blocking popups break any websites?**
Rarely. Some sites use popups for legitimate functions (login dialogs, video players). If a site breaks, go to that site's settings and allow popups for it specifically.

**Why am I still seeing popups after blocking them in settings?**
The site may be using overlay elements (not true popups) or notification-based pop-ups. Check both the "Pop-ups and redirects" AND "Notifications" settings.

**Can websites detect if I have popup blocking enabled?**
Yes, some sites detect this and show a message asking you to whitelist them. This is just a message — they can't force you to change your settings.

---

*Published by [ExtensionTo](https://extensionto.com) — Your guide to Chrome extensions.*
