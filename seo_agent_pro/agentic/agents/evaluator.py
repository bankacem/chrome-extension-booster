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

    return issues


def _llm_review(state: dict, model: str) -> dict:
    system = (
        "You are a strict, independent SEO/content critic. You do not write "
        "content — you only evaluate it against the brief and flag real problems. "
        "Be specific and concrete; vague praise is not useful feedback."
    )
    user = f"""Keyword: "{state.get('keyword')}"

Strategy brief:
{json.dumps(state.get('strategy', {}), indent=2)}

Article title: {state.get('title')}

Article body:
{state.get('body', '')[:6000]}

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
