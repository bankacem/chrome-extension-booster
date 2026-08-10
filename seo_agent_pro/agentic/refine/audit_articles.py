"""
Published-article audit — Phase 0 of the Content Refiner Agent.

No LLM calls. Pure static analysis over the 770 published articles, reusing
evaluator.py's _deterministic_checks() exactly as-is (title tag length, meta
description, dead '#' links, placeholder images, broken internal links,
empty category, fabrication guard) — with ONE deliberate override:

  The original truncation check ("does not end with sentence-ending
  punctuation") false-positives on published articles because many of them
  end in raw HTML CTA blocks (e.g. a button that literally reads "Add to
  Chrome - It's Free"), which is real HTML, not a cut-off sentence. That CTA
  HTML is injected by a *different*, older pipeline (autoExtensionLinker.ts /
  the generate-article edge function) — not by the current agentic
  content.py — so evaluator.py itself is left untouched; the fix lives here,
  scoped to auditing legacy published content.

Fixed truncation logic: strip HTML tags line-by-line, discard short lines
(<15 words — headings, buttons, labels), and judge truncation on the LAST
line that still has >=15 words, i.e. the last real paragraph of prose.

Usage:
    python3 audit_articles.py --sample 20      # quick sanity check
    python3 audit_articles.py                  # full 770-article sweep
"""

from __future__ import annotations

import argparse
import json
import re
import sys
from collections import Counter
from pathlib import Path

import yaml

REPO_ROOT = Path(__file__).resolve().parents[3]
ARTICLES_DIR = REPO_ROOT / "public" / "content" / "articles"
AGENTIC_ROOT = REPO_ROOT / "seo_agent_pro"

sys.path.insert(0, str(AGENTIC_ROOT))
sys.path.insert(0, str(AGENTIC_ROOT / "agentic" / "agents"))
from evaluator import _deterministic_checks  # noqa: E402

TRUNCATION_PREFIX = "body does not end with sentence-ending punctuation"
END_PUNCT_RE = re.compile(r'[.!?"\')\]\u2019\u201d]$|```$')
TAG_RE = re.compile(r"<[^>]+>")


def parse_article(path: Path) -> dict | None:
    raw = path.read_text(encoding="utf-8")
    if not raw.startswith("---"):
        return None
    parts = raw.split("---", 2)
    if len(parts) < 3:
        return None
    try:
        front = yaml.safe_load(parts[1]) or {}
    except yaml.YAMLError:
        return None
    body = parts[2].lstrip("\n")
    return {
        "path": path,
        "slug": front.get("slug", path.stem),
        "title": front.get("title", ""),
        "seo_title": front.get("seo_title"),
        "meta_description": front.get("meta_description", ""),
        "category": front.get("category", ""),
        "published_at": front.get("published_at"),
        "body": body,
    }


def last_substantial_line(body: str) -> str | None:
    """Last line with >=15 words after stripping HTML tags — i.e. the last
    real prose paragraph, ignoring trailing short CTA/button/heading lines."""
    substantial = []
    all_lines = []
    for line in body.split("\n"):
        text = TAG_RE.sub(" ", line)
        text = re.sub(r"\s+", " ", text).strip()
        if not text:
            continue
        all_lines.append(text)
        if len(text.split()) >= 15:
            substantial.append(text)
    if substantial:
        return substantial[-1]
    return all_lines[-1] if all_lines else None


def fixed_truncation_issue(body: str) -> str | None:
    last = last_substantial_line(body)
    if not last:
        return None
    # markdown emphasis closers (*text.* or _text._) sit after the real
    # sentence-ending punctuation — strip them before judging truncation,
    # otherwise every italicized closing line false-positives.
    judged = re.sub(r"[*_]+$", "", last).rstrip()
    if not judged:
        judged = last
    if not END_PUNCT_RE.search(judged):
        snippet = last if len(last) <= 80 else "…" + last[-80:]
        return f"{TRUNCATION_PREFIX} (last prose line: \"{snippet}\")"
    return None


def audit_one(article: dict) -> dict:
    state = {
        "title": article["title"],
        "seo_title": article["seo_title"],
        "meta_description": article["meta_description"],
        "body": article["body"],
        "category": article["category"],
    }
    issues = [
        i for i in _deterministic_checks(state)
        if not i.startswith(TRUNCATION_PREFIX)
    ]
    trunc = fixed_truncation_issue(article["body"])
    if trunc:
        issues.append(trunc)

    return {
        "slug": article["slug"],
        "path": str(article["path"].relative_to(REPO_ROOT)),
        "published_at": article["published_at"],
        "issues": issues,
        "issue_count": len(issues),
    }


def main() -> None:
    ap = argparse.ArgumentParser()
    ap.add_argument("--sample", type=int, default=None,
                     help="only audit the first N articles (sorted by path)")
    ap.add_argument("--out", default=str(Path(__file__).parent / "audit_report.json"))
    args = ap.parse_args()

    md_files = sorted(ARTICLES_DIR.rglob("*.md"))
    if args.sample:
        md_files = md_files[:args.sample]

    results = []
    parse_failures = []
    for path in md_files:
        article = parse_article(path)
        if article is None:
            parse_failures.append(str(path.relative_to(REPO_ROOT)))
            continue
        results.append(audit_one(article))

    total = len(results)
    clean = sum(1 for r in results if r["issue_count"] == 0)
    with_issues = total - clean

    issue_type_counts = Counter()
    for r in results:
        for issue in r["issues"]:
            # bucket by the stable prefix before any dynamic detail
            key = issue.split(":")[0].split(" (")[0][:60]
            issue_type_counts[key] += 1

    report = {
        "total_articles": total,
        "parse_failures": parse_failures,
        "clean": clean,
        "with_issues": with_issues,
        "issue_type_counts": issue_type_counts.most_common(),
        "articles": sorted(results, key=lambda r: -r["issue_count"]),
    }

    Path(args.out).write_text(json.dumps(report, indent=2, default=str), encoding="utf-8")

    print(f"Audited {total} articles ({len(parse_failures)} parse failures)")
    print(f"  Clean (0 issues):   {clean}")
    print(f"  With >=1 issue:     {with_issues}")
    print("\nIssue type breakdown:")
    for issue_type, count in issue_type_counts.most_common():
        print(f"  {count:4d}  {issue_type}")
    print(f"\nFull report written to {args.out}")


if __name__ == "__main__":
    main()
