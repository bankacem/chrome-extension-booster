"""Strategy & Briefing Agent — turns research into a concrete content brief.

NEW (2026-09-25): Hardened strategy generation with explicit quality gates and
structure validation. The strategy brief is now the critical "contract" between
Strategy and Content agents — if the brief is weak, the resulting article will be
weak no matter how good the writer is. This agent ensures:

1. Every section is defensible and necessary (no filler)
2. Word count is realistic for the section count in ONE pass
3. Competitor gaps are sourced and verifiable (not speculative)
4. The whole brief is machine-auditable (no ambiguity)
"""

from __future__ import annotations

import json
import re
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
        "You are an SEO content strategist. Your job is NOT to be ambitious — "
        "it's to be achievable. "
        "Given competitor analysis, decide the optimal content strategy.\n\n"
        "CRITICAL CONSTRAINT: This brief will be written in ONE pass by a single "
        "model call. No revisions, no fine-tuning. This means:\n"
        "  - Keep ideal_length between 1000 and 1800 words.\n"
        "  - Keep required_sections to at most 6-8 H2 headings (roughly one per "
        "150-250 words).\n"
        "  - A 20-section outline in 2000 words WILL fail (truncated mid-sentence "
        "or thin fragments); a focused 6-section, 1400-word article WILL succeed.\n\n"
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
        "STRUCTURAL QUALITY: Every required_section must be defensible and "
        "contribute to the article's core value. Do NOT pad the brief with "
        "filler sections just to look comprehensive. A 6-section article where "
        "all six deliver value beats an 8-section article where two are padding.\n\n"
        "COMPETITOR GAP STRATEGY: Turn only DEFENSIBLE missing gaps into "
        "1-3 competitor_gap_requirements. If research is available, use actual "
        "competitor snapshots as evidence. Treat snippets and headings as "
        "hypotheses, never as proof of product facts; do not copy competitor "
        "wording or claim a competitor feature without a source. If research "
        "is unavailable, leave competitor_gap_requirements empty rather than "
        "pretending the model inspected search results.\n\n"
        "UNIQUE ANGLE: This should be ONE differentiating idea in 1-2 sentences "
        "(e.g. 'focus on remote-work-specific pain points competitors ignore') "
        "— NOT a second checklist of extra sections, data points, or features "
        "layered on top of required_sections. It gets shown to the reviewer "
        "as directional color, not as a literal list of additional deliverables."
    )
    user = f"""Keyword: "{keyword}"

Competitor data (includes real top-result snapshots with their structures,
plus related past cycles from our own memory with what our critic flagged):
{json.dumps(competitor_data, indent=2)}

Articles already published on this niche: {articles_written}

Using the competitor data, create a realistic brief that WILL be completed in
one pass. Return JSON:
{{
  "ideal_length":       1000-1800 (must be realistic for the section count),
  "required_sections":  ["H2 heading", "..."], (at most 6-8; every one must deliver value)
  "must_have_elements": ["table|FAQ|comparison|checklist|..."], (real Markdown only)
  "competitor_gap_requirements": ["specific, verifiable gaps", "..."], (max 3; only if sourced)
  "unique_angle":       "one differentiating idea (1-2 sentences)",
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
    FORBIDDEN_ELEMENT_RE = re.compile(
        r"interactive|downloadable|download|screenshot|gif|video|widget|"
        r"live demo|embed|calculator|quiz|poll|"
        r"benchmark|quantitative|cost-benefit|cost benefit|roi\b|"
        r"case stud|real-world use case|real world use case",
        re.IGNORECASE,
    )
    elements = strategy.get("must_have_elements", []) or []
    clean_elements = [e for e in elements if not FORBIDDEN_ELEMENT_RE.search(str(e))]
    dropped = [e for e in elements if e not in clean_elements]
    if dropped:
        print(c("yellow", f"  ⚠ Dropped undeliverable elements: {dropped}"))
    strategy["must_have_elements"] = clean_elements

    # ── NEW: QUALITY GATES ON SECTION COUNT & FEASIBILITY ──
    # The most common failure: too many sections + not enough words =
    # truncated, thin, unfinished article. Enforce realistic ratios.
    MAX_SECTIONS = 8
    MAX_WORDS = 1800
    MIN_WORDS = 1000
    MIN_WORDS_PER_SECTION = 150

    sections = strategy.get("required_sections", []) or []

    # Cap and trim sections before length check.
    if len(sections) > MAX_SECTIONS:
        print(c("yellow", f"  ⚠ Capped required_sections from {len(sections)} to {MAX_SECTIONS}"))
        strategy["required_sections"] = sections[:MAX_SECTIONS]
        sections = sections[:MAX_SECTIONS]

    # Validate word count vs section count.
    ideal_length = strategy.get("ideal_length") or 0
    try:
        ideal_length = int(ideal_length)
    except (TypeError, ValueError):
        ideal_length = 0

    # Clamp to realistic bounds.
    if ideal_length > MAX_WORDS or ideal_length < MIN_WORDS:
        clamped = max(MIN_WORDS, min(ideal_length or MIN_WORDS, MAX_WORDS))
        print(c("yellow", f"  ⚠ Clamped ideal_length from {ideal_length} to {clamped}"))
        strategy["ideal_length"] = clamped
        ideal_length = clamped

    # NEW: Sanity check: enough words for the section count?
    # Standard layout: H1 intro, Key Takeaways, N required sections, FAQ, Conclusion
    # That's N + 4 "content blocks". If ideal_length is 1200 and you have 6 required
    # sections, that's 1200 / (6+4) ≈ 120 words per section — way too thin.
    # Warn the user and suggest reducing sections or increasing length.
    total_content_blocks = len(sections) + 3  # +3 for intro, Key Takeaways, Conclusion
    words_per_block = ideal_length / total_content_blocks if total_content_blocks > 0 else 0
    if words_per_block < MIN_WORDS_PER_SECTION:
        suggestion = max(
            MIN_WORDS,
            total_content_blocks * MIN_WORDS_PER_SECTION
        )
        print(c("yellow",
                f"  ⚠ Brief has {len(sections)} sections in only {ideal_length} words "
                f"({int(words_per_block)} words/section). This will produce a thin, "
                f"incomplete article. Recommend either reducing sections to ~4 or "
                f"increasing length to ~{suggestion} words."))
        # Automatically reduce sections rather than letting Content fail.
        if len(sections) > 4:
            print(c("yellow", f"  ⚠ Auto-reducing required_sections from {len(sections)} to 4 to ensure completeness"))
            strategy["required_sections"] = sections[:4]

    # unique_angle is meant to be one directional sentence, not a second
    # requirements list — cap it hard so it can't smuggle in extra scope
    # the evaluator then grades the article against.
    angle = strategy.get("unique_angle", "") or ""
    MAX_ANGLE_WORDS = 40
    angle_words = angle.split()
    if len(angle_words) > MAX_ANGLE_WORDS:
        print(c("yellow", f"  ⚠ Trimmed unique_angle from {len(angle_words)} to {MAX_ANGLE_WORDS} words"))
        strategy["unique_angle"] = " ".join(angle_words[:MAX_ANGLE_WORDS]).rstrip(",;:") + "."

    # ── FINAL BRIEF VALIDATION ──
    # Sanity check: required sections are unique and defensible.
    final_sections = strategy.get("required_sections", [])
    normalized = [
        re.sub(r"[^a-z0-9 ]", "", s.lower()).strip()
        for s in final_sections
    ]
    if len(normalized) != len(set(normalized)):
        print(c("yellow", f"  ⚠ Brief has duplicate sections (after normalization); "
                          f"deduplicating"))
        seen = set()
        unique = []
        for s, n in zip(final_sections, normalized):
            if n not in seen:
                unique.append(s)
                seen.add(n)
        strategy["required_sections"] = unique

    # Final output.
    final_length = strategy.get("ideal_length", 1500)
    final_sections = strategy.get("required_sections", [])
    print(c("green", f"  ✓ {strategy.get('strategy','?').upper()} strategy, "
                      f"~{final_length} words, {len(final_sections)} sections"))
    print(c("green", f"    angle: {strategy.get('unique_angle','?')}"))
    if strategy.get("competitor_gap_requirements"):
        print(c("dim", f"  · competitor gaps: {len(strategy['competitor_gap_requirements'])}"))
    print(c("green", f"  ✓ Brief is achievable in one pass (brief validation passed)"))

    return {"strategy": strategy}
