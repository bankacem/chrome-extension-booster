#!/usr/bin/env python3
"""Full-corpus TypeSafe (jev) quality audit of all 839 published articles.

One API call per article (4 score questions in a single /v1/systemone payload).
- Compact 12k-char state (frontmatter + intro + headings + table excerpts + tail)
- Sitemap-priority order: the site's own importance ranking
- 4 worker threads, resumable JSONL (skips slugs already scored)
- Retries with backoff on HTTP errors / 429
Output: /home/z/my-project/scripts/typesafe_full_audit.jsonl + progress log
"""
import json
import re
import threading
import time
import urllib.request
import urllib.error
from queue import Queue

API = "https://api.typesafe.ai/v1/systemone"
KEY = "apikey_22996aa371737af45468751d797a462abac_9a46d2da6b11142ecc2c68a5a2383a5e02d2ca2022092ff5cf4b52554d6e29f5"
MODEL = "jev-latest"
BASE = "/home/z/my-project/repo-booster"
OUT = "/home/z/my-project/scripts/typesafe_full_audit.jsonl"
WORKERS = 4
SLEEP = 0.4

QUESTIONS = {
    "search_intent_match": {
        "instructions": "Would this article fully satisfy a searcher looking for recommendations and setup steps for this browser extension category?",
        "type": "score",
        "criteria": ["weak", "average", "fully satisfying"],
    },
    "actionable_value": {
        "instructions": "Does the article give concrete, actionable steps and specific numbers rather than generic advice?",
        "type": "score",
        "criteria": ["generic advice", "partially actionable", "concrete steps with numbers"],
    },
    "internal_linking_quality": {
        "instructions": "Is the internal linking strong and contextually relevant?",
        "type": "score",
        "criteria": ["weak: few or irrelevant links", "average", "strong: many relevant contextual links"],
    },
    "readability": {
        "instructions": "Is the writing engaging, non-robotic, and easy to scan with clear structure?",
        "type": "score",
        "criteria": ["1 - weak", "5 - average", "10 - excellent"],
    },
}


def strip_fm(content: str) -> str:
    return re.sub(r"^---\n.*?\n---\n", "", content, flags=re.S)


def build_state(content: str, max_chars: int = 12000) -> str:
    meta = content.split("---")[1] if content.startswith("---") else ""
    body = strip_fm(content)
    lines = body.split("\n")
    headings = "\n".join(l for l in lines if l.startswith("## "))
    tables = []
    for i, ln in enumerate(lines):
        if ln.startswith("|") and i + 1 < len(lines) and set(lines[i + 1].replace("|", "").strip()) <= set("-: "):
            tables.append("\n".join(lines[max(0, i - 2): i + 8]))
        if len(tables) >= 2:
            break
    table_text = "\n\n[TABLE]\n".join(tables) if tables else "[NO TABLES]"
    intro = body[:3200]
    tail = body[-3000:]
    return f"{meta}\n\n[HEADINGS]\n{headings}\n\n[INTRO]\n{intro}\n\n[TABLES]{table_text}\n\n[TAIL]\n{tail}"[:max_chars]


def call_api(state: str) -> dict:
    payload = json.dumps({"model": MODEL, "state": state, "questions": QUESTIONS}).encode()
    last = None
    for attempt in range(3):
        try:
            req = urllib.request.Request(API, data=payload, headers={
                "Authorization": f"Bearer {KEY}", "Content-Type": "application/json"}, method="POST")
            with urllib.request.urlopen(req, timeout=180) as resp:
                return json.loads(resp.read())
        except Exception as e:
            last = e
            time.sleep(5 * (3 ** attempt))
    raise last


def flatten(ans: dict) -> dict:
    flat = {}
    for name, a in ans.items():
        if a.get("type") == "noul":
            flat[name] = {"yes": a.get("noul", 0) > 0.5, "p": a.get("noul")}
        elif a.get("type") == "choice":
            flat[name] = {"choice": a.get("choice")}
        else:
            probs = a.get("probabilities", {})
            top = max(probs.items(), key=lambda x: x[1])[0] if probs else "?"
            flat[name] = {"level": top, "idx": a.get("score")}
    return flat


def load_work():
    """Published articles in sitemap priority order."""
    sm = open(f"{BASE}/public/sitemap.xml").read()
    order = {}
    for i, b in enumerate(re.findall(r"<url>(.*?)</url>", sm, re.S)):
        loc = re.search(r"<loc>([^<]+)</loc>", b)
        if loc and "/blog/" in loc.group(1) and not any(x in loc.group(1) for x in ["/fr/", "/es/", "/pt/", "/ar/"]):
            order[loc.group(1).split("/blog/")[1]] = i
    import glob as g
    work = []
    for f in g.glob(f"{BASE}/public/content/articles/**/*.md", recursive=True):
        try:
            c = open(f, encoding="utf-8", errors="ignore").read()
        except Exception:
            continue
        fm = c.split("---")[1] if c.startswith("---") else ""
        st = re.search(r"^status:\s*['\"]?(\w+)", fm, re.M)
        sl = re.search(r"^slug:\s*['\"]?([^\s'\"-][^\n]*?)\s*$", fm, re.M)
        if not (st and st.group(1) == "published" and sl):
            continue
        slug = sl.group(1)
        work.append({"slug": slug, "file": f, "ord": order.get(slug, 10 ** 6)})
    work.sort(key=lambda w: w["ord"])
    return work


def main():
    done = set()
    try:
        for line in open(OUT):
            try:
                done.add(json.loads(line)["slug"])
            except Exception:
                pass
    except FileNotFoundError:
        pass
    work = [w for w in load_work() if w["slug"] not in done]
    print(f"total to audit: {len(work)} (already done: {len(done)})", flush=True)

    q = Queue()
    for w in work:
        q.put(w)
    lock = threading.Lock()
    stats = {"ok": 0, "err": 0}

    def worker(i):
        while True:
            try:
                w = q.get_nowait()
            except Exception:
                return
            slug, f = w["slug"], w["file"]
            try:
                content = open(f, encoding="utf-8").read()
                r = call_api(build_state(content))
                rec = {"slug": slug, "file": f.replace(BASE + "/", ""), "ord": w["ord"],
                       "model": r.get("model"), "answers": flatten(r.get("answers", {})),
                       "usage": r.get("usage", {})}
                with lock:
                    with open(OUT, "a") as fh:
                        fh.write(json.dumps(rec, ensure_ascii=False) + "\n")
                    stats["ok"] += 1
                    if stats["ok"] % 25 == 0:
                        print(f"[w{i}] ok={stats['ok']} err={stats['err']} last={slug[:40]}", flush=True)
            except Exception as e:
                with lock:
                    stats["err"] += 1
                    print(f"[w{i}] ERROR {slug[:44]} :: {e}", flush=True)
                    with open(OUT + ".errors", "a") as fh:
                        fh.write(json.dumps({"slug": slug, "error": str(e)}) + "\n")
            time.sleep(SLEEP)

    ts = [threading.Thread(target=worker, args=(i,), daemon=True) for i in range(WORKERS)]
    t0 = time.time()
    for t in ts:
        t.start()
    for t in ts:
        t.join()
    print(f"DONE in {int(time.time()-t0)}s :: ok={stats['ok']} err={stats['err']}", flush=True)


if __name__ == "__main__":
    main()
