---
seo_title: "Disable Chrome Extensions on Specific Sites"
id: d2174f2a-2af0-423c-b308-12e470495873
title: "How to Disable Chrome Extensions on Specific Sites"
slug: how-to-disable-chrome-extensions-on-specific-sites
status: published
excerpt: "Learn how to disable Chrome extensions on specific sites using built-in site access settings, so you keep full control without uninstalling anything."
meta_description: "Learn how to disable Chrome extensions on specific sites using built-in site access settings, so you keep full control without uninstalling anything."
featured_image: /og-image.png
category: Chrome Extensions
tags:
  - "chrome extensions"
  - "site access"
  - "browser privacy"
  - "chrome permissions"
  - "extension management"
  - "chrome settings"
keywords:
  - how to disable chrome extensions on specific sites
  - chrome extension site access
  - allow extension only on certain sites
  - chrome extension per site permissions
  - runtime_blocked_hosts ExtensionSettings policy
author: Miccart Phen
published_at: 2026-08-28
read_time: 12
---
You installed an extension because it's useful — but it's also injecting itself into your bank's login page, breaking a work dashboard, or reading a page it has no business reading. The good news is you don't have to choose between keeping it and removing it. You can disable Chrome extensions on specific sites while leaving them fully active everywhere else, and the setting has been built into Chrome for years.

The reason this question is so hard to answer with a quick search is that the results are fragmented. Some pages explain the everyday dropdown in Chrome's extensions manager. Others jump straight to enterprise policy and lose everyone who isn't an IT admin. And a surprising number confuse two completely different Chrome policies: one that blocks *websites* from loading at all, and one that blocks *extensions* from running on chosen sites. Those are not the same thing, and mixing them up is how people end up locking themselves out of a domain they still need.

This page walks the whole ladder in one place, from the two-click consumer method to the policy-level blocklist, plus the part nobody covers: what to do when the dropdown is greyed out and Chrome won't let you change anything.

## Key Takeaways

- To disable Chrome extensions on specific sites, open `chrome://extensions`, click **Details** on the extension, and set **Site access** to **On click** or **On specific sites**.
- **On specific sites** is an allowlist — the extension runs only on hosts you name and nowhere else.
- There is no consumer-facing blocklist in Chrome's UI; a true per-site *blocklist* requires the `runtime_blocked_hosts` field of the **ExtensionSettings** policy.
- `URLBlocklist` blocks entire websites from loading. `runtime_blocked_hosts` blocks *extensions* on those sites. Don't substitute one for the other.
- A greyed-out Site access dropdown usually means the extension requests no host permissions, or it was force-installed by policy.
- Always hard-reload the page after changing site access — existing tabs keep the old permission state.

**On this page**

- [Per-site extension control in Chrome: what you can and can't do](#control)
- [Method 1: Restrict an extension from chrome://extensions (Site access)](#method-1)
- [Method 2: Use the toolbar puzzle-piece menu for one-off site permissions](#method-2)
- [Blocklist vs allowlist: choosing 'On specific sites' or 'On click'](#blocklist-vs-allowlist)
- [Site pattern syntax for 'On specific sites' (subdomains and wildcards)](#pattern-syntax)
- [Method 3: Advanced per-site blocking with the ExtensionSettings policy](#method-3)
- [Comparing the three methods](#comparison)
- [Site access UI vs the policy approach: pros and cons](#pros-cons)
- [Verification checklist](#verification)
- [Troubleshooting: greyed-out dropdown, extension still active, changes not applying](#troubleshooting)
- [FAQ](#faq)

<a id="control"></a>
## Per-site extension control in Chrome: what you can and can't do

Chrome's per-site model is built around *host permissions*. When an extension wants to read or change page content, it declares which hosts it needs. Since the arrival of the "extension host permission" controls, you get the final say over how broadly that declaration actually applies.

What you **can** do without any special tooling: limit an extension to a list of sites you choose, or require a click before it touches any page at all. What you **cannot** do from the standard interface: write a "run everywhere except these three domains" rule. That inverted, blocklist-shaped request is the single most common version of this question, and Chrome's UI simply has no field for it. It exists only at the policy layer.

One more limit worth knowing up front: site access governs page-level access — content scripts, reading page data, modifying what you see. It does not switch off every possible extension behaviour. An extension with a background service worker can still run, sync, or show a badge; it just loses its foothold on the page.

<a id="method-1"></a>
## Method 1: Restrict an extension from chrome://extensions (Site access)

This is the method most readers actually want.

1. Type `chrome://extensions` in the address bar and press Enter.
2. Find the extension and click **Details**.
3. Scroll to **Site access** (labelled "Allow this extension to read and change all your data on websites you visit" in some builds).
4. Choose one of the three options: **On click**, **On specific sites**, or **On all sites**.
5. If you pick **On specific sites**, click **Add a new page**, enter the site, and click **Add**. Repeat for each host.
6. Close the tab and reload any pages that were already open.

That's it. The extension now has zero page access outside the hosts you listed.

<a id="method-2"></a>
## Method 2: Use the toolbar puzzle-piece menu for one-off site permissions

When you're already on the problem page and just want it to stop, don't go to the settings page. In current Chrome versions:

1. Navigate to the site you want the extension excluded from.
2. Click the puzzle-piece **Extensions** icon to the right of the address bar.
3. Look at the extension in the list — a toggle or **Allow** control appears next to any extension currently requesting access to this site. Switching it off withdraws access for this host.
4. For the full choice, click the **three-dot menu** next to that extension.
5. Hover **This can read and change site data** to open the submenu, which offers three options: **When you click the extension**, **On [current-site.com]**, and **On all sites**. Pick **When you click the extension** to neutralise it here without touching other sites.
6. Reload the page.

Chrome occasionally relabels these controls between releases, so treat the wording as current-version guidance rather than permanent.

<a id="blocklist-vs-allowlist"></a>
## Blocklist vs allowlist: choosing 'On specific sites' or 'On click'

Both halves of this question deserve a straight answer.

**"Allow it only on a few named sites."** Use **On specific sites**. It's a true allowlist: name the hosts, and the extension is inert everywhere else. Ideal for a work-tool extension that only ever needs your CRM and your ticketing system.

**"Run it everywhere except a few sites."** The UI can't express this. Your two realistic options are **On click** — the extension does nothing until you click its icon, which is effectively a global block with a manual override — or Method 3, the policy blocklist. On click is the better fit than most guides admit: if you only reach for the extension a few times a day, it gives you the "off by default" behaviour you wanted with none of the setup.

<a id="pattern-syntax"></a>
## Site pattern syntax for 'On specific sites' (subdomains and wildcards)

This is where quiet mistakes happen. Chrome's underlying match-pattern format is `scheme://host/path`, and the **path component is required** — which is why documentation and manifests always show a trailing `/*`.

| What you enter | What it covers |
|---|---|
| `https://example.com/*` | That host over HTTPS, all paths |
| `https://*.example.com/*` | Subdomains such as `app.` and `www.` |
| `*://example.com/*` | Both HTTP and HTTPS on that host |
| `https://example.com/reports/*` | Only URLs under `/reports/` |

The **Add a new page** dialog is more forgiving than the raw format: entering an origin without a path is accepted and treated as that host. Typing the explicit `/*` yourself is still the better habit, because it's the form you'll see everywhere else and it removes any doubt about what got saved.

The pitfall to remember: `https://example.com/*` does **not** cover `https://www.example.com/*`. Chrome treats `www` as a subdomain like any other. If a site works on one and not the other, add `https://*.example.com/*`.

<a id="method-3"></a>
## Method 3: Advanced per-site blocking with the ExtensionSettings policy

This is the real per-site extension blocklist, and it's the piece most articles either skip or confuse.

**First, the disambiguation.** `URLBlocklist` and `URLAllowlist` control which *websites* Chrome will load. They have nothing to do with extensions — point them at a domain and you block the domain for the user entirely. The extension-scoped fields are `runtime_blocked_hosts` and `runtime_allowed_hosts`, and they live *inside* the `ExtensionSettings` policy.

1. Decide your scope. Settings can go under a specific extension ID, or under the `"*"` key to apply to all extensions.
2. Choose your platform: Group Policy or the registry on Windows, a configuration profile or plist on macOS, a JSON file in Chrome's managed-policy directory on Linux, or the Google Admin console for managed accounts.
3. Write the JSON. Here's the shape:

```json
{
  "abcdefghijklmnopabcdefghijklmnop": {
    "runtime_blocked_hosts": ["*://*.example.com"],
    "runtime_allowed_hosts": ["*://intranet.example.com"]
  }
}
```

4. Apply the policy, restart Chrome, then open `chrome://policy` and confirm the value appears with no conflict or error.

**The pattern format here is different**, and this trips people up: `runtime_blocked_hosts` and `runtime_allowed_hosts` use host patterns **without a path component**. `*://*.example.com` is correct; adding `/*` is not. That's the opposite of the Site access UI. Chrome's documentation also caps how many host patterns a policy can carry, so use subdomain wildcards rather than enumerating hosts one by one.

The payoff is genuine blocklist behaviour: the extension runs normally across the web, is blocked on the listed hosts, and the user can't grant it access there. `runtime_allowed_hosts` then carves exceptions back out of a broad block.

<a id="comparison"></a>
## Comparing the three methods

| Method | Difficulty | Scope | Blocklist | Allowlist | Who it's for |
|---|---|---|---|---|---|
| Site access (chrome://extensions) | Easy | One extension, current profile | No | Yes | Almost everyone |
| Puzzle-piece menu | Easiest | One extension, current site | No | Partial | Quick fixes mid-browsing |
| ExtensionSettings policy | Advanced | All profiles on the device or account | Yes | Yes | Admins, power users, shared machines |

<a id="pros-cons"></a>
## Site access UI vs the policy approach: pros and cons

**Site access UI — pros:** no admin rights, instant, reversible, per-extension. **Cons:** allowlist only, per-profile, and any user (or a curious click on a permission prompt) can undo it.

**ExtensionSettings policy — pros:** real blocklist, enforced, survives user changes, applies across profiles and devices. **Cons:** needs admin access and correct JSON, uses a different pattern format, silently does nothing if malformed, and can leave users confused about why an extension "randomly" stops working on one site.

<a id="verification"></a>
## Verification checklist

- Hard-reload the page (Ctrl+Shift+R / Cmd+Shift+R) after any change.
- Click the puzzle-piece icon: the extension should show no active access for this site.
- Its toolbar icon should look inactive or greyed rather than badged.
- The extension's visible behaviour on the page — injected buttons, overlays, highlights — should be gone.
- Open DevTools → Sources and confirm no content script from that extension is listed.

<a id="troubleshooting"></a>
## Troubleshooting: greyed-out dropdown, extension still active, changes not applying

**The Site access dropdown is greyed out or missing.** Two common causes. First, the extension declares no host permissions at all — a theme, or a tool that only uses APIs like bookmarks or downloads. There's nothing to restrict, so Chrome hides the control. Second, the extension was force-installed or its permissions were pinned by policy; `chrome://extensions` will show a "managed by your organization" note and `chrome://policy` will list the rule.

If it's policy-managed and you can't change the policy, your practical workaround is **per-profile separation**. Create a second Chrome profile (profile avatar → **Add**) and don't install the extension there — or, if the extension is pushed by a work account, sign that profile in with a different account or leave it signed out. Use the clean profile for the sites where the extension must not run. Profiles keep extensions, cookies, and site permissions separate, so this achieves the outcome without fighting the policy. Note that device-level policies applied to the OS user may still follow you across profiles; account-level ones generally won't.

**The extension is still active.** Almost always a stale tab — permissions apply at page load. Hard-reload, or close and reopen the tab. If it persists, check whether a second extension provides the same feature, and confirm you edited the extension you think you did (near-identical names are common).

**Changes aren't applying.** Check pattern precision: `example.com` vs `www.example.com`, and HTTP vs HTTPS. For policy work, remember the no-path rule and verify at `chrome://policy` that the value parsed. Conflicting policies from two sources also show up there. And if a change reverts on its own, suspect a permission prompt you accepted later — clicking "Allow" in the extensions bubble rewrites the setting you just made.

<a id="faq"></a>
## FAQ: Frequently Asked Questions

**Q: Can I disable a Chrome extension on just one website?**
A: Yes — set it to **On specific sites** and list every site *except* that one, or set it to **On click** so it never runs until you activate it. A direct "block on this one site only" rule requires the `runtime_blocked_hosts` policy.

**Q: Why is the Site access dropdown greyed out for my extension?**
A: Either the extension requests no host permissions, so there's nothing to limit, or it's force-installed and locked by an administrator policy. Check `chrome://extensions` for a "managed by your organization" label.

**Q: What's the difference between URLBlocklist and runtime_blocked_hosts?**
A: `URLBlocklist` stops Chrome from loading the listed websites for the user. `runtime_blocked_hosts`, inside `ExtensionSettings`, lets the website load normally but stops extensions from running on it — that's the one you want for per-site extension control.

**Q: Does "On click" fully disable the extension?**
A: It removes the extension's access to page content until you click its icon, which covers most of what people mean by disabling it. Background functionality unrelated to page access can still run.

**Q: Do I need to reload the page after changing site access?**
A: Yes. Already-open tabs keep the permission state they loaded with, so hard-reload with Ctrl+Shift+R (Cmd+Shift+R on macOS) before deciding whether the change worked.

**Q: Does https://example.com/\* also cover www.example.com?**
A: No. Chrome treats `www` as a subdomain, so you need `https://*.example.com/*` to cover both the bare domain and its subdomains.

**Q: Do these settings sync to my other devices?**
A: Site access choices are tied to the Chrome profile and are not reliably mirrored across devices, so re-check them on each machine. Policy-based rules apply wherever the policy is deployed.

## Conclusion

Three tools, one decision. Start at `chrome://extensions` and set **Site access** — for most people, **On specific sites** or **On click** ends the problem in under a minute. Reach for the puzzle-piece menu when you're already on the offending page. Escalate to `ExtensionSettings` with `runtime_blocked_hosts` only when you need a genuine blocklist that a user can't undo, and keep it clearly separate in your head from `URLBlocklist`.

Take two minutes now: open `chrome://extensions`, look at which extensions are still set to **On all sites**, and ask whether each one actually needs that reach. Most don't — and narrowing them is the single cheapest privacy improvement available in the browser.

Explore more [Chrome extension guides](/blog) on ExtensionTo.
