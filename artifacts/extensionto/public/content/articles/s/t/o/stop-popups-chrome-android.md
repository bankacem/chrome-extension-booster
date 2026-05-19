---
title: "How to Stop Popups in Chrome on Android (2026)"
slug: stop-popups-chrome-android
description: "Stop popup ads and notification spam in Chrome on Android. Settings guide, DNS blockers, and what to do when popups open new tabs automatically."
meta_description: "Stop popup ads and notification spam in Chrome on Android. Settings guide, DNS blockers, and what to do when popups open new tabs automatically."
category: "Chrome Extensions"
author: "ExtensionTo Editorial"
status: draft
published_at: null
updated_at: "2026-05-19T22:19:28.081Z"
created_at: "2026-05-19T22:19:28.081Z"
read_time: 5
---

# How to Stop Popups in Chrome on Android (2026)

Chrome on Android has fewer extension options than desktop, but the right combination of native settings and apps completely eliminates most popup problems. Here is the complete mobile guide.

## Table of Contents
1. [Step 1: Enable Chrome's Built-In Popup Blocker](#step-1-chromes-built-in-blocker)
2. [Step 2: Block Autoplay Sounds](#step-2-block-autoplay-sounds)
3. [Step 3: Use a DNS-Level Ad Blocker](#step-3-dns-level-blocker)
4. [Step 4: Use Brave Browser Instead of Chrome](#step-4-brave-browser)
5. [What About Popup Blocker Apps?](#popup-blocker-apps)
6. [FAQ](#faq)

---

## Step 1: Enable Chrome's Built-In Popup Blocker (Android)

1. Open Chrome on Android
2. Tap ⋮ (three dots) → **Settings**
3. Tap **Site settings**
4. Tap **Pop-ups and redirects** → toggle to **Blocked**
5. Also tap **Notifications** → **Sites can ask to send notifications** → toggle **off**

This handles the majority of basic popup scenarios at no cost and with no additional apps.

---

## Step 2: Block Autoplay Sounds (Silences Video Popup Ads)

Many popup ads trigger with autoplay video and sound:

1. In Chrome Settings → **Site settings** → **Sound**
2. Toggle to **Block sites from playing sound**

This silences video popup ads even when they manage to load.

---

## Step 3: Use a DNS-Level Ad Blocker (Most Effective on Android)

Since Chrome on Android does not support most extensions, a **DNS-based ad blocker** works at the network level — blocking ad domains before Chrome even loads them.

### AdGuard DNS (Free — Recommended)

Set your Android's Private DNS to `dns.adguard.com`:

1. Go to **Android Settings** → **Network & internet** → **Advanced** → **Private DNS**
2. Select **Private DNS provider hostname**
3. Enter: `dns.adguard.com`
4. Tap **Save**

All Chrome traffic (and every other app) now has ads and popups filtered at the DNS level. No VPN needed.

### NextDNS (Free tier — 300,000 queries/month)

More configurable than AdGuard DNS. Free for typical daily usage:

1. Sign up at `nextdns.io`
2. Get your personal DNS address
3. Set it as your Private DNS in Android settings

NextDNS lets you customize which categories of domains to block — ad networks, tracking, adult content, malware — from a web dashboard.

---

## Step 4: Use Brave Browser Instead of Chrome

Brave is a Chromium-based browser (same rendering engine as Chrome) with a built-in ad and popup blocker that works on Android without any extensions or DNS setup:

- Download from the Google Play Store
- All websites work identically to Chrome
- Brave Shields block popups, ads, and trackers automatically
- No configuration needed

Brave blocks popup ads on streaming sites far more reliably than Chrome + DNS alone.

---

## What About Popup Blocker Apps for Android?

Standalone "popup blocker" apps from the Play Store typically work only within their own VPN tunnel. This creates:
- **Battery drain** from the persistent VPN connection
- **Privacy concerns** — the app sees all your traffic
- **Compatibility issues** with banking apps that detect VPN mode

The DNS approach (Step 3) is more efficient, uses no battery, and doesn't interfere with other apps.

---

## FAQ

**Q: Why do popups still appear after I turn on the popup blocker in Chrome?**
Chrome's built-in blocker stops basic `window.open()` calls. Some popup techniques use page redirects and click-event triggers that bypass it. Use AdGuard DNS (Step 3) to block the ad domains at the network level.

**Q: Does AdGuard DNS work on mobile data (4G/5G)?**
Yes — Android's Private DNS setting applies on both Wi-Fi and mobile data.

**Q: Will blocking popups on Chrome Android break any websites?**
No. The DNS blocker only blocks known ad domains. Regular website content loads normally.

**Q: Can I use uBlock Origin on Chrome Android?**
No — Chrome for Android does not support extensions. Use Firefox for Android instead, which supports the full uBlock Origin extension.

---

*Related: [Popup Blocker for Mobile Chrome](/popup-blocker-for-mobile-chrome/) | [Best Anti-Popup Extension Chrome](/anti-popup-extension-chrome/)*
