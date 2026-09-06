---
seo_title: "Tag Assistant Legacy vs Companion: 7 Migration Steps (2026)"
id: "3166ce21-a9fc-5c05-8f8b-a122e8db3eb9"
title: "Tag Assistant Legacy vs Companion: The 2026 Migration Guide"
slug: "tag-assistant-legacy-vs-companion-2026"
excerpt: "Google retired Tag Assistant Legacy in 2024. Companion replaces it with session-based debugging — what changed, how to migrate in 7 steps, which tool to use."
featured_image: >-
  /content/images/tag-assistant-legacy-vs-companion-2026/featured.webp
category: Privacy & Security
tags:
  - chrome
  - analytics
  - google-tag-manager
keywords:
  - "tag assistant legacy vs companion"
  - "tag assistant legacy deprecated"
  - "tag assistant companion download"
  - "google tag manager debugging 2026"
meta_description: "Tag Assistant Legacy is gone. Compare it with Companion in 2026, follow the 7-step migration, and learn when to use GTM Preview or GA4 DebugView first."
status: published
published_at: '2026-08-30T09:00:00.000+00:00'
scheduled_at: '2026-08-30T09:00:00.000+00:00'
author: James Mitchell
author_image: /content/images/authors/james-mitchell.png
views: 0
read_time: 12
created_at: '2026-08-30T09:00:00.000+00:00'
updated_at: '2026-08-30T09:00:00.000+00:00'
description: "Google retired Tag Assistant Legacy in 2024. Companion replaces it with session-based debugging — what changed, how to migrate in 7 steps, which tool to use."
---

Tag Assistant Companion is Google's replacement for the retired Tag Assistant Legacy Chrome extension: instead of a one-page tag check inside your browser, you get a web app plus a small desktop program that records full debugging sessions across pages, tabs, and even devices. Legacy — the extension that checked Google tags on whatever page you were viewing — was deprecated and shut down in 2024, so if your bookmarks still open it, it is gone for good. This guide explains exactly what changed and why, compares Legacy and Companion feature by feature, walks you through the seven-step migration, and maps out when to reach for GTM Preview, GA4 DebugView, or Tag Diagnostics instead. If your broader goal is auditing what analytics and marketing tools a site runs in the first place, our overview of [the best Chrome extension for analytics work](/blog/the-best-chrome-extension-for-analytics) is the natural companion read.

## What Happened to Tag Assistant Legacy

Legacy had a long run. Launched in the early 2010s as a simple tag inspector, it grew into the default way marketers verified Google Analytics and Google Ads tags, eventually adding a Recordings feature for checking tags across multi-page flows. Its architecture, however, was tied to the old Chrome extension model, and two forces made it obsolete: Google Analytics' move to GA4 (whose event-based model Legacy's checks were never designed for) and Chrome's extension platform changes that broke the injection approach Legacy relied on. Google deprecated the Legacy extension in 2023 and discontinued it in 2024, redirecting everyone to the new Tag Assistant.

| Date | Event | What it meant for you |
|---|---|---|
| 2012–2016 | Tag Assistant Legacy extension era | One-click tag checks on any page you visited |
| 2017 | New Tag Assistant web app enters beta | GTM Preview moves into a dedicated debug window |
| 2020–2021 | Tag Assistant Companion desktop app ships | Recording sessions and cross-device debugging arrive |
| 2023 | Legacy officially deprecated | Extension still worked but received no updates |
| 2024 | Legacy discontinued and delisted | Extension stops functioning; migration becomes mandatory |
| 2026 | Companion is the only supported path | All Google tag debugging flows route through it |

The official documentation for the current tooling lives in Google's [Tag Platform docs](https://developers.google.com/tag-platform/tag-assistant/intro), and it is worth a skim before migrating — Google also quietly renamed things along the way, which is why half the blog posts on this topic describe tools with different names for the same app. Our earlier walkthrough of [the original Tag Assistant extension's features](/blog/unlocking-the-power-of-google-tag-assistant-extension) remains useful for understanding what Legacy did well, because several of those jobs now need different tools.

![Timeline of Tag Assistant Legacy deprecation and Companion migration](/content/images/tag-assistant-legacy-vs-companion-2026/tag-assistant-legacy-vs-companion-2026-overview.webp)

## What Tag Assistant Companion Is (and Is Not)

Companion is two things working together. First, **Tag Assistant the web app** — tagassistant.google.com — where your GTM containers, workspaces, and favorite sites live, and where you start preview sessions. Second, the **Tag Assistant Companion desktop application** for Windows, macOS, and Linux, which you download and install separately; it is a small helper, not a heavy suite. The Companion app enables the parts the browser cannot do alone: recording debugging sessions that follow clicks across page loads, keeping session history so you can revisit a journey, and connecting debug sessions to other browsers and physical devices.

What Companion is *not* is a Chrome extension — and that trips up migrating users constantly. There is nothing to find in the Chrome Web Store, no toolbar icon that turns red when tags misfire, and no passive "tag count" on every page you browse. Legacy was a constant companion (literally) that answered "are my tags here?" at a glance; Companion is a workshop you deliberately enter to answer "how does my tagging behave end to end?" The quick-check job has largely moved to other tools, which is why the successor-mapping section below matters as much as the migration steps themselves. One more boundary worth stating: Companion debugs Google tags. For Meta Pixel, LinkedIn, TikTok, and other non-Google tags you still need dedicated helpers like the ones in our guide to [downloading the Meta Pixel Helper for Chrome](/blog/where-to-download-meta-pixel-helper-for-chrome).

Who actually benefits from the new model? If you touch tags weekly — agency work, launch seasons, migration projects — the session history and cross-device support repay the setup cost immediately. If you audit tags a few times a year, the deliberate workflow still works fine: your two annual sessions simply take one extra click to start. What neither profile gets anymore is the passive background check, so plan your audits as scheduled work rather than incidental glances — and brief the team before launch week, when the old one-glance habit would have been doing overtime.

## Legacy vs Companion: Feature Comparison

Here is the honest feature-by-feature picture. Note where the table says "different, not worse" — Companion changes workflows rather than simply upgrading them.

| Capability | Tag Assistant Legacy | Tag Assistant Companion |
|---|---|---|
| Install model | Chrome extension from the Web Store | Web app + separate desktop app (Windows/macOS/Linux) |
| Quick per-page tag check | Yes — icon and panel on any page | No direct equivalent; use GA4 DebugView or tag checker extensions |
| Multi-page session recording | Basic (Recordings tab) | Core feature — full journeys with replay |
| Cross-device and cross-browser debug | No | Yes, via the debug connection parameter |
| Data layer inspection | Limited | Full event-by-event data layer viewer |
| Consent Mode status | Not available | Visible in session data |
| Session history and favorites | No | Yes, per container and per site |
| GA4 event validation | Poor fit (built for Universal Analytics) | Native via GTM Preview and DebugView |
| Works on mobile sites | Only via device emulation | Yes — real devices and emulators |
| Current support status | Retired in 2024 | Actively developed |

Two rows deserve emphasis. The loss of the quick per-page check is real — many teams kept Legacy installed for years purely as a "is anything firing?" glance, and nothing in Google's stack replaces that exactly. The gain in session capability is equally real: Legacy's Recordings were fragile and single-browser, while Companion sessions survive redirects, track multiple tabs, and can be shared with a colleague debugging the same container from another machine. Teams that only ever used Legacy's basic panel will feel the loss most; teams that tried Recordings will not go back.

## Migrating in 7 Steps

The migration is straightforward once you know the order of operations. Budget twenty minutes for the full sequence.

| Step | Action | Where | Notes |
|---|---|---|---|
| 1 | Remove the Legacy extension | `chrome://extensions` | It is dead code; leaving it only breeds confusion |
| 2 | Open tagassistant.google.com and sign in | Browser | Use an account with access to your GTM containers |
| 3 | Download and install Tag Assistant Companion | Web app → Download | Available for Windows, macOS, and Linux |
| 4 | Add your sites as favorites | Web app | Favorites power the quick-start list on the home screen |
| 5 | Start a recording session on a key journey | Companion app | Cart → checkout is the classic first test |
| 6 | Verify the data layer event by event | Session window | Compare against your GTM triggers one at a time |
| 7 | Bookmark GA4 DebugView for event validation | analytics.google.com | The validation layer that replaces Legacy's tag checks |

![Step-by-step Tag Assistant Companion migration workflow](/content/images/tag-assistant-legacy-vs-companion-2026/tag-assistant-legacy-vs-companion-2026-steps-1.webp)

A practical tip for step 5: name your sessions by journey, not by date. Six months in, "2026-08 checkout redesign test" is findable; "session 47" is not. Session history is one of Companion's quiet advantages over Legacy — it turns debugging from a live-only activity into a documentable one, which matters when you need to show a developer exactly what fired and when.

## Which Tool to Use for Which Job

Google's debugging stack now distributes Legacy's old responsibilities across three surfaces. Knowing which door to walk through saves the most time in daily work.

### GTM Preview via Tag Assistant

For anything running through Google Tag Manager, GTM's Preview mode — now launched through Tag Assistant — remains the primary debugger. It shows every event on the timeline, which triggers fired or failed and why, and the full variable state at each moment; Google documents the current [preview and debug workflow](https://support.google.com/tagmanager/answer/6107056) for teams setting it up. If Legacy was your tool for checking GA and Ads tags, this is where that job now lives, with far deeper data than Legacy ever exposed. The trade is friction: you need to start a session deliberately rather than glancing at a toolbar icon.

### GA4 DebugView

GA4's DebugView is the right surface when the question is "did this event arrive correctly in GA4?" — with parameters, user properties, and a live stream you can watch populate as you click around your site. It requires your device to be in debug mode, which Companion sets up automatically for sessions it records; Google's [DebugView documentation](https://support.google.com/analytics/answer/7201382) covers enabling debug mode on other devices. DebugView replaces the validation half of Legacy's checks and is the fastest way to confirm a new event's parameters match the schema you designed.

### Tag Diagnostics in GA4

Tag Diagnostics is the monitoring layer that did not exist in Legacy's day: found in GA4's Admin area under your data stream, it tracks how many Page View and key events arrived with and without validation over the past week, flagging regressions automatically. It will not tell you *why* a tag broke, but it is the earliest warning that something did — the tool you check Monday morning rather than mid-crisis. Between Preview mode for deep dives, DebugView for event validation, and Tag Diagnostics for ongoing health, the jobs Legacy juggled are now better covered, provided you know which surface answers which question.

## Common Migration Issues and How to Fix Them

Most migration pain comes from four sources, and each has a known fix. Teams migrating their whole stack — especially those pairing Companion with other debugging extensions — tend to hit all four at least once.

**The desktop app "does nothing."** Companion only orchestrates; sessions actually open in your browser via the web app. If launching the app feels anticlimactic, that is by design — start the session from tagassistant.google.com and the app will attach. Also confirm your operating system did not quarantine the installer on first run.

**Preview sessions never connect.** The usual culprit is cookie or storage blocking. Companion's debug flow depends on browser storage that aggressive privacy configurations clear — and if you browse with hardened settings, our guide to [removing tracking cookies from Chrome](/blog/what-are-tracking-cookies-remove-chrome) shows which cookie settings to keep and which site exceptions to add so debugging tools keep working. Corporate proxies and VPNs that block tagassistant.google.com domains are the second-most-common cause.

**Debugging on mobile fails.** You cannot attach to a physical phone the way Legacy's emulator did. The supported path is the debug connection parameter — Companion generates a URL containing a debug token that you open on the target device or emulator — and it requires the session to be running first. Enable remote debugging in the session settings before generating the link, not after.

**Teams keep asking "where is the extension?"** This is a process problem, not a technical one. Publish a one-page note that names the three replacement tools and their jobs — Preview for GTM, DebugView for GA4 events, Tag Diagnostics for health monitoring — and your Slack volume drops immediately. If your team's quick-check habit extends beyond Google tags, tools like the ones compared in our [Wappalyzer for Chrome guide](/blog/wappalyzer-for-chrome-what-it-can-tell-you) and the [Contentsquare extension overview](/blog/contentsquare-extension-chrome) cover the "what is this site running?" question that Legacy used to answer incidentally.

**Ad blockers interfere with the session.** Content blockers treat the debug window like any other page, and aggressive filter lists can suppress the preview iframe or the debugger scripts the session depends on. If sessions load empty or the timeline never populates, pause the blocker for Tag Assistant and your own domain — the privacy trade-off is confined to debugging time, and protection returns to duty on every other page. The same applies to hardened browser settings that clear the storage a session needs in order to resume, which is why the cookie exception fix in the previous paragraph usually solves both problems at once.

## Frequently Asked Questions

### What happened to Tag Assistant Legacy?

Google deprecated the Legacy Chrome extension in 2023 and discontinued it in 2024. The extension no longer works and has been removed from the Chrome Web Store. Its jobs now live across the new Tag Assistant web app, the Companion desktop application, GA4 DebugView, and Tag Diagnostics.

### How do I download Tag Assistant Companion?

Companion is not a Chrome extension — download the desktop application from tagassistant.google.com using the Download link there. It installs on Windows, macOS, and Linux, and works alongside the Tag Assistant web app, where you sign in and start your debugging sessions.

### Is Tag Assistant Companion free?

Yes, both the Tag Assistant web app and the Companion desktop app are free Google tools. The only requirement is a Google account with access to the Google Tag Manager containers you want to debug. There is no paid tier and no usage limit on recording sessions.

### Can Tag Assistant Companion debug on mobile devices?

Yes, but not by installing anything on the phone. You start a session in Companion, then open the generated debug URL on the mobile device or emulator, which connects that device to your recording session. Events from the device then stream into the same session timeline.

### What replaces Legacy's quick tag check on any page?

There is no single direct replacement inside Google's tools. For GTM and GA4 work, use Preview mode and DebugView; for the "what tags is this site running?" question, use dedicated checker extensions such as the Meta Pixel Helper or a tag inspector. Tag Diagnostics covers ongoing automated monitoring for your own properties.

---

Migrate once, save the three bookmarks — Tag Assistant, DebugView, and your GA4 Admin — and the Legacy workflow will stop being missed within a week. The debugging got more deliberate, and the extra depth you gain per session is worth the lost one-glance icon.

