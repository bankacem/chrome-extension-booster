# Research notes for the next 20 ExtensionTo articles

## Official sources reviewed

- Chrome Extensions overview: https://developer.chrome.com/docs/extensions
- Chrome Extension update lifecycle: https://developer.chrome.com/docs/extensions/develop/concepts/extensions-update-lifecycle
- Chrome Web Store installation and management help: https://support.google.com/chrome_webstore/answer/2664769?hl=en
- Chrome storage API reference: https://developer.chrome.com/docs/extensions/reference/api/storage
- Chrome DevTools extension debugging tutorial: https://developer.chrome.com/docs/extensions/get-started/tutorial/debug

## Verified direction

The official documentation exposes distinct user and developer intents around extension installation and management, the update lifecycle, storage behavior, debugging, permissions, and Chrome Web Store management. New topics must be narrower than the existing 50-article schedule and must not duplicate its planned titles about permissions, host permissions, update manually, developer mode, service workers, content scripts, options pages, side panels, context menus, installation errors, conflicts, notifications, or profile switching.

The update lifecycle documentation explains that Chrome checks for extension updates automatically, installation may wait until an extension is idle, enterprise policies can control updates, and frequent programmatic update checks are throttled. These facts support a distinct article about delayed extension updates or the update lifecycle only if it is clearly separated from the scheduled manual-update guide.

The storage documentation supports a separate developer-facing topic around extension storage limits and the difference between local, sync, and session storage, provided it does not overlap with the scheduled service-worker or general permissions articles.

The Chrome Extensions overview and DevTools documentation support distinct debugging topics such as inspecting an extension popup or diagnosing a background-page/service-worker error, but the proposed title must remain narrower than the scheduled general troubleshooting, logger, service-worker, and content-script guides.

## Editorial constraint

Search result snippets are discovery signals, not proof of ranking or demand. No claim about Google weakness or ranking will be made without Search Console data. The new 20-topic list will be treated as a proposed editorial opportunity set until each topic passes internal cannibalization review and source review.
