"""
live_check.py — safety check for the Refiner Agent (refine_run.py).

Real incident this exists to prevent: on 2026-08-09, a manual refinement
pass was built against the git copy of `internet-download-manager-extension`,
which turned out to be a much thinner, older version than what was actually
live in production (a different concurrent session had updated the article
directly, and that update hadn't been fully reflected in the branch being
worked from at the time). The resulting PR would have been a content
regression if merged blindly.

This module fetches the article's LIVE page (individual article pages are
statically prerendered at build time — see scripts/prerender-articles.ts —
so a plain HTTP GET returns full real content, no headless browser needed)
and compares it against the git copy BEFORE the Refiner Agent touches
anything. If live content looks substantially richer than git, that's a
strong signal git is stale relative to production for this specific
article, and refining from the stale git copy risks reverting real
improvements. In that case, this article is skipped (not refined, not
marked as refined either, so it stays a candidate for a future run once
someone reconciles git with production) rather than guessed at.

Deliberately conservative in the other direction too: network errors,
timeouts, or the live page not existing (e.g. a brand-new article not
deployed yet) never block refinement — they're treated as "couldn't
verify, proceed" rather than "assume stale." The check only ever *skips*
an article; it never causes a false failure of the whole run.
"""
from __future__ import annotations

import re
import urllib.error
import urllib.request

SITE_BASE_URL = "https://extensionto.com"

# How much richer the live page's word count needs to be than git's before
# we treat git as stale rather than just naturally slightly different
# (minor wording differences between passes are normal and not a signal).
STALENESS_RATIO_THRESHOLD = 1.15


def _strip_html(html: str) -> str:
    text = re.sub(r"<script[\s\S]*?</script>", " ", html, flags=re.IGNORECASE)
    text = re.sub(r"<style[\s\S]*?</style>", " ", text, flags=re.IGNORECASE)
    text = re.sub(r"<[^>]+>", " ", text)
    return re.sub(r"\s+", " ", text).strip()


def _word_count(text: str) -> int:
    return len(text.split())


def check_git_matches_live(slug: str, git_body: str, timeout: int = 10) -> dict:
    """Returns a dict:
      {"status": "ok"}                         - safe to refine
      {"status": "stale_git", "live_words": N,
       "git_words": M}                         - git looks stale, skip
      {"status": "unverified", "reason": "..."} - couldn't check, proceed anyway
    """
    url = f"{SITE_BASE_URL}/blog/{slug}"
    try:
        req = urllib.request.Request(url, headers={
            "User-Agent": "Mozilla/5.0 (compatible; RefinerAgentSafetyCheck/1.0)"
        })
        with urllib.request.urlopen(req, timeout=timeout) as resp:
            html = resp.read().decode("utf-8", errors="replace")
    except (urllib.error.URLError, TimeoutError, OSError) as e:
        return {"status": "unverified", "reason": f"fetch failed: {e}"}

    live_text = _strip_html(html)
    live_words = _word_count(live_text)
    git_words = _word_count(git_body)

    if git_words == 0:
        return {"status": "unverified", "reason": "git body is empty - nothing to compare"}

    ratio = live_words / git_words
    if ratio >= STALENESS_RATIO_THRESHOLD:
        return {
            "status": "stale_git",
            "live_words": live_words,
            "git_words": git_words,
            "ratio": round(ratio, 2),
        }
    return {"status": "ok", "live_words": live_words, "git_words": git_words}
