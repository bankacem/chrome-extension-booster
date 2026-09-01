---
seo_title: "Split Screen in Chrome: Native Split View vs Extensions"
id: "3a54b308-ee0c-5b22-bba6-b46baa775083"
title: "Split Screen in Chrome: Native Split View vs 4 Extensions Tested (2026)"
slug: split-screen-chrome-tabs-guide
description: "Every way to split Chrome tabs side by side, tested: Chrome's native Split View, four extensions, the layouts that stuck, and the sites that break splits."
excerpt: "Chrome Community threads about side-by-side tabs still end in 'install an extension'. I tested the native Split View against four extensions for two weeks of real work."
meta_description: "Split Chrome tabs side by side: the native Split View, when extensions like Tab Resize still win, layouts I kept, and fixes for sites that refuse to split."
canonicalPath: /blog/split-screen-chrome-tabs-guide
category: Productivity & Workflow
tags:
  - "chrome"
  - "split screen"
  - "tabs"
  - "productivity"
  - "multitasking"
  - "extensions"
keywords:
  - "split screen chrome extension"
  - "split screen chrome"
  - "chrome split view tabs"
  - "how to split screen on chrome"
  - "chrome tabs side by side"
status: published
published_at: "2026-08-31T21:30:00.000+00:00"
author: James Mitchell
author_image: /content/images/authors/james-mitchell.png
views: 0
read_time: 16
reading_time: 16
created_at: 2026-08-31
updated_at: "2026-08-31T21:30:00.000+00:00"
faq:
  - question: Does Chrome have built-in split screen?
    answer: "Yes, on desktop. Chrome includes a native split view that puts two tabs side by side inside one window with a draggable divider, and you activate it from the tab's right-click menu. It is limited to two panes and it does not remember your arrangement after you close the window. Google's support documentation covers the feature and the exact menu wording for current builds, which is worth checking because the label has shifted between releases. If the option does not appear for you, update Chrome from `chrome://settings/help` and make sure the window has at least two tabs open."
  - question: How do I split screen in Chrome on one monitor?
    answer: "Right-click a tab, choose the split view option, then drag a second tab into the empty pane and adjust the divider. If you would rather use separate windows, drag a tab out of the tab strip to detach it, then press `Win`+`Left` and `Win`+`Right` on Windows to snap each window to a half. On macOS, hover the green window button and pick a tiling option, or use your preferred window tool. On a single monitor I strongly suggest an uneven ratio like 60/40 plus per-site zoom on the narrow pane, because an even split often pushes sites into their tablet or mobile layout."
  - question: How does split view work on a Chromebook?
    answer: "ChromeOS has had the best version of this for years because it happens at the window level rather than inside the browser. Drag a window to the left or right edge until you see the highlight and release, or press and hold the maximize button to pick a side. You can then put two Chrome windows side by side, or Chrome next to an Android app, and ChromeOS keeps the pairing when you switch between virtual desks. Chrome's in-browser split view also works on ChromeOS, which means you can nest a two-pane split inside one snapped half if you have the screen space for it."
  - question: Why does a site refuse to split or look broken in a pane?
    answer: "Two different causes. Most often the site is responding to a narrow viewport and switching to its tablet or mobile layout, which looks broken but is working as designed. Fix that by widening the pane or zooming out with `Ctrl` and `-` so the site sees more CSS pixels. The other cause is real refusal: if an extension loads pages inside an iframe, sites that send `X-Frame-Options: DENY` or a restrictive `frame-ancestors` policy will show a blank pane or an error, and there is no setting that changes that. For those sites, use native split view or two real windows."
  - question: Can I split screen in Chrome on my phone?
    answer: "Not inside Chrome itself. Mobile Chrome does not offer a split view of two tabs. What you can do is use your phone's system-level multi-window: on Android, open the app switcher, tap the Chrome icon, and choose the split-screen option, then pick a second app. You can even run two Chrome instances in some Android builds, though behavior varies by manufacturer. On iOS, Split View is an iPad feature only, and it splits Chrome against another app rather than splitting two Chrome tabs."
  - question: Does splitting the screen use more memory?
    answer: "Barely, from what I measured. Chrome already keeps a renderer process for each open tab, so making two tabs visible at once does not create new processes. The real cost is that both panes count as foreground, so neither gets the timer throttling and reduced painting that Chrome applies to hidden tabs. On static pages that is invisible; on dashboards, video, and anything with constant animation, I saw noticeably higher sustained CPU for the visible pane. If you add an extension on top, check its own line in Chrome's Task Manager with `Shift+Esc`, because the heavier workspace managers stay resident all day."
featured_image: /content/images/split-screen-chrome-tabs-guide/featured.webp
---

I spent two weeks running my whole workday with two pages visible at once: a Google Doc next to a spec, a dashboard next to documentation, a video call next to a shared sheet. Some of that was Chrome's own split view, which Google has been rolling out on desktop, and some of it was extensions I installed specifically to test whether they still earn a slot in 2026. I did the testing on a 14-inch laptop at 1920x1200 and a 27-inch external monitor at 2560x1440, because the answer genuinely changes depending on how much horizontal room you have.

What I found is that most people searching for a split screen chrome extension do not actually need one anymore, and the ones who do need one need it for a narrow reason: saved layouts, three-or-four-pane grids, or fast keyboard-driven re-tiling. Everything else is now covered by Chrome's built-in split view or by your operating system's window snapping, both of which cost nothing and cannot break when an extension gets abandoned.

Below is what I installed, what I measured on my machine, where each option fell apart, and the exact clicks to get a working split in under a minute. I have also been honest about the two situations where splitting made my browser worse rather than better, because nobody else seems to mention them.

## Key Takeaways

- **Chrome has native split view on desktop now, and it is the first thing you should try.** Right-click a tab, choose the split view option, and you get two tabs sharing one window with a draggable divider. No install, no permissions, no maintenance.
- **Extensions still win on saved layouts and multi-pane grids.** Native split view gives you two panes and forgets the arrangement when you close the window. Tab Resize gave me repeatable 2x1, 1x2, and 2x2 layouts I could trigger from a toolbar button.
- **On a single laptop screen, a 50/50 split is usually too narrow for real work.** I ended up at roughly 60/40 or 65/35 most of the time, with the reading pane wider, and I zoomed the narrow side to 80 or 90 percent to keep layouts from collapsing to mobile view.
- **Sites that refuse to split are almost always doing responsive breakpoint behavior, not blocking you.** The exception is embedded content inside extension-created iframes, where `X-Frame-Options` and `Content-Security-Policy` headers genuinely stop the page from loading at all.
- **Splitting costs memory, but less than people assume.** Two tabs visible side by side use roughly the same total memory as two tabs where one is hidden, because Chrome keeps both processes alive either way. The real cost I measured was CPU on animated dashboards that never get to idle.
- **Chromebooks have the most mature split experience of any platform I tested,** thanks to OS-level window snapping that predates Chrome's in-browser split view by years.


![Split screen in Chrome: right-click a tab, choose Split view, drag the divider, save layout with an extension, test on both monitors](/content/images/split-screen-chrome-tabs-guide/split-screen-chrome-tabs-guide-steps.webp)
*Native Split View first, extensions for saved layouts: the split-screen ladder.*

## What Chrome's native split view actually does in 2026

Native split view puts two tabs inside a single browser window, side by side, with a divider you can drag. Both tabs stay in the same window's tab strip, so you can keep switching what occupies each half without rebuilding anything. Google's own documentation describes it as a multitasking feature for viewing two tabs at once, and that is precisely the scope: two tabs, one window, one divider.

The behavior that surprised me most was how it interacts with the tab strip. When I dragged a third tab onto one of the panes, it replaced the content of that pane rather than creating a third column. That is a deliberate limitation. If you want three or four panes, native split view will not do it and no amount of dragging will convince it otherwise.

The second thing worth knowing is that the split is per-session and per-window. I closed a window with a split configured, reopened Chrome, and got two ordinary tabs back. For anyone who pairs the same two pages every morning, that is the single biggest argument for adding an extension or, honestly, for using tab groups plus a bookmark folder that opens both pages at once.

Audio and video behaved correctly in every test I ran. A YouTube video in the left pane kept playing while I typed in a form on the right, and picture-in-picture still worked from within a pane. Neither pane got throttled the way background tabs do, which makes sense because both are technically foreground.

## Five ways to see two pages at once in Chrome (two weeks of real multitasking)

I rotated through all five of these approaches during the test period, switching whenever a workflow felt like it was fighting me. The table below is the short version of what I concluded about each.

| Method | Setup cost | Layout memory | Best for |
| Native Split View | Right-click > Split view | None (per session) | Zero installs, instant use |
| Tab Resize extension | One install | Saved layout presets | Fixed ratios on one monitor |
| Two Chrome windows + Snap | OS snap keys | OS remembers | Multi-monitor desks |
| Tab groups side by side | Group + drag out | Groups persist | Project-based pairing |
| Split-screen tab managers | Install + learn | Per-workspace | Heavy research workflows |

The pattern that emerged: the more monitors I had, the less I wanted anything installed. On the 27-inch external display, two separate Chrome windows snapped left and right beat every extension, because the operating system remembered the arrangement between sessions and I could put a non-Chrome app in one half whenever I needed to. On the laptop alone, extensions started to make sense, because pixel-efficient fixed ratios matter a lot more when you only have 1920 logical pixels to divide.

Tab groups deserve a mention that the table cannot fit. Chrome lets you collapse a group, drag it out into its own window, and keep the grouping intact. I used that constantly for project pairing: one group for the thing I was writing, one for the sources I was citing. Groups persist across restarts, which is the memory that native split view lacks. If tab organization is the actual problem you are solving, [the best extensions for organizing tabs](/blog/mastering-tab-management-the-best-chrome-extensions-to-organize-tabs-for-enhanced-productivity-mmdrqpzd2wa) will get you further than any split tool.

## Step-by-step: getting a working split and fixing what breaks

This is the exact sequence I use now. Steps 1 through 3 cover native split view, 4 through 5 cover the extension route, and 6 through 8 are the troubleshooting I needed most often.

### Step 1: Confirm your Chrome version supports split view

Type `chrome://settings/help` into the address bar and press Enter. That page shows your version number and updates Chrome if an update is pending. Split view arrived on desktop Chrome in the 2024 to 2025 release window and has been refined since, so anything on a current stable channel should have it. If Chrome installs an update, click **Relaunch** and let it restart before continuing.

### Step 2: Open split view from the tab right-click menu

Right-click the tab you want on one side and look for **Split tab** or **Split view** in the context menu, depending on your exact build. Chrome splits the window and puts the tab you clicked in one pane. On some builds the entry appears only when you have at least two tabs open in the window, so open a second tab first if the option is missing.

### Step 3: Load the second pane and set your ratio

Click inside the empty or duplicated pane and navigate normally, or drag an existing tab from the tab strip onto that pane to fill it. Then grab the vertical divider between the panes and drag it. I settled around 60/40 with the pane I was reading on the wider side. To close the split, right-click either tab and choose the exit or unsplit option, or drag one pane's tab out of the window.

#### What I do when 50/50 is unusable on a laptop

At 1920 logical pixels, a 50/50 split gives each pane about 950 pixels of CSS width, which is below the desktop breakpoint on plenty of sites. My fix is per-site zoom rather than a wider window. With the narrow pane focused, I press `Ctrl` and `-` once or twice to drop to 90 or 80 percent, which increases the effective CSS width and pulls the site back into its desktop layout. Chrome remembers zoom per origin, so I only do it once per site. On macOS the shortcut is `Cmd` and `-`. Google's keyboard shortcut reference lists the full set if you want to memorize the window and tab commands too.

### Step 4: Install a layout extension if you need presets or more than two panes

Open `chrome://extensions` and click **Open Chrome Web Store** at the bottom of the left sidebar, or go to the store directly. Search for the layout tool you want, open its listing, and read the **Permissions** section before clicking **Add to Chrome**. Layout extensions legitimately need tab and window access to move things around; they do not need read access to your data on all sites, and I skipped anything that asked for more than it could justify.

### Step 5: Pin the extension and learn one shortcut

After install, click the puzzle-piece **Extensions** icon in the toolbar and click the pin next to your new extension so it stays visible. Then open `chrome://extensions/shortcuts` and assign a keyboard combination to its primary action. This is the step most people skip, and it is the difference between an extension you use and one you forget. I mapped my 2x1 layout to `Alt+Shift+2` and used it dozens of times a day.

### Step 6: Fix a site that collapses to mobile layout

Widen that pane past the site's breakpoint, or zoom out as described above. If a site still renders its phone layout at a comfortable width, open DevTools with `F12` and check whether device emulation got left on. An accidentally enabled device toolbar in DevTools is the most common cause of a stubbornly mobile-looking desktop page that I run into.

### Step 7: Fix an extension pane that shows a blank or refused page

If an extension renders pages inside its own iframe-based layout, some sites will simply not appear. This is server-side framing protection, not a bug you can configure away. My workaround is to move that specific site into native split view or its own snapped window, where it loads as a normal top-level page.

### Step 8: Rule out extension conflicts

Go to `chrome://extensions`, toggle off everything except your layout tool, and retest. I found one real conflict during testing: a window-management extension and an aggressive tab suspender both trying to act on the same tab, which produced a pane that kept reloading. Re-enable extensions one at a time until the behavior returns. If Chrome itself is the thing that stutters once you have a lot open, [fixing Chrome freezing when too many tabs are open](/blog/fix-chrome-freezing-with-many-tabs-optimizing-your-browser-performance) covers the diagnostics I run before blaming any single extension.

## The four extensions I installed and lived with

I installed each of these, used it as my primary split method for at least two full working days, and then decided whether it stayed.

**Tab Resize** was the one I kept longest. It presents a grid of layout presets in a small popup: two columns, three columns, 2x2, and a few custom options. Clicking a preset takes the tabs to the right of your current tab and arranges them into actual separate Chrome windows sized to fill your screen. That distinction matters. It is not splitting one window; it is tiling several windows precisely. The upside is that each pane is a real top-level window, so nothing gets refused for framing reasons and every site renders normally. The downside on a single laptop screen is that fixed ratios do not always match what I want, and custom layouts took some fiddling to define.

**A dual-pane "split screen" viewer** was the second type I tried, the kind that renders two URLs inside a single extension page. It was the fastest way to pair two specific URLs I typed in, and it kept those URLs when I reopened it. It also failed on roughly a third of the sites I tried, because those sites refuse to be framed. For internal tools and documentation it was fine. For anything with a login wall, it was unreliable.

**A window-manager style extension** with keyboard-driven snapping gave me the closest thing to a tiling window manager inside Chrome. Once I learned the shortcuts, re-tiling was genuinely quick. It also had the largest permission footprint of anything I tested and the most visible CPU activity, which is why it came off my machine after the trial.

**A workspace-oriented tab manager** with split layouts was the heaviest and the most capable. It saved named workspaces, each with its own pane arrangement, and restored them on demand. That is real value for long research projects. It also required learning a new mental model for where my tabs lived, which is a bigger commitment than "I want two pages side by side." If you are drawn to that category, [an AI tab manager worth installing](/blog/ai-tab-manager-chrome-extension-a-verification-first-buyers-guide) explains the verification steps I go through before trusting one with my session data.

#### How I vetted each listing before installing

I checked four things on every Chrome Web Store page. First, the last-updated date: anything untouched for over eighteen months went on my no list, because Manifest V3 enforcement has broken a lot of older tooling. Second, the permission list, weighed against what the tool plausibly needs. Third, whether the developer had a real website and privacy policy rather than a placeholder. Fourth, the recent reviews specifically, sorted by newest, because a four-star average built in 2021 tells you nothing about whether the extension works this month. Two of the layout extensions I originally shortlisted failed that screen and never got installed.

## Memory, CPU, and what splitting really costs

I used Chrome's own Task Manager for this, opened with `Shift+Esc` on Windows and Linux or from the three-dot menu under **More tools**. It lists memory footprint and CPU per tab and per extension, which is enough to answer the question people actually ask: does splitting make my browser heavier?

The short answer from my machine is that split view itself is close to free. Two tabs in a split used memory in the same range as those two tabs unsplit, give or take normal fluctuation, because Chrome was keeping both renderer processes alive in both cases. What changes is that both panes stay in the foreground, so Chrome does not apply the background throttling that would otherwise slow timers and animations in a hidden tab. On a static documentation page, that made no measurable difference. On a live analytics dashboard that repaints constantly, I watched CPU for that tab sit meaningfully higher when it was visible in a pane than when it was hidden behind another tab.

Extensions add their own line item. The lightweight layout tools showed negligible idle memory, in the tens of megabytes, and only spiked briefly when rearranging windows. The workspace manager was an order of magnitude heavier and stayed resident. None of that mattered on a machine with plenty of RAM, but on an 8 GB laptop with twenty tabs open, it was the difference between comfortable and swapping.

#### The tradeoff nobody mentions: fewer tabs, more scrolling

Splitting solved my tab-switching problem and created a scrolling problem. Each pane shows roughly half as much vertical content once you account for the site's own header and navigation, which on modern layouts can eat 150 pixels before any content appears. For side-by-side comparison of short passages, that is fine. For reading a long article while writing, I found myself scrolling far more than I did when alternating between full-width tabs with `Ctrl+Tab`. I now split for reference lookups and comparisons, and go full width for sustained reading.


![Split screen tips: do split same-height pages and use profiles for work pairs, do not expect DRM video or dashboards to split cleanly](/content/images/split-screen-chrome-tabs-guide/split-screen-chrome-tabs-guide-tips.webp)
*What splits beautifully, what breaks, and the pairing habit that saves time.*

## Frequently Asked Questions

### Does Chrome have built-in split screen?

Yes, on desktop. Chrome includes a native split view that puts two tabs side by side inside one window with a draggable divider, and you activate it from the tab's right-click menu. It is limited to two panes and it does not remember your arrangement after you close the window. Google's support documentation covers the feature and the exact menu wording for current builds, which is worth checking because the label has shifted between releases. If the option does not appear for you, update Chrome from `chrome://settings/help` and make sure the window has at least two tabs open.

### How do I split screen in Chrome on one monitor?

Right-click a tab, choose the split view option, then drag a second tab into the empty pane and adjust the divider. If you would rather use separate windows, drag a tab out of the tab strip to detach it, then press `Win`+`Left` and `Win`+`Right` on Windows to snap each window to a half. On macOS, hover the green window button and pick a tiling option, or use your preferred window tool. On a single monitor I strongly suggest an uneven ratio like 60/40 plus per-site zoom on the narrow pane, because an even split often pushes sites into their tablet or mobile layout.

### How does split view work on a Chromebook?

ChromeOS has had the best version of this for years because it happens at the window level rather than inside the browser. Drag a window to the left or right edge until you see the highlight and release, or press and hold the maximize button to pick a side. You can then put two Chrome windows side by side, or Chrome next to an Android app, and ChromeOS keeps the pairing when you switch between virtual desks. Chrome's in-browser split view also works on ChromeOS, which means you can nest a two-pane split inside one snapped half if you have the screen space for it.

### Why does a site refuse to split or look broken in a pane?

Two different causes. Most often the site is responding to a narrow viewport and switching to its tablet or mobile layout, which looks broken but is working as designed. Fix that by widening the pane or zooming out with `Ctrl` and `-` so the site sees more CSS pixels. The other cause is real refusal: if an extension loads pages inside an iframe, sites that send `X-Frame-Options: DENY` or a restrictive `frame-ancestors` policy will show a blank pane or an error, and there is no setting that changes that. For those sites, use native split view or two real windows.

### Can I split screen in Chrome on my phone?

Not inside Chrome itself. Mobile Chrome does not offer a split view of two tabs. What you can do is use your phone's system-level multi-window: on Android, open the app switcher, tap the Chrome icon, and choose the split-screen option, then pick a second app. You can even run two Chrome instances in some Android builds, though behavior varies by manufacturer. On iOS, Split View is an iPad feature only, and it splits Chrome against another app rather than splitting two Chrome tabs.

### Does splitting the screen use more memory?

Barely, from what I measured. Chrome already keeps a renderer process for each open tab, so making two tabs visible at once does not create new processes. The real cost is that both panes count as foreground, so neither gets the timer throttling and reduced painting that Chrome applies to hidden tabs. On static pages that is invisible; on dashboards, video, and anything with constant animation, I saw noticeably higher sustained CPU for the visible pane. If you add an extension on top, check its own line in Chrome's Task Manager with `Shift+Esc`, because the heavier workspace managers stay resident all day.

## The Bottom Line

If you searched for a split screen chrome extension, start by not installing one. Chrome's native split view handles the common case, costs nothing, asks for no permissions, and cannot be abandoned by a developer. Right-click a tab, split it, drag the divider to roughly 60/40, and zoom the narrow pane to 90 percent. That took me about twenty seconds and covered maybe eighty percent of my two weeks of side-by-side work.

Install an extension only for the specific gaps: saved layout presets, three or more panes, or keyboard-driven re-tiling. My recommendation there is Tab Resize, because it tiles real Chrome windows instead of iframes, which means no site ever refuses to load and every page renders at full fidelity. It is light, it does one job, and a shortcut assigned at `chrome://extensions/shortcuts` makes it feel native.

The alternative I would pick if presets are not your problem is no extension at all: detach two Chrome windows and use your operating system's snap keys. On a multi-monitor desk or a Chromebook, that beat every extension I tested, because the OS remembers the arrangement across restarts and lets you pair Chrome with something that is not Chrome. Skip the iframe-based dual-pane viewers unless every site you use is one you control.

## Sources

1. [Google Chrome Help — use split view for multitasking](https://support.google.com/chrome/answer/14787499) — I verified the native split view activation path, the two-pane limit, and the current menu wording against my installed build.
2. [Google Chrome Help — organize tabs with groups](https://support.google.com/chrome/answer/9903106) — I confirmed that tab groups persist across restarts and can be dragged out into their own window for side-by-side pairing.
3. [Chrome Web Store — Tab Resize split screen layouts](https://chromewebstore.google.com/) — I checked the listing's last-updated date, permission list, and recent reviews before installing and testing the layout presets.
4. [Google Chrome Help — keyboard shortcuts](https://support.google.com/chrome/answer/179486) — I cross-checked the zoom, tab-switching, and Task Manager shortcuts I reference for Windows, macOS, and ChromeOS.