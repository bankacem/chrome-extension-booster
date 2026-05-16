# SITEMAP STATUS — ExtensionTo
> Generated: 2026-05-14 | Post URL-Normalization Sitemap Audit

---

## Sitemap Overview

| Property | Value |
|---|---|
| File Location | `artifacts/extensionto/public/sitemap.xml` |
| XSL Stylesheet | `artifacts/extensionto/public/sitemap.xsl` |
| Base URL | `https://extensionto.com` |
| Schema | Sitemaps Protocol 0.9 |
| Total URLs | **502** |
| Articles Included | 489 |
| Articles Excluded (quality) | 11 |
| Static Pages | 4 |
| Extension Pages | 9 |
| Hash Slug URLs | **0** ✅ |
| Broken Locs | **0** ✅ |
| Last Generated | 2026-05-14 via `pnpm sync` |

---

## URL Breakdown

### Static Pages (4 URLs)
| URL | Priority | Changefreq |
|---|---|---|
| `https://extensionto.com/` | 1.0 | weekly |
| `https://extensionto.com/blog` | 0.9 | daily |
| `https://extensionto.com/privacy` | 0.3 | yearly |
| `https://extensionto.com/terms` | 0.3 | yearly |

### Extension Pages (9 URLs @ Priority 0.9)
| URL |
|---|
| `/quick-screenshot-lite` |
| `/auto-dark-mode-switcher` |
| `/redirect-shield` |
| `/protab-suspender` |
| `/light-popup-blocker` |
| `/formula-builder-pro` |
| `/securakey-pro` |
| `/offline-reader-pro` |
| `/cookie-banner-blocker` |

### Article Priority Distribution

| Priority | Count | Criteria |
|---|---|---|
| 1.0 | 4 | Static pages |
| 0.9 | 9 | Extension product pages |
| 0.85 | 8 | Pillar articles |
| 0.8 | ~45 | Articles published within last 30 days |
| 0.7 | ~436 | Standard articles |
| 0.3 | 2 | Legal/privacy pages |

### Articles Excluded from Sitemap (11)

These articles exist in the index but are excluded from `sitemap.xml` due to quality flags:

| Slug | Flag | Reason |
|---|---|---|
| `adblock-android-guide` | thin | < 300 words |
| `chrome-screenshot-guide` | thin | < 300 words |
| `privacy-security-guide` | thin | < 300 words |
| `youtube-tools-guide` | thin | < 300 words |
| `internet-download-manager-extension` | thin | < 300 words |
| `adblocker-for-android-chrome` | thin | < 300 words |
| `adblock-for-android-chrome-partial` | partial | Incomplete content |
| `pop-up-blocker-for-chrome-partial` | partial | Incomplete content |
| `chrome-popup-blocker-partial` | partial | Incomplete content |
| `how-to-speed-up-chrome-partial` | partial | Incomplete content |
| `privacy-badger-chrome-partial` | partial | Incomplete content |

*Recommendation: Expand the 6 thin articles to 500+ words to qualify for sitemap inclusion.*

---

## XSL Stylesheet — Enterprise Features

The sitemap includes a professional XSL stylesheet (`/sitemap.xsl`) that transforms the XML into a visually rich HTML interface when viewed in a browser. Google and other crawlers receive the raw XML; only human visitors see the styled view.

### Features Included

| Feature | Implementation |
|---|---|
| Live search filter | JavaScript `input` event on `#q` |
| Priority filter buttons | All / 1.0 Critical / 0.9 High / 0.8 Standard / ≤0.7 Low |
| Real-time result count | Updates on every keystroke |
| Keyboard shortcut | `/` focuses search; `Esc` clears |
| Priority color coding | Cyan (1.0) / Blue (0.9) / Violet (0.7) / Slate (≤0.3) |
| Stats chips in header | Total URLs / High priority count / Frequently updated count |
| URL count stat | Live count showing total indexed URLs |
| Responsive design | Mobile-optimized at 768px breakpoint |
| JetBrains Mono font | For URL readability |
| Glass morphism UI | `backdrop-filter: blur(18px)` |
| Google-compatible | XSL does NOT alter the XML data, only display |

### Google Compatibility

The `<?xml-stylesheet?>` processing instruction is ignored by all search engine crawlers. Google, Bing, and others consume the raw XML. The XSL transform only activates in browser contexts (Firefox, Safari; Chrome has limited XSL support in some versions).

---

## Sitemap XML Validation

```
✅ Valid XML 1.0 encoding UTF-8
✅ Namespace: http://www.sitemaps.org/schemas/sitemap/0.9
✅ All <loc> elements contain valid HTTPS URLs
✅ All <lastmod> values in YYYY-MM-DD format
✅ All <priority> values between 0.0 and 1.0
✅ All <changefreq> values are valid schema values
✅ Zero hash-suffix URLs (all cleaned)
✅ XSL stylesheet declaration at line 2
✅ 502 <url> entries total
```

---

## Sitemap Submission Checklist

- [ ] Deploy to production (Vercel)
- [ ] Verify `https://extensionto.com/sitemap.xml` returns HTTP 200
- [ ] Verify `https://extensionto.com/sitemap.xsl` returns HTTP 200 with `text/xsl` content-type
- [ ] Submit sitemap in Google Search Console → Sitemaps
- [ ] Submit sitemap in Bing Webmaster Tools
- [ ] Verify robots.txt contains: `Sitemap: https://extensionto.com/sitemap.xml`
- [ ] Check GSC Index Coverage after 1 week for redirect processing

---

## robots.txt Status

`artifacts/extensionto/public/robots.txt` should contain:
```
User-agent: *
Allow: /
Sitemap: https://extensionto.com/sitemap.xml
```

Verify this is correct before deploying.

---

## Regeneration Command

```bash
cd artifacts/extensionto
pnpm run sync
# This runs: sync-articles.mjs → generate-sitemap.mjs
# Output: articles-index.json (500 entries) + sitemap.xml (502 URLs)
```
