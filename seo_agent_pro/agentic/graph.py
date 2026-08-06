"""
Orchestrator — the LangGraph StateGraph that wires the seven agents into the
plan → execute → verify → correct loop described in the design doc.

    research → strategy → content → optimize → evaluate ─┬─→ approved
                             ▲                            │     │
                             └────────────────────────────┘     ▼
                                revisions              generate_image
                                                                  │
                                exhausted ────────────────────┐  │
                                                                ▼  ▼
                                                              learning → END

Only `content → optimize → evaluate` repeats on rejection (not research/
strategy) — the brief doesn't need to be redone just because the title tag
was too long; only the draft does.
"""

from __future__ import annotations

import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))
sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

from langgraph.graph import StateGraph, END

from state import GraphState
from agents import research, strategy, content, optimizer, evaluator, learning, image_agent
from llm_router import c


def _evaluate_router(state: GraphState) -> str:
    evaluation = state.get("evaluation", {})
    revision_count = state.get("revision_count", 0)
    max_revisions = state.get("max_revisions", 2)

    if evaluation.get("approved"):
        return "approved"
    if revision_count >= max_revisions:
        return "exhausted"
    return "revise"


def _increment_revision(state: GraphState) -> dict:
    return {"revision_count": state.get("revision_count", 0) + 1}


def _finalize_approved(state: GraphState) -> dict:
    return {"final_status": "published"}


def _finalize_exhausted(state: GraphState) -> dict:
    print(f"\n{c('yellow', '⚠')} Max revisions exhausted without approval — "
          f"flagging for human review instead of auto-publishing.")
    return {"final_status": "needs_human_review"}


def build_graph():
    graph = StateGraph(GraphState)

    graph.add_node("research", research.run)
    graph.add_node("strategy", strategy.run)
    graph.add_node("content", content.run)
    graph.add_node("optimize", optimizer.run)
    graph.add_node("evaluate", evaluator.run)
    graph.add_node("increment_revision", _increment_revision)
    graph.add_node("finalize_approved", _finalize_approved)
    graph.add_node("finalize_exhausted", _finalize_exhausted)
    graph.add_node("generate_image", image_agent.run)
    graph.add_node("learning", learning.run)

    graph.set_entry_point("research")
    graph.add_edge("research", "strategy")
    graph.add_edge("strategy", "content")
    graph.add_edge("content", "optimize")
    graph.add_edge("optimize", "evaluate")

    graph.add_conditional_edges(
        "evaluate",
        _evaluate_router,
        {
            "approved": "finalize_approved",
            "revise": "increment_revision",
            "exhausted": "finalize_exhausted",
        },
    )
    graph.add_edge("increment_revision", "content")  # loop back — this is the "correct" step
    graph.add_edge("finalize_approved", "generate_image")
    graph.add_edge("generate_image", "learning")
    graph.add_edge("finalize_exhausted", "learning")
    graph.add_edge("learning", END)

    return graph.compile()
