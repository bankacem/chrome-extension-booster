"""
SEO Agent Pro — Core pipeline modules.
Each module is a pure function: takes inputs, calls the LLM, returns data.
"""

import json
import os
import re

from llm_router import call, call_json, c

# Owner decisions 3b/3c (2026-10-01): word window + budgets shared with
# gates.py so the strategy, the prompt ceiling and the gates cannot drift.
from gates import WORD_MIN, WORD_MAX, wc as _wc


# ──────────────────────────────────────────────────────────────
#  Helpers
# ──────────────────────────────────────────────────────────────

def _step(label: str) -> None:
    print(f"\n{c('cyan', '▸')} {c('bold', label)}")

def _ok(msg: str) -> None:
    print(c("green", f"  ✓ {msg}"))

def _info(msg: str) -> None:
    print(c("dim", f"  · {msg}"))


def _fetch_serp(keyword: str, n: int = 8) -> list:
    """Real SERP rows from a SearXNG instance (owner decision 3a).

    SEARXNG_URL env overrides the endpoint (default http://localhost:8888 —
    the same local instance used in the bench-001 search-quality test and
    the CI service-container plan). Returns [] when unreachable so callers
    fall back to the legacy model-knowledge mode, DISCLOSED on stdout —
    a silent fallback here is exactly the kind of quiet degradation the
    owner banned in the bench-001 review.
    """
    import urllib.parse
    import urllib.request

    base = os.environ.get("SEARXNG_URL", "http://localhost:8888").rstrip("/")
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
    article    = call(system, user, model, stream=True,
                      max_tokens=min(8192, int(WORD_MAX * 2)))
    word_count = len(article.split())
    print(c("dim", "  " + "─" * 56))
    _ok(f"Article complete — {word_count} words")

    return article


# ──────────────────────────────────────────────────────────────
#  Module 4 — CTR Optimizer
# ──────────────────────────────────────────────────────────────

def optimize_ctr(keyword: str, article_snippet: str, model: str, lang: str = "en") -> dict:
    _step("CTR Optimization  —  Title & Meta Description")

    system = "You are a search CTR specialist. Write titles and descriptions that maximize click-through rate."
    user   = f"""Keyword: "{keyword}"

Article opening (first 600 chars):
{article_snippet[:600]}

Generate 3 options each. Return JSON:
{{
  "titles": ["max 60 chars each"],
  "descriptions": ["max 155 chars each"],
  "recommended_title": "",
  "recommended_description": ""
}}

Rules for titles:
- Include the keyword
- Use numbers when natural
- Power words: Proven, Complete, Best, Guide, Step-by-Step
- Trigger curiosity without clickbait

Rules for descriptions:
- Include keyword naturally
- State the value clearly
- End with a soft call to action"""

    result = call_json(system, user, model)

    _ok(f"Title:       {result.get('recommended_title', '')}")
    _ok(f"Description: {result.get('recommended_description', '')}")

    return result


# ──────────────────────────────────────────────────────────────
#  Module 5 — Keyword Cluster Builder  (V3)
# ──────────────────────────────────────────────────────────────

def build_cluster(keyword: str, niche: str, model: str, lang: str = "en") -> dict:
    _step(f"Keyword Cluster Map  —  Niche: {niche or 'auto-detect'}")

    system = "You are a keyword architecture expert. Build comprehensive topic clusters for SEO authority."
    user   = f"""Build a complete keyword cluster for: "{keyword}"
Niche: {niche or 'detect from keyword'}

Return JSON:
{{
  "pillar": {{
    "keyword":    "main keyword",
    "intent":     "informational|commercial|navigational",
    "word_count": 0,
    "title":      "suggested H1 title"
  }},
  "clusters": [
    {{
      "keyword":          "",
      "type":             "informational|commercial|navigational",
      "priority":         "high|medium|low",
      "estimated_volume": "high|medium|low",
      "title":            "suggested article title"
    }}
  ],
  "long_tail":           ["list of long-tail keyword variants"],
  "internal_link_map": {{
    "pillar_to_clusters": ["cluster keywords to link from pillar"],
    "cluster_to_cluster": ["cross-linking suggestions"]
  }},
  "quick_wins":          ["low-competition, high-intent keywords"],
  "authority_path":      "recommended publishing order summary"
}}"""

    result = call_json(system, user, model)

    total  = len(result.get("clusters", []))
    high   = [x for x in result.get("clusters", []) if x.get("priority") == "high"]

    _ok(f"Pillar:       {result.get('pillar', {}).get('keyword', '')}")
    _ok(f"Clusters:     {total} topics")
    _ok(f"High priority: {len(high)}")
    _ok(f"Long-tail:    {len(result.get('long_tail', []))}")
    _ok(f"Quick wins:   {len(result.get('quick_wins', []))}")
    for item in high[:3]:
        _info(f"[HIGH] {item.get('keyword', '')}  ({item.get('type', '')})")

    return result


# ──────────────────────────────────────────────────────────────
#  Module 6 — Content Calendar  (V3)
# ──────────────────────────────────────────────────────────────

def build_calendar(keyword: str, niche: str, months: int, model: str, lang: str = "en") -> list:
    _step(f"Content Calendar  —  {months} months")

    system = "You are a strategic content planner. Build data-driven publishing calendars for SEO growth."
    user   = f"""Build a {months}-month content calendar.
Niche: {niche or 'detect from keyword'}
Seed keyword: {keyword}
Publishing frequency: 3 articles/week

Structure per month:
- Week 1:   Pillar article (2000+ words)
- Week 2–3: Cluster articles (1000–1500 words)
- Week 4:   Long-tail + FAQ articles (800+ words)

Return a JSON array (one object per article):
[
  {{
    "month":      1,
    "week":       1,
    "title":      "",
    "keyword":    "",
    "type":       "pillar|cluster|long-tail",
    "word_count": 0,
    "intent":     "informational|commercial|navigational",
    "priority":   "P1|P2|P3",
    "links_to":   ["keywords this article should link to"]
  }}
]"""

    result = call_json(system, user, model)

    if isinstance(result, list):
        pillar     = sum(1 for a in result if a.get("type") == "pillar")
        commercial = sum(1 for a in result if a.get("intent") == "commercial")
        _ok(f"Total articles:   {len(result)}")
        _ok(f"Pillar articles:  {pillar}")
        _ok(f"Commercial intent: {commercial}")
        for item in result[:3]:
            _info(f"Month {item.get('month')} / Week {item.get('week')}: {item.get('title', '')[:55]}")

    return result if isinstance(result, list) else []


# ──────────────────────────────────────────────────────────────
#  Module 7 — Topical Authority Score  (V3)
# ──────────────────────────────────────────────────────────────

def score_authority(niche: str, articles_written: list, model: str, lang: str = "en") -> dict:
    _step("Topical Authority Score")

    titles = [a.get("keyword", "") for a in articles_written[-20:]]

    system = "You are an SEO authority analyst. Assess topical coverage and provide actionable gaps."
    user   = f"""Niche: "{niche}"
Articles written so far:
{json.dumps(titles, indent=2)}

Assess topical authority and return JSON:
{{
  "authority_score": 0,
  "coverage_pct":    "0%",
  "strong_areas":    ["topics well covered"],
  "weak_areas":      ["topics needing more content"],
  "next_3_articles": ["most impactful articles to write next"],
  "estimated_weeks_to_authority": 0
}}"""

    result = call_json(system, user, model)

    _ok(f"Authority score:  {result.get('authority_score', 0)} / 100")
    _ok(f"Coverage:         {result.get('coverage_pct', '0%')}")
    _ok(f"ETA to authority: {result.get('estimated_weeks_to_authority', '?')} weeks")
    for a in result.get("next_3_articles", [])[:3]:
        _info(f"Write next → {a}")

    return result


# ──────────────────────────────────────────────────────────────
#  Module 8 — Targeted section repair  (owner decision 3d)
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
    import gates as G

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
        budget = budgets.get(name, fallback_budget) or fallback_budget
        old = body[target[0]:target[1]] if target else "(section missing)"
        sys_p = ("You are a professional SEO content writer. You rewrite ONE "
                 "section of an article exactly to spec.")
        usr = f"""Article topic: "{keyword}"
Rewrite ONLY this one section. Return ONLY the section markdown (starting with
its "## " heading), nothing else — no preamble, no code fences.

Current section content:
---
{old[:4000]}
---

Requirements:
{instruction}
- Budget: ~{budget} words
- Plain markdown; no nested links, no links inside headings, never split a
  word or number with a link."""
        new = call(sys_p, usr, model, stream=True,
                   max_tokens=min(4096, int(budget * 3))).strip()
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
            spans = _split_spans(body)
            if spans:
                s, e = max(spans, key=lambda se: G.wc(body[se[0]:se[1]]))
                name = _span_name(body, s, e)
                body = _regen(
                    name,
                    "- This section is far too long and pushed the whole "
                    f"article over the {G.WORD_MAX}-word ceiling. Compress it "
                    f"to ~{budgets.get(name, 300)} words, keep the heading "
                    "unchanged, keep its key facts, cut padding.",
                    fallback_budget=budgets.get(name, 300))
        elif words < G.WORD_MIN:
            spans = _split_spans(body)
            if spans:
                ranked = sorted(spans, key=lambda se: G.wc(body[se[0]:se[1]]))
                for s, e in ranked[:2]:
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
