---
seo_title: "Chrome User Scripts API: Complete Guide"
id: "a1b2c3d4-dev-0005"
title: "Chrome User Scripts API: Capabilities, Permissions, and Safe Use"
slug: "chrome-extension-user-scripts-api-guide"
excerpt: "The chrome.userScripts API lets Manifest V3 extensions programmatically register and manage user scripts on websites without hardcoding content script declarations. This guide covers capabilities, permission models, and security considerations."
featured_image: /content/images/chrome-extension-user-scripts-api-guide/featured.webp
category: "Productivity & Tools"
tags: ["user scripts", "chrome extension api", "manifest v3", "content scripts", "dynamic injection", "permissions"]
keywords:
  - chrome user scripts api
  - chrome.userScripts.register
  - dynamic user scripts mv3
  - user scripts vs content scripts
meta_description: "Master the Chrome User Scripts API in Manifest V3. Learn how to register, manage, and safely use dynamic user scripts with proper permissions and security practices."
status: draft
published_at: "2026-09-18T11:00:00Z"
scheduled_at: "2026-09-18T11:00:00Z"
author: "James Mitchell"
author_image: /content/images/authors/james-mitchell.png
read_time: 10
created_at: "2026-08-25T12:00:00+01:00"
updated_at: "2026-08-25T12:00:00+01:00"
description: "The chrome.userScripts API lets Manifest V3 extensions programmatically register and manage user scripts on websites without hardcoding content script declarations. This guide covers capabilities, permission models, and security considerations."
---

Content scripts have long been the standard mechanism for Chrome extensions to interact with web pages. Declared statically in the manifest.json file, they inject JavaScript and CSS into matching pages automatically when the browser loads those pages. This approach works well for extensions with predictable, fixed injection targets. However, some extensions need to inject scripts dynamically based on user configuration, subscription data, or runtime conditions. The chrome.userScripts API, introduced in Chrome 120 as part of the ongoing Manifest V3 evolution, addresses this need by providing a first-class API for programmatic user script registration.

The User Scripts API is not a replacement for content scripts. It is a complementary mechanism designed for specific scenarios where static content script declarations are insufficient. Extensions like Tampermonkey and Violentmonkey built their entire value proposition around managing dynamic user scripts, and the chrome.userScripts API brings similar capabilities natively into the Chrome extension platform. This guide covers what the API can do, how permissions work, how to implement it correctly, and what security considerations apply.

![User Scripts API overview in Chrome extensions](/content/images/chrome-extension-user-scripts-api-guide/chrome-extension-user-scripts-api-guide-overview.webp "User Scripts API Overview")

## What the User Scripts API Actually Does

The chrome.userScripts API allows a Manifest V3 extension to register JavaScript scripts that execute in the context of web pages matching specified URL patterns. Unlike static content scripts declared in manifest.json, user scripts registered through this API can be added, updated, and removed at runtime without modifying the extension's manifest or requiring a reload. The API provides four core methods: register, unregister, getScripts, and configure.

The register method accepts an array of script objects, each defining the JavaScript code to inject, the URL patterns where it should run, and optional configuration like the injection timing (document_start, document_end, or document_idle) and world (ISOLATED or MAIN). The unregister method removes previously registered scripts by their IDs. The getScripts method retrieves all currently registered scripts, which is useful for debugging and for building user interfaces that display active scripts. The configure method sets global defaults that apply to all registered scripts unless overridden individually.

One critical distinction between the User Scripts API and traditional content scripts is the execution context. Content scripts run in an isolated world by default, meaning they share the same DOM as the page but have their own JavaScript execution environment with separate globals. The User Scripts API supports both the ISOLATED and MAIN worlds. Running in the MAIN world means the script executes in the same JavaScript context as the page itself, with access to the page's global variables and functions. This is powerful but introduces security and stability risks that developers must manage carefully.

### User Scripts vs. Content Scripts vs. Scripting API

Chrome extensions now have three mechanisms for injecting JavaScript into web pages, and choosing the right one depends on your use case. Understanding the differences prevents architectural mistakes and ensures your extension follows the principle of least privilege.

| Feature | Static Content Scripts | chrome.scripting.executeScript | chrome.userScripts API |
|---|---|---|---|
| Declaration | manifest.json | Runtime API call | Runtime API call |
| Persistence | Permanent until updated | Ephemeral per call | Persistent until unregistered |
| MAIN world access | Not directly (requires world setting in MV3) | Yes, with world option | Yes, with world option |
| Dynamic URL matching | No | Yes | Yes |
| Survives service worker restart | Yes | No (must re-inject) | Yes (scripts persist) |
| Requires host permissions | Yes (in manifest) | Yes (per call) | Yes (via API permission) |
| Best for | Fixed injection targets | One-time code execution | Long-running dynamic scripts |

Static content scripts declared in the manifest are the simplest and most reliable approach for extensions that always inject into the same set of websites. The chrome.scripting.executeScript API is best for one-time injections triggered by user actions, such as a toolbar button click that modifies the current page. The chrome.userScripts API sits between these two: it provides the persistence of static content scripts with the flexibility of dynamic registration. A script registered with chrome.userScripts.register persists across page navigations and survives service worker restarts, which is a significant advantage over chrome.scripting.executeScript.

Extensions like Stylus, which allows users to apply custom CSS themes to websites, benefit from this persistence. Users configure their styles once, and the extension applies them consistently without re-registering scripts on every page load or after every service worker restart. The User Scripts API was designed with this type of use case in mind.

## Permissions and Manifest Configuration

Using the chrome.userScripts API requires two specific permissions in your manifest.json: "userScripts" and appropriate host permissions for the websites where the scripts will run. The userScripts permission is a standard API permission that grants access to the chrome.userScripts namespace. Host permissions determine which URLs the extension can inject scripts into.

```json
{
  "manifest_version": 3,
  "name": "Dynamic Script Manager",
  "version": "1.0.0",
  "permissions": ["userScripts", "storage"],
  "host_permissions": ["https://*.example.com/*"],
  "background": {
    "service_worker": "background.js"
  }
}
```

The host_permissions declaration is critical. The User Scripts API will not inject scripts into URLs that the extension does not have permission to access. If you try to register a user script with a match pattern for https://github.com/* but your manifest only grants host permissions for https://*.example.com/*, the registration will succeed silently but the script will never execute. This silent failure is a common source of confusion for developers new to the API.

There is an important nuance regarding how host permissions interact with the User Scripts API compared to static content scripts. Static content scripts can use optional_host_permissions, which allow the extension to request access to additional sites at runtime. The User Scripts API also works with optional permissions, but you must call chrome.permissions.request before registering scripts that target those optional hosts. This means your extension's flow should be: request the host permission, wait for the user to grant it, and then register the user scripts targeting that host.

### Registering a User Script

The registration process involves constructing a UserScript object and passing it to chrome.userScripts.register. Each script object requires a unique id, a js property containing an array of file references, and a matches array of URL patterns. Here is a practical example that registers a script to run on all GitHub pages.

```javascript
chrome.userScripts.register([
  {
    id: 'github-enhancer',
    matches: ['https://github.com/*'],
    js: [{ file: 'content/github-enhancer.js' }],
    runAt: 'document_idle',
    world: 'ISOLATED'
  }
]).then(() => {
  console.log('User script registered successfully');
}).catch((error) => {
  console.error('Registration failed:', error);
});
```

![User Scripts API implementation and permissions](/content/images/chrome-extension-user-scripts-api-guide/chrome-extension-user-scripts-api-guide-details.webp "Implementation and Permissions")

The js property points to files within the extension package, not to external URLs. This is a deliberate security restriction. All code executed through the User Scripts API must be bundled with the extension, ensuring that Chrome's extension review process can verify the code before it reaches users. You cannot register a user script that loads JavaScript from a remote server at runtime, which would be a remote code execution violation.

## Security Considerations and Safe Use

The User Scripts API provides significant power, and with that power comes security responsibility. The most consequential decision you make when using this API is whether to run scripts in the ISOLATED world or the MAIN world. This choice has direct implications for both security and functionality.

Running in the ISOLATED world is the safer default. The injected script shares the page's DOM but has its own JavaScript globals. It cannot access variables defined by the page's own scripts, and page scripts cannot access variables defined by the user script. This isolation prevents malicious web pages from interfering with your extension's logic and prevents your script from accidentally overwriting page variables. Extensions like Honey and Rakuten Price Tracker use isolated worlds to safely interact with page content.

Running in the MAIN world gives your script access to the page's full JavaScript environment, including globals, functions, and objects defined by the page. This is necessary when your script needs to call page functions or read page-level state that is not exposed through the DOM. However, running in the MAIN world means the page's JavaScript can also interact with your script's code. A malicious page could redefine functions your script depends on, read sensitive data your script stores in global variables, or intercept communication between your script and the extension's service worker.

### Mitigating Risks When Using the MAIN World

If your use case requires the MAIN world, implement defensive coding practices to reduce the attack surface. Wrap all global variables in immediately invoked function expressions to minimize exposure. Avoid storing sensitive data, such as authentication tokens or personal information, in global variables accessible to the page. Use chrome.runtime.sendMessage to send sensitive data back to the service worker rather than storing it in the page context.

Validate all data received from the page context before processing it. A malicious page could pass malformed or exploit-laden data to your script through overridden DOM methods or prototype pollution attacks. Use strict type checking and input validation even for data that appears to come from trusted sources, because the page environment is inherently untrusted once your script runs in it.

Consider whether the MAIN world is truly necessary. Many developers default to MAIN world access because it is convenient, not because it is required. Extensions like Dark Reader modify CSS properties through the DOM, which works perfectly in the ISOLATED world. Extensions like Video Speed Controller manipulate media element properties, which are also accessible through the DOM. Only use MAIN world access when you genuinely need to call page-defined JavaScript functions or access page-level JavaScript state that has no DOM representation.

## Managing User Scripts at Scale

For extensions that manage many user scripts across multiple websites, organization becomes important. The chrome.userScripts.getScripts method returns all currently registered scripts, which you can use to build management interfaces, implement import and export functionality, or detect conflicts between scripts.

Store script metadata and user configurations in chrome.storage.local so they persist across service worker restarts. When the service worker starts up, read the stored configuration and re-register all scripts. This ensures continuity even though the service worker is not persistent. Implement error handling for registration failures, because attempting to register a script with an ID that is already registered will throw an error. Call chrome.userScripts.getScripts first to check for existing registrations, or use a try-catch block with chrome.userScripts.unregister as a fallback before re-registering.

## Frequently Asked Questions

**Can user scripts registered through the API access Chrome extension APIs like chrome.storage?**
Yes, when running in the ISOLATED world, user scripts have full access to Chrome extension APIs including chrome.storage, chrome.runtime, and chrome.tabs. When running in the MAIN world, access to Chrome extension APIs is not available because the script shares the page's JavaScript context. To communicate with the extension from the MAIN world, use window.postMessage and listen for messages in a content script or the service worker.

**Does the User Scripts API support CSS injection?**
No. As of Chrome 126, the chrome.userScripts API only supports JavaScript injection. If you need to inject CSS dynamically, continue using chrome.scripting.insertCSS or declare your CSS in static content scripts. Google has not announced plans to add CSS support to the User Scripts API, though feature requests exist on the Chromium bug tracker.

**Can I update a registered user script without unregistering it first?**
Yes. Calling chrome.userScripts.register with a script object that has the same ID as an existing registration will update that script in place. The browser applies the updated configuration to new page loads. Pages that are already running the previous version of the script will not be affected until they are reloaded.

**How does the User Scripts API compare to Tampermonkey?**
Tampermonkey is a standalone extension that provides a full user script management interface, including an editor, script repository, and import and export functionality. The chrome.userScripts API is a lower-level building block that other extensions can use to implement similar features natively. Extensions built on the chrome.userScripts API can provide a more integrated experience since they have direct access to Chrome extension APIs without going through a separate extension's permissions model.

**What happens to registered scripts when the extension is updated?**
All registered user scripts are cleared when the extension is updated or reloaded. Your service worker's startup logic should re-register all scripts from stored configuration. This is the same behavior as service worker state being cleared on update, so your existing pattern of reinitializing state in the service worker covers this case.

**Is the User Scripts API available in Firefox?**
Firefox's WebExtensions API does not include an equivalent to chrome.userScripts. Firefox extensions that need dynamic script injection use the browser.scripting API, which has some overlap but does not persist scripts across navigations in the same way. If you are building a cross-browser extension, you will need to implement feature detection and fall back to chrome.scripting.executeScript for Firefox.