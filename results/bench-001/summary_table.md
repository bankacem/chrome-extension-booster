# bench-001 — 3-arm real-code comparison (3 topics)

Arms: **A** = real `daily_article._generate_content()` verbatim · **B** = A + production gates + 1 targeted retry (no search, no critic) · **C** = full agentic engine (research loop + planner + writer + gates + critic revision + links + meta + claim fact-check).

**Model disclosure:** every call in ALL arms went through the SAME `agents/llm_bridge.mjs` channel — z-ai SDK builtin model (reported as `glm-builtin`, thinking disabled), because no CLEANAPIS key exists in the workspace. Production articles are written by `deepseek-v4-pro-0813` via cleanapis.com in GitHub Actions — a DIFFERENT model.

**Cost column = ESTIMATE ONLY** (cleanapis catalog prices × char/4 token heuristic; the runs actually executed on the builtin channel, so no cleanapis invoice corresponds to them). Token counts are char/4 estimates, not API usage stats.

Gates (identical set for all arms): word window 2550-3100, H2>=6, comparison table, meta 120-160, no nested/heading links, no split words, brackets balanced.

| topic | arm | words | gates fail (v1) | H2 | table | FAQ h3 | verdict | links | LLM calls | search | in_tok(est) | out_tok(est) | cost USD (EST) | seconds |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| chatgpt | A | 6533 | - | 8 | yes | 0 | 0 | 0 | 5 | 0 | 1410 | 13261 | 0.0227 | 142.2 |
| chatgpt | B | 3068 | comparison_table | 9 | NO | 0 | 1220 | 0 | 6 | 0 | 5682 | 17483 | 0.0321 | 171.9 |
| chatgpt | C | 3221 | - | 11 | yes | 0 | 3087 | 6 | 18 | 7 | 49618 | 36939 | 0.1690 | 290.1 |
| screenshot | A | 5061 | - | 16 | yes | 0 | 0 | 0 | 5 | 0 | 1265 | 9463 | 0.0164 | 113.3 |
| screenshot | B | 1887 | word_count | 9 | yes | 0 | 739 | 0 | 6 | 0 | 5725 | 12996 | 0.0247 | 132.6 |
| screenshot | C | 2731 | - | 9 | yes | 5 | 1412 | 6 | 15 | 10 | 35205 | 18979 | 0.1127 | 170.2 |
| redirect | A | 5954 | - | 9 | yes | 0 | 0 | 0 | 5 | 0 | 1394 | 11578 | 0.0199 | 137.1 |
| redirect | B | 2873 | none (PASS) | 9 | yes | 8 | 1178 | 0 | 6 | 0 | 5967 | 17096 | 0.0316 | 182.0 |
| redirect | C | 2669 | - | 9 | yes | 0 | 1893 | 6 | 16 | 4 | 47775 | 26699 | 0.1372 | 264.0 |

Blind pairs built from these runs are in PR #449 (`ab-review/pair1_*`, `pair2_*`). The mapping key is **not** in this repository; its sha256 fingerprints are pinned in the #449 comment (issuecomment-5927878313, salt published alongside).

Committed: 2026-10-01T08:43:19Z · base origin/main 0bb8ed493ac6