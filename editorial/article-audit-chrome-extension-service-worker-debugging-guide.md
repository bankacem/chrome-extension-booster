# Article audit: Chrome Extension Service Worker Debugging Guide

## Before refinement

- **Source:** isolated BluesMinds pilot draft; not present in `origin/main`.
- **Target slug:** `chrome-extension-service-worker-debugging-guide`.
- **Baseline status:** `draft`; not eligible for `articles-index.json`, Sitemap, or publication.
- **Baseline title:** Chrome Extension Service Worker Debugging Guide.
- **Primary intent:** informational and procedural troubleshooting for developers debugging a Manifest V3 extension service worker.
- **Audience:** beginner-to-intermediate Chrome extension developers, especially people moving from Manifest V2 or diagnosing registration, lifecycle, messaging, and state issues.
- **Baseline strengths:** clear troubleshooting structure, practical checklist, FAQ, pros/cons table, one official Chrome link, and a focused developer audience.
- **Baseline weaknesses:** inaccurate or imprecise DevTools labels and steps, overgeneralized `skipWaiting()` and lifecycle advice, insufficient distinction between extension service workers and page service workers, shallow message/state examples, generic pros/cons, and limited Information Gain.

## Internal-cannibalization decision

`origin/main` contains `chrome-extension-service-worker-guide.md`, but that file is also currently `draft` and is not a live indexed article. Its intended angle is why MV3 background features stop and restart, cold starts, resilience, state persistence, alarms, and message handling. This refinement must not become a second general lifecycle article. It will keep a narrower debugging intent: reproduce a failure, locate the correct extension DevTools surface, inspect registration and events, trace messages, and validate a fix. The lifecycle article remains the architecture/resilience companion rather than a duplicate.

## Planned unique angle

A diagnostic workflow that maps each symptom to the correct Chrome extension surface, evidence to collect, and next test to run. The article will use small, context-specific code examples and official Chrome documentation rather than unsupported performance promises or generic background-worker advice.

## Publication boundary

No publication, indexing request, Sitemap update, or automatic learning lesson is allowed in this refinement. The article remains `status: draft` until human review and all repository gates pass.

## After refinement: decisions and checks to run

The draft now uses a symptom-to-evidence diagnostic matrix rather than a generic list of performance advice. It corrects `Background Worker` to the current `Inspect views` workflow, removes generic `skipWaiting()` guidance, separates `onMessage` from `onMessageExternal`, explains the extension-worker registration field, clarifies the loss of global variables and the absence of Web Storage in extension service workers, and adds small code examples for lifecycle logging, asynchronous responses, sender validation, and state persistence.

The FAQ and checklist are unique to this article. The References section points only to official Chrome documentation. No competitor wording, personal testing claim, invented benchmark, fake screenshot, or unsupported quota number was added. The frontmatter remains `status: draft`, and no index, Sitemap, publication, or Google indexing action is allowed in this branch.

The article has no new screenshot asset in this refinement. The featured image remains the site's existing `/og-image.png` placeholder; adding a visual would be a separate, explicitly reviewed asset task so that no fabricated DevTools screenshot is introduced.
