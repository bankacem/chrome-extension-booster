"""Strategy & Briefing Agent — turns research into a concrete content brief."""

from __future__ import annotations

import json
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[2]))
from llm_router import call_json, c


def _step(label: str) -> None:
    print(f"\n{c('cyan', '▸')} {c('bold', 'Strategy Agent — ' + label)}")


def run(state: dict) -> dict:
    keyword = state["keyword"]
    model = state["active_model"]
    competitor_data = state.get("competitor_data", {})
    articles_written = state.get("articles_written", 0)

    _step("Briefing")

    system = (
        "You are an SEO content strategist. "
        "Given competitor analysis, decide the optimal content strategy.\n\n"
        "IMPORTANT CONSTRAINT: the output is a static Markdown article — no "
        "JavaScript, no interactivity, no downloadable files, no real "
        "screenshots or GIFs (the writer cannot capture or host images). "
        "Only request must_have_elements that a plain Markdown document can "
        "actually contain: table, FAQ, numbered/bulleted comparison, "
        "checklist, step-by-step instructions, pros/cons list. Do NOT request "
        "'interactive' anything, downloadable PDFs/cheat sheets, embedded "
        "screenshots/GIFs, or live widgets — asking for these forces the "
        "writer to fabricate fake evidence of features that don't exist, "
        "which has caused real published-content problems before.\n\n"
        "SAME REASON, ALSO FORBIDDEN: quantitative benchmarks (CPU/memory "
        "numbers), cost-benefit/ROI calculations, and named case studies. "
        "This pipeline has no way to actually run performance tests or "
        "source real case-study data, so asking for them produces the "
        "same fabrication failure mode — invented numbers presented as "
        "measured data. Qualitative comparisons (Low/Medium/High, general "
        "pros/cons) are fine; specific invented figures are not.\n\n"
        "SIZE CONSTRAINT (equally important — a brief this pipeline has "
        "actually failed to deliver on before): this is written in a "
        "single pass by one model call, including smaller/faster models. "
        "Keep ideal_length between 1000 and 1800 words, and "
        "required_sections to at most 6-8 H2 headings — roughly one "
        "section per 150-250 words. A brief asking for 20+ sections in "
        "2000 words is not achievable in one pass: the writer either cuts "
        "the article short (truncated mid-sentence) or thins every "
        "section down to a fragment. A focused 6-section, 1400-word "
        "article that's actually complete beats an ambitious 20-section "
        "outline that never gets finished.\n\n"
        "When real competitor research is available, use the top-five snapshots as evidence. "
        "Turn only defensible missing gaps into 1-3 competitor_gap_requirements. "
        "Treat snippets and headings as hypotheses, never as proof of product facts; "
        "do not copy competitor wording or claim a competitor feature without a source. "
        "If research is unavailable, leave competitor_gap_requirements empty rather "
        "than pretending the model inspected search results.\n\n"
        "unique_angle should be ONE differentiating idea in 1-2 sentences "
        "(e.g. 'focus on remote-work-specific pain points competitors "
        "ignore') — not a second checklist of extra sections, data "
        "points, or features layered on top of required_sections. It "
        "gets shown to the reviewer as directional color, not as a "
        "literal list of additional deliverables to grade against."
    )
    user = f"""Keyword: "{keyword}"

Competitor data (includes any related past cycles from our own memory, with
what our critic flagged on them last time — avoid repeating those issues):
{json.dumps(competitor_data, indent=2)}

Articles already published: {articles_written}

Decide and return JSON:
{{
  "ideal_length":       0,
  "required_sections":  ["list of H2 headings to include"],
  "must_have_elements": ["table|FAQ|statistics|comparison|checklist|..."],
  "competitor_gap_requirements": ["specific, verifiable gaps to cover; max 3"],
  "unique_angle":       "what makes this article stand out",
  "strategy":           "aggressive or strategic",
  "reasoning":          "one-sentence explanation"
}}"""

    strategy = call_json(system, user, model, max_tokens=2400)

    # Keep competitor gaps explicit and bounded so Content can cover them
    # deliberately without turning every model speculation into a hard claim.
    raw_gaps = strategy.get("competitor_gap_requirements", []) or []
    if not isinstance(raw_gaps, list):
        raw_gaps = []
    # "manual_real_search" (SEO_AGENT_RESEARCH_FILE snapshots) is REAL
    # evidence too — it was audited by a human before the run — so it must
    # enable competitor_gap_requirements exactly like SearXNG results do.
    # The old startswith("searxng") check silently stripped every gap from
    # file-fed runs, contradicting the README's documented file workflow.
    real_research = str(competitor_data.get("research_source", "")).startswith(("searxng", "manual_real_search"))
    if not real_research:
        raw_gaps = []
    strategy["competitor_gap_requirements"] = [str(g).strip() for g in raw_gaps[:3] if str(g).strip()]

    # Defense in depth: don't just trust the prompt — deterministically
    # strip any element the model asked for anyway that a static Markdown
    # article can't deliver, instead of letting Content fabricate it.
    FORBIDDEN_ELEMENT_RE = __import__("re").compile(
        r"interactive|downloadable|download|screenshot|gif|video|widget|"
        r"live demo|embed|calculator|quiz|poll|"
        r"benchmark|quantitative|cost-benefit|cost benefit|roi\b|"
        r"case stud|real-world use case|real world use case",
        __import__("re").IGNORECASE,
    )
    elements = strategy.get("must_have_elements", []) or []
    clean_elements = [e for e in elements if not FORBIDDEN_ELEMENT_RE.search(str(e))]
    dropped = [e for e in elements if e not in clean_elements]
    if dropped:
        print(c("yellow", f"  ⚠ Dropped undeliverable elements: {dropped}"))
    strategy["must_have_elements"] = clean_elements

    # Defense in depth again: cap ideal_length and required_sections
    # deterministically, regardless of whether the model followed the
    # size guidance above. This is what actually caused the previous
    # failure (30/100, truncated at ~450 words against a 20-section/
    # 2100-word brief) — the model just couldn't finish, so it stopped
    # mid-sentence. Capping here guarantees every future brief is
    # achievable in one pass, no matter which model is active.
    MAX_SECTIONS = 8
    MAX_WORDS = 1800
    MIN_WORDS = 1000

    sections = strategy.get("required_sections", []) or []
    if len(sections) > MAX_SECTIONS:
        print(c("yellow", f"  ⚠ Capped required_sections from {len(sections)} to {MAX_SECTIONS}"))
        strategy["required_sections"] = sections[:MAX_SECTIONS]

    ideal_length = strategy.get("ideal_length") or 0
    try:
        ideal_length = int(ideal_length)
    except (TypeError, ValueError):
        ideal_length = 0
    if ideal_length > MAX_WORDS or ideal_length < MIN_WORDS:
        clamped = max(MIN_WORDS, min(ideal_length or MIN_WORDS, MAX_WORDS))
        print(c("yellow", f"  ⚠ Clamped ideal_length from {ideal_length} to {clamped}"))
        strategy["ideal_length"] = clamped

    # unique_angle is meant to be one directional sentence, not a second
    # requirements list — cap it hard so it can't smuggle in extra scope
    # the evaluator then grades the article against.
    angle = strategy.get("unique_angle", "") or ""
    MAX_ANGLE_WORDS = 40
    angle_words = angle.split()
    if len(angle_words) > MAX_ANGLE_WORDS:
        print(c("yellow", f"  ⚠ Trimmed unique_angle from {len(angle_words)} to {MAX_ANGLE_WORDS} words"))
        strategy["unique_angle"] = " ".join(angle_words[:MAX_ANGLE_WORDS]).rstrip(",;:") + "."

    print(c("green", f"  ✓ {strategy.get('strategy','?').upper()} strategy, "
                      f"~{strategy.get('ideal_length','?')} words, angle: {strategy.get('unique_angle','?')}"))
    if strategy.get("competitor_gap_requirements"):
        print(c("dim", f"  · competitor gaps selected: {len(strategy['competitor_gap_requirements'])}"))

    return {"strategy": strategy}
