"""
Refiner Agent (8th agent in the pipeline).

Different job from the Content Agent: that one writes NEW articles from
scratch. This one takes an EXISTING published article and:

1. Fixes metadata issues (meta_description missing/truncated/too-short/
   near-duplicate, seo_title over the 60-char budget, dead '#' links,
   placeholder images) — same as the original refine_articles.py script,
   now formalized as part of the agent pipeline instead of a standalone
   script.

2. Analyzes what the top 3 competing articles for this topic likely cover
   that THIS article doesn't, and APPENDS one new section that closes that
   gap — it never rewrites, reorders, or removes any existing content. This
   is the literal implementation of "exploit competitor gaps without
   writing the article again."

Both steps operate on the same real body text — nothing is invented about
what the article currently says; the gap-analysis call is given the actual
current body so it can't propose something already covered.
"""

from __future__ import annotations

import re
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[2]))
from llm_router import call, call_json, c

sys.path.insert(0, str(Path(__file__).resolve().parents[1].parent))
from daily_article import make_seo_title, SUFFIX  # noqa: E402


def _step(label: str) -> None:
    print(f"\n{c('cyan', '▸')} {c('bold', 'Refiner Agent — ' + label)}")


def _fix_metadata(fm: dict, body: str, model: str) -> tuple[dict, str, dict]:
    """Same logic as the original refine_articles.py — metadata only, no
    section additions here. Returns (updated_fm, updated_body, changes)."""
    changes = {}
    title = fm.get("title") or ""
    old_meta = str(fm.get("meta_description") or "").strip()

    new_body = re.sub(r"\[([^\]]+)\]\(#\)", r"\1", body)
    new_body = re.sub(
        r"!\[[^\]]*\]\((?:#|image-url-placeholder|placeholder[^)]*)\)\s*",
        "", new_body, flags=re.IGNORECASE,
    )
    if new_body != body:
        changes["stripped_dead_links_or_placeholder_images"] = True
        body = new_body

    if len(f"{fm.get('seo_title') or title}{SUFFIX}") > 60:
        new_seo_title = make_seo_title(title)
        if new_seo_title:
            fm["seo_title"] = new_seo_title
            changes["seo_title"] = new_seo_title

    needs_desc_fix = (
        not old_meta or old_meta.endswith(("...", "…")) or len(old_meta) < 70
    )
    if needs_desc_fix:
        new_meta = call(
            "You write concise, accurate SEO meta descriptions. You base the "
            "description ONLY on the article text given to you — never invent "
            "facts, numbers, or claims not present in the text. Reply with ONLY "
            "the description, no preamble, no quotes, 120-155 characters, a "
            "complete sentence that does not end with '...'.",
            f'Article title: "{title}"\n\nArticle text (excerpt):\n{body[:3000]}',
            model,
        ).strip().strip('"')
        if new_meta and new_meta != old_meta:
            fm["meta_description"] = new_meta
            if str(fm.get("excerpt", "")).strip() == old_meta:
                fm["excerpt"] = new_meta
            changes["meta_description"] = new_meta

    return fm, body, changes


def _find_competitor_gap(title: str, keyword: str, body: str, model: str) -> dict:
    """LLM-knowledge-based (same honest limitation as research.py — no live
    SERP API configured for this project). Grounded in the ARTICLE'S OWN
    current body so it can only propose something genuinely absent, not
    something already covered under different wording."""
    system = (
        "You are a competitive content analyst. You are given an existing "
        "published article and asked what the top 3 ranking competitor pages "
        "for its topic likely cover that this specific article does NOT. "
        "You must check the provided body text carefully — do not propose "
        "something that's already covered, even under different wording."
    )
    user = f"""Article title: "{title}"
Target keyword: "{keyword}"

Current article body (this is everything the article already covers — do
not propose anything already present here):
{body[:6000]}

Return JSON:
{{
  "gap_found": true/false,
  "gap_title": "a short ## heading for the missing section, or empty string if none",
  "gap_reasoning": "one sentence on why competitors likely cover this and this article doesn't",
  "gap_section_markdown": "150-300 words of real, specific, non-generic content filling this exact gap, written in the same practical/task-based tone as the article body above, formatted as markdown starting with '## <heading>'. Empty string if gap_found is false."
}}

If you genuinely can't identify a real, specific, non-generic gap, set
gap_found to false rather than inventing a weak one."""
    return call_json(system, user, model)


def run(state: dict) -> dict:
    """
    Expects state to already contain: article_path (Path), frontmatter (dict,
    parsed), body (str), active_model (str). Keyword is read from
    frontmatter['keywords'][0] if not explicitly given.
    """
    fm = state["frontmatter"]
    body = state["body"]
    model = state["active_model"]
    title = fm.get("title") or ""
    keyword = state.get("keyword") or (fm.get("keywords") or [title])[0]

    _step(f"Metadata pass — {title[:60]}")
    fm, body, metadata_changes = _fix_metadata(fm, body, model)
    for k, v in metadata_changes.items():
        print(c("green", f"  ✓ {k}: {v if isinstance(v, str) else ''}"))
    if not metadata_changes:
        print(c("dim", "  · metadata already clean"))

    _step("Competitor gap analysis (top 3, LLM-knowledge-based)")
    gap = _find_competitor_gap(title, keyword, body, model)
    gap_added = False

    if gap.get("gap_found") and gap.get("gap_section_markdown", "").strip():
        print(c("yellow", f"  + gap found: {gap.get('gap_title')} — {gap.get('gap_reasoning', '')}"))
        section = gap["gap_section_markdown"].strip()
        # Insert before "## Conclusion" or "## Frequently Asked Questions" if
        # either exists (keeps the FAQ/conclusion as the natural closer),
        # otherwise append at the very end — but NEVER touch any existing text.
        insertion_point = None
        for marker in [r"^##\s+Conclusion", r"^##\s+Frequently Asked Questions"]:
            m = re.search(marker, body, re.IGNORECASE | re.MULTILINE)
            if m:
                insertion_point = m.start()
                break
        if insertion_point is not None:
            body = body[:insertion_point] + section + "\n\n" + body[insertion_point:]
        else:
            body = body.rstrip() + "\n\n" + section + "\n"
        gap_added = True
    else:
        print(c("dim", "  · no genuine gap identified — leaving article as-is (no filler added)"))

    return {
        "frontmatter": fm,
        "body": body,
        "metadata_changes": metadata_changes,
        "gap_analysis": gap,
        "gap_added": gap_added,
    }
