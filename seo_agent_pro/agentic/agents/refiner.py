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

sys.path.insert(0, str(Path(__file__).resolve().parent))
from optimizer import _load_index, _shortlist_candidate_links  # noqa: E402 — reuse, don't duplicate

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
            max_tokens=200,
        ).strip().strip('"')
        if new_meta and new_meta != old_meta:
            fm["meta_description"] = new_meta
            if str(fm.get("excerpt", "")).strip() == old_meta:
                fm["excerpt"] = new_meta
            changes["meta_description"] = new_meta

    return fm, body, changes


def _protected_spans(body: str) -> list[tuple[int, int]]:
    """Spans of `body` that must never have a Markdown link inserted into
    them: HTML tags/attributes themselves (e.g. `alt="..."`), and the text
    content of heading tags specifically (`<h1>`/`<h2>`/`<h3>`) — this site's
    renderer doesn't re-process Markdown found inside raw HTML, so a link
    inserted there shows up as literal broken `[text](url)` on the live
    page instead of an actual link. Real incident this fixes: a refiner
    batch inserted links into `<img alt="...">` and `<h2>...</h2>` across
    10 already-published articles, visibly breaking their headings/alt text.
    """
    spans = [m.span() for m in re.finditer(r"<[^>]*>", body)]
    for m in re.finditer(r"<h[123][^>]*>(.*?)</h[123]>", body, re.DOTALL):
        spans.append(m.span(1))
    return spans


def _in_protected_span(pos: int, spans: list[tuple[int, int]]) -> bool:
    return any(start <= pos < end for start, end in spans)


# Same generic-word filter as optimizer.py's — a phrase made entirely of
# terms so common across this site's own titles (chrome, extension(s),
# best, top, guide, how, for, etc.) carries no real topical specificity,
# and matching on one links completely unrelated articles together. This
# refiner has its own separate link-insertion code path from optimizer.py
# and didn't inherit that fix — found the exact same failure mode here
# independently (e.g. "[How to Fix]" linked to an unrelated article).
_SITE_GENERIC_WORDS = {
    "how", "to", "the", "best", "top", "a", "an", "for", "of", "in", "on",
    "and", "or", "what", "is", "guide", "chrome", "extension", "extensions",
    "your", "you", "with", "vs", "2026", "2025",
}


def _has_content_word(phrase: str) -> bool:
    words = re.findall(r"[a-zA-Z0-9]+", phrase.lower())
    return any(w not in _SITE_GENERIC_WORDS and len(w) > 2 for w in words)


def _add_internal_links(title: str, keyword: str, body: str, own_slug: str = "", max_links: int = 2) -> tuple[str, list[str]]:
    """
    Same deterministic phrase-matching approach as optimizer.py: only ever
    turns text the article ALREADY says into a link, using a real slug from
    articles-index.json — never invents anchor text or a URL. Real incident
    this fixes: the Refiner's original design fixed metadata and added gap
    sections but never touched links at all, so a fully "refined" article
    could still ship with zero internal/external links.
    """
    index = _load_index()
    candidates = [a for a in _shortlist_candidate_links(keyword, title, index) if a.get("slug") != own_slug]
    links_added = []

    for cand in candidates:
        if len(links_added) >= max_links:
            break
        slug = cand.get("slug", "")
        cand_title = cand.get("title", "")
        if not slug or not cand_title or f"](/blog/{slug})" in body:
            continue
        phrase_candidates = [cand_title]
        head = re.split(r"[:\u2013\u2014]", cand_title, maxsplit=1)[0].strip()
        if head and head != cand_title:
            phrase_candidates.append(head)
        words = head.split()
        if len(words) > 2:
            phrase_candidates.append(" ".join(words[:3]))
            phrase_candidates.append(" ".join(words[:2]))
        phrase_candidates = [p for p in phrase_candidates if _has_content_word(p)]

        for phrase in phrase_candidates:
            if len(phrase) < 4:
                continue
            pattern = re.compile(r"(?<!\]\()(?<![\[\w])" + re.escape(phrase) + r"(?![\w\]])", re.IGNORECASE)
            protected = _protected_spans(body)
            m = next((cand_m for cand_m in pattern.finditer(body)
                      if not _in_protected_span(cand_m.start(), protected)), None)
            if m:
                matched_text = body[m.start():m.end()]
                body = body[:m.start()] + f"[{matched_text}](/blog/{slug})" + body[m.end():]
                links_added.append(f"/blog/{slug}")
                break

    return body, links_added


def _find_competitor_gap(title: str, keyword: str, body: str, model: str, avoid: list[str] | None = None) -> dict:
    """LLM-knowledge-based (same honest limitation as research.py — no live
    SERP API configured for this project). Grounded in the ARTICLE'S OWN
    current body so it can only propose something genuinely absent, not
    something already covered under different wording."""
    avoid_note = ""
    if avoid:
        avoid_note = (
            "\nDo NOT propose any of these gaps — they were already identified "
            f"and filled earlier in this same refinement pass: {'; '.join(avoid)}"
        )
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
{avoid_note}

Return JSON:
{{
  "gap_found": true/false,
  "gap_title": "a short ## heading for the missing section, or empty string if none",
  "gap_reasoning": "one sentence on why competitors likely cover this and this article doesn't",
  "gap_section_markdown": "150-300 words of real, specific, non-generic content filling this exact gap, written in the same practical/task-based tone as the article body above, formatted as markdown starting with '## <heading>'. Empty string if gap_found is false."
}}

If you genuinely can't identify a real, specific, non-generic gap, set
gap_found to false rather than inventing a weak one."""
    return call_json(system, user, model, max_tokens=1200)


# A single ~200-word section is a reasonable addition to an already-
# substantial article, but real incident: an article that started at only
# ~500 body words was still thin after adding just one section, and got
# correctly called out as not being publication-quality. Below this
# threshold, keep adding genuine gap sections (each still independently
# grounded and still allowed to say "no more real gaps found" rather than
# padding) instead of stopping after one.
THIN_ARTICLE_WORD_THRESHOLD = 1200
MAX_GAP_SECTIONS_FOR_THIN_ARTICLES = 4


def _insert_section(body: str, section: str) -> str:
    insertion_point = None
    for marker in [r"^##\s+Conclusion", r"^##\s+Frequently Asked Questions"]:
        m = re.search(marker, body, re.IGNORECASE | re.MULTILINE)
        if m:
            insertion_point = m.start()
            break
    if insertion_point is not None:
        return body[:insertion_point] + section + "\n\n" + body[insertion_point:]
    return body.rstrip() + "\n\n" + section + "\n"


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

    _step("Internal link check")
    body, links_added = _add_internal_links(title, keyword, body, own_slug=fm.get("slug", ""))
    if links_added:
        print(c("green", f"  ✓ added {len(links_added)} internal link(s): {', '.join(links_added)}"))
    else:
        print(c("dim", "  · no new natural internal link match found"))

    starting_word_count = len(body.split())
    max_sections = (
        MAX_GAP_SECTIONS_FOR_THIN_ARTICLES if starting_word_count < THIN_ARTICLE_WORD_THRESHOLD else 1
    )
    if max_sections > 1:
        print(c("yellow", f"  ⚠ article is thin ({starting_word_count} words) — "
                           f"allowing up to {max_sections} gap sections instead of 1"))

    gaps_added: list[str] = []
    last_gap = {}
    for i in range(max_sections):
        _step(f"Competitor gap analysis (top 3, LLM-knowledge-based) — pass {i+1}/{max_sections}")
        gap = _find_competitor_gap(title, keyword, body, model, avoid=gaps_added)
        last_gap = gap
        if not (gap.get("gap_found") and gap.get("gap_section_markdown", "").strip()):
            print(c("dim", "  · no further genuine gap identified — stopping (no filler added)"))
            break
        print(c("yellow", f"  + gap found: {gap.get('gap_title')} — {gap.get('gap_reasoning', '')}"))
        body = _insert_section(body, gap["gap_section_markdown"].strip())
        gaps_added.append(gap.get("gap_title", ""))

    gap_added = bool(gaps_added)
    gap = last_gap

    return {
        "frontmatter": fm,
        "body": body,
        "metadata_changes": metadata_changes,
        "internal_links_added": links_added,
        "gap_analysis": gap,
        "gap_added": gap_added,
        "gaps_added_titles": gaps_added,
    }
