"""
web_search.py — real web search for the agentic pipeline, via a local
SearXNG instance. No API key, no per-query billing, no vendor account.

Why this exists: both research.py (new-article competitor analysis) and
refiner.py (existing-article competitor-gap analysis) are explicitly
documented as "LLM-knowledge-based" — the model is asked to *imagine* what
top-ranking pages look like, because no real search was ever wired in. This
module is that missing piece.

Design:
  - The workflow starts SearXNG via `docker run` (not GitHub's `services:`
    block — that starts containers before checkout, which is too early to
    mount a settings file from the repo) for the duration of the job only.
    See searxng-settings.yml. Container dies with the runner either way.
  - SEARXNG_URL is set by the workflow. Unset locally -> this module is a
    silent no-op and callers fall back to their previous LLM-only behavior.
  - Every function fails soft: any error (timeout, connection refused,
    malformed response) returns None/[] rather than raising. Losing real
    search data should degrade article quality, not break the run.
"""
from __future__ import annotations

import json
import os
import urllib.parse
import urllib.request
import urllib.error

SEARXNG_URL = os.environ.get("SEARXNG_URL", "").rstrip("/")


def is_available() -> bool:
    return bool(SEARXNG_URL)


def search(query: str, max_results: int = 6, timeout: int = 8) -> list[dict]:
    """Returns [{"title", "url", "snippet"}, ...], or [] on any failure."""
    if not SEARXNG_URL:
        return []
    params = urllib.parse.urlencode({"q": query, "format": "json", "language": "en"})
    url = f"{SEARXNG_URL}/search?{params}"
    try:
        req = urllib.request.Request(url, headers={"Accept": "application/json"})
        with urllib.request.urlopen(req, timeout=timeout) as resp:
            data = json.loads(resp.read().decode("utf-8"))
    except (urllib.error.URLError, TimeoutError, json.JSONDecodeError, OSError) as e:
        print(f"  ⚠ web_search: query failed ({e}) — continuing without it")
        return []
    return [
        {"title": r.get("title", ""), "url": r.get("url", ""), "snippet": r.get("content", "")}
        for r in data.get("results", [])[:max_results]
    ]


def research_keyword(keyword: str) -> dict | None:
    """High-level helper: a small set of real queries around the keyword.
    Returns None if search isn't available/returned nothing, so callers can
    fall back to their existing LLM-only behavior unchanged."""
    if not is_available():
        return None
    primary = search(keyword, max_results=6)
    if not primary:
        return None
    return {"top_results": primary, "source": "searxng"}
