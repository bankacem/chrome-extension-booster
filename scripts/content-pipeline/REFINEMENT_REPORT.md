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

---

# Phase 2 — Gap Closure & Leak Cleanup (2026-09-23)

Follow-up run closing the items documented under "Known remaining opportunities",
plus a template leak discovered and fixed repo-wide.

## Actions

| Action | Files | Detail |
|--------|------:|--------|
| Decision-factor tables | 50 | Top sitemap-priority articles with no table; category-aware rows (privacy/security/performance/screenshot/reader/download/productivity/generic); honest guidance cells, no fabricated metrics |
| Companion Extensions sections | 50 | The remaining articles with zero /extension/ links (coverage now 839/839); reuses mass_repair.companion_block |
| FAQ sections | 2 | privacy-security-guide, youtube-tools-guide; 4 Q&A each with verified internal links |
| `{topic}` template leak | 163 | "A good {topic} setup ..." sentence leaked from INTRO_VARIANTS; replaced with clean wording repo-wide |
| Broken table openers | 12 | Titles with "?"/listicle format broke the seeded opener sentence; replaced with title-free variants |
| updated_at bumps | 263 | Every genuinely changed file |

## Post-run audit (audit_all.py)

| Metric | Before Phase 2 | After Phase 2 |
|--------|--------------:|--------------:|
| Structural issues | 0 | 0 |
| Dead internal links | 0 | 0 |
| Articles without /extension/ links | 50 | **0** |
| Articles without FAQ | 2 | **0** |
| Articles without tables | 405 | 355 |
| Articles under 1,500 words | 336 | **314** |
| bad_meta_len | 2 | 2 (audit regex false positives on `>-` folded blocks; real lengths 135/149 chars — valid) |

New tooling: `build_queues.py` (sitemap-priority gap queues), `refine_gaps.py`
(phase-2 content additions), `fix_leaks.py` (repo-wide template leak cleanup).

Remaining (Phase 3 candidates): 355 articles without tables (long-tail, lower
priority), 314 articles under 1,500 words (need an LLM writing pass, not safe
to automate blindly), full-corpus TypeSafe scoring (in progress).

---

# Phase 3 — Audit-Driven Targeted Fixes (2026-09-23)

Full-corpus TypeSafe scoring (jev-1.13.0, one call/article, 839/839 ok, 153s):

| Dimension | Corpus mean (0-2) | weak | average | excellent |
|-----------|------------------:|-----:|--------:|----------:|
| search_intent_match | 0.93 | 245 | 425 | 169 |
| actionable_value | 1.25 | 140 | 303 | 396 |
| internal_linking_quality | 1.00 | 251 | 345 | 243 |
| readability | 1.38 | 22 | 313 | 504 |
| **composite** | **1.14** | 58 | 539 | 242 |

Score rises with length: <800w=1.04, 800-1500w=0.99, 1500-3000w=1.35, 3000w+=1.17.

Fixes applied: 37 Related-Guides blocks (weakest linking), 20 title+intro
upgrades (worst intent match; replaces AI-boilerplate intros carrying
off-topic links; fixes 3 empty `title:` fields). Re-audit of touched
articles: mean delta +0.013 (within model variance), top gainer +0.31,
weakest articles improved most.

Remaining opportunities: 60 repo-published articles not yet in the live
sitemap; off-topic links inside headings/body deeper than intro; 314 short
articles; 355 long-tail articles without tables.
