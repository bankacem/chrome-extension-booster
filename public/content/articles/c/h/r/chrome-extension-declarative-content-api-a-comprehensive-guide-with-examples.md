---
seo_title: "Chrome Extension Declarative Content API"
id: b67b03b2-0fc4-491f-9ac3-f43f6d2f30d9
title: "Chrome Extension Declarative Content API: A Comprehensive Guide with Examples"
slug: chrome-extension-declarative-content-api-a-comprehensive-guide-with-examples
status: draft
excerpt: "Learn how to use the Chrome Extension Declarative Content API with this comprehensive guide, featuring step-by-step instructions and practical examples."
meta_description: "Learn how to use the Chrome Extension Declarative Content API with this comprehensive guide, featuring step-by-step instructions and practical examples."
featured_image: /og-image.png
category: Chrome Extensions
tags: []
keywords:
  - chrome extension declarative content api
author: Miccart Phen
published_at: 2026-08-24
read_time: 7
---
The Chrome Declarative Content API provides a powerful, event-based way for developers to build extensions that respond automatically to changes in a browser's environment. By eliminating the need for constant background scripts, it's designed to improve performance, reduce resource consumption, and simplify extension development. If you're a new or intermediate developer, this guide will demystify the Declarative Content API, showing you not just how it works, but also how to implement it in practical scenarios. Along the way, we’ll compare it to other APIs, troubleshoot common issues, and address frequently asked questions to ensure you’re set up for success.

---

## Overview of the Chrome Declarative Content API

The Declarative Content API is a high-level Chrome extension API introduced as an alternative to traditional background scripts. Its primary advantage lies in its ability to define rules declaratively, allowing the browser to handle changes in content state without your extension constantly running in the background.

<!-- ExtensionTo Batch 006 visual: chrome-extension-declarative-content-api-a-comprehensive-guide-with-examples -->

![Chrome Extension Declarative Content API rules and activation workflow illustration](/content/images/chrome-extension-declarative-content-api-a-comprehensive-guide-with-examples/chrome-extension-declarative-content-api-a-comprehensive-guide-with-examples-workflow.webp)

*Illustration: Editorial illustration of the Chrome Extension Declarative Content API rules workflow; it is not a product screenshot.*

### Key Features:
- **Event-based functionality:** Instead of polling in the background, extensions can trigger actions when specific rules are met.
- **Improved Performance:** By offloading state monitoring to the browser, the API reduces memory and CPU usage.
- **Browser-managed rules:** Once registered, the rules persist even if the extension or browser undergoes a restart.

For example, if you want an extension that turns on a specific page action (like enabling dark mode) for shopping websites, you can use the Declarative Content API to target sites with particular URLs and CSS elements without active monitoring.

---

## Core Concepts and How It Works

To fully grasp the API, you should understand its foundational concepts. Here are the building blocks that make it work:

### Rules
- Rules are the heart of the Declarative Content API. Each rule consists of **conditions** (criteria to check) and **actions** (what to do when those criteria are met). For example:
  ```javascript
  chrome.declarativeContent.onPageChanged.addRules([
      {
          conditions: [
              new chrome.declarativeContent.PageStateMatcher({
                  pageUrl: { hostContains: 'example.com', schemes: ['https'] }
              })
          ],
          actions: [new chrome.declarativeContent.ShowPageAction()]
      }
  ]);
  ```

### Matchers
- `PageStateMatcher` defines the conditions under which an action should occur. This could include URL matching, presence of specific HTML or CSS elements, or other page attributes.
- Additional conditions might restrict behavior to certain tab or frame states, enabling precise targeting.

### Actions
- Actions are specific operations triggered by matched rules. Common actions include displaying a browser action, showing a page action, or modifying the extension badge.

---

## Key API Types and Events

Here’s a breakdown of the core objects and events you’ll use in the Declarative Content API:

| **API Element**                 | **Purpose**                                                                                                     |
|----------------------------------|-----------------------------------------------------------------------------------------------------------------|
| `chrome.declarativeContent.Rule`| Defines the logic that runs based on content changes.                                                           |
| `chrome.declarativeContent.PageStateMatcher` | Detects whether a page meets specified conditions (e.g., domain, URL path, CSS selectors).                      |
| `chrome.declarativeContent.onPageChanged` | An event signaling the browser to monitor declaratively defined rules.                                       |
| `chrome.declarativeContent.ShowPageAction` | A built-in action to display an extension’s page action icon.                                                |
| `chrome.declarativeContent.SetIcon`       | Allows dynamic updates to browser icons when conditions are met.                                              |

### Notable Features:
1. **Passive Event Listening**: Unlike other APIs, this API doesn't rely on active polling or monitoring, which optimizes resource usage.
2. **Declarative Rules Outlive Reloads**: Once set, rules persist through restarts — reducing the need for reinitialization.

---

## How to Use the Declarative Content API: Step-by-Step Guide

Let’s walk through creating an extension using the Declarative Content API to show a page action when a user visits a specific website.

### Step 1: Set up your extension's manifest file
Update the `manifest.json` to include the appropriate permissions and background scripts:
```json
{
  "name": "Example Extension",
  "version": "1.0",
  "manifest_version": 3,
  "permissions": [
    "declarativeContent",
    "activeTab"
  ],
  "background": {
    "service_worker": "background.js"
  },
  "action": {
    "default_popup": "popup.html",
    "default_icon": {
      "16": "icon16.png",
      "48": "icon48.png",
      "128": "icon128.png"
    }
  }
}
```

### Step 2: Write your background script
Add rules using `onPageChanged` in `background.js`:
```javascript
chrome.runtime.onInstalled.addListener(() => {
    chrome.declarativeContent.onPageChanged.removeRules(undefined, () => {
        chrome.declarativeContent.onPageChanged.addRules([
            {
                conditions: [
                    new chrome.declarativeContent.PageStateMatcher({
                        pageUrl: { hostEquals: 'example.com' }
                    })
                ],
                actions: [new chrome.declarativeContent.ShowPageAction()]
            }
        ]);
    });
});
```

### Step 3: Test the Extension
- Load the manifest in Chrome by navigating to `chrome://extensions/`.
- Test by visiting `https://example.com`. You should see your extension's page action appear in the browser toolbar.

---

## Common Use Cases and Examples

### 1. Enabling Page Actions on Specific Websites
Show a page action for specific domains like shopping sites or social platforms:
```javascript
new chrome.declarativeContent.PageStateMatcher({
   pageUrl: { hostContains: 'shopping-site.com', schemes: ['https'] }
});
```

### 2. Updating Badges Based on Content
Change your extension’s badge to display product counts when users visit an e-commerce site.
```javascript
actions: [
   new chrome.declarativeContent.SetIcon({ path: "icon.png" }),
   new chrome.declarativeContent.SetBadgeText({ text: "5" })
]
```

### 3. Triggering Custom Functionalities
Combine multiple `PageStateMatcher` conditions to activate advanced browser actions:
```javascript
{
    conditions: [
        new chrome.declarativeContent.PageStateMatcher({
            pageUrl: { hostEquals: 'blog.example.com' },
            css: ['article p']
        }),
        new chrome.declarativeContent.PageStateMatcher({
            css: ['body.dark-mode']
        })
    ],
    actions: [/* custom actions here */]
}
```

---

## Debugging and Troubleshooting Tips

### Tools for Debugging
- **Chrome DevTools:** Open the “Service Workers” section at `chrome://inspect/#service-workers` to monitor background scripts.
- **Logs in Background Files:** Use `console.log()` statements to debug service worker scripts.
- **Remove Rules Carefully:** If multiple rules are conflicting, use `removeRules()` effectively to avoid overlaps.

### Common Pitfalls:
1. **Page URL Mismatch**
   - Issue: Rules don’t trigger because of incorrect URL patterns.
   - Solution: Double-check your `PageStateMatcher` values for common issues like omitted `www.` or incorrect schemes.

2. **Permissions Issues**
   - Issue: The browser blocks your extension.
   - Solution: Ensure your `manifest.json` includes `declarativeContent` and the required host permissions.

3. **Conflicting Rules**
   - Issue: Two rules attempt to control the same action.
   - Solution: Carefully organize when and how actions are triggered.

---

## Comparison with Similar APIs

## | **Feature**                     | **Declarative Content API**       | **Scripting API**              | **Tabs API**                      |
|----------------------------------|-----------------------------------|--------------------------------|-----------------------------------|
| **Background Activity**          | Passive rules, no active polling  | Requires custom logic, background scripts | Requires additional extensions running |
| **Ease of Use**                  | Higher, declarative rules are simpler | Moderate, requires imperative programming | Moderate |
| **Performance**                  | Highly optimized                  | Slightly less efficient due to active scripting | Resource-intensive |
| **Use Case**                     | Content-specific actions          | General scripting needs         | Tab and navigation management    |

## **When to use the Declarative Content API:**
Opt for this API when building lightweight, content-sensitive extensions needing reliable, rule-based functionality without persistent background activity.

---

## FAQ: Declarative Content API

## **Q: Can I use both the Declarative Content API and Scripting API together?**
A: Yes. You can leverage the Declarative Content API for state-driven actions while using the Scripting API for more complex scripts.

## **Q: Does the Declarative Content API support Manifest V3?**
A: Yes, it is fully compatible with Manifest V3 as background scripts were redesigned in this manifest version.

**Q: Can I update rules dynamically at runtime?**
A: Yes, but you need to use `chrome.declarativeContent.onPageChanged.removeRules()` to clear the old rules, and then add new ones.

**Q: What happens if two rules overlap?**
A: The browser prioritizes rules based on their order of addition. Ensure actions for different rules do not conflict.

**Q: Is this API available on all Chromium-based browsers?**
A: Yes, most Chromium-based browsers like Edge and Brave support this API, but always verify browser-specific documentation.

---

## Conclusion

The Chrome Declarative Content API is an excellent tool for efficiently creating powerful, lightweight, and performance-friendly browser extensions. By leveraging its declarative nature, you can streamline development while maintaining low resource consumption. Whether you’re enabling page actions on specific URLs or dynamically modifying browser visuals, the API’s flexibility and performance benefits make it ideal for content-sensitive tasks. Start experimenting today by following the step-by-step guide and bring your innovative ideas to life in Chrome extensions!

Explore more [Chrome extension guides](/blog) on ExtensionTo.
