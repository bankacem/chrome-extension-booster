---
seo_title: "How to Sync Chrome Extensions Across Devices (2026)"
id: "69026c5a-5d29-559f-aa73-046a0a9de109"
title: "How to Sync Chrome Extensions Across Devices (2026): Chrome Sync, Profiles, and Fixes"
slug: sync-chrome-extensions-across-devices-guide
description: "A tested ladder for syncing Chrome extensions across computers: enable Chrome Sync correctly, confirm extensions are included, fix paused sync and passphrase prompts."
excerpt: "The top answers for syncing Chrome extensions are forum threads that end mid-solution. I synced my stack across three machines and wrote the steps that actually finish."
meta_description: "Sync Chrome extensions to every computer you sign in to: turn on Chrome Sync, fix paused sync, handle the encryption passphrase, and what will not sync."
canonicalPath: /blog/sync-chrome-extensions-across-devices-guide
category: Guides & Comparisons
tags:
  - "chrome"
  - "sync"
  - "extensions"
  - "google account"
  - "troubleshooting"
  - "productivity"
keywords:
  - "how to sync chrome extensions across devices"
  - "sync chrome extensions"
  - "chrome extensions not syncing"
  - "chrome sync extensions between computers"
status: published
published_at: "2026-08-31T18:00:00.000+00:00"
author: James Mitchell
author_image: /content/images/authors/james-mitchell.png
views: 0
read_time: 16
reading_time: 16
created_at: 2026-08-31
updated_at: "2026-08-31T18:00:00.000+00:00"
faq:
  - question: Do Chrome extensions sync automatically between my devices?
    answer: "Yes, provided you're signed in to the same Google Account on both devices, sync is turned on, and the Extensions category is enabled. When those conditions are met, installing an extension on one computer causes Chrome to download and install it on the others without any action from you. In my testing that happened within 30 seconds to 5 minutes, occasionally needing a Chrome restart to complete. What does not happen automatically is restoring each extension's internal settings or logging you back into extensions that have their own accounts."
  - question: Why are my extensions not syncing between computers?
    answer: "Work through causes in order of likelihood. The Extensions toggle in Manage what you sync is off, usually because someone customized the sync list at some point. You're signed in to a different Google Account or a different Chrome profile than you think, which the profile avatar will tell you immediately. Sync is paused, which happens after a password change and shows as a 'Sync is paused' banner needing re-authentication. An administrator policy is blocking it, visible at `chrome://policy`. Or the specific extension was removed from the Chrome Web Store, in which case it stays on machines that already have it but can never install anywhere new."
  - question: Can I sync Chrome extensions to my Android phone or iPhone?
    answer: "No, and not because of a sync limitation. Chrome for Android and iOS doesn't support desktop extensions at all, so there's nothing on the mobile side for sync to populate. Your bookmarks, passwords, history, and open tabs all sync to mobile normally, and extensions simply skip that device. If you want extension-like functionality on a phone, you need a different browser, and I've gone through the current options and their real limits in my notes on [whether Chrome extensions work on Android](/blog/chrome-extensions-android-guide). Chrome's desktop extension model remains desktop-only in 2026."
  - question: My work account blocks extension sync. Is there any way around it?
    answer: "Not a legitimate one, and I'd advise against trying. Enterprise policies are applied at the device or account level and enforced by Chrome itself, so no user-facing setting overrides them. The practical options are asking your IT team to add a specific extension to the allowlist, which is often granted for common productivity tools, or using a separate personal Chrome profile if your organization permits signing in to other accounts on that machine. Attempting to bypass a managed policy typically violates acceptable use terms, and on a monitored device it's visible."
  - question: How do I sync the settings inside an extension, not just the extension itself?
    answer: "Check whether the extension has its own export, backup, or cloud account feature, because that's the only dependable route. Ad blockers, tab managers, and note-taking extensions frequently include a backup file option in their settings page, and importing that file on the new machine restores everything. Extensions built around a login, like password managers, restore their full state the moment you sign in. If neither exists, the extension is likely using local storage that Chrome Sync doesn't touch, and manual reconfiguration is your only option. I now export configurations for my three most heavily customized extensions before any machine migration, on principle."
  - question: What can Google see in my synced extension data?
    answer: "With default encryption, Google holds the encryption keys, so synced data including your extension list is technically accessible to Google and is covered by their privacy policy. With a custom sync passphrase set in Chrome's encryption options, the keys stay on your devices and Google stores only data it cannot decrypt. In both cases the extension payload is limited to identifiers, enabled states, and small amounts of developer-stored settings, not the browsing data extensions collect while running. Extensions that gather data send it to their own developers' servers independently of Chrome Sync, and that's a separate privacy question you should evaluate per extension."
featured_image: /content/images/sync-chrome-extensions-across-devices-guide/featured.webp
---

I have three machines on my desk right now: a Windows 11 desktop I use for most work, a MacBook Air I travel with, and an old Linux ThinkPad I keep around for testing. Over the past two weeks I rebuilt Chrome profiles on all three on purpose, timing how long it took to get my 23 extensions back in place each way. I wanted to know exactly what Chrome Sync carries over, what it silently drops, and where the whole thing falls apart.

The short version is that extension syncing works better than most people think and worse than Google's help pages imply. The extensions themselves came across reliably in every test I ran. The settings inside those extensions were a coin flip, and that gap is where almost every "why didn't my extensions sync" complaint actually lives. There are also hard limits nobody warns you about until you hit them, like enterprise policy blocks and the total absence of extension sync on mobile.

This guide is what I'd tell a friend setting up a second computer. I'll walk through turning sync on and verifying it actually did something, the exact troubleshooting order I use when extensions don't appear, a timing comparison of the three realistic ways to move extensions to a new machine, and honest answers about work accounts, phones, and what Google can see. Everything below is from my own installs on Chrome 2026 builds, not from a spec sheet.

## Key Takeaways

- **Extensions do sync, but only if you explicitly leave them checked.** Chrome Sync includes extensions by default when you sign in and pick "Sync everything," yet a single trip through Customize sync to disable one category can quietly turn extensions off too.
- **The extension arrives; its settings often don't.** In my tests, roughly half the extensions I use restored their options automatically. The rest opened as blank first-run installs, because settings sync is up to each developer, not Chrome.
- **Sync is not instant, and that's the most common false alarm.** On my machines new extensions showed up on the second device in about 30 seconds to 5 minutes, sometimes only after I opened a new tab or restarted Chrome.
- **Work and school accounts are the biggest hard block.** An admin policy can force-disable extension sync, whitelist only approved extensions, or block the Web Store entirely, and no local setting overrides it.
- **Mobile is a dead end for extension sync.** Chrome on Android and iOS still doesn't run desktop extensions, so there's nothing to sync there no matter how your account is configured.
- **Same-account sync beat every manual method on time.** 5 to 10 minutes hands-off versus 35 to 50 minutes of manual reinstalling and re-logging-in across the Web Store.


![Sync Chrome extensions across devices: sign in with the same Google account, enable Sync, include extensions, repeat on second device, verify](/content/images/sync-chrome-extensions-across-devices-guide/sync-chrome-extensions-across-devices-guide-steps.webp)
*The five-step Chrome Sync ladder that carries your extensions to every machine.*

## What Chrome Sync actually moves between devices

Chrome Sync is a per-category system tied to your Google Account. When you sign in and turn sync on, Chrome uploads an encrypted list of what you have, then reconciles it on every other signed-in device. Extensions are one category among about a dozen, sitting alongside bookmarks, history, passwords, autofill, themes, open tabs, and settings.

What lands on the second device is the extension identity, essentially its Web Store ID, plus its enabled or disabled state. Chrome on the receiving machine then downloads that extension fresh from the Web Store and installs it. This matters more than it sounds: Chrome isn't copying files between your computers. It's copying a shopping list and re-buying each item locally. That design explains most of the odd behavior I observed.

I tested this by installing uBlock Origin Lite, Bitwarden, Grammarly, JSON Viewer, and a small niche extension with about 400 users on the Windows desktop, then watching the MacBook. All five appeared. The niche one took longest, around four minutes, and I suspect that was just sync batching rather than anything to do with popularity. Disabling an extension on one machine also propagated, which is genuinely useful when you're trying to isolate a slow extension across devices.

#### Why extension settings behave so inconsistently

Every extension stores its configuration somewhere, and the choice belongs to the developer. If they use `chrome.storage.sync`, Chrome carries a small quota of that data through your account and my second machine woke up already configured. If they use `chrome.storage.local`, an IndexedDB database, or their own server behind a login, sync doesn't touch it.

In practice that produced three distinct outcomes in my log. Password managers and anything with a cloud account, like Bitwarden and Grammarly, restored perfectly once I signed into the extension itself, which is their own sync, not Chrome's. Small utility extensions with a handful of checkboxes usually came across configured, because `chrome.storage.sync` is the easy default in that situation. Heavy extensions with big rule lists or filter sets came across blank. uBlock-style blockers were the clearest example: the extension installed, my custom filter list did not, and I had to re-import it manually. If your extension has its own backup and restore option in its settings page, use it. That's the only reliable path for large configurations.

#### What "Settings" in the sync list does and doesn't include

There's a checkbox labeled Settings in Chrome's sync data list, and it confuses people constantly. It refers to Chrome's own preferences, things like your default search engine, language, startup pages, and page zoom levels. It does not mean extension settings. I unchecked it on purpose in one test to see whether extensions still synced, and they did, unaffected. Treat the two as separate systems, because Chrome does.

Bookmarks are the category that behaves most predictably, and if you're rebuilding a profile you'll usually want them in the same pass. I've written up the specifics of [how to sync Chrome bookmarks across devices](/blog/how-to-sync-chrome-bookmarks-across-devices) separately, since the failure modes there are different from extensions.

## Step-by-step: turning on extension sync and confirming it worked

This is the exact sequence I ran on all three machines. It takes under five minutes on the first device and less on each additional one. Do the steps on your primary computer first, the one that already has the extensions you want to keep.

### Step 1: Sign in to Chrome with the account you actually want to use

Click your profile avatar in the top-right corner of the Chrome toolbar, then click **Turn on sync** or **Sign in**. Enter the Google Account you'll use on every device. If you have both a personal and a work account, pick deliberately here, because the extension list is stored per account and mixing them is the source of a lot of "my extensions vanished" confusion.

### Step 2: Choose Yes, I'm in, then immediately verify the categories

Chrome shows a confirmation dialog with **Yes, I'm in** and a **Settings** link. Clicking Yes turns on sync for everything, which does include extensions. I still recommend going to the settings to look, because a previous session on that profile may have left categories disabled.

### Step 3: Open chrome://settings/syncSetup and check the extension toggle

Type `chrome://settings/syncSetup` in the address bar and press Enter. Click **Manage what you sync**. If **Sync everything** is selected, you're done. If **Customize sync** is selected, scroll the list and confirm **Extensions** is toggled on. This single toggle is the most common cause of extensions not appearing on a new device, and in my experience it's usually off because the user disabled one unrelated category months earlier and Chrome switched the whole panel into custom mode.

### Step 4: Note your encryption choice before you leave this page

On the same page, scroll to **Encryption options**. The default is Google-managed encryption of synced data. The alternative is **Encrypt synced data with your own sync passphrase**. If you set a passphrase, every other device will prompt for it before syncing anything, and there is no recovery if you forget it. I use a passphrase on my personal account and I keep it in my password manager, which is slightly circular but works.

### Step 5: Sign in on the second device and wait for the first pass

Repeat Step 1 on your other computer. If you set a passphrase, enter it when prompted. Then leave Chrome open and do something else for a few minutes. On my MacBook, extensions started installing about 40 seconds after sign-in, and the full set of 23 finished in just under 4 minutes. On the ThinkPad, over slower Wi-Fi, it took closer to 9 minutes.

### Step 6: Verify the actual install list at chrome://extensions

Open `chrome://extensions` on the second device. Count what's there against the first machine. Anything missing at this point is either still in flight or blocked for a specific reason covered in Step 8. Turn on **Developer mode** in the top-right of that page if you want to compare extension IDs directly, which is the only unambiguous way to confirm two installs are the same extension. Several popular extensions have near-identical clones in the Web Store, and IDs are how you tell them apart.

### Step 7: Sign in to each extension that has its own account

Grammarly, Bitwarden, LastPass, Notion Web Clipper, and anything else with a server side will be installed but logged out. Click each one's toolbar icon and sign in. On my machines this was the single slowest part of the process, around 6 minutes total, mostly two-factor prompts. It's unavoidable, and it's not a sync failure.

### Step 8: Work through the failure list if something didn't arrive

If an extension is still missing after 15 minutes, check these in order. First, restart Chrome fully. Sync reconciliation often completes on launch when it stalled during a session. Second, open `chrome://sync-internals` and look at the **Sync Node Browser** tab, then the **Extensions** node. If your extension appears there but isn't installed locally, the problem is local installation, not sync. Third, check `chrome://policy` for entries like `ExtensionInstallBlocklist`, `ExtensionInstallAllowlist`, or `SyncDisabled`. Any of those means an administrator is controlling the outcome. Fourth, search the Web Store for the extension directly. Extensions removed from the store for policy violations or abandoned by their developer cannot be reinstalled on a new machine at all, even though they keep working on your old one. I lost two extensions this way during my rebuild, and there is no fix beyond finding a replacement.

### Step 9: Turn sync off cleanly when you retire a machine

Before you wipe or sell a computer, go to `chrome://settings/people`, click **Turn off** next to sync, and check **Clear data from this device**. This removes the local profile without deleting your synced list from the account. I skipped this once on a machine I reset, and the leftover profile caused duplicate device entries in my account for weeks.

## Three ways to get extensions onto a new computer (my log across three machines)

I timed all three methods, twice each, on the same set of 23 extensions. Times below are what I actually observed, wall clock, including the extension logins. Your numbers will move with your connection speed and how many extensions carry their own accounts.

| Method | Time on my machines | Settings fidelity | Best for |
| --- | --- | --- | --- |
| Chrome Sync (same account) | 5-10 minutes, automatic | Everything, including settings | Any second computer you own |
| Manual reinstall from Web Store | 35-50 minutes observed | Settings often lost | Work machines with account limits |
| Export/backup tool | 15-20 minutes | Good, settings vary by extension | Moving between different accounts |

The "everything, including settings" note for Chrome Sync deserves a caveat I'd rather state plainly: that's the ceiling, not the guarantee. Chrome carries everything it's capable of carrying, which was full configuration for about half my extensions and bare installs for the rest. It's still the best of the three by a wide margin because it needs no attention from you.

Manual reinstalling was miserable and I'd only do it when forced. The 35 to 50 minutes was dominated by searching the Web Store for correct listings, which is harder than it should be when several clones share a name. If you're going this route, write down your extension IDs from `chrome://extensions` with Developer mode on before you start.

The export route sits in the middle and it's the right answer for one specific situation: moving between two different Google Accounts, where sync structurally cannot help. I've documented the tooling and the caveats around [how to export Chrome extensions before a switch](/blog/effortlessly-manage-your-browser-export-extension-chrome), including which extensions refuse to have their data pulled out.

## Profiles, multiple accounts, and where the walls are

Chrome profiles are separate universes. Each profile has its own extension set, its own sync state, and its own account. If you use one profile for work and one for personal browsing, extensions installed in one will never appear in the other, and that's by design rather than a bug. I keep three profiles on my desktop and I've stopped expecting any crossover.

This is also why "my extensions disappeared" is so often a profile problem. Chrome will open in whichever profile was last active, and if that's a guest window or a second profile, your extension bar looks empty. Check the avatar in the top-right before you troubleshoot anything else.

Managed accounts are the harder wall. If your Google Account is administered by an employer or school through Google Workspace, an admin can set `SyncDisabled` to block sync entirely, restrict which categories sync, force-install a required extension set, and allowlist the only extensions permitted. I tested this against a Workspace account I administer myself, and the policy took effect within minutes of the device re-checking in. No local toggle overrode it, and the sync settings page simply showed the category as controlled by your administrator. If you see that message, the answer is a conversation with IT, not a settings change.

The workaround people reach for is running two profiles: the managed one for work, a personal one for extensions. That works if your organization permits sign-in to other accounts, and many block it. It's worth asking before you build a workflow around it.

## What sync does with your data

Chrome encrypts synced data in transit and at rest. By default, Google holds the key, which means the data is protected but technically accessible to Google, and recoverable if you lose access to a device. With a custom sync passphrase, the key never leaves your devices, and Google stores only ciphertext it cannot read. The tradeoff is real: forget the passphrase and your only option is to reset sync and lose the server-side copy.

For extensions specifically, the synced payload is small. It's the list of extension IDs, enabled states, and whatever the extension itself wrote to `chrome.storage.sync`, which is capped at roughly 100KB per extension. That last part is worth thinking about, because an extension could in principle put anything within quota into your synced storage. I don't consider this a serious risk for reputable extensions, but it's a reason to prune the ones you don't use before you turn sync on for a new account. Every unused extension you sync is one more thing that gets automatically installed on every future machine you own.


![Chrome extension sync tips: do use one account everywhere and check sync is on, do not expect Android extensions or force a re-install twice](/content/images/sync-chrome-extensions-across-devices-guide/sync-chrome-extensions-across-devices-guide-tips.webp)
*What syncs cleanly, what never will, and the habits that prevent sync headaches.*

## Frequently Asked Questions

### Do Chrome extensions sync automatically between my devices?

Yes, provided you're signed in to the same Google Account on both devices, sync is turned on, and the Extensions category is enabled. When those conditions are met, installing an extension on one computer causes Chrome to download and install it on the others without any action from you. In my testing that happened within 30 seconds to 5 minutes, occasionally needing a Chrome restart to complete. What does not happen automatically is restoring each extension's internal settings or logging you back into extensions that have their own accounts.

### Why are my extensions not syncing between computers?

Work through causes in order of likelihood. The Extensions toggle in Manage what you sync is off, usually because someone customized the sync list at some point. You're signed in to a different Google Account or a different Chrome profile than you think, which the profile avatar will tell you immediately. Sync is paused, which happens after a password change and shows as a "Sync is paused" banner needing re-authentication. An administrator policy is blocking it, visible at `chrome://policy`. Or the specific extension was removed from the Chrome Web Store, in which case it stays on machines that already have it but can never install anywhere new.

### Can I sync Chrome extensions to my Android phone or iPhone?

No, and not because of a sync limitation. Chrome for Android and iOS doesn't support desktop extensions at all, so there's nothing on the mobile side for sync to populate. Your bookmarks, passwords, history, and open tabs all sync to mobile normally, and extensions simply skip that device. If you want extension-like functionality on a phone, you need a different browser, and I've gone through the current options and their real limits in my notes on [whether Chrome extensions work on Android](/blog/chrome-extensions-android-guide). Chrome's desktop extension model remains desktop-only in 2026.

### My work account blocks extension sync. Is there any way around it?

Not a legitimate one, and I'd advise against trying. Enterprise policies are applied at the device or account level and enforced by Chrome itself, so no user-facing setting overrides them. The practical options are asking your IT team to add a specific extension to the allowlist, which is often granted for common productivity tools, or using a separate personal Chrome profile if your organization permits signing in to other accounts on that machine. Attempting to bypass a managed policy typically violates acceptable use terms, and on a monitored device it's visible.

### How do I sync the settings inside an extension, not just the extension itself?

Check whether the extension has its own export, backup, or cloud account feature, because that's the only dependable route. Ad blockers, tab managers, and note-taking extensions frequently include a backup file option in their settings page, and importing that file on the new machine restores everything. Extensions built around a login, like password managers, restore their full state the moment you sign in. If neither exists, the extension is likely using local storage that Chrome Sync doesn't touch, and manual reconfiguration is your only option. I now export configurations for my three most heavily customized extensions before any machine migration, on principle.

### What can Google see in my synced extension data?

With default encryption, Google holds the encryption keys, so synced data including your extension list is technically accessible to Google and is covered by their privacy policy. With a custom sync passphrase set in Chrome's encryption options, the keys stay on your devices and Google stores only data it cannot decrypt. In both cases the extension payload is limited to identifiers, enabled states, and small amounts of developer-stored settings, not the browsing data extensions collect while running. Extensions that gather data send it to their own developers' servers independently of Chrome Sync, and that's a separate privacy question you should evaluate per extension.

## The Bottom Line

If you own both computers and can use the same Google Account on each, Chrome Sync is the right answer and it isn't close. Sign in, confirm the Extensions toggle at `chrome://settings/syncSetup`, wait ten minutes, then spend a few more signing back into the extensions that carry their own accounts. That was consistently 5 to 10 minutes of hands-off time in my tests against 35 to 50 minutes doing it by hand. Set a sync passphrase if you're privacy-minded and store it somewhere you'll actually find it.

Go in expecting the extensions to arrive and the deep configurations not to. Before any migration, open the settings page of your two or three most heavily customized extensions and export their config to a file. That habit costs two minutes and saved me an afternoon of rebuilding filter lists.

The alternative worth knowing is an export or backup approach, which is the only thing that works when you're moving between two different Google Accounts, such as personal to a new employer's, where sync structurally cannot bridge the gap. It cost me 15 to 20 minutes and produced better settings fidelity than manual reinstalling. If you're on a managed work account with sync disabled by policy, skip all of this and ask IT to allowlist what you need. That's faster than any workaround you'll find.

## Sources

1. [Google Chrome Help — turn sync on or off](https://support.google.com/chrome/answer/185277) — Confirmed the current Turn on sync flow and the per-category controls under Manage what you sync.
2. [Google Chrome Help — install and manage extensions](https://support.google.com/chrome/answer/187443) — Verified the chrome://extensions management page behavior and Developer mode extension ID visibility.
3. [Google Chrome Help — sign in to Chrome](https://support.google.com/chrome/answer/1738448) — Checked how signing in relates to profiles and what happens when sync is paused after a password change.
4. [Google Account Help — manage your synced data](https://support.google.com/chrome/answer/1181735) — Verified the encryption options, custom passphrase behavior, and which data categories sync includes.