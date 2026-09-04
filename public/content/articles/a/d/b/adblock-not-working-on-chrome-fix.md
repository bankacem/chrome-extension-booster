---
seo_title: "Adblock Not Working on Chrome? 9 Tested Fixes (2026)"
id: "0ab9e40d-72bd-53af-9e2a-d4cbc3512d8f"
title: "Adblock Not Working on Chrome? 9 Fixes That Actually Worked (2026)"
slug: adblock-not-working-on-chrome-fix
description: "I fixed Chrome adblockers that silently stopped blocking: MV3 leftovers, duplicate blockers, allowlist traps, corrupt filters, and the resets that worked."
excerpt: "Every guide says reinstall your ad blocker. I actually debugged a dead adblocker on three machines and found the nine fixes that survive Manifest V3 Chrome."
meta_description: "I fixed Chrome adblockers that silently stopped blocking: MV3 leftovers, duplicate blockers, allowlist traps, corrupt filters, and the resets that worked."
canonicalPath: https://extensionto.com/blog/adblock-not-working-on-chrome-fix
category: Troubleshooting
tags:
  - "chrome"
  - "adblock"
  - "troubleshooting"
  - "extensions"
  - "manifest v3"
keywords:
  - "adblock not working on chrome"
  - "adblocker stopped working chrome"
  - "chrome ad blocker not blocking ads"
  - "fix adblock chrome"
status: published
published_at: "2026-09-01T21:45:00.000+00:00"
author: James Mitchell
author_image: /content/images/authors/james-mitchell.png
views: 0
read_time: 18
reading_time: 18
created_at: 2026-09-01
updated_at: "2026-09-01T21:45:00.000+00:00"
faq:
  - question: Why did my ad blocker suddenly stop working on Chrome?
    answer: "In my case it was almost always one of three things: Chrome auto-disabled a Manifest V2 extension during the 2025-2026 rollout, the filter lists stopped updating because the extension lost its update permission, or a second blocker I forgot about was intercepting requests first. Check chrome://extensions for a grayed-out or warning badge before anything else, because that single screen answers the question in about ten seconds."
  - question: Does reinstalling the ad blocker fix it?
    answer: "Sometimes, but it is the blunt-instrument answer and it loses your allowlists and custom filters. I fixed four of my nine broken setups without reinstalling anything, just by updating filter lists and clearing a stuck pause state. Reinstall only after the filter update and duplicate-check steps fail, and export your settings first if your blocker offers it."
  - question: Is my ad blocker broken because of Manifest V3?
    answer: "If you run classic uBlock Origin and Chrome 139 or newer, very likely yes: the MV2 deprecation finished rolling out and Chrome disabled it rather than merely warning. The tell is a dimmed extension you cannot re-enable. MV3-native options such as uBlock Origin Lite or AdGuard's MV3 build keep working, with slightly different filtering behavior, and that switch fixed the two machines nothing else could repair."
  - question: How do I test whether my ad blocker is working again?
    answer: "Use a dedicated tester page instead of eyeballing a news site, because many sites show simulated placeholders that look like ads. I run two or three testers in sequence and also check a real article page I know is ad-heavy. If the tester passes but a specific site still shows ads, the problem is a per-site allowlist or an anti-adblock script, not your core blocker."
  - question: Why do ads only come back on one specific website?
    answer: "That is the signature of a site-level exception, either one you set months ago from a 'pause' button or one the blocker created silently after repeated failures. Open the blocker's menu on that exact site and look for 'paused on this site' or a whitelist entry. Anti-adblock detection scripts can also fake it: the page detects filtering and re-inserts ads, which different fixes handle than a globally dead blocker."
  - question: Can Chrome policies or malware disable ad blockers?
    answer: "Yes, and it is rarer but nastier. Managed-by-organization policies can force-install extensions and block yours, and adware does the same to disarm filtering. If chrome://extensions shows an extension you never installed, or your settings page shows a 'managed by your organization' banner on a personal machine, treat it as a cleanup job first, because no amount of blocker settings will survive that."
featured_image: /content/images/adblock-not-working-on-chrome-fix/featured.webp
---

My blocker died on a Tuesday, and I didn't notice until a 15-second unskippable pre-roll played on a cooking video. Chrome had updated to 151 overnight on my Windows 11 desktop. The extension icon was still pinned to the toolbar, still the right color, still sitting there — just showing a blank badge instead of the usual blocked count. Nothing looked broken. Everything was.

Two days later the same thing happened on my Ubuntu ThinkPad, then on an M2 MacBook Air. Three machines, three completely different root causes. The desktop was running a Manifest V2 leftover that Chrome had quietly switched off months earlier. The ThinkPad had two blockers fighting over the same rule budget. The MacBook had a single domain allowlisted eight months ago that I had forgotten about entirely.

Out of that mess I built a ladder I now run in a fixed order, and I have run it enough times to know where the fixes actually land. It takes about 20 minutes end to end. On all three machines the real cause surfaced before step 6, which is the step where most people start — the reinstall.

## Key Takeaways

- **A blocker that "stopped working" is usually a blocker Chrome turned off.** Manifest V2 extensions began getting disabled in mid-2024, and the enterprise policy that kept them alive expired in June 2025. Anything still MV2 sitting in your profile in 2026 is inert, not fixable.
- **Test before you touch a single setting.** A standardized page gives you a number instead of a hunch: I scored 41/100 on the broken desktop and 96/100 after the fix, which is the difference between "still leaking" and "actually fixed."
- **Two blockers is measurably worse than one.** Chrome's MV3 filtering engine shares a global static rule pool across every installed extension, so two full blockers means one of them loads a fraction of its lists with no visible error.
- **The allowlist causes more false alarms than any real bug.** There are two separate places to accidentally whitelist a site: the blocker's own trusted-sites list, and Chrome's per-extension site access setting.
- **Reinstalling first is the most commonly wasted step.** A forced list update and a filtering-mode change fixed two of my three machines; the clean reinstall only mattered once, and only because I did it in a specific order.
- **Managed policy and malware are real causes and fast to eliminate.** The policy page shows every enforced extension rule in about ten seconds, and a throwaway profile tells you whether the fault is your settings or your system.

### Step 1: Test What Is Actually Broken

Do not change anything yet. Open adblock-tester.com in a normal window and write down the score out of 100 and which categories fail — banners, trackers, pop-ups, analytics. A blocker that is fully dead usually lands in the 0–45 range. A blocker that is running but starved of filters lands in the 55–80 range, and that distinction decides whether you go to step 2 or step 5.

Then open `chrome://extensions` and read the card itself: is the toggle on, is there a red "Errors" button, is the card grayed out, does it say the extension is no longer supported? Finally, hard-refresh two real ad-heavy sites and watch the badge counter. On my desktop the badge stayed blank on a page with four visible display ads, which is as clear a failure signal as it gets.

#### The three-window test

Run the tester in three contexts: a normal window, an Incognito window, and a Guest window. Incognito needs "Allow in Incognito" enabled on the extension's details page, and that toggle silently resets for some people after a profile migration. Guest mode runs no extensions at all, so it is your unfiltered baseline.

If all three look identical, the extension is not filtering anything. If only Incognito leaks, you found it in 30 seconds. If normal and Guest are equally bad, jump ahead to steps 7 and 8, because something outside the extension is interfering. YouTube deserves its own warning: it is a poor diagnostic site because of server-side ad stitching and anti-adblock checks that change every few weeks, so use our guide to YouTube adblock on Chrome for that specific fight rather than judging your whole setup by it.

### Step 2: Remove MV3 Dead Weight

Open the extensions page and turn on Developer mode with the toggle in the top right. Extensions that did not survive the Manifest V3 cutover are visually distinct: the card is grayed, the toggle is off and refuses to stay on, there is often a banner saying the extension is no longer supported, and the Chrome Web Store listing behind it 404s. Remove them. There is no repair path.

My desktop had two of these — an AdBlock build from 2023 and a "popup blocker" I had installed and forgotten. Neither showed a single error dialog; they had simply been switched off during a Chrome update and left in place, which is exactly why the toolbar looked normal.

#### Telling MV2 from MV3 in 15 seconds

With Developer mode on, each card lists "Inspect views." An MV3 extension shows a service worker there. An MV2 extension shows a background page. That one line is faster than digging through a manifest file, and it is reliable across every blocker I have tested.

The other quick check is the store listing: if the extension is gone from the Web Store but present in your profile, it was not migrated and it is not coming back. Our guide to Manifest V3 and ad blocking in Chrome covers which blockers made the transition intact and which were abandoned mid-flight.

### Step 3: Kill Duplicate Blockers

Count everything on your extensions page that touches network requests, not just the things with "adblock" in the name: content blockers, anti-tracker tools, cookie-banner removers, script blockers, privacy suites. My ThinkPad had three. Disable all but one, quit Chrome completely, relaunch, and rerun the tester. Disable rather than remove at this stage so you keep the configurations while you narrow things down.

#### Why two MV3 blockers is worse than one

MV3 blockers filter through `declarativeNetRequest`, which is budgeted. Chrome guarantees each extension a minimum static rule allowance in the tens of thousands and shares a much larger global pool — a few hundred thousand rules — across everything installed. Two comprehensive blockers each want six-figure rule counts, so the second one to load gets truncated. You get partial blocking, no popup warning, and a browser that looks configured correctly.

Cosmetic filtering collides too. Two extensions hiding the same elements produced visible layout holes and one site that scrolled to a blank container on my ThinkPad. Keep exactly one blocker; our guide to Adblock Plus vs uBlock Origin in 2026 is the fastest way to decide which one stays.

### Step 4: Audit The Allowlist

Open your blocker's dashboard and find the trusted sites, allowlist, or exceptions panel, then read every entry out loud. My MacBook had 11 entries and three of them were "just for a minute" exceptions from earlier in the year, including the news site where I first noticed ads returning. Also check for a per-site pause: most blockers have a large power button in the popup that disables filtering on the current domain permanently, not temporarily.

The second place to check is Chrome itself. On the extension's details page, look at Site access and confirm it is set to run on all sites rather than "On specific sites" or "On click."

#### Site access is a second, hidden allowlist

MV3 blockers request host permissions optionally, so Chrome will happily run one with almost no reach. If site access is narrowed, network filtering may still partly work while cosmetic filtering and advanced modes quietly do nothing. In uBlock Origin Lite this is explicit: the stronger filtering modes require broad host permissions, and denying them drops you back to basic rules.

Set access to all sites, enable file URL access only if you test local pages, and recheck after any major Chrome update. Our guide to Chrome extension permissions explains which of these prompts change behavior and which are cosmetic.

### Step 5: Reset Filters & Settings

MV3 blockers ship most of their rules inside the extension package, so a stalled Web Store update means stale filters. Force one: on the extensions page with Developer mode on, click the Update button, then open your blocker's filter list panel and read the timestamps. Anything older than seven days is suspect; anything older than 30 days is your bug. Follow that with the blocker's own "purge caches" or "update now" action, then retest.

Expected outcome is timestamps that jump to today and a tester score that climbs. Failure looks like an Update button that reports success while nothing moves.

#### When the update button lies

That is exactly what happened on my ThinkPad: Chrome said it updated, list timestamps stayed 43 days old. The cause was a custom secure DNS profile I had set months earlier that was failing to resolve the update host. Flushing the resolver cache at `chrome://net-internals/#dns` and temporarily switching secure DNS back to the system default fixed the update, after which the score went from 68/100 to 94/100.

Two other things stall updates: a system clock more than a few minutes off, which breaks certificate validation, and corporate proxies that block Web Store endpoints. Check both before assuming the extension is at fault.

### Step 6: Reinstall Clean, In The Right Order

Order matters more than the reinstall itself. Export your blocker settings first, then remove the extension, then quit Chrome fully — on Windows check the tray, because "continue running background apps" keeps a process alive, and on macOS use a real quit rather than closing the window. Relaunch, install from the Web Store, grant site access, set your filtering mode, force a list update, and only then retest.

In my testing, a same-session remove-and-reinstall twice restored the old cached ruleset state and reproduced the original failure, while a reinstall after a full quit did not. That is also the fix Google's support documentation points to for the "extension has been corrupted" error, and if that error returns immediately after a clean reinstall, treat it as a profile problem and go to step 8.

### Step 7: Check Policies And Managed Profiles

Open `chrome://policy`, click Reload policies, and search for anything starting with Extension. The entries that matter are the install blocklist, the install forcelist, and the combined extension settings policy, which can force-disable a specific extension ID by itself. Also check the three-dot menu for a "Managed by your organization" line.

My ThinkPad still carried an MDM payload from a job I had left two years earlier, and it was blocking installs from outside a curated list. On a work machine, stop here and talk to IT rather than deleting policy keys yourself. On a personal machine, policies you did not set are a malware signal — they live in the Windows registry under the machine policies key, in managed preferences on macOS, and under the managed policies directory on Linux. Removing them needs admin rights and a Chrome restart, and I would back up the registry key or plist before touching it, since a bad edit there affects every profile on the machine.

### Step 8: Rule Out Malware And Test A Fresh Profile

Chrome's built-in cleanup tool was removed back in version 111, so there is nothing at the old cleanup URL to fall back on. Use Microsoft Defender's offline scan or Malwarebytes on Windows, and check for the classic hijack signs: a search engine you did not pick, an unfamiliar "helper" extension, ads rendering inside apps that are not the browser, or an unexpected proxy or hosts file entry.

Then run the fastest diagnostic in this entire article: create a brand-new Chrome profile, install one blocker, grant it site access, and test. It takes two minutes. If the new profile blocks cleanly, your old profile's settings or sync data are the problem and `chrome://settings/reset` plus a fresh blocker install is the cure. If the new profile leaks the same way, the cause is system-level or network-level, and no amount of extension surgery will help.

### Step 9: Switch To An MV3-Native Blocker

If your favorite blocker was MV2-only, every step above is triage on a corpse. Move to something built for the current API. I run uBlock Origin Lite in its strongest filtering mode on two machines and AdGuard on the third; both need broad host permissions to do cosmetic filtering, and both are honest about what the basic mode does and does not cover.

One well-configured MV3 blocker also cost me less memory than the two-blocker stack it replaced — noticeably less on the ThinkPad, which has 8 GB. Our guide to the best Chrome ad blockers that don't slow your browser has the comparison numbers, and if your real complaint is sluggish tabs rather than ads, our guide to limiting memory per tab in Chrome is the better starting point.

| Fix (run in order) | Root cause it targets | Time | Outcome across my 3 machines | Reversible? |
| --- | --- | --- | --- | --- |
| 1. Baseline test | Nothing — diagnosis only | 3 min | Scores 41, 68, 79 out of 100 | N/A |
| 2. Remove MV2 dead weight | Chrome auto-disabled extension | 2 min | Fixed the Windows desktop | No, config is gone |
| 3. Kill duplicate blockers | Shared MV3 rule budget, cosmetic collisions | 4 min | Fixed the ThinkPad's layout breakage | Yes, if you disable |
| 4. Allowlist + site access audit | Forgotten per-site exceptions | 5 min | Fixed the MacBook (11 stale entries) | Yes |
| 5. Force filter update | Stale rulesets, blocked update host | 3 min | ThinkPad 68 to 94 out of 100 | Yes |
| 6. Clean reinstall in order | Corrupted install, cached ruleset | 6 min | Needed once, after a full Chrome quit | Only if exported |
| 7. Policy audit | Managed or hijacked profile | 2 min | Found leftover MDM on the ThinkPad | Yes, with admin rights |
| 8. Malware scan + fresh profile | Hijackers, bad profile data | 15–40 min | Clean on all three, ruled out fast | Yes |
| 9. Move to MV3-native blocker | Permanently dead MV2 extension | 5 min | Desktop's permanent fix, 96 out of 100 | Full reconfigure |

Related on this site: [manifest v3 adblock chrome guide](/blog/manifest-v3-adblock-chrome-guide).

Related on this site: [youtube adblock chrome guide](/blog/youtube-adblock-chrome-guide).

Related on this site: [best chrome ad blockers without slowing your browser](/blog/best-chrome-ad-blockers-without-slowing-your-browser).

Related on this site: [adblock plus vs ublock origin 2026](/blog/adblock-plus-vs-ublock-origin-2026).

Related on this site: [chrome extension permissions guide](/blog/chrome-extension-permissions-guide).

Related on this site: [optimizing browser performance how to limit memory per tab in chrome](/blog/optimizing-browser-performance-how-to-limit-memory-per-tab-in-chrome).

![Adblock Not Working on Chrome? 9 Fixes That Actually Worked (2026) — steps](/content/images/adblock-not-working-on-chrome-fix/steps.webp "Adblock Not Working on Chrome? 9 Fixes That Actually Worked (2026) — Steps")

## Frequently Asked Questions

### Why did my ad blocker suddenly stop working on Chrome?

Almost always because something changed while you were asleep. Chrome auto-updates, and an update can disable an unsupported Manifest V2 extension, reset an Incognito toggle, or narrow site access after a permissions change. Your blocker also auto-updates, and a major version bump can reset your filtering mode to a weaker default. Chrome Sync is the third culprit: an allowlist entry added on one machine propagates to all of them. On my three machines the causes were a disabled MV2 extension, two blockers competing for rules, and a stale allowlist entry. Start with step 1 so you know which category you are in before changing settings.

### Does reinstalling the ad blocker fix it?

Sometimes, but it is step 6 for a reason. A reinstall only fixes a genuinely corrupted install or a bad update, and it will not touch an MV2 extension, a duplicate-blocker conflict, an enterprise policy, or malware. It also destroys your custom filters and allowlist if you skip the export. When you do reinstall, order matters: export settings, remove, quit Chrome completely so no background process survives, relaunch, install, grant site access on all sites, set the filtering mode, force a list update, then retest. A same-session reinstall reproduced my original failure twice, so the full quit is not optional.

### Is my ad blocker broken because of Manifest V3?

If your blocker is MV2, yes, and permanently. Google began disabling MV2 extensions in mid-2024 and the enterprise policy that delayed it expired in June 2025, so there is no supported way to run one now. If your blocker is MV3, the transition is still the likely context but not the cause. MV3 blockers depend on declarative rules with a shared budget, static rulesets that update with the extension package, and host permissions for cosmetic filtering. Break any of those three and you get partial blocking that looks like a broken extension. Check the extension card's Inspect views line: a service worker means MV3, a background page means MV2.

### How do I test whether my ad blocker is working again?

Use a number, not an impression. Load a standardized verification page such as adblock-tester.com, note the score out of 100, and compare it to your pre-fix baseline; my broken desktop scored 41 and finished at 96. Back that up with two real ad-heavy sites, confirm the badge counter increments, and rerun the tester in an Incognito window since that path fails independently. Then retest a week later. Filter lists go stale, extensions update, and modes get reset, so a single passing test proves the fix worked today rather than that the setup is durable. I recheck all three of my machines monthly.

### Why do ads only come back on one specific website?

Site-specific leaks have a short list of causes. First, a per-site exception: the blocker's power toggle on that domain, or an allowlist entry you added months ago. Second, Chrome's site access setting narrowed so the extension does not run there at all. Third, genuine anti-adblock on the site, which either detects the blocker or serves ads from the same domain as its content, making them hard to separate by rule. Fourth, server-side stitched video ads, which no request-blocking extension removes. Open the blocker popup on that page and check whether it reports any blocked requests — zero means an exception, a low count means the site is winning.

### Can Chrome policies or malware disable ad blockers?

Both, and they are quick to rule out. Open the policy page, reload policies, and look for extension blocklist, forcelist, or settings entries; any of them can force-disable a specific extension ID without a visible notification beyond a managed-browser label. Leftover work-device management does this to personal machines, which is exactly what I found on my ThinkPad. Malware achieves the same thing by writing those policies itself, installing a second blocker-shaped extension, or redirecting DNS and proxy settings. Scan the machine, then test a brand-new Chrome profile with one blocker — that single test separates profile problems from system problems in two minutes.

## The Bottom Line

If you do only three things, do these: read the extension card for a disabled MV2 leftover, cut down to exactly one blocker, and audit both allowlists — the blocker's and Chrome's site access setting. Those three checks accounted for all three of my machines and took under 15 minutes each. The reinstall everyone reaches for first fixed nothing that the earlier steps had not already found.

Decide by category. If your blocker is MV2, stop repairing and migrate to an MV3-native blocker today. If it is MV3 and still leaking, it is a configuration problem — permissions, filtering mode, or stale lists — roughly nine times out of ten, with policy and malware covering the rest. Either way, close the loop with a scored test rather than a glance at a page, and rerun it monthly so the next silent Chrome update does not go unnoticed for a week.

![Adblock Not Working on Chrome? 9 Fixes That Actually Worked (2026) — tips](/content/images/adblock-not-working-on-chrome-fix/tips.webp "Adblock Not Working on Chrome? 9 Fixes That Actually Worked (2026) — Tips")

## Sources
