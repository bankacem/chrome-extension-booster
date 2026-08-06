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
    memory_store.append_cycle({
        "keyword": state.get("keyword"),
        "model": state.get("active_model"),
        "revision_count": state.get("revision_count", 0),
        "score": evaluation.get("score", 0),
        "approved": evaluation.get("approved", False),
        "deterministic_issues": deterministic_issues,
        "llm_issues": evaluation.get("llm_issues", []),
        "category": state.get("category"),
        "final_status": final_status,
    })
    print(c("green", f"  ✓ cycle recorded (status: {final_status})"))

    return {"lessons_applied": new_lessons}
