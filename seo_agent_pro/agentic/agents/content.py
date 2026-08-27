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
    source_requirements = strategy.get("source_requirements", []) or []

    lessons = memory_store.load_lessons()

    revision_note = ""
    if revision_count > 0 and prev_eval:
        issues = prev_eval.get("deterministic_issues", []) + prev_eval.get("llm_issues", [])
        revision_note = f"""

⚠️ THIS IS A REVISION (attempt {revision_count + 1}). The previous draft was
REJECTED by the Evaluator for these specific reasons — fix every one of
them in this rewrite, don't just repeat the same draft:
{chr(10).join(f'- {i}' for i in issues)}

NON-NEGOTIABLE REVISION CHECKS:
- If the Evaluator mentions a checklist, add a visible section with at least
  four concrete lines written exactly as '- [ ] action to verify'.
- If the Evaluator mentions source evidence, include only the supplied official
  URLs in a Sources section and attach the relevant exact claim to its source.
- If a source URL is not supplied for an exact quota, limit, version, price, or
  measurement, remove the exact value and use cautious qualitative wording.
- If the Evaluator mentions heading format, use plain Markdown headings only;
  never write a list marker after '#', such as '## - [text](#anchor)'."""

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
- Source requirements: {', '.join(source_requirements) if source_requirements else 'no source URLs supplied; avoid exact quotas, dates, versions, prices, measurements, and unverifiable product claims'}

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

[If "checklist" is in Must include, add an actual task checklist using
Markdown '- [ ]' items, with concrete verification steps. Do not merely use
the word checklist.]

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
- Exact quotas, limits, browser versions, prices, dates, benchmark results,
  or security claims require a real source URL from Source requirements. If
  no such URL is supplied, state the limitation qualitatively and direct the
  reader to current official documentation instead of guessing.
- For Chrome storage, keep the documented distinction precise: local and
  session are not the same as web localStorage; sync has both total and
  per-item limits; write-rate limits must not be guessed. If the official
  source is supplied, reproduce its values faithfully and do not reverse
  total versus per-item quotas.
- For Manifest V3 service workers, distinguish extension service workers from
  page service workers. Do not present skipWaiting(), message queuing, or a
  particular DevTools label as a universal fix unless the supplied official
  source supports that exact guidance; explain lifecycle behavior cautiously.
- If Source requirements contain real URLs, use only those URLs in a short
  Sources section; never manufacture citations or URLs from memory.
- Markdown discipline: use '# ' for exactly one H1 and '## ' for sections.
  Table-of-contents entries may be bullets, but never prefix a heading with
  '- ' (for example, never write '## - [link]'). A Markdown table must begin
  with a pipe row such as '| Aspect | Value |', never with '## |'.
- Human, conversational tone
- Add Information Gain: insights competitors missed — through better
  organization and explanation, not invented data
- If competitor-gap opportunities are provided, address them with useful sections or checklists. Treat competitor snippets and headings as hypotheses, do not copy competitor wording, and never claim a product fact without a verifiable source.
- Do NOT include any markdown links or images unless you have a real, complete URL for them — the Optimizer agent adds real internal links afterward
- Before finishing, perform a private compliance check: every required H2
  exists, every requested checklist has at least four '- [ ]' task boxes, and
  every exact sensitive claim is backed by one of the supplied source URLs.
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
    else:
        # Some OpenAI-compatible models return a visually clear title without
        # the Markdown marker. Treat the first non-empty line as H1 rather than
        # letting the evaluator misread the entire article structure.
        for i, line in enumerate(lines):
            stripped = line.strip()
            if not stripped:
                continue
            lower_stripped = stripped.lower()
            if lower_stripped.startswith("strong hook") or lower_stripped in {"introduction", "intro", "opening"}:
                title = keyword
                body_start = i + 1
            else:
                title = stripped
                body_start = i + 1
            break

    body_lines = lines[body_start:]
    # Defense in depth: the prompt requires H2s, but a model may emit section
    # names as plain lines. Promote only lines that substantially match a
    # required section, never arbitrary prose, so heading-based evaluation is
    # faithful to the article's visible structure.
    def _norm_heading(value: str) -> str:
        return re.sub(r"[^a-z0-9 ]", "", value.lower()).strip()

    normalized_sections = [_norm_heading(str(s)) for s in sections if str(s).strip()]
    for idx, line in enumerate(body_lines):
        stripped = line.strip()
        if not stripped or stripped.startswith("#"):
            continue
        norm_line = _norm_heading(stripped)
        for norm_section in normalized_sections:
            section_words = set(norm_section.split())
            line_words = set(norm_line.split())
            if section_words and len(line_words) <= max(12, int(len(section_words) * 1.5)) and (norm_line == norm_section or len(section_words & line_words) / len(section_words) >= 0.5):
                body_lines[idx] = f"## {stripped}"
                break
    body = "\n".join(body_lines).strip()

    word_count = len(body.split())
    print(c("green", f"  ✓ draft complete — {word_count} words, title: \"{title}\""))

    return {
        "raw_article": raw_article,
        "title": title,
        "body": body,
        "word_count": word_count,
    }
