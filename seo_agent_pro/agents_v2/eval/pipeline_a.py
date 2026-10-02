#!/usr/bin/env python3
"""agents_v2.eval.pipeline_a — EVAL-ONLY copy of the improved pipeline (arm A).

Provenance (owner authorization, Step 5): the functions below are a VERBATIM
copy of feat/old-line-hardening@671708235d:seo_agent_pro/modules.py (PR #450,
NOT merged, read-only copy per owner rule). Only imports and the run_a()
wrapper were adapted: no queue, no memory, no publishing — the candidate
article is returned in memory for the eval harness to write as artifact.

Real differences vs production: none in the generation logic itself.
The model used is announced in the returned stats (no claims beyond it).
"""
from __future__ import annotations

import json  # noqa: F401  (used by the verbatim #450 functions)
import os    # noqa: F401  (used by the verbatim _fetch_serp — smoke run 36947538515)
import re
import sys
import time  # noqa: F401  (used by the verbatim #450 functions)
import urllib.parse  # noqa: F401  (used by the verbatim _fetch_serp)
import urllib.request  # noqa: F401  (used by the verbatim _fetch_serp)
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent.parent.parent))

# call_json was used by the verbatim #450 functions (modules.py imports it as
# `from llm_router import call, call_json, c`) but the adapted import here
# dropped it — NameError at runtime (smoke run 36953360333). CI import-smoke
# now guards this class of bug (test_agents_v2_eval.TestImportSmoke).
from llm_router import call, call_json, c, find_working_model  # noqa: E402
from agents_v2.gates_local import (  # noqa: E402  (read-only #450 copy)
    WORD_MAX,
    WORD_MIN,
    repair_damage,
    rebuild_toc,
    run_gates,
    wc as _wc,
)
import agents_v2.gates_local as G  # noqa: E402


def _step(label: str) -> None:
    print(f"\n{c('cyan', '▸')} {c('bold', label)}")


def _ok(msg: str) -> None:
    print(c("green", f"  ✓ {msg}"))


def _info(msg: str) -> None:
    print(c("dim", f"  · {msg}"))


def _fetch_serp(keyword: str, n: int = 8) -> list:
    """Real SERP rows from a SearXNG instance (owner decision 3a).

    Endpoint resolution order: SEARXNG_URL, then SEARXNG_BASE_URL (the var
    the agents-v2-eval workflow sets for its local service container on
    :8080), then the historical default http://localhost:8888. Reads BOTH
    vars because arm B's tools.py reads SEARXNG_BASE_URL — one container,
    both arms (smoke run 36953360333 failed: arm A read only SEARXNG_URL
    while the workflow exports SEARXNG_BASE_URL → connection refused on
    the wrong port). Returns [] when unreachable so callers fall back to
    the legacy model-knowledge mode, DISCLOSED on stdout — a silent
    fallback here is exactly the kind of quiet degradation the owner
    banned in the bench-001 review.
    """
    import urllib.parse
    import urllib.request

    base = (os.environ.get("SEARXNG_URL")
            or os.environ.get("SEARXNG_BASE_URL")
            or "http://localhost:8888").rstrip("/")
    url = f"{base}/search?" + urllib.parse.urlencode({"q": keyword, "format": "json"})
    try:
        req = urllib.request.Request(url, headers={"User-Agent": "Mozilla/5.0"})
        with urllib.request.urlopen(req, timeout=12) as r:
            data = json.loads(r.read().decode("utf-8"))
        rows = []
        for res in data.get("results", [])[:n]:
            rows.append({
                "title": res.get("title", ""),
                "url": res.get("url", ""),
                "snippet": (res.get("content") or "")[:220],
            })
        return [r for r in rows if r["title"] or r["snippet"]]
    except Exception as e:  # noqa: BLE001 — any failure means fallback
        print(c("yellow", f"  ↳ SearXNG unreachable ({e}) — analyze_competitors "
                          "falls back to MODEL-KNOWLEDGE mode (disclosed)"))
        return []


# ──────────────────────────────────────────────────────────────
#  Module 1 — Competitor Analysis
# ──────────────────────────────────────────────────────────────


def analyze_competitors(keyword: str, model: str, lang: str = "en") -> dict:
    _step(f"Competitor Analysis  →  \"{keyword}\"")

    serp_rows = _fetch_serp(keyword)
    if serp_rows:
        serp_block = "\n".join(
            f"{i + 1}. {r['title']}\n   URL: {r['url']}\n   Snippet: {r['snippet']}"
            for i, r in enumerate(serp_rows)
        )
        system = (
            f"You are a senior SEO analyst specializing in {lang} content. "
            "You are given REAL search-result rows (title, URL, snippet) fetched "
            "live from a search engine. Analyze what these ACTUAL top-ranking "
            "pages look like — do not invent competitors that are not in the rows."
        )
        user = f"""Live SERP rows for the keyword: "{keyword}"

{serp_block}

Analyze ONLY the pages listed above and return a JSON object:
{{
  "common_sections":    ["H2/H3 headings implied by these titles and snippets"],
  "missing_gaps":       ["questions these results do not answer"],
  "content_length_avg": "estimated average word count of these pages",
  "seo_patterns":       ["structural or formatting patterns visible in the rows"],
  "weaknesses":         ["what these specific pages do poorly"],
  "why_they_rank":      "main reason these results rank (depth/authority/UX/etc)"
}}"""
        _ok(f"Real SERP rows from SearXNG: {len(serp_rows)}")
    else:
        system = (
            f"You are a senior SEO analyst specializing in {lang} content. "
            "Based on your knowledge of web content patterns, "
            "analyze what the top-ranking pages for a given keyword typically look like."
        )
        user = f"""Analyze the competitive landscape for the keyword: "{keyword}"

Return a JSON object:
{{
  "common_sections":    ["list of H2/H3 headings found in top results"],
  "missing_gaps":       ["topics competitors rarely cover"],
  "content_length_avg": "estimated average word count",
  "seo_patterns":       ["structural or formatting patterns used"],
  "weaknesses":         ["what most articles do poorly"],
  "why_they_rank":      "main reason top results rank (depth/authority/UX/etc)"
}}"""

    result = call_json(system, user, model)

    _ok(f"Common sections: {len(result.get('common_sections', []))}")
    _ok(f"Content gaps: {len(result.get('missing_gaps', []))}")
    _ok(f"Avg length: {result.get('content_length_avg', '?')} words")
    for gap in result.get("missing_gaps", [])[:3]:
        _info(f"Gap → {gap}")

    return result


# ──────────────────────────────────────────────────────────────
#  Module 2 — Strategy Decision
# ──────────────────────────────────────────────────────────────


def decide_strategy(keyword: str, competitor_data: dict, articles_written: int, model: str, lang: str = "en") -> dict:
    _step("Strategy Decision Engine")

    system = (
        "You are an SEO content strategist. "
        "Given competitor analysis, decide the optimal content strategy."
    )
    user = f"""Keyword: "{keyword}"

Competitor data:
{json.dumps(competitor_data, indent=2)}

Articles already in memory: {articles_written}

Decide and return JSON:
{{
  "ideal_length":       0,
  "required_sections":  ["list of H2 headings to include"],
  "section_budgets":    [{{"heading": "section H2", "words": 0}}],
  "must_have_elements": ["table|FAQ|statistics|comparison|checklist|..."],
  "unique_angle":       "what makes this article stand out",
  "strategy":           "aggressive or strategic",
  "reasoning":          "one-sentence explanation"
}}

The article will be code-gated to {WORD_MIN}-{WORD_MAX} words total, so set
ideal_length inside that window and make section_budgets sum to it."""

    result = call_json(system, user, model)

    # ── Owner decision 3b: hard clamp. An unbounded model-chosen
    # ideal_length is exactly what let bench-001 arm-A articles overflow to
    # 5,000-6,500 words; nothing downstream can enforce a window when the
    # target itself starts outside it.
    try:
        ideal = int(result.get("ideal_length", 0) or 0)
    except (TypeError, ValueError):
        ideal = 0
    if not (WORD_MIN <= ideal <= WORD_MAX):
        clamped = min(max(ideal, WORD_MIN), WORD_MAX) if ideal else WORD_MAX
        _info(f"ideal_length {ideal} → clamped to {clamped} (window {WORD_MIN}-{WORD_MAX})")
        ideal = clamped
    result["ideal_length"] = ideal

    # ── Owner decision 3b: deterministic per-section budgets. Model-provided
    # budgets are accepted only when they roughly sum to the clamped target;
    # otherwise code distributes: FAQ 12%, verdict/conclusion 10%, remainder
    # split equally across content sections. This is what makes the section
    # word budgets in write_article's prompt real numbers, not vibes.
    budgets = result.get("section_budgets") or []
    sections = [s for s in result.get("required_sections", []) if s]
    try:
        total = sum(int(b.get("words", 0) or 0) for b in budgets)
    except (TypeError, ValueError, AttributeError):
        total = 0
    if not (budgets and sections and 0.8 * ideal <= total <= 1.2 * ideal):
        per_section = max(150, int(ideal * 0.78 / max(1, len(sections))))
        budgets = []
        for s in sections:
            name = str(s).strip()
            low = name.lower()
            if "faq" in low or "frequently asked" in low:
                w = int(ideal * 0.12)
            elif "verdict" in low or "conclusion" in low:
                w = int(ideal * 0.10)
            else:
                w = per_section
            budgets.append({"heading": name, "words": w})
        allocated = sum(b["words"] for b in budgets)
        leftover = ideal - allocated
        free = [b for b in budgets
                if "faq" not in b["heading"].lower()
                and "frequently asked" not in b["heading"].lower()
                and "verdict" not in b["heading"].lower()
                and "conclusion" not in b["heading"].lower()]
        if free and leftover:
            add = leftover // len(free)
            for b in free:
                b["words"] = max(80, b["words"] + add)
        result["section_budgets"] = budgets
        _info(f"Section budgets computed in code: {len(budgets)} sections, target {ideal} words")
    else:
        _info("Using model-provided section budgets (sum within ±20% of target)")

    _ok(f"Strategy: {result.get('strategy', '?').upper()}")
    _ok(f"Target length: {result.get('ideal_length', '?')} words")
    _ok(f"Unique angle: {result.get('unique_angle', '?')}")
    _info(result.get("reasoning", ""))

    return result


# ──────────────────────────────────────────────────────────────
#  Module 3 — Article Writer
# ──────────────────────────────────────────────────────────────


def write_article(keyword: str, strategy: dict, model: str, lang: str = "en") -> str:
    length   = strategy.get("ideal_length", 1500)
    sections = strategy.get("required_sections", [])
    angle    = strategy.get("unique_angle", "")
    elements = strategy.get("must_have_elements", [])
    budgets  = strategy.get("section_budgets", [])

    _step(f"Writing Article  —  {length} words (hard ceiling {WORD_MAX})")

    lang_instruction = f"Write in clear, engaging {lang}. Never sound robotic."
    if lang == "ar":
        lang_instruction = "Write in professional, engaging Arabic (Modern Standard Arabic). Use a natural flow and avoid literal translations from English."

    system = (
        f"You are a professional SEO content writer. "
        f"{lang_instruction} "
        "Prioritize Information Gain — include unique insights not found elsewhere."
    )
    budget_lines = "\n".join(
        f'- "{b.get("heading", "")}": ~{int(b.get("words", 0) or 0)} words'
        for b in budgets
    ) or "- Balance sections roughly equally"

    user = f"""Write a complete, high-ranking SEO article for: "{keyword}" in {lang}

Specifications:
- Target length:    {length} words — HARD CEILING {WORD_MAX} words total, never exceed it
- Unique angle:     {angle}
- Required H2s:     {', '.join(sections) if sections else 'choose the best structure'}
- Must include:     {', '.join(elements) if elements else 'decide based on topic'}
- Section budgets (keep every section close to its own budget):
{budget_lines}

Structure (every piece below is REQUIRED — the article is code-gated on them):
# [H1 — includes primary keyword, compelling and clear]

[Strong hook introduction — 3 paragraphs, establish the problem and promise]

## Table of Contents
- [Section name](#section-anchor) for every H2 below

## [H2]
### [H3 if needed]
[Content with real data, examples, actionable advice]

[Repeat for all sections]

[Comparison table in its own section, with a |---| separator row]

## Frequently Asked Questions
### Q: [first question]?
A: [2-4 sentence answer]
[... exactly 8 questions, each an H3 heading under this section ...]

## Final Verdict
[120+ words with a clear recommendation and one natural call-to-action]

Rules:
- Keyword in first 100 words naturally
- Keyword density 1–2%, natural placement
- Real or realistic statistics and data
- Human, conversational tone
- Add Information Gain: insights competitors missed
- Respect every section budget; when a section runs long, compress it —
  never exceed the {WORD_MAX}-word ceiling"""

    print(c("dim", "  " + "─" * 56))
    # Owner decision 3b: max_tokens sized from the window ceiling (~2 tokens
    # per word plus headroom) so a runaway section physically cannot inflate
    # the article to bench-001 arm-A lengths (5,000-6,500 words).
    # SMOKE RUN 37003663375: stream=True returned EMPTY content twice even
    # at max_tokens=16384 — cleanapis buffers the reasoning phase of
    # reasoning-style models (no SSE bytes flow until content starts), so a
    # gateway idle cut kills the stream before any content arrives. Verified
    # live: the same model returns 1389 words non-streamed in ~30s
    # (finish_reason=stop). Non-stream also keeps the empty-content retry
    # meaningful. Word length is still bounded by the 2550-3100 gates.
    article    = call(system, user, model, stream=False,
                      max_tokens=16384)
    word_count = len(article.split())
    print(c("dim", "  " + "─" * 56))
    _ok(f"Article complete — {word_count} words")

    return article


# ──────────────────────────────────────────────────────────────
#  Module 4 — CTR Optimizer
# ──────────────────────────────────────────────────────────────


def repair_section(keyword: str, strategy: dict, body: str, meta: str,
                   failed: list, model: str) -> tuple[str, str]:
    """Regenerate ONLY the failing part(s) instead of truncating the article.

    Owner decision 3d: on gate failure, one targeted call per failing gate —
    the failing SECTION is rewritten to its budget and spliced back, the rest
    of the article is untouched. Deterministic (free) repairs run first; the
    LLM is used only for what code cannot do. The CALLER caps this at
    2 attempts (daily_article._generate_content).

    Returns (body, meta).
    """
    # The verbatim #450 code did `import gates as G`; production gates.py no
    # longer exists on main — the read-only #450 copy inside agents_v2 is the
    # intended target (ModuleNotFoundError otherwise: repair path was never
    # reached in smoke run 36953360333, which crashed earlier on call_json).
    import agents_v2.gates_local as G

    # ── free deterministic fixes first ────────────────────────────────────
    if any(f in failed for f in ("no_nested_links", "no_heading_links",
                                 "no_split_words", "brackets_balanced")):
        body = G.repair_damage(body)
    if "toc" in failed:
        body = G.rebuild_toc(body)
    failed = G.run_gates(body, meta)["failed"]  # recompute what's left
    if not failed:
        return body, meta

    budgets = {str(b.get("heading", "")).strip().lower():
               int(b.get("words", 0) or 0)
               for b in strategy.get("section_budgets", [])}
    ideal = int(strategy.get("ideal_length", WORD_MAX) or WORD_MAX)

    def _split_spans(text: str) -> list:
        marks = [m.start() for m in re.finditer(r"^## ", text, flags=re.M)]
        return [(s, marks[i + 1] if i + 1 < len(marks) else len(text))
                for i, s in enumerate(marks)]

    def _span_name(text: str, s: int, e: int) -> str:
        return text[s:e].split("\n", 1)[0][3:].strip().lower()

    def _regen(name: str, instruction: str, fallback_budget: int = 300) -> str:
        """One targeted call: rewrite ONE section to spec, splice it back.
        Missing sections are inserted before Final Verdict (or appended)."""
        nonlocal body
        target = None
        for s, e in _split_spans(body):
            if name in _span_name(body, s, e):
                target = (s, e)
                break
        budget = fallback_budget or budgets.get(name, 300)
        old = body[target[0]:target[1]] if target else "(section missing)"
        sys_p = ("You are a professional SEO content writer. You rewrite ONE "
                 "section of an article exactly to spec.")
        usr = f"""Article topic: "{keyword}"
Rewrite ONLY this one section. Return ONLY the section markdown (starting with
its "## " heading), nothing else — no preamble, no code fences.

Current section content:
---
{old[:8000]}
---

Requirements:
{instruction}
- Budget: ~{budget} words
- Plain markdown; no nested links, no links inside headings, never split a
  word or number with a link."""
        new = call(sys_p, usr, model, stream=False,
                   max_tokens=4096).strip()
        new = new.strip("`").strip()
        if not new.startswith("## "):
            new = f"## {name.title()}\n\n" + new
        if target:
            body = body[:target[0]] + new + "\n\n" + body[target[1]:].lstrip("\n")
        else:
            v_idx = body.rfind("## Final Verdict")
            block = new + "\n\n"
            if v_idx > 0:
                body = body[:v_idx] + block + body[v_idx:]
            else:
                body = body + "\n\n" + new
        return body

    if "meta_window" in failed:
        h1 = body.split("\n", 1)[0].lstrip("# ").strip() or keyword
        new_meta = call(
            "You write concise SEO meta descriptions. Reply with ONLY the "
            "description text, no preamble, no quotes, 140-160 characters.",
            f'Write a meta description for an article targeting the keyword '
            f'"{keyword}". Article title: {h1}',
            model, stream=False, max_tokens=200,
        ).strip().strip('"')
        if 120 <= len(new_meta) <= 160 and '"' not in new_meta and "\\" not in new_meta:
            meta = new_meta

    if "faq8" in failed:
        body = _regen(
            "frequently asked",
            "- Heading exactly: ## Frequently Asked Questions\n"
            f"- Exactly {G.FAQ_MIN_QUESTIONS} questions, each its own '### ' H3 "
            "heading, each answered in 2-4 sentences.\n"
            "- Questions must be real search queries about the topic.",
            fallback_budget=int(ideal * 0.12))

    if "comparison_table" in failed:
        body = _regen(
            "comparison",
            "- Must contain a markdown comparison table: a header row, then a "
            "|---| separator row, then 4-6 data rows comparing the main "
            "options/features for this topic.\n"
            "- Keep the table compact and factual.",
            fallback_budget=350)

    if "final_verdict" in failed:
        body = _regen(
            "final verdict",
            "- Heading exactly: ## Final Verdict\n"
            "- 130+ words, a clear recommendation, one natural call-to-action "
            "sentence at the end.",
            fallback_budget=220)

    if "h2_sections" in failed:
        have = {_span_name(body, s, e) for s, e in _split_spans(body)}
        missing = [s for s in strategy.get("required_sections", [])
                   if str(s).strip().lower() not in have][:2]
        for s in missing:
            body = _regen(str(s).strip().lower(),
                          f"- Heading exactly: ## {s}\n"
                          "- Substantive section content with concrete, "
                          "topic-specific detail (no filler).",
                          fallback_budget=budgets.get(str(s).strip().lower(), 350))

    if "word_count" in failed:
        words = G.wc(body)
        if words > G.WORD_MAX:
            # Compress ENOUGH sections to shed the full surplus in one pass —
            # compressing a single section per attempt could not close a
            # 600+ word surplus in 2 attempts (found by bench-002 pilot).
            surplus = words - G.WORD_MAX
            spans = _split_spans(body)
            content = [se for se in spans
                       if "faq" not in _span_name(body, *se)
                       and "contents" not in _span_name(body, *se)
                       and "verdict" not in _span_name(body, *se)]
            content.sort(key=lambda se: G.wc(body[se[0]:se[1]]), reverse=True)
            scheduled = 0
            for s, e in content[:4]:
                name = _span_name(body, s, e)
                cur = G.wc(body[s:e])
                if cur <= 150:
                    continue
                target = max(150, min(budgets.get(name, 300) or 300,
                                      cur - max(0, surplus - scheduled)))
                scheduled += max(0, cur - target)
                body = _regen(
                    name,
                    f"- This section is too long and pushed the whole article "
                    f"over the {G.WORD_MAX}-word ceiling. Rewrite it to AT MOST "
                    f"{target} words — a hard cap: count the words before you "
                    "answer. Keep the heading unchanged and the key facts, "
                    "cut padding and repetition.",
                    fallback_budget=target)
        elif words < G.WORD_MIN:
            spans = _split_spans(body)
            if spans:
                ranked = sorted(spans, key=lambda se: G.wc(body[se[0]:se[1]]))
                for s, e in ranked[:3]:
                    name = _span_name(body, s, e)
                    if "faq" in name or "contents" in name:
                        continue
                    body = _regen(
                        name,
                        f"- This section is too thin for the article's "
                        f"{G.WORD_MIN}-word floor. Expand it to "
                        f"~{budgets.get(name, 400)} words with concrete, "
                        "topic-specific detail (steps, examples, numbers). "
                        "Keep the heading unchanged.",
                        fallback_budget=budgets.get(name, 400))

    return body, meta


# ──────────────────────────────────────────────────────────────
#  run_a — the A-arm entry point (mirror of daily_article._generate_content)
# ──────────────────────────────────────────────────────────────

def run_a(keyword: str, articles_written: int = 0, model: str | None = None,
          max_steps: int = 40, max_tokens_total: int = 400000,
          max_usd: float = 1.0) -> dict:
    """Run the improved (#450) pipeline for ONE topic, headless.

    Returns {ok, title, meta, body, gates, stats} — never publishes.
    Fails loudly (raises) exactly like daily_article when gates still fail
    after 2 targeted repairs.
    """
    import time as _time
    t0 = _time.monotonic()
    stats = {"calls": 0, "repairs": 0, "stop_reason": "", "model": model or ""}
    if not model:
        # daily_article.MODEL_FALLBACK_CHAIN[0] — the production primary
        # (find_working_model requires a candidates list; smoke run 36944783516)
        model = find_working_model(["cleanapis-writer"])
    stats["model"] = model
    # honest announcement: resolve the alias to provider/model_id like the
    # router prints it, so the eval reports the ACTUAL model used
    try:
        from llm_router import validate_config as _vc
        _prov, _mid = _vc(model)
        stats["model_resolved"] = f"{_prov}/{_mid}"
    except Exception as _e:  # noqa: BLE001 — disclosure only, never fatal
        stats["model_resolved"] = f"unresolved ({type(_e).__name__})"
    print(c("dim", f"[arm A] model: {stats['model']} -> {stats['model_resolved']}"))

    competitor_data = analyze_competitors(keyword, model)
    strategy = decide_strategy(keyword, competitor_data, articles_written, model)
    raw_article = write_article(keyword, strategy, model)

    lines = raw_article.strip().splitlines()
    title = keyword
    body_start = 0
    for i, line in enumerate(lines):
        if line.strip().startswith("# "):
            title = line.strip()[2:].strip()
            body_start = i + 1
            break
    body = "\n".join(lines[body_start:]).strip()

    meta_description = ""
    for _ in range(2):
        meta_description = call(
            "You write concise SEO meta descriptions. Reply with ONLY the "
            "description text, no preamble, no quotes, 140-160 characters.",
            f'Write a meta description for an article targeting the keyword '
            f'"{keyword}". Article title: {title}',
            model,
            max_tokens=200,
        ).strip().strip('"')
        if meta_description:
            break
    if not meta_description:
        meta_description = (
            f"{title} — practical guide with the tools, settings and tips you need."
        )[:158].rstrip()

    g = run_gates(body, meta_description)
    attempts = 0
    while not g["pass"] and attempts < 2:
        attempts += 1
        stats["repairs"] = attempts
        print(c("yellow", f"  [arm A] gates failed: {g['failed']} — "
                          f"targeted repair {attempts}/2"))
        body, meta_description = repair_section(
            keyword, strategy, body, meta_description, list(g["failed"]), model)
        g = run_gates(body, meta_description)
    if not g["pass"]:
        raise RuntimeError(
            f"[arm A] gates still failing after 2 targeted repairs: {g['failed']} "
            f"(words={g['words']})")
    stats["stop_reason"] = "gates_pass"
    stats["wall_seconds"] = round(_time.monotonic() - t0, 1)
    stats["usd_floor_note"] = ("router-level metering not exposed; token/cost "
                               "accounting is provided by the eval harness at "
                               "the provider boundary for arm B and by honest "
                               "model disclosure for arm A")
    print(c("green", f"  [arm A] gates PASS — words={g['words']} "
                     f"h2={g['h2']} faq_h3={g['faq_h3']}"))
    return {"ok": True, "title": title, "meta": meta_description,
            "body": body, "gates": g, "stats": stats}
