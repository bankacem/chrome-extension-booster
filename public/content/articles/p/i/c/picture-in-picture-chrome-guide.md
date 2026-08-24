---
seo_title: "Picture-in-Picture Chrome: Setup and Fixes"
id: 02930aac-a163-4200-b830-fbe78682bb4e
title: "Picture-in-Picture Chrome: How to Use It and Fix Common Problems"
slug: picture-in-picture-chrome-guide
status: published
excerpt: "Use Picture-in-Picture in Chrome without guessing: learn the built-in video workflow, the official Google extension, current limits, and a practical troubleshooting path."
meta_description: "Learn how to use Picture-in-Picture in Chrome, when to use Google's extension, and how to fix missing controls, blank windows, and compatibility issues."
featured_image: /og-image.png
category: Media & Downloads
tags:
  - picture-in-picture
  - chrome video
  - multitasking
keywords:
  - pip chrome
  - picture in picture chrome
  - chrome pip not working
  - picture in picture extension
author: Miccart Phen
published_at: 2026-08-22
updated_at: 2026-08-22
read_time: 8
faq:
  - question: "Is Picture-in-Picture built into Chrome?"
    answer: "Chrome supports Picture-in-Picture for compatible video experiences, but the visible control depends on the player and website. Start with the video menu, Chrome media controls, or the site’s own PiP button before installing an extension."
  - question: "Is the Google PiP extension an official extension?"
    answer: "The Chrome Web Store listing identifies Picture-in-Picture Extension (by Google) as developed by Google. Its listing documents the Alt + P shortcut on Windows and Linux and the Option + P shortcut on macOS, along with its current privacy disclosure."
  - question: "Why does PiP work on one website but not another?"
    answer: "Websites use different players and policies. One may expose a standard HTML video while another uses an embedded or custom player, intercepts the context menu, or restricts PiP. Compare a simple test video with the affected site before changing Chrome settings."
howto:
  name: "How to use Picture-in-Picture in Chrome"
  description: "Open a supported Chrome video in a floating Picture-in-Picture window."
  total_time: "PT3M"
  tool: "Google Chrome"
  steps:
    - name: "Start playback"
      text: "Open the video in Chrome and start playback in the active tab."
    - name: "Open the video menu"
      text: "Open the video context menu; right-click twice on sites with a custom menu."
    - name: "Choose PiP"
      text: "Choose Picture in Picture, the site’s own PiP control, or Chrome media controls when available."
    - name: "Use the official extension"
      text: "If needed, install Picture-in-Picture Extension (by Google) and use its toolbar action or documented shortcut."
---


Picture-in-Picture (PiP) puts a supported video in a small floating window so you can keep watching while working in another tab or application. In Chrome, the feature is not a single switch that works identically on every website. The page may expose the browser’s video control, the site may provide its own PiP button, or the official Google extension may be the quickest fallback.

This guide gives you a reliable decision path instead of promising that every video or streaming service supports the same controls. You will learn the built-in method, how to use the official **Picture-in-Picture Extension (by Google)**, what the newer Document Picture-in-Picture API is for, and how to isolate the cause when PiP is missing or closes immediately.

## Table of contents

- [Chrome PiP at a glance](#chrome-pip-at-a-glance)
- [How to use PiP in Chrome](#how-to-use-the-built-in-pip-control)
- [PiP keyboard shortcuts](#pip-keyboard-shortcuts-by-platform)
- [Document Picture-in-Picture](#when-document-picture-in-picture-matters)
- [Standard Video PiP vs Document PiP API](#standard-video-pip-vs-document-pip-api)
- [Troubleshooting Chrome PiP](#fix-common-chrome-pip-problems)
- [Site-specific fixes](#site-specific-pip-troubleshooting)
- [Chrome Flags](#chrome-flags-for-experimental-auto-pip)
- [FAQs and JSON-LD](#frequently-asked-questions)

## Chrome PiP at a glance

| Your situation | First action | What to expect |
|---|---|---|
| A normal HTML video shows a PiP control | Use the video menu or Chrome’s media controls | The video moves into a floating always-on-top window |
| The site hides or replaces the video menu | Try the official Google extension | The extension provides a keyboard shortcut and a toolbar action, subject to site and browser limits |
| You need a floating call, playlist, or custom control panel | Check whether the web app supports Document PiP | This is a web-platform API for developers, not a universal consumer override |
| PiP opens and then disappears | Check page support, permissions, focus, and extensions | Some sites deliberately restrict PiP or replace the video element |

## What Picture-in-Picture means in Chrome

The normal Picture-in-Picture API places an HTML `<video>` element in a floating window. The window stays above other windows while you work elsewhere, but its controls and behavior depend partly on the video and the website. PiP is therefore a browser feature with site-level compatibility, not a guarantee that Chrome can detach every player.

Do not confuse normal video PiP with **Document Picture-in-Picture**. Chrome’s Document PiP API can place arbitrary HTML content in an always-on-top window, which makes it useful for custom video players, conferencing controls, and productivity interfaces. Chrome Developers documents desktop support beginning with Chrome 116, but a website must implement the API and request the window from an appropriate user action.[1]

## How to use the built-in PiP control

![Picture In Picture Chrome Guide Overview](/content/images/picture-in-picture-chrome-guide/picture-in-picture-chrome-guide-overview.webp "Picture In Picture Chrome Guide Overview")


Try the built-in route before installing anything:

1. Open the video in Chrome and start playback. Keep the video in the active tab while you test the control.
2. Open the video’s context menu. On sites that add their own menu, you may need to right-click the video twice to reach Chrome’s menu.
3. Choose **Picture in Picture** or the equivalent PiP command if it is available. The wording can vary by Chrome version and site.
4. Drag the floating window to a useful position and resize it from a corner when the operating system allows it. Return to the original tab or close the floating window using its controls.
5. If the context menu does not expose PiP, open Chrome’s media controls near the toolbar when they are available and look for the active media action. A site may also provide its own PiP button inside the player.

> **Screenshot placeholder — built-in control:** Capture Chrome’s video context menu with **Picture in Picture** highlighted, using a neutral test video. Suggested alt text: “Chrome video context menu showing the Picture in Picture command.”

The absence of a menu item is meaningful: the current player may not expose a compatible video, the site may block the action, or another menu may be intercepting the click. It does not automatically mean Chrome is broken.

## Use the official PiP extension by Google

When the built-in control is difficult to reach, install [Picture-in-Picture Extension (by Google)](https://chromewebstore.google.com/detail/picture-in-picture-extens/hkgfoiooedgoejojocmhlaklaeopbecg?hl=en) from its Chrome Web Store listing. The listing identifies Google as the developer and documents the extension’s purpose, keyboard shortcut, version information, and privacy disclosure.[2]

After installation:

1. Pin the extension from Chrome’s Extensions menu if you want the button visible.
2. Start the video in the active tab.
3. Select the extension button or use **Alt + P** on Windows and Linux. On macOS, use **Option + P** according to the store listing.[2]
4. If the shortcut conflicts with another application or does nothing, open the extension’s details and use the toolbar button instead.

This extension is a convenience layer, not a promise that protected or custom players can always be detached. Read the current store listing and the site’s terms before using it on a service with special playback restrictions.

## PiP keyboard shortcuts by platform

The official Google extension documents a shortcut, while Chrome’s built-in PiP route is normally reached through the video menu, a site control, or Chrome’s media controls. Chrome does not document one universal built-in PiP key combination for every desktop operating system. Extension shortcuts can also be changed or blocked by operating-system shortcuts; review them at `chrome://extensions/shortcuts`.[2] [3]

| Platform | Built-in Chrome PiP | Official Google extension | Practical note |
|---|---|---|---|
| Windows | No universal built-in PiP shortcut documented; use the video menu or Chrome media controls | **Alt + P** | If it fails, use the toolbar button and inspect `chrome://extensions/shortcuts`. |
| macOS | No universal built-in PiP shortcut documented; use the video menu or Chrome media controls | **Option + P** (`⌥ + P`) | macOS may translate `Alt` to the Option key; the store listing uses Option + P. |
| Linux | No universal built-in PiP shortcut documented; use the video menu or Chrome media controls | **Alt + P** | A desktop environment or another extension may claim the same combination. |
| ChromeOS | Use the video menu or Chrome media controls | **Alt + P**, where the extension exposes it; verify in `chrome://extensions/shortcuts` | ChromeOS can reserve keyboard combinations, so treat this as an extension shortcut rather than a built-in Chrome shortcut. |

> **Screenshot placeholder — shortcut settings:** Capture `chrome://extensions/shortcuts` with the PiP extension row visible and the shortcut field highlighted. Suggested alt text: “Chrome extension keyboard shortcuts page showing the Picture-in-Picture shortcut.”

The safest rule is simple: use the built-in menu first, use **Alt + P** or **Option + P** only for the official extension, and check the current shortcut-management page when a key combination stops responding. For broader browser workflows, see our [power-user Chrome extensions workflow guide](/blog/pro-browsing-chrome-extensions-the-ultimate-workflow-upgrade-for-power-users).

## When Document Picture-in-Picture matters

![Picture In Picture Chrome Guide Features](/content/images/picture-in-picture-chrome-guide/picture-in-picture-chrome-guide-features.webp "Picture In Picture Chrome Guide Features")


Most viewers only need video PiP. Document PiP matters when you are building or using a web app that needs more than a video rectangle: a meeting window with controls, a custom player with a playlist, a floating task list, or a small companion interface.

The API is controlled by the web app. It cannot be used as a universal button that forces every third-party site into a custom floating window. Chrome’s documentation notes that the request must be initiated by a user gesture and that the PiP window does not outlive its opener page.[1] If you are a developer, feature-detect it before using it:

```javascript
if ('documentPictureInPicture' in window) {
  // The browser exposes the Document Picture-in-Picture API.
}
```

A site should still provide a normal in-page experience when the API is unavailable. For a viewer, this means that a missing custom PiP window may be an application compatibility decision rather than a Chrome setting you can repair.

## Standard Video PiP vs Document PiP API

| Technical area | Standard Video PiP | Document PiP API |
|---|---|---|
| Target element | A compatible HTML `<video>` element | An always-on-top window populated with arbitrary HTML |
| Trigger mechanism | Site/player control, Chrome video menu or media controls, or a supported extension | The participating web app calls `documentPictureInPicture.requestWindow()` from a user gesture |
| Controls supported | A small set of browser/player controls; captions, playlists, and custom controls may be unavailable | The web app can add custom controls, captions, playlists, and other HTML interfaces |
| Developer effort | Usually none for the viewer; the site needs a compatible video and PiP support | The site must feature-detect the API, request permission through user action, move/render its interface, and handle window close events |
| Browser compatibility | Depends on Chrome, the site player, permissions, and content policy | Chrome/Edge 116+, Firefox 151+, Safari not supported according to current Chrome Developers documentation [1] |

The comparison is practical rather than absolute: an extension cannot turn a standard video PiP window into Document PiP, and a web app must implement Document PiP before viewers can use its richer controls.[1]

## Why PiP may not appear

The most common causes are narrower than “Chrome does not support PiP.” The player may not be a standard HTML video, the website may intercept the context menu, the current page may be inside an embedded frame, or the site may restrict PiP for a particular type of content. A browser extension can also change the player’s DOM or keyboard shortcuts.

Use this sequence instead of installing several unofficial PiP extensions at once:

1. Test a different, ordinary video in a new tab. If PiP works there, the first site or player is the likely boundary.
2. Try the site’s own PiP button, then the browser context menu, then Chrome media controls.
3. Temporarily disable extensions that alter video players, privacy controls, or keyboard shortcuts. Test in a clean tab before re-enabling them one at a time.
4. Test the official Google extension. If it works only on some sites, record the pattern rather than assuming the extension is faulty.
5. Update Chrome from **Settings → About Chrome**, then relaunch it. Keep this as maintenance, not as a promise that an update overrides a site restriction.

## Fix common Chrome PiP problems

![Picture In Picture Chrome Guide Guide](/content/images/picture-in-picture-chrome-guide/picture-in-picture-chrome-guide-guide.webp "Picture In Picture Chrome Guide Guide")


### PiP is missing from the right-click menu

Right-click the video twice if the site supplies a custom menu. If the option is still absent, try another video and check for a player-specific PiP button. You can also test the official Google extension. Do not use a broad collection of extensions as a first response; multiple player modifiers can make diagnosis harder.

### Alt + P does nothing

Confirm that the official extension is installed and enabled, and that the video is actively playing in the current tab. Open the extension menu and click its toolbar action to distinguish a shortcut conflict from a playback limitation. On macOS, use the shortcut shown by the current store listing rather than copying a Windows key combination.[2]

### The floating window opens but closes immediately

Keep the original tab open while testing. Check whether the page or video stops playback when it loses focus, and try a different player. Disable one video-related extension at a time. If every site closes the window, restart Chrome and test with the official extension on a simple video before changing hardware settings.

### The PiP window is black or blank

Pause and resume the video, return to the source tab, and test another video. If only one site is affected, its player or stream is the stronger suspect. If several sites are affected, update Chrome and test without extensions. Hardware acceleration can interact with graphics drivers, but disabling it changes how Chrome renders pages and should be treated as a later diagnostic step, not a universal fix.

### Captions or controls are missing

The floating window does not reproduce every control from every player. Try the site’s own PiP mode, return to the source tab for captions or playlists, or use a player that exposes those controls. Document PiP can support richer custom interfaces only when the web application implements it.[1]

## Site-specific PiP troubleshooting

Different platforms may use custom players, protected playback, or their own meeting controls. These are diagnostic routes, not guarantees that a site will permit PiP.

### YouTube

Pause the video and right-click twice if YouTube’s menu hides Chrome’s command. Try the player’s PiP control, then Chrome’s command, then the official Google extension; if only one video fails, compare its player state and avoid several “force PiP” extensions.

> **Screenshot placeholder — YouTube:** Capture a paused video after the second right-click with **Picture in Picture** visible. Suggested alt text: “YouTube video menu opened twice to reveal Chrome Picture in Picture.”

### Netflix and other DRM streams

Netflix’s official help documents PiP mainly for its mobile app and warns that browser or device implementations supplied by other software may not behave as expected.[4] On Chrome Desktop, protected playback can limit detaching; do not bypass DRM. Test an ordinary video, use Netflix-supported controls, keep Chrome current, and contact Netflix for account or device limits.

### Twitch

Try Twitch’s own PiP or pop-out control, then Chrome’s context menu and the official Google extension while the stream plays. A pop-out may preserve chat and controls that PiP cannot; if one stream fails, test without video, chat, or shortcut-modifying extensions.

### Zoom Web

Chrome’s automatic PiP for eligible conferencing apps requires the web app’s `enterpictureinpicture` handler, active camera or microphone capture, and user permission; it is not a universal override.[5] Use Zoom’s layout/pop-out controls, allow site permissions, keep the meeting tab open, and remember that an embedded SDK must implement PiP because a flag cannot add missing controls.

## Chrome Flags for experimental Auto-PiP

Chrome exposes experimental Auto-PiP features through `chrome://flags`; names and behavior can change. Test one flag at a time, record the original value, and return it to **Default** if the result is unstable.

### Auto PiP for media playback

Chrome documents a gradual rollout from Chrome 134. Open `chrome://flags/#auto-picture-in-picture-for-video-playback`, set **Auto picture in picture for video playback** to **Enabled**, click **Relaunch**, and test one audible, playing video. If it fails, restore **Default** and use manual PiP.[6] Safe top-frame, audio-focus, playback, engagement, and permission conditions may still apply; the flag does not override site restrictions.

### Browser-initiated Auto-PiP

For desktop Chrome 142 and later, open `chrome://flags/#browser-initiated-automatic-picture-in-picture`, enable **Browser initiated automatic picture in picture**, relaunch, play one normal video with sound, and switch tabs.[7] Chrome still checks site safety, audio, focus, a single video player with a video track, camera/microphone state, permissions, engagement, and whether another PiP window is open. It is not a first fix for protected or embedded players.

### Auto-PiP for video conferencing

Chrome documents conferencing Auto-PiP from Chrome 120 on desktop for eligible web apps that register `enterpictureinpicture`, capture camera or microphone, and receive user permission; a flag cannot make every meeting site eligible.[5]

> **Screenshot placeholder — Chrome Flags:** Capture `chrome://flags` with an Auto-PiP result and its **Default/Enabled** selector. Suggested alt text: “Chrome Flags page showing an Auto Picture-in-Picture experimental setting.”

## Keep PiP stable while multitasking

![Picture In Picture Chrome Guide Results](/content/images/picture-in-picture-chrome-guide/picture-in-picture-chrome-guide-results.webp "Picture In Picture Chrome Guide Results")


Use one PiP window at a time while diagnosing a problem. Keep the source tab open until playback is stable, and avoid changing several browser settings simultaneously. If you use PiP for meetings, treat the floating window as a view of the call rather than a replacement for the meeting tab; controls such as mute, presenting, or chat may remain in the original application.

For privacy, install only the official extension or a third-party tool whose publisher, requested access, update path, and source you can evaluate. A PiP tool that asks to read every site deserves the same review as any other Chrome extension. Our [Chrome extension management guide](/blog/how-to-get-the-most-out-of-your-browser-with-extension-chrome-get) explains how to review publisher information and site access before adding a browser tool. For a wider extension-selection framework, see the [complete Chrome extensions guide](/blog/chrome-extensions-complete-guide).

## Frequently asked questions

### Is Picture-in-Picture built into Chrome?

Chrome supports Picture-in-Picture for compatible video experiences, but the visible control depends on the player and website. Start with the video menu, Chrome media controls, or the site’s own PiP button before installing an extension.

### Is the Google PiP extension an official extension?

The Chrome Web Store listing identifies **Picture-in-Picture Extension (by Google)** as developed by Google. Its listing documents the Alt + P shortcut on Windows/Linux and the Option + P shortcut on macOS, along with its current privacy disclosure.[2]

### Why does PiP work on one website but not another?

Websites use different players and policies. One may expose a standard HTML video while another uses an embedded or custom player, intercepts the context menu, or restricts PiP. Compare a simple test video with the affected site before changing Chrome settings.

### Is Document Picture-in-Picture the same as video PiP?

No. Video PiP detaches an HTML video, while Document Picture-in-Picture lets a participating web app populate an always-on-top window with arbitrary HTML. The latter is mainly a web-platform capability that the site must implement.[1]

### What is the safest first fix when Chrome PiP stops working?

Test another video, check the site’s own control, disable one conflicting extension, and try the official Google extension. Then update Chrome and retest. Avoid installing several unofficial extensions or changing hardware acceleration before isolating the affected player.



## Final checklist

Use the built-in control first. If the site makes it difficult to reach, test the official Google extension. If the problem affects only one player, investigate that site before changing browser-wide settings. If you are building a custom floating interface, check Document Picture-in-Picture support and provide a graceful fallback. This approach keeps Chrome PiP useful without treating every compatibility difference as a browser failure.

### References

1. [Chrome Developers: Picture-in-Picture for any element, not just video](https://developer.chrome.com/docs/web-platform/document-picture-in-picture)
2. [Picture-in-Picture Extension (by Google) — Chrome Web Store](https://chromewebstore.google.com/detail/picture-in-picture-extens/hkgfoiooedgoejojocmhlaklaeopbecg?hl=en)
3. [Chrome for Developers: chrome.commands API](https://developer.chrome.com/docs/extensions/reference/api/commands)
4. [Netflix Help Center: How to use Netflix Picture in Picture (PiP)](https://help.netflix.com/en/node/588724338955364)
5. [Chrome for Developers: Automatic picture-in-picture for video conferencing web apps](https://developer.chrome.com/blog/automatic-picture-in-picture)
6. [Chrome for Developers: Enter picture-in-picture automatically when playing media](https://developer.chrome.com/blog/automatic-picture-in-picture-media-playback)
7. [Chrome for Developers: Enter video Picture-in-Picture automatically on more sites](https://developer.chrome.com/blog/automatic-picture-in-picture-initiated-by-the-browser)
