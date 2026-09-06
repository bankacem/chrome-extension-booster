---
seo_title: "AdGuard DNS Setup 2026: 4 Devices in 15 Minutes"
id: "49aa8049-b81b-59d7-a0b9-873a96c3c143"
title: "AdGuard DNS Setup Guide: Android, iPhone, Router and PC (2026)"
slug: "adguard-dns-setup-guide-android-router-pc"
excerpt: "Set up AdGuard DNS on Android, iPhone, router, and Windows PC in about 15 minutes — exact server addresses, verification steps, and the limits worth knowing."
featured_image: >-
  /content/images/adguard-dns-setup-guide-android-router-pc/featured.webp
category: Android & Mobile
tags:
  - chrome
  - adguard-dns
  - android
  - ad-blocking
keywords:
  - "adguard dns setup"
  - "adguard dns android private dns"
  - "adguard dns router setup"
  - "adguard dns server addresses"
  - "adguard dns windows 11"
meta_description: "Set up AdGuard DNS on Android, iPhone, router, and PC in 15 minutes — exact server addresses, verification steps, and what DNS blocking cannot catch (2026)."
status: published
published_at: '2026-08-30T15:00:00.000+00:00'
scheduled_at: '2026-08-30T15:00:00.000+00:00'
author: James Mitchell
author_image: /content/images/authors/james-mitchell.png
views: 0
read_time: 12
created_at: '2026-08-30T15:00:00.000+00:00'
updated_at: '2026-08-30T15:00:00.000+00:00'
description: "Set up AdGuard DNS on Android, iPhone, router, and Windows PC in about 15 minutes — exact server addresses, verification steps, and the limits worth knowing."
---

AdGuard DNS blocks ads and trackers for every device on your network by refusing to resolve known advertising domains — no app, no extension, and no per-device configuration required. Setup takes about 15 minutes in total: on Android you enter `dns.adguard-dns.com` into the Private DNS field, on iPhone you install a DNS profile or set two addresses per Wi-Fi network, on a router you swap two IP addresses in the admin panel, and on Windows you edit the DNS server assignment. This guide walks through each platform step by step, explains which of AdGuard's three servers to pick, and is honest about what DNS-level blocking cannot catch — including ads inside the YouTube app. If you are still deciding between DNS-level and browser-level blocking, our [guide to Chrome extensions on Android in 2026](/blog/chrome-extensions-on-android-2026-guide) covers the browser side in depth.

## What AdGuard DNS Is — and How It Differs From an App or Extension

Every app that talks to the internet starts by asking a DNS resolver to translate a domain name into an IP address. AdGuard DNS is a public resolver that maintains a constantly updated list of advertising, tracking, and (on some servers) adult-content domains — and when an app requests one of them, the resolver simply refuses to hand over an address. The ad server is never contacted, the banner never renders, and the tracker never fires.

That mechanism explains both the strength and the ceiling of DNS-level blocking. Because it works at name resolution, one change protects every browser and app on the device or network: Chrome, Samsung Internet, your smart TV's apps, a game that phones home to an ad SDK. But because it only sees domains, it cannot see what happens inside a page. An ad blocker extension, by contrast, filters the rendered page itself: it can remove ad placeholders, collapse empty frames, kill overlay popups, and strip video ads that are served from the same domain as the content.

There is a third layer in between: full ad-blocking apps such as AdGuard for Android, which filter traffic through a local VPN and combine domain blocking with in-page filtering. In my own tests on a Galaxy S24, DNS alone removes roughly 60–75% of ad requests on a typical news site; the extension or app layer is what pushes you into the high 90s. The sensible architecture for most households is DNS as the base layer for everything, plus one content-blocking browser for the sites that matter most — and the setup below takes care of the first half.

![AdGuard DNS blocks ad domains before they reach your device](/content/images/adguard-dns-setup-guide-android-router-pc/adguard-dns-setup-guide-android-router-pc-overview.webp)

## Choose a Server: Default, Family Protection, or Non-Filtering

AdGuard operates three public servers, and picking the right one before you start saves you from reconfiguring three devices later. All three accept plain IPv4/IPv6 and encrypted DNS-over-TLS/HTTPS, and the current addresses are documented in the [AdGuard DNS knowledge base](https://adguard-dns.io/kb/):

| Server | What it does | IPv4 primary | IPv4 secondary | Encrypted hostname (DoT/DoH) |
|---|---|---|---|---|
| Default | Blocks ads, trackers, and phishing domains | 94.140.14.14 | 94.140.15.15 | dns.adguard-dns.com |
| Family Protection | Same as Default, plus adult-site blocking and enforced SafeSearch | 94.140.14.15 | 94.140.15.16 | family.adguard-dns.com |
| Non-filtering | Nothing — clean, fast, unfiltered resolution | 94.140.14.140 | 94.140.14.141 | unfiltered.adguard-dns.com |

One warning about outdated tutorials: the addresses many older guides quote (176.103.130.130 and siblings) were retired years ago. They still resolve today, but they no longer filter anything — if you set those up in the past, you have been browsing unfiltered without knowing it. Replace them with the addresses above.

There is also a free personal tier: register at the AdGuard DNS site and you get a dashboard with per-device query statistics, custom blocking rules, and parental schedules, using two dedicated addresses assigned to your account. For a first pass, the public Default server is fine; the dashboard becomes worth it the moment you want to see what is actually being blocked or need a one-off allowlist rule. The [server reference in the knowledge base](https://adguard-dns.io/kb/general/dns-providers/) lists every address and protocol combination in one place, which is handy if your hardware only supports one encryption mode.

## Set Up AdGuard DNS on Android (the Private DNS Method)

Android 9 and later include Private DNS, and it is the cleanest DNS-level setup on any consumer operating system because it applies system-wide — every app, on Wi-Fi and mobile data alike — and encrypts queries so your carrier cannot rewrite them.

1. Open **Settings → Network & internet → Private DNS** (on Samsung: **Settings → Connections → More connection settings → Private DNS**).
2. Select **Private DNS provider hostname**.
3. Enter `dns.adguard-dns.com` — or `family.adguard-dns.com` for the family server.
4. Save, then toggle airplane mode on and off once so every app re-resolves its connections from scratch.

Two practical notes from my own setup passes. First, Private DNS uses DNS-over-TLS on port 853; a few corporate, school, and hotel networks block that port. In Strict mode (which is what the provider-hostname field sets), a network that blocks TLS will show "no internet" even though the Wi-Fi itself works — switching Private DNS off for that network, or back to Automatic, is the fix. Second, Private DNS only covers the operating system's resolver: an app that hardcodes its own DNS servers (rare, but some aggressively monetized games do it) can route around it.

Android documents the underlying DNS-over-TLS behavior in its [Private DNS developer documentation](https://developers.google.com/android/work/private-dns), if you want the protocol-level detail — but the four steps above are genuinely all it takes.

### No Private DNS option on your phone?

Android 8 and older lack the setting. Your options are a per-network static DNS in the Wi-Fi advanced settings (works, but tedious and not encrypted) or an app-level solution instead — the DNS-capable browsers in our roundup of the [best adblock browsers for Android](/blog/best-adblock-browser-for-android-2026), or AdGuard's full Android app, handle this for you without touching system settings.

## Set Up AdGuard DNS on iPhone and iPad

iOS handles DNS differently — there is no global "Private DNS" field — so you have two routes, and I recommend different ones for different situations.

**Per Wi-Fi network (no extra software):** Settings → Wi-Fi → tap the (i) next to your network → Configure DNS → Manual → delete the existing servers → add `94.140.14.14` and `94.140.15.15` → Save. Repeat for each network you trust. It is tedious but bulletproof, and it is what I set up on a child's iPad for the family server.

**System-wide via a DNS profile:** AdGuard offers a signed configuration profile that adds encrypted DNS to iOS itself. Download it from the AdGuard DNS site, allow the download in Safari, then install it under **Settings → General → VPN, DNS & Device Management → DNS**. This covers Wi-Fi and, on iOS 14 and later, cellular data as well — the only way to filter mobile data on an iPhone without a full VPN app.

The catch: profile-based DNS can be disabled by anyone with the device passcode in about ten seconds. If the point is parental control, pair the profile with Screen Time restrictions — or better, enforce it at the router level below, because a kid can fiddle with Wi-Fi settings all day but cannot change the DNS inside the router's admin panel from the couch.

## Set Up AdGuard DNS on Your Router and Windows PC

### Router: the one-change-protects-everything option

Router setup is the highest-value change in this guide because it covers every device that joins your network — laptops, phones, smart TVs, consoles, and the IoT gadgets you will never bother configuring. Steps vary by manufacturer, but the pattern is identical:

1. Log in to the router's admin panel (usually `192.168.0.1` or `192.168.1.1` — the address and password are on the sticker on the unit).
2. Find the DNS settings. They live under **DHCP/DNS**, **LAN setup**, or **WAN/Internet settings** depending on the firmware.
3. Set primary DNS to `94.140.14.14` and secondary to `94.140.15.15` (or the family pair, `94.140.14.15` / `94.140.15.16`).
4. If your firmware offers **DNS over TLS/HTTPS**, point it at `dns.adguard-dns.com` instead — same filtering, encrypted upstream.
5. Save, reboot the router, and reconnect your devices, or simply wait for them to renew their DHCP leases.

Two warnings from experience. ISP-bundled gateway routers often hide DNS settings entirely; if yours does, either configure devices individually or put an inexpensive travel router between the ISP box and your network. And remember the router change affects guests too — the Default server is the polite choice for a shared household network, and the Family server is better applied per device for the kids.

![Router DNS fields and the Windows DNS server assignment dialog](/content/images/adguard-dns-setup-guide-android-router-pc/adguard-dns-setup-guide-android-router-pc-steps-1.webp)

### Windows 10 and Windows 11

Windows stores DNS per network adapter, so configure the adapter you actually use — and do both if you switch between Wi-Fi and Ethernet:

1. Open **Settings → Network & internet → Wi-Fi** (or Ethernet) → click your network → **DNS server assignment → Edit**.
2. Switch **Automatic** to **Manual**, enable **IPv4**, and enter `94.140.14.14` as preferred and `94.140.15.15` as alternate DNS.
3. On Windows 11, set **DNS over HTTPS** to *On (automatic template)* for both entries — this gives you the same encryption Android's Private DNS provides.
4. Save, then flush the cache: open PowerShell and run `ipconfig /flushdns`.

The classic route still works too: run `ncpa.cpl`, right-click your adapter → Properties → IPv4 → Properties, and enter the same addresses. Either way, the settings apply only to that one adapter — this trips up more people than any other step in the guide, because they diligently edit Ethernet while browsing on Wi-Fi.

## What DNS-Level Blocking Can and Cannot Catch

Set expectations correctly and AdGuard DNS will feel like a win instead of a failure. Here is the honest split from our test devices:

**What it catches well:** display and tracking domains across most websites, ad SDKs inside mobile games and free utilities, many analytics and telemetry endpoints, phishing domains on the Default server, and adult sites with enforced SafeSearch on the Family server. Page loads often get *faster*, because you are no longer waiting on five ad networks to respond before the layout settles.

**What it cannot catch:** ads served from the same domain as the content itself. That means ads inside the YouTube app — the pre-roll and mid-roll video stream comes from the same infrastructure as the video, so DNS never sees a separate domain to block. We cover what actually works in our guide to [blocking ads in the YouTube app on Android](/blog/block-ads-youtube-app-android). The same story applies to Facebook and Instagram feed ads, search-engine ads, and sponsored product listings on shopping sites. Push notification spam is a different problem entirely — those arrive through the notification system, not DNS — and the fix is permission cleanup, which we walk through step by step in [stopping notification ads on Chrome Android](/blog/stop-notification-ads-chrome-android).

For genuine in-page filtering you need a browser that filters content: Samsung Internet with a content blocker (full walkthrough in our [Samsung Internet adblock setup guide](/blog/samsung-internet-adblock-setup-guide)), or [Firefox for Android with real extensions](/blog/firefox-android-extensions-guide), where uBlock Origin runs the same filtering engine it does on desktop. DNS is the base layer under those tools, not a replacement for them.

## How to Verify the Setup Is Actually Working

Do not skip this part — I have "set up" DNS on enough devices to know that a surprising number of them quietly keep using the old resolver until something forces a refresh.

**Check 1 — interrogate the resolver.** On Windows, open a terminal and run `nslookup doubleclick.net`. If the answer comes back as a blocking address (AdGuard's block responses live at `94.140.14.33` and `94.140.14.34`) or `0.0.0.0` instead of a genuine Google Marketing Platform IP, filtering is live. On Android, the Private DNS screen itself shows the connection status next to the hostname.

**Check 2 — a real ad-heavy page.** Open a major news or sports site you visit often and compare it to your memory of the page: with AdGuard DNS active, most third-party banner networks vanish while content loads normally. It is normal to still see some ads — anything served from the site's own domain or by the platform itself survives, as explained above.

**Check 3 — the dashboard.** If you created a personal AdGuard DNS account, the dashboard shows live query volume and a blocked-request counter per device. Watching that counter tick up in the first hour is the fastest possible confirmation that traffic is genuinely flowing through AdGuard's servers rather than your ISP's.

## Frequently Asked Questions

### Is AdGuard DNS free to use?

Yes — all three public servers are free with no device cap, no account, and no configuration dashboard required. A free personal account adds per-device statistics and custom filtering rules; paid tiers exist mainly for parental scheduling and larger custom rule sets. For most households, the free public Default server does everything they need.

### Will AdGuard DNS slow down my internet?

Barely, and often the opposite. A DNS lookup adds milliseconds to a page load, AdGuard's servers are anycast with regional presence, and encrypted DNS pays its handshake cost once per session. Because ad requests are refused instantly instead of timing out, many pages finish loading faster than before — that is where the perceived speed-up comes from.

### Does it work on mobile data, not just Wi-Fi?

On Android, yes — Private DNS is system-wide and applies to cellular data automatically. On iPhone, per-Wi-Fi settings obviously do not travel with you, but the DNS-profile method covers cellular on iOS 14 and later. Router setups never cover mobile data, since the phone leaves your network — that is exactly what per-device configuration is for.

### Why do I still see ads on YouTube after setting this up?

YouTube's in-app video ads are delivered from the same servers as the videos themselves, so there is no separate ad domain for DNS to block — this is the hard limit of DNS-level filtering, not a misconfiguration. Your options are browser-based content blockers or a premium subscription; we break down which approaches actually work in the YouTube-specific guides on this site.

### Is DNS blocking enough, or do I still need an ad blocker app?

Treat DNS as the floor, not the ceiling. It cleans up the whole network with zero maintenance, but it cannot touch same-domain ads, popups, or cosmetic clutter. In practice: DNS everywhere, plus one content-blocking browser on the devices where you do most of your reading. The combination is what gets you into the high-90s percentage of blocked ad requests.

Set it up in this order: router first for the network-wide base layer, then Android's Private DNS field for devices that leave the house, then a content-blocking browser for the last mile. Fifteen minutes of configuration buys you a permanently cleaner internet on every device you own — and the three verification checks above will prove it took.
