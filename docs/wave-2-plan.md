# Wave 2 Plan — Body Honesty Remediation at Scale

Owner brief 2026-10-07 item 5. Docs-only; no content file is touched by this plan.

## Where we stand

- **Frontmatter is done.** All 199 `docs/frontmatter-claims-v2.json` rows now carry honest
  reader/SEO fields: batches 1–3 + #495 (30 slugs), batches 4–6 (#502/#503/#504, 60),
  batches 7–11 (#506–#510, 111). The two non-claims files touched by #495
  (`chrome-extension-development-guide`, `chrome-extension-disabled-after-update-guide`)
  were courtesy fixes and are not part of the claims corpus.
- **Bodies are next.** The remaining metadata problem lives in article bodies. Three
  prioritized pools follow, computed from `docs/claims-v3.json` (generated 2026-10-06,
  881-published corpus, zero model calls) and `docs/audit-worklist-v2.json`
  (the pure-S1 worklist, 2026-10-05). Counts are article-level and deduplicated by
  first-priority-wins, so every article appears in exactly one pool.

## Priority 1 — Articles with unattributed tables: **102 articles → 11 batches**

Source: `unattributed_table_cell` article hits in `docs/claims-v3.json` (102 articles carry
at least one measurement-style table cell with no source).

- Treatment: the formats already agreed in `docs/tables-plan.md` plus the 2026-10-07
  table rule — cells with >50% "Not independently tested" data cells become short
  bold-name + body-sentence lists (guard license `allowed_table_replacements`, shipped on
  the pilot branch); cells below that threshold move to the qualitative allow-list wording.
  Pools whose tables are already qualitative only need the disclaimer/`About this guide`
  pass.
- Gate battery per article: `body_neutralization_gate` with the marked-table licenses,
  fabrication S1/S2/S3 subset semantics, attribution and table-cell checks, FAQ byte-identity.
- Effort note: these are the heaviest edits (tables + surrounding prose), which is why
  they go first — the pilot (#501 branch) demonstrated 5 articles by hand and produced the
  reusable license + checklist.

## Priority 2 — Pure S1 (after removing P1 overlap): **148 articles → 15 batches**

Source: `docs/audit-worklist-v2.json` (209 pure-S1 articles); 61 of them also carry
unattributed tables, so they are absorbed into Priority 1.

- Treatment: the pilot-1 method (#494, 5 articles, hand-written): first-person testing
  anecdotes removed, "I tested / we tested / benchmarks" phrasing neutralized, methodology
  sections rebuilt as "About this guide", TOC anchors updated only for approved heading
  renames. Word-drop stayed 3.8–10.8% in the pilot, far under the 45% limit.
- The 6 S1-proposed patterns (PR #483) remain UNWIRED pending owner adjudication; if
  adopted mid-wave, the +180-additional-hit corpus from `scripts/s1_proposed_result.json`
  becomes a Priority 2.5 pool (est. ~180 articles, 18 batches) — decision needed before
  those batches are scheduled.

## Priority 3 — v3-pattern articles not in P1/P2: **162 articles → 17 batches**

Source: `docs/claims-v3.json` rows minus P1 and P2 (162 articles). Family distribution
within this pool: v3_my_noun 149, v3_i_have_seen 128, v3_prep_testing 127,
v3_extensive_testing 124, v3_i_recommend 119, v3_based_on_my 79, v3_testing_dozens 24,
attribution_number 5 (an article can carry several families).

- Treatment: lighter than P1/P2 — sentence-level removals of first-person ownership
  ("I recommend" → "We"), anecdotes, and unattributed entity+quantity sentences
  (`unattributed_gate` subset semantics must show no new hits). No table work, no
  heading renames expected.

## Totals

| Pool | Articles | Batches (10/batch) |
|---|---|---|
| P1 unattributed tables | 102 | 11 |
| P2 pure S1 (excl. P1) | 148 | 15 |
| P3 v3-only | 162 | 17 |
| **Total** | **412** | **43** |

The other 469 published articles carry none of the scanned families and are out of scope.

## Execution protocol per batch (same battery as the FM batches)

1. Branch `content/wave2-p<N>-batch<k>` off current `origin/main`.
2. Hand-written edits only (no model calls); expected-file list checked automatically
   before any merge; scope proof comment on the PR.
3. Gate battery per article (body + FM), plus live verification of up to 9 pages after
   each merge, and a before/after summary table in the report.
4. Cap: 10 articles per PR; self-merge authorization per the standing rules (docs, gates
   code, frontmatter batches) does NOT cover `public/content` bodies — each batch PR
   therefore waits for owner merge, unless the owner extends the delegation explicitly.

## Intersections worth remembering

- pure-S1 ∩ claims-v3 = 179 articles; pure-S1 ∩ tables = 61; the P1/P2/P3 split above
  already de-duplicates everything (102 + 148 + 162 = 412).
- All 8 attribution-number articles fall inside P1/P2/P3, so the pool totals need no
  separate attribution batch.
- Numbers will drift slightly as wave-1 pilots land (body edits remove hits); re-run the
  two scans before each session and re-shuffle membership, not the priority order.
