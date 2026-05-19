---
title: "How to Block Notification Popups in Chrome (2026 Complete Guide)"
slug: block-notification-popups-chrome
description: "Stop browser notification popups in Chrome permanently. Step-by-step settings guide plus the best extensions — no more 'Allow Notifications' spam."
meta_description: "Stop browser notification popups in Chrome permanently. Step-by-step settings guide plus the best extensions — no more 'Allow Notifications' spam."
category: "Chrome Extensions"
author: "ExtensionTo Editorial"
status: draft
published_at: null
updated_at: "2026-05-19T22:19:28.081Z"
created_at: "2026-05-19T22:19:28.081Z"
read_time: 5
---

# How to Block Notification Popups in Chrome (2026 Complete Guide)

Notification popups — the "Allow Notifications?" prompts that hijack your screen on nearly every website — are one of Chrome's most abused features. This guide shows you how to silence them permanently.

## Table of Contents
1. [What Are Notification Popups?](#what-are-notification-popups)
2. [Method 1: Block All Notification Prompts in Chrome Settings](#method-1-block-all-notification-prompts)
3. [Method 2: Block Notifications per Site](#method-2-block-per-site)
4. [Method 3: Chrome Extensions That Block Notification Popups](#method-3-extensions)
5. [Chrome's Quieter Notifications Feature](#quieter-notifications)
6. [FAQ](#faq)

---

## What Are Notification Popups?

When a website calls the browser's **Notifications API**, Chrome displays a permission prompt asking if you want to receive push notifications. Even if you click **Block**, many sites re-ask on every visit using aggressive timing scripts.

> ⚠️ **Gap most guides miss:** Blocking individual site notifications is not enough. You need to proactively disable the permission prompt sitewide — before it even appears.

---

## Method 1: Block All Notification Prompts in Chrome Settings

This is the fastest and most complete fix:

1. Open `chrome://settings/content/notifications`
2. Under **Default behaviour**, select **Don't allow sites to send notifications**
3. Click **Save**

This silences the permission prompt globally. Sites cannot ask — the browser never shows the dialog.

### Allow Exceptions for Sites You Trust

Under **Allowed to send notifications**, click **Add** and enter trusted domains:
- `calendar.google.com`
- `mail.google.com`
- Any site you genuinely want notifications from

---

## Method 2: Block Notifications per Site

Already clicked "Allow" by accident? Revoke it instantly:

1. Click the 🔒 lock icon in the address bar
2. Click **Site settings**
3. Find **Notifications** → set to **Block**

Done — that site can no longer send you notifications.

---

## Method 3: Chrome Extensions That Block Notification Popups

### uBlock Origin (Free)
Add the filter `||*^$document,popup` in custom filters. uBlock Origin also blocks the JavaScript call before the prompt appears on aggressive sites.

### Poper Blocker
Specifically designed to intercept notification permission requests. Shows a badge count of blocked prompts and lets you review what was blocked — great for users who want visibility.

### Notification Blocker (by Stands)
A single-purpose extension that automatically denies all notification requests without any user interaction. Zero configuration needed — install and forget.

---

## Chrome's Quieter Notifications Feature

Chrome has a built-in **Quieter notifications** mode that replaces the large permission dialog with a small chip in the address bar:

1. Go to `chrome://settings/content/notifications`
2. Toggle on **Use quieter messaging**

This does not block notifications entirely but reduces visual interruption significantly — ideal for users who occasionally want to allow notifications on specific sites.

---

## FAQ

**Q: Why do notification popups keep coming back after I block them?**
Some sites use multiple subdomains (e.g., `news.example.com`, `push.example.com`) and rotate through them. Setting the global default to "Don't allow" in Chrome settings stops all of them at once.

**Q: Do notification blockers break website functionality?**
No. Notifications are purely an opt-in feature. Blocking them has zero effect on how the website loads or functions.

**Q: Can I block Chrome notifications on Android?**
Yes. In Chrome for Android: Settings → Site settings → Notifications → toggle off **Sites can ask to send notifications**.

**Q: What's the difference between blocking notifications and blocking popups?**
Notification popups are the "Allow/Block" permission dialogs from the browser itself. Regular popups are new windows opened by JavaScript. This guide covers notification permission dialogs — see our [popup blocker guide](/stop-video-popups-chrome-html/) for window popups.

---

*Related: [Best Anti-Popup Extension for Chrome](/anti-popup-extension-chrome/) | [Chrome Security Extensions List](/chrome-security-extensions-list/)*
