"""
web_search.py — Real web search for the SEO agent, via a local SearXNG
instance (no API key, no per-query billing, no vendor account).

Design intent (see .github/workflows/daily-article.yml):
  - The workflow starts SearXNG as a `services:` container for the duration
    of the job only. GitHub exposes it on http://localhost:8080 to every
    step in that job. When the job ends, the container is gone — no
    persistent hosting, no cost, no external dependency.
  - SEARXNG_URL is set by the workflow. Locally (no SearXNG running), this
    module is silently a no-op and analyze_competitors() in modules.py
    falls back to its previous "reason from training knowledge" behavior.
  - Every function here fails soft: any error (timeout, connection refused,
    malformed response, engine outage) returns None or an empty list rather
    than raising, because losing real search data should degrade the
    article quality, not break the whole daily run.
"""
import json
import os
import urllib.parse
import urllib.request
import urllib.error

SEARXNG_URL = os.environ.get("SEARXNG_URL", "").rstrip("/")


def is_available() -> bool:
    return bool(SEARXNG_URL)


def search(query: str, max_results: int = 6, timeout: int = 8) -> list[dict]:
    """Returns a list of {"title", "url", "snippet"} dicts, or [] on any
    failure (including SearXNG not being configured at all)."""
    if not SEARXNG_URL:
        return []

    params = urllib.parse.urlencode({
        "q": query,
        "format": "json",
        "language": "en",
    })
    url = f"{SEARXNG_URL}/search?{params}"

    try:
        req = urllib.request.Request(url, headers={"Accept": "application/json"})
        with urllib.request.urlopen(req, timeout=timeout) as resp:
            data = json.loads(resp.read().decode("utf-8"))
    except (urllib.error.URLError, TimeoutError, json.JSONDecodeError, OSError) as e:
        print(f"  ⚠ web_search: SearXNG query failed ({e}) — continuing without it")
        return []

    results = []
    for item in data.get("results", [])[:max_results]:
        results.append({
            "title":   item.get("title", ""),
            "url":     item.get("url", ""),
            "snippet": item.get("content", ""),
        })
    return results


def research_keyword(keyword: str) -> dict | None:
    """High-level helper for analyze_competitors(): runs a small set of
    queries around the keyword and returns real titles/snippets/urls the
    LLM can ground its competitor analysis in, or None if search isn't
    available/returned nothing (caller should fall back gracefully)."""
    if not is_available():
        return None

    primary = search(keyword, max_results=6)
    if not primary:
        return None

    related = search(f"{keyword} guide", max_results=3)

    return {
        "top_results": primary,
        "related":     related,
        "source":      "searxng",
    }
