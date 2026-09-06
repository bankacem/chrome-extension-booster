---
seo_title: "Chrome Memory Saver Not Working? 7 Fixes (2026)"
id: "71e0918b-1b2a-519b-b4cd-a33e76425848"
title: "Chrome Memory Saver Not Working? 7 Fixes That Actually Work (2026)"
slug: "chrome-memory-saver-not-working-7-fixes"
excerpt: "Memory Saver on but RAM still climbing? Seven real fixes — profile-sync mode resets, over-broad excluded sites, extension conflicts — plus how to verify true suspension."
featured_image: >-
  /content/images/chrome-memory-saver-not-working-7-fixes/featured.webp
category: Performance & Memory
tags:
  - chrome
  - memory-saver
  - browser-performance
keywords:
  - "chrome memory saver not working"
  - "memory saver greyed out chrome"
  - "chrome not suspending inactive tabs"
  - "memory saver excluded sites"
meta_description: "Chrome Memory Saver not working? Fix profile-sync resets, over-broad excluded sites and extension conflicts, then verify real suspension in chrome://discards."
status: published
published_at: '2026-08-29T09:00:00.000+00:00'
scheduled_at: '2026-08-29T09:00:00.000+00:00'
author: James Mitchell
author_image: /content/images/authors/james-mitchell.png
views: 0
read_time: 12
created_at: '2026-08-29T09:00:00.000+00:00'
updated_at: '2026-08-29T09:00:00.000+00:00'
description: "Memory Saver on but RAM still climbing? Seven real fixes — profile-sync mode resets, over-broad excluded sites, extension conflicts — plus how to verify true suspension."
---

If Chrome's Memory Saver is switched on but your RAM keeps climbing anyway, the feature is almost never broken at random — one of five specific causes is usually blocking it: a mode reset by profile sync, an excluded-sites list that grew too broad, an extension actively fighting suspension, too many tabs that qualify as essential, or an outdated build running last year's suspension engine. All five are diagnosable in about ten minutes with two built-in pages: `chrome://settings/performance` to inspect the mode and site rules, and `chrome://discards` to see exactly what Chrome has and has not suspended. Below are the seven fixes that resolve this in the order we apply them on our own test machines, most common cause first. And if the built-in tool keeps disappointing you after all seven, our tested roundup of the [best memory saver extensions for Chrome](/blog/best-memory-saver-extension-for-chrome-4) covers third-party suspenders built to cooperate with Memory Saver rather than fight it.

## Fix 1: Profile Sync Turned Your Mode Back Off

![Chrome performance settings showing the Memory Saver mode selector](/content/images/chrome-memory-saver-not-working-7-fixes/chrome-memory-saver-not-working-7-fixes-overview.webp)

Memory Saver has three intensity levels — Inactive tabs, Moderate, and Maximum — and the selection is stored per profile, not per browser. That detail matters more than it sounds. Profile sync does not just carry bookmarks and passwords; it carries settings too, and a sync glitch, a sign-out/sign-in cycle, or a reset of Chrome Sync can quietly revert your carefully chosen Maximum mode back to the default days later, with no notification. People who share a machine between a work profile and a personal profile hit this constantly: they tune one profile in the morning, and the other profile syncs over the setting by the afternoon.

The fix itself takes thirty seconds. Open `chrome://settings/performance`, confirm the Memory Saver toggle is actually on, and check which mode is selected — Moderate is the sensible baseline for most people, Maximum if you routinely run 30 or more tabs. Then, if the setting keeps sliding back on its own: sign in to your Google account, visit `chrome://sync-internals` and force a fresh sync so the newest local value wins, and check `chrome://policy` to confirm nothing is enforcing an old value from your organization. Google documents the available modes and what each one is allowed to suspend on the [official Memory Saver help page](https://support.google.com/chrome/answer/12935751), and it is worth a skim because the thresholds are measured in hours, not minutes.

If you want the mechanics behind the setting — how Chrome scores tab activity, why the grace period exists, and what happens to service workers during suspension — our explainer on [how Memory Saver decides which tabs to suspend](/blog/chrome-memory-saver-how-it-works) walks through the full tab lifecycle.

## Fix 2: Your Excluded-Sites List Is Too Broad

Every site you told Chrome to "always keep active" is invisible to Memory Saver, and that list grows in ways most people never notice. Entries are added two ways: typed directly into the "Always keep these sites active" field under `chrome://settings/performance`, and through the small "keep this tab active" option that appears when you hover over an inactive tab — trivially easy to click absent-mindedly while closing tabs and forget about forever.

The classic failure pattern looks like this. In January, a web app misbehaves after suspension — a half-written email loses its draft, a dashboard reloads back to page one — so you add that site to the exclusion list. Six months later the list holds fifteen entries, several of them entire domains rather than specific subdomains, and at least one broad pattern like google.com that silently shields Gmail, Google Docs, Google Sheets, and Calendar from suspension all at once. With that many tabs protected, Memory Saver genuinely has almost nothing left to suspend, and it looks broken when it is in fact obeying your instructions to the letter.

Audit the list now. Open `chrome://settings/performance`, scroll to **Always keep these sites active**, and delete anything you do not recognize from the last month. Narrow whole-domain entries to specific subdomains you actually need protected — mail.example.com instead of example.com — and keep the total list under roughly ten entries; beyond that point the feature is working against itself. Pinned tabs deserve the same skepticism: they are never suspended either, so a bookmarks bar's worth of permanently pinned sites has the same memory cost as a bloated exclusion list. If trimming the list still does not restore suspension, the cause is almost always one of the next two fixes.

## Fix 3: An Extension Is Fighting Memory Saver

Tab managers, session savers, and "workspace" extensions are the prime suspects here, because they have structural reasons to keep tabs alive. Many of them re-activate tabs in the background to refresh their own previews, subscribe to tab events in ways that reset Chrome's activity timers, mark everything as pinned, or maintain frozen copies of your session that defeat the point of suspension. Constant-injection extensions — VPN clients, coupon finders, shopping assistants — add a second problem: baseline memory in every tab that no suspender, built-in or third-party, can ever reclaim.

Diagnose it in five minutes with Chrome's own Task Manager (`Shift + Esc`, or Window → Task Manager on Mac). Sort by memory and look at rows that are not tabs: an extension eating 150–300 MB while Memory Saver "does nothing" is usually your answer. Then run the clean-profile test: create a fresh Chrome profile, install nothing, open the same twenty tabs, leave the machine alone for an hour, and check `chrome://discards`. If the clean profile suspends tabs fine, re-enable your extensions in batches of three until the problem reappears — that batch is your culprit. Our deeper guide to [fixing Chrome high memory usage](/blog/how-to-fix-chrome-high-memory-usage-2026) covers the extension audit in more depth, including which categories of extensions leak on their own.

One nuance worth knowing: if you installed a third-party suspender and left Memory Saver on at the same time, the two can fight — one discards a tab, the other immediately restores or re-activates it. Pick one tool for the job. Our direct comparison of [ProTab Suspender and Google's Memory Saver](/blog/protab-suspender-vs-google-memory-saver-2026-which-saves-more-ram) measures which approach actually frees more RAM in 2026 and flags the extension combinations that conflict.

## Fix 4: Outdated Chrome, Policies, and Leftover Flags

The suspension engine is under active monthly development, and an install that has not updated in months can be running an older version with real, known bugs — tabs that stay active past their threshold, discards that fail silently, counts that never update. The check costs nothing: **Settings → About Chrome**, let it update, and relaunch when prompted. Long-lived installs that have been updated in place for years benefit the most from this, which is why it is a standing first step on every machine we service.

Two quieter blockers hide behind a healthy version number. First, enterprise policy: organizations can push a policy that forces Memory Saver off or locks it to a specific mode, and on managed laptops this is the single most common reason the toggle is grayed out. Visit `chrome://policy` — anything enforcing MemorySaverEnabled or a related setting will appear there, and only your IT department can change it. Second, leftover experiments: entries you flipped in `chrome://flags` months ago can misbehave after Chrome updates underneath them. Open `chrome://flags`, search for "memory" and "discard", and reset anything you do not actively need. If you want the safe subset — the handful of performance flags that survive version updates without breaking suspension — our guide to [Chrome flags that are safe for performance](/blog/chrome-flags-for-performance-safe-ones) keeps a tested list.

## Fix 5: Too Many Tabs Count as "Essential"

Chrome will never suspend certain tabs, by design: pinned tabs, tabs playing audio, tabs with an active download or upload, tabs where you recently typed into a form, and tabs activated within the current grace window. None of that is a bug — it is the feature refusing to destroy work you might lose. The problem is that heavy tab users accumulate essential-looking tabs much faster than they realize. A sixty-tab session where twenty-five are pinned, five are playing a podcast playlist, and the rest were all touched in the last hour leaves Memory Saver almost nothing legal to touch. Moderate mode compounds this: its thresholds are measured in hours of inactivity, so if you cycle through tabs during a workday, few of them ever age into eligibility before you return.

The fix is part cleanup, part expectation-setting. Unpin everything you have not clicked this week — pinning is for the five sites you truly live in, not the fifty you are hoarding. Prefer tab groups over pinning for organization, since grouped tabs suspend normally. Mute or pause background players instead of leaving audio-only tabs "essential." And give the feature time: switch it to Maximum, leave the machine alone for two hours, then check `chrome://discards` again rather than judging from the Task Manager an hour after boot. Our scenario-by-scenario measurements of [how much RAM Chrome actually uses](/blog/how-much-ram-does-chrome-actually-use) put concrete numbers on what "essential" tabs cost, so you can see which of yours are worth their memory.

## Fix 6: Background Settings Keep Memory High Anyway

![Chrome system settings showing background app and startup options](/content/images/chrome-memory-saver-not-working-7-fixes/chrome-memory-saver-not-working-7-fixes-steps-1.webp)

Two settings make Memory Saver look useless even when it is suspending perfectly. The first is "Continue running background apps when Google Chrome is closed" under **Settings → System**: with it on, Chrome keeps a resident process set alive after you close the last window, holding memory no tab suspender will ever reach. Turn it off unless one specific extension genuinely needs it. The second is startup behavior: with "Continue where you left off," Chrome resurrects every tab from your last session at boot — all at once, all active, before Memory Saver has had hours to age anything out. Your entire morning looks bloated not because suspension is broken but because it has not been given a chance to run yet.

Adjust both to match reality: turn background apps off, and either switch startup to "Open the New Tab page" or accept that a restored 50-tab session needs a couple of hours before suspension catches up. One more habit helps on long uptimes: restarting Chrome weekly clears the low-level memory fragmentation that accumulates in any browser over days of use — Memory Saver suspends tabs, but it does not defragment the browser's own baseline. Chrome's [help documentation on performance settings](https://support.google.com/chrome/answer/12983474) covers these switches officially if you want the canonical wording.

## Fix 7: The Gray Tab Is Working as Designed — Verify in chrome://discards

Roughly half the "Memory Saver is broken" reports we see are actually a reading problem. An inactive tab's title grays out and its favicon dims — that is the visual "inactive" signal — but gray does not guarantee the tab was actually discarded. Some grayed tabs are in a grace period, some are queued for suspension, and a few are excluded for reasons listed above. Judging the feature by tab color alone will mislead you in both directions: tabs that look dead but still hold memory, and tabs that look alive but were fully discarded and reload on click.

`chrome://discards` is the ground truth. Paste it into the address bar and you get every open tab with its real state, its discard count, and a manual action button. Learn these five states and you will never misread the feature again:

| State in chrome://discards | What it means | Memory freed? | What to do |
|---|---|---|---|
| Active | The tab is loaded and current | No | Nothing — correct behavior |
| Inactive (kept alive) | Marked inactive, still inside the grace window | Partial | Switch to a higher mode in settings |
| Unloaded / Discarded | Process killed; reloads on next click | Yes — typically 80–95% of that tab's RAM | Working as intended |
| Never suspend | You, an extension, or a policy excluded it | No | Check the excluded list and chrome://policy |
| Pending discard | Queued for suspension | Not yet | Give it time or click Discard |

Click **Discard** on any row to suspend that tab immediately — the reload happens the moment you next click into it. Pair this with the Task Manager (`Shift + Esc`) to watch total memory drop as you discard rows, and you have a complete, self-verifying loop: no more guessing whether Memory Saver is "doing anything." Note that a discarded tab can still share a renderer process with a lightweight neighbor, so its memory may not drop to exactly zero until the shared process closes — a normal artifact of Chrome's process model, not a failure.

## Frequently Asked Questions

### Does Memory Saver help if I only keep a few tabs open?

Barely, and that is expected. With five tabs open there is simply little to suspend, so judge the feature over a full day of real usage rather than a single glance. The savings scale with how many inactive tabs you accumulate — it is a hoarder's tool, not a minimalist's.

### Why does a suspended tab still show memory in Task Manager?

Two normal reasons. Several lightweight tabs can share one renderer process, and that process stays alive until every tab using it is discarded. On top of that, Chrome's browser-level overhead — GPU, network service, extensions — persists regardless of tab state, so total memory never drops to the sum of "nothing."

### Can I force Chrome to suspend a tab right now?

Yes. Open `chrome://discards`, find the tab's row, and click the Discard action — suspension is instant and the tab reloads the next time you click it. Save any unsaved form work first, because a forced discard skips the polite grace period the automatic version uses.

### Will a suspended tab lose my login or unsaved work?

Logins survive suspension because cookies and session data are untouched. The risk is unsaved form input: pages with autosave, like Docs or Notion, come back perfectly, while a half-filled form on a site without drafts may reset. That is exactly what the excluded-sites list is for — protect the pages where you type.

### Why does Chrome still show more memory than Firefox?

Chrome isolates every site in its own process for crash and security isolation, which duplicates per-process overhead across tabs — Firefox now does the same with Fission, narrowing but not erasing the difference. The honest comparison depends on your workload and which suspension each browser applies; our [Firefox vs Chrome memory measurements](/blog/firefox-vs-chrome-memory-usage-2026) break it down by scenario.

Work through these seven fixes in order and one of the first four will explain your case in the overwhelming majority of sessions. Then keep `chrome://discards` as your monthly thirty-second checkup — it settles any doubt about whether suspension is really happening, long before RAM charts give you a reason to doubt it.
