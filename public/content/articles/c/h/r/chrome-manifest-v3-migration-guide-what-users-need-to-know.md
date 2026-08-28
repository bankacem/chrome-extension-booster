---
seo_title: "Chrome Manifest V3 Migration Guide 2026: What Users Should Check"
id: "a1b2c3d4-mv3-0004"
title: "Chrome Manifest V3 Migration Guide: What Users Need to Know in 2026"
slug: "chrome-manifest-v3-migration-guide-what-users-need-to-know"
excerpt: "A practical user guide to Chrome's Manifest V2 phase-out: what changes, how to check an extension, and what to do when an older extension stops working."
featured_image: /content/images/chrome-manifest-v3-migration-guide-what-users-need-to-know/chrome-manifest-v3-migration-guide-what-users-need-to-know-1.webp
category: "Chrome Extensions"
tags: ["manifest v3", "chrome extensions", "migration", "chrome web store"]
keywords:
  - chrome manifest v3 migration
  - manifest v2 deprecated
  - chrome extension not working 2026
  - what is manifest v3
meta_description: "Understand Chrome Manifest V3 migration in 2026: check an extension's status, permissions, compatibility, and safer next steps if an older extension stops working."
status: draft
published_at: "2026-08-27T12:00:00+01:00"
scheduled_at: "2026-08-27T12:00:00+01:00"
author: "James Mitchell"
author_image: /content/images/authors/james-mitchell.png
read_time: 8
created_at: "2026-08-24T12:00:00+01:00"
updated_at: "2026-08-28T03:00:00+00:00"
description: "A practical user guide to Chrome's Manifest V2 phase-out: what changes, how to check an extension, and what to do when an older extension stops working."
faq:
  - question: "What is Manifest V3 in Chrome?"
    answer: "Manifest V3 is the current Chrome extensions platform. It changes background pages to event-driven service workers, disallows remotely hosted code, and moves many network request changes toward declarative rules."
  - question: "Are all Manifest V2 extensions already removed from Chrome?"
    answer: "Not yet as of August 28, 2026. Google says Manifest V2 was disabled for users in Chrome 138 and that all remaining Manifest V2 extensions are scheduled for removal from the Chrome Web Store on August 31, 2026."
  - question: "How can I tell whether a Chrome extension is affected?"
    answer: "Open chrome://extensions, look for a warning on the extension card, check the Chrome Web Store listing and its last update, then test the feature you rely on. These checks show your practical status without guessing from the extension name."
  - question: "Does Manifest V3 make every extension use less memory?"
    answer: "No. Service workers can avoid a continuously running background page, but resource use still depends on the extension, its features, and how often it runs. Treat lower idle activity as a platform design goal, not a guaranteed benchmark for every product."
  - question: "What should I do if an extension stops working after the transition?"
    answer: "Update Chrome and the extension, review site access and release notes, contact the publisher, and look for a maintained alternative if the required feature has no supported Manifest V3 path. Remove the old extension when you no longer need its access."
---

![Chrome extension cards moving through a clear migration checkpoint](/content/images/chrome-manifest-v3-migration-guide-what-users-need-to-know/chrome-manifest-v3-migration-guide-what-users-need-to-know-1.webp "Chrome Manifest V3 migration overview")

## Quick answer: what should Chrome users know about Manifest V3?

**Manifest V3 is now the current Chrome extensions platform, but the transition is not the same as saying every older extension disappeared on one day.** Google’s official timeline says Manifest V2 was disabled for users in Chrome 138, while all remaining Manifest V2 extensions are scheduled to be removed from the Chrome Web Store on **August 31, 2026**. [1] If an extension matters to you, check its warning status at `chrome://extensions`, review its store listing and recent update, and test the feature you actually use.

This guide is for **Chrome users**, not extension developers. It explains the practical changes, the checks that are useful now, and what to do when an extension has no supported migration path. For developer implementation details, use Chrome’s [official migration documentation](https://developer.chrome.com/docs/extensions/develop/migrate). [2]

## What Manifest V3 changes for everyday users

Manifest V3 is a platform update rather than a product rating. Chrome’s documentation describes three changes that users may notice: background pages move toward service workers, remotely hosted code is no longer allowed, and many request-modification patterns move toward the declarativeNetRequest API. [3]

| Platform change | What you may notice | What it does not prove |
|---|---|---|
| Event-driven service workers | A feature may start when an event occurs instead of keeping a background page running continuously | That every extension uses less memory in every situation |
| No remotely hosted code | Changes arrive through packaged, reviewed extension updates | That an extension can never contain a security flaw |
| Declarative request rules | Blocking or redirecting behavior may use declared rules and product-specific limits | That every filter or workflow will behave identically to Manifest V2 |
| Clearer access decisions | Site access and permission choices may be easier to inspect | That a broad permission is automatically malicious or automatically safe |

![A service worker, packaged code, and declared rules connected to a Chrome user dashboard](/content/images/chrome-manifest-v3-migration-guide-what-users-need-to-know/chrome-manifest-v3-migration-guide-what-users-need-to-know-2.webp "Manifest V3 changes users can notice")

## What the official timeline means in August 2026

The date matters because the transition is staged. Chrome’s official timeline states that Manifest V2 was disabled everywhere for users in Chrome 138 on July 24, 2025. It also states that remaining Manifest V2 extensions are removed from the Chrome Web Store on August 31, 2026. Extensions installed on Chrome 138 or earlier may remain installed but cannot receive updates and cannot be reinstalled from the store after removal. [1]

That wording is more useful than a blanket claim that “all V2 extensions are already gone.” A user may encounter different situations depending on the Chrome version, whether the extension is already installed, enterprise policy, and whether the developer has shipped a Manifest V3 version. Use the official timeline for dates and the extension’s own listing for product-specific status.

## How to check an extension in five minutes

### 1. Open the extensions manager

Go to `chrome://extensions` in Chrome. Read any warning shown on the extension card. Do not infer status from an old blog post or from the extension’s name alone.

### 2. Inspect the store listing

Open the extension’s Chrome Web Store page and compare the publisher name, last-updated date, permissions, privacy disclosure, and support link. A recent update is useful evidence of maintenance, but it is not proof that every feature has been preserved.

### 3. Test the feature you depend on

Use a small, reproducible check: open the site or workflow where you need the extension, trigger its main function, and note the result. A password manager failing to detect a form, a redirect tool not acting, or a content filter missing a rule can have product-specific causes unrelated to Manifest V3.

### 4. Read release notes before reinstalling

Look for terms such as Manifest V3, service worker, declarativeNetRequest, site access, or removed features. If the publisher explains a limitation, treat that explanation as product documentation rather than as a promise that all behavior is unchanged.

![A practical user checklist showing chrome://extensions, a store listing, permissions, and a test page](/content/images/chrome-manifest-v3-migration-guide-what-users-need-to-know/chrome-manifest-v3-migration-guide-what-users-need-to-know-3.webp "Check a Chrome extension during Manifest V3 migration")

## Why some extensions behave differently after migration

A Manifest V2 extension could use a persistent background page. Manifest V3 uses service workers that run in response to events and can stop when idle. Chrome says this change is intended to improve the extension platform’s privacy, security, and performance model, but it does not create a fixed performance result for every extension. [3]

Network filtering is another important distinction. Chrome’s migration documentation describes declarative rules as a replacement for many blocking or modifying request patterns. The exact experience depends on the extension’s rules, controls, and supported use case. An ad blocker, redirect helper, and developer tool should not be judged by the same compatibility test.

Manifest V3 also removes remotely hosted code from extensions. In practical terms, the code that runs must be included in the extension package and go through the store’s review process. This improves reviewability, but it does not replace checking the publisher, permissions, privacy disclosure, and update history.

## What to do when an extension stops working

First, update both Chrome and the extension, then reopen the affected tabs. Next, check the extension’s site access and options. If the problem began after an update, read the release notes and support page before removing the extension.

If the feature is still broken, test a maintained alternative from the Chrome Web Store. Compare the alternative’s publisher, permissions, privacy information, support route, and last update. Do not install several broad extensions that perform the same filtering or rewriting job while troubleshooting; conflicts can make the original cause harder to identify.

If no alternative meets the need, document the exact page, action, Chrome version, extension version, and error. Send that reproducible report to the publisher. Remove an abandoned extension when its access is no longer justified.

![Two extension choices compared through a compatibility and privacy decision path](/content/images/chrome-manifest-v3-migration-guide-what-users-need-to-know/chrome-manifest-v3-migration-guide-what-users-need-to-know-4.webp "Choose a supported Manifest V3 alternative")

## Common assumptions to avoid

Manifest V3 does not mean that every extension is automatically secure, every extension uses less memory, or every old feature has an equivalent replacement. It also does not mean that an extension’s store presence is a complete security audit. Platform changes and product quality are related but separate questions.

For a permissions-focused review, see our [Chrome extension permissions guide](/blog/chrome-extension-permissions-guide). These narrower pages should answer their own intent rather than being folded into this migration overview.

## Frequently Asked Questions

### Q: What is Manifest V3 in Chrome?

Manifest V3 is the current Chrome extensions platform. It changes background pages to event-driven service workers, disallows remotely hosted code, and moves many network request changes toward declarative rules.

### Q: Are all Manifest V2 extensions already removed from Chrome?

Not yet as of August 28, 2026. Google says Manifest V2 was disabled for users in Chrome 138 and that all remaining Manifest V2 extensions are scheduled for removal from the Chrome Web Store on August 31, 2026.

### Q: How can I tell whether a Chrome extension is affected?

Open `chrome://extensions`, look for a warning on the extension card, check the Chrome Web Store listing and its last update, then test the feature you rely on. These checks show your practical status without guessing from the extension name.

### Q: Does Manifest V3 make every extension use less memory?

No. Service workers can avoid a continuously running background page, but resource use still depends on the extension, its features, and how often it runs. Treat lower idle activity as a platform design goal, not a guaranteed benchmark for every product.

### Q: What should I do if an extension stops working after the transition?

Update Chrome and the extension, review site access and release notes, contact the publisher, and look for a maintained alternative if the required feature has no supported Manifest V3 path. Remove the old extension when you no longer need its access.

![A calm maintenance scene with an extension update ring, support path, and uninstall control](/content/images/chrome-manifest-v3-migration-guide-what-users-need-to-know/chrome-manifest-v3-migration-guide-what-users-need-to-know-5.webp "Maintain Chrome extensions after Manifest V3 changes")

## References

[1]: https://developer.chrome.com/docs/extensions/develop/migrate/mv2-deprecation-timeline "Manifest V2 support timeline — Chrome for Developers"
[2]: https://developer.chrome.com/docs/extensions/develop/migrate "Migrate to Manifest V3 — Chrome for Developers"
[3]: https://developer.chrome.com/docs/extensions/develop/migrate/what-is-mv3 "Manifest V3 — Chrome for Developers"
[4]: https://developer.chrome.com/docs/extensions/develop/concepts/declare-permissions "Declare permissions — Chrome for Developers"
