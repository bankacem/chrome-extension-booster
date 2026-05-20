---
title: "How to Stop Pop-Ups on Chrome (Desktop & Mobile 2026)"
slug: how-to-stop-pop-ups-on-chrome-2
description: "Stop pop-ups on Chrome permanently using built-in settings, extensions, and site-specific rules. Works on Windows, Mac, and Android."
meta_description: "Stop pop-ups on Chrome permanently using built-in settings, extensions, and site-specific rules. Works on Windows, Mac, and Android."
category: "Chrome Extensions"
author: "ExtensionTo Team"
status: published
published_at: "2026-05-19T21:51:23.946Z"
updated_at: "2026-05-19T21:51:23.946Z"
read_time: 5
---

# How to Stop Pop-Ups on Chrome (Desktop & Mobile 2026)

**Quick Answer:** Go to **Chrome Settings → Privacy and security → Site Settings → Pop-ups and redirects → Don't allow sites to send pop-ups or use redirects**. Pair this with uBlock Origin for complete popup elimination.

---

## Table of Contents
1. [Enable Chrome's Built-in Popup Blocker](#builtin)
2. [Block Pop-ups with uBlock Origin](#ublock)
3. [Stop Notification Pop-ups](#notifications)
4. [Block Pop-ups on Specific Sites](#specific)
5. [Pop-ups vs. Redirects: The Difference](#difference)
6. [FAQ](#faq)

---

## Enable Chrome's Built-in Popup Blocker {#builtin}

**On Desktop (Windows/Mac):**

1. Open Chrome and click the **three-dot menu** (top right)
2. Click **Settings**
3. Click **Privacy and security** (left sidebar)
4. Click **Site Settings**
5. Under "Content," click **Pop-ups and redirects**
6. Select **"Don't allow sites to send pop-ups or use redirects"**

**On Android:**

1. Open Chrome → tap **three-dot menu → Settings**
2. Tap **Site settings → Pop-ups and redirects → Block**

---

## Block Pop-ups with uBlock Origin {#ublock}

Chrome's built-in blocker stops simple popups. uBlock Origin stops the sophisticated ones — overlay ads, fake close buttons, countdown pop-ups, and more.

1. Install **uBlock Origin** from the Chrome Web Store
2. It activates automatically — no configuration needed for basic use
3. For aggressive sites, click the uBlock icon and click the **blue power button** to fully block all scripts on that site

---

## Stop Notification Pop-ups {#notifications}

Notification pop-ups are different — they come through Chrome's notification system, not the webpage itself.

**Block all notification requests:**
1. Chrome Settings → Privacy and security → Site Settings
2. Click **Notifications**
3. Select **"Don't allow sites to send notifications"**

**Remove sites you already allowed:**
1. Under "Notifications," scroll to "Allowed to send notifications"
2. Click the site → Click **Block** or **Remove**

---

## Block Pop-ups on Specific Sites {#specific}

If one site is particularly aggressive:

1. Visit the site
2. Click the **lock icon** in the address bar
3. Click **Site settings**
4. Set "Pop-ups and redirects" to **Block**

---

## Pop-ups vs. Redirects: The Difference {#difference}

| Type | What It Does | How to Block |
|------|-------------|--------------|
| Pop-up | Opens a new window/tab | Chrome settings + uBlock |
| Redirect | Sends you to a different URL | Chrome settings + uBlock |
| Notification | System-level alerts | Notification settings |
| Overlay | Covers the page content | uBlock Origin |

---

## FAQ {#faq}

**Why do some pop-ups still appear even with Chrome's blocker on?**
Modern sites use JavaScript workarounds. uBlock Origin catches most of these. If a specific site is still breaking through, enable "element picker" in uBlock to manually block that element.

**Can I whitelist specific sites for pop-ups?**
Yes. Go to Chrome Settings → Site Settings → Pop-ups and redirects → Click "Add" under "Allowed to send pop-ups and use redirects."

**Do Chrome extensions cause pop-ups?**
Some malicious extensions can inject pop-ups. If you started seeing pop-ups after installing an extension, remove it immediately via `chrome://extensions`.

---

*Published by [ExtensionTo](https://extensionto.com) — Your guide to Chrome extensions.*
