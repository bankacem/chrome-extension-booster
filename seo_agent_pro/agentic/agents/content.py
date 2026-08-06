"""Content Creator Agent.

Writes the article. On a revision loop (state["revision_count"] > 0), it
rewrites with the Evaluator's specific feedback from the previous attempt
appended to the brief instead of starting over blind — this is what actually
closes the plan → execute → verify → correct loop instead of just retrying
the same prompt and hoping for a different result.
"""

from __future__ import annotations

import re
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))
sys.path.insert(0, str(Path(__file__).resolve().parents[2]))

from llm_router import call, c
from agentic import memory_store


def _step(label: str) -> None:
    print(f"\n{c('cyan', '▸')} {c('bold', 'Content Agent — ' + label)}")


def run(state: dict) -> dict:
    keyword = state["keyword"]
    model = state["active_model"]
    strategy = state.get("strategy", {})
    revision_count = state.get("revision_count", 0)
    prev_eval = state.get("evaluation", {})

    length = strategy.get("ideal_length", 1500)
    sections = strategy.get("required_sections", [])
    angle = strategy.get("unique_angle", "")
    elements = strategy.get("must_have_elements", [])

    lessons = memory_store.load_lessons()

    revision_note = ""
    if revision_count > 0 and prev_eval:
        issues = prev_eval.get("deterministic_issues", []) + prev_eval.get("llm_issues", [])
        revision_note = f"""

⚠️ THIS IS A REVISION (attempt {revision_count + 1}). The previous draft was
REJECTED by the Evaluator for these specific reasons — fix every one of
them in this rewrite, don't just repeat the same draft:
{chr(10).join(f'- {i}' for i in issues)}"""

    _step(f"Writing {'(revision ' + str(revision_count + 1) + ')' if revision_count else '(first draft)'} — {length} words")

    system = f"""You are a professional SEO content writer. Write in clear, engaging \
English. Never sound robotic. Prioritize Information Gain — include unique \
insights not found elsewhere.

Hard rules accumulated from real past mistakes on this site — follow every one:
{lessons}"""

    user = f"""Write a complete, high-ranking SEO article for: "{keyword}"

Specifications:
- Target length:    {length} words
- Unique angle:     {angle}
- Required H2s:     {', '.join(sections) if sections else 'choose the best structure'}
- Must include:     {', '.join(elements) if elements else 'decide based on topic'}

Structure:
# [H1 — includes primary keyword, compelling and clear, under 70 characters]

[Strong hook introduction — 3 paragraphs, establish the problem and promise]

## [H2]
### [H3 if needed]
[Content with real data, examples, actionable advice]

[Repeat for all sections]

[Comparison table if applicable]

## Frequently Asked Questions
**Q: ...**
A: ...

## Conclusion
[Summary + clear call to action]

Rules:
- Keyword in first 100 words naturally
- Keyword density 1–2%, natural placement
- Real or realistic statistics and data
- Human, conversational tone
- Add Information Gain: insights competitors missed
- Do NOT include any markdown links or images unless you have a real, complete URL for them — the Optimizer agent adds real internal links afterward{revision_note}"""

    print(c("dim", "  " + "─" * 56))
    raw_article = call(system, user, model, stream=True)
    print(c("dim", "  " + "─" * 56))

    lines = raw_article.strip().splitlines()
    title = keyword
    body_start = 0
    for i, line in enumerate(lines):
        if line.strip().startswith("# "):
            title = line.strip()[2:].strip()
            body_start = i + 1
            break
    body = "\n".join(lines[body_start:]).strip()

    word_count = len(body.split())
    print(c("green", f"  ✓ draft complete — {word_count} words, title: \"{title}\""))

    return {
        "raw_article": raw_article,
        "title": title,
        "body": body,
    }
