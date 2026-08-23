---
id: "eb0e2f42-1221-49e6-800f-5f0543178a54"
title: "Declarative Net Request in Chrome Extensions: What Users Should Know"
slug: chrome-extension-declarative-net-request-guide
status: draft
excerpt: "A practical, source-backed explainer of Chrome’s Declarative Net Request (DNR) in Manifest V3: what it can do, what it can’t, and how that affects extensions you install."
meta_description: "Understand Chrome’s Declarative Net Request in Manifest V3: how rules work, capabilities vs limits, permissions to look for, conflicts, and troubleshooting tips."
featured_image: /og-image.png
category: "Chrome Extensions"
tags:
  - "Manifest V3"
  - "declarativeNetRequest"
  - "Chrome"
  - "privacy"
  - "network filtering"
keywords:
  - "chrome extension declarative net request"
  - "Manifest V3"
  - "MV3"
  - "webRequest"
  - "network filtering"
  - "dynamic rules"
  - "static rulesets"
  - "permissions"
  - "host permissions"
  - "ad blocking"
  - "Chrome extensions"
author: "Miccart Phen"
published_at: 2026-08-23
read_time: 8
---
Chrome’s move to Manifest V3 (MV3) introduced declarativeNetRequest (DNR) as the modern way for many extensions to filter network traffic. While you may have heard “MV3 breaks blockers,” the reality is more nuanced: DNR still enables broad blocking and redirection, but through predefined rules rather than per-request code. This guide focuses on what that means for you—capabilities, limits, permissions, and what to check if an extension doesn’t behave as expected.

## Why Declarative Net Request replaced many blocking listeners
Under older versions, extensions could use the blocking form of webRequest to inspect and decide on each request in real time. MV3 shifts to a declarative approach: extensions define match conditions and actions up front, and Chrome applies those rules efficiently in the network stack. According to MV3 documentation, this design targets performance, reliability, and reduced background execution by favoring service workers and declarative patterns.

Migration guidance notes that many scenarios map cleanly to DNR, but not all. Observational use of webRequest (without blocking) still exists in MV3, yet active, per-request JavaScript decision-making is intentionally limited compared with MV2’s blocking listeners. If an extension says it “uses webRequest,” that may mean it’s observing traffic, not blocking it.

![Declarative Net Request in Chrome Extensions: What Users Should Know workflow illustration](/content/images/chrome-extension-declarative-net-request-guide/chrome-extension-declarative-net-request-guide-workflow.webp)
*Screenshot: Editorial illustration of the practical chrome extension declarative net request workflow described in this guide; it is not a product screenshot.*

## What DNR can do today
Based on the official API reference, DNR rules can:
- Block requests that match specific URL patterns or resource types
- Redirect requests (for example, to a different path or a local resource)
- Upgrade eligible requests from HTTP to HTTPS
- Allow requests that would otherwise be blocked by rules of the same extension
- Modify certain request or response headers from a limited, approved set
- Enable or disable packaged rulesets and update dynamic or session rules at runtime

These capabilities let many privacy, security, and content-filtering extensions function in MV3. Practically, an extension can still remove known trackers by network pattern, cut off certain third-party calls, or sanitize particular headers—provided those behaviors fit within DNR’s rules model.

## What DNR does not do
To set expectations, note what’s intentionally outside DNR’s scope:
- No arbitrary per-request code execution. You cannot run custom JavaScript to decide on each individual request like MV2 blocking listeners allowed.
- No response body inspection. DNR acts on request/response metadata and URLs, not full response content.
- Limited header changes. Only specific headers can be modified, and only in defined ways.
- Rule limits and constraints. DNR caps the number and complexity of rules; check the documentation for current figures.
- Not a cosmetic filter engine. Hiding page elements (e.g., ad placeholders) is a page-content task, not a network one; extensions typically use other techniques.

If a feature requires parsing full responses or dynamic per-request computation, it may need product-specific workarounds outside DNR or a different MV3 design.

## Static, dynamic, and session rules: why they matter
DNR organizes rules three ways:
- Static rulesets: Packaged with the extension and listed in its manifest; can be enabled or disabled at runtime.
- Dynamic rules: Added or removed while the extension runs, often to reflect user preferences or imported filters.
- Session rules: Like dynamic rules but scoped to the current browser session; they don’t persist across restarts.

For users, this means MV3 extensions can still offer custom filters and per-site toggles by updating dynamic or session rules. If a custom list “disappears” after restart, it may have been stored as session rules; the extension’s settings should indicate persistence.

## Permissions and what they imply about data access
When installing or reviewing an extension, check:
- Host permissions: Define which sites the rules can affect. Some extensions request access “on click” or “on specific sites,” limiting scope. You can adjust this per site from chrome://extensions or the toolbar menu.
- declarativeNetRequest permission: Indicates the extension uses DNR features. Variants may appear depending on implementation.
- Incognito access: If you browse in incognito, you must explicitly allow the extension there; otherwise, its rules won’t apply.

Grant only the site access you’re comfortable with. For broader context on privacy choices around extensions, see our [Chrome extensions for online privacy overview](/blog/chrome-extensions-for-online-privacy-2026).

## A quick decision guide for users
Use this table to map a goal to what’s realistic with DNR and what to check in an extension’s details.

| Your goal | Likely covered by DNR? | What to check before installing |
|---|---|---|
| Block known trackers or ad servers by URL | Often yes | Look for host permissions that make sense (e.g., site access controls) and mention of rules-based filtering in the description |
| Redirect specific domains/paths to alternatives | Often yes | Extension notes about redirection under MV3/DNR; minimal permissions claims |
| Enforce HTTPS upgrades | Often yes | Feature mentions around “HTTPS upgrade” or “secure requests” supported by DNR rules |
| Modify headers for privacy/security | Sometimes | Documentation should specify which headers and on which resource types; expect limits |
| Inspect or rewrite response bodies | No | If promised, verify how it’s implemented; this is outside DNR and may not be feasible under MV3 |

If your main goal is choosing a well-supported blocker rather than learning platform mechanics, see the [best Chrome ad blocker roundup](/blog/best-ad-block-chrome-extension).

## Multiple extensions and rule conflicts
Chrome evaluates DNR rules across installed extensions. Where rules overlap, outcomes are resolved by rule characteristics such as priority and action type. Because specifics can be complex and may evolve, you may see surprises when several filtering extensions run together. If a site breaks or a request behaves unexpectedly:
- Temporarily disable other filtering extensions to isolate the cause
- Check if one extension has an “allow”/“unblock” mode for the page
- Toggle per-site access in the extension UI to see which rule set is active

## Troubleshooting common surprises
If filtering seems weaker or inconsistent in MV3, try:
- Confirm site access: In Chrome’s extension controls, ensure the extension can run on the current site. If set to “on click,” rules won’t apply until you activate it.
- Check enabled rulesets: Some MV3 extensions let you enable or disable packaged lists; a disabled ruleset means no filtering from that list.
- Review custom filters: If you imported rules, verify whether they’re stored as dynamic or session rules and whether they persisted after a restart.
- Incognito behavior: Explicitly allow the extension in incognito if you want the same filtering there.
- Extension conflicts: Disable other network or privacy extensions to see if a different ruleset is taking precedence.
- Extension updates: Developers may adjust rule sources and formats over time to align with DNR constraints; update to the latest version.

If issues continue, check the developer’s support page; a feature might not be feasible under DNR or may require additional permissions you haven’t granted.

## Limitations to keep in mind
- Feature parity is not automatic. DNR covers many—but not all—network filtering cases formerly handled by blocking webRequest.
- Some advanced behaviors need product-specific design changes. Cosmetic filtering typically relies on page scripts or styles, not DNR.
- Rule and header modification limits exist and can vary by Chrome version. For up-to-date details, consult the official API documentation.
- Enterprise or policy contexts can affect which APIs are available; behavior may differ in managed environments.

## The bottom line for users
- DNR is the main MV3 mechanism for rules-based network filtering, supporting blocking, redirecting, selective allowing, limited header modifications, and HTTPS upgrades.
- It trades per-request scripting flexibility for predictability and performance—good for speed and stability, but narrower for some extension designs.
- You still have practical controls: choose site access scopes, enable/disable rulesets, and add custom rules where supported.
- When something seems off, permissions, ruleset state, and extension conflicts are the most common culprits.

## FAQ
- Does MV3 mean extensions can’t block requests anymore? No. Many blocking and redirection scenarios work via declarativeNetRequest rules. What changed is how decisions are expressed and executed.
- Can extensions still observe web traffic under MV3? Yes. Observational use of webRequest is still available. The main change is around blocking, which is expected to use DNR instead of per-request code.
- Why do some headers still leak even with a blocker? DNR can modify only specific headers and in specific ways. If an extension can’t change a particular header, that may be due to API limits.
- Will my custom filter lists persist after a restart? It depends on how the extension stores them. Dynamic rules can persist; session rules typically do not.

## References
- [declarativeNetRequest API reference](https://developer.chrome.com/docs/extensions/reference/api/declarativeNetRequest)
- [Migrate from blocking webRequest](https://developer.chrome.com/docs/extensions/develop/migrate/blocking-web-requests)
- [What is Manifest V3](https://developer.chrome.com/docs/extensions/develop/migrate/what-is-mv3)
