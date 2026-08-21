"""
Learning & Memory Agent.

Runs once per full graph execution (after the evaluation loop settles, pass
or fail). Two jobs:

1. Append a record to cycle_log.json — the permanent, factual history of
   every run (Tier 1 memory). This is what relevant_past_cycles() searches
   and what articles_written_count() counts.

2. Turn deterministic Evaluator failures into permanent lessons. LLM
   qualitative issues ("the intro is a bit generic") are logged for the
   record but NOT auto-promoted into lessons.md — they're too
   context-specific and noisy to safely generalize without a human reading
   them first. Deterministic issues ARE promoted automatically because
   they're already phrased as reusable rules (that's what made them checkable
   by regex/lookup in the first place).
"""

from __future__ import annotations

import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))
from llm_router import c
from agentic import memory_store


def _step(label: str) -> None:
    print(f"\n{c('cyan', '▸')} {c('bold', 'Learning Agent — ' + label)}")


def run(state: dict) -> dict:
    _step("Recording cycle")

    evaluation = state.get("evaluation", {})
    deterministic_issues = evaluation.get("deterministic_issues", [])
    llm_issues = evaluation.get("llm_issues", [])
    keyword = state.get("keyword", "")
    score = evaluation.get("score", 0)
    previous = memory_store.previous_cycles_for_keyword(keyword, limit=5)
    previous_scores = [p.get("score") for p in previous if isinstance(p.get("score"), (int, float))]
    score_delta = score - previous_scores[-1] if previous_scores and isinstance(score, (int, float)) else None

    new_lessons = []
    for issue in deterministic_issues:
        # Generalize the specific instance into a reusable rule rather than
        # storing the one-off text verbatim (e.g. "Title tag is 86 chars"
        # becomes a lesson about keeping title tags under budget, not a
        # record of this one article's exact length).
        if "title tag is" in issue.lower():
            lesson = "Keep the full <title> tag (seo_title or title, plus \" | ExtensionTo\") at or under 60 characters — write a short seo_title if the natural title is longer."
        elif "placeholder link" in issue.lower():
            lesson = "Never leave a '#' placeholder as a link target — either link to a real existing page or don't make it a link."
        elif "placeholder image" in issue.lower():
            lesson = "Never include an image with a placeholder/fake src — omit the image entirely if no real URL is available."
        elif "non-existent article" in issue.lower():
            lesson = "Internal links must point at slugs that actually exist in articles-index.json — verify before linking."
        elif "meta_description" in issue.lower() and "..." in issue:
            lesson = "meta_description must be a complete sentence — never let it end mid-sentence with '...'."
        elif "meta_description" in issue.lower():
            lesson = "meta_description must be 120-160 characters — not shorter, not longer."
        else:
            lesson = issue  # fallback: store as-is if we don't have a generalization rule for it

        if memory_store.add_lesson_if_new(lesson):
            new_lessons.append(lesson)

    if new_lessons:
        print(c("yellow", f"  + {len(new_lessons)} new lesson(s) added to lessons.md:"))
        for l in new_lessons:
            print(c("yellow", f"    - {l}"))
    else:
        print(c("dim", "  · no new lessons (nothing novel, or draft was clean)"))

    final_status = state.get("final_status", "failed")
    positive_patterns: list[str] = []
    if evaluation.get("approved") and not deterministic_issues and isinstance(score, (int, float)) and score >= 80:
        if state.get("competitor_source", "").startswith("searxng") and state.get("competitor_count", 0) >= 3:
            positive_patterns.append("When real top-three competitor snapshots are available, use their structural gaps as hypotheses and cover one or two defensible gaps without copying wording or inventing product facts.")
        if state.get("internal_links_used"):
            positive_patterns.append("Prefer a small number of natural internal links selected from the published index over broad or invented linking.")
        if state.get("gaps_added_titles"):
            positive_patterns.append("A focused competitor-gap section should add practical information absent from the current article and stop when no genuine gap remains.")
        if score_delta is not None and score_delta > 0:
            positive_patterns.append("Keep revision feedback specific and measurable; a positive score delta for the same keyword is evidence that the correction improved the draft.")

    new_patterns = [p for p in positive_patterns if memory_store.add_positive_pattern_if_new(p)]
    if new_patterns:
        print(c("yellow", f"  + {len(new_patterns)} positive pattern(s) added to lessons.md"))

    memory_store.append_cycle({
        "keyword": keyword,
        "model": state.get("active_model"),
        "revision_count": state.get("revision_count", 0),
        "score": score,
        "score_delta_from_previous_same_keyword": score_delta,
        "approved": evaluation.get("approved", False),
        "deterministic_issues": deterministic_issues,
        "llm_issues": llm_issues,
        "category": state.get("category"),
        "final_status": final_status,
        "competitor_source": state.get("competitor_source", "llm_estimate"),
        "competitor_count": state.get("competitor_count", 0),
        "competitor_urls": state.get("competitor_urls", []),
        "gaps_added_titles": state.get("gaps_added_titles", []),
        "word_count": state.get("word_count", 0),
        "new_lessons": new_lessons,
        "new_positive_patterns": new_patterns,
    })
    print(c("green", f"  ✓ cycle recorded (status: {final_status}, score delta: {score_delta})"))

    return {"lessons_applied": new_lessons, "positive_patterns_applied": new_patterns}
