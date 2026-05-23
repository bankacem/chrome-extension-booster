---
title: "Popup Blocker for Chrome Android 2026 — All Types Covered"
slug: popup-blocker-android-chrome
description: "Stop popups on Chrome Android in 2026. From Chrome's built-in blocker to Kiwi Browser extensions — every free method covered step by step."
meta_description: "Stop popups on Chrome Android in 2026. From Chrome's built-in blocker to Kiwi Browser extensions — every free method covered step by step."
category: "Chrome Extensions"
author: "ExtensionTo Team"
status: draft
published_at: null
updated_at: "2026-05-19T22:19:28.081Z"
created_at: "2026-05-19T22:19:28.081Z"
read_time: 5

scheduled_at: "2026-07-02T15:00:00.000Z"---

# Popup Blocker for Chrome Android 2026 — All Types Covered

Popups on mobile Chrome are frustrating for a specific reason: you can't right-click them away, you can't run DevTools to block specific elements, and the screen is small enough that a popup covering 60% of it makes the page unreadable. Here's every working method for blocking popups on Chrome Android in 2026.

---

## Method 1: Chrome's Built-in Popup Blocker (Always Try First)

Chrome for Android has a built-in popup blocker that may simply be disabled.

**Enable it:**
1. Chrome → ⋮ menu → **Settings**
2. **Site settings**
3. **Pop-ups and redirects**
4. Toggle to **Blocked**

Also block notification request popups:
1. Site settings → **Notifications**
2. Toggle to **Blocked**

**Revoke notification permissions you already granted:**
1. Site settings → Notifications → scroll to "Allowed"
2. Tap each site → Block

---

## Method 2: For Overlay Popups — Kiwi Browser + uBlock Lite

Chrome's built-in blocker only stops new-window popups. Overlay popups (newsletter signups, cookie banners, subscription walls) require a proper ad blocker with annoyance filters.

**Setup:**
1. Install Kiwi Browser (Play Store)
2. Kiwi → Extensions → "+ from store" → install uBlock Origin Lite
3. Extension dashboard → Filter lists → enable Annoyances + EasyList Cookie
4. Apply → Update now

This removes overlay popups on every site you visit in Kiwi Browser.

---

## Method 3: Private DNS for Some Popup Sources

Some popup networks (ad networks that open new tabs/windows) are blocked at the DNS level:

Settings → Network & Internet → Private DNS → `dns.adguard.com`

This doesn't block overlay popups (same domain as the site), but it does block popup windows from known ad network domains.

---

## Popup Types and Which Method Blocks Them

| Popup Type | Chrome Built-in | Kiwi + uBlock | Private DNS |
|-----------|----------------|---------------|-------------|
| New tab/window | ✅ | ✅ | ✅ Partial |
| Cookie consent banner | ❌ | ✅ | ❌ |
| Newsletter overlay | ❌ | ✅ | ❌ |
| Notification request | ✅ (settings) | ✅ | ❌ |
| Exit-intent popup | ❌ | ✅ Partial | ❌ |

---

## Per-Site Popup Blocking

For a specific site that keeps showing popups:
1. Visit the site in Chrome
2. Tap the **lock icon** or **info icon** in address bar
3. Tap **Permissions** → Pop-ups and redirects → **Block**

---

## FAQ

**Why do some sites still show popups after blocking in settings?**
Overlay popups are JavaScript elements injected into the same page — not new windows. Chrome's blocker only stops new windows. Use Kiwi + uBlock for overlay blocking.

**Can I block popups in Chrome Android without switching browsers?**
For new-window popups: yes, use Chrome's built-in setting. For overlay popups: you need either Kiwi Browser + uBlock, or Private DNS blocks some of the popup network domains.

**What's the easiest single change I can make?**
Enable Chrome's built-in popup blocker AND block notifications. Takes 2 minutes and stops the most common popup types.

---

*Published by [ExtensionTo](https://extensionto.com) — Your guide to Chrome extensions.*
