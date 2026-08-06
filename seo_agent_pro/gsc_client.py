"""
Google Search Console client — used to source real keyword candidates from
actual search demand data instead of purely from the hand-written
keyword_queue.txt list.

Uses a service-account JSON key (long-lived) via google-auth's standard
JWT-bearer flow — NOT a raw OAuth access token, which expires in about an
hour and is useless as a static secret for a daily cron job.

Setup required (one-time, must be done by a human with access to the
Search Console property — this cannot be automated from code):
  1. Set GSC_SERVICE_ACCOUNT_JSON as a GitHub Actions secret containing the
     full service-account JSON key content (same key already used for
     GOOGLE_INDEXING_KEY works fine — it's the same Google Cloud identity,
     this just requests a different OAuth scope).
  2. In Google Search Console -> Settings -> Users and permissions, add
     the service account's client_email as a user (Restricted is enough
     for read-only queries) on the extensionto.com property. Without this
     step, every call fails with 403 regardless of how correct the key is.

Every function here fails closed: any missing config, auth error, or API
error returns None / an empty list rather than raising, so a Search
Console outage or misconfiguration never breaks the daily article run —
it just falls back to the manual keyword_queue.txt exactly as before.
"""

from __future__ import annotations

import json
import os
from datetime import datetime, timedelta, timezone

import requests
from google.oauth2 import service_account

SCOPES = ["https://www.googleapis.com/auth/webmasters.readonly"]
SITE_URL = "sc-domain:extensionto.com"
QUERY_URL = (
    f"https://www.googleapis.com/webmasters/v3/sites/"
    f"{SITE_URL.replace(':', '%3A')}/searchAnalytics/query"
)
TIMEOUT_SECONDS = 30


def _load_credentials():
    raw = os.getenv("GSC_SERVICE_ACCOUNT_JSON", "")
    if not raw:
        return None
    try:
        info = json.loads(raw)
        return service_account.Credentials.from_service_account_info(
            info, scopes=SCOPES
        )
    except Exception as e:
        print(f"  ⚠ GSC: failed to load service account credentials: {e}")
        return None


def _get_access_token(creds) -> str | None:
    try:
        from google.auth.transport.requests import Request
        creds.refresh(Request())
        return creds.token
    except Exception as e:
        print(f"  ⚠ GSC: token refresh failed: {e}")
        return None


def fetch_opportunity_keywords(max_results: int = 15) -> list[dict]:
    """
    Returns real queries the site already gets IMPRESSIONS for (people are
    searching them and seeing extensionto.com in results) but with a weak
    average position (>10, i.e. not on page 1) or very low click-through —
    these are genuine, evidenced content opportunities, not guesses.

    Each item: {"query": str, "impressions": int, "clicks": int, "position": float}
    Returns [] on any failure (missing creds, auth error, API error, no data).
    """
    creds = _load_credentials()
    if creds is None:
        return []

    token = _get_access_token(creds)
    if not token:
        return []

    end = datetime.now(timezone.utc).date()
    start = end - timedelta(days=28)

    try:
        resp = requests.post(
            QUERY_URL,
            headers={
                "Authorization": f"Bearer {token}",
                "Content-Type": "application/json",
            },
            json={
                "startDate": start.isoformat(),
                "endDate": end.isoformat(),
                "dimensions": ["query"],
                "rowLimit": 250,
            },
            timeout=TIMEOUT_SECONDS,
        )
    except Exception as e:
        print(f"  ⚠ GSC: request failed: {e}")
        return []

    if resp.status_code == 403:
        print(
            "  ⚠ GSC: 403 Forbidden — the service account probably hasn't "
            "been added as a user in Search Console for this property yet "
            "(Settings -> Users and permissions)."
        )
        return []
    if not resp.ok:
        print(f"  ⚠ GSC: API returned {resp.status_code}: {resp.text[:300]}")
        return []

    try:
        rows = resp.json().get("rows", [])
    except Exception as e:
        print(f"  ⚠ GSC: failed to parse response: {e}")
        return []

    opportunities = []
    for row in rows:
        query = row.get("keys", [None])[0]
        impressions = row.get("impressions", 0)
        clicks = row.get("clicks", 0)
        position = row.get("position", 0)
        if not query or impressions < 10:
            continue
        # Real demand (impressions exist) but weak result (page 2+, or
        # very low CTR despite decent visibility) — an evidenced gap,
        # not a hand-picked guess.
        ctr = (clicks / impressions) if impressions else 0
        if position > 10 or (position <= 10 and ctr < 0.02):
            opportunities.append({
                "query": query,
                "impressions": impressions,
                "clicks": clicks,
                "position": round(position, 1),
            })

    opportunities.sort(key=lambda x: x["impressions"], reverse=True)
    return opportunities[:max_results]
