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

### 2026-08-28 — External session (Super Z, via user request)
- Added `gorouter-claude-opus-5` as a first-class provider (config.py + llm_router.py; key read from GOROUTER_KEY env only, never committed). Gateway lessons encoded in `_call_gorouter`: always-SSE wire (Cloudflare 524 kills quiet non-stream calls), internal 403 WAF retry, empty-choices chunk tolerance, max_tokens cap 6500.
- Fixed strategy.py: `manual_real_search` (SEO_AGENT_RESEARCH_FILE snapshots) had its competitor gaps silently stripped by the startswith("searxng") check — file-fed runs now keep them, matching the README's documented workflow.
- call_json gained a truncated-JSON bracket-completion repair (real failure: 1500-token research JSON cut mid-array).
- content.py prompt now requires a Key Takeaways block (featured-snippet targeting) and PAA-style FAQ questions.
- Ran the full 7-agent pipeline end-to-end with claude-opus-5: draft 1 was REJECTED by the evaluator (68/100, malformed ToC headings) and the approved revision (78/100) was published as `how-to-disable-chrome-extensions-on-specific-sites` (commit 81a544cb). First pipeline article written entirely through the new provider.
- NOTE: pipeline runs need python3.13 on this machine (langgraph is installed for the system 3.13, not the 3.12 venv that owns `python3`).

### 2026-08-20 — Manus session
- Re-pulled `main` and confirmed no existing branch claimed `ai-cover-letter-writer-chrome-extension`.
- Analyzed the article and official competitor sources; found the local article truncated at 446 body words with unsupported product claims and no keywords/internal links.
- Ran the existing Refiner Agent on a dedicated branch using a sandbox-only model connection, then performed a manual editorial rewrite to remove unsupported pricing, user-count, rating, and ATS-score claims, complete the article, add source-based metadata, privacy guidance, FAQ, and two relevant internal links.
- Local checks passed: lint, build, SEO smoke test (775 URLs), and internal-link smoke test (8,067 links, 0 redirect links, 6 documented exceptions).
- Current branch contains the article revision plus the required refinement tracking entries; no merge has been performed yet.

### 2026-08-15 — Claude session (this one)
- Adopted this protocol: merged PR #244 (`AGENT_HANDOFF.md` itself).
  Confirmed PR #243 (redundant audit script, flagged in the entry below)
  was already closed — no action needed there.
- Ran the checklist's step 3 (`git ls-remote --heads | grep refine/`) and
  found ~15 `refine/*` / `content-audit*` branches with **no open PR**.
  Did NOT delete any — `git merge-base --is-ancestor` is unreliable for
  branches merged with squash (no ancestor relationship survives), so
  "not merged" in that check does not reliably mean abandoned; several are
  almost certainly already squash-merged (e.g.
  `refine/internet-download-manager-extension`, referenced in the entry
  below as already merged with the real refiner agent). Needs a proper
  merged-content check (diff against main, not ancestry) before any
  cleanup — left for a future session or the person's explicit go-ahead.
- **New discovery, not previously documented here**: a separate automated
  system ("Jules") is also opening PRs against this repo, independent of
  any Claude session — currently ~15 open PRs from it (multilingual/i18n
  support, sitemap architecture changes, an "emergency hotfix" to the SEO
  sync pipeline, RLS bypass, article deduplication, and more). None of
  these were reviewed or actioned this session. This protocol's "check
  before building" step should probably extend to checking Jules' open
  PRs too, not just other Claude sessions' branches — worth the person's
  attention specifically, since several of these (RLS bypass, emergency
  hotfix, sitemap architecture) sound higher-risk than routine content
  work and shouldn't be merged without review.
- Also completed this session (before finding this protocol): merged 2
  refine batches (3 + 14 articles, the second one hand-separated from a
  stale/reverting PR #261), found and fixed 11 live articles with a
  markdown-link-inside-raw-HTML bug a previous session's cleanup pass
  missed, fixed the underlying max_tokens/self-link bugs in
  `refiner.py`/`llm_router.py`, and manually proofread 5 older articles
  for AI-cliché phrasing and a grammar error (no body rewrites).
- **Nothing left mid-flight.** No uncommitted changes, no article
  refinement in progress.

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

## Session log — 2026-08-31: pilot-batch-002-republish (main Super Z session)

- Environment reset twice mid-task; repo recloned from origin/main (469bcad). The earlier
  local-only commits (a5ae15f/a867a9d) were lost and fully reproduced from the briefs-first
  workflow; nothing was pushed before the reset, so no divergent history exists.
- Published 5 EN guides (pilot-batch-002): betterttv-google-chrome-guide,
  agenda-hero-chrome-extension-guide, blackbox-ai-chrome-extension-guide,
  chrome-web-store-firefox-extensions-guide, chrome-samsung-smart-tv-casting-guide.
- Pipeline: batch002_briefs.py -> batch002_generate.py (gorouter claude-opus-5, raw kept in
  scripts/raw_articles/) -> batch002_images.py (PIL featured+steps+tips, WebP; AVIF via
  optimize-images) -> batch002_index.py (index 769->774, sitemap 826->831) -> build gates.
- Learning persisted to memory/cycle_log.json (1 consolidated record) and memory/lessons.md
  ('pilot-batch-002-republish' section).
- These 5 slugs are now PUBLISHED — do not re-select them as candidates.
