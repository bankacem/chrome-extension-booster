---
title: "Block Pop-Under Ads in Chrome 2026 — The Hidden Tab Problem"
slug: block-pop-under-ads-chrome
description: "Pop-under ads open a hidden browser tab behind your current window. Here's how to block them completely in Chrome in 2026."
meta_description: "Pop-under ads open a hidden browser tab behind your current window. Here's how to block them completely in Chrome in 2026."
category: "Chrome Extensions"
author: "ExtensionTo Team"
status: draft
published_at: null
updated_at: "2026-05-19T22:19:28.081Z"
created_at: "2026-05-19T22:19:28.081Z"
read_time: 5
---

# Block Pop-Under Ads in Chrome 2026 — The Hidden Tab Problem

Pop-under ads are sneakier than regular popups — they open a new browser window or tab that hides behind your current window. You don't notice it until you close or minimize Chrome and see an unknown window beneath it. They're especially common on adult content sites, piracy sites, and certain streaming sites, but appear elsewhere too.

---

## What Pop-Under Ads Actually Are

A pop-under ad is a browser window that JavaScript opens behind your active window. The technique:

1. You click anywhere on a page (even just scrolling)
2. JavaScript catches the click event
3. A new window opens — but is immediately sent behind your current window
4. You continue browsing unaware
5. When you minimize or close Chrome, the hidden window is revealed

Unlike overlay popups (which appear in front), pop-unders hide specifically to avoid immediate detection.

---

## Why They're Harder to Block Than Regular Popups

Chrome's built-in popup blocker catches some pop-unders but not all. The detection is based on whether the window opens without user intent — but some pop-under scripts exploit the click event handler (technically triggered "by user action") to bypass Chrome's check.

Modern pop-unders also use techniques like:
- Clicking to open the new window, then immediately minimizing it programmatically
- Using `window.open()` with specific window parameters that place it behind
- Using tab creation APIs in certain browser contexts

---

## Method 1: Chrome's Built-in Blocker + Strict Settings

First, ensure Chrome's popup blocker is maximally configured:

1. Settings → Privacy and security → Site Settings
2. Pop-ups and redirects → **"Don't allow sites to send pop-ups or use redirects"**

This catches most straightforward pop-unders that don't use click-exploit techniques.

---

## Method 2: uBlock Origin Lite — Best Pop-Under Blocking

uBlock Origin Lite blocks pop-under scripts at the network request level — before the window even opens. Most pop-under ad networks are in uBlock's block lists.

**Setup:**
1. Install uBlock Origin Lite → Dashboard → Optimal mode
2. Enable: EasyList, EasyPrivacy, Online Malicious URL Blocklist
3. Apply → Update now

**Why this is more effective than Chrome's built-in:** uBlock blocks the ad network domain that delivers the pop-under, not the `window.open()` call itself. Even if the script runs, there's nothing to show because the ad content was blocked at the network level.

---

## Method 3: Block Specific Sites That Generate Pop-Unders

For sites you know generate pop-unders:

1. Visit the site
2. Click the **lock icon** in address bar
3. Site permissions → Pop-ups and redirects → **Block**

This adds a site-specific block that overrides global settings.

---

## Method 4: Identify Hidden Windows

Even with blocking, occasionally a pop-under gets through. Find them:

**Windows:** Right-click the taskbar → a list of all Chrome windows appears. Any window not associated with your normal browsing is a pop-under.

**Mac:** Cmd+Tab to see all open windows. Or use Mission Control (F3/gesture) to see all open windows from all apps.

**Chrome itself:** Chrome menu → window list at the bottom of the menu shows all open Chrome windows.

---

## Sites Most Associated with Pop-Under Ads

Pop-unders are most common on:
- Free streaming movie/TV sites
- Software "download" sites (often fake download buttons)
- Adult content sites
- Online casino/gambling sites
- Free online game sites

For these categories specifically, using uBlock Origin Lite in **Optimal** mode (not Basic) provides the best protection.

---

## Complete Pop-Under Block Setup

**One-time configuration:**

1. Chrome Settings → Pop-ups and redirects → Block ✅
2. Install uBlock Origin Lite → Optimal mode ✅
3. Enable: EasyList + EasyPrivacy + Online Malicious URL Blocklist ✅
4. Enable: uBlock Annoyances (blocks some pop-under scripts directly) ✅

After this setup, pop-unders are rare. When one gets through, it means the ad network is new and hasn't made it onto block lists yet — click "Update now" in filter lists.

---

## FAQ

**How do I know if a site is using pop-unders if I can't see the window?**
Signs: Chrome's tab count seems higher than expected, you find unknown windows when you minimize Chrome, your browser history shows pages you didn't visit.

**Can pop-unders cause harm beyond being annoying?**
Yes. Pop-under ads sometimes lead to tech support scams, phishing pages, or malware download pages. This makes blocking them a security measure, not just a comfort preference.

**Does uBlock Origin Lite block 100% of pop-unders?**
No. Estimated 85-90% on standard sites. Sites with very recent pop-under networks not yet in filter lists slip through. The Online Malicious URL Blocklist specifically targets malicious pop-under networks.

**My Chrome keeps opening new windows even with everything blocked. Is it malware?**
Possibly. If pop-unders appear consistently despite full uBlock protection, check `chrome://extensions` for suspicious extensions, run Malwarebytes, and check Windows add/remove programs for unfamiliar software.

---

*Published by [ExtensionTo](https://extensionto.com) — Your guide to Chrome extensions.*
