---
seo_title: "Web Accessible Resources in Chrome Extensions"
id: "a1b2c3d4-dev-0007"
title: "Chrome Extension Web Accessible Resources: Scope, Risks, and Testing"
slug: "chrome-extension-web-accessible-resources-guide"
excerpt: "Web accessible resources let Chrome extensions expose files to web pages, but they also create attack surfaces that developers must understand and manage carefully."
featured_image: /content/images/chrome-extension-web-accessible-resources-guide/featured.webp
category: "Productivity & Tools"
tags:
  - chrome extensions
  - web accessible resources
  - extension security
  - manifest v3
  - content scripts
  - extension development
keywords:
  - chrome extension web accessible resources
  - web_accessible_resources manifest v3
  - chrome extension expose files to web pages
  - extension resource security
  - chrome extension content script injection
meta_description: "Learn how Chrome extension web accessible resources work, their security risks, and best practices for safe configuration in Manifest V3."
status: draft
published_at: "2026-09-20T11:00:00Z"
scheduled_at: "2026-09-20T11:00:00Z"
author: "James Mitchell"
author_image: /content/images/authors/james-mitchell.png
read_time: 12
created_at: "2026-08-25T12:00:00+01:00"
updated_at: "2026-08-25T12:00:00+01:00"
description: "Web accessible resources let Chrome extensions expose files to web pages, but they also create attack surfaces that developers must understand and manage carefully."
---

![Web accessible resources overview](/content/images/chrome-extension-web-accessible-resources-guide/chrome-extension-web-accessible-resources-guide-overview.webp "Web Accessible Resources Overview")

Chrome extensions operate inside a sandboxed environment that isolates their files from the broader web. By default, no web page can directly access an extension's internal assets such as scripts, stylesheets, images, or HTML files. This isolation is a core security principle of the Chrome extension platform. However, there are legitimate scenarios where an extension needs to share specific files with web pages it interacts with. That is where the web accessible resources mechanism comes into play, serving as a controlled bridge between the extension sandbox and the open web.

Web accessible resources, commonly referred to as WAR, allow developers to designate specific files within their extension package that web pages can load via a special `chrome-extension://` URL. This capability powers features like content script injection, custom widgets embedded in third-party pages, and shared icon or font assets that content scripts need to render properly. Despite its usefulness, the WAR system has been a recurring source of security vulnerabilities in the Chrome Web Store ecosystem, prompting Google to tighten its rules significantly in Manifest V3.

## What Web Accessible Resources Actually Do

When a developer marks a file as web accessible, Chrome generates a predictable URL following the pattern `chrome-extension://<extension-id>/<file-path>`. Any web page that knows this URL can request the file, regardless of whether the extension has any other interaction with that page. This is fundamentally different from content scripts, which are injected programmatically by the extension into specific pages matching a defined URL pattern. Web accessible resources are passively available to any page that requests them, making their scope inherently broader and their potential for misuse correspondingly higher.

Consider a practical example. The popular grammar-checking extension Grammarly uses web accessible resources to inject its underline and tooltip widgets into text fields across the web. When you type in a Gmail compose window, the content script needs access to the extension's CSS and icon files to render the correction indicators. Those files must be accessible from the Gmail domain, so Grammarly declares them as web accessible resources. Similarly, dark-mode extensions like Dark Reader expose CSS files and occasionally JavaScript to transform the appearance of pages on the fly.

The key distinction is that web accessible resources are about making static or semi-static assets available. They are not a mechanism for executing logic on web pages, although JavaScript files declared as web accessible can be executed if a page includes them via a script tag. This dual nature, where the same mechanism serves both benign asset delivery and potentially dangerous script execution, is what makes the feature require careful handling.

### Manifest V2 vs Manifest V3 Differences

The transition from Manifest V2 to Manifest V3 brought substantial changes to how web accessible resources are declared and scoped. In Manifest V2, developers used a simple array of file paths or glob patterns in the `web_accessible_resources` key of the manifest. Any page could access those resources regardless of its origin. This broad approach was convenient but created a significant attack surface. A malicious website could probe for known extension IDs and load their web accessible resources, potentially extracting sensitive information or triggering unintended behaviors.

Manifest V3 replaced this flat array with an array of objects, each specifying both the resources and the destinations where those resources should be accessible. The new format looks like this in the manifest:

```json
{
  "web_accessible_resources": [
    {
      "resources": ["images/logo.png", "css/widget.css"],
      "matches": ["https://*.example.com/*"]
    },
    {
      "resources": ["fonts/custom.woff2"],
      "matches": ["<all_urls>"]
    }
  ]
}
```

This change means that in Manifest V3, a resource declared for `https://*.example.com/*` will return a 404 if requested from `https://evil-site.com/`. The scoping dramatically reduces the risk of cross-origin resource abuse. Extensions like LastPass and 1Password that previously exposed autofill assets to all URLs had to update their manifests to restrict resources to the specific banking and shopping domains where users actually needed them.

## Security Risks Associated with Web Accessible Resources

The security implications of web accessible resources extend beyond simple information disclosure. Researchers have documented multiple attack classes that exploit this mechanism. The most well-known is extension fingerprinting, where a malicious website enumerates installed extensions by attempting to load their known web accessible resource URLs. A 2023 study by the University of California, Berkeley found that approximately 75% of the top 1,000 Chrome extensions exposed at least one web accessible resource, and the combination of detectable resources created a fingerprinting vector as unique as a browser canvas hash.

A more severe risk involves resource hijacking and CSS injection. If an extension exposes a JavaScript file as a web accessible resource, a malicious page could load it via a script tag and potentially interact with the extension's context. While Chrome isolates extension origins from web page origins, certain API calls from within a web-accessible script can still leak data or cause unexpected side effects. The CSP bypass risk is also notable: if a web page includes an extension's web-accessible CSS file, that CSS can modify the page's appearance and potentially extract data through attribute selectors and font ligature-based side channels.

### The Extension Enumeration Problem

Extension enumeration works by cycling through known extension IDs and checking whether a web accessible resource exists at the expected URL. Since Chrome Web Store extension IDs are publicly visible and deterministic based on the upload, attackers can build comprehensive databases mapping extension IDs to their web accessible resources. Projects like the Extension Fingerprints database on GitHub have cataloged thousands of such mappings. When a website detects that a user has a specific banking extension, cryptocurrency wallet extension, or VPN installed, it can tailor phishing attacks or adjust pricing dynamically.

Google has taken steps to mitigate this. Starting in Chrome 88, the browser changed how web accessible resource URLs are resolved for extensions that use the new Manifest V3 format. In V3, the resource must match the requesting page's origin against the declared `matches` pattern, which prevents most cross-origin enumeration attempts. However, extensions still on Manifest V2 (which Google has been gradually phasing out) remain vulnerable to this technique, and the legacy behavior will persist until full V2 deprecation is complete.

## Best Practices for Declaring Resources

Developers should follow a strict principle of minimum exposure when declaring web accessible resources. Only declare files that absolutely must be accessible from web pages, and restrict the `matches` patterns to the narrowest possible set of origins. Here are concrete guidelines that align with the Chrome Web Store's current review expectations.

First, audit your extension's web accessible resources regularly. Many extensions accumulate WAR entries over time as features are added but rarely remove them when features are deprecated. The password manager extension Bitwarden, for example, reduced its web accessible resource footprint by 40% in a 2024 update by removing legacy autofill icons that had been superseded by a newer injection method. Second, avoid exposing JavaScript files as web accessible resources whenever possible. If you need to execute logic on a web page, use content scripts declared in the manifest with specific `matches` patterns rather than expecting the page to load your script directly.

Third, use content security policy headers on any HTML files you expose as web accessible resources. An HTML page without a restrictive CSP can be manipulated by the hosting page's scripts. If your extension exposes an options panel or a popup that can be embedded in a web page, ensure that page's CSP limits script execution to `'self'` or specific trusted origins. Fourth, consider using dynamic content injection rather than static web accessible resources. The `chrome.scripting.executeScript` API in Manifest V3 allows extensions to inject code into pages programmatically without exposing any files, which eliminates the WAR attack surface entirely for many use cases.

### Testing Web Accessible Resources

Testing whether your web accessible resources are properly scoped is a critical part of the extension development process. Developers should verify both that resources are accessible from intended origins and that they are blocked from unintended origins. The Chrome DevTools Protocol provides a way to inspect resource loading behavior, but a simpler approach is to create a test HTML page on a local server and attempt to load the resource URL from different origins.

![Testing web accessible resources](/content/images/chrome-extension-web-accessible-resources-guide/chrome-extension-web-accessible-resources-guide-details.webp "Testing Web Accessible Resources")

A practical testing workflow involves three steps. First, load your unpacked extension and note its ID from `chrome://extensions`. Second, open a page on an authorized domain and attempt to fetch the web accessible resource URL using JavaScript's Fetch API. The request should succeed with a 200 status code. Third, open a page on a non-authorized domain and repeat the same fetch. In Manifest V3, this should fail with a network error or 404 response. Automating these tests using a framework like Puppeteer or Playwright is recommended for extensions that need to verify their resource scoping across multiple domains.

Developers should also test edge cases such as iframe embedding. If a page on an authorized domain embeds an iframe from a different origin, and that iframe attempts to load the web accessible resource, the request will be evaluated against the iframe's origin, not the parent page's origin. This behavior catches many developers off guard and can lead to broken features if not accounted for during testing. The Chrome Extensions documentation explicitly notes that web accessible resource checks are based on the origin of the document making the request, not the top-level frame.

## Common Mistakes and How to Avoid Them

One of the most frequent mistakes developers make is using overly broad glob patterns when declaring resources. A pattern like `"resources": ["assets/*"]` exposes every file in the assets directory, including files that may contain configuration data, API keys embedded in non-sensitive files, or development artifacts that should never have been included in the production package. Instead, list individual files or use narrow patterns like `"resources": ["assets/icons/*.png", "assets/css/widget.css"]` to limit exposure to only the specific files needed.

Another common error is failing to update web accessible resource declarations when refactoring. When files are moved or renamed during a code reorganization, the old declarations may point to non-existent files while new files remain unexposed, breaking the extension's functionality on web pages. This is particularly problematic for extensions that rely on web accessible resources for content script UI rendering, as the broken resource loading fails silently in many cases without throwing visible errors to the developer. A post-refactor checklist should always include verifying that every declared web accessible resource still exists at the specified path and that no newly created resources need to be added.

A third mistake involves misunderstanding what the `matches` pattern controls. Some developers assume that declaring a resource with `"matches": ["https://example.com/*"]` means the extension's content scripts can access it. In reality, the `matches` pattern controls which web pages can access the resource, not which extension contexts can access it. Extension pages (popups, options pages, background service workers) can always access any file within the extension package regardless of the web accessible resources declaration. The declaration is exclusively about cross-origin web page access.

## Real-World Examples of Proper Usage

Well-maintained extensions in the Chrome Web Store demonstrate how to use web accessible resources responsibly. The accessibility extension Grammarly declares only its widget CSS, tooltip HTML, and icon sprite sheet as web accessible, and it scopes these resources to specific content script match patterns rather than `<all_urls>`. The advertisement blocker uBlock Origin uses web accessible resources sparingly, exposing only a small set of CSS files needed for element hiding rules, and it has progressively migrated toward CSS injection via the `chrome.scripting` API to reduce its WAR footprint.

The translation extension Google Translate exposes its inline translation popup HTML and associated styles as web accessible resources, restricted to pages where the content script is active. When Google migrated this extension from Manifest V2 to Manifest V3 in 2024, it took the opportunity to audit and reduce its web accessible resources from 23 files down to 8, replacing many static resource exposures with dynamically injected content. This kind of cleanup during a manifest migration is a best practice that all extension developers should consider.

## Frequently Asked Questions

### Can web accessible resources be accessed from any website?

In Manifest V3, no. Resources are only accessible from websites whose origins match the `matches` patterns you declare in the manifest. A request from a non-matching origin will receive a 404 or network error. However, Manifest V2 extensions still use the legacy behavior where any website can access declared resources, which is one of the key reasons Google is enforcing the V3 migration.

### Do I need web accessible resources for content scripts to work?

Not in most cases. Content scripts declared in the manifest are automatically injected by Chrome and can access any file within the extension package using relative URLs or `chrome.runtime.getURL()`. Web accessible resources are only needed when a web page itself (not the content script, but the page's own scripts) needs to load a file from your extension. This distinction is important because many developers incorrectly assume that content scripts require WAR to function.

### Can I expose HTML files as web accessible resources?

Yes, but you should be cautious. HTML files exposed as web accessible resources can be loaded in iframes by any matching origin, and if the HTML file lacks a restrictive Content Security Policy, the embedding page may be able to interact with it in unintended ways. If you must expose an HTML file, include a CSP meta tag that restricts script sources and ensure the page does not expose sensitive extension APIs or data to its parent frame.

### How do I check if my extension's web accessible resources are being enumerated?

Monitor your extension's service worker or background page logs for unexpected resource requests. You can also use the `chrome.webRequest` API (if your extension has the appropriate permissions) to log requests to `chrome-extension://` URLs originating from web pages. If you notice requests from domains not in your `matches` patterns, that may indicate a compatibility issue or an attempted enumeration attack.

### What happens if I remove a file that is declared as a web accessible resource?

The declaration becomes a no-op for that specific file, but it does not cause an error. However, any web pages or content scripts that reference the removed file will fail to load it, which can break features silently. Always verify that all declared resources still exist after any code refactoring or build process changes.

### Are there alternatives to web accessible resources for sharing assets with web pages?

Yes. The most robust alternative is to use content scripts with `chrome.scripting.insertCSS` and `chrome.scripting.executeScript` to inject styles and scripts directly into pages. This approach requires the `scripting` permission but avoids exposing any files passively. For images and fonts that content scripts need to reference in injected HTML, you can convert them to data URIs or use `chrome.runtime.getURL()` which generates URLs accessible only within the extension's content script context.

Chrome extension web accessible resources remain a powerful but sensitive feature that demands deliberate, minimal configuration. By understanding the scoping rules introduced in Manifest V3, auditing declared resources regularly, and preferring programmatic injection over passive exposure, developers can leverage this capability without introducing unnecessary risk to their users.
