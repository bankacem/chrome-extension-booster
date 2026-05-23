---
title: "How to Block Popups on Movie Streaming Sites in Chrome (2026)"
slug: block-popups-on-movie-sites-chrome
description: "Stop intrusive popups, pop-unders, and redirect ads on movie streaming sites in Chrome. Works on free streaming sites, torrent sites, and legal platforms."
meta_description: "Stop intrusive popups, pop-unders, and redirect ads on movie streaming sites in Chrome. Works on free streaming sites, torrent sites, and legal platforms."
category: "Chrome Extensions"
author: "ExtensionTo Editorial"
status: draft
published_at: null
updated_at: "2026-05-19T22:19:28.081Z"
created_at: "2026-05-19T22:19:28.081Z"
read_time: 5

scheduled_at: "2026-06-10T09:00:00.000Z"---

# How to Block Popups on Movie Streaming Sites in Chrome (2026)

Free movie streaming sites are the most aggressive popup offenders on the internet. They layer popups, pop-unders, fake "Play" buttons, and video overlays specifically designed to defeat Chrome's built-in blocker. Here is how to beat all of them.

## Table of Contents
1. [Why Streaming Site Popups Are Harder to Block](#why-harder)
2. [The Two-Extension Stack (Most Reliable)](#two-extension-stack)
3. [Chrome Settings That Help on Streaming Sites](#chrome-settings)
4. [Site-Specific Fix: Block JavaScript Per Domain](#javascript-block)
5. [What Does NOT Work on Streaming Sites](#what-not-works)
6. [FAQ](#faq)

---

## Why Streaming Site Popups Are Harder to Block

Streaming sites use techniques that bypass standard blockers:

1. **Pop-unders on click** — Any click on the page triggers `window.open()`, not just ad buttons
2. **Overlay fake players** — A transparent `<div>` sits over the real video player; clicking it opens a popup
3. **Tab redirect scripts** — The page redirects your current tab to an ad site on interaction
4. **Rotating ad domains** — New domains are added faster than filter lists can update

> **Competitor gap:** Most guides recommend a single extension. No single extension stops all of these techniques simultaneously. You need two layers.

---

## The Two-Extension Stack (Most Reliable)

### Layer 1: uBlock Origin — Network-Level Blocking

uBlock Origin blocks ad scripts *before they load*, stopping most popups before they execute. For streaming sites, enable these additional filter lists inside uBlock Origin:

1. Open uBlock Origin → **Settings** → **Filter lists**
2. Under **Annoyances**, check:
   - ✅ uBlock filters – Annoyances
   - ✅ EasyList Cookie
3. Under **Multipurpose**, check:
   - ✅ Dan Pollock's hosts file

[Install uBlock Origin →](https://chromewebstore.google.com/detail/ublock-origin/cjpalhdlnbpafiamejdnhcphjbkeiagm)

### Layer 2: Popup Blocker (Strict) — JavaScript Interception

Even when ad scripts partially load, Popup Blocker (Strict) intercepts `window.open()` calls and pauses them for your review. It catches click-triggered pop-unders that slip past uBlock's network filter.

[Install Popup Blocker (Strict) →](https://chromewebstore.google.com/detail/popup-blocker-strict/aefkmifgmaafnojlojpnekbpbmjiiogg)

---

## Chrome Settings That Help on Streaming Sites

Tighten these Chrome settings as a baseline before relying on extensions:

1. `chrome://settings/content/popups` → **Blocked (recommended)**
2. `chrome://settings/content/sound` → **Don't allow sites to play sound**
3. `chrome://settings/content/ads` → **Block ads on sites that show intrusive ads**

---

## Site-Specific Fix: Block JavaScript Per Domain

For the most aggressive sites, use uBlock Origin's per-site JavaScript blocking:

1. Visit the streaming site
2. Click the **uBlock Origin** icon
3. Click the **< >** (advanced) button
4. Click the `script` row → turn it **red** (block all scripts)
5. Click the **lock icon** to make it permanent for that domain

This completely disables JavaScript-based popups on that domain. Trade-off: some site features may break. Use the element picker instead if you want surgical control over specific overlay elements.

---

## What Does NOT Work on Streaming Sites

| Tool | Why It Fails |
|---|---|
| Chrome's built-in popup blocker | Bypassed by click-based pop-under techniques |
| Poper Blocker alone | Misses some overlay and tab-redirect techniques |
| AdBlock Plus | "Acceptable Ads" whitelist allows some streaming ads through |
| Notification block only | Does not stop `window.open()` popups |

---

## FAQ

**Q: Do these extensions work on legal streaming sites like Crunchyroll?**
Yes. uBlock Origin blocks video overlay ads on Crunchyroll and Dailymotion by default with standard EasyList filters.

**Q: Will blocking JavaScript break the video player?**
Often yes — video players rely on JavaScript. Use the uBlock Origin element picker to block specific overlay `div` elements instead of all scripts.

**Q: What about pop-unders that only appear when I close the browser?**
Pop-unders hide behind Chrome. Popup Blocker (Strict) catches these by intercepting the `window.open()` call regardless of timing.

---

*Related: [Anti-Popup Extension Chrome](/anti-popup-extension-chrome/) | [Free Popup Blocker for Google Chrome](/free-popup-blocker-for-google-chrome/)*
