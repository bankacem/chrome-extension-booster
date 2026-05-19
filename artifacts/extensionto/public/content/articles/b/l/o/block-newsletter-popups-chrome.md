---
title: "Block Newsletter Popups in Chrome 2026 — Stop the Subscription Nags"
slug: block-newsletter-popups-chrome
description: "Newsletter popups interrupt your reading on almost every site. Here's how to block them permanently in Chrome in 2026 — free and effective."
meta_description: "Newsletter popups interrupt your reading on almost every site. Here's how to block them permanently in Chrome in 2026 — free and effective."
category: "Chrome Extensions"
author: "ExtensionTo Team"
status: draft
published_at: null
updated_at: "2026-05-19T22:19:28.081Z"
created_at: "2026-05-19T22:19:28.081Z"
read_time: 5
---

# Block Newsletter Popups in Chrome 2026 — Stop the Subscription Nags

Newsletter signup popups are the most universally hated pattern on the web. They appear after 5 seconds, after you scroll 50%, when your mouse moves toward the browser tab, and again when you try to leave. They're also consistently missed by basic popup blockers because they're overlay divs — JavaScript elements injected into the page, not new windows.

This guide gives you the exact setup that removes newsletter popups permanently.

---

## Why Standard Popup Blockers Miss Newsletter Popups

Chrome's built-in popup blocker only blocks new browser windows and tabs. Newsletter popups are overlays — they exist within the same page, created by JavaScript that runs after the page loads.

A filter-list ad blocker with the right annoyance filters is what actually removes them.

---

## The Setup That Works

### uBlock Origin Lite + Annoyances Filters (Best, Free)

1. Install **uBlock Origin Lite** from Chrome Web Store
2. Click the icon → **Open dashboard**
3. Go to **Filter lists** tab
4. Enable these specific lists:
   - **uBlock filters — Annoyances** ← this is the key one
   - **AdGuard Annoyances** ← additional coverage
   - **Fanboy's Annoyance List** ← specifically targets newsletter/social widgets
5. Click **Apply changes** → **Update now**

After this setup, newsletter popups are removed before they finish loading on most sites.

**Why Fanboy's Annoyance List specifically:** It was built to target social media widgets, newsletter overlays, and promotional popups — exactly this use case.

---

## Sites With Stubborn Newsletter Popups

Some sites use obfuscated JavaScript for their popups that evades standard filter lists. For these:

**Manual element blocking:**
1. Let the popup appear
2. Click the **uBlock Origin Lite icon**
3. Click the **element picker** (dropper icon)
4. Click the newsletter popup overlay
5. Click **Create** to add a permanent per-site rule

The popup is now permanently blocked on that specific site, even if it evades general filter lists.

---

## Exit-Intent Newsletter Popups (Mouse-Triggered)

Exit-intent popups trigger when your mouse moves toward the browser's tab bar or address bar, detecting you're about to leave. They're a subset of newsletter popups.

**Block them:** Fanboy's Annoyance List and AdGuard Annoyances both include patterns for common exit-intent libraries (OptinMonster, Sumo, Privy, etc.). With these enabled, most exit-intent scripts are neutralized.

---

## Cookie Consent Banners (Different But Similar)

Cookie consent banners often appear alongside or instead of newsletter popups. They're not the same thing but equally annoying.

Add to your uBlock Origin Lite setup:
- Enable **EasyList Cookie** filter list

Or install **"I Don't Care About Cookies"** alongside uBlock — it specifically targets cookie consent patterns that the standard lists miss.

---

## Per-Site Emergency Fix

If a specific site's newsletter popup appears even with all filters enabled:

1. Visit the site
2. Press **F12** (DevTools)
3. Console tab → type: `document.querySelector('.popup-overlay').style.display='none'`
4. Press Enter (temporary fix for this visit)

For a permanent fix, right-click the popup element in Elements tab → Copy → Copy selector → add to uBlock's My Filters: `example.com##[paste-selector]`

---

## FAQ

**Why do some sites' newsletter popups appear even with uBlock enabled?**
Filter lists are maintained by humans and need to catch up with new popup implementations. If a site just launched a new popup library or uses unusual class names, it may not be in the list yet. Use the element picker for these cases.

**Will blocking newsletter popups affect sites I actually want to subscribe to?**
If you genuinely want to subscribe, you can still find the newsletter signup in the site's footer or header. Blocking the interruptive popup doesn't prevent subscription — it removes the interruption.

**Do these filters work on news paywalls?**
Paywall blocks are different from newsletter popups. They often withhold content at the server level rather than showing a JavaScript overlay. uBlock Lite can remove the overlay UI of some paywalls, but content withheld server-side cannot be recovered by a browser extension.

---

*Published by [ExtensionTo](https://extensionto.com) — Your guide to Chrome extensions.*
