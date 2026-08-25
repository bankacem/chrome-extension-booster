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

from gsc_client import fetch_page_performance, fetch_site_performance, inspect_url
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


MIN_LEARNING_IMPRESSIONS = 500


def _propose_evidence_lessons(
    previous_rows: list[dict],
    current: dict,
    current_baseline: dict,
) -> list[str]:
    """Return conservative lessons only after page + site-control evidence.

    Two comparable windows are required. The page must have at least 500
    impressions in both windows, and the page signal must beat the site's
    aggregate movement rather than merely move during a global trend.
    """
    if not previous_rows:
        return []
    prior_row = previous_rows[-1]
    prior = prior_row.get("performance", {})
    prior_baseline = prior_row.get("site_baseline", {})
    if min(float(current.get("impressions", 0)), float(prior.get("impressions", 0))) < MIN_LEARNING_IMPRESSIONS:
        return []
    if min(float(current_baseline.get("impressions", 0)), float(prior_baseline.get("impressions", 0))) < MIN_LEARNING_IMPRESSIONS:
        return []

    current_ctr = float(current.get("ctr", 0))
    prior_ctr = float(prior.get("ctr", 0))
    site_ctr_delta = float(current_baseline.get("ctr", 0)) - float(prior_baseline.get("ctr", 0))
    page_ctr_delta = current_ctr - prior_ctr
    current_position = current.get("average_position")
    prior_position = prior.get("average_position")
    current_site_position = current_baseline.get("average_position")
    prior_site_position = prior_baseline.get("average_position")
    if None in {current_position, prior_position, current_site_position, prior_site_position}:
        return []

    lessons: list[str] = []
    page_position_change = float(prior_position) - float(current_position)
    site_position_change = float(prior_site_position) - float(current_site_position)
    # +1 percentage point beyond the site's own CTR movement, with stable page position.
    if page_ctr_delta >= 0.01 and (page_ctr_delta - site_ctr_delta) >= 0.01 and abs(float(current_position) - float(prior_position)) <= 3:
        lessons.append("Across comparable GSC windows with at least 500 page impressions, a page-level CTR increase of at least one percentage point beyond the site's baseline, with stable average position, is evidence worth studying in the title and meta description; it is not proof of causality.")
    # Two-position page improvement that is not explained by a site-wide shift.
    if page_position_change >= 2 and (page_position_change - site_position_change) >= 2:
        lessons.append("Across comparable GSC windows with at least 500 page impressions, preserve intent coverage and internal-link structure as candidate successful patterns when page position improves by at least two positions beyond the site's baseline; verify another window before generalizing.")
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
        site_baseline = fetch_site_performance()
        inspection = inspect_url(url)
        snapshot = {
            "slug": article["slug"],
            "title": article.get("title"),
            "url": url,
            "recorded_at": datetime.now(timezone.utc).isoformat(),
            "performance": performance,
            "site_baseline": site_baseline,
            "inspection": inspection,
        }
        prior_rows = [
            row for row in log
            if row.get("slug") == article["slug"] and row.get("performance", {}).get("source") == performance.get("source")
        ]
        for lesson in _propose_evidence_lessons(prior_rows, performance, site_baseline):
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
