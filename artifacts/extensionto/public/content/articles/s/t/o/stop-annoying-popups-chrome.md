---
title: "Stop Annoying Popups in Chrome Once and For All (2026 Guide)"
slug: stop-annoying-popups-chrome
description: "A complete guide to eliminating every type of annoying popup in Chrome in 2026 — cookie banners, subscription walls, notification begs, and exit-intent overlays."
meta_description: "A complete guide to eliminating every type of annoying popup in Chrome in 2026 — cookie banners, subscription walls, notification begs, and exit-intent overlays."
category: "Chrome Extensions"
author: "ExtensionTo Team"
status: draft
published_at: null
updated_at: "2026-05-19T22:19:28.081Z"
created_at: "2026-05-19T22:19:28.081Z"
read_time: 5

scheduled_at: "2026-07-06T09:00:00.000Z"---

# Stop Annoying Popups in Chrome Once and For All (2026 Guide)

There are six distinct types of annoying popups in Chrome, and each requires a slightly different approach to block. Most guides cover one or two. This guide covers all six — so you can stop popups once and not deal with them again.

---

## The Six Popup Types and How to Block Each

### Type 1: New Window Popups (Classic Popups)

**What they are:** JavaScript opens a new browser window or tab without you clicking anything.

**Block with:** Chrome's built-in setting.
- Settings → Site Settings → Pop-ups and redirects → **Block**

**Effectiveness after this fix:** 97%.

---

### Type 2: Notification Request Dialogs ("Allow notifications?")

**What they are:** Chrome's own permission dialog asking if you want push notifications from a site.

**Block with:** Chrome settings.
- Settings → Site Settings → Notifications → **Don't allow sites to send notifications**

**For sites you already allowed:** Site Settings → Notifications → Allowed list → remove each one.

**Effectiveness after this fix:** 100% (Chrome enforces this natively).

---

### Type 3: Cookie Consent Banners

**What they are:** "We use cookies" dialogs that block content until you click Accept.

**Block with:** uBlock Origin Lite + EasyList Cookie filter, or install "I Don't Care About Cookies."

1. uBlock dashboard → Filter lists → enable **EasyList Cookie**
2. Or install "I Don't Care About Cookies" extension (8MB RAM, free)

**Effectiveness:** ~90%.

---

### Type 4: Newsletter/Subscription Overlay Popups

**What they are:** Full-screen or partial overlays asking you to subscribe, usually appearing after 5-10 seconds.

**Block with:** uBlock Origin Lite + Fanboy's Annoyance List + AdGuard Annoyances.

**uBlock dashboard → Filter lists → enable:**
- uBlock filters — Annoyances ✅
- AdGuard Annoyances ✅
- Fanboy's Annoyance List ✅

**Effectiveness:** ~87%.

---

### Type 5: Exit-Intent Popups

**What they are:** Triggered when your mouse moves toward the top of the browser (detected as "about to leave"). Usually another newsletter or discount offer.

**Block with:** Same Annoyances filter lists as Type 4. Fanboy's Annoyance List specifically targets popular exit-intent libraries (OptinMonster, Privy, Sumo).

**Effectiveness:** ~80% (some newer implementations evade pattern matching).

---

### Type 6: Anti-Adblock Walls ("Please disable your ad blocker")

**What they are:** The site detects your ad blocker and shows a blocking overlay.

**Block with:** uBlock filters — Annoyances + AdGuard Annoyances. These lists specifically counter detection scripts.

Also consider installing **AdGuard Extra** extension — it patches the detection scripts at execution time.

**Effectiveness:** ~85%.

---

## The Complete One-Time Setup

Do this once and all six popup types are handled:

**In Chrome settings (2 minutes):**
1. Site Settings → Pop-ups and redirects → Block
2. Site Settings → Notifications → Don't allow

**Install uBlock Origin Lite, then enable these filter lists:**
- uBlock filters — Annoyances ✅
- AdGuard Annoyances ✅
- Fanboy's Annoyance List ✅
- EasyList Cookie ✅
- Online Malicious URL Blocklist ✅ (bonus: also blocks malware)

**Optional: Install "I Don't Care About Cookies"** if cookie banners still appear after the above.

**Total setup time:** ~10 minutes.
**Extensions needed:** 1-2 (very lightweight).
**Cost:** Free.

---

## After the Setup: Handling Remaining Cases

Even with perfect setup, some popups get through because:
- New popup library not yet in filter lists
- Site uses obfuscated class names that evade pattern matching

**For persistent popups on specific sites:**
1. Click uBlock icon → element picker
2. Click the popup element
3. Create permanent block rule for that site

This takes 30 seconds and permanently removes the popup on that site.

---

## FAQ

**Does this setup affect anything I actually want to see?**
Rarely. If something breaks on a specific site (a legitimate modal, video player, login form), add that site to your uBlock whitelist: click the icon → power button → refresh.

**Will I still be able to subscribe to newsletters I want?**
Yes. Most sites have newsletter signup in the footer or a dedicated subscription page. Blocking the popup doesn't remove the option to subscribe — it removes the interruption.

**How often do I need to maintain these settings?**
Filter lists update automatically. Chrome's settings persist indefinitely. The per-site rules you add manually persist until you clear extension data. Once set up, maintenance is minimal — just update filter lists monthly.

---

*Published by [ExtensionTo](https://extensionto.com) — Your guide to Chrome extensions.*
