---
id: ca76c789-2bcd-4266-89a3-a0472a224dd3
title: "How to Backup Your Chrome Extensions List (2026)"
slug: how-to-backup-chrome-extensions-list
meta_description: "Back up your Chrome extensions list to reinstall them quickly on a new computer or after a Chrome reset. Three tested methods for 2026."
excerpt: "Back up your Chrome extensions list to reinstall them quickly on a new computer or after a Chrome reset. Three tested methods for 2026."
category: Productivity & Workflow
tags: ["chrome extensions", "backup", "migration", "sync"]
keywords: ["how to backup chrome extensions list", "chrome extensions", "backup", "migration", "sync"]
author: "Daniel Carter"
status: draft
published_at: null
scheduled_at: null
created_at: "2026-05-17T01:07:29.249Z"
updated_at: "2026-05-17T01:07:29.249Z"
read_time: 4
views: 0
canonical: "https://extensionto.com/blog/how-to-backup-chrome-extensions-list"
---

## Table of Contents

- [Table of Contents](#table-of-contents)
- [Method 1: Chrome Sync — Automatic Backup](#method-1-chrome-sync-automatic-backup)
- [Method 2: Export List via DevTools Console](#method-2-export-list-via-devtools-console)
- [Method 3: Copy Chrome Profile Folder](#method-3-copy-chrome-profile-folder)
- [Method 4: Use Extension Manager](#method-4-use-extension-manager)
- [Restore Extensions on a New Computer](#restore-extensions-on-a-new-computer)
- [FAQ](#faq)

---

# How to Backup Your Chrome Extensions List (2026)

**Quick Answer:** The easiest backup method is **Chrome Sync** — sign into Chrome with your Google account and extensions sync automatically to all your devices. For a manual list, use the DevTools console script below. For a full file backup, copy Chrome's Extensions folder from your profile directory.

---

## Table of Contents
1. [Method 1: Chrome Sync — Automatic Backup](#sync)
2. [Method 2: Export List via DevTools Console](#console)
3. [Method 3: Copy Chrome Profile Folder](#folder)
4. [Method 4: Use Extension Manager](#manager)
5. [Restore Extensions on a New Computer](#restore)
6. [FAQ](#faq)

---

## Method 1: Chrome Sync — Automatic Backup {#sync}

The simplest and most reliable method. Chrome continuously syncs your extensions to Google's servers when you are signed in.

**Enable sync:**
1. Click your profile avatar in the top-right corner of Chrome
2. Click **"Turn on sync"** and sign in with your Google account
3. Go to Chrome Settings → **Sync and Google services**
4. Click **"Manage what you sync"**
5. Confirm **Extensions** is toggled on

**Restore on a new computer:**
Install Chrome, sign in with the same Google account, and all your extensions install automatically within a few minutes.

**Limitation:** Syncs which extensions are installed but not always their individual settings. Some extensions may need to be reconfigured after restoring.

---

## Method 2: Export List via DevTools Console {#console}

This creates a text list of every installed extension with its Chrome Web Store link — perfect for documentation or manual reinstallation on another browser.

1. Go to `chrome://extensions`
2. Press **F12** to open DevTools
3. Click the **Console** tab
4. Paste the code below and press Enter:

```
chrome.management.getAll(function(exts) {
  exts.filter(function(e) { return e.type === 'extension' && e.enabled; })
      .forEach(function(e) {
        console.log(e.name);
        console.log('https://chrome.google.com/webstore/detail/' + e.id);
        console.log('---');
      });
});
```

5. Right-click the console output area → **Save as** to save as a log file
6. Or select all the text and copy it into a text document

You now have a complete list of every extension name and its direct Chrome Web Store installation link.

---

## Method 3: Copy Chrome Profile Folder {#folder}

Your Chrome extensions are stored as files on your hard drive. Copying the Extensions folder backs up the actual extension files.

**Windows location:**
```
C:\Users\YourName\AppData\Local\Google\Chrome\User Data\Default\Extensions
```

**Mac location:**
```
/Users/YourName/Library/Application Support/Google/Chrome/Default/Extensions
```

**Linux location:**
```
/home/yourname/.config/google-chrome/Default/Extensions
```

Each subfolder inside Extensions is one installed extension, named by its unique extension ID. Copy this entire folder to an external drive or cloud storage.

**To restore:** Copy the folder back to the same path on a new machine, then in Chrome enable Developer mode (chrome://extensions) and use "Load unpacked" to load each extension folder.

---

## Method 4: Use Extension Manager {#manager}

Search for "Extension Manager" in the Chrome Web Store. These tools provide a visual panel for managing all your extensions and some versions include export functionality:

- Export your full extension list as a JSON file or text list
- Create named profiles (sets of enabled/disabled extensions for different tasks)
- One-click switching between extension profiles

Install one, look for its Export or Backup section, and save the output file somewhere safe.

---

## Restore Extensions on a New Computer {#restore}

**Via Chrome Sync (fastest):**
Install Chrome, sign in with your Google account, and wait 2–5 minutes. Extensions install automatically.

**Via your saved text list:**
Open the text file, visit each Chrome Web Store URL listed, and click "Add to Chrome" for each extension.

**Via profile folder backup:**
Copy the Extensions folder back to the correct path, enable Developer mode in chrome://extensions, and use "Load unpacked" to restore each extension individually.

---

## FAQ {#faq}

**Does Chrome Sync back up extension settings?**
Some extensions sync their own settings through Chrome Sync. Others store settings only locally and will need to be reconfigured after you restore on a new machine.

**Can I restore from a Windows backup to a Mac?**
Chrome Sync works cross-platform — sign into Chrome on any OS and extensions restore automatically. The profile folder method is OS-specific and not cross-compatible.

**Does the synced backup include disabled extensions?**
No. Chrome Sync only syncs enabled extensions. Use the DevTools console script method if you want to document disabled extensions as well.

**How often should I run a manual backup?**
With Chrome Sync enabled, backup is continuous and automatic. For the manual text list, export it whenever you add a new important extension or before major changes like a Chrome reset.

**What if I lose access to my Google account?**
This is why a manual text list or folder backup matters. Always keep an offline copy of your extension list in case you cannot access Google Sync.

---

*Published by [ExtensionTo](https://extensionto.com) — Your guide to Chrome extensions.*

---

## Related Articles

- [How to Organize Chrome Tabs (2026 Guide)](/blog/how-to-organize-chrome-tabs)
- [How to Export Chrome Extensions (Backup & Move Them)](/blog/how-to-export-chrome-extensions)
- [How to Manage Multiple Chrome Profiles (2026 Guide)](/blog/how-to-manage-multiple-chrome-profiles)
