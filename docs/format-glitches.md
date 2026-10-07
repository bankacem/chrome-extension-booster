# Format glitches — read-only inventory (2026-10-08)

Owner brief 2026-10-08, item 5. **Read-only scan — no article, image, or src
file was modified for this document.** Corpus: the 881 published articles
under `public/content/articles/**` (i18n copies excluded), scanned
deterministically with the regexes listed per family. No model calls.

## 1. `H3:` left inside headings (FAQ question headings)

- **Articles affected: 17** — **122 heading lines** carry a literal `H3:`
  prefix (e.g. `### H3: Can Chrome open multiple URLs at once natively?`).
- All 17 articles have the affected headings **directly under a
  "Frequently Asked Questions" heading** — the artifact comes from a
  generation template that labeled heading levels ("H3:") and leaked the
  label into the output.
- Full list (17): batch-open-tabs-scheduled-chrome, best-chatgpt-extension-tools-for-chrome, best-screenshot-extensions-for-chrome-1, deezer-extension-4, download-video-instagram-extension-chrome-6, and 12 more — machine-readable list in the scan output `format_glitches_raw.json` (workspace artifact, available on request).

## 2. `## Table of Contents-` glued to the first TOC item

- **Articles affected: 212.** The glitch: the first TOC bullet is glued onto
  the heading line itself —
  `## Table of Contents- [First Item](#first-item)` — instead of the item
  starting on the next line. Markdown still renders the heading, but the
  first TOC entry becomes part of the H2 text (broken navigation, odd
  anchor extraction, and the anchor id no longer matches the TOC links).

## 3. `ttps://` links

- **Articles affected: 0** (true typos — the literal bytes `ttps://` not
  preceded by an `h`).
- Every visual "ttps://" sighting in this corpus is a **rendering artifact
  of glitch family 4**: the raw bytes are
  `[https://extensionto.com](target)` — a URL used as the *anchor text* of a
  markdown link — where the leading `[h` gets eaten in some views, leaving
  `ttps://` visible. Byte-level scans find no missing-`h` typo anywhere.

## 4. URL used as markdown anchor text, followed by `](target)`

- **Articles affected: 53** (one hit per article; 53 hits total).
- Shape: `[https://extensionto.com](target)` — the URL sits inside the
  square brackets (anchor text) while the actual target sits in the
  parentheses. 52 of the 53 link to `/` (the homepage); 1 links to
  `/blog/…` (`the-best-chrome-extension-for-android-tablet`). Renderers
  show a link labeled with the URL that goes somewhere else — the malformed
  construction the owner observed as "ttps://" / "https://extensionto.com](/)".

## Is automated fixing safe?

Mechanically, all three real families are deterministic and verifiable —
but they all edit article bodies, so under the current governance
(FAQ question lines frozen; no mass `public/content` edits without explicit
owner approval; body_neutralization gate on every edit) the recommendation
is: **do not auto-fix silently; run each family as its own owner-approved
batch with per-file evidence.**

| Family | Mechanical fix | Word/content risk | Guard interaction | Verdict |
|---|---|---|---|---|
| `H3:` in FAQ headings (17 articles) | drop the `H3: ` prefix from the heading line | zero words changed; heading text otherwise intact | FAQ question lines are frozen by convention → needs an `allowed_heading_renames`-style license per file | automatable + safe WITH the heading license and a per-file before/after diff |
| glued TOC (212 articles) | insert a newline between `## Table of Contents` and the first `- [item]` | zero words changed; pure line split | heading line changes → same heading-rename license; TOC blocks already receive merged-block handling | automatable + safe WITH the same licenses; 212 files = batch into several PRs |
| URL-as-anchor (53 articles) | replace the URL anchor text with a proper label (`[ExtensionTo](target)`), target byte-identical | anchor text changes; **target link unchanged** (verifiable per file) | link-target set must stay equal — gate check 3 already asserts this | automatable + safe; already demonstrated hand-written in the pilot CTAs (#501 round 3); keep the `/blog/…`-target case as its own reviewed row |
| `ttps://` typos | nothing to fix (0 occurrences) | — | — | n/a |

Automated fixing is therefore **technically safe but governance-gated**: the
fixes themselves are one-line, verifiable transforms, yet they touch frozen
heading lines and 200+ article files, so each family should ship as an
explicitly approved batch with before/after diffs and a clean
body_neutralization + fabrication gate run per file — exactly as this brief's
other items were processed.
