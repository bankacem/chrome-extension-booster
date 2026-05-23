---
title: "The Great Suspender Chrome — What Happened & Best Alternatives (2026)"
slug: the-great-suspender-chrome
description: "The Great Suspender was removed from Chrome for malware in 2021. Here's what happened, which forks are safe in 2026, and the best alternatives."
meta_description: "The Great Suspender was removed from Chrome for malware in 2021. Here's what happened, which forks are safe in 2026, and the best alternatives."
category: "Chrome Extensions"
author: "ExtensionTo Editorial"
status: draft
published_at: null
updated_at: "2026-05-19T22:19:28.081Z"
created_at: "2026-05-19T22:19:28.081Z"
read_time: 5

scheduled_at: "2026-07-08T09:00:00.000Z"---

# The Great Suspender Chrome — What Happened & Best Alternatives (2026)

The Great Suspender was the most popular tab manager in Chrome history with 2+ million users. In February 2021, Google permanently removed it after discovering malware. Here is the full story and the safest alternatives in 2026.

## Table of Contents
1. [What Happened to The Great Suspender](#what-happened)
2. [Community Forks: Are They Safe in 2026?](#community-forks)
3. [Better Alternative: Auto Tab Discard](#auto-tab-discard)
4. [Comparison Table](#comparison)
5. [How to Migrate from The Great Suspender](#migration)
6. [Lessons for Extension Security](#lessons)
7. [FAQ](#faq)

---

## What Happened to The Great Suspender

The Great Suspender was originally built by **Dean Oemcke** as an open-source project with a clean reputation.

**Timeline of events:**
- **June 2020:** Oemcke sold the extension to an anonymous buyer
- **Late 2020:** New owners pushed a silent update containing tracking code and remote code execution capability
- **February 2021:** Google detected the malicious behavior and removed the extension from the Chrome Web Store — without prior notice to users
- **Result:** 2+ million users had their browsing history logged and their browsers exposed to remote code execution

This was not a theoretical attack — it was a real supply chain compromise affecting millions of people.

---

## Community Forks: Are They Safe in 2026?

After removal, community members published clean forks with the malicious code removed.

### The Marvellous Suspender (by gioxx)
**Status:** ✅ Active on Chrome Web Store
**Version:** v8.1.3 (updated December 2025 — MV3)
**Open source:** ✅ GitHub
**Assessment:** Most maintained fork. The developer has been transparent and consistent since 2021. MV3 migration completed. No reported security issues.

### Great Suspender Reloaded (by tim-dim-ext)
**Status:** ✅ Active
**MV3:** ✅
**Open source:** ✅ GPL 2.0
**Assessment:** Clean fork, functional. Some reported minor UI bugs (favicon glitches) but no security concerns.

### Original Great Suspender (any source)
**Status:** ❌ Permanently removed — do not install from any unofficial source

---

## Better Alternative: Auto Tab Discard

The community forks restore the Great Suspender's familiar experience but inherit its fundamental limitation: they replace tab content with a custom HTML suspension page, which destroys session state.

**Auto Tab Discard** uses Chrome's native `chrome.tabs.discard()` API instead:
- ✅ Tabs restore naturally — like after a browser restart
- ✅ Favicon and title remain in the tab bar with no placeholder page
- ✅ Back button works normally after restore
- ✅ Open source, no data collection
- ✅ MV3 native

For most users, Auto Tab Discard is the technically superior choice.

---

## Comparison Table: All 2026 Options

| Option | Status | Safe? | Method | Open Source | MV3 |
|---|---|---|---|---|---|
| Original Great Suspender | ❌ Removed | ❌ Malware | Custom page | Was open source | N/A |
| Marvellous Suspender | ✅ Active | ✅ | Custom page | ✅ | ✅ |
| Great Suspender Reloaded | ✅ Active | ✅ | Custom page | ✅ | ✅ |
| Auto Tab Discard | ✅ Active | ✅ | Native API | ✅ | ✅ |
| Chrome Memory Saver | ✅ Native | ✅ | Native API | N/A | N/A |

---

## How to Migrate from The Great Suspender

If you still have The Great Suspender installed and it is showing errors:

1. Go to `chrome://extensions/`
2. Find The Great Suspender → click **Remove**
3. Install **Auto Tab Discard** from the Chrome Web Store

**Recovering suspended tab URLs:**
The Great Suspender stored the original URL as a parameter in its suspension page URL:
```
chrome-extension://[id]/suspended.html#uri=https://actual-url.com
```
Look for the `#uri=` parameter to find your original URLs. If tabs are still open in suspended state, click them before removing the extension — they may redirect to the actual URL during the removal process.

---

## Lessons for Extension Security

The Great Suspender incident established three principles for Chrome extension safety:

1. **Extension ownership can change silently** — extensions can be sold without public disclosure
2. **Auto-update means instant exposure** — malicious updates reach all users immediately, with no user review
3. **Open source does not guarantee ongoing safety** — auditing must happen continuously, not just at install time

**Protective habits:**
- Prefer extensions from organizations (harder to sell silently) over individual developers
- Review extensions in `chrome://extensions/` → Details occasionally
- Do not install extensions with fewer than 50,000 users unless you can audit the code yourself

---

## FAQ

**Q: Is it safe to install The Marvellous Suspender in 2026?**
Yes — the maintainer has a clean track record since 2021. Review the GitHub repository before installing if you want to verify the code yourself.

**Q: Why did Google not warn users before removing The Great Suspender?**
Google's policy is to remove malicious extensions immediately without warning to prevent users from continuing to use compromised software. The lack of warning was intentional for security reasons.

**Q: Are any other popular extensions at risk of the same thing?**
Yes — any extension can be sold. The risk is highest with single-developer extensions that have large user bases and no organizational backing. Prefer extensions from organizations with multiple maintainers and public governance.

---

*Related: [Best Tab Suspender Chrome](/best-tab-suspender-chrome/) | [Auto Tab Discarder Chrome](/auto-tab-discarder-chrome/)*
