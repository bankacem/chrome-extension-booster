"""
Article Audit — Phase 1 of the Content Refiner pipeline.

Deliberately makes ZERO LLM calls. It reuses evaluator._deterministic_checks()
— the exact same function the daily/agentic pipeline already runs on new
drafts before publish — and applies it to every ALREADY-PUBLISHED article on
disk. This gives a real, reproducible quality signal before we spend a single
token on rewriting anything.

Output: a ranked JSON report (worst articles first) that refine_run.py will
later consume to pick what to refine, and in what order.

Usage:
    python3 audit_articles.py                # audit everything, print summary
    python3 audit_articles.py --limit 20      # audit only first 20 (fast test)
    python3 audit_articles.py --out report.json
"""

from __future__ import annotations

import argparse
import json
import re
import sys
from datetime import datetime, timezone
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent / "agents"))
sys.path.insert(0, str(Path(__file__).resolve().parent.parent))  # seo_agent_pro/

import yaml  # PyYAML — already a transitive dep via other tooling

# Reuse the REAL deterministic checks — not a reimplementation.
from evaluator import _deterministic_checks  # noqa: E402

ROOT = Path(__file__).resolve().parents[2]
ARTICLES_DIR = ROOT / "public" / "content" / "articles"
INDEX_FILE = ROOT / "public" / "content" / "articles-index.json"

FRONTMATTER_RE = re.compile(r"^---\n(.*?)\n---\n(.*)$", re.DOTALL)


def _parse_article(path: Path) -> dict | None:
    raw = path.read_text(encoding="utf-8", errors="replace")
    m = FRONTMATTER_RE.match(raw)
    if not m:
        return None
    try:
        meta = yaml.safe_load(m.group(1)) or {}
    except yaml.YAMLError:
        return None
    body = m.group(2)

    return {
        "path": str(path.relative_to(ROOT)),
        "slug": meta.get("slug", path.stem),
        "title": meta.get("title", ""),
        "seo_title": meta.get("seo_title"),
        "meta_description": meta.get("meta_description", ""),
        "category": meta.get("category", ""),
        "keywords": meta.get("keywords", []) or [],
        "published_at": meta.get("published_at"),
        "updated_at": meta.get("updated_at"),
        "body": body,
    }


def _extra_published_content_checks(article: dict) -> list[str]:
    """Checks specific to PUBLISHED content, on top of evaluator's draft
    checks (which don't know about publish dates, staleness, or keyword
    presence in body — those don't apply to a not-yet-published draft)."""
    issues = []
    body = article["body"]
    word_count = len(re.findall(r"\S+", body))

    if word_count < 400:
        issues.append(f"very short published article ({word_count} words)")

    keywords = article.get("keywords") or []
    if keywords:
        primary = str(keywords[0]).lower()
        if primary and primary not in body.lower():
            issues.append(f"primary keyword '{primary}' does not appear in body at all")

    if not article.get("keywords"):
        issues.append("no keywords set in frontmatter (untargeted for SEO)")

    updated = article.get("updated_at") or article.get("published_at")
    if updated:
        try:
            dt = datetime.fromisoformat(str(updated).replace("Z", "+00:00"))
            if dt.tzinfo is None:
                dt = dt.replace(tzinfo=timezone.utc)
            age_days = (datetime.now(timezone.utc) - dt).days
            if age_days > 365:
                issues.append(f"not updated in {age_days} days (stale)")
        except ValueError:
            pass

    # Legacy-generation smell: generic AI-fluff openers seen in the older
    # article batch (e.g. "boosting-your-browsing-experience.md").
    opener = body.strip()[:400].lower()
    if re.search(r"are you tired of|in today's (fast[- ]paced|digital)|in this article, we will (delve|explore)", opener):
        issues.append("generic AI-fluff opening paragraph (legacy-generation pattern)")

    if re.search(r"article length:\s*~?\d|ready to copy[- ]paste|copy[- ]paste into your (cms|site|blog)", body, re.IGNORECASE):
        issues.append("body contains leftover LLM generation notes visible to readers (e.g. word count / copy-paste instructions) — was not cleaned before publish")

    return issues


TRUNCATION_MSG = "body does not end with sentence-ending punctuation (looks truncated mid-sentence/mid-word)"
HTML_TAG_RE = re.compile(r"<[^>]+>")


def _real_truncation_check(body: str) -> list[str]:
    """Replaces evaluator.py's truncation check for PUBLISHED articles only.

    evaluator._deterministic_checks() checks whether the raw body string ends
    with sentence punctuation — correct for a freshly-drafted markdown body
    (which is exactly what it's used for in the live pipeline), but wrong
    here: many published articles legitimately end with an HTML CTA block
    (e.g. an "Add to Chrome" button div), not prose. Stripping HTML tags
    before judging truncation removes that false positive while still
    catching genuine truncation (a body that ends mid-sentence has no
    trailing tag to hide behind either way).
    """
    p_tags = re.findall(r"<p[^>]*>(.*?)</p>", body, re.DOTALL)
    if p_tags:
        last_p = HTML_TAG_RE.sub(" ", p_tags[-1])
        last_p = re.sub(r"\s+", " ", last_p).strip()
        if last_p and not re.search(r'[.!?"\')\]\u2019\u201d]$', last_p):
            return [TRUNCATION_MSG]
        return []

    # Pure-markdown article (no <p> tags at all) — fall back to the last
    # substantial blank-line-delimited block.
    blocks = re.split(r"\n\s*\n", body)
    for block in reversed(blocks):
        text = HTML_TAG_RE.sub(" ", block)
        text = re.sub(r"\s+", " ", text).strip()
        if len(text.split()) < 15:
            continue  # too short to be a real prose paragraph — likely a CTA/widget block, skip it
        stripped = text.rstrip("*_ ")
        if len(stripped.split()) < 15:
            continue
        if not re.search(r'[.!?"\')\]\u2019\u201d]$|```$', stripped):
            return [TRUNCATION_MSG]
        return []  # found the last real prose block and it's fine
    return []  # no substantial prose block found at all — nothing reliable to flag


def audit_one(path: Path) -> dict | None:
    article = _parse_article(path)
    if article is None:
        return {"path": str(path.relative_to(ROOT)), "parse_error": True, "triage_score": 0, "issue_count": 1, "issues": ["frontmatter parse failed"]}

    det_issues = _deterministic_checks(article)  # the REAL evaluator function
    # Drop evaluator's raw-string truncation verdict (false-positives on
    # HTML CTA blocks) and replace with the HTML-aware version above.
    det_issues = [i for i in det_issues if i != TRUNCATION_MSG]
    det_issues += _real_truncation_check(article["body"])

    extra_issues = _extra_published_content_checks(article)
    all_issues = det_issues + extra_issues

    # Simple deterministic score: 100 minus 12 per issue, floor 0.
    # This is NOT the LLM 0-100 quality score from evaluator.py (we're not
    # calling any LLM here) — it's a cheap triage score to rank 770 articles
    # before we decide which ones are even worth an LLM pass.
    score = max(0, 100 - 12 * len(all_issues))

    return {
        "path": article["path"],
        "slug": article["slug"],
        "title": article["title"],
        "category": article["category"],
        "issues": all_issues,
        "issue_count": len(all_issues),
        "triage_score": score,
    }


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--limit", type=int, default=None)
    parser.add_argument("--out", type=str, default=None)
    args = parser.parse_args()

    if not ARTICLES_DIR.exists():
        print(f"ERROR: {ARTICLES_DIR} not found", file=sys.stderr)
        sys.exit(1)

    paths = sorted(p for p in ARTICLES_DIR.rglob("*.md") if p.name.lower() != "readme.md")
    if args.limit:
        paths = paths[: args.limit]

    print(f"Auditing {len(paths)} articles (no LLM calls, deterministic checks only)...\n")

    results = []
    for p in paths:
        r = audit_one(p)
        if r:
            results.append(r)

    results.sort(key=lambda r: r["triage_score"])  # worst first

    total = len(results)
    parse_errors = sum(1 for r in results if r.get("parse_error"))
    avg_issues = sum(r.get("issue_count", 0) for r in results) / max(1, total)
    clean = sum(1 for r in results if r.get("issue_count") == 0)

    print(f"Total articles audited : {total}")
    print(f"Parse errors           : {parse_errors}")
    print(f"Zero-issue articles    : {clean} ({clean / max(1,total) * 100:.1f}%)")
    print(f"Average issues/article : {avg_issues:.2f}\n")

    print("Worst 15 (highest priority for refinement):")
    for r in results[:15]:
        print(f"  [{r['triage_score']:>3}] {r.get('slug','?'):<55} {r.get('issue_count',0)} issue(s)")
        for issue in r.get("issues", [])[:3]:
            print(f"         - {issue}")

    if args.out:
        Path(args.out).write_text(json.dumps(results, indent=2, ensure_ascii=False), encoding="utf-8")
        print(f"\nFull report written to {args.out}")


if __name__ == "__main__":
    main()
