# Manus + seo_agent_pro Collaboration Protocol

## Purpose

This protocol is the single operating contract for coordinated article production. It prevents Manus, seo_agent_pro, scheduled workflows, and independent Workers from claiming the same keyword, slug, intent, or shared index files.

## Ownership

- Manus owns keyword selection, semantic clustering, search intent, internal-cannibalization review, source approval, batch assignment, final editorial review, merge approval, and live verification.
- seo_agent_pro owns real SERP research when SearXNG is available, strategy briefing, draft writing, metadata/link/category optimization, deterministic and qualitative evaluation, revisions, and learning records.
- A Worker owns exactly one reserved topic, one target slug, one branch, and one pull request.
- The integration owner alone regenerates `articles-index.json` and `public/sitemap.xml` for a merge batch.

## Reservation states

`candidate` → `approved` → `reserved` → `draft` → `needs_revision` or `ready_for_merge` → `merged` → `published`.

A failed or rejected run stays recorded as `needs_revision` or `paused`; it must not silently return to the queue. A keyword is not available to another Worker until its owner explicitly releases it.

## Required reservation checks

Before starting a topic, the coordinator checks:

1. `public/content/articles-index.json` for existing title, slug, keywords, and intent overlap.
2. `seo_agent_pro/agentic/memory/refined_articles.json` for completed refinements.
3. `editorial/editorial-workboard.json` for reserved or in-flight topics.
4. Remote `refine/*`, `content-audit/*`, `agentic/*`, and `daily-article/*` branches plus open PRs.
5. The target slug and the intended page type; synonyms do not justify a second page with the same intent.

## Execution rules

- Production runs must pass an explicit keyword: `python3 seo_agent_pro/agentic/run.py --keyword "..."`.
- The production workflow sets `SEO_AGENT_REQUIRE_EXPLICIT_KEYWORD=1`.
- The legacy daily schedule is disabled during the pilot. Manual legacy dispatch is reserved for an explicitly approved emergency run.
- No generation process may push `HEAD:main` directly. State and article changes travel through a branch and pull request.
- Workers must not modify the shared index or sitemap as part of parallel article work. The integration owner updates them after the batch is accepted.
- `SEO_AGENT_ALLOW_AUTO_PUBLISH` remains unset by default; evaluator approval is not a substitute for human review.

## Batch gates

The first pilot contains 10 reserved topics, executed in two groups of five. The team expands to 4, then 6–10 concurrent Workers only after the previous gate passes.

Every accepted article needs an audit, verified sources, a distinct intent, a real or explicitly waived image decision, metadata, valid internal links, and successful build, typecheck, performance, SEO, links, and whitespace checks. The final reviewer also checks the live page after deployment.

## Shared learning

Use the existing `cycle_log.json` and `lessons.md`; do not create a second memory system. Manus adds editorial lessons about intent and cannibalization. seo_agent_pro adds deterministic lessons about repeatable technical failures. A lesson is promoted to a hard rule only after review or repeated evidence.
