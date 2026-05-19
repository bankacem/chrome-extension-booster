---
title: "Best Tab Suspender for Chrome (2026) — Fix High Memory"
slug: best-tab-suspender-chrome
description: "The best tab suspender extensions for Chrome in 2026. Fix Chrome high RAM usage by suspending inactive tabs. Great Suspender alternatives tested and ranked."
meta_description: "The best tab suspender extensions for Chrome in 2026. Fix Chrome high RAM usage by suspending inactive tabs. Great Suspender alternatives tested and ranked."
category: "Chrome Extensions"
author: "ExtensionTo Editorial"
status: draft
published_at: null
updated_at: "2026-05-19T22:19:28.081Z"
created_at: "2026-05-19T22:19:28.081Z"
read_time: 5
---

# Best Tab Suspender for Chrome (2026) — Fix High Memory

Chrome uses 50–300 MB of RAM per tab. With 20+ tabs open, that is gigabytes of memory consumed by pages you have not looked at in hours. Tab suspenders fix this by unloading idle tabs — freeing memory while preserving your session.

## Table of Contents
1. [What Happened to The Great Suspender](#great-suspender)
2. [Best Tab Suspenders in 2026](#best-suspenders)
3. [Comparison Table](#comparison)
4. [Recommendation](#recommendation)
5. [FAQ](#faq)

---

## What Happened to The Great Suspender

The Great Suspender was the most popular tab manager with 2+ million users. In February 2021, Google permanently removed it from the Chrome Web Store after discovering it had been sold to unknown owners who injected malware — tracking browsing history and enabling remote code execution.

**As of 2026:** The original is permanently gone. Do not install it from unofficial sources claiming to host the original.

---

## Best Tab Suspenders in 2026

### 1. Auto Tab Discard ⭐ Best Overall (Free, Open Source)

**Method:** Uses Chrome's native `chrome.tabs.discard()` API
**MV3:** ✅
**RAM savings:** High (identical to Chrome Memory Saver)
**Restore quality:** ✅ Full — tab reloads naturally, back button works

Auto Tab Discard is technically the best tab suspender available. Rather than replacing tab content with a custom HTML page, it calls Chrome's native discard API — the same one Chrome Memory Saver uses. Result:

- Discarded tabs show their original favicon and title (not a "suspended" placeholder)
- Clicking restores them exactly like a browser restart would — scroll position is re-fetched on reload
- Back button works normally after restoration
- No custom code runs on restoration — the browser handles it

**Key settings to configure:**
- Inactivity timer: 20 minutes (good default)
- Whitelist: `mail.google.com`, `calendar.google.com`, `notion.so`, `localhost`
- Protect tabs with unsaved form data: ✅ Enable
- Protect tabs playing audio: ✅ Enable
- Protect pinned tabs: ✅ Enable

---

### 2. The Marvellous Suspender — Best Great Suspender Replacement

**Method:** Custom suspended page (not native API)
**MV3:** ✅ (updated v8.1.3, December 2025)
**Open source:** ✅
**RAM savings:** High

The longest-maintained community fork of The Great Suspender. Updated to Manifest V3 in late 2025. Provides the familiar Great Suspender experience: a custom suspension page with the original favicon and a screenshot preview option.

**Choose this if:** You want a visible "suspended" state indicator and a custom page, similar to the original Great Suspender.

---

### 3. OneTab — Best for Radical Simplification

**Method:** Closes all tabs, saves URLs to a single list page
**MV3:** ✅
**RAM savings:** Maximum (all tabs fully closed)
**Restore quality:** URL list only — no session state, scroll position, or form data

OneTab is the most aggressive memory recovery option. Click the icon and all tabs are converted to a list on one page. Memory drops immediately and dramatically.

**Best for:** Research sessions, reading lists, and situations where you need immediate RAM recovery and do not mind re-opening tabs from a list.

---

### 4. Chrome's Native Memory Saver — No Extension Required

Before installing any extension, enable Chrome's built-in Memory Saver:

`chrome://settings/performance` → **Memory Saver** → On

This uses the same `chrome.tabs.discard()` API as Auto Tab Discard — without adding any extension overhead. For many users, this is sufficient without any additional extension.

---

## Comparison Table

| Extension | Method | RAM Savings | Restore Quality | Open Source | MV3 | Cost |
|---|---|---|---|---|---|---|
| Chrome Memory Saver | Native API | High | ✅ Full | N/A | ✅ | Free |
| Auto Tab Discard | Native API | High | ✅ Full | ✅ | ✅ | Free |
| Marvellous Suspender | Custom page | High | Partial | ✅ | ✅ | Free |
| OneTab | Closes tabs | Maximum | ❌ URL only | ❌ | ✅ | Free |

---

## Recommendation

**For most users:** Enable Chrome's native Memory Saver first (`chrome://settings/performance`). If you need more granular control (custom timers, per-domain whitelists, manual discard), add **Auto Tab Discard**.

**For the Great Suspender experience:** Use **The Marvellous Suspender** — it is the closest maintained fork.

**For research/link collection:** Use **OneTab**.

---

## FAQ

**Q: Does Auto Tab Discard lose my scroll position?**
Yes — discarded tabs reload when you click them, so the page starts at the top. This is unavoidable with the native discard approach. Whitelist pages you want to return to mid-read.

**Q: Can I use Auto Tab Discard and Chrome Memory Saver at the same time?**
Yes, they can coexist. Chrome Memory Saver handles long-term idle tabs; Auto Tab Discard gives you custom per-domain timers and manual discard controls on top.

**Q: Is The Marvellous Suspender safe after the Great Suspender malware incident?**
Yes — the maintainer (gioxx) has maintained a clean, auditable GitHub repository since the fork. The MV3 update in December 2025 further modernized the codebase. No security issues have been reported.

---

*Related: [Auto Tab Discarder Chrome](/auto-tab-discarder-chrome/) | [Chrome High CPU Usage Fix 2026](/chrome-high-cpu-usage-fix-2026/)*
