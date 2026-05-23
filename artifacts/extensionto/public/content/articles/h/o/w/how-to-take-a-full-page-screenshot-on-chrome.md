---
id: b8f279a7-432a-42ee-8f64-dc4926b250a6
title: "How to Take a Full Page Screenshot on Chrome (2026)"
slug: how-to-take-a-full-page-screenshot-on-chrome
meta_description: "Capture an entire webpage — including content below the fold — with Chrome's built-in tool or extensions. No extension required for the fastest method."
excerpt: "Capture an entire webpage — including content below the fold — with Chrome's built-in tool or extensions. No extension required for the fastest method."
category: Screenshot & Screen Capture
tags: ["screenshot", "full page", "chrome", "devtools"]
keywords: ["how to take a full page screenshot on chrome", "screenshot", "full page", "chrome", "devtools"]
author: "Daniel Carter"
status: draft
published_at: null
scheduled_at: "2026-07-27T09:00:00.000Z"
created_at: "2026-05-17T01:07:29.249Z"
updated_at: "2026-05-17T01:07:29.249Z"
read_time: 3
views: 0
canonical: "https://extensionto.com/blog/how-to-take-a-full-page-screenshot-on-chrome"
---

## Table of Contents

- [Table of Contents](#table-of-contents)
- [Method 1: Chrome DevTools (No Extension, Fastest)](#method-1-chrome-devtools-no-extension-fastest)
- [Method 2: GoFullPage Extension](#method-2-gofullpage-extension)
- [Method 3: Awesome Screenshot](#method-3-awesome-screenshot)
- [Method 4: Nimbus Screenshot](#method-4-nimbus-screenshot)
- [Tips for Better Full Page Screenshots](#tips-for-better-full-page-screenshots)
- [FAQ](#faq)

---

# How to Take a Full Page Screenshot on Chrome (2026)

**Quick Answer:** Press **F12 → Ctrl+Shift+P → type "screenshot" → select "Capture full size screenshot"** in Chrome DevTools. No extension needed. Downloads the entire page as a PNG instantly.

---

## Table of Contents
1. [Method 1: Chrome DevTools (No Extension, Fastest)](#devtools)
2. [Method 2: GoFullPage Extension](#gofullpage)
3. [Method 3: Awesome Screenshot](#awesome)
4. [Method 4: Nimbus Screenshot](#nimbus)
5. [Tips for Better Full Page Screenshots](#tips)
6. [FAQ](#faq)

---

## Method 1: Chrome DevTools (No Extension, Fastest) {#devtools}

Chrome's built-in Developer Tools include a hidden screenshot feature that captures the complete page — everything above and below the fold.

**Steps:**
1. Open the page you want to screenshot
2. Press **F12** to open DevTools (or right-click → Inspect)
3. Press **Ctrl+Shift+P** (Windows) or **Cmd+Shift+P** (Mac)
4. A command palette appears — type **"screenshot"**
5. Select **"Capture full size screenshot"**
6. Chrome scrolls through the page automatically
7. A PNG file downloads to your Downloads folder

**Result:** A single PNG image of the complete page at native resolution.

**Works on:** Any website, including those that block right-click

---

## Method 2: GoFullPage Extension {#gofullpage}

GoFullPage is the most popular dedicated full-page screenshot extension with 2M+ users.

1. Install **GoFullPage** from the Chrome Web Store
2. Navigate to the page
3. Click the GoFullPage icon (camera icon in toolbar)
4. It scrolls through the page and stitches a complete screenshot
5. Choose to **download as PNG** or **PDF**, or edit in the GoFullPage editor

**Advantage over DevTools:** Better handling of lazy-loaded images (images that only load as you scroll).

**GoFullPage handles:** Sticky headers/footers, parallax backgrounds, infinite scroll pages (partial).

---

## Method 3: Awesome Screenshot {#awesome}

Awesome Screenshot offers full-page capture plus annotation tools.

1. Install **Awesome Screenshot & Screen Recorder**
2. Click the icon → **"Capture full page"**
3. After capture, you can annotate with arrows, text, and shapes
4. Blur sensitive information before saving
5. Download as PNG or upload for a shareable link

Best for: Bug reports, design reviews, annotated documentation.

---

## Method 4: Nimbus Screenshot {#nimbus}

Nimbus Screenshot also offers full-page capture with professional annotation.

1. Install **Nimbus Screenshot**
2. Click the icon → **"Entire page"**
3. Annotate and edit in the built-in editor
4. Save locally or upload to Nimbus workspace

Best for: Teams that collaborate on screenshots.

---

## Tips for Better Full Page Screenshots {#tips}

- **Close cookie banners first** — use the browser's built-in console to hide them: `document.querySelector('.cookie-banner').style.display='none'`
- **Set zoom to 100%** — Ctrl+0 normalizes zoom before capturing
- **Use DevTools device emulation** for specific viewport widths: F12 → toggle device toolbar → set custom width
- **For lazy-loaded images:** Scroll through the page manually first so all images load, then use GoFullPage (DevTools method may miss lazy-loaded images)
- **For very long pages:** GoFullPage handles up to ~15,000px height reliably

---

## FAQ {#faq}

**Why does my full page screenshot cut off at the bottom?**
The page may use infinite scroll or lazy loading that stopped mid-page. Scroll through the entire page manually before capturing, then use GoFullPage.

**Can I take a full page screenshot of a PDF in Chrome?**
Yes, using the DevTools method. Open the PDF in Chrome, then use Ctrl+Shift+P → "Capture full size screenshot."

**How large can a full page screenshot get?**
Very long pages can produce PNG files of 10–50MB. For sharing, export as PDF instead (GoFullPage supports this).

**Why is the DevTools screenshot blurry?**
This happens when Chrome's device pixel ratio is not 1:1. In DevTools, go to the device toolbar and set DPR to 1.

---

*Published by [ExtensionTo](https://extensionto.com) — Your guide to Chrome extensions.*

---

## Related Articles

- [How to Take a Screenshot in Chrome (5 Methods 2026)](/blog/how-to-take-screenshot-in-chrome)
- [How to Document Bugs with Screenshots in Chrome (2026)](/blog/how-to-document-bugs-with-screenshots)
- [What Is the Fastest Screenshot Extension for Chrome? (2026)](/blog/what-is-the-fastest-screenshot-extension)
- [Is the Chrome Screen Capture Extension Free? (2026)](/blog/is-chrome-screen-capture-extension-free)
