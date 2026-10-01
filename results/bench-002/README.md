# results/bench-002 — 10 topics x 2 arms (improved old line vs full engine)

Owner decision #4 (2026-10-01). Fairness frame:
- SAME LLM channel for every call: agents/llm_bridge.mjs -> z-ai builtin
  (glm-builtin, thinking disabled). Production model deepseek-v4-pro-0813
  NOT used (no CLEANAPIS key locally) — disclosed, not hidden.
- SAME word window 2550-3100 and the SAME deterministic gate set (gates.py,
  PR #450) measured on both arms' FINAL bodies.
- IMP arm = PR #450 code path verbatim (real SearXNG SERP + clamped strategy
  + section budgets + max_tokens ceiling + gates + <=2 targeted repairs).
- ENGINE arm = full agentic engine, same methodology as bench-001 arm C.
- 3 topics reused from bench-001 + 7 thinnest LIVE articles (reproducible
  pick: scripts/t24_pick_topics.py, near-dups of benched topics excluded).
- Costs are ESTIMATES (cleanapis catalog prices x char/4 heuristic). The
  runs executed on the builtin channel — no invoice corresponds to them.
- n=10 per arm: percentages are descriptive only; significance commented
  explicitly in the summary table, not implied.

The original "17 thin topics" list was lost with the wiped workspace; the
substitution rule above is deterministic and re-runnable.
