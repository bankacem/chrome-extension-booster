# Quality Inventory — broken auto-links & thin articles

Read-only inventory (owner delegation 2026-10-09, item ب-3), produced by a
deterministic scan of all **878 published non-i18n article files** at
`e2e7d054227d78ae21e50ed6e849f8bd705ce1c1`. Scan code: workspace
`scripts/corpus_link_scan.py` (patterns: in-word link splits
`letter][…](url)letter`, adjacent link splits `](url)[`,
possessive splits `](url)'s`).

## 1. Broken / mid-word auto-links

| Pattern | Files affected | Links |
|---|---|---|
| In-word link split (`power|ful`) | **0 after this PR** (1 found → fixed here) | 2 tags removed, text kept |
| Adjacent-link phrase split | 1 (below) | 2 |
| Possessive split (`verify it](url)'s`) | 0 remaining (1 was in the #501 pilot set) | — |

**Fixed in this PR** (1 file, link-tag removal only, words 4024 -> 4024,
`link_tag_removal_gate` PASS):
- `unlocking-data-visualization-the-power-of-tableau-chrome-extension` —
  `[as a power](…)[ful browser](…)-based` -> `as a powerful browser-based`.

**Fixed earlier in PR #501 round 5** (same licenses, merged 239a3c96):
mid-word/adjacent/self/irrelevant tags across the 5 pilot articles
(the-best-popup x2, an-image-downloader x3, pop-partial x1 self-link,
memory-saver-4 x1).

**Remaining corpus-wide: 0 files with broken link patterns.**

Method note: relevance adjudication of every one of the thousands of
topical internal links is a manual editorial task; the deterministic
breakage patterns above are complete, and the irrelevant-topic cases
surfaced by the scan were handled in #501 (Related Guides + mismatched
targets on the pilot set).

## 2. Published articles under 1000 words: 71

Sorted by word count (body text). Owner decision needed on whether to
expand, merge (see duplicate-clusters.md), or leave — no action taken in
this PR.

| words | slug |
|---|---|
| 419 | privacy-security-guide |
| 461 | youtube-tools-guide |
| 914 | easy-screenshot-chrome-comparison-2 |
| 917 | the-right-extension-to-cap-chromes-ram-usage |
| 922 | enable-night-mode-on-linkedin-for-eye-protection-1 |
| 923 | extension-chrome-indispensable-12 |
| 926 | quick-screenshot-chrome-review-3 |
| 928 | best-quick-screenshot-chrome-tools-3 |
| 933 | best-screenshot-tools-for-chrome-2 |
| 937 | how-to-add-extensions-to-chrome-mobile |
| 939 | easy-screenshot-chrome-alternatives |
| 940 | extension-chrome-rafraichissement-automatique-15 |
| 941 | enhance-your-online-experience |
| 941 | mobile-browsers-that-support-chrome-extensions |
| 941 | the-best-youtube-extensions-for-chrome |
| 947 | hidden-chrome-extensions-you-should-try |
| 947 | how-to-install-and-use-idm-extension-to-chrome-for-enhance |
| 948 | best-amoled-black-theme-for-reddit-users |
| 948 | breaking-free-from-annoying-ads-the-power-of-anti-popup-fr |
| 949 | why-your-browser-keeps-redirecting-and-how-to-fix-it-cyber |
| 950 | lighthouse-audit-chrome-extension-guide |
| 953 | the-chrome-extension-that-removes-ads-for-good |
| 954 | youtube-dark-mode-desktop-2026-turn-it-on-in-30-seconds |
| 956 | browsing-extensions-like-ghostery-compared |
| 956 | stop-video-popups-from-playing-automatically-3 |
| 957 | fix-high-cpu-usage-chrome-2026-optimizing-your-browser |
| 957 | safe-streaming-how-to-block-popups-on-movie-sites-8 |
| 959 | best-extension-to-reduce-chrome-ram-usage-boosting-browser |
| 962 | ghostery-alternatives-worth-checking-out |
| 964 | a-chrome-extension-marketers-will-actually-use |
| 964 | unlocking-the-full-potential-of-youtube-youtube-extensions |
| 968 | extension-chrome-chat-gpt-2 |
| 970 | how-to-disable-adblocker-detection-scripts |
| 970 | stop-annoying-ads-chrome-mobile |
| 971 | why-auto-dark-mode-is-essential-for-programmers-6 |
| 975 | how-to-use-meta-pixel-helper-for-conversion-tracking |
| 976 | the-best-free-adblocker-for-chrome-android |
| 976 | why-is-chrome-using-so-much-memory-2026-fixes |
| 979 | a-lightweight-ad-blocker-for-chrome |
| 980 | extension-to-chrome-android-9 |
| 980 | quick-screenshot-chrome-in-2025-7 |
| 981 | extension-chrome-google-tag-manager-11 |
| 982 | unlocking-the-power-of-merci-app-extension-chrome |
| 983 | screenshot-tool-chrome-2025-8 |
| 983 | unlocking-the-power-of-facebook-chrome-extensions-for-face |
| 984 | download-youtube-music-right-from-chrome |
| 984 | easy-screenshot-chrome-review |
| 985 | quick-screenshot-chrome-guide-2 |
| 986 | boosting-your-browsing-experience |
| 986 | chrome-extensions-that-make-linkedin-better |
| 988 | bringing-gemini-into-your-chrome-browser |
| 988 | unlocking-ad-free-browsing-adblock-chrome-android |
| 989 | downloading-instagram-content-from-chrome |
| 989 | quick-screenshot-chrome-alternative-4 |
| 990 | effortless-image-downloading-bulk-image-downloader-chrome- |
| 990 | how-to-force-dark-mode-on-amazon-website-3 |
| 990 | instagram-story-downloader-chrome |
| 991 | how-to-save-instagram-photos-and-videos |
| 992 | the-best-chrome-extensions-for-slow-computers |
| 994 | an-ad-blocking-extension-that-actually-works |
| 994 | free-screenshot-extensions-for-chrome |
| 994 | lightweight-ad-blocker-vs-ghostery |
| 995 | extension-chrome-keepass-13 |
| 995 | the-best-chrome-extension-to-view-source-code |
| 995 | unlocking-ad-free-browsing-on-the-go-chrome-mobile-adblock |
| 996 | downloading-images-in-bulk-with-chrome |
| 996 | the-power-of-extension-ad-block-chrome |
| 996 | unlocking-the-power-of-eternl-chrome-enhanced-browsing |
| 998 | how-to-speed-up-idm-downloads-on-chrome-browser |
| 999 | a-fast-ad-blocker-without-the-memory-leaks |
| 999 | how-to-find-and-download-the-best-chrome-extensions-for-a- |

## 3. Counts

- Files scanned: 878 published (i18n copies excluded).
- Broken-link patterns remaining: **0**.
- Articles < 1000 words: **71 / 878 (8.1%)**.
- Overlapping topic clusters: see `docs/duplicate-clusters.md`.
