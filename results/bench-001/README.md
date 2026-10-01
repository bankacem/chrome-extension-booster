# results/bench-001 — durable measurement outputs

Owner decision (2026-10-01): every measurement output must live on a remote
branch, not only in the (frequently wiped) local workspace.

## Contents
- `summary.json` / `summary_table.md` — the 3-arm × 3-topic comparison (model disclosure + EST cost caveat inside).
- `runs/<slug>/arm_{a,b,c}/` — full per-run artifacts: body.md, metrics.json, calls.jsonl, trace.jsonl, meta.txt, gate1.json, plan.json, research.json, rubric_history.json, fact_check_claims.json, fact_summary.json, agent_log.txt.
- `factcheck_448/` — the 19-claim manual fact-check of PR #448 (posted as issuecomment-5927151871).
- `searxng_bench.json` — SearXNG vs z-ai search quality on 5 standard queries.
- `scripts/` — the exact runner scripts that produced the numbers.

## Deliberately NOT here
- `blind_key_LOCAL_ONLY.json` (pair → arm mapping). Blinding stays intact.
  Its tamper-evidence is the sha256 fingerprint pinned in the
  [PR #449 comment](https://github.com/bankacem/chrome-extension-booster/pull/449#issuecomment-5927878313).

## Honesty notes
- Cost figures are catalog-price ESTIMATES; runs executed on the builtin z-ai channel.
- All three arms shared one model channel (z-ai builtin GLM) — NOT the production model (cleanapis deepseek-v4-pro-0813).
- n=3 per arm: directional only, no percentages claimed.
