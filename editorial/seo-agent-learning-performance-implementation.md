# SEO Agent Pro — Memory and GSC Performance Hardening

## Scope

This change hardens the existing `seo_agent_pro` pipeline without enabling auto-publishing, changing article content, changing schedules, or claiming Google ranking improvements.

## Implemented

- Added `title` and `slug` fields to the shared `GraphState` type.
- Added `load_relevant_lessons()` to `memory_store.py`. It selects a bounded, deterministic subset of lessons using lexical overlap and a small priority bonus for hard safety rules. The original `load_lessons()` API remains for compatibility.
- Updated Strategy and Content agents to use the relevant lesson subset rather than injecting the complete lessons file into every prompt.
- Expanded cycle records with `title`, `slug`, `success_factors`, `failure_reasons`, `lesson_candidates`, and `competitor_gaps_selected`. These fields are descriptive evidence for later review; they do not promote qualitative observations into permanent lessons automatically.
- Expanded Chroma documents and metadata with title, category, success signals, selected gaps, final status, and main issues. The Chroma index remains ephemeral and is rebuilt from JSON.
- Added stable article metadata to Performance Review snapshots: schema version, keyword, category, published date, URL, page performance, site baseline, and URL Inspection result.
- Added unit coverage for lesson selection, cycle metadata, GSC evidence thresholds, baseline control, and performance snapshot persistence.

## Deliberately not implemented

- No reduction of the GSC learning gate. Evidence lessons still require comparable windows, at least 500 impressions per page and baseline, and a signal beyond site-wide movement.
- No Analytics integration. The repository contains no verified Analytics connector in this change.
- No automatic merging, publishing, or scheduling of articles.
- No claim that an internal Evaluator score predicts Google ranking.
- No storage or printing of API secrets.

## GSC boundary

`seo_agent_pro/gsc_client.py` already provides Search Analytics and URL Inspection functions. `performance_learning.py` stores page-level snapshots in `seo_agent_pro/agentic/memory/performance_log.json` through the existing weekly review workflow. The presence of a snapshot or URL Inspection response is not treated as proof of Google indexing or ranking; Search Console remains the authoritative source for those claims.

## Review status

The changes are on a dedicated branch based on the latest `origin/main`. They require human review through a Pull Request before merge. The article generation Workflow remains manual and serialized, and the publication schedule is untouched.
