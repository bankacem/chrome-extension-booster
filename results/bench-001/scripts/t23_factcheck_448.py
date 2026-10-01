#!/usr/bin/env python3
"""t23_factcheck_448.py — claim-level fact-check of the PR #448 article.

Extracts every numeric/date/version/policy/process claim (agentic_loop's
deterministic extractor, budget raised), searches the web for each, fetches
the OFFICIAL page when available, pulls a short supporting quote, and writes
a JSON report + draft markdown for manual review before posting to #448.
Nothing is pushed anywhere; the PR branch is NOT modified.
"""
import html as html_mod
import json
import re
import subprocess
import sys
import time
import urllib.request
from pathlib import Path

sys.path.insert(0, "/home/z/my-project/wt_engine/seo_agent_pro")
import agentic_loop  # noqa: E402

agentic_loop.CLAIM_BUDGET = 60  # user asked for EVERY numeric/policy claim

ART = Path("/tmp/t448_article.md")
OUT = Path("/home/z/my-project/ab_runs_t23/factcheck_448")
OUT.mkdir(parents=True, exist_ok=True)
CACHE = Path("/tmp/fc448_cache.json")
OFFICIAL_HOSTS = ("developer.chrome.com", "support.google.com", "chromium.org",
                  "chrome.google.com", "developers.google.com")
UA = {"User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 "
                    "(KHTML, like Gecko) Chrome/124.0 Safari/537.36"}

src = ART.read_text(encoding="utf-8")
body = re.sub(r"^---\n.*?\n---\n", "", src, flags=re.S).strip()
claims = agentic_loop.extract_claims(body)
print(f"claims extracted: {len(claims)}")


def zai_search(query, num=6):
    cache = json.loads(CACHE.read_text()) if CACHE.exists() else {}
    if query in cache:
        return cache[query]
    rows = []
    try:
        subprocess.run(["z-ai", "function", "-n", "web_search",
                        "-a", json.dumps({"query": query, "num": num}),
                        "-o", "/tmp/fc448_serp.json"],
                       capture_output=True, text=True, timeout=90)
        data = json.loads(Path("/tmp/fc448_serp.json").read_text(encoding="utf-8"))
        for r in data if isinstance(data, list) else []:
            if r.get("url"):
                rows.append({"title": r.get("name", ""), "host": r.get("host_name", ""),
                             "url": r.get("url", ""), "snippet": (r.get("snippet") or "")[:300]})
    except Exception as e:  # noqa: BLE001
        print(f"  search fail: {str(e)[:60]}")
    cache[query] = rows
    CACHE.write_text(json.dumps(cache, ensure_ascii=False))
    return rows


def fetch_text(url, limit=60000):
    try:
        req = urllib.request.Request(url, headers=UA)
        with urllib.request.urlopen(req, timeout=25) as r:
            h = r.read(limit).decode("utf-8", "ignore")
        h = re.sub(r"<(script|style|noscript)[\s\S]*?</\1>", " ", h, flags=re.I)
        t = re.sub(r"<[^>]+>", " ", h)
        t = html_mod.unescape(t)
        return " ".join(t.split())
    except Exception as e:  # noqa: BLE001
        return f"__FETCH_FAIL__ {type(e).__name__}: {str(e)[:80]}"


def claim_tokens(c):
    toks = [t for t in re.findall(r"[A-Za-z0-9.$%]+", c) if len(t) > 2
            and t.lower() not in {"you", "the", "and", "for", "with", "must", "your",
                                  "need", "have", "are", "can", "will", "that", "this",
                                  "from", "google", "chrome"}]
    return toks


def quote_for(page_text, claim):
    toks = claim_tokens(claim)
    numeric = re.findall(r"\d+(?:\.\d+)?", claim)
    best, best_score = "", 0
    low = page_text.lower()
    for m in re.finditer(r"[^\n]", page_text):
        pass  # (single-pass scan below is enough)
    # scan windows around each numeric token first (strongest anchor)
    anchors = []
    for n in numeric:
        anchors += [mm.start() for mm in re.finditer(re.escape(n), page_text)]
    if not anchors:
        for t in toks:
            anchors += [mm.start() for mm in re.finditer(re.escape(t.lower()), low)]
        if not anchors:
            return ""
    scored = []
    for a in anchors[:60]:
        s, e = max(0, a - 130), min(len(page_text), a + 160)
        win = page_text[s:e]
        wl = win.lower()
        score = sum(1 for t in toks if t.lower() in wl) + (3 if any(
            n == page_text[a:a + len(n)] for n in numeric) else 0)
        scored.append((score, win))
    scored.sort(key=lambda x: -x[0])
    if scored and scored[0][0] >= max(2, len(toks) // 3):
        best = scored[0][1]
    return " ".join(best.split())[:320]


results = []
for i, c in enumerate(claims, 1):
    print(f"[{i}/{len(claims)}] {c['type']:13s} {c['claim'][:70]}")
    q = agentic_loop.claim_query(c["claim"], "chrome web store extension rejection")
    rows = zai_search(q)
    official = [r for r in rows if any(h in r["host"] for h in OFFICIAL_HOSTS)]
    picked, quote, how = None, "", "uncertain"
    for r in official[:2]:
        pt = fetch_text(r["url"])
        if pt.startswith("__FETCH_FAIL__"):
            sn = r["snippet"]
            if sn and claim_tokens(c["claim"]) and sum(
                    1 for t in claim_tokens(c["claim"]) if t.lower() in sn.lower()) >= 2:
                picked, quote, how = r, sn[:280], "snippet-only"
            continue
        qt = quote_for(pt, c["claim"])
        if qt:
            picked, quote, how = r, qt, "page-quote"
            break
    if not picked:
        # non-official corroboration is still reported, but labelled unofficial
        for r in rows[:3]:
            sn = r.get("snippet", "")
            if sn and sum(1 for t in claim_tokens(c["claim"]) if t.lower() in sn.lower()) >= 2:
                picked, quote, how = r, sn[:280], "unofficial-snippet"
                break
    results.append({"claim": c["claim"], "type": c["type"], "context": c.get("context", "")[:200],
                    "source": (picked or {}).get("url", ""), "host": (picked or {}).get("host", ""),
                    "mode": how if picked else "-", "quote": quote})
    time.sleep(1)

(OUT / "claims_report.json").write_text(json.dumps(results, indent=1, ensure_ascii=False),
                                        encoding="utf-8")
n_off = sum(1 for r in results if r["mode"] == "page-quote")
n_sn = sum(1 for r in results if r["mode"] == "snippet-only")
n_un = sum(1 for r in results if r["mode"] == "unofficial-snippet")
n_no = sum(1 for r in results if not r["source"])
print(f"\ndone: page-quote={n_off} snippet-only={n_sn} unofficial={n_un} no-source={n_no}")
print(f"report: {OUT/'claims_report.json'}")
