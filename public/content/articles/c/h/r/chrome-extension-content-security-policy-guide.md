---
seo_title: "Chrome Extension CSP Errors and Fixes"
id: "a1b2c3d4-dev-0006"
title: "Chrome Extension Content Security Policy: Common MV3 Errors and Fixes"
slug: "chrome-extension-content-security-policy-guide"
excerpt: "Content Security Policy violations are among the most frequent causes of Chrome extension failures and rejections in Manifest V3. This guide identifies the most common CSP errors, explains why they occur, and provides specific fixes for each."
featured_image: /content/images/chrome-extension-content-security-policy-guide/featured.webp
category: "Productivity & Tools"
tags: ["content security policy", "manifest v3", "csp errors", "chrome extension security", "script-src", "remote code"]
keywords:
  - chrome extension content security policy
  - mv3 csp violations
  - content security policy extension error
  - unsafe eval chrome extension
meta_description: "Fix Chrome extension Content Security Policy errors in Manifest V3. Learn about CSP directives, common violations, and step-by-step fixes for unsafe-eval, remote scripts, and more."
status: draft
published_at: "2026-09-19T11:00:00Z"
scheduled_at: "2026-09-19T11:00:00Z"
author: "James Mitchell"
author_image: /content/images/authors/james-mitchell.png
read_time: 11
created_at: "2026-08-25T12:00:00+01:00"
updated_at: "2026-08-25T12:00:00+01:00"
description: "Content Security Policy violations are among the most frequent causes of Chrome extension failures and rejections in Manifest V3. This guide identifies the most common CSP errors, explains why they occur, and provides specific fixes for each."
---

Content Security Policy, commonly abbreviated as CSP, is a security layer that controls which resources a web page or extension can load and execute. For Chrome extensions, CSP serves as a critical defense against cross-site scripting attacks, remote code execution, and data exfiltration. In Manifest V3, Google significantly tightened the default CSP rules compared to Manifest V2, and many extensions that worked fine under the older manifest version break immediately when migrated because their code patterns violate the stricter CSP.

CSP violations in Chrome extensions manifest in several ways. You may see errors in the console like "Refused to load the script" or "Refused to evaluate a string as JavaScript because 'unsafe-eval' is not an allowed source of script." Your extension popup might render as a blank white box. A content script might fail to load a library it depends on. In the worst case, the Chrome Web Store reviewer will reject your extension for CSP violations, particularly if your manifest or code attempts to allow remote code execution. This guide covers the most common CSP errors in Manifest V3 extensions, explains the root cause of each, and provides practical fixes.

![Content Security Policy overview for Chrome extensions](/content/images/chrome-extension-content-security-policy-guide/chrome-extension-content-security-policy-guide-overview.webp "CSP Overview")

## How CSP Works in Manifest V3

Every Chrome extension has a default Content Security Policy applied by the browser. In Manifest V3, the default CSP for extension pages (popups, options pages, side panels, and background service workers) is significantly more restrictive than in Manifest V2. The default MV3 CSP prohibits inline scripts, inline event handlers, eval(), new Function(), and loading scripts from any external source. All JavaScript must be loaded from the extension package itself.

The CSP is enforced by the browser's rendering engine at the point of resource loading. When the browser encounters a script tag, an eval call, or an inline event handler, it checks the request against the extension's CSP. If the request does not match any allowed source in the script-src directive, the browser blocks it and logs a console error. This enforcement happens before any of your JavaScript runs, which means you cannot use JavaScript to bypass CSP restrictions.

Manifest V3 applies CSP differently to different parts of your extension. Extension pages, including your popup, options page, and any HTML pages bundled with your extension, are subject to the extension's default CSP. Content scripts injected into web pages are subject to the host page's CSP, not the extension's CSP. This distinction is important because a content script that works on one website may fail on another if that website has a more restrictive CSP. Extensions like Grammarly handle this by keeping their content scripts lightweight and performing heavy processing in the extension's own context.

### Default CSP vs. Custom CSP

In Manifest V3, you can customize the Content Security Policy for your extension pages using the content_security_policy field in manifest.json. However, the customization options are far more limited than in Manifest V2. You cannot relax the default CSP to allow remote scripts or unsafe-eval through manifest declaration. The only customization allowed is adding Content Security Policy Level 3 directives that further restrict or modify behavior, such as specifying allowed sandboxing behaviors.

| CSP Feature | Manifest V2 | Manifest V3 | Practical Impact |
|---|---|---|---
| Remote script loading | Configurable via script-src | Always blocked | Must bundle all JS locally |
| Inline scripts | Configurable | Always blocked | Must use external JS files |
| eval() and new Function() | Configurable via unsafe-eval | Always blocked (with narrow exceptions) | Refactor to use static functions |
| Inline event handlers | Configurable | Always blocked | Use addEventListener instead |
| Custom CSP in manifest | Full control via content_security_policy | Limited to extension_pages sandbox | Fewer escape hatches for legacy code |

The inability to relax CSP for remote scripts or eval in Manifest V3 is the single biggest source of migration pain for developers. In Manifest V2, a developer could set "script-src 'self' 'unsafe-eval' https://cdn.example.com" to allow eval and scripts from a CDN. In Manifest V3, that same policy is rejected. The intent is clear: Google wants all executable code to be reviewable as part of the extension package, and allowing remote code execution undermines the review process.

## Common CSP Error 1: Refused to Execute Inline Script

This is the most frequently encountered CSP error in Chrome extensions. It occurs when your extension HTML file contains JavaScript code directly within a script tag rather than in an external file. For example, a popup.html file that includes a script tag with JavaScript code written directly between the opening and closing tags will trigger this violation.

The browser will display an error like: "Refused to execute inline script because it violates the following Content Security Policy directive: 'script-src 'self''." The fix is straightforward: move all JavaScript code into an external .js file and reference it using the src attribute of the script tag. This applies equally to options pages, side panel HTML files, and any other extension page.

Inline event handlers like onclick="doSomething()" in HTML attributes are also blocked by the same CSP rule. These are not traditional inline scripts, but they are treated the same way by the CSP specification. Replace all inline event handlers with addEventListener calls in your external JavaScript file. For example, instead of writing a button click handler directly in the HTML, give the button an ID and attach the event listener in your JavaScript.

```html
<!-- This will be blocked by CSP -->
<button onclick="handleClick()">Click me</button>

<!-- This is CSP-compliant -->
<button id="action-btn">Click me</button>
<!-- In your external JS file: -->
<!-- document.getElementById('action-btn').addEventListener('click', handleClick); -->
```

Extensions that use frontend frameworks often encounter this error because many frameworks generate inline scripts or use template engines that produce inline event handlers. If you are using React, Vue, or Angular in your extension popup or options page, ensure you are using a production build that does not rely on inline scripts. Most modern framework toolchains handle this correctly when configured for extension builds, but development builds often include features like hot module replacement that inject inline scripts and will violate CSP.

## Common CSP Error 2: Refused to Evaluate a String (unsafe-eval)

The error message "Refused to evaluate a string as JavaScript because 'unsafe-eval' is not an allowed source of script" occurs when your code calls eval(), new Function(), setTimeout with a string argument, or setInterval with a string argument. In Manifest V3, unsafe-eval is permanently blocked and cannot be re-enabled through the manifest.

This error commonly appears in extensions that use libraries or frameworks that depend on eval internally. The most notable examples are older versions of Angular (AngularJS 1.x), Handlebars, Pug, and certain JSON parsing utilities that use eval for performance. If you are using any of these in your extension pages, you need to update to versions that do not require eval or find alternative libraries.

Modern Angular versions (2.0 and later) do not require eval. Handlebars can be configured to avoid eval by precompiling templates. If you are using a library that you cannot replace and that requires eval, consider moving that processing to an offscreen document or a sandboxed iframe, though sandboxed iframes have their own CSP limitations. In most cases, the correct fix is to refactor the code to use static function references instead of dynamic string evaluation.

```javascript
// This will trigger a CSP violation
timeoutId = setTimeout('checkStatus()', 1000);

// This is CSP-compliant
timeoutId = setTimeout(checkStatus, 1000);
```

![CSP error details and fixes](/content/images/chrome-extension-content-security-policy-guide/chrome-extension-content-security-policy-guide-details.webp "CSP Error Details")

## Common CSP Error 3: Remote Script Loading Blocked

The error "Refused to load the script 'https://cdn.example.com/library.js' because it violates the following Content Security Policy directive" means your extension is trying to load JavaScript from an external server. In Manifest V3, loading scripts from any URL outside the extension package is permanently blocked for extension pages. You cannot add the CDN domain to your CSP to allow it.

This restriction is by design. Google's security model for Manifest V3 requires that all code executed in extension contexts be bundled with the extension and reviewed as part of the Chrome Web Store submission process. Allowing remote script loading would allow an extension developer to push arbitrary code to users after review, bypassing the entire review system. This is classified as remote code execution and is a violation of the Developer Program Policies.

The fix is to bundle the library locally. Download the JavaScript file from the CDN and include it in your extension package. Update your script tags to reference the local file using a relative path. Use a build tool like Webpack, Vite, or Rollup to automate this process if you depend on multiple external libraries. Many extension developers use npm packages and bundle them with Vite configured for extension output, which produces a single or small number of optimized JavaScript files that include all dependencies.

| Scenario | CSP Violation | Fix |
|---|---|---|
| CDN script in popup.html | Remote script loading | Download and bundle locally |
| Google Analytics or Firebase SDK | Remote script loading | Use the Firebase npm package bundled locally |
| Paywall or analytics injection | Remote code execution | Use chrome.scripting.executeScript from service worker |
| Dynamic import() from URL | Remote script loading | Bundle the module locally |

One nuance worth noting is that the remote script restriction applies to extension pages, not to content scripts in the same way. Content scripts are subject to the host page's CSP, which may or may not allow remote scripts depending on the website. However, even for content scripts, best practice is to bundle all code locally to ensure consistent behavior across all websites.

## Common CSP Error 4: connect-src and fetch Restrictions

While the script-src directive gets the most attention, CSP also controls network requests through the connect-src directive. In Manifest V3, the default CSP allows extension pages to make fetch and XMLHttpRequest calls to any origin, because the extension's host_permissions govern network access rather than CSP. However, if you define a custom content_security_policy.extension_pages in your manifest, you must include appropriate connect-src directives or your network requests will be blocked.

A common mistake is copying a web application's CSP into an extension's manifest without understanding the differences. Web applications use CSP connect-src to restrict where the page can send data, which is a defense against data exfiltration. Extensions handle this through the permissions system instead. If you define a custom CSP that includes a restrictive connect-src without including the domains your extension needs to communicate with, you will see "Refused to connect to 'https://api.example.com/data' because it violates the following Content Security Policy directive: 'connect-src ...'" errors.

The practical advice is simple: avoid defining a custom content_security_policy in your manifest unless you have a specific, well-understood reason. The default Manifest V3 CSP is already appropriately restrictive, and adding custom directives often introduces unnecessary breakage. If you must customize it, be thorough in testing every network request your extension makes.

## Debugging CSP Violations Effectively

CSP violations are logged to the browser's DevTools console, but the error messages can be cryptic if you do not know what to look for. Open the popup or options page in a new tab by right-clicking the extension's icon and selecting "Inspect popup," which opens DevTools. Navigate to the Console tab and look for errors that start with "Refused to." Each error will cite the specific CSP directive that was violated and the resource that was blocked.

Chrome also provides a Content Security Policy report-only mode for testing. While extensions cannot enable report-only mode through the manifest, you can test your HTML files by opening them directly in a browser tab with a CSP report-only header set via a local server. This allows you to identify all violations before they cause runtime failures. Additionally, the CSP Evaluator tool available through Google's web.dev platform can analyze your manifest and code for potential violations before you submit to the Chrome Web Store.

## Frequently Asked Questions

**Can I use Google Analytics in my Manifest V3 extension?**
Yes, but you must bundle the Google Analytics JavaScript locally rather than loading it from a CDN. Google provides an npm package for Google Analytics that you can include in your build process. Configure the bundled script to send data to Google's endpoints, which is allowed by the default MV3 CSP for connect-src. Note that using Google Analytics in an extension requires proper disclosure in your privacy policy.

**Does CSP apply to content scripts injected into web pages?**
Content scripts are subject to the host page's Content Security Policy, not the extension's CSP. This means a content script that loads a library or makes a fetch request may work on one website but fail on another if the host page's CSP is more restrictive. Design content scripts defensively and test on multiple websites with varying CSP configurations.

**Can I use a sandboxed page to bypass CSP restrictions?**
Manifest V3 supports sandboxed pages through the sandbox property in the manifest. Sandboxed pages have a separate, configurable CSP that is independent of the extension's main CSP. However, sandboxed pages cannot access Chrome extension APIs directly. They must communicate with the extension's service worker through postMessage. This makes sandboxed pages useful for isolating untrusted code but impractical for most extension logic that needs API access.

**Why does my extension work in developer mode but fail when published?**
This discrepancy often occurs because developer mode loads your unpacked extension with slightly different security constraints than the packaged version. The most common cause is loading local files via file:// URLs or using eval in development that gets caught by the stricter CSP enforcement on packaged extensions. Always test with a packed .crx file before submitting to the Chrome Web Store.

**How do I handle libraries that require unsafe-eval?**
First, check if a newer version of the library has removed the eval dependency. Many major libraries, including Angular and Handlebars, have done so. If no eval-free version exists, you must find an alternative library that provides the same functionality without eval. As a last resort, you can run the library in a sandboxed iframe, but this adds significant complexity and limits the library's ability to interact with your extension.

**What is the difference between content_security_policy and content_security_policy.extension_pages in MV3?**
In Manifest V3, content_security_policy is deprecated in favor of content_security_policy.extension_pages, which applies specifically to extension pages like popups and options pages. There is also content_security_policy.sandbox for sandboxed pages. The separation allows different CSP rules for different contexts within the same extension. If you are migrating from Manifest V2, move your CSP declaration to the extension_pages sub-property.
