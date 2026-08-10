"""
Optimizer & SEO Specialist Agent.

Fixes, at the source, the three concrete on-page bugs found in the very
first article this whole system ever published (see conversation history /
cycle_log.json for that incident):

1. Title tag length  — reuses daily_article.py's make_seo_title(), which was
   hardened to never silently give up.
2. Fake internal links — instead of letting the Content Agent invent
   plausible-looking anchor text with nowhere real to point it, THIS agent
   is the one that inserts internal links, and it only ever picks from a
   real shortlist of existing published articles (from articles-index.json).
   If nothing relevant exists, it links to /blog instead of inventing a URL.
3. Fixed category — classifies against the SITE'S ACTUAL existing category
   taxonomy (pulled live from articles-index.json) instead of a hardcoded
   default, so different topics land in different, correct categories.
"""

from __future__ import annotations

import json
import re
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[2]))
from llm_router import call, call_json, c

ROOT = Path(__file__).resolve().parents[3]
INDEX_FILE = ROOT / "public" / "content" / "articles-index.json"

sys.path.insert(0, str(Path(__file__).resolve().parents[1].parent))
from daily_article import make_seo_title  # noqa: E402


def _step(label: str) -> None:
    print(f"\n{c('cyan', '▸')} {c('bold', 'Optimizer Agent — ' + label)}")


def _load_index() -> list[dict]:
    if not INDEX_FILE.exists():
        return []
    try:
        return json.loads(INDEX_FILE.read_text(encoding="utf-8"))
    except json.JSONDecodeError:
        return []


def _real_category_taxonomy(index: list[dict]) -> list[str]:
    cats = sorted({str(a.get("category", "")).strip() for a in index if a.get("category")})
    return cats or ["Productivity & Tools"]


def _shortlist_candidate_links(keyword: str, title: str, index: list[dict], limit: int = 12) -> list[dict]:
    """Cheap keyword-overlap shortlist (no embeddings needed for this size of
    catalog) — narrows ~750 articles down to a manageable list the LLM can
    reason over to pick genuinely relevant internal links."""
    query_words = set(re.findall(r"[a-z0-9]+", (keyword + " " + title).lower()))
    scored = []
    for a in index:
        hay = set(re.findall(r"[a-z0-9]+", (a.get("title", "") + " " + " ".join(a.get("keywords", []))).lower()))
        overlap = len(query_words & hay)
        if overlap:
            scored.append((overlap, a))
    scored.sort(key=lambda x: -x[0])
    return [a for _, a in scored[:limit]]


def run(state: dict) -> dict:
    keyword = state["keyword"]
    title = state["title"]
    body = state["body"]
    model = state["active_model"]

    _step("Title, links, category, meta description")

    # 1. seo_title — hardened truncation, never silently gives up
    seo_title = make_seo_title(title)
    tag_len = len(f"{seo_title or title} | ExtensionTo")
    print(c("green" if tag_len <= 60 else "yellow",
            f"  {'✓' if tag_len <= 60 else '⚠'} title tag: {tag_len} chars"
            + (f" (seo_title: \"{seo_title}\")" if seo_title else "")))

    # 2. real internal links — deterministic, no LLM round-trip of the full
    # body. A real production failure (Groq free-tier TPM limit: 8000
    # tokens/min, request was 8159) showed that sending the ENTIRE article
    # body to an LLM just to ask it to echo it back with 1-3 links inserted
    # is both wasteful and fragile at scale. Instead: for each shortlisted
    # candidate, look for its own title text (or a distinctive chunk of it)
    # already occurring naturally in the body, and turn the FIRST such
    # occurrence into a markdown link in Python. This only ever links text
    # the article already organically mentions — no LLM judgment needed, and
    # it can't invent a URL because it never generates one.
    index = _load_index()
    candidates = _shortlist_candidate_links(keyword, title, index)
    internal_links_used: list[str] = []

    for cand in candidates:
        if len(internal_links_used) >= 3:
            break
        slug = cand.get("slug", "")
        cand_title = cand.get("title", "")
        if not slug or not cand_title:
            continue
        # Try the whole title first, then progressively shorter leading
        # phrases (e.g. "Google Translate for Chrome: ..." -> "Google
        # Translate for Chrome" -> "Google Translate") so a natural mention
        # in running prose still matches even if the article's exact title
        # doesn't appear verbatim.
        phrase_candidates = [cand_title]
        head = re.split(r"[:\u2013\u2014]", cand_title, maxsplit=1)[0].strip()
        if head and head != cand_title:
            phrase_candidates.append(head)
        words = head.split()
        if len(words) > 2:
            phrase_candidates.append(" ".join(words[:3]))
            phrase_candidates.append(" ".join(words[:2]))

        # Generic phrases like "How to", "Best Chrome", or "Chrome
        # Extensions For" appear constantly in ordinary prose with zero
        # topical relevance to the specific candidate article — matching on
        # them produces a real, confirmed bug: e.g. "chrome extensions for"
        # in an unrelated sentence linking straight to a PDF-reading
        # article, just because both titles happen to start that way.
        # Rather than an ever-growing list of exact banned phrases (which
        # only catches combinations someone happened to test), require
        # every candidate phrase to contain at least one non-generic
        # "content" word — a word that isn't one of the terms so common
        # across this site's own titles that it carries no topical
        # specificity by itself.
        SITE_GENERIC_WORDS = {
            "how", "to", "the", "best", "top", "a", "an", "for", "of", "in",
            "on", "and", "or", "what", "is", "guide", "chrome", "extension",
            "extensions", "your", "you", "with", "vs", "2026", "2025",
        }
        def _has_content_word(phrase: str) -> bool:
            words = re.findall(r"[a-zA-Z0-9]+", phrase.lower())
            return any(w not in SITE_GENERIC_WORDS and len(w) > 2 for w in words)

        phrase_candidates = [p for p in phrase_candidates if _has_content_word(p)]

        for phrase in phrase_candidates:
            if len(phrase) < 4:
                continue
            pattern = re.compile(r"(?<!\]\()(?<![\[\w])" + re.escape(phrase) + r"(?![\w\]])", re.IGNORECASE)
            m = pattern.search(body)
            if m:
                matched_text = body[m.start():m.end()]
                body = body[:m.start()] + f"[{matched_text}](/blog/{slug})" + body[m.end():]
                internal_links_used.append(f"/blog/{slug}")
                break

    # Belt-and-suspenders: strip any '#' or empty-anchor placeholder links
    # that slipped through despite the instructions above, rather than
    # shipping a dead link — convert [text](#) into plain text.
    body = re.sub(r"\[([^\]]+)\]\(#\)", r"\1", body)
    body = re.sub(r"!\[[^\]]*\]\((?:#|image-url-placeholder|placeholder[^)]*)\)\s*", "", body, flags=re.IGNORECASE)

    if not internal_links_used:
        # Nothing relevant existed — link to the blog index rather than
        # nothing, so the article isn't a dead end, but never invent a slug.
        body = body.rstrip() + "\n\nExplore more [Chrome extension guides](/blog) on ExtensionTo."
        internal_links_used = ["/blog"]

    print(c("green", f"  ✓ internal links: {', '.join(internal_links_used)}"))

    # 3. real category, from the site's actual taxonomy
    taxonomy = _real_category_taxonomy(index)
    cat_result = call_json(
        "You classify articles into an EXISTING category taxonomy. Always pick "
        "exactly one category from the provided list — never invent a new one.",
        f'Article title: "{title}"\nKeyword: "{keyword}"\n\n'
        f'Valid categories:\n{json.dumps(taxonomy, indent=2)}\n\n'
        f'Return JSON: {{"category": "<one of the valid categories, verbatim>"}}',
        model,
    )
    category = cat_result.get("category", "").strip()
    if category not in taxonomy:
        category = taxonomy[0]
    print(c("green", f"  ✓ category: {category}"))

    # 4. meta description — short, focused call
    meta_description = call(
        "You write concise SEO meta descriptions. Reply with ONLY the description "
        "text, no preamble, no quotes, 140-160 characters, a complete sentence "
        "that does not end with '...'.",
        f'Write a meta description for an article targeting the keyword "{keyword}". '
        f"Article title: {title}",
        model,
    ).strip().strip('"')
    print(c("green", f"  ✓ meta description: {len(meta_description)} chars"))

    return {
        "seo_title": seo_title,
        "meta_description": meta_description,
        "category": category,
        "body": body,
        "internal_links_used": internal_links_used,
    }
