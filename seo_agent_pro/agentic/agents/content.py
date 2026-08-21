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
    lang = state.get("lang", "en")

    length = strategy.get("ideal_length", 1500)
    sections = strategy.get("required_sections", [])
    angle = strategy.get("unique_angle", "")
    elements = strategy.get("must_have_elements", [])
    competitor_gaps = strategy.get("competitor_gap_requirements", []) or []

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

    if lang == "ar":
        language_instruction = "Write in professional, natural Modern Standard Arabic, not literal translation."
    elif lang == "fr":
        language_instruction = "Write in clear, natural professional French."
    elif lang == "es":
        language_instruction = "Write in clear, natural professional Spanish."
    else:
        language_instruction = "Write in clear, engaging English."

    system = f"""You are a professional SEO content writer. {language_instruction} \
Never sound robotic. Prioritize Information Gain — include unique \
insights not found elsewhere.

Hard rules accumulated from real past mistakes on this site — follow every one:
{lessons}"""

    user = f"""Write a complete, high-ranking SEO article for: "{keyword}"

Specifications:
- Target length:    {length} words
- Unique angle:     {angle}
- Competitor-gap opportunities: {', '.join(competitor_gaps) if competitor_gaps else 'none selected; do not pretend competitor research exists'}
- Must include:     {', '.join(elements) if elements else 'decide based on topic'}

⚠️ REQUIRED SECTIONS — every one of these MUST appear as its own H2 heading.
This is a hard checklist, not a suggestion — an article missing any of these
will be REJECTED by the Evaluator regardless of how good the writing is:
{chr(10).join(f'{i+1}. {s}' for i, s in enumerate(sections)) if sections else '(no specific sections required — choose the best structure)'}

Structure:
# [H1 — includes primary keyword, compelling and clear, under 70 characters]

[Strong hook introduction — 3 paragraphs, establish the problem and promise]

[One ## H2 section for EACH required section listed above, in a sensible
order — do not skip, merge, or rename any of them beyond light rephrasing]

[Comparison table if a table is in "Must include" above — an ACTUAL
markdown table with | pipes, not a sentence saying a table exists]

## Frequently Asked Questions
**Q: ...**
A: ...

## Conclusion
[Summary + clear call to action]

Rules:
- Keyword in first 100 words naturally
- Keyword density 1–2%, natural placement
- NEVER invent statistics, studies, survey numbers, user counts, review
  scores, or named testimonials. If you don't have a verified real number,
  describe things qualitatively instead (e.g. "many users report faster
  load times" not "94% of users report a 2.3x speedup"). A false specific
  number is worse than no number — this exact failure mode produced a
  published article with a fake pilot study (N=312) and fake user reviews
  that had to be pulled and rewritten.
- Do NOT invent URLs, screenshot links, or claim to have verified/tested
  something you have no way to have tested (e.g. specific TLS versions,
  specific pricing you cannot confirm as current)
- Human, conversational tone
- Add Information Gain: insights competitors missed — through better
  organization and explanation, not invented data
- If competitor-gap opportunities are provided, address them with useful sections or checklists. Treat competitor snippets and headings as hypotheses, do not copy competitor wording, and never claim a product fact without a verifiable source.
- Do NOT include any markdown links or images unless you have a real, complete URL for them — the Optimizer agent adds real internal links afterward
- End on a complete sentence — never stop mid-sentence or mid-word{revision_note}"""

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
        "word_count": word_count,
    }
