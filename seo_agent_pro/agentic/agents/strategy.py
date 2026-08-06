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
        "Given competitor analysis, decide the optimal content strategy."
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

    print(c("green", f"  ✓ {strategy.get('strategy','?').upper()} strategy, "
                      f"~{strategy.get('ideal_length','?')} words, angle: {strategy.get('unique_angle','?')}"))

    return {"strategy": strategy}
