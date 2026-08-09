"""
Refine Agent — reviews EXISTING published articles (not new drafts) and
fixes concrete, well-understood issues.

This is deliberately a different, narrower job than the Evaluator used in
the generation pipeline (agentic/agents/evaluator.py):

  - Evaluator: gate-keeps a FRESH draft before its first publish. Can reject
    outright and force a rewrite (the article doesn't exist publicly yet,
    so a rewrite has zero downside).
  - Refine (this file): reviews an ALREADY-LIVE article. A bad rewrite here
    has real downside (could regress something that was actually fine,
    or lose real content), so this agent only ever makes small, targeted,
    reviewable fixes to specific detected issues — never a full-body
    rewrite. Every change lands in a PR for human review before merging,
    same convention as every other agent in this project.

Reuses evaluator._deterministic_checks() directly (same hard rules, applied
to an already-published article's current state) instead of re-implementing
the same regexes here, to avoid the two checkers silently drifting apart.
"""
from __future__ import annotations

import json
import re
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[2]))
sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

from llm_router import call_json, c
from agentic.agents.evaluator import _deterministic_checks

ROOT = Path(__file__).resolve().parents[2]
INDEX_FILE = ROOT / "public" / "content" / "articles-index.json"


def _step(label: str) -> None:
    print(f"\n{c('cyan', '▸')} {c('bold', 'Refine Agent — ' + label)}")


def _parse_frontmatter(text: str) -> tuple[dict, str]:
    """Very small YAML-frontmatter parser - good enough for the flat
    key: value / key: >- block-scalar shapes this project's articles
    actually use. Returns (frontmatter_dict, body)."""
    m = re.match(r"^---\n([\s\S]*?)\n---\n?([\s\S]*)$", text)
    if not m:
        return {}, text
    fm_text, body = m.group(1), m.group(2)

    fm = {}
    lines = fm_text.split("\n")
    i = 0
    while i < len(lines):
        line = lines[i]
        km = re.match(r"^([A-Za-z_][A-Za-z0-9_]*):\s*(.*)$", line)
        if not km:
            i += 1
            continue
        key, val = km.group(1), km.group(2).strip()
        if val in (">-", ">", "|-", "|"):
            # Block scalar - collect indented continuation lines.
            i += 1
            block_lines = []
            while i < len(lines) and (lines[i].startswith("  ") or lines[i].strip() == ""):
                block_lines.append(lines[i].strip())
                i += 1
            fm[key] = " ".join(l for l in block_lines if l).strip()
            continue
        fm[key] = val.strip("'\"")
        i += 1
    return fm, body


def _review(article_path: Path) -> dict | None:
    """Returns an issue report for one article, or None if the file
    couldn't be parsed at all (logged and skipped, not fatal)."""
    try:
        text = article_path.read_text(encoding="utf-8")
    except OSError as e:
        print(c("red", f"  ✗ could not read {article_path}: {e}"))
        return None

    fm, body = _parse_frontmatter(text)
    if not fm:
        return None

    pseudo_state = {
        "title": fm.get("title", ""),
        "seo_title": fm.get("seo_title"),
        "meta_description": fm.get("meta_description", ""),
        "body": body,
        "category": fm.get("category", ""),
        # No strategy brief exists for historical articles - the
        # required_sections/must_have_elements checks in
        # _deterministic_checks simply no-op when this key is absent,
        # which is the correct behavior here (nothing to compare against).
        "strategy": {},
    }
    issues = _deterministic_checks(pseudo_state)
    return {"frontmatter": fm, "body": body, "issues": issues}


def _generate_fixes(keyword_context: str, fm: dict, body: str, issues: list[str], model: str) -> dict:
    """Asks the model for TARGETED fixes only for the specific issues
    found - never a full rewrite. Returns a dict of {field: new_value}
    for whichever of meta_description/seo_title/category need changing,
    plus optional body_patches (small find/replace pairs) for in-body
    issues like a stray placeholder link."""
    system = (
        "You fix SPECIFIC, LISTED problems in an existing published article. "
        "You do not rewrite anything not explicitly listed as a problem. "
        "Reply with ONLY a JSON object, no prose, no markdown fences."
    )
    user = f"""Article title: {fm.get('title')}
Category: {fm.get('category')}
Current meta_description: {fm.get('meta_description', '(none)')!r}

Specific problems to fix (ONLY these, nothing else):
{json.dumps(issues, indent=2)}

Body (for context only, first 3000 chars):
{body[:3000]}

Return a JSON object with ONLY the fields that need to change to resolve
the listed problems above:
{{
  "meta_description": "new 120-160 char description, or omit this key if meta_description wasn't a listed problem",
  "category": "corrected category, or omit if category wasn't a listed problem",
  "body_patches": [
    {{"find": "exact substring currently in the body", "replace": "corrected substring"}}
  ]
}}
Only include body_patches for issues explicitly about body content (placeholder
links/images, broken internal links). "find" must be an exact substring that
really occurs in the body above. Omit body_patches entirely if not needed."""
    return call_json(system, user, model)


def refine_one(article_path: Path, model: str) -> dict:
    """Reviews one article and, if fixable issues are found, applies
    targeted fixes IN MEMORY and returns a summary. Does not write to
    disk - the caller (refine_articles.py) decides whether/when to write,
    so this stays a pure, testable function."""
    _step(f"Reviewing {article_path.name}")
    report = _review(article_path)
    if report is None:
        return {"path": str(article_path), "status": "skipped_unparseable"}

    issues = report["issues"]
    if not issues:
        print(c("green", "  ✓ no issues found"))
        return {"path": str(article_path), "status": "clean", "issues": []}

    print(c("yellow", f"  ⚠ {len(issues)} issue(s):"))
    for i in issues:
        print(c("yellow", f"    - {i}"))

    fm, body = report["frontmatter"], report["body"]
    fixes = _generate_fixes(fm.get("title", ""), fm, body, issues, model)

    new_fm = dict(fm)
    changed_fields = []
    if "meta_description" in fixes and fixes["meta_description"]:
        new_fm["meta_description"] = fixes["meta_description"]
        changed_fields.append("meta_description")
    if "category" in fixes and fixes["category"]:
        new_fm["category"] = fixes["category"]
        changed_fields.append("category")

    new_body = body
    body_patch_count = 0
    for patch in fixes.get("body_patches", []):
        find, replace = patch.get("find", ""), patch.get("replace", "")
        if find and find in new_body:
            new_body = new_body.replace(find, replace, 1)
            body_patch_count += 1
        elif find:
            print(c("dim", f"    (skipped a body patch - exact text not found, "
                            f"safer to skip than guess: {find[:60]!r})"))

    if not changed_fields and body_patch_count == 0:
        print(c("red", "  ✗ model returned no usable fix for the listed issues - flagging for human review"))
        return {"path": str(article_path), "status": "unfixed", "issues": issues}

    print(c("green", f"  ✓ fixed: {', '.join(changed_fields) or '(none)'}"
                      f"{f' + {body_patch_count} body patch(es)' if body_patch_count else ''}"))

    return {
        "path": str(article_path),
        "status": "fixed",
        "issues": issues,
        "new_frontmatter": new_fm,
        "new_body": new_body,
        "changed_fields": changed_fields,
        "body_patch_count": body_patch_count,
    }
