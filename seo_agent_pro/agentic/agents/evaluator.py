"""
Evaluator & Critic Agent.

Deliberately does NOT write or fix anything — it only inspects the state the
Content/Optimizer agents produced and decides approve/reject. This is the
node that did not exist anywhere in the pipeline before today, and its
absence is the direct, confirmed cause of every concrete bug found in the
first article this system published (86-char title tag, two "#" dead links,
a fake image src, a hardcoded category).

Two layers, deliberately kept separate:
  - Deterministic checks: exact rules we already know from real incidents
    (regex/length/lookup checks — cheap, 100% reliable, zero LLM cost).
  - LLM qualitative checks: things that need judgment (Information Gain,
    tone, whether the angle actually delivers on the brief).

A deterministic failure alone is enough to reject, regardless of the LLM
score — hard rules don't get overruled by a "but it reads well" opinion.
"""

from __future__ import annotations

import json
import os
import re
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[2]))
from llm_router import call_json, c

ROOT = Path(__file__).resolve().parents[3]
INDEX_FILE = ROOT / "public" / "content" / "articles-index.json"

APPROVAL_SCORE_THRESHOLD = 70


def _step(label: str) -> None:
    print(f"\n{c('cyan', '▸')} {c('bold', 'Evaluator Agent — ' + label)}")


def _deterministic_checks(state: dict) -> list[str]:
    issues = []

    title = state.get("title", "")
    seo_title = state.get("seo_title")
    tag_len = len(f"{seo_title or title} | ExtensionTo")
    if tag_len > 60:
        issues.append(f"Title tag is {tag_len} chars (limit 60): \"{seo_title or title} | ExtensionTo\"")

    meta = state.get("meta_description", "")
    if not meta:
        issues.append("meta_description is empty")
    else:
        if meta.rstrip().endswith("..."):
            issues.append("meta_description ends with '...' (looks truncated)")
        if not (120 <= len(meta) <= 160):
            issues.append(f"meta_description is {len(meta)} chars (target 120-160)")

    body = state.get("body", "")
    if re.search(r"\]\(#\)", body):
        issues.append("body still contains a '#' placeholder link")
    if re.search(r"!\[[^\]]*\]\((?:#|[^)]*placeholder[^)]*)\)", body, re.IGNORECASE):
        issues.append("body still contains a placeholder image src")

    # every markdown link target must be either a real /blog/<slug> that
    # exists in the index, an absolute https:// URL, or /blog itself.
    if INDEX_FILE.exists():
        try:
            index = json.loads(INDEX_FILE.read_text(encoding="utf-8"))
            valid_slugs = {a.get("slug") for a in index}
        except json.JSONDecodeError:
            valid_slugs = set()
        for _, href in re.findall(r"\[([^\]]+)\]\(([^)]+)\)", body):
            if href.startswith("http") or href == "/blog":
                continue
            m = re.match(r"^/blog/([^/?#]+)/?$", href)
            if m and m.group(1) not in valid_slugs:
                issues.append(f"internal link points at a non-existent article: {href}")

    category = state.get("category", "")
    if not category:
        issues.append("category is empty")

    # Cheap, high-value truncation guard: a complete article body should
    # never end mid-sentence/mid-word (e.g. the language-learning article
    # that got cut off mid-table-cell: "...TLS 1.3 | Du"). This doesn't
    # catch every truncation, but it catches the common case where a
    # provider response was cut short and still got treated as final.
    stripped_body = body.rstrip()
    if stripped_body and not re.search(r'[.!?"\')\]\u2019\u201d*_~]$|```$|</\w+>$', stripped_body):
        issues.append(
            "body does not end with sentence-ending punctuation "
            "(looks truncated mid-sentence/mid-word)"
        )

    # Fabrication guard: catch the common surface patterns of invented
    # "evidence" that shouldn't appear in a static content article —
    # a specific study/survey sample size, or a hosted screenshot link
    # (this site has no way to actually capture/host screenshots).
    fabrication_re = re.search(
        r"\b(pilot study|n\s*=\s*\d+|survey of \d+|in a study of \d+)\b"
        r"|https?://i\.imgur\.com/\S+"
        r"|https?://\S+/(screenshot|IMG_\d+)",
        body,
        re.IGNORECASE,
    )
    if fabrication_re:
        issues.append(
            f"body contains a likely-fabricated citation or fake hosted "
            f"image link ('{fabrication_re.group(0)}') — this site cannot "
            f"verify studies or host screenshots, so this is almost "
            f"certainly invented"
        )

    # Word-count-vs-target check: catches the semantic-incompleteness case
    # the punctuation check above can miss (e.g. the remote-work article
    # that ended on a real sentence mid-topic — "...StayFocusd is a." —
    # technically valid punctuation, but the article was still only ~450
    # words against a 1500-word brief). If the model fell far short of
    # what Strategy asked for, that's a real signal something cut it off,
    # regardless of how the last sentence happens to be punctuated.
    ideal_length = state.get("strategy", {}).get("ideal_length")
    word_count = state.get("word_count") or len(body.split())
    if ideal_length:
        try:
            ideal_length = int(ideal_length)
            if word_count < 0.65 * ideal_length:
                issues.append(
                    f"body is only {word_count} words against a "
                    f"{ideal_length}-word brief ({round(100 * word_count / ideal_length)}%) "
                    f"— likely cut short partway through, not actually finished"
                )
        except (TypeError, ValueError):
            pass

    # Optional live-research gate for controlled pilots. Production remains
    # fail-soft by default, but a test run can require real external evidence
    # instead of silently accepting llm_estimate.
    if os.environ.get("SEO_AGENT_REQUIRE_LIVE_RESEARCH") == "1":
        source = str(state.get("competitor_source", ""))
        try:
            count = int(state.get("competitor_count") or 0)
        except (TypeError, ValueError):
            count = 0
        if source not in {"searxng_top_five_external", "manual_real_search"} or count < 3:
            issues.append(
                "live competitor research is required for this run, but fewer than "
                "three verified external snapshots are available"
            )

    # Markdown heading guard: list markers must not be emitted as part of a
    # heading (e.g. '## - [Introduction](#introduction)'), because that
    # breaks the visible hierarchy and table-of-contents rendering.
    if re.search(r"^#{1,6}\s+[-*+]\s+", body, re.MULTILINE):
        issues.append("body contains a list marker inside a Markdown heading")

    # If the strategy asked for a checklist, require actual task boxes rather
    # than a paragraph that merely mentions the word checklist.
    must_have_lower = [str(e).lower() for e in (state.get("strategy", {}).get("must_have_elements") or [])]
    if any("checklist" in e for e in must_have_lower) and not re.search(r"^\s*- \[ \] ", body, re.MULTILINE):
        issues.append("Strategy brief requires a checklist, but no Markdown task boxes were found")

    # Exact technical quantities are unsafe without source evidence. This is
    # intentionally narrow: it applies to quota/permission/API/storage claims
    # and only when the brief supplied no real URL that the writer could cite.
    source_requirements = state.get("strategy", {}).get("source_requirements") or []
    supplied_urls = [str(s) for s in source_requirements if re.match(r"^https?://", str(s).strip())]
    sensitive_topic = re.search(r"\b(storage|quota|permission|permissions|manifest|api|privacy|security)\b", body, re.IGNORECASE)
    exact_quantity = re.search(r"\b\d+(?:\.\d+)?\s*(?:kb|mb|gb|bytes?|%|seconds?|minutes?|hours?)\b", body, re.IGNORECASE)
    if sensitive_topic and exact_quantity:
        if not supplied_urls:
            issues.append(
                "body contains an exact technical quantity in a sensitive topic without a source URL in the brief"
            )
        elif not any(url in body for url in supplied_urls):
            issues.append(
                "body contains an exact technical quantity but does not cite any supplied source URL"
            )

    # Brief-compliance check: the Strategy Agent's required_sections is
    # supposed to be a concrete checklist, not a suggestion — verify each one
    # actually has a matching heading in the body instead of trusting the
    # Content Agent said it included them. Real failure this caught: an
    # article whose Strategy brief required 5 sections (Privacy, Workflow
    # Integration, Installation Steps, FAQ, comparison table) but the
    # Content Agent only wrote 2 of them and the LLM critic had to notice it
    # after the fact — this makes it a hard, cheap, pre-LLM-review check
    # instead of relying on the critic to catch it every time.
    required_sections = state.get("strategy", {}).get("required_sections") or []
    if required_sections:
        # Normalize headings actually present in the body (H2/H3 text).
        present_headings = [
            re.sub(r"[^a-z0-9 ]", "", h.lower()).strip()
            for h in re.findall(r"^#{2,3}\s+(.+)$", body, re.MULTILINE)
        ]
        missing = []
        for section in required_sections:
            norm = re.sub(r"[^a-z0-9 ]", "", section.lower()).strip()
            section_words = set(norm.split())
            if not section_words:
                continue
            # Common abbreviation alias — "FAQ" and "Frequently Asked
            # Questions" are the same section but share zero words, so the
            # word-overlap check below would false-positive reject either
            # direction (required says "FAQ" but body says the long form,
            # or vice versa) without this explicit bidirectional check.
            is_faq_required = "faq" in norm or "frequently asked questions" in norm
            if is_faq_required and any(
                "faq" in h or "frequently asked questions" in h
                for h in present_headings
            ):
                continue
            found = any(
                len(section_words & set(h.split())) / len(section_words) >= 0.5
                for h in present_headings
            )
            if not found:
                missing.append(section)
        if missing:
            issues.append(
                f"{len(missing)}/{len(required_sections)} required section(s) from the "
                f"Strategy brief have no matching heading in the body: {'; '.join(missing)}"
            )

    must_have = state.get("strategy", {}).get("must_have_elements") or []
    if any("table" in str(e).lower() for e in must_have) and "|" not in body:
        issues.append(
            "Strategy brief requires a comparison table (must_have_elements), "
            "but the body contains no markdown table (no '|' characters found)"
        )

    return issues


def _llm_review(state: dict, model: str) -> dict:
    system = (
        "You are a strict, independent SEO/content critic. You do not write "
        "content — you only evaluate it against the brief and flag real problems. "
        "Be specific and concrete; vague praise is not useful feedback.\n\n"
        "IMPORTANT: this is a static Markdown article on a content site with "
        "no JavaScript/interactivity and no ability to host real screenshots "
        "or downloadable files. Do NOT penalize the article for lacking "
        "interactive elements, embedded images/GIFs, or downloadable "
        "assets — those were never deliverable, and penalizing their "
        "absence only pushes the writer to fake having them next time. "
        "Same logic for quantitative benchmarks, cost-benefit/ROI figures, "
        "and named case studies — this pipeline has no way to run "
        "performance tests or source real case data, so don't penalize "
        "the article for using qualitative comparisons instead of "
        "invented numbers. "
        "Judge the article on what a well-written static article can "
        "actually provide: clarity, accuracy, organization, completeness, "
        "and genuine (not invented) usefulness. Exact technical claims about "
        "quotas, limits, versions, prices, or security must be backed by a "
        "source URL supplied in the brief; otherwise recommend cautious "
        "qualitative wording. Do not reward a draft merely for sounding "
        "confident.\n\n"
        "The strategy brief's required_sections and must_have_elements are "
        "the concrete checklist — grade completeness against those. "
        "unique_angle is directional color (one differentiating idea), "
        "NOT a literal second checklist — don't penalize the article for "
        "every nuance of unique_angle not being individually addressed. "
        "If competitor_gap_requirements are present, check whether the article "
        "addresses at least one with concrete, useful guidance. Do not require "
        "unverified competitor or product facts; reward a clearly labeled, "
        "sourceable gap-filling angle instead."
    )
    user = f"""Keyword: "{state.get('keyword')}"

Strategy brief:
{json.dumps(state.get('strategy', {}), indent=2)}

Article title: {state.get('title')}

Article body:
{state.get('body', '')[:18000]}

Evaluate against the brief and general quality standards. Return JSON:
{{
  "score": 0,
  "issues": ["specific, actionable problems — empty list if genuinely none"],
  "notes": "one paragraph summary of the review"
}}"""
    return call_json(system, user, model)


def run(state: dict) -> dict:
    model = state["active_model"]
    _step(f"Reviewing draft (revision {state.get('revision_count', 0) + 1})")

    deterministic_issues = _deterministic_checks(state)
    llm_result = _llm_review(state, model)
    llm_issues = llm_result.get("issues", [])
    score = llm_result.get("score", 0)

    approved = (not deterministic_issues) and score >= APPROVAL_SCORE_THRESHOLD

    if deterministic_issues:
        print(c("red", f"  ✗ {len(deterministic_issues)} deterministic issue(s):"))
        for i in deterministic_issues:
            print(c("red", f"    - {i}"))
    print(c("green" if score >= APPROVAL_SCORE_THRESHOLD else "yellow",
            f"  {'✓' if score >= APPROVAL_SCORE_THRESHOLD else '⚠'} LLM score: {score}/100"))
    for i in llm_issues[:5]:
        print(c("dim", f"    · {i}"))
    print(c("green" if approved else "red", f"  {'✓ APPROVED' if approved else '✗ REJECTED'}"))

    return {
        "evaluation": {
            "approved": approved,
            "score": score,
            "deterministic_issues": deterministic_issues,
            "llm_issues": llm_issues,
            "notes": llm_result.get("notes", ""),
        }
    }
