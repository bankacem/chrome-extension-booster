# Content Refiner — Phase 0 (audit, no LLM)

`audit_articles.py` runs a zero-LLM static audit over every published
article in `public/content/articles/`, reusing `evaluator.py`'s
`_deterministic_checks()` (title tag length, meta description, dead `#`
links, placeholder images, broken internal links, empty category,
fabrication guard) unmodified.

One check is intentionally overridden here rather than in `evaluator.py`
itself: the truncation guard ("body does not end with sentence-ending
punctuation"). That check was written for fresh Markdown drafts and
false-positives on published articles that legitimately end in raw HTML
CTA blocks (injected by the older `autoExtensionLinker.ts` /
`generate-article` pipeline, not by the current agentic `content.py`).
The override here strips HTML tags line-by-line, ignores short lines
(<15 words — headings, buttons, labels), and judges truncation on the
last line that still reads like real prose. `evaluator.py` is left
untouched since new drafts from `content.py` aren't affected.

## Usage

```bash
python3 audit_articles.py --sample 20      # quick sanity check
python3 audit_articles.py                  # full sweep, writes audit_report.json
```

## Results (last full run, 769 articles)

- 358 clean (zero issues)
- 411 with at least one issue
- 18 confirmed genuine truncations (verified manually — not detector
  false positives), including cases where a sentence promises a
  resource list ("...check out our other resources:") that was
  silently dropped and replaced with a CTA box
- 98 meta descriptions ending in "..." (look truncated)
- ~300 meta descriptions outside the 120–160 char target range
- 1 dead `#` placeholder link, 1 placeholder image src, 1 broken
  internal link

Full per-article report is generated locally as `audit_report.json`
(not checked into git — regenerate by running the script).

## Next steps

This is intentionally audit-only — no article content is rewritten yet.
Planned next: prioritize the 411 flagged articles using real Google
Search Console data (impressions/position) once `research.py` is wired
to `gsc_client.py`, then build `refiner.py` to fix the highest-value
issues, gated by human review (PR, not direct publish) and re-checked
through `evaluator.py` before merge.
