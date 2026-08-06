"""
Research & Intelligence Agent.

Phase-1 scope (see README): no live SERP/Search Console API key exists for
this project yet, so competitor analysis is LLM-knowledge-based, same as the
original analyze_competitors(). What this agent adds on top of that: it
pulls semantically related PAST cycles from long-term memory (Tier 3 of
memory_store) and surfaces what the critic said about them last time, so the
Strategy/Content agents aren't starting from zero on topics we've partially
covered before.

Wiring in a real SERP API (DataForSEO/SerpAPI) or Search Console later is a
drop-in replacement for `_llm_competitor_analysis()` — the rest of the graph
doesn't care where competitor_data came from.
"""

from __future__ import annotations

import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))  # agentic/
sys.path.insert(0, str(Path(__file__).resolve().parents[2]))  # seo_agent_pro/

from llm_router import call_json, c
from agentic import memory_store


def _step(label: str) -> None:
    print(f"\n{c('cyan', '▸')} {c('bold', 'Research Agent — ' + label)}")


def _llm_competitor_analysis(keyword: str, model: str) -> dict:
    system = (
        "You are a senior SEO analyst. Based on your knowledge of web content patterns, "
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
    return call_json(system, user, model)


def run(state: dict) -> dict:
    keyword = state["keyword"]
    model = state["active_model"]

    _step(keyword)
    competitor_data = _llm_competitor_analysis(keyword, model)

    past = memory_store.relevant_past_cycles(keyword, n=3)
    if past:
        print(c("dim", f"  · found {len(past)} related past cycle(s) in memory:"))
        for p in past:
            print(c("dim", f"    - \"{p.get('keyword')}\" (score {p.get('score')}, {p.get('final_status')})"))
        competitor_data["related_past_cycles"] = [
            {"keyword": p.get("keyword"), "issues_found_last_time": p.get("deterministic_issues", []) + p.get("llm_issues", [])}
            for p in past
        ]

    print(c("green", f"  ✓ {len(competitor_data.get('common_sections', []))} common sections, "
                      f"{len(competitor_data.get('missing_gaps', []))} content gaps identified"))

    return {"competitor_data": competitor_data}
