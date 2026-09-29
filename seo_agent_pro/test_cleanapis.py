"""
Clean APIs (cleanapis.com) provider test — REAL diagnostics, no guessing.

What it does, in order:
  1. Reports exactly WHERE the key was resolved from (env / secrets.env / .env
     / not-found) — so "I put the key somewhere" becomes a precise fact.
  2. Validates the key shape and hits GET /v1/models (auth check, no tokens
     spent).
  3. Sends a tiny 1-token chat completion (spends ~a handful of tokens) to
     prove end-to-end generation works with the default stage model.

Run:  python3 test_cleanapis.py
"""

import json
import os
import sys
import urllib.request
import urllib.error

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from config import (  # noqa: E402
    API_KEYS, CLEANAPIS_CATALOG, CLEANAPIS_KEY_SOURCE,
    CLEANAPIS_STAGE_MODELS,
)
from llm_router import CLEANAPIS_BASE_URL  # noqa: E402

KEY = API_KEYS.get("cleanapis", "")


def main() -> None:
    print("=" * 64)
    print("Clean APIs provider test — cleanapis.com")
    print("=" * 64)

    print(f"\n[1] Key resolution")
    print(f"    source : {CLEANAPIS_KEY_SOURCE}")
    if KEY:
        print(f"    shape  : {KEY[:6]}...{KEY[-4:]} (len={len(KEY)})")
    else:
        print("    status : NOT FOUND")
        print("\n    Fix — paste the key into ANY ONE of these:")
        print("      a) export CLEANAPIS_KEY=...   (current shell)")
        print("      b) site/seo_agent_pro/secrets.env   (copy secrets.env.example)")
        print("         and put the line:  CLEANAPIS_KEY=your-real-key")
        print("      c) /home/z/my-project/.env    (add a line CLEANAPIS_KEY=...)")
        print("    Then re-run this test. No code changes needed.")
        return

    print(f"\n[2] Auth check: GET {CLEANAPIS_BASE_URL}/models")
    req = urllib.request.Request(
        f"{CLEANAPIS_BASE_URL}/models",
        headers={"Authorization": f"Bearer {KEY}", "Accept": "application/json",
                 "User-Agent": "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0 Safari/537.36"},
    )
    try:
        with urllib.request.urlopen(req, timeout=30) as resp:
            body = json.loads(resp.read().decode("utf-8"))
        ids = [m.get("id") for m in body.get("data", [])]
        known = [i for i in ids if i in CLEANAPIS_CATALOG]
        print(f"    HTTP 200 OK — key accepted")
        print(f"    models visible: {len(ids)} | matching our local catalog: {len(known)}")
        if ids:
            print(f"    sample: {', '.join(sorted(filter(None, ids))[:6])}")
    except urllib.error.HTTPError as e:
        print(f"    HTTP {e.code}: {e.reason}")
        print(f"    {e.read().decode('utf-8', errors='replace')[:300]}")
        if e.code in (401, 403):
            print("    → The key was rejected. Re-copy it from the dashboard.")
        return
    except Exception as e:  # noqa: BLE001
        print(f"    network error: {e}")
        return

    model = CLEANAPIS_STAGE_MODELS["fast"]
    print(f"\n[3] Live generation test: POST /chat/completions  model={model}")
    payload = {
        "model": model,
        "max_tokens": 20,
        "messages": [{"role": "user", "content": "Reply with exactly: CLEANAPIS-OK"}],
        "stream": False,
    }
    req = urllib.request.Request(
        f"{CLEANAPIS_BASE_URL}/chat/completions",
        json.dumps(payload).encode(),
        {"Authorization": f"Bearer {KEY}", "Content-Type": "application/json"},
    )
    try:
        with urllib.request.urlopen(req, timeout=60) as resp:
            body = json.loads(resp.read().decode("utf-8"))
        content = (body.get("choices") or [{}])[0].get("message", {}).get("content", "")
        usage = body.get("usage", {})
        print(f"    HTTP 200 OK — model replied: {content.strip()!r}")
        print(f"    tokens: prompt={usage.get('prompt_tokens')} completion={usage.get('completion_tokens')}")
        print("\nRESULT: Clean APIs is LIVE — every agent can now use it.")
    except urllib.error.HTTPError as e:
        print(f"    HTTP {e.code}: {e.reason}")
        print(f"    {e.read().decode('utf-8', errors='replace')[:300]}")
        if e.code == 402:
            print("    → Plan tokens exhausted. Top up or wait for monthly reset.")
        elif e.code == 404:
            print(f"    → Model '{model}' not found — pick a sku from CLEANAPIS_CATALOG.")


if __name__ == "__main__":
    main()
