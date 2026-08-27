---
seo_title: "Chrome storage.onChanged Not Firing in MV3: Debugging Guide"
id: 11d06eaf-5ea6-4cb9-93f0-761aed86be81
title: "Chrome storage.onChanged Not Firing in MV3: A Debugging Playbook"
slug: chrome-storage-onchanged-not-firing-mv3-troubleshooting-playbook
status: draft
excerpt: "A practical MV3 guide to diagnosing chrome.storage.onChanged when the listener does not appear to run, with a minimal extension, DevTools checks, storage-area tests, and reliable state patterns."
meta_description: "Fix chrome.storage.onChanged not firing in Manifest V3. Follow a minimal reproduction, verify the listener and storage area, inspect the right DevTools console, and handle MV3 lifecycle and quota errors."
featured_image: /og-image.png
category: Chrome Extensions
tags:
  - "Chrome Extensions"
  - "Manifest V3"
  - "chrome.storage"
  - "Debugging"
  - "Service Worker"
keywords:
  - "chrome storage onChanged not firing"
  - "chrome.storage.onChanged not working in MV3"
  - "Manifest V3 storage listener"
author: Miccart Phen
author_image: /content/images/authors/miccart-phen.png
published_at: 2026-08-27
updated_at: 2026-08-27
read_time: 13
---

If `chrome.storage.onChanged` appears not to fire in a Manifest V3 extension, start by proving three things separately: the write succeeded, the listener was registered in the context you are inspecting, and the listener is watching the same storage area that changed. A popup that has already closed, a service worker listener registered only after asynchronous startup, a failed write caused by a quota error, or a console opened for the wrong context can all look like the same bug.

This playbook uses a small MV3 extension that you can load locally. It shows the canonical `(changes, areaName)` callback, a repeatable DevTools workflow, common context-specific failures, and a safe pattern that reads current state on startup instead of expecting an event to replay the past. The [Chrome Extension Development Guide](/blog/chrome-extension-development-guide) is useful background if you first need to review how an extension is structured; this article stays focused on diagnosing `onChanged`.

## Quick diagnosis

Run these checks in order before changing architecture:

| Check | What to prove | If it fails |
|---|---|---|
| Write result | `storage.set()` completed without a quota or permission error | Fix the write and inspect `runtime.lastError` or the rejected Promise |
| Listener registration | A startup log appears in the expected popup, content-script, or service-worker console | Move registration to the correct context and register it synchronously |
| Storage area | The writer and listener agree on `local`, `sync`, or `session` | Log `areaName` and stop assuming every event came from `sync` |
| Changed key | The changed key exists in `changes` and contains `oldValue` or `newValue` as expected | Inspect the object instead of checking the wrong property |
| Context lifetime | The listener's context was alive when the change happened | Keep the popup open for a test, reload the page, or centralize critical handling in the service worker |
| Current state | A fresh `get()` returns the value even when no event was observed | Treat `get()` as initialization and `onChanged` as the update signal |

## What `chrome.storage.onChanged` actually reports

The Storage API provides an extension-specific store for JSON-serializable values. After a successful change to a storage area, `chrome.storage.onChanged` can notify registered extension contexts. The callback receives a map of changed keys and the name of the storage area that changed [1].

```js
chrome.storage.onChanged.addListener((changes, areaName) => {
  console.log("Storage area:", areaName);

  for (const [key, change] of Object.entries(changes)) {
    console.log(key, {
      oldValue: change.oldValue,
      newValue: change.newValue,
    });
  }
});
```

The event is not a historical queue. It does not replay changes that happened before a context registered its listener. A popup that opens after a setting was changed must call `get()` to read the current value. A content script that was removed during navigation must also read the current state when it is injected again.

The event also does not turn a short-lived context into a persistent one. A popup normally disappears when it loses focus, and a content script disappears when its page or frame is unloaded. An MV3 service worker is event-driven and can be stopped between events. Those lifecycle facts do not mean the API is broken; they mean that critical state should be recoverable from storage and not exist only in a UI listener.

## Build a minimal MV3 reproduction

A minimal reproduction is more useful than debugging a complete extension with a bundler, authentication, several storage areas, and unrelated message handlers. Create a new folder with the following files.

### `manifest.json`

```json
{
  "manifest_version": 3,
  "name": "Storage Change Reproduction",
  "version": "1.0.0",
  "description": "Minimal chrome.storage.onChanged test",
  "permissions": ["storage"],
  "background": {
    "service_worker": "service-worker.js"
  },
  "action": {
    "default_popup": "popup.html"
  }
}
```

The `storage` permission is required for the extension Storage API [1]. The service worker is declared by the `background.service_worker` field; `onInstalled` is an event you may listen to after installation, not a replacement for that manifest declaration.

### `service-worker.js`

Register the listener at the top level, before any asynchronous initialization:

```js
console.log("service worker loaded");

chrome.storage.onChanged.addListener((changes, areaName) => {
  console.log("onChanged received", {
    areaName,
    changedKeys: Object.keys(changes),
    changes,
  });
});
```

The startup log tells you that the inspected worker loaded. The event log tells you that this particular worker context received a storage change. Do not hide registration inside an `async init()` function that waits for a network request or another Promise before calling `addListener()`.

### `popup.html`

```html
<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8">
    <title>Storage test</title>
  </head>
  <body>
    <button id="write">Write local value</button>
    <button id="read">Read local value</button>
    <pre id="output"></pre>
    <script type="module" src="popup.js"></script>
  </body>
</html>
```

### `popup.js`

```js
const output = document.querySelector("#output");

function show(value) {
  output.textContent = JSON.stringify(value, null, 2);
}

document.querySelector("#write").addEventListener("click", async () => {
  try {
    await chrome.storage.local.set({ debugFlag: Date.now() });
    show({ ok: true, message: "local write completed" });
  } catch (error) {
    show({ ok: false, error: String(error) });
  }
});

document.querySelector("#read").addEventListener("click", async () => {
  const current = await chrome.storage.local.get("debugFlag");
  show(current);
});
```

Load the folder from `chrome://extensions`, enable **Developer mode**, choose **Load unpacked**, and select the folder. Then open the extension's **Service worker** inspection link and the popup's own DevTools console. Click **Write local value** while the relevant consoles are visible. The service-worker console should show `areaName: "local"` and a `debugFlag` entry.

## The seven-step debugging workflow

### 1. Inspect the console for the right context

Chrome gives different consoles to the service worker, popup, content script, and ordinary web page. A `console.log()` in `service-worker.js` will not appear in the page console, and a popup log will disappear with the popup.

Open `chrome://extensions`, enable Developer mode, locate the extension, and choose the **Service worker** or **Inspect views** link shown for that extension. For a popup, open the popup first and inspect the popup itself. For a content script, use the DevTools attached to the page and verify that you are looking at the extension context rather than the page's main world.

Add an unmistakable startup log:

```js
console.log("storage listener registration reached", new Date().toISOString());
```

If that message never appears, the problem is earlier than `onChanged`: the file may not be the file loaded by the manifest, the extension may not have reloaded, or the code path may be gated behind a condition.

### 2. Confirm that the listener is registered synchronously

This pattern is fragile because registration waits for asynchronous work:

```js
// Avoid this for critical event registration.
async function init() {
  await loadRemoteConfiguration();
  chrome.storage.onChanged.addListener(handleStorageChange);
}

init();
```

Use top-level registration instead, and perform initialization separately:

```js
function handleStorageChange(changes, areaName) {
  if (areaName !== "local" || !changes.debugFlag) return;
  console.log("debugFlag changed", changes.debugFlag);
}

chrome.storage.onChanged.addListener(handleStorageChange);

(async () => {
  try {
    const initial = await chrome.storage.local.get("debugFlag");
    console.log("initial state", initial);
  } catch (error) {
    console.error("initial storage read failed", error);
  }
})();
```

Top-level registration does not make a popup permanent, but it removes an avoidable race from service-worker startup and bundled code.

### 3. Prove that the write succeeded

If `set()` fails, there is no successful change for `onChanged` to report. Common causes include exceeding a storage quota, attempting to write to `storage.managed`, or handling a callback error incorrectly.

With Promises:

```js
try {
  await chrome.storage.sync.set({ preference: "compact" });
  console.log("sync write completed");
} catch (error) {
  console.error("sync write rejected", error);
}
```

With callbacks, read `chrome.runtime.lastError` inside the callback:

```js
chrome.storage.sync.set({ preference: "compact" }, () => {
  if (chrome.runtime.lastError) {
    console.error("sync write failed", chrome.runtime.lastError.message);
    return;
  }
  console.log("sync write completed");
});
```

A write of the same effective value may not represent a meaningful change. During testing, use a changing value such as `Date.now()` so you can distinguish “the event did not fire” from “the stored value did not change.”

### 4. Check the storage area and changed key

The second callback argument is the storage area name. It is a string such as `local`, `sync`, or `session`. Do not filter for `sync` while the test writes to `local`.

```js
chrome.storage.onChanged.addListener((changes, areaName) => {
  console.log("areaName", areaName);
  console.log("changed keys", Object.keys(changes));

  if (areaName === "local" && changes.debugFlag) {
    const nextValue = changes.debugFlag.newValue;
    console.log("new debugFlag", nextValue);
  }
});
```

The `changes` object is keyed by storage key. It is not the stored value itself. The following check is wrong when `debugFlag` is the key:

```js
// Wrong: changes is not the value of debugFlag.
if (changes === true) {
  // This will not identify the changed key.
}
```

### 5. Test from a second context

A reliable reproduction writes from one context and observes from another. For example, click the popup button to write `storage.local`, then inspect the service-worker console. If you register the listener only in the popup, close the popup, and write later, there is no popup listener available to observe that later event.

For a content script, reload or navigate the page and register the listener again when the script is injected. For a service worker, keep its DevTools open during a short debugging session so startup and termination logs are visible, but do not mistake an open DevTools window for a production lifecycle guarantee.

### 6. Read current state at startup

A listener handles future changes; it is not a substitute for initialization. Use a small helper that reads the current value and then responds to later updates:

```js
const storageArea = chrome.storage.local;

async function loadCurrentSettings() {
  const { debugFlag = false } = await storageArea.get("debugFlag");
  applyDebugMode(debugFlag);
}

function applyDebugMode(enabled) {
  console.log("debug mode", enabled ? "enabled" : "disabled");
}

chrome.storage.onChanged.addListener((changes, areaName) => {
  if (areaName !== "local" || !changes.debugFlag) return;
  applyDebugMode(Boolean(changes.debugFlag.newValue));
});

loadCurrentSettings().catch((error) => {
  console.error("could not load settings", error);
});
```

This pattern also protects a newly opened popup or newly injected content script from assuming it saw every earlier event.

### 7. Isolate sync, bundling, and extension conflicts

First reproduce with `chrome.storage.local` on one device. Once the listener works locally, test `sync` separately. `storage.sync` has its own quota and synchronization behavior; a sync test can introduce a second variable that is not present in a local test [1].

If the minimal unpacked extension works but the real extension does not, compare the built service-worker file with the source. Confirm that the build includes the listener at top level and that no initialization wrapper, conditional import, or early return prevents it from executing. Then test in a clean Chrome profile or Incognito window with the extension allowed there. This separates extension code from profile state and conflicts with other extensions.

## Common failures by context

| Context | What is usually happening | Reliable design |
|---|---|---|
| Popup | The popup closed before the later write, so its listener no longer exists | Read current state when the popup opens; use a longer-lived context for critical processing |
| Content script | Navigation, frame replacement, or SPA changes removed and recreated the script | Register on every injection and fetch current state after registration |
| MV3 service worker | Registration is delayed, the wrong worker file is loaded, or the wrong DevTools console is being inspected | Register at top level, inspect the worker directly, and persist important state in `chrome.storage` |
| `storage.sync` | The write failed, the wrong area was filtered, or sync-specific quotas complicate the test | Prove the write result, log `areaName`, and reproduce with `local` first |
| `storage.managed` | The area is read-only for the extension | Read it; do not attempt to write to it |

The important distinction is between **missing a transient notification** and **losing the data**. Storage should be the source of truth. A UI can refresh from storage when it starts, while `onChanged` keeps an already-running context responsive.

## When explicit messaging is better

`onChanged` is appropriate for reacting to storage changes, but it does not promise that a closed UI will receive a live update. If a service worker must notify an open popup or tab immediately, use an explicit message in addition to storage and handle the possibility that no receiver is currently open.

```js
chrome.storage.onChanged.addListener((changes, areaName) => {
  if (areaName !== "local" || !changes.debugFlag) return;

  chrome.runtime.sendMessage({
    type: "settings-changed",
    debugFlag: changes.debugFlag.newValue,
  }).catch(() => {
    // No popup or other receiver may be open. Storage remains the source of truth.
  });
});
```

For callback-based `sendMessage`, inspect `chrome.runtime.lastError` rather than treating “no receiving end” as a storage failure. The receiver should still call `get()` when it opens; an explicit message is an optimization for a live UI, not a replacement for persisted state.

## A compact regression test

After fixing the original bug, repeat this test after every manifest, bundler, or storage-area change:

1. Reload the unpacked extension from `chrome://extensions`.
2. Open the service-worker DevTools console and confirm the top-level registration log.
3. Open the popup and click the write button, or run `chrome.storage.local.set({debugFlag: Date.now()})` in the extension context.
4. Confirm that the service-worker log contains `areaName: "local"` and the expected key.
5. Close and reopen the popup, then use `get("debugFlag")` to confirm that current state is still available.
6. Repeat with `storage.sync` only after the local case works.
7. If the result changes after bundling, compare the generated worker and the loaded worker from the **Service worker** inspection link.

If the minimal reproduction works but the production extension still fails, reduce the production code until one change explains the difference. Do not file a Chromium issue until a small extension demonstrates that a top-level listener in a running, correctly inspected context fails to receive a successful change.

## Frequently asked questions

### Does `onChanged` fire in the context that made the change?

A running extension context with a registered listener can receive the event, including the context that writes the value. Do not use that expectation as a substitute for testing: a popup can close immediately, a content script can be removed, and a listener in the wrong console may appear not to run. The writer should also handle its own immediate UI update or read the stored value after writing.

### Why does `onChanged` not replay a value when my popup opens?

Because the event reports changes, not a history of changes. When the popup opens, call `chrome.storage.local.get()` or the appropriate storage area's `get()` method to initialize its state, then use `onChanged` for updates that occur while the popup is alive.

### Why does my service worker listener work only after I open DevTools?

Opening DevTools makes the worker easier to observe and can change how long it remains active during debugging, but it should not be the production fix. Check that the listener is in the worker file declared by the manifest, registered at top level, and that the write succeeded. Add startup logs and test the minimal reproduction after reloading the extension.

### Does the listener require a separate permission?

The extension must declare the `storage` permission to use the extension Storage API [1]. The permission does not keep a popup or service worker permanently alive, and it does not make a failed quota write succeed.

### Should I use `local`, `sync`, or `session` while debugging?

Use `local` first to reduce variables and test the listener on one device. Move to `sync` when the local case works and you need synchronized settings, then test quotas and propagation separately. Use `session` only when in-memory extension-session state is appropriate; it is not a replacement for persistent settings [1].

### When should I use `chrome.runtime.sendMessage` too?

Use explicit messaging when a live popup or tab needs an immediate notification. Keep the value in `chrome.storage` and make the receiver fetch current state when it starts, because the receiver may be closed when the message is sent.

## Conclusion

When `chrome.storage.onChanged` is not firing in MV3, do not begin by adding delays or changing Manifest versions. Prove the write, inspect the correct extension console, register the listener synchronously at top level, log `areaName` and the changed keys, and run the same test from a second context. Then initialize each short-lived UI with `get()` and use `onChanged` for later updates.

This approach distinguishes an API or quota error from a lifecycle misunderstanding and leaves the extension resilient even when a popup closes or a content script is recreated. The article remains a troubleshooting guide, not a claim that every missed notification is a Chrome bug.

## References

[1] [Chrome for Developers — chrome.storage API](https://developer.chrome.com/docs/extensions/reference/api/storage)

[2] [Chrome for Developers — Message passing](https://developer.chrome.com/docs/extensions/develop/concepts/messaging)

[3] [Chrome for Developers — Debug extensions](https://developer.chrome.com/docs/extensions/get-started/tutorial/debug)

[4] [Chrome for Developers — Extension service worker lifecycle](https://developer.chrome.com/docs/extensions/develop/concepts/service-workers/lifecycle)
