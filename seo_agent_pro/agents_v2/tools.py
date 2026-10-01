"""agents_v2.tools — least-privilege, read-only tools for the research agents.

Owner spec: three parallel researchers "قراءة فقط عبر SearXNG وجلب صفحة
بقائمة سماح نطاقات". Everything here is READ-ONLY; every result is wrapped
as {"_meta": ..., "data": ...} so that fetched content stays DATA, never
instructions (the injection defense is tested in model_fit + agent tests).

No network in unit tests — tests inject a `_http_get`-level fake.
"""
from __future__ import annotations

import json
import re
import urllib.parse
import urllib.request

# ── allowlist (owner spec: قائمة سماح نطاقات) ───────────────────────────────
FETCH_ALLOWED_HOSTS = (
    "en.wikipedia.org",
    "developer.mozilla.org",
    "developer.chrome.com",
)
FETCH_TIMEOUT_SECONDS = 15
FETCH_MAX_CHARS = 6000
SEARCH_MAX_RESULTS = 8


class ToolDenied(Exception):
    """Raised when a request violates the least-privilege rules."""


def _http_get(url: str, timeout: int) -> bytes:
    req = urllib.request.Request(url, headers={
        "User-Agent": "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 "
                      "(KHTML, like Gecko) Chrome/126.0 Safari/537.36",
        "Accept": "application/json, text/html;q=0.9",
    })
    with urllib.request.urlopen(req, timeout=timeout) as resp:
        return resp.read()


def web_search(query: str, n: int = 5, base_url: str | None = None,
               http_get=None) -> dict:
    """SearXNG search (local service container). Returns up to n results."""
    n = max(1, min(int(n), SEARCH_MAX_RESULTS))
    base = (base_url or __import__("os").environ.get("SEARXNG_BASE_URL",
            "http://localhost:8080")).rstrip("/")
    url = f"{base}/search?" + urllib.parse.urlencode(
        {"q": query, "format": "json", "language": "en"})
    getter = http_get or _http_get
    body = getter(url, FETCH_TIMEOUT_SECONDS)
    data = json.loads(body.decode("utf-8", errors="replace"))
    results = []
    for r in (data.get("results") or [])[:n]:
        results.append({
            "title": str(r.get("title", ""))[:200],
            "url": str(r.get("url", ""))[:300],
            "snippet": str(r.get("content", ""))[:400],
        })
    return {"_meta": {"tool": "web_search", "query": query, "count": len(results)},
            "data": {"results": results}}


def fetch_page(url: str, http_get=None) -> dict:
    """Fetch ONE page from an allowlisted host; returns stripped text only."""
    parsed = urllib.parse.urlparse(url if "://" in url else "https://" + url)
    host = (parsed.hostname or "").lower()
    if host not in FETCH_ALLOWED_HOSTS:
        raise ToolDenied(
            f"fetch_page denied: {host!r} not in allowlist "
            f"{list(FETCH_ALLOWED_HOSTS)} (least privilege)")
    if parsed.scheme not in ("http", "https"):
        raise ToolDenied("fetch_page denied: scheme must be http(s)")
    getter = http_get or _http_get
    raw = getter(url, FETCH_TIMEOUT_SECONDS)
    text = raw.decode("utf-8", errors="replace")
    if host == "en.wikipedia.org" or "<html" in text[:500].lower():
        text = _html_to_text(text)
    return {"_meta": {"tool": "fetch_page", "url": url, "host": host,
                      "truncated": len(text) > FETCH_MAX_CHARS},
            "data": {"url": url, "text": text[:FETCH_MAX_CHARS]}}


_TAG_RE = re.compile(r"<(script|style)[^>]*>[\s\S]*?</\1>|<[^>]+>", re.I)


def _html_to_text(html: str) -> str:
    text = _TAG_RE.sub(" ", html)
    text = re.sub(r"&nbsp;|&#160;", " ", text)
    text = re.sub(r"&amp;", "&", text)
    text = re.sub(r"[ \t]+", " ", text)
    text = re.sub(r"\n\s*\n+", "\n\n", text)
    return text.strip()
