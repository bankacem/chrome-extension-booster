---
id: 12a0cd7f-012f-44c3-affd-0ef770b9e13e
title: "Is uBlock Origin Safe to Use? (Honest Review 2026)"
slug: is-ublock-origin-safe-to-use
meta_description: "Is uBlock Origin safe? We review its permissions, open source code, privacy practices, and whether it can see your passwords — honest answer for 2026."
excerpt: "Is uBlock Origin safe? We review its permissions, open source code, privacy practices, and whether it can see your passwords — honest answer for 2026."
category: Chrome Extensions
tags: ["ublock origin", "privacy", "ad blocker", "security"]
keywords: ["is ublock origin safe to use", "ublock origin", "privacy", "ad blocker", "security"]
author: "Daniel Carter"
status: draft
published_at: null
scheduled_at: "2026-07-30T15:00:00.000Z"
created_at: "2026-05-17T01:07:29.249Z"
updated_at: "2026-05-17T01:07:29.249Z"
read_time: 3
views: 0
canonical: "https://extensionto.com/blog/is-ublock-origin-safe-to-use"
---

## Table of Contents

- [Table of Contents](#table-of-contents)
- [Who Makes uBlock Origin?](#who-makes-ublock-origin)
- [What Permissions Does uBlock Origin Request?](#what-permissions-does-ublock-origin-request)
- [Can uBlock Origin See Your Passwords?](#can-ublock-origin-see-your-passwords)
- [Does uBlock Origin Collect Data?](#does-ublock-origin-collect-data)
- [Is uBlock Origin Open Source?](#is-ublock-origin-open-source)
- [uBlock Origin vs. uBlock (Different Extension!)](#ublock-origin-vs-ublock-different-extension)
- [FAQ](#faq)

---

# Is uBlock Origin Safe to Use? (Honest Review 2026)

**Quick Answer:** Yes, uBlock Origin is one of the safest extensions you can install. It is fully open source, collects no user data, is maintained by a trusted independent developer (Raymond Hill), and has been independently audited. Its permissions are necessary for ad blocking to function.

---

## Table of Contents
1. [Who Makes uBlock Origin?](#who)
2. [What Permissions Does uBlock Origin Request?](#permissions)
3. [Can uBlock Origin See Your Passwords?](#passwords)
4. [Does uBlock Origin Collect Data?](#data)
5. [Is uBlock Origin Open Source?](#opensource)
6. [uBlock Origin vs. uBlock (Different Extension!)](#vs)
7. [FAQ](#faq)

---

## Who Makes uBlock Origin? {#who}

uBlock Origin is created and maintained by **Raymond Hill** (gorhill on GitHub), a Canadian software developer who has been working on the project since 2014.

Key facts:
- Independent developer with no corporate backing
- No advertising revenue model
- No investors or acquisition
- Funded only by voluntary donations
- Code is publicly visible on GitHub

This independent status is actually a safety feature — there's no corporation with financial incentive to monetize your data.

---

## What Permissions Does uBlock Origin Request? {#permissions}

uBlock Origin requests:
- **"Read and change all your data on websites you visit"** — this is the standard permission for any content blocker. Without it, the extension can't see or modify page content to remove ads.
- **"Block content on any page"** — required for network request filtering

These permissions sound alarming but are technically required for ad blocking to work. Every ad blocker needs them.

The difference from malicious extensions: uBlock Origin's code is public and audited. You can verify exactly what it does with those permissions.

---

## Can uBlock Origin See Your Passwords? {#passwords}

Technically, any extension with "read all data on websites" permission could access form fields including password inputs. However:

- uBlock Origin **does not** read or transmit form data
- Its source code has been independently reviewed and this is verified
- It processes page content only to identify and remove ad/tracker elements
- No network requests are sent to external servers (except to download filter list updates from public URLs)

---

## Does uBlock Origin Collect Data? {#data}

**No.** uBlock Origin:
- Does not collect browsing history
- Does not send data to any server (except updating filter lists from public CDNs)
- Does not have analytics
- Does not have a user account system
- Does not sell or share any data

From the privacy policy: uBlock Origin does not collect any user data whatsoever.

---

## Is uBlock Origin Open Source? {#opensource}

Yes. The full source code is available at [github.com/gorhill/uBlock](https://github.com/gorhill/uBlock) under the GPL-3.0 license.

This means:
- Anyone can inspect, audit, and verify what the code does
- Security researchers regularly review it
- No hidden functionality is possible
- Community members contribute improvements

---

## uBlock Origin vs. uBlock (Different Extension!) {#vs}

There are TWO similar-sounding extensions on the Chrome Web Store:

| Extension | Developer | Recommendation |
|-----------|-----------|---------------|
| **uBlock Origin** | Raymond Hill (gorhill) | ✅ Safe — install this one |
| **uBlock** | Different developer | ⚠️ Different project — not the same |

Always install **uBlock Origin** by Raymond Hill with 40M+ users. The icon shows an angry red shield.

---

## FAQ {#faq}

**Why does uBlock Origin need permission to read all my data?**
Because that's how browser extension ad blocking works. The extension needs to see the page content and network requests to identify and block ads. This permission is necessary, not suspicious.

**Has uBlock Origin ever been caught collecting data?**
No. In 10+ years of public development and community auditing, uBlock Origin has no documented instance of data collection.

**Is uBlock Origin free forever?**
Raymond Hill has stated uBlock Origin will remain free. There is no premium version planned.

**Should I use uBlock Origin with another ad blocker?**
No. One well-configured ad blocker is better than two conflicting ones. uBlock Origin alone is sufficient for most users.

---

*Published by [ExtensionTo](https://extensionto.com) — Your guide to Chrome extensions.*

---

## Related Articles

- [What Are Chrome Extensions? A Complete Beginner's Guide (2026)](/blog/what-are-chrome-extensions)
- [How to Protect Your Accounts in Chrome (2026)](/blog/how-to-protect-accounts-chrome)
- [How to Install IDM Extension in Chrome (2026)](/blog/how-to-install-idm-extension-chrome)
- [How to Import Chrome Extensions to Edge (2026)](/blog/how-to-import-chrome-extensions-to-edge)
