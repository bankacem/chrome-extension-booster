# Content Refinement Pipeline — Full-Site Report (2026-09-23)

Professional refinement of all 839 published articles using an objective
audit-first methodology plus TypeSafe (jev) model evaluation as a quality gate.

## Methodology (4-stage pipeline)

1. **Full objective audit** (`audit_all.py`) — scans every published article for
   measurable issues: dead internal links (validated against live sitemap + local
   slugs), malformed/nested markdown links, dangling anchors, structure signals
   (words, H2, tables, FAQ, verdict, /extension/ links, meta length).
2. **Conservative automated repair** (`mass_repair*.py`) — only mechanical,
   verifiable fixes; every reconstructed URL is validated against the live
   sitemap before it is kept, otherwise the link is dropped and text preserved.
3. **TypeSafe evaluation** (`typesafe_evaluate.py`, `typesafe_sample_eval.py`)
   — stratified sample scored on E-E-A-T signals, search-intent match,
   actionability, internal-linking quality. Full-batch runner included.
4. **Logical commits** — reviewable diffs per change theme.

## Results (before -> after)

| Metric                          | Before | After |
|---------------------------------|-------:|------:|
| Dead internal link instances    | 44     | 0     |
| Nested-bracket corrupted links  | 138    | 0     |
| Malformed/dangling anchors      | 197    | 0     |
| Articles with any structural issue | 160 | **0** |
| Articles linking /extension/ pages | 352 | 789   |
| "Companion Extensions" sections added | — | 437 |

Additional repairs: 2 corrupted featured images/headings, 22 split multi-line
button links (Learn More / Add to Chrome), 1 glued Table-of-Contents, several
off-topic internal links re-targeted (e.g. VLOOKUP article inside the calendar
guide, Samsung Internet guide inside a Chrome blocker article).

## Known remaining opportunities (documented, not auto-fixed)

- 336 articles under 1,500 words — need content expansion (LLM writing pass,
  not safe to automate blindly).
- 405 articles without comparison tables — require per-topic data research.
- 50 articles still without /extension/ links — mostly thin/short content;
  recommended to expand first, then add companions.
- 2 articles missing an FAQ section.

## How to re-run

```bash
# 1. audit
python3 scripts/content-pipeline/audit_all.py

# 2. structural repairs (idempotent; validates every slug against sitemap)
python3 scripts/content-pipeline/mass_repair.py
python3 scripts/content-pipeline/mass_repair_pass2.py
python3 scripts/content-pipeline/mass_repair_pass4.py

# 3. TypeSafe evaluation (set API key inside script)
python3 scripts/content-pipeline/typesafe_evaluate.py            # all 5 flagship
python3 scripts/content-pipeline/typesafe_sample_eval.py         # stratified sample
```

TypeSafe notes: model `jev-latest` via `POST https://api.typesafe.ai/v1/systemone`;
question types: `noul` (yes/no), `choice`, `score` (criteria-index 0..n-1 with
probability legend). Score values are indices into the `criteria` list — check
`probabilities` for the confidence distribution.
