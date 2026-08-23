---
id: "c31ee634-980b-4818-a9ae-b45652d086c4"
title: "Chrome Extension Not Working on One Website: A Diagnostic Guide"
slug: chrome-extension-not-working-on-website-guide
status: draft
excerpt: "If your Chrome extension works everywhere except one site, use this focused guide to verify site access, host permissions, match patterns, frames, and page restrictions—without risky workarounds."
meta_description: "Extension fails on one site? Diagnose site access, match patterns, frames, and page restrictions with a careful, source-backed checklist for Chrome extensions."
featured_image: /og-image.png
category: "Chrome Extensions"
tags:
  - "Chrome extensions"
  - "Troubleshooting"
  - "Content scripts"
  - "Permissions"
  - "Match patterns"
keywords:
  - "chrome extension not working on website"
  - "site access"
  - "content script not running"
  - "match patterns"
  - "activeTab"
  - "all_frames"
  - "host permissions"
author: "Miccart Phen"
published_at: 2026-08-23
read_time: 7
---
When an extension works on most sites but fails on one, the cause is usually scope: where it’s allowed to run and how it injects code. This guide targets site-specific issues—site access settings, host permissions, match patterns, frames/iframes, and pages where Chrome blocks extensions—so you can fix the problem without unsafe workarounds.

## Quick decision guide: symptoms to first checks
- Icon is grey or says it can’t read/change this site’s data → Site access restricted in the UI → Open chrome://extensions → Details → Site access and allow the site.
- Works on https://www.example.com but not https://sub.example.com → Pattern too narrow → Use a wildcard such as `https://*.example.com/*` (or cover both http/https as needed).
- Features fail inside an embedded widget/frame → Script not running in frames or missing permission for the frame’s origin → Set `all_frames: true` and include the frame’s origin in host permissions.
- Never works on the Chrome Web Store or chrome:// pages → Extensions are blocked there → This is expected; test elsewhere.
- Runs only after clicking the toolbar button → Using temporary `activeTab` instead of persistent host permissions → Declare explicit `host_permissions` for that site.

![Chrome Extension Not Working on One Website: A Diagnostic Guide workflow illustration](/content/images/chrome-extension-not-working-on-website-guide/chrome-extension-not-working-on-website-guide-workflow.webp)
*Screenshot: Editorial illustration of the practical chrome extension not working on website workflow described in this guide; it is not a product screenshot.*

## 1) Confirm the page is eligible for injection
Some pages are off-limits. Chrome prevents content scripts from running on internal browser pages (chrome:// URLs) and certain protected domains including the Chrome Web Store. If your “one site” is actually one of these, the extension won’t run there by design. Content scripts also run in isolated worlds, separate from the page’s JavaScript context.

Practical checks:
- Try another page on the same domain to rule out redirects to a blocked origin or different scheme.
- Verify the exact URL scheme and host. If it’s a PDF in the built‑in viewer or an internal page, content scripts generally won’t run.

If the site is eligible, proceed to site access and permissions.

## 2) Verify Site access in Chrome’s extension settings
Even with correct permissions in the manifest, users can restrict site access in the UI. If access is set to “On click” or limited to specific sites, the extension may appear disabled until you grant access.

What to do:
- Open chrome://extensions (type it in the address bar; if you want faster navigation, see these [Chrome Omnibox power tips](/blog/chrome-omnibox-guide)).
- Click Details on your extension.
- Under Site access, choose “On all sites,” or add the specific domain. Google’s support article covers managing site access in this panel.

If enabling site access instantly fixes the problem, you’ve found a user-level restriction, not a manifest or code defect.

## 3) Check host permissions and match patterns (manifest and code)
A common cause is a mismatch between the page URL and the extension’s declared scope. Chrome uses match patterns to decide if a content script or host permission applies, consisting of a scheme (e.g., https), a host (optionally with wildcards), and a path.

Guidelines:
- Cover the right scheme(s). If the site might use both http and https, either specify both or use `*://` when appropriate.
- Include subdomains if needed. `https://*.example.com/*` matches `www.example.com`, `app.example.com`, and `example.com`. `https://example.com/*` does not match `www.example.com`.
- Align `content_scripts.matches` and `host_permissions`. If you inject via the manifest’s `content_scripts`, the match pattern must include the site. If you inject programmatically with Manifest V3 `chrome.scripting.executeScript`, ensure `host_permissions` (or a temporary `activeTab` grant) covers the page at injection time.

Where to look:
- In Manifest V3, check both `host_permissions` and `content_scripts.matches`.
- If you rely on `activeTab`, remember it is temporary and requires a user gesture on the tab before access is granted. If you expect automatic behavior on load, declare explicit host permissions for that origin.

## 4) Frames and iframes: not just the top page
Many “it works everywhere except this site” bugs come from frames. A page that looks like one document may host crucial content in an iframe—sometimes on another origin. By default, content scripts target the top frame only unless configured otherwise.

Key checks:
- all_frames: If target elements live inside same‑origin iframes, set `all_frames: true` for the content script so it runs in each frame. Programmatic injection can also target all frames.
- Cross-origin frames: If the iframe’s `src` points to a different domain (e.g., a third‑party checkout or embedded comments), you must include that origin in host permissions to run within that frame. Without the correct host permission, injection into that frame won’t occur.
- Run timing and SPAs: Single‑page apps change views without full reloads. Use an appropriate `run_at` (e.g., `document_idle`) and add logic that re‑runs when the URL or DOM changes so your content script can detect elements that appear later.

## 5) Inspect the page to confirm injection and errors
Use DevTools to verify whether the content script is present:
- Open the site, right‑click, Inspect.
- In Sources, check the “Content scripts” section. If your script is missing, a match pattern or permission did not apply.
- Check the Console for content script errors or messages indicating blocked access.
- For programmatic injection, log around the injection call and confirm the success callback on the problem site.

If your extension uses a service worker (Manifest V3), open chrome://extensions → Details → Service worker → Inspect views to watch logs while reproducing the issue.

## 6) Minimal, safe test changes
Maintainers can try small, reversible adjustments to isolate scope issues safely:
- Temporarily add a narrow host permission for the exact problem URL (e.g., `https://sub.example.com/*`), reload, and retest. If it works, refine permanent patterns accordingly.
- Add `all_frames: true` for a script and retest on a page that relies on iframes.
- If you use `activeTab`, click the extension on the target site first. If that makes it work, migrate to explicit host permissions for that origin.

## Limits and caveats to expect
- Protected pages: Content scripts do not run on chrome:// pages and certain Google‑owned properties such as the Chrome Web Store. This is not overrideable.
- Isolated worlds: Content scripts run in an isolated JavaScript environment. They can access the DOM but do not share variables with page scripts. For page‑script communication, use DOM events or postMessage.
- Cross-origin iframes: You cannot run code in a frame unless your extension has host permission for that frame’s origin. Plan for sites that embed third‑party widgets.
- User-controlled site access: Even correct manifest permissions can be limited by the user in chrome://extensions → Site access. Always confirm this setting when diagnosing a single‑site failure.

While testing media behavior, our walkthrough on how to [enable Picture-in-Picture in Chrome](/blog/picture-in-picture-chrome-guide) can help illustrate how video playback varies by site context.

## Troubleshooting checklist for one‑site failures
- Is the page a protected or internal URL? If yes, injection is blocked by design.
- Does Site access in chrome://extensions allow your extension on this domain?
- Do your match patterns truly cover scheme, host (including subdomains), and path?
- If features live in iframes, did you set `all_frames: true` and include host permissions for the frame’s origin?
- If it only works after clicking, are you relying on `activeTab` instead of persistent `host_permissions`?
- Did you confirm in DevTools that the content script is injected and error‑free on the target page?

## FAQ
- Why does my extension work on most pages but not on one subdomain? Your match pattern likely omits that subdomain. Use a wildcard like `*://*.example.com/*` when appropriate, or add an explicit permission for the subdomain.
- Can I force my extension to run on chrome:// or the Chrome Web Store? No. Chrome blocks extensions from injecting scripts on those protected pages.
- My feature fails inside an embedded widget—what now? The widget may be inside an iframe. Enable `all_frames` and add host permission for the frame’s origin so the script can run there.
- Do I need `activeTab` if I already have host permissions? Usually no. `activeTab` is a temporary, user‑gesture‑based grant; persistent host permissions are better for automatic operation on specific sites.

## References
- [Content scripts: how they run and what they can access](https://developer.chrome.com/docs/extensions/develop/concepts/content-scripts)
- [Match patterns for host permissions and content scripts](https://developer.chrome.com/docs/extensions/develop/concepts/match-patterns)
- [Manage extension site access in Chrome](https://support.google.com/chrome/answer/2664769?hl=en)
