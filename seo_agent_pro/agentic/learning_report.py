"""Print compact, machine-readable learning metrics from cycle_log.json."""
from __future__ import annotations

import json
from pathlib import Path

from memory_store import CYCLE_LOG_PATH, load_cycle_log


def summarize(log: list[dict]) -> dict:
    scored = [r for r in log if isinstance(r.get("score"), (int, float))]
    approved = [r for r in log if r.get("approved") is True]
    real_research = [r for r in log if str(r.get("competitor_source", "")).startswith("searxng")]
    deltas = [r["score_delta_from_previous_same_keyword"] for r in log if isinstance(r.get("score_delta_from_previous_same_keyword"), (int, float))]
    return {
        "cycles": len(log),
        "scored_cycles": len(scored),
        "average_score": round(sum(r["score"] for r in scored) / len(scored), 2) if scored else None,
        "approval_rate": round(len(approved) / len(log), 3) if log else None,
        "real_competitor_research_cycles": len(real_research),
        "three_competitor_cycles": sum(1 for r in log if r.get("competitor_count", 0) >= 3),
        "average_positive_score_delta": round(sum(deltas) / len(deltas), 2) if deltas else None,
        "positive_score_deltas": sum(1 for d in deltas if d > 0),
        "latest_cycle": log[-1] if log else None,
    }


if __name__ == "__main__":
    print(json.dumps(summarize(load_cycle_log()), ensure_ascii=False, indent=2))
