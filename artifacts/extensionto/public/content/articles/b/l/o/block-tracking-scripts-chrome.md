---
title: "How to Block Tracking Scripts in Chrome (2026 Complete Guide)"
slug: block-tracking-scripts-chrome
description: "Block JavaScript tracking scripts in Chrome using uBlock Origin, Privacy Badger, and Chrome's own settings. Stop analytics, ad networks, and data brokers from profiling you."
meta_description: "Block JavaScript tracking scripts in Chrome using uBlock Origin, Privacy Badger, and Chrome's own settings. Stop analytics, ad networks, and data brokers from profiling you."
category: "Chrome Extensions"
author: "ExtensionTo Editorial"
status: draft
published_at: null
updated_at: "2026-05-19T22:19:28.081Z"
created_at: "2026-05-19T22:19:28.081Z"
read_time: 5
---

# How to Block Tracking Scripts in Chrome (2026 Complete Guide)

Every website you visit loads dozens of third-party JavaScript files — tracking scripts from Google Analytics, Facebook Pixel, advertising networks, and data brokers. These scripts record your behavior and share that data across thousands of sites. Here is how to stop them.

## Table of Contents
1. [What Tracking Scripts Actually Do](#what-they-do)
2. [Method 1: uBlock Origin — Block at Network Level](#method-1-ublock)
3. [Method 2: Privacy Badger — Behavioral Blocking](#method-2-privacy-badger)
4. [Method 3: Chrome's Privacy Sandbox Settings](#method-3-chrome-settings)
5. [Method 4: ClearURLs — Strip Tracking from Links](#method-4-clearurls)
6. [Method 5: Dynamic Filtering (Advanced)](#method-5-advanced)
7. [Comparison Table](#comparison)
8. [FAQ](#faq)

---

## What Tracking Scripts Actually Do

A tracking script is a JavaScript file loaded from a third-party domain. When it runs it can:

- **Set tracking cookies** that identify you across sites sharing the same ad network
- **Read your browser fingerprint** — screen size, fonts, GPU data — without any cookie
- **Log mouse movements, scroll depth, and clicks** (session replay: Hotjar, FullStory)
- **Send data to data brokers** like Acxiom, Oracle BlueKai, and LiveRamp
- **Sync your identity** across devices using probabilistic matching

A typical news site loads 40–60 tracking scripts. Each one runs silently.

---

## Method 1: uBlock Origin — Block at the Network Level (Most Effective)

uBlock Origin stops tracking scripts from loading at all — they never execute.

### Setup for Maximum Tracking Protection

1. Install uBlock Origin from the Chrome Web Store
2. Open uBlock Origin → **Settings** → **Filter lists**
3. Enable under **Privacy**:
   - ✅ EasyPrivacy
   - ✅ AdGuard Tracking Protection
   - ✅ Legitimate URLs Blocklist
4. Enable under **Annoyances**:
   - ✅ uBlock filters – Annoyances

With these lists active, uBlock Origin blocks **95%+** of common tracking scripts before they run.

---

## Method 2: Privacy Badger — Behavioral Tracking Block

Privacy Badger by the EFF does not use a static filter list. It observes which domains track you across *multiple different websites* and blocks them automatically.

This catches new tracking domains not yet in any filter list — particularly useful for niche data brokers that rotate domains frequently.

**Best practice:** Run Privacy Badger *alongside* uBlock Origin. They use different detection methods and together block far more than either alone.

---

## Method 3: Chrome's Privacy Sandbox Settings

Google has introduced the Privacy Sandbox in Chrome, which limits (but does not eliminate) third-party cookie tracking. Opt out of Chrome's own tracking APIs:

1. Go to `chrome://settings/privacySandbox`
2. Disable **Ad topics**
3. Disable **Site-suggested ads**
4. Disable **Ad measurement**

---

## Method 4: ClearURLs — Strip Tracking from Every Link

Many tracking scripts log your behavior *before you land on the page* via tracking parameters in URLs:

- `?fbclid=` (Facebook click ID)
- `?gclid=` (Google Ads click ID)
- `?utm_source=`, `?utm_medium=`, `?utm_campaign=`

ClearURLs automatically removes these parameters from every URL you click. Install from the Chrome Web Store — zero configuration needed.

---

## Method 5: Dynamic Filtering (Advanced)

For advanced users, uBlock Origin's dynamic filtering blocks entire categories of third-party scripts:

1. Click uBlock Origin icon → enable **advanced mode** (shield icon)
2. In the panel, set `3rd-party scripts` to **gray** (block by default)
3. Whitelist individual domains you trust by clicking the green zone

This is the most powerful tracking script control available in any Chrome extension.

---

## Comparison Table

| Tracking Type | uBlock Origin | Privacy Badger | ClearURLs | Chrome Settings |
|---|---|---|---|---|
| Ad network trackers | ✅ | ✅ | ❌ | Partial |
| Google Analytics | ✅ | ✅ | ❌ | ❌ |
| Session replay (Hotjar) | ✅ | ✅ | ❌ | ❌ |
| URL tracking parameters | Partial | ❌ | ✅ | ❌ |
| New / unknown trackers | Partial | ✅ | ❌ | ❌ |
| Browser fingerprinting | Partial | Partial | ❌ | ❌ |

---

## FAQ

**Q: Will blocking tracking scripts break websites?**
Most sites work perfectly. The rare exception: sites that load their own content from third-party CDNs. Use uBlock Origin to whitelist specific domains if a site breaks.

**Q: Does Google Analytics show up as a tracking script?**
Yes. EasyPrivacy blocks `google-analytics.com` by default. This has no effect on your browsing experience.

**Q: Can I see which trackers are running without blocking them?**
Yes — install Ghostery. It shows all trackers by name and category without necessarily blocking them.

---

*Related: [Chrome Extension Detect Trackers](/chrome-extension-detect-trackers/) | [Anti-Tracking Extension Chrome](/anti-tracking-extension-chrome/)*
