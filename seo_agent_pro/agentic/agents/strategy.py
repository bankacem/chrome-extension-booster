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
        "which has caused real published-content problems before."
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
  "unique_angle":       "what makes this article stand out",
  "strategy":           "aggressive or strategic",
  "reasoning":          "one-sentence explanation"
}}"""

    strategy = call_json(system, user, model)

    # Defense in depth: don't just trust the prompt — deterministically
    # strip any element the model asked for anyway that a static Markdown
    # article can't deliver, instead of letting Content fabricate it.
    FORBIDDEN_ELEMENT_RE = __import__("re").compile(
        r"interactive|downloadable|download|screenshot|gif|video|widget|"
        r"live demo|embed|calculator|quiz|poll",
        __import__("re").IGNORECASE,
    )
    elements = strategy.get("must_have_elements", []) or []
    clean_elements = [e for e in elements if not FORBIDDEN_ELEMENT_RE.search(str(e))]
    dropped = [e for e in elements if e not in clean_elements]
    if dropped:
        print(c("yellow", f"  ⚠ Dropped undeliverable elements: {dropped}"))
    strategy["must_have_elements"] = clean_elements

    print(c("green", f"  ✓ {strategy.get('strategy','?').upper()} strategy, "
                      f"~{strategy.get('ideal_length','?')} words, angle: {strategy.get('unique_angle','?')}"))

    return {"strategy": strategy}
