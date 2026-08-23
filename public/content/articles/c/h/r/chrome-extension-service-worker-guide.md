---
id: "ebc16b6d-df3d-4a7d-8dd1-f316888fc0ee"
title: "Chrome Extension Service Workers: Why Background Features Stop and Restart"
slug: chrome-extension-service-worker-guide
status: draft
excerpt: "MV3 service workers aren’t permanent. Learn why Chrome stops and restarts your background logic, how to design for cold starts, and how to debug user-visible failures."
meta_description: "Diagnose why MV3 service workers stop and restart, and design background features that survive cold starts. Includes state, debugging, and troubleshooting tips."
featured_image: /og-image.png
category: "Chrome Extensions"
tags:
  - "Chrome Extensions"
  - "Manifest V3"
  - "Service Worker"
  - "Debugging"
  - "Background Scripts"
  - "State Persistence"
keywords:
  - "chrome extension service worker"
  - "MV3 service worker"
  - "background script MV3"
  - "event-driven background"
  - "runtime.onMessage"
  - "alarms.onAlarm"
  - "onInstalled"
  - "onStartup"
  - "extension state persistence"
author: "Miccart Phen"
published_at: 2026-08-23
read_time: 6
---
Why MV3 background work “stops”

In Manifest V3, the background context is a service worker that starts on demand and is terminated when idle. That’s intentional: Chrome wakes your worker to handle events, then lets it go. Assume it can restart at any time, and avoid depending on long-lived in-memory state. Register listeners up front and design handlers to finish quickly, persisting only what must survive.

What starts and stops a service worker

Chrome may start your worker when:
- An extension event fires (action click, message, command, alarm, webNavigation/webRequest, omnibox, etc.).
- The browser starts or the extension is installed/updated (runtime.onStartup, runtime.onInstalled).
- A content script or page sends a message.

Chrome may stop it when:
- Event work completes and the worker is idle.
- Resources are needed, the extension is updated/reloaded, or the browser restarts.
- The user/developer reloads or updates the extension.

Exact idle timing is an implementation detail. Treat termination as normal and make logic restart-safe.

Cold starts change how you structure background code

- Register listeners at the top level. Add event listeners synchronously when the script loads so events can be dispatched immediately after a restart. Delayed registration risks missed events.
- Don’t rely on globals for essential state. Anything in module variables can vanish between runs; persist what you need to resume.
- Use runtime.onInstalled for one-time setup. Create context menus and initial alarms there. Many registered surfaces persist, but this pattern avoids duplicate creation and races.

Persist and recover state deliberately

Use chrome.storage for configuration, flags, cursors, and lightweight queues. Assume the worker can stop mid-task; write progress early and restore on the next start.

Decision guide: where to keep state across restarts

- User/config settings, small flags: chrome.storage.sync or chrome.storage.local. Sync roams with quotas; local is device-only.
- Work-in-progress markers (e.g., last processed item): chrome.storage.local. Write atomically to avoid partial updates.
- Ephemeral state needed only during a single event: in-memory variables. Loss is acceptable after termination.
- Larger structured data or logs: chrome.storage.local (possibly chunked). Mind size/IO; avoid tight write loops.

Patterns that keep work alive just long enough

- Asynchronous listeners. If a handler is async, keep the Promise pending until work is done; Chrome keeps the worker alive while it resolves.

- Message passing. For runtime.onMessage, return true to respond asynchronously, then call sendResponse later. Example:

```js
chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
  if (msg.type === 'DO_WORK') {
    doAsyncWork()
      .then(result => sendResponse({ ok: true, result }))
      .catch(err => sendResponse({ ok: false, error: String(err) }));
    return true; // keep the message channel open
  }
});
```

- Long‑lived ports. runtime.connect creates a Port. While it’s active and exchanging messages, the worker can remain alive. Use ports for real conversations with a UI page or content script, not as a generic keep‑alive.

- Timers. setInterval is unreliable across restarts. Prefer chrome.alarms to schedule runs; alarms wake the worker when due.

Why user-visible features “randomly” stop

- Badges or icons don’t update. A polling loop likely died with the worker. Replace polling with events or chrome.alarms, and recompute on wake.
- Keyboard shortcuts seem ignored. commands.onCommand should wake the worker. Ensure the listener is registered at top level and the command exists in the manifest.
- Context menu actions fail over time. Creating menus on every start and racing async updates can desync the UI. Create once in onInstalled and make targeted updates.
- Messages from content scripts time out. If responding asynchronously, return true in onMessage so the channel stays open.
- Long operations get cut off. Chunk work, persist checkpoints, and resume on the next event or alarm.

Debugging restarts and background behavior

- Inspect the worker. In chrome://extensions, enable Developer mode, open the service worker’s DevTools, and watch logs while it runs. Because the console clears on termination, persist key breadcrumbs to chrome.storage during tricky investigations.
- Log cold starts. At the top of the worker, log a startup message with a timestamp and a boot counter you persist. You’ll see how often restarts occur.
- Prove listeners are registered. Log immediately when calling addListener at top level. If logs only appear after async init, you’re registering too late.
- Reproduce timing safely. Use chrome.alarms for staggered wake-ups; setTimeout loops won’t survive termination.

Development reload rules that affect testing

Chrome’s “Hello World” tutorial highlights practical reload facts that often confuse debugging:
- Updating the service worker file generally requires reloading the extension to pick up changes.
- Content scripts are tied to pages. After edits, reload the target tab to run new code.
- Manifest changes require reloading the extension; some changes may require reinstalling during development.

These rules explain fixes that appear to work in the console but vanish after refresh—different pieces update on different triggers.

Designing for resilience from the start

- Prefer declarative or event-driven flows over polling. Let navigation, requests, and user actions trigger work.
- Keep handlers fast and fail-tolerant. Persist early and tolerate re-entry after restarts.
- Make recovery idempotent. If onStartup or an alarm fires after a partial run, re-running should be safe.
- Separate UI from background. Pages or content scripts own view state; the worker coordinates and persists only what’s needed.

When omnibox or action features are involved

Omnibox events and the extension action commonly start the worker. Put omnibox listeners at top level and return quickly, delegating longer work to async code. For broader architecture guidance, see the [Chrome extension development guide](/blog/chrome-extension-development-guide). For omnibox-specific behaviors and testing tips, see [Omnibox API patterns and pitfalls](/blog/chrome-omnibox-guide).

Limitations you should plan around

- No assumption of persistence. The worker can stop at any time.
- Limited lifetime during idle. Exact thresholds aren’t guaranteed and may evolve.
- No background DOM. The worker isn’t a window; use extension pages when you need a DOM and coordinate via messaging.
- Logs aren’t durable. DevTools output disappears on restart; persist important diagnostics while developing.

Quick checklist

- Are all event listeners registered synchronously at top level?
- Does onMessage return true when responding asynchronously?
- Is periodic logic using chrome.alarms, not setInterval?
- Is essential state stored in chrome.storage and restored on startup?
- Do long tasks checkpoint progress and resume safely?

## FAQ

- Why does my MV3 background “sleep” after a few seconds?
Chrome can terminate an idle service worker. The timing isn’t fixed publicly; design as if termination can happen anytime.

- Can I keep the service worker alive indefinitely?
Chrome intends workers to be short‑lived. Async handlers and Port connections keep it alive during active work, but a permanent background is discouraged.

- Where should I store small persistent flags?
Use chrome.storage (local or sync). In‑memory variables are cleared on restart.

- How do I run code on browser startup?
Listen to runtime.onStartup. Keep it fast, restore only what you need, and schedule longer work via alarms or later events.

- My content script sends a message but gets no response. Why?
If the background responds asynchronously, ensure onMessage returns true and that the listener is registered at the top level so the worker starts for the event.

![Chrome Extension Service Workers: Why Background Features Stop and Restart workflow illustration](/content/images/chrome-extension-service-worker-guide/chrome-extension-service-worker-guide-workflow.webp)
*Screenshot: Editorial illustration of the practical chrome extension service worker workflow described in this guide; it is not a product screenshot.*

## References

- [Migrate to service workers (Manifest V3)](https://developer.chrome.com/docs/extensions/develop/migrate/to-service-workers)
- [Hello World tutorial](https://developer.chrome.com/docs/extensions/get-started/tutorial/hello-world)
- [Service workers in extensions: concepts](https://developer.chrome.com/docs/extensions/develop/concepts/service-workers)
