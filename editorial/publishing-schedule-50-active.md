# ExtensionTo — Active 50-Article Publishing Schedule

**Timezone:** `Africa/Algiers`
**Cadence:** 5 articles per day at `09:00, 12:00, 15:30, 18:30, 21:00`
**Total:** 50 planned articles; `zoom-chrome-extension-guide` is already published and will not be dispatched again.
**Pending:** 49 articles over 10 days (`5,5,5,5,5,5,5,5,5,4`).

## Release controls

The workflow releases only a draft article whose `visual_ready` gate is true and whose inline WebP and AVIF siblings exist. After each release it rebuilds `articles-index.json` and `sitemap.xml` in the same workflow. It exits idempotently when a slot is already published. Google Indexing API requests remain disabled for general blog guides; Search Console is required for Google indexing evidence.

| Release slot | Date | Time (Algiers) | Slug | Status at activation | Visual gate |
|---:|---|---|---|---|---|
| 1 | 2026-08-23 | completed | `zoom-chrome-extension-guide` | `completed` | complete (2 official inline screenshots) |
| 2 | 2026-08-24 | 09:00 | `chrome-extension-permissions-guide` | `draft` | required (1 unique inline WebP + AVIF) |
| 3 | 2026-08-24 | 12:00 | `momentum-chrome-extension-guide` | `draft` | required (1 unique inline WebP + AVIF) |
| 4 | 2026-08-24 | 15:30 | `chrome-extensions-incognito-guide` | `draft` | required (1 unique inline WebP + AVIF) |
| 5 | 2026-08-24 | 18:30 | `chrome-extension-host-permissions-guide` | `draft` | required (1 unique inline WebP + AVIF) |
| 6 | 2026-08-24 | 21:00 | `chrome-new-tab-extension-guide` | `draft` | required (1 unique inline WebP + AVIF) |
| 7 | 2026-08-25 | 09:00 | `chrome-logger-debugging-guide` | `draft` | required (1 unique inline WebP + AVIF) |
| 8 | 2026-08-25 | 12:00 | `allow-chrome-extension-file-urls-guide` | `draft` | required (1 unique inline WebP + AVIF) |
| 9 | 2026-08-25 | 15:30 | `printfriendly-chrome-extension-guide` | `draft` | required (1 unique inline WebP + AVIF) |
| 10 | 2026-08-25 | 18:30 | `java-plugins-chrome-compatibility-guide` | `draft` | required (1 unique inline WebP + AVIF) |
| 11 | 2026-08-25 | 21:00 | `chrome-extension-not-working-on-website-guide` | `draft` | required (1 unique inline WebP + AVIF) |
| 12 | 2026-08-26 | 09:00 | `user-agent-switcher-chrome-guide` | `draft` | required (1 unique inline WebP + AVIF) |
| 13 | 2026-08-26 | 12:00 | `ie-tab-chrome-legacy-sites-guide` | `draft` | required (1 unique inline WebP + AVIF) |
| 14 | 2026-08-26 | 15:30 | `chrome-extension-blocked-by-administrator-guide` | `draft` | required (1 unique inline WebP + AVIF) |
| 15 | 2026-08-26 | 18:30 | `google-dictionary-chrome-extension-guide` | `draft` | required (1 unique inline WebP + AVIF) |
| 16 | 2026-08-26 | 21:00 | `chrome-web-store-firefox-extensions-guide` | `draft` | required (1 unique inline WebP + AVIF) |
| 17 | 2026-08-27 | 09:00 | `chrome-extension-keyboard-shortcuts-guide` | `draft` | required (1 unique inline WebP + AVIF) |
| 18 | 2026-08-27 | 12:00 | `tag-assistant-chrome-extension-troubleshooting-guide` | `draft` | required (1 unique inline WebP + AVIF) |
| 19 | 2026-08-27 | 15:30 | `betterttv-google-chrome-guide` | `draft` | required (1 unique inline WebP + AVIF) |
| 20 | 2026-08-27 | 18:30 | `chrome-extension-side-panel-guide` | `draft` | required (1 unique inline WebP + AVIF) |
| 21 | 2026-08-27 | 21:00 | `chrome-extensions-separate-profiles-guide` | `draft` | required (1 unique inline WebP + AVIF) |
| 22 | 2026-08-28 | 09:00 | `agenda-hero-chrome-extension-guide` | `draft` | required (1 unique inline WebP + AVIF) |
| 23 | 2026-08-28 | 12:00 | `manifest-v3-chrome-extension-compatibility-guide` | `draft` | required (1 unique inline WebP + AVIF) |
| 24 | 2026-08-28 | 15:30 | `pin-chrome-extension-to-toolbar-guide` | `draft` | required (1 unique inline WebP + AVIF) |
| 25 | 2026-08-28 | 18:30 | `blackbox-ai-chrome-extension-guide` | `draft` | required (1 unique inline WebP + AVIF) |
| 26 | 2026-08-28 | 21:00 | `chrome-extension-service-worker-guide` | `draft` | required (1 unique inline WebP + AVIF) |
| 27 | 2026-08-29 | 09:00 | `chrome-extension-disabled-after-update-guide` | `draft` | required (1 unique inline WebP + AVIF) |
| 28 | 2026-08-29 | 12:00 | `chrome-samsung-smart-tv-casting-guide` | `draft` | required (1 unique inline WebP + AVIF) |
| 29 | 2026-08-29 | 15:30 | `chrome-load-unpacked-extension-guide` | `draft` | required (1 unique inline WebP + AVIF) |
| 30 | 2026-08-29 | 18:30 | `chrome-web-store-extension-installation-error-guide` | `draft` | required (1 unique inline WebP + AVIF) |
| 31 | 2026-08-29 | 21:00 | `chrome-extension-developer-mode-guide` | `draft` | required (1 unique inline WebP + AVIF) |
| 32 | 2026-08-30 | 09:00 | `chrome-add-to-chrome-button-not-working-guide` | `draft` | required (1 unique inline WebP + AVIF) |
| 33 | 2026-08-30 | 12:00 | `chrome-extension-content-scripts-guide` | `draft` | required (1 unique inline WebP + AVIF) |
| 34 | 2026-08-30 | 15:30 | `chrome-extension-not-working-on-web-store-guide` | `draft` | required (1 unique inline WebP + AVIF) |
| 35 | 2026-08-30 | 18:30 | `chrome-extension-declarative-net-request-guide` | `draft` | required (1 unique inline WebP + AVIF) |
| 36 | 2026-08-30 | 21:00 | `repair-corrupted-chrome-extension-guide` | `draft` | required (1 unique inline WebP + AVIF) |
| 37 | 2026-08-31 | 09:00 | `chrome-extension-options-page-guide` | `draft` | required (1 unique inline WebP + AVIF) |
| 38 | 2026-08-31 | 12:00 | `chrome-extension-conflict-troubleshooting-guide` | `draft` | required (1 unique inline WebP + AVIF) |
| 39 | 2026-08-31 | 15:30 | `chrome-extension-context-menu-guide` | `draft` | required (1 unique inline WebP + AVIF) |
| 40 | 2026-08-31 | 18:30 | `chrome-extension-notifications-not-working-guide` | `draft` | required (1 unique inline WebP + AVIF) |
| 41 | 2026-08-31 | 21:00 | `chrome-accessibility-extensions-keyboard-navigation-guide` | `draft` | required (1 unique inline WebP + AVIF) |
| 42 | 2026-09-01 | 09:00 | `chrome-extension-profile-switch-guide` | `draft` | required (1 unique inline WebP + AVIF) |
| 43 | 2026-09-01 | 12:00 | `chrome-live-captions-extension-guide` | `draft` | required (1 unique inline WebP + AVIF) |
| 44 | 2026-09-01 | 15:30 | `install-chrome-extension-linux-guide` | `draft` | required (1 unique inline WebP + AVIF) |
| 45 | 2026-09-01 | 18:30 | `chrome-extension-camera-microphone-permissions-guide` | `draft` | required (1 unique inline WebP + AVIF) |
| 46 | 2026-09-01 | 21:00 | `remove-chrome-extension-completely-guide` | `draft` | required (1 unique inline WebP + AVIF) |
| 47 | 2026-09-02 | 09:00 | `session-buddy-chrome-extension-guide` | `draft` | required (1 unique inline WebP + AVIF) |
| 48 | 2026-09-02 | 12:00 | `chrome-extension-data-privacy-check-guide` | `draft` | required (1 unique inline WebP + AVIF) |
| 49 | 2026-09-02 | 15:30 | `google-keep-chrome-extension-guide` | `draft` | required (1 unique inline WebP + AVIF) |
| 50 | 2026-09-02 | 18:30 | `update-chrome-extension-manually-guide` | `draft` | required (1 unique inline WebP + AVIF) |

## Image standard

Each pending article contains one article-specific explanatory inline illustration inserted after its first practical setup or decision section. The image uses a unique filename, descriptive alt text, and a source-aware caption stating that it is an editorial illustration rather than a product screenshot. Zoom is the exception: it already contains two official Chrome Web Store screenshots and is recorded as complete.

## Operational boundary

This file becomes execution-ready only when merged with the associated content/media commit. Do not publish the 49 pending articles by changing statuses manually; use the idempotent scheduled workflow so each successful release updates the index and Sitemap.
