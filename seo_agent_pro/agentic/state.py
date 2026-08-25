"""
Shared state that flows through every node of the LangGraph pipeline.

This is intentionally a plain TypedDict (not a class with methods) — LangGraph
merges partial updates into this dict at every node, so keeping it a flat,
serializable structure makes the whole run trivially loggable and resumable
(the state at any point is just JSON).
"""

from __future__ import annotations

from typing import TypedDict


class EvaluationResult(TypedDict, total=False):
    approved: bool
    score: int                      # 0-100
    deterministic_issues: list[str] # hard rule violations (regex/length checks)
    llm_issues: list[str]           # qualitative issues flagged by the critic model
    notes: str                      # one-paragraph human-readable summary


class GraphState(TypedDict, total=False):
    # ── inputs ──
    keyword: str
    niche: str
    articles_written: int           # from long-term memory, at run start

    # ── model routing ──
    model_chain: list[str]          # candidate models, in priority order
    active_model: str               # the one that actually worked this run

    # ── research agent output ──
    competitor_data: dict
    competitor_source: str
    competitor_count: int
    competitor_urls: list[str]

    # ── strategy agent output ──
    strategy: dict

    # ── content agent output ──
    raw_article: str                # includes the leading "# Title" line
    title: str
    body: str
    revision_count: int
    max_revisions: int

    # ── optimizer agent output ──
    seo_title: str | None
    meta_description: str
    category: str
    tags: list[str]
    internal_links_used: list[str]  # slugs actually linked to, for the learning agent

    # ── evaluator agent output ──
    evaluation: EvaluationResult
    evaluation_history: list[EvaluationResult]

    # ── learning agent output ──
    lessons_applied: list[str]      # which past lessons were injected into this run
    positive_patterns_applied: list[str]
    gaps_added_titles: list[str]

    # ── final ──
    final_status: str               # "published" | "needs_human_review" | "failed"
    errors: list[str]
