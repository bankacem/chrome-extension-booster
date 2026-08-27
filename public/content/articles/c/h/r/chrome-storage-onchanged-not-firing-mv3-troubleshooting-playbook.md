---
seo_title: "Chrome storage onChanged not firing: MV3"
id: 11d06eaf-5ea6-4cb9-93f0-761aed86be81
title: "chrome storage onChanged not firing: MV3 troubleshooting playbook"
slug: chrome-storage-onchanged-not-firing-mv3-troubleshooting-playbook
status: draft
excerpt: "MV3 troubleshooting playbook to fix chrome storage onChanged not firing with step-by-step debugging, manifest and listener checks, common causes, and fixes."
meta_description: "MV3 troubleshooting playbook to fix chrome storage onChanged not firing with step-by-step debugging, manifest and listener checks, common causes, and fixes."
featured_image: /og-image.png
category: Chrome Extensions
tags: []
keywords:
  - chrome storage onChanged not firing
author: Miccart Phen
published_at: 2026-08-27
read_time: 12
---
If you’ve searched for “chrome storage onChanged not firing,” you’re probably seeing a listener that sometimes never runs — especially in Manifest V3 (MV3) service-worker-based extensions. This guide is a pragmatic troubleshooting playbook: short diagnostic checklist up front, multiple minimal reproducible examples (both broken and fixed), DevTools commands you can run immediately, and MV3-aware lifecycle strategies so you stop guessing and start verifying.

This article keeps each diagnosis step paired with a minimal code example you can paste into the relevant extension context and a concrete DevTools action to confirm the fix. Read start-to-finish for a full workflow, or jump to the numbered checklist and run through it. The official storage API docs are the authoritative reference for exact quotas and behavior (see Sources).

## Quick overview: what chrome.storage.onChanged does (and what it doesn't)

chrome.storage.onChanged is an event that your extension can listen to so it knows when stored values change. It is useful for syncing UI state across contexts (popup, background, content scripts) and reacting to configuration updates.

What it does:
- Fires when items in chrome.storage change.
- Delivers a changes object describing old/new values and the storage area (local/sync/session).

What it doesn't guarantee:
- It does not magically keep listeners alive — a listener must exist in a running context to observe the event.
- It is subject to context lifecycles (popups close, content scripts unload, MV3 service workers start/stop).
- It does not replace explicit cross-context messaging patterns when you need guaranteed delivery sequencing.

For authoritative behavior and API details, see the Chrome Extensions storage docs (Sources).

## How contexts affect onChanged (popup, content script, background page, MV3 service worker)

Different extension contexts change the reliability of onChanged:

- Popup
  - Listener persistence: short (popup closes on blur)
  - Recommended placement: UI-only reactions; do not rely on popup for background state sync
  - Common failure mode: popup closed before change occurs -> missed event

- Content script
  - Listener persistence: tied to the page lifecycle (reloads, navigation kill script)
  - Recommended placement: page-specific reactions; forward important changes to background
  - Common failure mode: page navigation or single-page app routing re-initializes script and loses listener

- Background page (MV2 persistent)
  - Listener persistence: high (long-lived)
  - Recommended placement: central listener for state changes
  - Common failure mode: N/A for MV2 persistent background, but MV2 event pages unload when idle

- MV2 event page (non-persistent)
  - Listener persistence: medium (woken for events but can unload)
  - Recommended placement: central but be mindful of activation timing
  - Common failure mode: listener not registered early enough before event dispatch

- MV3 service worker (SW)
  - Listener persistence: low (short-lived; starts for dispatched events)
  - Recommended placement: register at top-level of service worker script
  - Common failure mode: listeners registered inside async callbacks or after an early return; misunderstanding of SW activation timing

A fuller, at-a-glance comparison table appears below.

| Context | Listener persistence | Recommended placement | Common failure modes (Low/Medium/High) |
|---|---:|---|---|
| Popup | Low | Only for popup UI; do not rely for background sync | High: popup often closed before change |
| Content script | Medium-Low | Page reactions; send critical changes to background | Medium: page reload/navigation loses listener |
| Background page (MV2 persistent) | High | Central storage listener | Low: persistent context handles events |
| MV2 event page | Medium | Register listeners at top-level of event page | Medium: event page may unload before processing |
| MV3 service worker | Low | Register listeners at top-level; use message forwarding | High: SW lifecycle and registration timing cause missed events |

## Step-by-step diagnostic checklist for “onChanged not firing”

Start here — each step includes a quick verification you can perform.

- [ ] 1) Verify the listener is registered in the right context (and at top-level)
  - Action: open the DevTools console for the context and look for a startup log you add (see examples below).
  - Verification: console shows "listener registered" at load time.

- [ ] 2) Reproduce the change from a different context
  - Action: in a different inspected context, run chrome.storage.local.set({k: 'v'}) and check consoles across contexts.
  - Verification: the context with the registered listener logs the onChanged event.

- [ ] 3) Confirm the context is actually running when the change happens
  - Action: if popup or content script, keep the UI/page open and try the change; if MV3 SW, inspect worker console at the moment of change.
  - Verification: you see logs in the expected context at change time.

- [ ] 4) Check for race conditions (listener registration after set)
  - Action: sequence: set -> then open context that registers listener. If you miss event, listener was registered too late.
  - Verification: listener does not see prior changes; modify code to ensure registration happens before set or use messaging.

- [ ] 5) If MV3 SW, ensure listener is a top-level statement, not inside an async callback that might never run
  - Action: open the service worker source and confirm onChanged.addListener is at the top-level scope.
  - Verification: console shows registration log immediately when SW starts.

- [ ] 6) If using chrome.storage.sync, try chrome.storage.local while debugging
  - Action: replace .sync with .local for reproduction to avoid sync latency.
  - Verification: local-based changes are immediate and easier to verify.

- [ ] 7) Collect reproducible minimal example and test in Incognito with only the extension loaded
  - Action: load unpacked extension in a fresh profile to avoid other extension interference.
  - Verification: behavior persists (or not) in isolation.

## Minimal reproducible examples: common failure modes and fixes (code samples)

Below are small, copy-paste examples that demonstrate typical problems and corrected versions.

1) Popup closed before change (broken)
```js
// popup.js (broken)
console.log('popup startup');
chrome.storage.onChanged.addListener(changes => {
  console.log('popup onChanged', changes);
});
// User closes popup; later some other context sets storage -> popup won't be there
```

Fixed: Move listener to background/service worker and message popup when open
```js
// background.js (MV2) or service_worker.js (MV3) — top-level
console.log('background/service worker startup');
chrome.storage.onChanged.addListener(changes => {
  console.log('bg onChanged', changes);
  // Broadcast to open popups or sendMessage to specific tabs
  chrome.runtime.sendMessage({type: 'storage-changed', changes});
});
```
Popup receives message:
```js
// popup.js
chrome.runtime.onMessage.addListener((msg) => {
  if (msg.type === 'storage-changed') console.log('popup got', msg.changes);
});
```

2) Content script reloads/navigation kills listener (broken)
```js
// content.js (broken)
chrome.storage.onChanged.addListener(changes => {
  console.log('content onChanged', changes);
});
// When page navigates, content script is removed; missed events while page was absent
```

Fixed: Use background as arbiter or re-register on DOM load and persist important state
```js
// content.js (fixed)
function register() {
  chrome.storage.onChanged.addListener(changes => {
    console.log('content onChanged', changes);
  });
}
register();
window.addEventListener('beforeunload', () => {
  // optionally flush state to background
});
```

3) MV3 service worker registered listener incorrectly (broken)
```js
// service_worker.js (broken)
async function init() {
  // heavy async init
  await fetch('/some/resource'); // may delay or fail
  chrome.storage.onChanged.addListener(changes => {
    console.log('SW onChanged', changes);
  });
}
init();
```
Problem: If an onChanged fires while the init async code hasn't completed, listener may not be registered.

Fixed: register at top-level and perform async init separately
```js
// service_worker.js (fixed)
console.log('SW top-level startup');
chrome.storage.onChanged.addListener(changes => {
  console.log('SW onChanged', changes);
});
// Now do async init without blocking listener registration
(async function asyncInit(){
  try { await fetch('/some/resource'); } catch(e){ console.warn(e); }
})();
```

4) Race: setting storage before listener exists (repro)
```js
// Run in console of tab A:
chrome.storage.local.set({flag: true}, () => console.log('set done'));

// Then open popup which registers listener -> popup won't see the earlier set.
```
Fix: When you need guaranteed ordering, either set then send an explicit message to open contexts, or have the listener query current state at registration:
```js
// listener pattern
chrome.storage.local.get('flag', (res) => {
  // handle current state on registration
  console.log('current', res.flag);
});
chrome.storage.onChanged.addListener(changes => {
  console.log('changed', changes);
});
```

## DevTools & commands: how to observe which context fired and verify listeners

Immediate DevTools steps you can run:

1. Open chrome://extensions, enable Developer mode.
2. For MV3 service worker: find your extension, click "Service worker" -> Inspect (this opens DevTools for the SW).
   - Look at Console to see startup logs like "SW top-level startup".
3. For MV2 background page: click "background page" -> Inspect.
4. For popup: click the extension icon to open popup, then right-click inside popup and choose "Inspect".
5. For content scripts: open the inspected page, open DevTools -> Sources -> Content scripts; use console there.

Useful console commands to reproduce and verify:
- Trigger a storage change:
  chrome.storage.local.set({testKey: Date.now()}, () => console.log('set done'));
- Inspect current value:
  chrome.storage.local.get(['testKey'], res => console.log('current', res));
- Quick listener check (paste into the context you expect to listen):
  chrome.storage.onChanged.addListener(changes => console.log('onChanged seen in context', changes));

If you add clear console logs at listener registration (e.g., console.log('listener registered in SW')), you can confirm whether the listener existed before a set command. When debugging MV3, keep the SW devtools open — that prevents the worker from being garbage collected while you're stepping through registration.

Tip: Use Incognito + "Allow in incognito" for a clean profile; enable "service worker inspection" to see lifecycle events.

## Timing, lifecycle and race-condition strategies (event page unloading, MV3 SW short-lived listeners)

Common timing traps:
- Popup and content script unload: keep in mind these contexts are ephemeral. Do not rely on them for cross-extension coordination.
- MV2 event pages and MV3 SW can be started to handle events, but the listener must be registered at the time the runtime starts handling the event. For MV3, always register chrome.storage.onChanged.addListener at top-level of the service worker script — that ensures the worker is listening as soon as it starts.

Proven strategies:
- Register listeners at top-level. Avoid registering inside async init paths that might not have completed when the event is dispatched.
- When you need guaranteed delivery ordering, combine onChanged with an explicit get() at registration time:
  - On registration: chrome.storage.get(keys, handleCurrent)
  - On change: handle change events
- For notifications to UI that may be closed, use background/service worker to maintain latest state and message popups/contents when they open.
- For MV3, keep DevTools open during debugging; consider using chrome.alarms to wake the SW for maintenance tasks if needed.
- When debugging race conditions, insert short delays or use manual step-through (DevTools breakpoint) to reproduce ordering.

## Workarounds, when to file a Chromium bug, and preventive patterns

Workarounds
- If you see intermittent missing onChanged events even after the above fixes, use explicit messaging: the code that writes storage can also chrome.runtime.sendMessage(...) to awake and notify expected contexts — this is more explicit than relying only on onChanged.
- For MV3, if you need strong guarantees and onChanged semantics aren’t sufficient, have the changing context call a background endpoint (message) that performs both storage.set and immediate broadcast to open contexts.

## When to file a Chromium bug
- File a bug if you can produce a minimal reproducible example that demonstrates the API failing to deliver onChanged to a top-level-registered listener in a running context (with DevTools open and logs proving listener registration). Include reproduction steps, screenshots of DevTools console, and a minimal extension ZIP.
- Do not file a bug for expected lifecycle behavior (e.g., popup closed => no listener); these are by design.

Preventive patterns
- Centralize critical listeners in background/service-worker and treat popups/content scripts as ephemeral UIs.
- On listener registration always fetch current state (get) to avoid relying on missed past events.
- Use local storage while developing to avoid sync delays; switch to sync only when you’ve verified logic and are ready to handle its latencies and quotas.

Pros/cons: using local vs sync when debugging onChanged issues

Pros of chrome.storage.local when debugging:
- Immediate, local writes — no server sync delays
- Easier to reproduce events across contexts in a single device
- Fewer rate/propagation quirks

Cons of chrome.storage.local:
- Not synchronized across devices (not relevant for debugging)

Pros of chrome.storage.sync:
- Replicates across signed-in devices (useful for real user scenarios)

Cons of chrome.storage.sync when debugging:
- Potential propagation latency and rate-limiting can make onChanged appear delayed or intermittent during tests
- Quotas on sync may throttle rapid test writes — use local to avoid these while reproducing

## Frequently Asked Questions
**Q: Does onChanged fire in the context that made the change?**
A: In practice, contexts that are running and have registered listeners will receive onChanged events. To be safe, design so that the writing context also handles any immediate UI updates or explicitly queries storage after a set.

**Q: My MV3 service worker had onChanged at top-level but still missed events. Why?**
A: Common causes: the SW was not started at the time of change, or logs show registration happening too late due to bundling/transpilation. Verify top-level placement, keep DevTools open, and reproduce with simple top-level registration.

**Q: Can I rely on chrome.storage.sync for immediate cross-context sync?**
A: No — sync can have propagation delays and rate limits. Use chrome.storage.local for immediate debugging and local coordination.

**Q: How do I test if a listener exists right now?**
A: Add a small console.log at registration time (e.g., console.log('listener registered')). Open the context’s DevTools and confirm that message appears when the context starts.

**Q: Should I always centralize storage listeners in background/service worker?**
A: Yes for critical state. UI contexts (popup, content script) should be subscribers and fetch current state when they open.

**Q: Is there an API to list registered listeners?**
A: No public API exposes listener lists. Use explicit console logs on registration or design your own ready/heartbeat messages.

**Q: What if other extensions interfere?**
A: Reproduce in a clean profile or Incognito with only your extension enabled to rule out interference.

**Q: Can alarms help keep MV3 SW alive to avoid missing events?**
A: Alarms can wake the SW for scheduled tasks but are not a substitute for correct event registration patterns. Use alarms judiciously.

## Conclusion

If chrome storage onChanged not firing is blocking you, follow the checklist: confirm listener registration, reproduce changes from another context, watch the right DevTools console, and move persistent listeners out of short-lived contexts. For MV3, register onChanged at the service worker’s top level and prefer explicit messaging + get() patterns when you need ordering guarantees. Use chrome.storage.local while debugging to avoid sync latency, and file a Chromium bug only once you’ve produced a minimal reproducible example proving a top-level listener didn’t receive an event.

Sources
- Chrome Extensions storage API documentation: https://developer.chrome.com/docs/extensions/reference/api/storage

If you want, paste one failing minimal example (manifest + small JS) and I’ll point to the exact line that needs changing and a fixed variant you can drop into your extension.

Explore more [Chrome extension guides](/blog) on ExtensionTo.
