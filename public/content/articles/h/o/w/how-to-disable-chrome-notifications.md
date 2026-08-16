---
id: c74188ec-7afd-4b17-8c98-99a37e859acd
title: "How to Disable Chrome Notifications: A Complete Guide"
seo_title: "How to Disable Chrome Notifications"
slug: how-to-disable-chrome-notifications
canonicalPath: /blog/how-to-disable-chrome-notifications
status: published
excerpt: "How to disable Chrome notifications you've already allowed — site-by-site cleanup, OS-level settings, and Chrome for Android."
meta_description: "How to disable Chrome notifications you've already allowed — site-by-site cleanup, OS-level settings, and Chrome for Android."
featured_image: /og-image.png
category: Productivity & Tools
tags:
  - notifications
  - chrome settings
  - privacy
  - productivity
keywords:
  - how to disable chrome notifications
author: Admin
published_at: 2026-08-17
read_time: 6
---
There are actually two different problems hiding behind "disable Chrome notifications." One is stopping the popup that asks "Allow notifications?" when you visit a new site. The other is turning off notifications from sites you've already said yes to, sometimes without remembering which ones. This guide is about the second problem — managing and disabling notifications you've already granted, plus the settings layers most guides skip entirely: what happens at the operating-system level, and how this works differently on Chrome for Android.

## Blocking the Permission Prompt vs. Disabling Active Notifications

If a site is currently asking you "Allow notifications?" and you just want that popup gone, [that's a permission-prompt problem covered separately](/blog/block-newsletter-popups-and-allow-notifications-prompts-5) — Chrome's site settings let you block prompts globally or per-site before you ever say yes.

If sites are already sending you notifications and you want to turn them off, that's a different, more common scenario covered in this guide: reviewing what you've already approved and disabling it, rather than preventing future prompts.

Knowing which problem you actually have matters because the fix is different: blocking future prompts doesn't touch permissions you've already granted, and disabling existing notifications doesn't stop new sites from asking again later.

## Turning Off Notifications Globally

1. Click the three-dot menu in Chrome, then go to **Settings** (see [Google's own notification settings documentation](https://support.google.com/chrome/answer/3220216) for the full official reference).
2. Go to **Privacy and security → Site settings → Notifications**.
3. To stop being asked for permission at all going forward, toggle **Sites can ask to send notifications** off, or select **Don't allow sites to send notifications**.
4. This setting controls future prompts — it doesn't automatically revoke notifications from sites you've already allowed, which is covered in the next section.

This is the fastest option if you want to stop notification prompts entirely and don't care about managing individual sites separately.

## Managing Notifications Site by Site

This is where most guides stop short — the global toggle is easy, but reviewing and cleaning up dozens of already-approved sites is where the real clutter usually is.

1. Go back to **Settings → Privacy and security → Site settings → Notifications**.
2. Under **Allowed to send notifications**, you'll see every site currently permitted — often more than people expect, accumulated over months or years of clicking "Allow" without much thought.
3. Click the three-dot menu next to any site to **Remove** or **Block** it specifically, without affecting your settings for any other site.
4. Do this as a batch cleanup occasionally rather than only when a specific notification annoys you — reviewing the full allowed list at once catches sites you forgot you'd approved.

If you only remember a handful of sites that are actually useful to keep, it's often faster to remove everything and re-approve just those few than to hunt through a long list one at a time.

## When Chrome Settings Alone Don't Stop Notifications

This is a genuinely common point of confusion: you've disabled a site's notifications in Chrome, but still see something pop up — because Chrome's setting is only one layer, and the operating system has its own separate notification permission system on top of it.

**On Windows**, check **Settings → System → Notifications**, and specifically whether Focus Assist is configured to still allow notifications from Chrome — Chrome can be correctly configured on its end while Windows' own notification center still shows something through a different path.

**On macOS**, check **System Settings → Notifications → Google Chrome** — macOS maintains its own per-app notification permissions independent of anything configured inside Chrome itself, and this is a common reason "disabled" notifications still appear.

If you've correctly turned off a site's notifications in Chrome and still see something, checking the OS-level notification settings for Chrome as an application is the next place to look, not assuming Chrome's setting failed.

## Notifications on Chrome for Android

Mobile Chrome uses a different settings path, which trips people up when following desktop-focused instructions:

1. Open Chrome on Android and tap the three-dot menu, then **Settings**.
2. Tap **Notifications** (this may route to Android's own system notification settings for the Chrome app specifically, depending on your Android version).
3. From there, you can disable Chrome notifications entirely, or tap into site-specific permissions the same way as desktop, under site settings.

A specific frustration worth knowing about: on Android, some sites re-prompt for notification permission even after being denied once, particularly if the site was denied a while ago and Chrome's permission-prompt cooldown period has since passed. This isn't a bug — Chrome does allow a site to ask again after enough time, on the assumption your preference might have changed. If a specific site keeps re-prompting sooner than expected, blocking it explicitly under site settings (rather than just dismissing the prompt each time) prevents future prompts from that site specifically.

## Comparison at a Glance

| Goal | Where to go |
|---|---|
| Stop all future notification prompts | Settings → Site settings → Notifications → toggle off |
| Turn off a site you already allowed | Site settings → Notifications → Allowed list → Remove/Block |
| Notifications still appear after disabling in Chrome | Check OS-level notification settings for Chrome (Windows/macOS) |
| Managing notifications on Android | Chrome app → Settings → Notifications |
| A site keeps re-prompting after being denied | Block it explicitly in site settings, don't just dismiss the prompt |

## Frequently Asked Questions

**Q: I turned off notifications in Chrome, but I'm still seeing them. Why?**
A: The operating system (Windows or macOS) maintains its own separate notification permissions for Chrome as an application, independent of Chrome's internal settings. Check your OS notification settings for Chrome specifically.

**Q: Does disabling notifications globally also remove sites I've already allowed?**
A: No — the global toggle only affects future prompts. Sites you've already approved keep sending notifications until you remove or block them individually under the Allowed list.

**Q: Why does a site keep asking for notification permission after I said no?**
A: Chrome allows a site to re-prompt after enough time has passed since a denial, in case your preference changed. If this happens sooner than you'd expect, blocking the site explicitly (rather than dismissing the prompt) stops future re-prompts from that specific site.

**Q: Is managing notifications different on Chrome for Android?**
A: The settings path is different (Chrome app → Settings → Notifications, which may route through Android's own system settings), but the underlying site-by-site permission concept works the same way as desktop.

## Conclusion

If notification prompts are the annoyance, the global toggle handles that in one step. If specific sites are already sending you notifications you don't want, the Allowed list under site settings is where to actually clean that up — and if you've done that and still see something, the operating system's own notification settings for Chrome are the next place to check before assuming Chrome's setting didn't work.