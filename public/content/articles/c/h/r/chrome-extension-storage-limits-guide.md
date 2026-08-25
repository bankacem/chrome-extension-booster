---
seo_title: "Chrome Extension Storage Limits Explained"
id: "a1b2c3d4-dev-0001"
title: "Chrome Extension Storage Limits: Local, Sync, and Session Data Explained"
slug: "chrome-extension-storage-limits-guide"
excerpt: "Chrome extensions have strict storage quotas that vary by storage type and context. This guide breaks down the exact limits for local storage, sync storage, and session storage, explains how the unlimitedStorage permission works, and shows developers how to manage storage efficiently within these constraints."
featured_image: /content/images/chrome-extension-storage-limits-guide/featured.webp
category: "Productivity & Tools"
tags: ["chrome storage limits", "extension storage quota", "unlimitedStorage permission", "chrome.storage API", "IndexedDB limits", "sync storage quota"]
keywords:
  - chrome extension storage limits
  - chrome extension storage quota
  - chrome.storage.local limit
  - unlimitedStorage permission
meta_description: "Understand Chrome extension storage limits for local, sync, and session storage. Learn exact quotas, the unlimitedStorage permission, and efficient data management strategies."
status: draft
published_at: "2026-09-14T11:00:00Z"
scheduled_at: "2026-09-14T11:00:00Z"
author: "James Mitchell"
author_image: /content/images/authors/james-mitchell.png
read_time: 10
created_at: "2026-08-25T12:00:00+01:00"
updated_at: "2026-08-25T12:00:00+01:00"
description: "Chrome extensions have strict storage quotas that vary by storage type and context. This guide breaks down the exact limits for local storage, sync storage, and session storage, explains how the unlimitedStorage permission works, and shows developers how to manage storage efficiently within these constraints."
---

Every Chrome extension operates within a strictly bounded storage environment, and understanding these boundaries is essential for both developers building extensions and users trying to diagnose why their favorite tools are behaving unexpectedly. Chrome's storage system is divided into multiple distinct layers, each with its own quota, persistence model, and synchronization behavior. An extension that works flawlessly with a few kilobytes of configuration data can encounter silent failures, data truncation, or outright crashes when it approaches its storage ceiling. This guide provides a comprehensive breakdown of every storage type available to Chrome extensions, the exact quotas for each, and practical strategies for working within these limits.

![Chrome extension storage types overview](/content/images/chrome-extension-storage-limits-guide/chrome-extension-storage-limits-guide-overview.webp "Understanding Chrome Extension Storage Quotas and Types")

## chrome.storage.local: The Workhorse With Generous Limits

Local storage is the primary data storage mechanism used by the vast majority of Chrome extensions, and it offers the most generous default quota of any storage API available to extensions. By default, each extension is allocated 10,240 KB (approximately 10 MB) of local storage space. This quota applies to the combined total of all keys and values stored through the `chrome.storage.local` API, including the JSON serialization overhead of the stored objects. For most extensions that store user preferences, configuration objects, and small datasets, 10 MB is more than sufficient and rarely becomes a constraining factor.

The 10 MB default quota can be effectively removed by declaring the `unlimitedStorage` permission in the extension's manifest file. When this permission is present, Chrome removes the enforced quota ceiling for `chrome.storage.local`, allowing the extension to store data up to the available disk space on the user's device. Extensions like Honey, which caches product pricing data and browsing history, and Grammarly, which stores dictionaries and writing style preferences, leverage this permission to maintain large local datasets that would otherwise exceed the default quota. However, the `unlimitedStorage` permission is classified as a powerful permission by the Chrome Web Store review team, and its inclusion in a manifest triggers additional scrutiny during the review process.

Developers using `chrome.storage.local` should be aware that the storage is persistent across browser restarts and survives extension updates. Data stored here remains until the extension is explicitly removed or the user clears browsing data. The API is asynchronous, using callback-based patterns, and supports batch read and write operations through `chrome.storage.local.get()` and `chrome.storage.local.set()`. For extensions that need to monitor storage changes in real time, the `chrome.storage.onChanged` event provides a listener that fires whenever any storage value is modified, enabling reactive UI updates without polling.

### Measuring and Monitoring Local Storage Usage

Extensions can check their current storage consumption programmatically using the `chrome.storage.local.getBytesInUse()` method. This function accepts an optional array of keys and returns the total bytes used by the specified keys, or the total for all keys if no array is provided. A well-designed extension should monitor its storage usage periodically and implement cleanup routines when consumption approaches the quota limit. For example, an extension that caches API responses might implement a least-recently-used eviction policy that automatically removes the oldest cache entries when storage usage exceeds 80 percent of the available quota.

The `getBytesInUse()` method returns a precise byte count that includes the serialized size of both keys and values. This is important because the JSON serialization of complex objects can be significantly larger than the in-memory representation. A JavaScript object containing nested arrays and objects with lengthy property names can consume substantially more storage bytes than its `JSON.stringify()` output might suggest due to internal storage overhead. Developers should test their storage consumption with realistic data volumes rather than assuming that small in-memory objects will translate to proportionally small storage footprints.

## chrome.storage.sync: Limited but Cross-Device

Sync storage is designed for settings that users expect to see consistent across all their Chrome installations. The quota for sync storage is dramatically smaller than local storage, limited to a total of 100 KB (102,400 bytes) across all installed extensions for a single Google Account. This is not 100 KB per extension but 100 KB shared among every extension that uses the sync API, which makes it a scarce resource that developers must use judiciously. Individual items stored in sync storage cannot exceed 8,192 bytes each, and no more than 512 items can be stored per extension. Additionally, sync storage supports a maximum of 1,800 write operations per hour and 120 write operations per minute, with each `set()` call counting as one operation regardless of how many keys it modifies.

These constraints mean that sync storage is suitable only for essential preferences that genuinely need to be available on every device. A well-architected extension might store the user's theme selection, language preference, and notification toggle state in sync storage while keeping everything else in local storage. Dark Reader, for instance, syncs a compact configuration object containing your global enable/disable state and default theme mode, while the much larger per-site brightness and contrast adjustments remain in local storage unless you explicitly enable the extension's sync feature, which implements its own cloud synchronization layer rather than relying solely on Chrome's sync API.

The synchronization process itself introduces latency that developers must account for. When an extension writes to sync storage on one device, the change propagates through Google's servers to other signed-in devices. This propagation is not instantaneous and can take anywhere from a few seconds to several minutes depending on network conditions and server load. Extensions that read from sync storage immediately after writing should not assume the value is available on other devices right away. The `chrome.storage.onChanged` event fires on all synced devices when a change propagates, so extensions can use this event to update their UI when synced settings arrive rather than relying on immediate availability.

### Common Pitfalls with Sync Storage

One of the most frequent mistakes developers make with sync storage is treating the 100 KB quota as a per-extension allocation. An extension that stores 50 KB of data in sync storage is consuming half of the user's total sync storage budget, which can cause conflicts with other extensions and lead to confusing `QUOTA_BYTES_PER_ITEM` errors. These errors are thrown silently in many cases because the sync API's failure callbacks are not always handled by extension code, resulting in settings that appear to save successfully but are never actually persisted.

Another common pitfall is storing frequently changing data in sync storage. The rate limits of 1,800 writes per hour and 120 writes per minute exist to prevent extensions from overwhelming Google's sync infrastructure. An extension that updates a counter or timestamp in sync storage on every page load will quickly exhaust these rate limits, causing subsequent writes to fail silently. Developers should debounce sync storage writes and only persist values when they have actually changed from the previously stored version. Comparing the new value against the current stored value before calling `set()` can dramatically reduce unnecessary write operations.

![Storage limits comparison details](/content/images/chrome-extension-storage-limits-guide/chrome-extension-storage-limits-guide-details.webp "Comparing Local, Sync, and Session Storage Limits")

## chrome.storage.session: Ephemeral and Memory-Backed

Session storage, introduced in Manifest V3, provides a storage mechanism that is backed by the device's memory rather than persisted to disk. Data stored in `chrome.storage.session` survives service worker restarts and extension updates within the same browser session but is completely wiped when the browser closes. The default quota for session storage is 10 MB per extension, the same as the default local storage quota. Unlike local storage, session storage cannot be expanded with the `unlimitedStorage` permission, and there is no corresponding `getBytesInUse()` method available to monitor consumption in real time.

Session storage fills an important gap in Manifest V3's architecture. When Google migrated extensions from persistent background pages to ephemeral service workers in Manifest V3, extensions lost the ability to maintain state in global JavaScript variables across service worker restarts. Session storage provides a persistence layer that survives these restarts without the disk I/O overhead of local storage. Extensions that need to maintain temporary state, such as an active WebSocket connection ID, a pending operation queue, or intermediate computation results, can use session storage as a bridge between service worker lifecycles.

The read and write performance of session storage is significantly faster than local storage because it operates entirely in memory. Benchmarks show that session storage write operations complete in under 1 millisecond on average, compared to 5 to 15 milliseconds for local storage writes that must be serialized to disk. For extensions that perform frequent state updates, such as real-time collaboration tools or live data monitoring extensions, this performance difference can meaningfully impact responsiveness. However, the volatile nature of session storage means it should never be used for data that the user would expect to persist across browser sessions.

## IndexedDB: No Hard Quota but Practical Limits

IndexedDB provides the most flexible and highest-capacity storage option available to Chrome extensions, and it operates under a different quota model than the `chrome.storage` APIs. IndexedDB does not have a hard-coded per-extension quota. Instead, Chrome applies a shared storage budget across all storage mechanisms used by an origin, including cookies, localStorage, IndexedDB, and the Cache API. This shared budget is typically several gigabytes and scales based on the total available disk space on the user's device. Chrome may prompt the user with a storage quota dialog when the combined usage approaches certain thresholds, but there is no fixed byte limit that will cause writes to fail silently.

Extensions access IndexedDB through the standard Web IndexedDB API rather than through the `chrome.storage` namespace. This means the API is fully asynchronous using promises, supports complex queries through indexes and cursors, and can store structured cloneable data types including blobs, arrays, and nested objects. Extensions like Notion Web Clipper use IndexedDB to store clipped web content with rich metadata, while browsing history extensions use it to maintain searchable databases of visited pages with timestamps, titles, and content snapshots.

The practical limit for IndexedDB in a Chrome extension context is determined by the browser's eviction policy. When disk space becomes critically low, Chrome may begin evicting data from least-recently-used origins, starting with temporary storage and progressing to persistent storage. Extensions that store critical data in IndexedDB should implement their own backup mechanisms, either by periodically exporting to `chrome.storage.local` or by syncing to a cloud service, to protect against potential eviction. The `navigator.storage.persist()` API can request persistent storage for an origin, which tells the browser not to evict the data even under storage pressure, though the user may be shown a permission prompt.

## The unlimitedStorage Permission: Benefits and Review Implications

The `unlimitedStorage` permission in an extension's manifest removes the 10 MB default quota for `chrome.storage.local`, but it comes with significant trade-offs that developers must consider carefully. First, it triggers enhanced scrutiny during Chrome Web Store review. Google's review guidelines state that extensions requesting `unlimitedStorage` must justify why they need more than the default 10 MB, and extensions that request this permission without a clear data-intensive use case are likely to be rejected or asked to modify their architecture. Reviewers will examine the extension's code to verify that the permission is actually used and that the stored data is appropriate.

From a user trust perspective, the `unlimitedStorage` permission appears in the permissions list that users see before installing an extension. While most users do not read permission dialogs carefully, privacy-conscious users and enterprise administrators do pay attention to storage-related permissions. An extension that stores large amounts of data locally raises questions about what is being collected and why, even if the data is purely functional and non-personal. Developers should provide clear documentation explaining what data is stored locally and why the default quota is insufficient, ideally in the extension's privacy policy and Web Store description.

For most extensions, the 10 MB default quota is genuinely adequate. A typical extension that stores user preferences as a JSON object with a few dozen keys will consume well under 100 KB. Even extensions that cache moderate amounts of data, such as a weather extension storing seven days of forecast data or a language learning extension storing a few thousand vocabulary words, can operate comfortably within 10 MB. The `unlimitedStorage` permission should be reserved for extensions with legitimate high-volume storage needs, such as offline content readers, database management tools, or extensions that cache large media files for offline access.

## Storage Comparison Reference

| Storage Type | Default Quota | Expandable | Persistent | Synced | Best Use Case |
|-------------|--------------|------------|------------|--------|---------------|
| chrome.storage.local | 10 MB | Yes (unlimitedStorage) | Yes | No | User preferences, cached data |
| chrome.storage.sync | 100 KB total | No | Yes | Yes | Cross-device settings |
| chrome.storage.session | 10 MB | No | Session only | No | Temporary state, service worker persistence |
| IndexedDB | No hard limit | N/A | Yes (evictable) | No | Structured data, large datasets |
| localStorage (web) | 5-10 MB | No | Yes | No | Legacy extension compatibility |

## Strategies for Efficient Storage Management

Developers should implement several core strategies to manage storage efficiently within Chrome's quota constraints. First, compress large string values before storing them. Using `CompressionStream` or a lightweight library like pako to compress JSON data before writing it to storage can reduce consumption by 60 to 80 percent for repetitive or structured data. This is particularly effective for extensions that store API response caches or large text datasets. The decompression overhead on read is minimal compared to the storage savings.

Second, implement data expiration and cleanup routines. Extensions that accumulate data over time, such as browsing history loggers or form autofill tools, should automatically prune records older than a configurable retention period. A weekly cleanup task that removes data older than 30 days prevents unbounded growth and keeps storage consumption stable. Extensions can use the `chrome.alarms` API to schedule periodic cleanup tasks that run regardless of whether the service worker is currently active.

Third, choose the appropriate storage type for each category of data. Storing frequently accessed, small configuration objects in session storage provides faster read performance, while storing rarely accessed but essential data in local storage ensures persistence. Cross-device settings belong in sync storage, and large structured datasets should use IndexedDB. Applying this分层 approach ensures that each data type is stored in the most appropriate and efficient mechanism available.

## Frequently Asked Questions

### What happens when an extension exceeds its storage quota?

When a `chrome.storage.local.set()` operation would cause the extension to exceed its quota, the operation fails and the callback receives a `runtime.lastError` object with the message "QUOTA_BYTES quota exceeded." The data is not partially written; either the entire operation succeeds or it fails completely. Extensions that do not check for this error will silently lose the data they attempted to store, which is why robust error handling around storage operations is essential for any extension that approaches its quota limit.

### Can users see how much storage an extension is using?

Users can visit `chrome://extensions` and click the "Details" button on any extension to see a summary of its storage usage. Chrome also provides `chrome://settings/siteData` and `chrome://settings/cookies` pages where users can view and manage storage used by extensions and websites. However, the information shown at these pages is limited and does not provide the granular per-key breakdowns that developers can access through `getBytesInUse()`.

### Does the 100 KB sync storage limit apply per device or per account?

The 100 KB limit is per Google Account, not per device. All devices signed into the same Google Account share the same 100 KB sync storage pool. This means that installing the same set of extensions on multiple devices does not increase the available sync storage. It also means that an extension on one device that consumes a large share of sync storage can cause quota errors for extensions on other devices that share the same account.

### Is IndexedDB available in content scripts?

Yes, content scripts can access IndexedDB, but they operate within the context of the web page's origin rather than the extension's origin. This means a content script's IndexedDB data is shared with the website it is injected into, which raises both security and data integrity concerns. For this reason, extensions that need IndexedDB access from content scripts typically communicate with their background service worker, which accesses the extension's own IndexedDB on the content script's behalf using message passing.

### Can an extension use both chrome.storage and IndexedDB simultaneously?

Absolutely. Many production extensions use a combination of storage mechanisms. A common pattern is to use `chrome.storage.local` for simple user preferences and configuration objects while using IndexedDB for larger structured datasets. The Todoist extension, for example, stores UI preferences in local storage and task data in IndexedDB. This hybrid approach takes advantage of the strengths of each storage type while working within their respective constraints.

### Does Manifest V3 change any storage limits compared to Manifest V2?

The core storage quotas for `chrome.storage.local` (10 MB default) and `chrome.storage.sync` (100 KB total) remain unchanged between Manifest V2 and Manifest V3. The primary storage-related change in Manifest V3 is the introduction of `chrome.storage.session`, which replaces the need for in-memory state management in persistent background pages. Manifest V3 also enforces stricter content security policies that affect how extensions can access web-based storage APIs from service workers, but the quotas themselves are consistent across both manifest versions.