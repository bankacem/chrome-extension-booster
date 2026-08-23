---
id: "7ffc1b20-12a1-4e8d-8d79-06d5550331e0"
title: "Chrome Extension Camera and Microphone Access: Review It Before Use"
slug: chrome-extension-camera-microphone-permissions-guide
status: draft
excerpt: "A practical guide to see who can use your camera and mic in Chrome, distinguish site vs. extension control, and safely revoke access when meetings fail."
meta_description: "Learn how Chrome manages camera and microphone access for websites and extensions, how to review who has access, and how to revoke it when needed."
featured_image: /og-image.png
category: "Chrome Extensions"
tags:
  - "Chrome"
  - "extensions"
  - "privacy"
  - "permissions"
  - "camera"
  - "microphone"
  - "Google Meet"
keywords:
  - "chrome extension camera microphone permissions"
  - "revoke camera access chrome"
  - "manage microphone access chrome"
  - "site vs extension permissions"
  - "chrome site settings camera microphone"
author: "Miccart Phen"
published_at: 2026-08-23
read_time: 7
---
If your camera or microphone stops working—or you’re unsure what has access—use this guide to review and revoke permissions safely. Chrome’s control has two main layers you can change yourself (site settings and extensions), plus the operating system, with meeting-specific fixes at the end.

## Who actually controls your camera and mic in Chrome?

There are three layers:

- Operating system: Windows and macOS can block apps from the camera or microphone entirely. If Chrome is blocked at the OS level, nothing in Chrome will work until you change that.
- Chrome site settings (primary gate): Chrome mediates camera and microphone access per site. The first time a site requests access, you usually see a prompt. You can allow, block, or later edit that decision in Settings. Google’s help articles outline exactly where these controls live.
- Extensions: Extensions don’t bypass site-level camera/mic controls. Some request capture capabilities in their manifest (for example, APIs to capture a tab or the desktop). These are separate from site camera/microphone permissions and are declared so you can review them before installing or enabling an extension.

Why it matters: if Meet or Zoom on the web can’t see your camera, the fix is almost always in site settings. If a browser add-on overlays controls or records meetings, review the extension itself and any camera/mic permission tied to its chrome-extension:// origin.

![Chrome Extension Camera and Microphone Access: Review It Before Use workflow illustration](/content/images/chrome-extension-camera-microphone-permissions-guide/chrome-extension-camera-microphone-permissions-guide-workflow.webp)
*Screenshot: Editorial illustration of the practical chrome extension camera microphone permissions workflow described in this guide; it is not a product screenshot.*

## How to review and revoke website access (fast checks)

Use these when a website (meeting, recording, or chat) is trying to use your devices.

1) From the address bar while on the site
- Open the site that needs your camera or mic.
- Click the site information icon (lock) in the address bar.
- Choose Site settings. Under Camera and Microphone, set each to Allow, Block, or Ask. You may see options that apply only for the current session or permanently.
- Reload the page and test.

2) From Chrome Settings
- Go to Settings > Privacy and security > Site settings > Camera (and then Microphone).
- Ensure the global preference is set to Ask before accessing (or your preferred default).
- In the site list, find the site that isn’t working. Change to Allow, or remove/reset the decision and reload so Chrome asks again.

According to Google’s help documentation, these are the supported paths to manage site-level media permissions and to review which sites you’ve previously allowed or blocked.

Tip: If the site doesn’t appear, trigger its in-page camera/mic button again after setting the global preference to Ask.

## How to review and revoke extension access (what actually applies)

There isn’t a universal camera/microphone toggle on chrome://extensions. Review extensions in two places:

1) Chrome’s camera/mic settings for extension origins
- Go to Settings > Privacy and security > Site settings > Camera (and Microphone).
- In Allowed/Blocked, look for entries starting with chrome-extension:// followed by an ID; these represent specific extensions.
- Change to Block or remove the exception so Chrome will ask next time. Blocking here stops the extension from starting your camera or microphone through the browser’s gate.

2) The extension’s details and declared permissions
- Visit chrome://extensions and open Details for the extension.
- Review Permissions and Site access. Developers must declare permissions in the manifest; if an extension needs capture (such as tab or desktop), that appears here. These declarations signal capability and are not the same as site Camera/Microphone permissions.
- If you don’t recognize or trust an extension, toggle it off or select Remove. Removing immediately ends its ability to request device access in Chrome.

Caution: Extensions initiate capture in different ways. Many use the same media gate as websites, so blocking the chrome-extension:// entry is effective. Others capture a tab or the desktop, which triggers a different prompt. If a prompt mentions your screen or a tab (not your camera/microphone), you’re dealing with screen capture rather than device input.

## Quick decision guide

Use these prompts to decide where to act first:

- Symptom: A specific website can’t see your camera or mic.
  - Change here first: Site settings for that website.
  - What to try: Set Camera/Microphone to Allow or reset to Ask, then reload.
  - Why it helps: Most web meetings depend on the site’s permission gate.

- Symptom: An extension overlays meeting controls and starts the camera.
  - Change here first: Camera/Microphone settings for the chrome-extension:// entry, then extension Details.
  - What to try: Block the extension’s camera/mic entry or disable/remove the extension.
  - Why it helps: Extensions use Chrome’s media gate or capture APIs; blocking or disabling stops it.

- Symptom: You never see any permission prompt for mic/cam in Chrome.
  - Change here first: OS privacy settings.
  - What to try: Allow Chrome to use Camera/Microphone in the OS, then retry.
  - Why it helps: If the OS blocks Chrome, no in-browser change will work.

- Symptom: Capture prompt mentions “screen” or “tab,” not devices.
  - Change here first: Extension Details and the screen-capture prompt.
  - What to try: Review/deny tab/desktop capture, or disable the extension.
  - Why it helps: Screen capture is separate from camera/mic site permissions.

## Meeting-specific troubleshooting (Google Meet, Zoom, Teams on the web)

Try these in order:

- Pick the right device in the meeting UI: In the app’s audio/video settings, choose the intended microphone and camera. USB changes can reset selections.
- Re-test site permission: With the meeting page open, use the address-bar site menu to set Camera and Microphone to Allow, then reload.
- Close other apps using devices: Conferencing tools and virtual camera drivers may hold exclusive access. Fully quit them and refresh.
- Check OS privacy access: If Chrome is denied mic/cam at the OS level, grant it and reopen Chrome. You may need to quit Chrome to apply changes.
- Extension isolation test: Open an incognito window with extensions disabled by default, or create a fresh Chrome profile. If meetings work there, re-enable extensions one by one in your main profile to find the conflict. For add-ons you actually want, consider vetted options from our overview of the [best Chrome extensions for Google Meet](/blog/best-chrome-extensions-google-meet).

When you find a problematic add-on, remove it or keep it disabled except when needed. For broader productivity ideas that avoid over‑permissive tools, see our guide to a [power-user workflow upgrade with Chrome extensions](/blog/pro-browsing-chrome-extensions-the-ultimate-workflow-upgrade-for-power-users).

## Limitations and expectations

- Past access can’t be undone: Revoking or blocking applies going forward. If a site or extension previously captured audio/video with your consent, changing permissions doesn’t delete that past session.
- Extension naming in settings: In Camera/Microphone settings, extensions may appear by ID instead of a friendly name. Match IDs via chrome://extensions > Details.
- Screen vs. device capture: Tab/desktop capture is distinct from camera/microphone input, with different prompts and controls. Adjust the one that matches the prompt you see.
- Policy-managed environments: On work or school devices, administrators may enforce defaults. Some settings may be locked; check with IT if you can’t change a control that Chrome help pages say should be available.

## FAQ

- How do I see which sites or extensions I’ve allowed to use my mic or camera?
Open Settings > Privacy and security > Site settings > Camera (and Microphone). You’ll see sites you’ve allowed or blocked. Extension origins appear as chrome-extension:// entries.

- Do extensions need a special “microphone” permission to record audio?
Extension capabilities vary. Many rely on the same browser gate that controls site camera/microphone access. Others may capture tab or system audio via separate APIs. Check the extension’s Details and declared permissions.

- Can I allow a site just once?
Chrome typically lets you allow or block. You may also see temporary or session-based options. If in doubt, set Ask before accessing and decide per visit.

- Why does a site still fail after I allow it?
Double-check the site’s in-page device selector, close other apps using the camera/mic, and confirm the OS hasn’t blocked Chrome. If extensions interfere, test with them disabled.

## References

- [Change site permissions in Chrome](https://support.google.com/chrome/answer/2693767?hl=en)
- [Use your camera and microphone in Chrome](https://support.google.com/chrome/answer/114662?hl=en&co=GENIE.Platform%3DDesktop)
- [Chrome extensions: declare permissions](https://developer.chrome.com/docs/extensions/develop/concepts/declare-permissions)
