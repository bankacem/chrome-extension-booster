"""Measure real Google performance and feed conservative signals to memory.

This job never rewrites or publishes an article. It stores page-level GSC
snapshots and creates a lesson only after two comparable windows show the same
signal with enough impressions. A signal is evidence, not proof of causality.
"""
from __future__ import annotations

import argparse
import json
from datetime import datetime, timezone
from pathlib import Path

from gsc_client import fetch_page_performance, inspect_url
from agentic import memory_store

ROOT = Path(__file__).resolve().parents[1]
INDEX_PATH = ROOT / "public" / "content" / "articles-index.json"
PERFORMANCE_LOG_PATH = Path(__file__).resolve().parent / "agentic" / "memory" / "performance_log.json"


def _load_articles() -> list[dict]:
    if not INDEX_PATH.exists():
        return []
    try:
        data = json.loads(INDEX_PATH.read_text(encoding="utf-8"))
    except json.JSONDecodeError:
        return []
    return [a for a in data if a.get("slug") and a.get("status", "published") == "published"]


def _load_log() -> list[dict]:
    if not PERFORMANCE_LOG_PATH.exists():
        return []
    try:
        return json.loads(PERFORMANCE_LOG_PATH.read_text(encoding="utf-8"))
    except json.JSONDecodeError:
        return []


def _save_log(log: list[dict]) -> None:
    PERFORMANCE_LOG_PATH.parent.mkdir(exist_ok=True)
    PERFORMANCE_LOG_PATH.write_text(json.dumps(log[-2000:], indent=2, ensure_ascii=False), encoding="utf-8")


def _page_url(article: dict) -> str:
    return f"https://extensionto.com/blog/{article['slug']}"


def _propose_evidence_lessons(previous: list[dict], current: dict) -> list[str]:
    """Return lessons only for repeated, measurable signals; avoid causality claims."""
    if not previous or current.get("impressions", 0) < 100:
        return []
    prior = previous[-1]
    if prior.get("impressions", 0) < 100:
        return []
    lessons: list[str] = []
    current_ctr = float(current.get("ctr", 0))
    prior_ctr = float(prior.get("ctr", 0))
    current_position = current.get("average_position")
    prior_position = prior.get("average_position")
    if current_ctr - prior_ctr >= 0.01 and current_position is not None and prior_position is not None and abs(current_position - prior_position) <= 3:
        lessons.append("Treat a sustained CTR increase of at least one percentage point across comparable GSC windows, without a large position change, as evidence worth studying in the article's title and meta description; do not assume causality from one window.")
    if prior_position is not None and current_position is not None and prior_position - current_position >= 2 and current.get("impressions", 0) >= 100:
        lessons.append("When a page's average GSC position improves by at least two positions with meaningful impressions, preserve the article's intent coverage and internal-link structure as a candidate successful pattern; verify across another window before generalizing.")
    return lessons


def run(limit: int = 25, slug: str | None = None) -> dict:
    articles = _load_articles()
    if slug:
        articles = [a for a in articles if a.get("slug") == slug]
    articles = articles[:max(1, limit)]
    log = _load_log()
    snapshots: list[dict] = []
    lessons_added: list[str] = []
    for article in articles:
        url = _page_url(article)
        performance = fetch_page_performance(url)
        inspection = inspect_url(url)
        snapshot = {
            "slug": article["slug"],
            "title": article.get("title"),
            "url": url,
            "recorded_at": datetime.now(timezone.utc).isoformat(),
            "performance": performance,
            "inspection": inspection,
        }
        prior = [
            row["performance"] for row in log
            if row.get("slug") == article["slug"] and row.get("performance", {}).get("source") == performance.get("source")
        ]
        for lesson in _propose_evidence_lessons(prior, performance):
            if memory_store.add_positive_pattern_if_new(lesson):
                lessons_added.append(lesson)
        snapshots.append(snapshot)
        log.append(snapshot)
    _save_log(log)
    return {"pages_checked": len(snapshots), "lessons_added": lessons_added, "snapshots": snapshots}


if __name__ == "__main__":
    parser = argparse.ArgumentParser()
    parser.add_argument("--limit", type=int, default=25)
    parser.add_argument("--slug", default=None)
    args = parser.parse_args()
    result = run(limit=args.limit, slug=args.slug)
    print(json.dumps(result, ensure_ascii=False, indent=2))
