---
id: "3d5a8a83-552d-46ab-9cfb-939651666301"
title: "How to Pin a Chrome Extension to the Toolbar and Find Hidden Icons"
slug: pin-chrome-extension-to-toolbar-guide
status: draft
excerpt: "Installed an extension but don’t see its button? Learn the difference between installed, enabled, pinned, and site access states in Chrome, and follow clear steps to show or hide icons on your toolbar."
meta_description: "Learn how to pin, unpin, and find hidden Chrome extension icons. Understand installed vs enabled vs pinned vs site-access states, with step-by-step guidance and troubleshooting."
featured_image: /og-image.png
category: "Chrome Extensions"
tags:
  - "Chrome"
  - "Extensions"
  - "Toolbar"
  - "Productivity"
  - "How-to"
keywords:
  - "pin chrome extension to toolbar"
  - "show chrome extension button"
  - "find hidden chrome icons"
  - "unpin chrome extension"
  - "chrome extensions site access"
author: "Miccart Phen"
published_at: 2026-08-23
read_time: 8
---
If you’ve installed a Chrome extension and can’t see its button, you’re likely running into a visibility issue rather than an installation problem. Chrome separates a few concepts—installed, enabled, pinned, and allowed on site—that determine whether an icon appears next to the address bar and when it’s active. This guide focuses on how to show (pin), hide (unpin), and locate extension buttons in the toolbar, along with practical ways to manage site access so the button appears when you need it.

## What “pinned” really means (and how it differs from installed or enabled)
According to Chrome Help, extensions can be installed and enabled but still not appear beside the address bar unless you pin them via the Extensions menu. Pinned means the button is visible on the toolbar. Unpinned means the button lives inside the Extensions menu (the jigsaw-puzzle icon to the right of the address bar) and won’t take up space on the toolbar.

There are a few related states that matter for visibility and behavior:
- Installed: The extension has been added to Chrome.
- Enabled (turned on): The extension can run. If it’s turned off, you won’t see an active button and features won’t work until you enable it again. You can manage this in Chrome’s extensions page.
- Pinned: The button shows on the toolbar because you chose to pin it from the Extensions menu.
- Site access: Chrome lets you control whether an extension can “read and change site data” on all sites, specific sites, or only when you click it. If access is restricted, the icon may appear inactive until you click it or visit allowed sites. Google’s help content notes these site-access options and how to change them.

Important: Google’s documentation also notes that some extensions do not provide a toolbar button at all. In those cases, there is nothing to pin. Features may appear in context menus or run in the background instead.

![How to Pin a Chrome Extension to the Toolbar and Find Hidden Icons workflow illustration](/content/images/pin-chrome-extension-to-toolbar-guide/pin-chrome-extension-to-toolbar-guide-workflow.webp)
*Screenshot: Editorial illustration of the practical pin chrome extension to toolbar workflow described in this guide; it is not a product screenshot.*

## Pin or unpin an extension in seconds
### Quick steps to show a button on the toolbar
1) Open Chrome on desktop and go to any page.
2) Click the Extensions button (puzzle-piece icon) to the right of the address bar.
3) In the list, find the extension you want to show.
4) Click the Pin icon next to it. The extension’s button appears on the toolbar.
5) To hide it again, click the Pin icon once more to unpin. The button moves back into the Extensions menu.

### If you don’t see your extension in the list
- Confirm it’s installed and enabled: Open the main menu (three dots) > Extensions > Manage extensions (or type chrome://extensions in the address bar). Make sure the extension appears and is toggled on. Google’s help states you can turn an extension on or off from this page.
- If it’s missing entirely: It may have been removed. You can reinstall it from the Chrome Web Store. If you need to brush up on the storefront basics, see our step-by-step overview in the descriptive guide, "How to use the Chrome Web Store effectively," available here: [Chrome Web Store guide for finding and installing extensions](/blog/chrome-web-store-guide).

## Find hidden icons and use the Extensions menu effectively
The Extensions menu acts as an overflow area for all installed extensions. A blue pin means “show on toolbar,” and an empty pin means “keep in this menu.” If your toolbar looks clean but you’re missing a button, the Extensions menu is the first place to check.

A few nuances based on Chrome Help:
- Some extensions don’t offer a toolbar button. If you can’t find it in the Extensions menu and the help page for that extension doesn’t mention a button, pinning won’t apply.
- Site access can affect how an icon behaves. When an extension is set to work “on click,” it may not appear active until you press its button. You can change this behavior per extension from the Extensions menu’s more-actions controls.

## Control site access so the icon appears when you need it
Per Google’s guidance, you can decide when an extension can read and change data on the sites you visit. This can influence when features activate and how the icon appears.

To adjust site access for a specific extension:
1) Click the Extensions button (puzzle-piece icon).
2) Next to your extension, select the More actions button (often shown as three dots) or open the extension’s details.
3) Find the setting labeled something like “This can read and change site data.”
4) Choose one of the following:
   - On click: The extension runs only when you click its button.
   - On specific sites: You pick which sites it can access.
   - On all sites: It can access any site you visit.

These are Chrome’s own options and are described in Google’s help articles. If you need the icon visible but with minimal ongoing access, “On click” may be appropriate. If you use the extension on just a handful of domains, “On specific sites” can reduce distractions and limit access elsewhere.

## Troubleshooting: When the button still doesn’t show
Try these checks before assuming there’s a larger issue:
- It doesn’t have a button: Google’s help notes that some extensions don’t expose a toolbar button. If the developer’s page or documentation doesn’t mention a button, pinning won’t be possible.
- It’s unpinned: Open the Extensions menu and click the pin icon next to the extension.
- It’s turned off: Visit Manage extensions (chrome://extensions) and toggle the extension on. According to Chrome Help, extensions can be turned on or off without uninstalling them.
- Site access limits: If the icon looks inactive or the extension doesn’t appear to respond, open its more-actions menu and review “This can read and change site data.” Choose “On click” or add the current site under “On specific sites.”
- Reinstall if removed: If the extension doesn’t show up at all in Manage extensions, it may have been removed. Reinstalling from the Chrome Web Store often resolves missing files or entries.

If your work touches accessibility or QA, task-focused extensions can be particularly sensitive to page context and permissions. For a curated look at tools you might pin during audits, see our overview: [Top Chrome extensions that assist with web accessibility checks](/blog/best-chrome-extensions-for-web-accessibility-testing).

## Keep the toolbar tidy: Unpin instead of uninstall
If your toolbar is crowded, you don’t need to remove extensions to reduce clutter. Unpinning hides the button while keeping the extension installed and ready in the Extensions menu. This way, features remain available when needed, and you can re-pin the button in a click.

Steps to unpin:
1) Click the Extensions button (puzzle-piece icon).
2) Find the extension in the list.
3) Click the Pin icon to toggle it off. The button disappears from the toolbar but the extension remains installed and enabled.

## Privacy and security notes about site access
Google’s help materials emphasize that site access controls determine what data an extension can read or change. If you choose “On all sites,” the extension may have access to content on every page you visit; if you choose “On click,” it runs only when you activate it. For least-privilege operation, pick the narrowest option that still supports your workflow. You can revisit these settings any time from the Extensions menu or the extension’s details page.

## Quick recap you can act on now
- To show a button: Extensions button > Pin next to the extension.
- To hide it: Extensions button > Unpin.
- To verify status: chrome://extensions to confirm it’s installed and turned on.
- To control where it works: Adjust “This can read and change site data” to On click, On specific sites, or On all sites.
- To handle exceptions: Remember that some extensions don’t have a toolbar button.

## FAQ
- Why isn’t my extension showing on the toolbar after I install it?
  It’s probably unpinned. Open the Extensions menu and click the pin next to the extension. Also check Manage extensions to confirm it’s turned on.

- Where is the Extensions button in Chrome?
  It’s the puzzle-piece icon to the right of the address bar. Click it to pin or unpin extensions and to adjust site access.

- Does pinning turn an extension on?
  Pinning only shows the button. Whether an extension is enabled is controlled in Manage extensions. Site access is a separate setting.

- How do I show an extension only on certain sites?
  From the Extensions menu, open the extension’s more-actions/settings and choose “This can read and change site data” > On specific sites, then add the sites you want.

- Can an extension exist without a toolbar button?
  Yes. Google’s help notes that some extensions don’t include a button, so there is nothing to pin.

## References
- [Install and manage extensions - Chrome Web Store Help](https://support.google.com/chrome_webstore/answer/2664769?hl=en)
- [Manage your extensions - Google Chrome Help](https://support.google.com/chrome/answer/2664769?hl=en)
