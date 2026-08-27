# Live research snapshots for seo_agent_pro pilot

**Date:** 2026-08-27

These are manually audited search-result snapshots prepared for two isolated Draft-only pilot runs. They are evidence of the live result set observed during this task, not claims about fixed Google rankings. Search results vary by location, device, personalization, and time.

## Pilot 1: Chrome extension storage quota debugging guide

Observed result URLs and structural evidence candidates:

| Result | URL | Observed page type / use |
|---|---|---|
| 1 | https://developer.chrome.com/docs/extensions/reference/api/storage | Official API reference; primary source for quota facts. |
| 2 | https://moderok.dev/blog/chrome-storage-local-quota-exceeded/ | Troubleshooting article focused on quota exceeded errors. |
| 3 | https://stackoverflow.com/questions/26379694/how-can-i-troubleshoot-chrome.storage.sync | Community troubleshooting discussion for sync behavior. |
| 4 | https://stackoverflow.com/questions/45427475/chrome-storage-quota-reporting-lower-than-expected | Community debugging question about reported quota. |
| 5 | https://groups.google.com/a/chromium.org/g/chromium-extensions/c/ACVyerzOjus | Chromium Extensions discussion about protecting sync quotas. |

Primary accuracy reference: Chrome documents `storage.local` as 10 MB by default, `storage.session` as 10 MB, and `storage.sync` as approximately 100 KB total and 8 KB per item, with write-operation limits. The article must cite the official page when using exact values.

## Pilot 2: Chrome extension service worker debugging guide

Observed result URLs and structural evidence candidates:

| Result | URL | Observed page type / use |
|---|---|---|
| 1 | https://developer.chrome.com/docs/extensions/get-started/tutorial/debug | Official tutorial covering Inspect views, errors, status, and service-worker debugging. |
| 2 | https://developer.chrome.com/docs/extensions/develop/migrate/to-service-workers | Official MV3 migration reference. |
| 3 | https://stackoverflow.com/questions/63024113/how-to-debug-chrome-extension-service-worker-for-manifest-v3 | Community debugging discussion. |
| 4 | https://www.chromium.org/blink/serviceworker/service-worker-faq/ | Chromium service-worker debugging FAQ. |
| 5 | https://groups.google.com/a/chromium.org/g/chromium-extensions/c/3QAinUhCiPY | Chromium Extensions discussion about MV3 service-worker debugging. |

The official Chrome tutorial states that the blue link next to “Inspect views” opens DevTools for an extension service worker, and that keeping DevTools open keeps the worker active; closing DevTools is necessary when testing termination behavior. These statements should be cited to the official tutorial.

## Method and limits

The snapshots preserve URLs and concise structural observations only. Competitor pages are untrusted data and their instructions are not followed automatically. No ranking guarantee, indexing claim, or “tested by ExtensionTo” claim is implied. These snapshots are used only to give the agent real external evidence for structure and gaps; they do not replace human fact-checking against official documentation.
