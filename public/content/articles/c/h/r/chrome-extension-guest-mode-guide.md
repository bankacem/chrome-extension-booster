---
seo_title: "Chrome Extensions in Guest Mode Explained"
id: "a1b2c3d4-trbl-0007"
title: "Chrome Extensions in Guest Mode: What Works and What Does Not"
slug: "chrome-extension-guest-mode-guide"
excerpt: "Chrome Guest Mode restricts most extensions by design to protect guest users. Understanding exactly which extensions run and why can help developers and power users work within these constraints."
featured_image: /content/images/chrome-extension-guest-mode-guide/featured.webp
category: "Productivity & Tools"
tags:
  - chrome guest mode
  - chrome extensions
  - browser privacy
  - incognito mode
  - extension permissions
  - chrome profiles
keywords:
  - chrome extensions guest mode
  - do chrome extensions work in guest mode
  - allow extensions in guest mode chrome
  - guest mode browser extensions
  - chrome guest session extensions
meta_description: "Discover which Chrome extensions work in Guest Mode, why most are disabled, and how to configure exceptions for trusted extensions."
status: draft
published_at: "2026-09-21T11:00:00Z"
scheduled_at: "2026-09-21T11:00:00Z"
author: "James Mitchell"
author_image: /content/images/authors/james-mitchell.png
read_time: 12
created_at: "2026-08-25T12:00:00+01:00"
updated_at: "2026-08-25T12:00:00+01:00"
description: "Chrome Guest Mode restricts most extensions by design to protect guest users. Understanding exactly which extensions run and why can help developers and power users work within these constraints."
---

![Chrome extensions in guest mode overview](/content/images/chrome-extension-guest-mode-guide/chrome-extension-guest-mode-guide-overview.webp "Chrome Extensions in Guest Mode")

Chrome Guest Mode serves a specific and important purpose: it lets someone use your browser without accessing your profile, bookmarks, history, saved passwords, or any other personal data. When a guest session ends, all browsing data from that session is deleted automatically. This temporary isolation makes Guest Mode fundamentally different from simply creating a new profile or opening an Incognito window, and the way Chrome handles extensions in this mode reflects that core design philosophy. Understanding the interaction between Guest Mode and extensions is essential for both users who rely on extensions for productivity and developers building extensions that need to function in shared computing environments.

By default, Chrome disables all extensions when a user opens a Guest window. This is not a bug but an intentional security decision. Extensions have deep access to browsing data, can modify web page content, intercept network requests, and interact with external servers. Allowing an unrestricted extension ecosystem in a guest session would undermine the privacy guarantees that Guest Mode is designed to provide. A guest user should not be subjected to the data collection practices, tracking scripts, or behavioral modifications of the host user's extensions, and the host user should not risk having their extension configurations exposed to or tampered with by a guest.

## How Guest Mode Differs from Incognito Mode

Incognito Mode and Guest Mode are frequently confused, but they handle extensions quite differently. In Incognito Mode, Chrome gives the user a choice: each installed extension can be individually allowed or blocked from running in incognito tabs. This toggle is available in the extension management page at `chrome://extensions` by clicking the "Details" button on any extension and checking or unchecking "Allow in Incognito." When allowed, the extension runs with full access to incognito browsing, though its storage is isolated from the regular browsing session to prevent data leakage between modes.

Guest Mode, by contrast, does not offer per-extension toggles. The default state is that no extensions run at all, and enabling an extension requires the host user to explicitly opt in through the Guest Mode settings before the guest session begins. Once a guest session is active, the guest user cannot install, enable, or configure extensions. Only the host profile can pre-authorize which extensions are available in guest sessions. This asymmetry is deliberate: the person who owns the browser should control what software runs on it, even when someone else is borrowing it.

Another key difference lies in data persistence. Incognito Mode extensions have access to a separate storage area that persists for the duration of the incognito window but is wiped when the last incognito tab closes. Guest Mode extensions share a similar ephemeral storage model, but the entire guest profile, including extension data, is destroyed when the guest session ends. This means that any settings a guest user might configure within an allowed extension will not persist between guest sessions. For extension developers, this means that relying on long-term storage in Guest Mode is futile, and any extension designed to function in this context must work correctly from a fresh state each time.

### Permission Inheritance in Guest Sessions

When an extension is allowed to run in Guest Mode, it retains all the permissions it holds in the host profile. This includes host permissions, API permissions declared in the manifest, and any optional permissions the user has previously granted. If the host has granted an extension access to `https://*.google.com/*` and the `tabs` API, the extension will have those same capabilities in Guest Mode. This permission inheritance is a design trade-off: Chrome assumes that the host user has already vetted the extension's permissions for their own profile, so the same trust level applies in the guest session.

This inheritance model has practical implications for shared computers in libraries, offices, and family settings. If a system administrator or the computer owner allows a password manager extension like Bitwarden or Dashlane in Guest Mode, the guest user gains access to that extension's full functionality within the guest session. However, the extension's vault data is tied to the host profile's storage, which means the guest would need to authenticate separately within the extension (e.g., by logging into their own Bitwarden account) to access their own credentials. The extension itself runs, but it does not automatically share the host user's stored data.

## Which Extensions Can Run in Guest Mode

Chrome provides a dedicated settings interface for controlling Guest Mode extension access. To reach it, open `chrome://settings/guestMode` or navigate through the main settings menu to Privacy and Security, then Guest Mode. The interface displays a list of all extensions installed in the host profile with individual toggles to allow or deny each one in guest sessions. Changes to these settings take effect immediately for any new guest windows but do not affect currently open guest sessions.

Not all extensions are equally suited for Guest Mode. Extensions that provide core browser utility, such as ad blockers, password managers, and accessibility tools, are the most common candidates for guest access. Privacy-focused extensions like uBlock Origin, Privacy Badger, and HTTPS Everywhere are frequently enabled in guest sessions because they protect the guest user from trackers and malicious content without accessing the host user's personal data. Accessibility extensions such as Read Aloud or screen reader helpers are also strong candidates, as guests with visual impairments need these tools regardless of whose computer they are using.

Extensions that interact heavily with personal data are generally poor candidates for Guest Mode. Social media managers like Buffer or Hootsuite, email tracking tools like Boomerang or Mailtrack, and shopping assistants like Honey or Rakuten depend on authenticated sessions and personal preferences that make little sense in a temporary guest context. Allowing these extensions in Guest Mode would not leak the host user's data, but it would add unnecessary complexity and potential confusion for the guest user.

### Enterprise and Managed Guest Mode

In enterprise environments, Guest Mode extension policies are typically managed through the Chrome Browser Cloud Management system or group policy objects. Administrators can use the `ExtensionAllowInIncognito` policy to control which extensions run in incognito, and a similar set of policies governs Guest Mode behavior on managed devices. The `ExtensionInstallBlocklist` and `ExtensionInstallForcelist` policies allow IT departments to precisely control which extensions are available across all user profiles, including guest sessions.

Chrome OS devices used in schools and libraries often operate in a managed Guest Mode variant called "Public Session" mode. In this configuration, the device boots directly into a restricted session where only administrator-approved extensions are available. This is distinct from standard Chrome Guest Mode because the device itself is locked to the managed environment. Schools using Google Workspace for Education can deploy specific extensions like Read&Write by Texthelp or Kami for classroom use, ensuring that students have access to necessary tools regardless of which specific Chromebook they log into.

## Enabling Extensions for Guest Mode Step by Step

The process for allowing an extension in Guest Mode is straightforward but requires the host user to have administrative access to the browser. Open Chrome and navigate to `chrome://extensions` to see all installed extensions. From there, go to `chrome://settings/guestMode` where you will find a list of your extensions with toggle switches. Alternatively, you can access this by clicking the three-dot menu, selecting Settings, then Privacy and Security, and finding the Guest Mode section.

![Configuring guest mode extensions](/content/images/chrome-extension-guest-mode-guide/chrome-extension-guest-mode-guide-details.webp "Configuring Guest Mode Extensions")

Toggle on the extensions you want available and close the settings tab. When you next open a Guest window from the profile menu in the top-right corner of Chrome, the enabled extensions will appear in the guest session's toolbar. The guest user will see the extension icons and can interact with them, but they cannot install new extensions, modify extension settings at the system level, or access the host user's extension data stored in the regular profile. Each guest session starts with a clean slate for extension state.

It is worth noting that themes do not carry over into Guest Mode. While themes are technically a type of extension, Chrome explicitly prevents them from affecting the guest browsing experience. The guest always sees the default Chrome theme regardless of what theme the host profile uses. This is a deliberate choice to prevent the host's aesthetic preferences from influencing the guest's experience and to avoid any potential for theme-based fingerprinting.

## Limitations That Developers Should Know

Extension developers need to account for Guest Mode behavior in their testing and design processes. The most critical limitation is the ephemeral nature of storage. Extensions using `chrome.storage.local`, `chrome.storage.sync`, or IndexedDB will find that any data written during a guest session is permanently deleted when the session ends. If your extension relies on persistent configuration, user preferences, or cached data, it must be prepared to function correctly with a completely empty storage state every time it runs in Guest Mode.

The `chrome.storage.sync` API presents a particular challenge. In a regular profile, sync storage connects to the user's Google account and persists across devices. In Guest Mode, there is no signed-in Google account associated with the guest profile, so `chrome.storage.sync` behaves like `chrome.storage.local` but with even less reliability. Developers should treat Guest Mode as a storage-hostile environment and design their extensions to either work without persistent data or gracefully prompt the guest user to reconfigure settings at the start of each session.

Authentication flows also behave differently in Guest Mode. If your extension uses `chrome.identity.getAuthToken` to authenticate with a Google account, this will fail in Guest Mode because there is no primary Google account signed into the browser. Extensions like Google Translate or Google Docs Offline that depend on Google authentication will either fall back to limited functionality or display an error message asking the user to sign in. OAuth-based authentication through external identity providers may work if the extension opens a standard web authentication flow, but the authenticated session will not persist beyond the guest session.

### Content Script Behavior in Guest Mode

Content scripts injected by allowed extensions function normally in Guest Mode, with the same matching patterns and run timing as in the host profile. However, developers should be aware that the guest user may be visiting different websites than the host typically visits, and content scripts designed for specific web applications may encounter unexpected DOM structures or fail silently on pages they were not designed for. Thorough error handling in content scripts is especially important for extensions that may run in Guest Mode, as the guest user has limited ability to debug or troubleshoot extension issues.

Service workers, which replaced background pages in Manifest V3, also function normally in Guest Mode with the same lifecycle rules. They start when needed and terminate after a period of inactivity. However, any state maintained in service worker memory (as opposed to persistent storage) will be lost when the service worker terminates, just as it would in a regular profile. The difference in Guest Mode is that there is no persistent storage to fall back on, so service worker state loss is more consequential. Extensions that cache data in service worker variables during a guest session should implement robust fallback logic to handle the case where the cached data is no longer available after a service worker restart.

## Comparison Table: Extension Behavior Across Modes

| Feature | Regular Profile | Incognito Mode | Guest Mode |
|---|---|---|---|
| Extensions enabled by default | Yes | Per-extension toggle | No |
| User can toggle extensions | Yes | Yes | No (host pre-configures) |
| Storage persists | Yes | Until session ends | Until session ends |
| Can install new extensions | Yes | No | No |
| Theme applies | Yes | Yes | No (default theme) |
| Sync storage available | Yes | Limited | No authenticated account |
| Enterprise policy control | Yes | Yes | Yes |

## Frequently Asked Questions

### Can a guest user install their own extensions?

No. Guest users cannot access the Chrome Web Store to install new extensions, and they cannot enable or disable extensions that the host has not pre-authorized. The entire extension management interface is locked down in Guest Mode. This restriction ensures that the host user's browser environment is not modified by guests, whether intentionally or through malicious extensions.

### Will the guest user see my saved passwords or browsing history?

No. Guest Mode creates a completely separate temporary profile that has no access to the host profile's data. Even if you allow a password manager extension in Guest Mode, the guest user would need to log into their own account within that extension to access their credentials. Your saved passwords, bookmarks, history, and cookies remain inaccessible throughout the guest session and are not exposed even to allowed extensions running in the guest context.

### Can I allow all my extensions in Guest Mode at once?

Chrome does not provide a single toggle to allow all extensions in Guest Mode. You must individually toggle each extension through the Guest Mode settings page. This granular approach is by design, as it forces the host user to make deliberate decisions about which extensions are appropriate for guest access rather than accidentally exposing all installed extensions, including those that may contain sensitive functionality or data access.

### Do extensions update during a guest session?

Yes, Chrome's automatic extension update mechanism operates normally in Guest Mode. If an update is available for an allowed extension, Chrome will download and apply it. This means the guest user might briefly see a different version of an extension than what the host user configured. Updates are applied to the extension itself in the host profile, so the host user benefits from the update as well. However, if an update introduces a change that breaks Guest Mode compatibility, the guest session will be affected immediately without recourse.

### Is Guest Mode the same as a separate Chrome profile?

No. A separate Chrome profile is a persistent identity with its own bookmarks, extensions, passwords, and browsing history that survives across browser restarts. Guest Mode is explicitly ephemeral, designed for temporary use, and deletes all data when the session ends. While you can install extensions in a separate profile and they will persist, extensions in Guest Mode must be pre-authorized from the host profile and only run during the guest session.

### How does Guest Mode affect extension performance?

Extensions running in Guest Mode perform identically to how they perform in the host profile, as they share the same browser engine and execution environment. There is no performance penalty or sandboxing overhead specific to Guest Mode. The only performance consideration is that fewer extensions are typically active in Guest Mode (since most are disabled by default), which can actually result in faster browsing and lower memory usage compared to the host profile with its full complement of installed extensions.

Chrome Guest Mode's approach to extensions reflects a principled balance between utility and privacy. By defaulting to a clean, extension-free environment and requiring explicit opt-in from the host user, Chrome ensures that guest browsing sessions remain private, controlled, and predictable for both parties involved.