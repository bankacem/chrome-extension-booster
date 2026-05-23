---
title: "Chrome Extensions Not Working? Complete Fix Guide (2026)"
slug: chrome-extensions-not-working-fix
description: "Chrome extensions stopped working after an update? This step-by-step fix guide covers every cause — including the Manifest V3 change that broke millions of extensions in 2025."
meta_description: "Chrome extensions stopped working after an update? This step-by-step fix guide covers every cause — including the Manifest V3 change that broke millions of extensions in 2025."
category: "Chrome Extensions"
author: "ExtensionTo Team"
status: draft
published_at: null
updated_at: "2026-05-19T22:19:28.081Z"
created_at: "2026-05-19T22:19:28.081Z"
read_time: 5

scheduled_at: "2026-06-18T09:00:00.000Z"---

# Chrome Extensions Not Working? Complete Fix Guide (2026)

Your Chrome extension stopped working and you don't know why. This guide covers every possible cause — including the big one nobody explains clearly: **Google's Manifest V3 transition permanently disabled thousands of extensions in 2025**. If your extension disappeared or grayed out, that's probably why.

---

## The Big 2025-2026 Change: Why Your Extension May Be Permanently Gone

In 2025, Google completed the Manifest V3 (MV3) transition. Extensions built on the older Manifest V2 standard no longer work on Chrome. This is not a bug — it's a deliberate platform change.

**The most affected extension:** Full uBlock Origin — the most popular ad blocker in the world — no longer runs on Chrome. Millions of users opened Chrome to find it disabled with no explanation.

**What you can do if your extension was disabled by MV3:**
1. Check if the developer released an MV3 version (search the extension name + "MV3" or "Chrome 2026")
2. For uBlock Origin: install uBlock Origin Lite (the official MV3 replacement)
3. For extensions with no MV3 version: find an alternative, or switch to Firefox where MV2 still works

**How to check if MV3 is your issue:**
- Go to `chrome://extensions`
- Look for extensions showing "This extension is no longer supported" or a red warning badge
- If the extension's last update was before 2024, it probably hasn't migrated to MV3

---

## Table of Contents
1. [MV3 Deprecation — The Permanent Fix](#mv3)
2. [Fix 1: Update Chrome and the Extension](#update)
3. [Fix 2: Disable and Re-enable the Extension](#reenable)
4. [Fix 3: Clear Extension Cache](#cache)
5. [Fix 4: Check Permissions](#permissions)
6. [Fix 5: Extension Conflict](#conflict)
7. [Fix 6: Reinstall the Extension](#reinstall)
8. [Fix 7: Reset Chrome Settings](#reset)
9. [Extension-Specific Fixes](#specific)
10. [FAQ](#faq)

---

## MV3 Deprecation — The Permanent Fix {#mv3}

If your extension shows a "no longer supported" message or is grayed out with no toggle, it has been disabled by Chrome's MV3 enforcement. There is no fix for this — the extension itself must be updated by its developer.

**Action:**
1. Note the extension name
2. Search "[extension name] Chrome update 2026" or "[extension name] MV3"
3. If the developer released an MV3 version, install that
4. If not, find an alternative

**Common extensions affected and their replacements:**

| Disabled Extension | Working Replacement |
|-------------------|---------------------|
| uBlock Origin (full) | uBlock Origin Lite |
| Some VPN extensions | Check developer's website for updated version |
| Older screenshot tools | GoFullPage, Awesome Screenshot |
| Legacy download helpers | Free Download Manager |

---

## Fix 1: Update Chrome and the Extension {#update}

Most extension issues are caused by version mismatches between Chrome and the extension.

**Update Chrome:**
1. Click the three-dot menu → Help → About Google Chrome
2. Chrome checks for updates automatically and installs them
3. Restart Chrome after updating

**Update extensions manually:**
1. Go to `chrome://extensions`
2. Enable **Developer mode** (toggle, top right)
3. Click **"Update"** button that appears
4. This forces an immediate update check for all extensions

After updating both, test your extension.

---

## Fix 2: Disable and Re-enable the Extension {#reenable}

This clears the extension's runtime state without deleting any saved settings.

1. Go to `chrome://extensions`
2. Find the broken extension
3. Toggle it **off** (grey)
4. Wait 5 seconds
5. Toggle it **on** (green)
6. Reload the page where the extension should work

This fixes most cases of extensions that appear installed but don't respond.

---

## Fix 3: Clear Extension Cache {#cache}

Chrome stores extension data in a local cache that can become corrupted.

**Method 1 — Soft clear:**
1. Go to `chrome://settings/clearBrowserData`
2. Check "Cached images and files"
3. Set time range to "Last hour"
4. Click "Delete data"

**Method 2 — Hard clear (if Method 1 fails):**
1. Close Chrome completely
2. Navigate to Chrome's profile folder:
   - Windows: `C:\Users\[you]\AppData\Local\Google\Chrome\User Data\Default\`
   - Mac: `~/Library/Application Support/Google/Chrome/Default/`
3. Delete the folder named **"Local Extension Settings"** → **[Extension ID]**
4. Restart Chrome

Warning: Method 2 deletes extension-specific saved data (settings, preferences). Use only if other methods fail.

---

## Fix 4: Check Permissions {#permissions}

Some extensions stop working when a site blocks them, or when Chrome updates restrict their permissions.

1. Visit the page where the extension doesn't work
2. Click the **lock icon** in the address bar
3. Check if the extension has permissions for this specific site
4. Also check `chrome://extensions` → click "Details" on the extension → verify "Site access" is set correctly

For content script extensions (ad blockers, dark mode): set site access to "On all sites."

---

## Fix 5: Extension Conflict {#conflict}

Two extensions doing similar things (especially two ad blockers) will conflict and break both.

**Diagnose:**
1. Open an incognito window (all extensions are disabled by default)
2. If the problem disappears in incognito, an extension conflict is causing it
3. Return to normal Chrome
4. Disable extensions one by one until the problem is resolved

**Common conflicts:**
- Two ad blockers running simultaneously
- Multiple dark mode extensions
- VPN extension + certain privacy extensions

---

## Fix 6: Reinstall the Extension {#reinstall}

If nothing above works, a clean reinstall often resolves persistent issues.

1. Go to `chrome://extensions`
2. Find the extension → click **Remove**
3. Confirm removal
4. Go to the Chrome Web Store
5. Search for the extension and reinstall it
6. Reconfigure any settings (they were deleted with the old installation)

---

## Fix 7: Reset Chrome Settings {#reset}

If multiple extensions stopped working at once after a Chrome update, a settings reset may help.

1. Chrome → Settings → **Reset and clean up**
2. Click **"Restore settings to their original defaults"**
3. Click **"Reset settings"**

This resets content permissions and extension access rules without deleting bookmarks or passwords. Extensions remain installed but may need to be re-enabled.

---

## Extension-Specific Fixes {#specific}

**uBlock Origin not working:**
→ This is permanent on Chrome. Install uBlock Origin Lite instead. If you need full uBlock Origin, switch to Firefox.

**Bitwarden not autofilling:**
→ Unlock the vault first (click the icon). Check if the site has autofill disabled (some banking sites do). Try right-clicking the password field → Bitwarden → fill password.

**Grammarly not showing:**
→ Go to `chrome://extensions` → Grammarly → Details → ensure "Site access" is set to "On all sites." Also check if the specific site is in Grammarly's exclusion list.

**Dark Reader breaking a site:**
→ Click Dark Reader icon → click the power button on that specific tab to disable for that site only. Add the site to your personal exclusion list in Dark Reader settings.

---

## FAQ {#faq}

**Why did my extension disappear completely from the toolbar?**
It may have been removed from the Chrome Web Store (Google removes extensions that violate policies). Go to `chrome://extensions` — if it's not there, it was removed. Find an alternative.

**Will the same extension work again if I reinstall it?**
Only if the underlying issue is fixable. If it was disabled by MV3 enforcement, reinstalling the same extension will just disable it again. You need an MV3-compatible replacement.

**Can I get back to Manifest V2 Chrome?**
No. MV2 was permanently deprecated. There is no Chrome flag or setting to re-enable it. Firefox still supports MV2 if you need MV2-era extensions.

**My extension works in incognito but not in regular Chrome. Why?**
An extension conflict is almost certainly the cause. Disable extensions one at a time in regular Chrome until you identify the conflicting one.

---

*Published by [ExtensionTo](https://extensionto.com) — Your guide to Chrome extensions.*
