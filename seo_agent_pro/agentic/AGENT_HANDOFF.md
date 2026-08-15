# Agent Handoff Protocol — Read This First

The person running this project switches between separate Claude sessions
over time (a session ends when free messages run out; a new one picks up
later). Each session is a different "agent" with no memory of what other
sessions did. Without a shared protocol, two sessions can build duplicate
tools, refine the same article twice in conflicting ways, or push
conflicting branches — which is exactly the failure mode this file exists
to prevent.

**If you are a Claude session starting work on this repo: read this entire
file before writing any code, and follow the checklist below before
touching any article or agent file.**

## Before doing ANY work, in this order

1. `git pull origin main` — a previous session may have merged work since
   your clone. Do not trust a repo state you cloned earlier in the same
   conversation; re-pull if meaningful time has passed.
2. Read `seo_agent_pro/agentic/memory/refined_articles.json` — every slug
   listed there has already been refined and merged. Never re-select one of
   these as a "needs refinement" candidate.
3. Run `git ls-remote --heads origin | grep -E "refine/|content-audit"` —
   if a branch already exists for the article slug you're about to work on,
   STOP. Someone (another session, or an automation) already claimed it.
   Pick a different article or check whether that branch is stale/abandoned
   before touching the same slug.
4. Check whether the tool you're about to build already exists. Current
   inventory (as of this writing):
   - `seo_agent_pro/agentic/agents/research.py` — competitor/keyword research (7-agent pipeline)
   - `seo_agent_pro/agentic/agents/strategy.py`, `content.py`, `optimizer.py`, `evaluator.py`, `image_agent.py`, `learning.py` — the original 7-agent new-article pipeline, orchestrated by `seo_agent_pro/agentic/graph.py`
   - `seo_agent_pro/agentic/agents/refiner.py` — **the 8th agent**: refines an EXISTING published article (fixes metadata + closes one competitor gap via an appended section). Does NOT rewrite existing content.
   - `seo_agent_pro/agentic/refine_articles.py` — standalone metadata-only fixer (proofread mode, no body rewrite)
   - `seo_agent_pro/agentic/refine_run.py` — entry point that runs the refiner agent end-to-end on one article
   - `seo_agent_pro/agentic/memory/refined_articles.json` — the tracking log (append-only list of refined slugs)
   - `.github/workflows/refine-articles.yml` — automation trigger
   - **If a tool already covers what you're about to build, use/extend it. Do not create a parallel version.** If you genuinely believe the existing tool is wrong or incomplete, fix it with `str_replace` and explain why in the commit message — don't fork it.

## While working

- Never push directly to `main`. Always work on a new branch, open a PR,
  and let the person review before merge.
- Branch naming convention already in use: `refine/<article-slug>` for
  single-article refinement work, `feat/<short-description>` for new
  tooling, `content-audit/<phase-name>` for audit-script work.
- Confirm the specific article (with its live URL and repo path) with the
  person **before** starting refinement work — this is a standing
  preference, not a one-time request.
- When refinement of an article is complete and merged, add its slug to
  `refined_articles.json` in the same PR — don't leave that step for later.

## After finishing a work session

Append a short entry to the **Session Log** below (newest entry on top).
Keep it factual and specific: what was touched, what decision was made and
why, what's left undone. The next session should be able to read only this
log and know exactly where things stand without re-reading the whole repo.

---

## Session Log

### 2026-08-11 — Session A
- Built `seo_agent_pro/agentic/audit_articles.py`: a zero-LLM diagnostic
  script reusing `evaluator._deterministic_checks()` against all published
  articles, ranked by issue count. Fixed 3 false positives found live
  during testing (HTML CTA blocks, button text, and markdown emphasis
  markers all broke the truncation check, which was written for raw
  Markdown drafts, not published HTML output). Also found a genuine,
  previously-undetected issue: a batch of `chatgpt-*`/`ai-*` articles
  published with leftover LLM-generation artifacts visible to readers
  (e.g. "Article length: ~1600 words... Ready to copy-paste into your
  CMS.") — added a dedicated check for this pattern.
- Opened PR #243 for this script **before discovering that
  `refine_articles.py` (metadata fixer) and `agents/refiner.py` (the real
  8th agent, gap-analysis + append, LLM-driven) already existed on `main`**
  — these were merged by a separate session after this session's initial
  clone. Recommended closing PR #243 as functionally redundant, pending
  the person's confirmation.
- Selected `internet-download-manager-extension` as a refinement candidate
  using a now-stale audit snapshot; discovered mid-conversation (via the
  person manually comparing the live page) that this article had *already*
  been refined by another session's run of the real `refiner.py` agent
  (merged to `main`, word count 279 → 2145, tracked in
  `refined_articles.json`). No refinement work was actually done by this
  session on any article body.
- **Outcome**: this file (`AGENT_HANDOFF.md`) created as the fix for the
  root cause — sessions weren't re-pulling `main` or checking for existing
  tooling/branches before starting work.
- **Open decision for the person**: confirm whether to close PR #243.
- **Nothing left mid-flight**: no article refinement in progress, no
  uncommitted changes.
