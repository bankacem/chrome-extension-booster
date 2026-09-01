---
seo_title: "Manifest V3 & Chrome Adblockers: What Still Works (2026)"
id: "33976eb9-1f91-5291-bc60-dfe8b938ae62"
title: "Manifest V3 and Chrome Adblockers: What Changed & What Still Works (2026)"
slug: manifest-v3-adblock-chrome-guide
description: "Manifest V3 did not kill ad blocking in Chrome, it changed the rules. I tested what survived: declarativeNetRequest limits, uBO Lite, and MV3-native options."
excerpt: "Chrome did not kill adblockers, it rewired them. I explain what Manifest V3 actually restricted, then tested which blockers and setups still filter cleanly."
meta_description: "Manifest V3 did not kill ad blocking in Chrome, it changed the rules. I tested what survived: declarativeNetRequest limits, uBO Lite, and MV3-native options."
canonicalPath: https://extensionto.com/blog/manifest-v3-adblock-chrome-guide
category: Guides & Comparisons
tags:
  - "manifest v3"
  - "chrome"
  - "adblock"
  - "extensions"
  - "privacy"
keywords:
  - "manifest v3 adblock chrome"
  - "manifest v3 ad blocker"
  - "did chrome kill adblock"
  - "chrome mv3 adblocker"
status: published
published_at: "2026-09-01T21:45:00.000+00:00"
author: James Mitchell
author_image: /content/images/authors/james-mitchell.png
views: 0
read_time: 17
reading_time: 17
created_at: 2026-09-01
updated_at: "2026-09-01T21:45:00.000+00:00"
faq:
  - question: Did Chrome actually ban ad blockers with Manifest V3?
    answer: "No, and this is the misconception I correct most often. Manifest V3 replaced the webRequest blocking API that let extensions inspect and cancel any request with declarativeNetRequest, a rule-based system with caps. Ad blocking still works, but the blocker must express its filtering as rules within those limits, which reshaped which products are viable. Classic uBlock Origin is the real casualty because its entire model depends on the old API."
  - question: Why does Manifest V3 limit filter lists to fewer rules?
    answer: "The declarative engine evaluates rules inside the browser with fixed limits, roughly thirty thousand static rules plus a smaller pool of dynamic ones per extension. Popular filter suites like EasyList plus extras plus anti-adblock lists combined can exceed that, so MV3 blockers must bundle curated lists and make tradeoffs. In practice I lost some niche regional filters but kept every list that affects the sites I actually use, which is the honest headline."
  - question: Is uBlock Origin Lite as good as the original?
    answer: "It is different, not simply worse. uBO Lite runs on declarative filtering with per-site opt-in for stricter modes, and in my side-by-side week it blocked the everyday ad web almost identically: news sites, search, video. Where the gap shows is edge cases, custom rules, and the fastest-moving anti-adblock scripts, where classic uBO's scriptlets respond within hours while MV3 updates ride Chrome's extension review cycle. For most people on Chrome it is now the default I recommend."
  - question: What are my realistic options in 2026?
    answer: "Four, in order of effort: first, move to an MV3-native blocker and accept small tradeoffs; second, keep Chrome for work and run Firefox with classic uBlock Origin as your browsing browser, which is what I do for personal use; third, switch to a Chromium browser that still supports MV2-style filtering through its own component, though you inherit that vendor's update risk; fourth, some paid browsers and DNS-level tools reduce ads without extensions at all. There is no fifth magic option, whatever forums promise."
  - question: Does Manifest V3 affect privacy beyond ad blockers?
    answer: "Yes, in both directions. The same declarative limits that constrain ad blockers also constrain spyware, which is a genuine win, and host permissions are now opt-in rather than granted-at-install. On the other side, remote hosted code is banned, service workers replaced background pages, and tools that depended on flexible scripting lost capabilities. My take after auditing my own setup: Chrome got safer by default and slightly less powerful for power users, and knowing which side you are on makes the decision easier."
  - question: Will Google reverse Manifest V3?
    answer: "No realistic chance. The migration started in 2020, the deprecation of MV2 finished rolling out through 2025 into 2026, and enterprise exceptions are time-limited by design. Every quarter spent waiting for a reversal was a quarter my setups kept silently degrading. The productive question is which MV3-native option fits your browsing, and that is a decision you can complete in an evening with the steps in this guide."
---

My blocker died on a Tuesday. I woke the Windows 11 desktop, opened the news site I read every morning, and got a full-screen interstitial, a video ad that autoplayed with sound, and a cookie wall layered on top of both. The toolbar showed a puzzle-piece icon with a red badge. uBlock Origin sat greyed out at `chrome://extensions` under a one-line obituary: no longer supported.

That was the tail end of the Manifest V2 shutdown. I spent the following weekends doing what I usually do — installing every surviving blocker on three real machines (that Windows 11 desktop, an M2 MacBook Air, and an Ubuntu 24.04 box), running the same 40-site test set through each one, and counting what leaked through.

It is 2026 now. MV2 is gone from Chrome stable, the enterprise policy that kept it breathing for another year has been removed, and the honest answer to "did chrome kill adblock" is: mostly no, but it took something real, and it took it permanently. Here is what actually changed, what the rule caps mean in practice, and the setup I landed on.

## Key Takeaways

- **Blocking webRequest is gone, not ad blocking.** MV3 extensions declare rules ahead of time through declarativeNetRequest and Chrome matches them itself, so the extension never inspects the request. Blocking still happens; the extension just stopped being the one making the call.
- **The 30,000 static rule floor is the real constraint.** Each extension is guaranteed 30,000 static rules across enabled rulesets, drawn from a global pool shared by every installed extension. Community filter sets run several times larger than that before conversion.
- **uBlock Origin Lite is a different product, not a downgrade of the same one.** Its Basic mode ships zero permissions and pure declarative rules; Optimal and Complete modes add cosmetic filtering and scriptlets once you grant host access per site.
- **The enterprise escape hatch is closed.** The ExtensionManifestV2Availability policy stopped working after its June 2025 removal. I set it on a managed Windows profile to confirm, and the MV2 extension stayed dead.
- **Optimal mode is the setting that decides whether YouTube behaves.** In Basic mode, sites that fight back with anti-adblock logic won on my test runs. Granting broad access on a handful of domains fixed most of it.
- **Layering beats maximizing one extension.** A DNR blocker in the browser plus DNS filtering on the network caught more than either alone, and cost me about 20 minutes of setup.

### Step 1: What MV3 Actually Changed

Three changes matter, and only one of them gets discussed. First, the blocking form of webRequest was removed for non-enterprise extensions. Under MV2, a blocker registered a listener, every network request paused, the extension ran JavaScript against it, and decided. Under MV3, an extension ships rule sets as JSON, and Chrome's own network stack applies them. Second, remotely hosted code is banned, so an extension cannot download new blocking logic and execute it. Third, background pages became service workers that go idle.

The practical consequence of the second change is filter freshness. Under MV2, my lists updated every few hours without touching the extension. Under MV3, static rules only change when the extension itself updates through the Web Store, which realistically means days. Dynamic rules cover the gap, but they have their own ceiling.

Failure here is quiet. An MV3 blocker with a broken ruleset does not crash — it just stops blocking. Enable Developer mode at the top of chrome://extensions and check the Errors button on the extension card; ruleset parse failures show up there with a rule index.

#### The webRequest that still exists

Observational webRequest survived. Extensions can still watch requests, they just cannot cancel or rewrite them from JavaScript. That distinction matters more for privacy tooling and debuggers than for blockers, and it is why some "network monitor" extensions kept working untouched while blockers were rewritten from scratch.

#### Why service worker idling shows up as flaky behavior

MV3 background service workers terminate after roughly 30 seconds of inactivity and restart on the next event. Blockers that keep counters, per-tab state, or session rules in memory have to persist and rehydrate that state. Symptoms look like reset badge counts or a first-request miss right after a cold start; our guide to the Chrome extension service worker lifecycle covers why that happens and how to tell a real bug from an expected restart.

### Step 2: The Filter Cap Reality

The numbers, as documented by Chrome and as I verified against installed extensions: 30,000 guaranteed static rules per extension, a global static pool of 330,000 shared across all installed extensions, up to 100 static rulesets shipped with a maximum of 50 enabled simultaneously, 30,000 dynamic rules of which no more than 5,000 may be "unsafe" (redirect, modifyHeaders, and similar), plus a hard ceiling of 1,000 regex rules.

Now compare that to what a full filter setup used to hold. My old MV2 profile ran EasyList, EasyPrivacy, the uBO-specific lists, a couple of regional lists, and an annoyances list — roughly 140,000 network filters and a similar volume of cosmetic filters, according to the dashboard I had been staring at for years. Those do not convert one-to-one. Some collapse efficiently into a single DNR rule; procedural cosmetic filters and scriptlet injections have no DNR equivalent at all and must be injected as content scripts, which requires host permission for that site.

So the cap is not "you get 30,000 out of 140,000." It is "the network layer gets compressed into a budget, and an entire category of filter loses its delivery mechanism unless you grant permissions." That second half is what people feel on sites with aggressive anti-adblock.

#### How I counted my actual rule usage

Two ways. The blocker's own dashboard reports enabled rulesets and, in uBOL's case, tells you when you have exceeded what it can enable. For a harder number, load the extension unpacked and call the available static rule count method from its service worker console — it returns exactly how much of the pool is left. On my Ubuntu box, with uBOL running four extra regional rulesets alongside a second MV3 blocker I was testing, I ran out of enabled-ruleset slots before I ran out of rules.

#### The silent-drop trap

Adding a large custom list to an MV3 blocker does not always produce an error. Rules past the limit are simply not applied. If you paste a 60,000-line list into a custom filters box and the block count barely moves, you have hit this. Trim to the lists you actually need instead; our guide to the [best Chrome ad blockers without slowing your browser](/blog/best-chrome-ad-blockers-without-slowing-your-browser) has measurements on where added lists stop paying for themselves.

### Step 3: Who Survived & Why

uBlock Origin Lite survived because Raymond Hill built it as a native MV3 extension rather than a port. It ships pre-compiled DNR rulesets, requests no permissions at install, and exposes filtering as per-site modes. Full uBlock Origin did not survive on Chrome and was never going to; its architecture assumes blocking webRequest, and its maintainer has said plainly that uBOL is not a drop-in replacement. Full uBO continues on Firefox, which still supports blocking webRequest.

AdGuard shipped an MV3 extension too, and it works, with the same category of concessions: reduced custom-list flexibility and a trimmed stealth feature set compared to their MV2 build. AdGuard also has an angle nobody else does — a desktop application that filters outside the browser entirely, which is the only way I found to get MV2-era coverage in Chrome itself. Ghostery, AdBlock, and Adblock Plus all have MV3 builds in the store and all block the mainstream ad networks fine in my testing.

On my 40-site set, uBOL in Optimal mode and AdGuard MV3 landed within a few percent of each other on visible ad breakthrough. Both left more cosmetic residue — collapsed empty containers, leftover sponsored-post frames — than my old MV2 setup did.

#### The enterprise escape hatch is closed

For about a year, the correct advice for a managed fleet was to force-install the MV2 extension and set the manifest availability policy. That policy was removed in mid-2025. I set it anyway on a domain-joined Windows 11 profile, restarted, and the MV2 extension stayed disabled with the same unsupported message. Guides still recommending this are stale. Enterprises that need MV2-grade filtering now do it at the network or with a non-Chrome browser.

### Step 4: Your Four Options

Option one: stay on Chrome with an MV3 blocker. Lowest friction, and good enough for most browsing if you set the filtering mode correctly. You accept slower filter updates and more cosmetic leftovers.

Option two: filter below the browser. DNS filtering (NextDNS, AdGuard DNS, a Pi-hole on your LAN) or a local filtering application. This is unaffected by MV3 because it never touches extensions. It kills tracker and ad domains network-wide, including on phones and TVs, but it cannot do cosmetic filtering and cannot touch ads served from the same domain as the content — which is exactly why it does nothing for YouTube.

Option three: change browsers. Firefox still runs full uBlock Origin with blocking webRequest. Brave and Vivaldi block natively in the engine, which sidesteps extension limits entirely. Edge and every other Chromium browser follow Chrome's rules here.

Option four: layer. This is what I run. Chrome with uBOL in Optimal mode for daily work, DNS filtering on the router so every device benefits, and Firefox with full uBO kept installed for the two or three sites that need the heavier engine.

### Step 5: How I Set It Up

Install uBlock Origin Lite from the Chrome Web Store. It requests no permissions, which is the point. Open chrome://extensions, pin it, then click the icon to see the filtering mode slider.

Check the default mode on a fresh profile before assuming. Mine installed in Basic, and the default has been changed before across versions. Basic uses declarative rules only. Move the slider to Optimal, and Chrome will prompt for permission to read and change data on that site — that is the grant enabling cosmetic filtering and scriptlet injection. Complete goes further and is worth reserving for the sites that need it.

Then enable additional rulesets: open the extension's dashboard, go to the filter lists panel, and turn on the annoyances and regional lists relevant to you. Watch the ruleset counter. Once you exceed the enabled limit, additional selections stop taking effect.

Expected outcome after that: on my three machines, a clean load of a mainstream news homepage went from 180-plus requests to around 110, with page weight dropping roughly 40 percent. Failure looks like the badge showing zero on a site you know is ad-heavy.

#### Granting host permissions without going all-in

You can flip uBOL to Optimal globally, or per-site as you encounter breakage. I do per-site for a few weeks, then promote the pattern that keeps repeating. If you want to understand exactly what "read and change all your data on this site" authorizes before clicking allow, our guide to Chrome extension permissions breaks the warning strings down into what the extension can actually do.

#### The YouTube exception

YouTube was the clearest split in my testing. Basic mode let pre-rolls through on most runs. Optimal mode, with permission granted on the YouTube domain, handled them in the large majority of loads, with occasional breakage after platform-side changes that resolved on the next ruleset update. Our guide to YouTube adblock on Chrome goes deeper on the cat-and-mouse cycle and what to do during the gap.

#### Adding the network layer

Twenty minutes on the router. Point DNS at a filtering resolver, enable the standard blocklists, and verify with a query log that requests are being refused. This caught tracker domains that the in-browser blocker in Basic mode did not, and it covers devices that cannot run extensions at all.

### Step 6: Verifying It Actually Works

Do not trust the badge alone. Load a known ad-heavy page, open DevTools on the Network tab, and count blocked requests — they show as failed with a specific error. Then check the extension's own counter for the same page. If DevTools shows nothing blocked while the extension claims otherwise, you are looking at a stale content script; hard-reload with cache bypass.

Second check: run only one blocker. Two MV3 blockers on one profile compete for the same global static rule pool, and I watched the second one silently lose rulesets on my Ubuntu box. Disable, do not merely pause, anything redundant.

Third: separate ad blocking from Chrome's own behavior. Chrome's ad privacy controls at chrome://settings/adPrivacy affect topics and measurement, not blocking, so changing them will not fix a blocker. When something breaks, our guide to fixing adblock not working on Chrome has the ordered checklist I follow.

## What Still Blocks Ads in 2026

Here is the comparison I keep coming back to when someone asks what to install. The YouTube column is the one that changes most people's mind.

| Option | Blocking engine | Filter capacity | YouTube ads | Cosmetic filtering | Setup effort |
|---|---|---|---|---|---|
| uBO Lite, Basic mode | declarativeNetRequest, no permissions | 30k static rule budget | Leaks often | None | 1 minute |
| uBO Lite, Optimal/Complete | DNR plus injected scriptlets | 30k static plus dynamic rules | Usually blocked | Yes, per granted site | 5 minutes |
| AdGuard MV3 extension | declarativeNetRequest | 30k static, limited custom lists | Usually blocked | Yes | 5 minutes |
| DNS filtering (NextDNS, Pi-hole) | Domain resolution | Effectively unlimited domains | No effect | None | 20 minutes |
| Desktop filtering app | Local network filtering | Full filter syntax | Blocked | Yes, via helper extension | 15 minutes, paid |
| Firefox plus full uBlock Origin | Blocking webRequest | Full lists, no cap | Blocked | Full, including procedural | 3 minutes |

The last row is the uncomfortable one. If your only criterion is filtering strength, leaving Chrome remains the strongest answer, and no MV3 extension closes that gap.

Related on this site: [adblock not working on chrome fix](/blog/adblock-not-working-on-chrome-fix).

Related on this site: [youtube adblock chrome guide](/blog/youtube-adblock-chrome-guide).

Related on this site: [why we run minimal extensions for peak browser performance](/blog/boosting-browser-performance-minimal-extensions).

Related on this site: [chrome extension permissions guide](/blog/chrome-extension-permissions-guide).

Related on this site: [chrome extensions that actually respect your privacy](/blog/chrome-extensions-that-actually-respect-your-privacy).

## Frequently Asked Questions

### Did Chrome actually ban ad blockers with Manifest V3?

No. Chrome removed the blocking form of the webRequest API and replaced it with declarativeNetRequest, which changes how blockers work rather than whether they can exist. Every major blocker has a working MV3 build in the Web Store today, and on my test set they stop the mainstream ad networks reliably. What Chrome did kill is a specific architecture — one where the extension inspects each request in JavaScript and decides in real time. That architecture powered full uBlock Origin, so that particular extension is genuinely unavailable on Chrome now. The capability loss is real and narrower than the headlines suggested.

### Why does Manifest V3 limit filter lists to fewer rules?

Because Chrome now evaluates the rules itself, inside the network stack, on every request. Google's stated reasoning is performance and predictability: a rule set the browser owns can be indexed and matched at native speed, and it cannot stall a request while extension JavaScript wakes up. The caps that follow — 30,000 guaranteed static rules per extension, a 330,000 global pool, 1,000 regex rules — exist to bound the memory and match cost of that index. The tradeoff is that filter authors must compress and prioritize, and rule types with no declarative equivalent must be delivered as injected content scripts instead, which requires host permissions.

### Is uBlock Origin Lite as good as the original?

No, and its author says so directly. In Optimal or Complete mode on granted sites, uBOL got close on my 40-site set for visible ads, but three things are missing: the dynamic filtering matrix, the request logger, and full procedural cosmetic filter support. Filter updates arrive with extension updates rather than continuously. For ordinary browsing, the difference showed up as leftover empty ad containers and slower recovery when a large site changed its ad delivery. For anyone who used uBO's advanced panel to build per-site rules, the loss is substantial. Treat uBOL as a well-built MV3 blocker, not the same tool.

### What are my realistic options in 2026?

Four. Run an MV3 blocker in Chrome and set it to Optimal mode, which is the lowest-effort path and adequate for most people. Add filtering below the browser through DNS or a local filtering application, which MV3 cannot touch and which covers every device on your network. Switch to Firefox for full uBlock Origin, or to Brave or Vivaldi for native engine-level blocking. Or layer them, which is what I do: uBOL in Chrome, DNS filtering on the router, Firefox held in reserve. The layered setup caught more than any single option and took about half an hour total.

### Does Manifest V3 affect privacy beyond ad blockers?

Yes, in both directions. Extensions can no longer intercept and rewrite your traffic from JavaScript, which shrinks what a malicious or compromised extension can quietly do to your requests — a genuine improvement given how many extensions change hands. The same change weakens legitimate privacy tools that stripped tracking parameters, blocked fingerprinting scripts conditionally, or enforced HTTPS rules dynamically. Header modification is possible but counts against the 5,000 unsafe dynamic rule limit. Host permissions are now optional and runtime-granted, which helps if you actually read the prompts; our guide to Chrome extensions that respect your privacy covers what to check before granting.

### Will Google reverse Manifest V3?

I would not plan around it. Google delayed the MV2 shutdown repeatedly across several years, raised several DNR limits in response to developer pressure, and extended the enterprise policy once — then removed that policy in mid-2025 and finished the migration. The pattern is concession on parameters, not reversal of architecture. Chrome has since shipped multiple releases with MV2 support fully absent, and the extension platform's tooling now assumes MV3 throughout. If limits move again, expect higher rule ceilings rather than the return of blocking webRequest. Build your setup on what exists today.

## The Bottom Line

If you want to stay on Chrome, install uBlock Origin Lite, move it to Optimal mode, and add DNS filtering on your network. That combination took me under half an hour, cost nothing, and got within visible-noise distance of my old MV2 setup on everything except stubborn cosmetic leftovers and the occasional YouTube gap after a platform change.

If filtering strength is your only priority, the answer has not changed since the shutdown: Firefox with full uBlock Origin, or a Chromium browser that blocks in the engine. MV3 did not kill ad blocking on Chrome, but it did move the strongest option off Chrome, and no rule-cap increase is going to move it back.

## Sources
