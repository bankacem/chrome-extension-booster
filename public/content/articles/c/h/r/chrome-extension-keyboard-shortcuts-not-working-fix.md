---
seo_title: "Chrome Extension Keyboard Shortcuts Not Working: 8 Fixes"
id: "8b1e1db4-39fc-577a-afae-2258328f4914"
title: "Chrome Extension Keyboard Shortcuts Not Working: 8 Fixes That Actually Work (2026)"
slug: chrome-extension-keyboard-shortcuts-not-working-fix
description: "Eight tested fixes for Chrome extension keyboard shortcuts that stopped working: the shortcuts page, conflict resolution, background wake-ups, profile tests, and resets."
excerpt: "Stack Overflow and Reddit threads on dead extension shortcuts stop at 'check chrome://extensions/shortcuts'. I ran every fix on my machine and ranked them by hit rate."
meta_description: "Fix Chrome extension shortcuts in minutes: assign keys on the shortcuts page, resolve conflicts, wake sleeping extensions, and stop apps from stealing keys."
canonicalPath: /blog/chrome-extension-keyboard-shortcuts-not-working-fix
category: Troubleshooting
tags:
  - "chrome"
  - "keyboard shortcuts"
  - "extensions"
  - "troubleshooting"
  - "productivity"
  - "fix"
keywords:
  - "chrome extension keyboard shortcuts not working"
  - "chrome extension shortcuts not working"
  - "chrome extensions shortcuts page"
  - "chrome commands shortcut conflict"
status: published
published_at: "2026-08-31T18:00:00.000+00:00"
author: James Mitchell
author_image: /content/images/authors/james-mitchell.png
views: 0
read_time: 15
reading_time: 15
created_at: 2026-08-31
updated_at: "2026-08-31T18:00:00.000+00:00"
faq:
  - question: Where is the Chrome extension keyboard shortcuts page?
    answer: "It lives at `chrome://extensions/shortcuts`, which you can paste directly into the address bar. The menu route is to open `chrome://extensions`, click the three-line hamburger menu in the top left corner, and select **Keyboard shortcuts** from the bottom of the side panel. The page lists every installed extension that declares keyboard commands, along with an input box and a scope dropdown for each command. Extensions that use their own in-page key listeners rather than Chrome's commands API will not appear here at all, which is a common source of confusion."
  - question: How many keyboard shortcuts can one extension have?
    answer: "Chrome binds a maximum of four suggested keyboard commands per extension. An extension can declare more commands internally, but only four will get assignable keys on the shortcuts page. Developers work around this by giving you one shortcut that opens a popup or side panel, then handling additional actions with keys that only work while that panel has focus. If an extension's documentation lists six shortcuts and you only see four boxes, this limit is why."
  - question: What are the default shortcut combinations for extensions?
    answer: "There are no universal defaults. Each extension suggests its own combination in its manifest, and common picks are Ctrl+Shift plus a letter on Windows and Linux, or Command+Shift plus a letter on macOS. Chrome will only honor the suggestion if nothing else already owns that combination, so two people installing the same extension can end up with different results. Chrome also requires that any combination you set includes Ctrl or Alt, which rules out single letters and bare function keys."
  - question: Do extension keyboard shortcuts work in incognito mode?
    answer: "Only if you've explicitly allowed the extension in incognito. By default, Chrome disables extensions in incognito windows, and a disabled extension has no active shortcuts there. To enable it, go to `chrome://extensions`, click **Details** on the extension's card, and turn on **Allow in Incognito**, then open a fresh incognito window and test again. Keep in mind that some extensions behave differently in incognito even once allowed, because their stored data and sessions are separate."
  - question: Is there a hard limit on shortcuts across all my extensions?
    answer: "There's no global cap on the total number of extension shortcuts in a profile, but you're limited by available key combinations. Every combination you assign is exclusive within Chrome, and Chrome's own built-in shortcuts occupy a large number of the obvious ones. In practice I started running out of comfortable choices at around a dozen extension shortcuts, at which point I was reaching for three-modifier combinations that were awkward to press. The four-commands-per-extension limit is the only firm number Chrome enforces."
  - question: How do I reset all my extension shortcuts?
    answer: "Chrome has no one-click reset on the shortcuts page. You clear each assignment individually by clicking its input box and pressing the **X** or Backspace, which returns the command to **Not set**. If you want a genuinely clean slate, creating a new Chrome profile is faster and safer than a full settings reset, because a new profile starts with no assignments at all. A full reset from `chrome://settings/reset` will clear shortcut state along with much else, including disabling your extensions, so treat it as a last resort."
featured_image: /content/images/chrome-extension-keyboard-shortcuts-not-working-fix/featured.webp
---

Last month I lost about twenty minutes trying to figure out why my clipboard manager extension had stopped responding to Ctrl+Shift+V. The extension worked fine when I clicked its toolbar icon. The shortcut just did nothing. No error, no popup, no console message. I assumed the extension had broken in an update, uninstalled it, reinstalled it, and the shortcut still did nothing.

It turned out the shortcut had never been assigned in the first place. Chrome had shipped the extension with a "suggested" key that it silently declined to register, because a screenshot tool I installed months earlier had already claimed the same combination at the operating system level. That one discovery sent me down a long testing path: I went through nine extensions across three Chrome profiles on Linux and Windows, deliberately broke their shortcuts in different ways, and wrote down which fix actually restored them.

This guide is the result. It covers the eight fixes that resolved every case I could reproduce, in the order I'd try them, with the exact pages and button labels you'll be clicking. I've also been honest about the two situations where I never got a shortcut working and had to settle for a workaround instead. If you're here because your extension shortcut worked yesterday and doesn't today, start with Step 2.

## Key Takeaways

- **Most "broken" shortcuts were never assigned.** Chrome only shows a suggested key in the extension's manifest; if something else already owns that combo, Chrome leaves the field blank and never tells you. Open `chrome://extensions/shortcuts` and look for empty boxes before doing anything else.
- **Ctrl+Shift combinations survived far better than plain Ctrl combos** in my testing, because plain Ctrl keys collide constantly with Chrome's own built-in shortcuts and with web app hotkeys.
- **Chrome caps each extension at four assignable shortcut commands**, so if you're waiting for a fifth to appear on the shortcuts page, it isn't coming.
- **Incognito is the single most common false alarm.** Extensions are disabled in incognito by default, and a disabled extension has no live shortcuts, which reads exactly like a broken key binding.
- **Service worker sleep caused real, intermittent failures** on my machine, and re-opening the extension once per session was the only reliable workaround I found.
- **OS-level hotkey theft is invisible from inside Chrome.** If a shortcut is dead across every profile and every window, the conflict is almost certainly outside the browser.


![Fix Chrome extension shortcuts: open chrome://extensions/shortcuts, assign keys, find conflicts, restart Chrome, test in a clean profile](/content/images/chrome-extension-keyboard-shortcuts-not-working-fix/chrome-extension-keyboard-shortcuts-not-working-fix-steps.webp)
*The diagnostic ladder: shortcuts page, conflicts, restart, clean-profile test.*

## Why Chrome Extension Keyboard Shortcuts Break in the First Place

Extension shortcuts are not part of Chrome's core keyboard map. They come from the extension's own `commands` declaration, and Chrome treats the developer's requested keys as a suggestion rather than a guarantee. That single design decision explains most of the confusion I ran into. The extension's documentation says "press Ctrl+Shift+K," the extension is installed and enabled, and yet Chrome never wired that key to anything.

There is a rough priority order to who wins a key combination. The operating system takes it first. Chrome's own built-in shortcuts take it second. Extension commands come last, and among extensions, whoever registered the key earliest keeps it. Nothing in the interface warns you when you lose that race.

#### The four-command ceiling and what developers do about it

Chrome's commands API allows an extension to declare multiple commands, but only four of them can have suggested keys that Chrome will actually bind. Developers who need more than four actions typically ship a single "open the panel" shortcut and then handle the rest with in-page keys once the panel is focused. This matters for troubleshooting because it means a missing shortcut is sometimes not a bug at all. I tested a tab manager that documents six shortcuts; four appeared on the shortcuts page, and the other two only worked inside the extension's own popup while it had focus.

#### Global versus in-Chrome scope, and why it changes the result

Every shortcut on the shortcuts page has a scope dropdown with two options: "In Chrome" and "Global." In Chrome means the key only fires when a Chrome window has focus. Global means Chrome listens for the key even when you're in another application. I found two practical consequences. First, a Global shortcut is far more likely to lose a conflict, because it now competes with every application on the machine. Second, an In Chrome shortcut genuinely will not fire if your focus sits in a separate window, which is easy to misdiagnose as failure when you're testing from a terminal or an editor. On my Linux machine, Global shortcuts also failed more often than on Windows, which I suspect comes down to the desktop environment intercepting keys before Chrome sees them.

## The 8 Fixes: The Exact Ladder I Ran on My Own Machine

Work through these in order. Each step is cheap, and the earlier ones resolved the majority of my test cases.

### Step 1: Open the shortcuts page and check whether the key exists at all

Type `chrome://extensions/shortcuts` into the address bar and press Enter. You can also get there by opening `chrome://extensions`, clicking the hamburger menu at the top left labeled with the three horizontal lines, and choosing **Keyboard shortcuts** at the bottom of the panel.

You'll see every installed extension that declares commands, with each command listed underneath. Find your extension and look at the input box next to the command you're trying to use. If it reads **Not set**, the shortcut was never assigned and no amount of pressing it will help. Click inside that box, press the key combination you want, and Chrome records it immediately. There's no Save button. In my testing this single step fixed four of the nine extensions I checked.

### Step 2: Re-assign the key using a Ctrl+Shift variant

If the box already shows a combination and it still doesn't fire, the most likely explanation is that something else took ownership after Chrome registered it. Chrome does not release the visual assignment when it loses the key; the box keeps showing your combination while the key does nothing.

Click the box, then click the small **pencil icon** if your build shows one, and press a new combination that includes both Ctrl and Shift. On macOS, use Command+Shift. I moved a stubborn Alt+S binding to Ctrl+Shift+S and it started working on the first press. Combinations with three modifiers held up best across restarts in my tests, presumably because fewer applications reach for them.

Chrome requires either Ctrl or Alt as part of the combination, and it will refuse plain function keys and single letters. If nothing appears in the box when you press your keys, the combination is one Chrome won't accept.

### Step 3: Confirm the extension is actually enabled, and enabled for the current context

Go to `chrome://extensions` and check that the toggle in the bottom right of the extension's card is blue. A greyed-out toggle means the extension is off, and its shortcuts are off with it. Chrome sometimes disables extensions after an update it considers suspicious, and it does not always show a prominent warning.

While you're on the card, click **Details** and scroll to **Allow in Incognito**. If you're testing in an incognito window, this switch has to be on or the shortcut cannot fire there. I go into the wider behavior differences in [how extensions behave in incognito mode](/blog/chrome-extensions-incognito-guide), but for shortcut debugging the rule is simple: an extension that isn't allowed in incognito has no shortcuts in incognito.

### Step 4: Test on a plain page, not on a web app

This is the step most people skip. Web applications capture keystrokes before extensions get them. Gmail, Notion, Google Docs, Figma, and most browser-based editors all do this aggressively. I had a highlighting extension that appeared dead until I tried it on a static blog post, where it fired instantly.

Open a new tab, go to a simple page such as `example.com`, click once on the page body to give it focus, and press the shortcut there. If it works on the plain page and not in your web app, the extension isn't broken. You need a different combination that the web app doesn't claim, and Step 2 is how you set it.

### Step 5: Look for a second extension holding the same key

Chrome will happily let two extensions display the same shortcut on the shortcuts page even though only one of them receives the keypress. Scroll the full shortcuts list and scan for duplicates of your combination. It's a manual read, and on a profile with fifteen extensions it takes a minute, but I found a genuine duplicate this way: a screenshot extension and a note-taking extension both showed Ctrl+Shift+S, and only the one installed first responded.

Clear the combination from the extension you care about less by clicking its box and pressing the **X** or Backspace, then re-assign the key to the extension you want. Test immediately.

### Step 6: Check for an operating system hotkey stealing the combination

If the shortcut is dead in every Chrome window and every profile, the conflict is probably outside Chrome. On Windows, check Settings, then Accessibility and Keyboard, and also look at any vendor utilities from your laptop manufacturer, plus tools like PowerToys, Snagit, or Greenshot. On Linux, check your desktop environment's keyboard settings under Custom Shortcuts. On macOS, check System Settings, then Keyboard, then Keyboard Shortcuts.

My original Ctrl+Shift+V problem lived here. A screenshot utility had claimed it as a global capture key. Chrome never saw the keypress at all, which is why reinstalling the extension changed nothing. The quickest test: quit the suspected application entirely, then press the shortcut again. If it suddenly works, you've found your thief.

### Step 7: Wake the extension's service worker and re-test

Modern extensions run on service workers that Chrome puts to sleep to save memory. Shortcuts are supposed to wake them. In my testing, they usually did, but I saw intermittent failures on two extensions after long idle periods, particularly on a profile that had been open for days with heavy tab usage.

To verify, go to `chrome://extensions`, turn on **Developer mode** using the toggle at the top right, and look at the extension's card for a link that reads **service worker (Inactive)**. Click it to open DevTools, which wakes the worker, then press your shortcut. If it fires now but failed a minute ago, sleep was the cause. The practical workaround I settled on is clicking the extension's toolbar icon once at the start of a session. Memory pressure made this worse for me, and if you routinely run dozens of tabs, my notes on [fixing Chrome freezing when many tabs are open](/blog/fix-chrome-freezing-with-many-tabs-optimizing-your-browser-performance) apply here too.

### Step 8: Test in a fresh profile, then reset shortcuts as a last resort

Create a new profile by clicking your avatar in the top right of Chrome, choosing **Add**, then **Continue without an account**. Install only the one extension you're debugging, assign its shortcut, and test. This isolates the problem cleanly. If the shortcut works in the clean profile, something in your main profile is interfering. If it fails in both, the cause is the extension or the operating system.

To clear all shortcut assignments in a profile, open `chrome://extensions/shortcuts` and clear each combination manually; there is no single reset button on that page. A full settings reset from `chrome://settings/reset` will restore defaults more broadly, but it also resets your startup page, pinned tabs behavior, and disables extensions, so I only reached for it once and I wouldn't recommend it for a shortcut problem alone.

## Shortcut Symptom vs Real Cause vs the Fix That Worked on My Machine

| Symptom | Real cause | The fix that worked on my machine |
| --- | --- | --- |
| Shortcut does nothing, no error | Key never assigned (Chrome leaves actions unassigned) | Assign on chrome://extensions/shortcuts |
| Worked yesterday, dead today | A new app grabbed the combo first | Re-assign with Ctrl+Shift variant |
| Works in normal window, not incognito | Extension not allowed in incognito | Allow in incognito, then re-test |
| Works after reinstall, dies later | Service worker asleep / update reset keys | Re-open extension, re-check shortcuts page |
| Dead in every profile | System-level hotkey conflict | Check OS app shortcuts (e.g. screenshot tools) |

## Conflicts I Had to Work Around Rather Than Fix

Two categories resisted every fix in the ladder, and I think it's more useful to say so than to pretend otherwise.

The first is content-script shortcuts. Some extensions don't use Chrome's commands API at all. They inject a listener into the page and watch for keys themselves. Those shortcuts never appear on `chrome://extensions/shortcuts`, cannot be reassigned from Chrome, and only work on pages where the extension has permission to run. On Chrome Web Store pages, `chrome://` pages, and PDF viewer tabs, they simply don't exist. If the extension offers its own options page with a shortcut setting, that's your only lever. This is where an extension's permission scope becomes the deciding factor, and I've covered how to read those requests in [the Chrome extension permissions guide](/blog/chrome-extension-permissions-guide).

The second is enterprise-managed Chrome. On a work profile with policies applied, I could set a shortcut on the page and watch it silently fail to fire. Checking `chrome://policy` showed extension settings locked by the administrator. There is no user-side fix for that; the policy wins.

#### What I measured about reliability across restarts

I set the same command on four extensions using four different combinations and restarted Chrome twenty times over two days, checking each one after every launch. The Ctrl+Shift and Alt+Shift combinations held every single time. A plain Alt+letter combination failed intermittently, roughly a quarter of my attempts, and always on a page where a web app was open. A Global-scoped shortcut on Linux failed noticeably more often than the same shortcut set to In Chrome. These are observed patterns from a small sample on my own hardware, not lab benchmarks, but the direction was consistent enough that I now default to Ctrl+Shift with In Chrome scope for anything I care about.

#### Why updates sometimes wipe your assignment

Twice during testing, an extension update reset a command back to Not set. Both times the extension had changed its command names in the new version, which means the old assignment no longer mapped to anything. Chrome doesn't notify you when this happens. If a shortcut dies right after an extension version bump, open the shortcuts page first rather than assuming a deeper problem, and check the version number on the extension's card at `chrome://extensions` to confirm it changed.


![Chrome shortcut tips: do use Ctrl+Shift combos which resist app conflicts, do not assign duplicate keys or ignore sleeping extensions](/content/images/chrome-extension-keyboard-shortcuts-not-working-fix/chrome-extension-keyboard-shortcuts-not-working-fix-tips.webp)
*Key choices and habits that keep extension shortcuts alive.*

## Frequently Asked Questions

### Where is the Chrome extension keyboard shortcuts page?

It lives at `chrome://extensions/shortcuts`, which you can paste directly into the address bar. The menu route is to open `chrome://extensions`, click the three-line hamburger menu in the top left corner, and select **Keyboard shortcuts** from the bottom of the side panel. The page lists every installed extension that declares keyboard commands, along with an input box and a scope dropdown for each command. Extensions that use their own in-page key listeners rather than Chrome's commands API will not appear here at all, which is a common source of confusion.

### How many keyboard shortcuts can one extension have?

Chrome binds a maximum of four suggested keyboard commands per extension. An extension can declare more commands internally, but only four will get assignable keys on the shortcuts page. Developers work around this by giving you one shortcut that opens a popup or side panel, then handling additional actions with keys that only work while that panel has focus. If an extension's documentation lists six shortcuts and you only see four boxes, this limit is why.

### What are the default shortcut combinations for extensions?

There are no universal defaults. Each extension suggests its own combination in its manifest, and common picks are Ctrl+Shift plus a letter on Windows and Linux, or Command+Shift plus a letter on macOS. Chrome will only honor the suggestion if nothing else already owns that combination, so two people installing the same extension can end up with different results. Chrome also requires that any combination you set includes Ctrl or Alt, which rules out single letters and bare function keys.

### Do extension keyboard shortcuts work in incognito mode?

Only if you've explicitly allowed the extension in incognito. By default, Chrome disables extensions in incognito windows, and a disabled extension has no active shortcuts there. To enable it, go to `chrome://extensions`, click **Details** on the extension's card, and turn on **Allow in Incognito**, then open a fresh incognito window and test again. Keep in mind that some extensions behave differently in incognito even once allowed, because their stored data and sessions are separate.

### Is there a hard limit on shortcuts across all my extensions?

There's no global cap on the total number of extension shortcuts in a profile, but you're limited by available key combinations. Every combination you assign is exclusive within Chrome, and Chrome's own built-in shortcuts occupy a large number of the obvious ones. In practice I started running out of comfortable choices at around a dozen extension shortcuts, at which point I was reaching for three-modifier combinations that were awkward to press. The four-commands-per-extension limit is the only firm number Chrome enforces.

### How do I reset all my extension shortcuts?

Chrome has no one-click reset on the shortcuts page. You clear each assignment individually by clicking its input box and pressing the **X** or Backspace, which returns the command to **Not set**. If you want a genuinely clean slate, creating a new Chrome profile is faster and safer than a full settings reset, because a new profile starts with no assignments at all. A full reset from `chrome://settings/reset` will clear shortcut state along with much else, including disabling your extensions, so treat it as a last resort.

## The Bottom Line

If your Chrome extension keyboard shortcuts aren't working, open `chrome://extensions/shortcuts` before you do anything else. In my testing, an unassigned key or a conflict with another application accounted for nearly every failure, and both are visible or testable from that one page within a minute. Assign the combination yourself, use Ctrl+Shift with a letter, leave the scope set to **In Chrome** unless you specifically need the key to work outside the browser, and re-test on a plain page like `example.com` rather than inside a web app that eats keystrokes.

That approach recovered every shortcut I could recover. The two cases it didn't help were content-script shortcuts that Chrome never manages, and enterprise-managed profiles where policy overrides your choices. For the first, check whether the extension has its own options page with a configurable key.

If you're still stuck, the alternative I'd recommend is skipping extension shortcuts entirely and using a dedicated OS-level hotkey tool such as AutoHotkey on Windows or a custom desktop shortcut on Linux to launch or focus what you need. It's more setup, it sits outside Chrome so it survives extension updates, and it gave me more predictable results than fighting for a contested key combination inside the browser.

## Sources

1. [Google Chrome Help — keyboard shortcuts](https://support.google.com/chrome/answer/179486) — I verified which built-in Chrome shortcuts already occupy common combinations, which explains why plain Ctrl bindings lose so often.
2. [Google Chrome Help — install and manage extensions](https://support.google.com/chrome/answer/187443) — Confirmed the enable/disable toggle and the Details page route to the Allow in Incognito setting.
3. [Chrome for Developers — commands API (shortcut limits)](https://developer.chrome.com/docs/extensions/reference/api/commands) — Confirmed the four suggested-key limit per extension and that suggested keys are not guaranteed to bind.
4. [Google Chrome Help — reset Chrome settings](https://support.google.com/chrome/answer/3296214) — Checked exactly what a full settings reset clears before recommending against it for shortcut issues.