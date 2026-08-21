"""
Refiner Agent orchestration — 8th agent, oldest-published-first.

Picks the OLDEST published article that hasn't been refined yet (tracked in
agentic/memory/refined_articles.json, the same pattern keyword_queue.txt /
daily_article_state.json already use for the Content Agent), runs the
Refiner Agent on it (metadata fixes + one competitor-gap section, see
agents/refiner.py), writes the file back, and records the cycle in the same
long-term memory the other 7 agents use — so refinement cycles show up in
cycle_log.json and can be surfaced by relevant_past_cycles() just like
generation cycles.

Usage:
    python3 refine_run.py                 # refine the single oldest un-refined article
    python3 refine_run.py --count 5        # refine the 5 oldest un-refined articles
    python3 refine_run.py --slug some-slug # force a specific article regardless of order
"""

from __future__ import annotations

import argparse
import glob
import json
import os
import re
import sys
from datetime import date
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))
sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

import yaml
from llm_router import find_working_model, c
from agentic import memory_store
from agentic.agents import refiner
from agentic import live_check

ROOT = Path(__file__).resolve().parents[2]
ARTICLES_DIR = ROOT / "public" / "content" / "articles"
REFINED_LOG_PATH = Path(__file__).resolve().parent / "memory" / "refined_articles.json"
STALE_FLAGGED_LOG_PATH = Path(__file__).resolve().parent / "memory" / "stale_git_flagged.json"

MODEL_FALLBACK_CHAIN = [
    "bluesminds-gpt4o",
    "llama-3.1-70b-groq",
    "gpt-4o-mini",
    "claude-haiku",
]


def _load_refined_slugs() -> set[str]:
    if not REFINED_LOG_PATH.exists():
        return set()
    try:
        return set(json.loads(REFINED_LOG_PATH.read_text(encoding="utf-8")))
    except json.JSONDecodeError:
        return set()


def _mark_refined(slug: str) -> None:
    slugs = _load_refined_slugs()
    slugs.add(slug)
    REFINED_LOG_PATH.parent.mkdir(exist_ok=True)
    REFINED_LOG_PATH.write_text(
        json.dumps(sorted(slugs), indent=2, ensure_ascii=False), encoding="utf-8"
    )


def _load_stale_flagged() -> dict:
    """slug -> details dict, for articles where git looked stale vs. live
    production the last time we checked. Kept separate from the normal
    refined-slugs log because these are NOT done - they're skipped pending
    a human reconciling git with production, and should stay visible."""
    if not STALE_FLAGGED_LOG_PATH.exists():
        return {}
    try:
        return json.loads(STALE_FLAGGED_LOG_PATH.read_text(encoding="utf-8"))
    except json.JSONDecodeError:
        return {}


def _mark_stale_flagged(slug: str, details: dict) -> None:
    flagged = _load_stale_flagged()
    flagged[slug] = details
    STALE_FLAGGED_LOG_PATH.parent.mkdir(exist_ok=True)
    STALE_FLAGGED_LOG_PATH.write_text(
        json.dumps(flagged, indent=2, ensure_ascii=False), encoding="utf-8"
    )


def _parse(path: Path):
    text = path.read_text(encoding="utf-8")
    m = re.match(r"^---\n(.*?)\n---\n(.*)$", text, re.DOTALL)
    if not m:
        return None, None
    return yaml.safe_load(m.group(1)), m.group(2)


def _oldest_unrefined_articles(count: int, forced_slug: str | None) -> list[Path]:
    files = glob.glob(str(ARTICLES_DIR / "**" / "*.md"), recursive=True)
    refined = _load_refined_slugs()
    stale_flagged = set(_load_stale_flagged().keys())

    candidates = []
    for f in files:
        fm, _ = _parse(Path(f))
        if not fm or str(fm.get("status", "")).lower() != "published":
            continue
        slug = fm.get("slug", "")
        if forced_slug:
            if slug == forced_slug:
                return [Path(f)]
            continue
        if slug in refined or slug in stale_flagged:
            continue
        published_at = str(fm.get("published_at") or "")
        candidates.append((published_at, Path(f)))

    candidates.sort(key=lambda x: x[0])  # oldest first (empty/missing dates sort first too)
    return [p for _, p in candidates[:count]]


def _write_back(path: Path, fm: dict, body: str) -> None:
    # Use a real YAML dumper for the whole frontmatter block instead of a
    # hand-rolled per-key formatter — the previous version's fallback for
    # non-str/list values (dicts, e.g. an existing HowTo 'schema' field) just
    # str()'d them, which happens to produce valid YAML flow syntax for
    # simple cases (confirmed on this run) but isn't a rule you can rely on
    # for arbitrarily nested data. yaml.safe_dump is the actually-correct tool.
    frontmatter_yaml = yaml.safe_dump(
        fm, allow_unicode=True, sort_keys=False, default_flow_style=False, width=1000
    )
    path.write_text(f"---\n{frontmatter_yaml}---\n{body}", encoding="utf-8")


def refine_one(path: Path, model: str) -> dict:
    fm, body = _parse(path)
    if fm is None:
        return {"path": str(path), "skipped": "no frontmatter"}

    slug = fm.get("slug", "")
    check = live_check.check_git_matches_live(slug, body)
    if check["status"] == "stale_git":
        print(c("red", f"  ✗ SKIPPING - git looks stale vs. live production "
                        f"(live: {check['live_words']} words, git: {check['git_words']} words, "
                        f"ratio {check['ratio']}x). Flagged for manual reconciliation, not touched."))
        _mark_stale_flagged(slug, check)
        return {"path": str(path), "slug": slug, "skipped": "stale_git", "live_check": check}
    elif check["status"] == "unverified":
        print(c("dim", f"  · live-vs-git check inconclusive ({check['reason']}) - proceeding anyway"))
    else:
        print(c("dim", f"  · live-vs-git check OK (live: {check['live_words']}w, git: {check['git_words']}w)"))

    result = refiner.run({
        "frontmatter": fm,
        "body": body,
        "active_model": model,
        "keyword": (fm.get("keywords") or [fm.get("title", "")])[0],
    })

    # Refinements are attributed to the fictional editorial reviewer profile.
    result["frontmatter"]["author"] = "Frah Nssim"
    result["frontmatter"]["last_updated"] = date.today().isoformat()
    _write_back(path, result["frontmatter"], result["body"])
    _mark_refined(fm.get("slug", str(path)))

    gap = result.get("gap_analysis", {})
    memory_store.append_cycle({
        "keyword": (fm.get("keywords") or [fm.get("title", "")])[0],
        "model": model,
        "cycle_type": "refinement",
        "score": None,
        "approved": True,
        "deterministic_issues": [],
        "llm_issues": [],
        "category": fm.get("category"),
        "final_status": "refined",
        "competitor_source": gap.get("research_source", "llm_estimate"),
        "competitor_count": gap.get("competitor_count", 0),
        "competitor_urls": gap.get("competitor_urls", []),
        "gaps_added_titles": result.get("gaps_added_titles", []),
        "notes": (
            f"Metadata changes: {list(result.get('metadata_changes', {}).keys())}. "
            f"Gap added: {result.get('gap_added')}"
            + (f" — {gap.get('gap_title')}" if result.get("gap_added") else "")
        ),
    })

    return {
        "path": str(path),
        "slug": fm.get("slug"),
        "metadata_changes": result.get("metadata_changes"),
        "gap_added": result.get("gap_added"),
        "gap_title": gap.get("gap_title") if result.get("gap_added") else None,
    }


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--count", type=int, default=1)
    parser.add_argument("--slug", default=None)
    args = parser.parse_args()

    targets = _oldest_unrefined_articles(args.count, args.slug)
    print(f"{c('bold', '=== Refiner Agent (oldest-first) ===')}")
    print(f"Articles to process: {len(targets)}\n")
    if not targets:
        print(c("dim", "Nothing left to refine — every published article has already "
                        "been through the Refiner Agent at least once."))
        return

    forced_model = os.environ.get("SEO_AGENT_MODEL")
    model = forced_model or find_working_model(MODEL_FALLBACK_CHAIN)
    print(f"Using model: {model!r}\n")

    stale_skipped = 0
    for path in targets:
        rel = path.relative_to(ROOT)
        print(c("bold", f"\n=== {rel} ==="))
        try:
            result = refine_one(path, model)
        except Exception as e:
            print(c("red", f"  ✗ error: {e}"))
            continue
        if result.get("skipped") == "stale_git":
            stale_skipped += 1
            continue
        if result.get("metadata_changes"):
            print(c("green", f"  metadata fixed: {list(result['metadata_changes'].keys())}"))
        if result.get("gap_added"):
            print(c("yellow", f"  section added: {result.get('gap_title')}"))

    if stale_skipped:
        print(c("yellow", f"\n⚠ {stale_skipped} article(s) skipped this run because git looked "
                           f"stale vs. live production - see seo_agent_pro/agentic/memory/"
                           f"stale_git_flagged.json. These need a human to reconcile git with "
                           f"production before the Refiner Agent will touch them again."))


if __name__ == "__main__":
    main()
