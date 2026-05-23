---
id: 00ac3df3-524e-4f9a-b176-70fbca3732a3
title: "How to Export Chrome Extensions (Backup & Move Them)"
slug: how-to-export-chrome-extensions
meta_description: "Learn how to export, backup, and transfer your Chrome extensions to another computer or browser. Step-by-step methods for 2026."
excerpt: "Learn how to export, backup, and transfer your Chrome extensions to another computer or browser. Step-by-step methods for 2026."
category: Productivity & Workflow
tags: ["chrome extensions", "backup", "export", "migration"]
keywords: ["how to export chrome extensions", "chrome extensions", "backup", "export", "migration"]
author: "Daniel Carter"
status: draft
published_at: null
scheduled_at: "2026-07-17T15:00:00.000Z"
created_at: "2026-05-17T01:07:29.249Z"
updated_at: "2026-05-17T01:07:29.249Z"
read_time: 2
views: 0
canonical: "https://extensionto.com/blog/how-to-export-chrome-extensions"
---

## Table of Contents

- [Table of Contents](#table-of-contents)
- [Method 1: Chrome Sync (Easiest)](#method-1-chrome-sync-easiest)
- [Method 2: Export Extension List as Text](#method-2-export-extension-list-as-text)
- [Method 3: Pack Extensions as .crx Files](#method-3-pack-extensions-as-crx-files)
- [Method 4: Export to Another Browser](#method-4-export-to-another-browser)
- [FAQ](#faq)

---

# How to Export Chrome Extensions (Backup & Move Them)

**Quick Answer:** Chrome does not have a one-click export feature. The easiest method is signing into Chrome with your Google account — Chrome Sync automatically installs all your extensions on any new device. For manual export, use Developer mode to pack individual extensions as .crx files.

---

## Table of Contents
1. [Method 1: Chrome Sync (Easiest)](#sync)
2. [Method 2: Export Extension List as Text](#list)
3. [Method 3: Pack Extensions as .crx Files](#crx)
4. [Method 4: Export to Another Browser](#other-browser)
5. [FAQ](#faq)

---

## Method 1: Chrome Sync (Easiest) {#sync}

If you are signed into Chrome with a Google account, your extensions sync automatically to any Chrome browser you sign into.

**Set up sync:**
1. Click your profile icon and select **Turn on sync**
2. Sign in with your Google account
3. Make sure "Extensions" is toggled on in sync settings

**On the new computer:**
1. Open Chrome and sign in with the same Google account
2. Chrome downloads and installs all synced extensions automatically

---

## Method 2: Export Extension List as Text {#list}

To get a list of all installed extensions for documentation or manual reinstallation:

1. Go to `chrome://extensions`
2. Open DevTools with F12 and click the Console tab
3. Paste this and press Enter:

```
chrome.management.getAll(exts => {
  exts.filter(e => e.type === 'extension' && e.enabled)
  .forEach(e => console.log(e.name + ' — ' + e.homepageUrl));
});
```

4. Copy the console output — it lists all enabled extensions with names and URLs

---

## Method 3: Pack Extensions as .crx Files {#crx}

1. Go to `chrome://extensions` and enable **Developer mode**
2. Click **"Pack extension"**
3. Browse to the extension folder inside Chrome's user data directory
4. Click **Pack Extension** — Chrome creates a .crx file you can load on another machine

---

## Method 4: Export to Another Browser {#other-browser}

**To Microsoft Edge:** Edge supports Chrome extensions natively. Visit the Chrome Web Store in Edge and reinstall your extensions there.

**To Firefox:** Find equivalent extensions at addons.mozilla.org. Most popular Chrome extensions have Firefox versions.

**To Kiwi Browser (Android):** Reinstall each extension manually from the Chrome Web Store within Kiwi.

---

## FAQ {#faq}

**Can I export Chrome extensions to a USB drive?**
Yes. Find the extension folder at `C:\Users\[you]\AppData\Local\Google\Chrome\User Data\Default\Extensions\` and copy individual folders. Load them on another machine via Developer mode.

**Does Chrome Sync also sync extension settings?**
Some extensions sync their settings via Chrome Sync. Others store settings locally and you will need to reconfigure them.

**Can I export all Chrome extensions at once as one file?**
No native Chrome feature does this. Use the console script method to export a text list, then reinstall manually from the Chrome Web Store.

---

*Published by [ExtensionTo](https://extensionto.com) — Your guide to Chrome extensions.*

---

## Related Articles

- [How to Organize Chrome Tabs (2026 Guide)](/blog/how-to-organize-chrome-tabs)
- [How to Manage Multiple Chrome Profiles (2026 Guide)](/blog/how-to-manage-multiple-chrome-profiles)
- [How to Backup Your Chrome Extensions List (2026)](/blog/how-to-backup-chrome-extensions-list)
