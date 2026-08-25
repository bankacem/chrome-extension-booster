"""
Feed a manually-written ("Claude standing in for the pipeline") published
article back into the agents' long-term memory, so future AUTOMATED runs
benefit from it too.

This is the concrete answer to "can the agents learn from the independent
work Claude does outside the pipeline" — run this after publishing any
article that didn't go through agentic/run.py, and its positive patterns
join lessons.md (which content.py already loads into every future run's
system prompt), and the cycle itself joins cycle_log.json (which the
Research Agent's relevant_past_cycles() can surface for related keywords).

Usage:
    python3 ingest_demonstration.py \\
        --keyword "best chrome extensions for note taking" \\
        --category "Productivity & Tools" \\
        --score 90 \\
        --notes "Written manually; task-based structure with 3 competitor gaps." \\
        --pattern "Structure 'best X extensions' articles around 2-3 genuine competitor gaps, named in their own section, instead of a flat ranked list." \\
        --pattern "Open with a 'which type do you actually need' section before any recommendations, so different reader intents self-select." \\
        --pattern "Include a short table of contents before the first H2 for articles over 1500 words."
"""

from __future__ import annotations

import argparse
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))
from agentic import memory_store
from llm_router import c


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--keyword", required=True)
    parser.add_argument("--category", required=True)
    parser.add_argument("--score", type=int, required=True, help="0-100, your honest assessment")
    parser.add_argument("--notes", required=True)
    parser.add_argument("--pattern", action="append", default=[],
                         help="A positive, reusable pattern this article demonstrates. Repeatable.")
    args = parser.parse_args()

    if not args.pattern:
        print(c("yellow", "⚠ No --pattern given — the cycle will be logged, but nothing "
                           "will change in future agent prompts. Consider adding at least one."))

    added = memory_store.record_demonstration(
        keyword=args.keyword,
        category=args.category,
        score=args.score,
        notes=args.notes,
        positive_patterns=args.pattern,
    )

    print(c("green", f"✓ Recorded demonstration cycle for {args.keyword!r} (score {args.score})"))
    if added:
        print(c("green", f"✓ {len(added)} new pattern(s) added to lessons.md:"))
        for p in added:
            print(c("dim", f"  - {p}"))
    else:
        print(c("dim", "· no new patterns (all were already recorded, or none were given)"))


if __name__ == "__main__":
    main()
