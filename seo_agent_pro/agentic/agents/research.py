"""
Research & Intelligence Agent.

Uses real web search (SearXNG, see agentic/web_search.py — no API key, no
per-query billing) when available. The workflow starts an ephemeral SearXNG
instance for the job; if that's not configured (e.g. running locally) or a
query fails, this falls back to the original LLM-knowledge-based analysis
rather than blocking the run.

This agent also pulls semantically related PAST cycles from long-term
memory (Tier 3 of memory_store) and surfaces what the critic said about
them last time, so the Strategy/Content agents aren't starting from zero on
topics we've partially covered before.
"""

from __future__ import annotations

import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))  # agentic/
sys.path.insert(0, str(Path(__file__).resolve().parents[2]))  # seo_agent_pro/

from llm_router import call_json, c
from agentic import memory_store
from agentic import web_search


def _step(label: str) -> None:
    print(f"\n{c('cyan', '▸')} {c('bold', 'Research Agent — ' + label)}")


def _llm_competitor_analysis(keyword: str, model: str, research: dict | None) -> dict:
    if research:
        sources_block = "\n".join(
            f'- "{r["title"]}" — {r["url"]}\n  {r["snippet"][:200]}'
            for r in research["top_results"] if r.get("url")
        )
        system = (
            "You are a senior SEO analyst. You are given REAL search results for "
            "a keyword. Base your analysis on this actual data, not general assumptions."
        )
        user = f"""Analyze the competitive landscape for the keyword: "{keyword}"

Real search results (titles, URLs, snippets) for this keyword:
{sources_block}

Return a JSON object:
{{
  "common_sections":    ["H2/H3 headings likely used, inferred from these real titles/snippets"],
  "missing_gaps":       ["topics these real results rarely cover"],
  "content_length_avg": "estimated average word count",
  "seo_patterns":       ["structural or formatting patterns used"],
  "weaknesses":         ["what most of these real results do poorly"],
  "why_they_rank":      "main reason these results rank (depth/authority/UX/etc)"
}}"""
        result = call_json(system, user, model)
        result["research_source"] = "searxng"
        return result

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
    result = call_json(system, user, model)
    result["research_source"] = "llm_estimate"
    return result


def run(state: dict) -> dict:
    keyword = state["keyword"]
    model = state["active_model"]

    _step(keyword)

    research = web_search.research_keyword(keyword)
    if research:
        print(c("green", f"  ✓ real search data found: {len(research['top_results'])} pages (SearXNG)"))
    else:
        print(c("dim", "  · no real search data available (SearXNG not configured or query "
                        "failed) — falling back to model-estimated analysis"))

    competitor_data = _llm_competitor_analysis(keyword, model, research)

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
