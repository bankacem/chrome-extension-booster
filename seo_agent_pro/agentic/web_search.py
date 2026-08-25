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
from concurrent.futures import ThreadPoolExecutor, as_completed
from html.parser import HTMLParser

SEARXNG_URL = os.environ.get("SEARXNG_URL", "").rstrip("/")
OWN_DOMAINS = {"extensionto.com", "www.extensionto.com"}


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


class _StructureParser(HTMLParser):
    """Extract structural facts only; page text is data, never instructions."""

    def __init__(self) -> None:
        super().__init__(convert_charrefs=True)
        self.title = ""
        self.h1s: list[str] = []
        self.h2s: list[str] = []
        self.meta_description = ""
        self._tag = ""
        self._buffer: list[str] = []
        self._body_text: list[str] = []
        self._skip_depth = 0

    def handle_starttag(self, tag: str, attrs: list[tuple[str, str | None]]) -> None:
        attrs_dict = {k.lower(): (v or "") for k, v in attrs}
        tag = tag.lower()
        if tag in {"script", "style", "noscript"}:
            self._skip_depth += 1
            return
        if tag in {"title", "h1", "h2"}:
            self._tag = tag
            self._buffer = []
        if tag == "meta" and attrs_dict.get("name", "").lower() == "description":
            self.meta_description = attrs_dict.get("content", "")[:400]

    def handle_data(self, data: str) -> None:
        if self._skip_depth:
            return
        text = " ".join(data.split())
        if not text:
            return
        if self._tag in {"title", "h1", "h2"}:
            self._buffer.append(text)
        if self._tag not in {"script", "style", "title"}:
            self._body_text.append(text)

    def handle_endtag(self, tag: str) -> None:
        tag = tag.lower()
        if tag in {"script", "style", "noscript"}:
            self._skip_depth = max(0, self._skip_depth - 1)
            return
        if tag in {"title", "h1", "h2"}:
            value = " ".join(self._buffer).strip()
            if tag == "title" and not self.title:
                self.title = value[:300]
            elif tag == "h1" and value and len(self.h1s) < 3:
                self.h1s.append(value[:240])
            elif tag == "h2" and value and len(self.h2s) < 15:
                self.h2s.append(value[:240])
            self._tag = ""
            self._buffer = []


def _fetch_snapshot(result: dict, rank: int) -> dict:
    """Fetch one competitor page for auditable structural evidence."""
    url = result.get("url", "")
    snapshot = {"rank": rank, **result, "fetch_status": "search_only"}
    try:
        parsed = urllib.parse.urlparse(url)
        if parsed.scheme not in {"http", "https"}:
            return snapshot
        req = urllib.request.Request(url, headers={"User-Agent": "ExtensionTo-SEOResearch/1.0"})
        with urllib.request.urlopen(req, timeout=6) as resp:
            content_type = resp.headers.get("Content-Type", "")
            if "html" not in content_type.lower():
                snapshot["fetch_status"] = "non_html"
                return snapshot
            raw = resp.read(600_000)
        parser = _StructureParser()
        parser.feed(raw.decode("utf-8", errors="replace"))
        text = " ".join(parser._body_text)
        lowered = text.lower()
        raw_text = raw.decode("utf-8", errors="ignore").lower()
        snapshot.update({
            "fetch_status": "ok",
            "page_title": parser.title,
            "meta_description": parser.meta_description,
            "h1s": parser.h1s,
            "h2s": parser.h2s,
            "word_count_estimate": len(text.split()),
            "has_faq_signal": "frequently asked questions" in lowered or "faq" in lowered,
            "has_table_signal": "<table" in raw_text,
        })
    except (urllib.error.URLError, TimeoutError, OSError, UnicodeError) as exc:
        snapshot["fetch_status"] = f"fetch_failed:{type(exc).__name__}"
    return snapshot


def _select_external_top_three(results: list[dict]) -> list[dict]:
    selected: list[dict] = []
    seen_urls: set[str] = set()
    seen_domains: set[str] = set()
    for result in results:
        url = result.get("url", "")
        parsed = urllib.parse.urlparse(url)
        domain = parsed.netloc.lower().split(":", 1)[0]
        normalized = url.rstrip("/")
        if not domain or domain in OWN_DOMAINS or normalized in seen_urls or domain in seen_domains:
            continue
        seen_urls.add(normalized)
        seen_domains.add(domain)
        selected.append(result)
        if len(selected) == 3:
            break
    return selected


def research_keyword(keyword: str) -> dict | None:
    """Return up to three external competitor snapshots when search is available."""
    if not is_available():
        return None
    top_three = _select_external_top_three(search(keyword, max_results=8))
    if not top_three:
        return None
    snapshots: list[dict] = [None] * len(top_three)  # type: ignore[list-item]
    with ThreadPoolExecutor(max_workers=min(3, len(top_three))) as pool:
        jobs = {pool.submit(_fetch_snapshot, result, i + 1): i for i, result in enumerate(top_three)}
        for job in as_completed(jobs):
            snapshots[jobs[job]] = job.result()
    return {
        "top_results": snapshots,
        "competitor_count": len(snapshots),
        "source": "searxng_top_three_external",
    }
