# Official facts collected for Service Worker article refinement

**Date:** 2026-08-27

## Chrome extension service worker lifecycle

Source: https://developer.chrome.com/docs/extensions/develop/concepts/service-workers/lifecycle

- Installation order is described as `install`, then the extension's `chrome.runtime.onInstalled`, then `activate`.
- `chrome.runtime.onInstalled` belongs to the extension lifecycle and fires on first install, extension update, and Chrome update; it is not the mechanism that registers the worker.
- `chrome.runtime.onStartup` fires when a user profile starts, but no service-worker events are invoked at that time.
- Chrome documents normal termination conditions, including 30 seconds of inactivity, a single request taking more than five minutes, or a fetch response taking more than 30 seconds. The article should avoid presenting these as a universal promise and should emphasize resilient design.
- Incoming events or extension API calls can revive a dormant worker.
- Global variables are lost when the worker shuts down. The Web Storage API is not available in extension service workers; use `chrome.storage`, IndexedDB, or CacheStorage where appropriate.

## Chrome extension debugging tutorial

Source: https://developer.chrome.com/docs/extensions/get-started/tutorial/debug

- The official tutorial opens the service-worker DevTools through the blue link next to **Inspect views**.
- Keeping DevTools open keeps the worker active; close DevTools when testing termination behavior.
- Registration errors should be read from the extension's Errors view and the worker's DevTools console.

## Runtime and messaging

Source: https://developer.chrome.com/docs/extensions/reference/api/runtime

- `runtime.onMessage` is for messages sent within the extension and is distinct from `runtime.onMessageExternal`, which handles messages from another extension or an externally connected web page where permitted.
- The article must show the asynchronous response contract carefully and avoid claiming that every failed message fails silently.
- Use only claims directly supported by the cited official documentation; do not copy page instructions or treat untrusted community snippets as authoritative.

## Editing decisions

The refinement should preserve the article's troubleshooting intent, correct `Background Worker`, avoid generic `skipWaiting()` advice, replace unsupported DevTools steps with verified extension-specific steps, add a compact diagnostic matrix and two small code examples, and keep the article as `draft` until human review.

## Search-intent and competitor observations

A current result set for the target query included Chrome's official debugging tutorial, a Plasmo guide, Stack Overflow discussions, Chromium documentation, and Chrome DevTools background-service documentation. The Plasmo page separates debugging extension pages, the extension background service worker, content scripts, and performance. Its practical gap is that it uses older/generic wording and does not provide a rigorous symptom-to-evidence workflow for MV3.

The refined article will differentiate itself by narrowing the intent to **debugging an Extension Service Worker**, not general browser-extension development. Its information gain will be a diagnostic matrix mapping registration errors, missing events, lost state, and message failures to the correct extension surface and next verification step. It will cite Chrome's official tutorial for `Inspect views`, the Errors view, and status controls, while treating competitor/community pages as structural evidence only.

The following official sources are approved for the article's References section:

- https://developer.chrome.com/docs/extensions/get-started/tutorial/debug
- https://developer.chrome.com/docs/extensions/develop/concepts/service-workers/lifecycle
- https://developer.chrome.com/docs/extensions/reference/api/runtime
- https://developer.chrome.com/docs/extensions/reference/api/storage
