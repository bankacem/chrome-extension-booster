#!/usr/bin/env python3
"""t23_searxng_bench.py — SearXNG local quality benchmark on 5 standard queries,
compared head-to-head with the z-ai web_search used by the engine today.
Metrics per query: latency, result count, top-5 hosts, official source in top-5,
first official result rank, engine errors from the log."""
import json
import re
import subprocess
import time
import urllib.request
from pathlib import Path

OFFICIAL = ("developer.chrome.com", "support.google.com", "chromium.org",
            "chromium.googlesource.com", "developer.mozilla.org")
QUERIES = [
    "chrome extension manifest v3 service worker lifecycle",
    "chrome web store developer program policies permissions",
    "chrome extension review time how long business days",
    "chrome.storage.local quota limits documentation",
    "ublock origin chrome web store manifest v3 status",
]

def searx(query):
    t0 = time.time()
    url = "http://127.0.0.1:8888/search?q=" + urllib.request.quote(query) + "&format=json"
    with urllib.request.urlopen(urllib.request.Request(url, headers={"User-Agent": "Mozilla/5.0"}), timeout=60) as r:
        data = json.loads(r.read())
    ms = (time.time() - t0) * 1000
    rows = [{"title": x.get("title", ""), "url": x.get("url", ""),
             "host": re.sub(r"^https?://([^/]+).*", r"\1", x.get("url", "")),
             "snippet": (x.get("content") or "")[:200]} for x in data.get("results", [])]
    return rows, ms

def zai(query):
    t0 = time.time()
    subprocess.run(["z-ai", "function", "-n", "web_search",
                    "-a", json.dumps({"query": query, "num": 8}), "-o", "/tmp/bench_serp.json"],
                   capture_output=True, text=True, timeout=90)
    data = json.loads(Path("/tmp/bench_serp.json").read_text(encoding="utf-8"))
    ms = (time.time() - t0) * 1000
    rows = [{"title": r.get("name", ""), "url": r.get("url", ""),
             "host": r.get("host_name", ""), "snippet": (r.get("snippet") or "")[:200]}
            for r in (data if isinstance(data, list) else []) if r.get("url")]
    return rows, ms

def official_rank(rows):
    for i, r in enumerate(rows):
        if any(h in r["host"] for h in OFFICIAL):
            return i + 1, r["host"]
    return None, None

log = []
for q in QUERIES:
    entry = {"query": q}
    try:
        rows, ms = searx(q)
        rank, host = official_rank(rows)
        entry["searxng"] = {"ms": round(ms), "n": len(rows),
                            "top3": [r["host"] for r in rows[:3]],
                            "official_rank": rank, "official_host": host}
    except Exception as e:  # noqa: BLE001
        entry["searxng"] = {"error": str(e)[:100]}
    time.sleep(2)
    try:
        rows, ms = zai(q)
        rank, host = official_rank(rows)
        entry["zai"] = {"ms": round(ms), "n": len(rows),
                        "top3": [r["host"] for r in rows[:3]],
                        "official_rank": rank, "official_host": host}
    except Exception as e:  # noqa: BLE001
        entry["zai"] = {"error": str(e)[:100]}
    log.append(entry)
    print(json.dumps(entry, ensure_ascii=False, indent=1))

Path("/home/z/my-project/ab_runs_t23/searxng_bench.json").write_text(
    json.dumps(log, indent=1, ensure_ascii=False), encoding="utf-8")
errs = [l for l in Path("/tmp/searxng.log").read_text().splitlines() if "WARNING" in l or "ERROR" in l]
eng_errs = {}
for l in errs:
    m = re.search(r"searx\.engines\.([a-z0-9_]+)|searx\.network\.([a-z0-9_]+)", l)
    if m:
        e = m.group(1) or m.group(2)
        eng_errs[e] = eng_errs.get(e, 0) + 1
print("\nengine warnings/errors:", json.dumps(eng_errs, indent=1))
