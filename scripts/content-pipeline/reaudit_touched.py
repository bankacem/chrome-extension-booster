#!/usr/bin/env python3
"""Re-audit the Phase-3-touched articles with TypeSafe; compare vs pre-fix scores."""
import importlib.util
import json
import sys

spec = importlib.util.spec_from_file_location("fa", "/home/z/my-project/scripts/typesafe_full_audit.py")
fa = importlib.util.module_from_spec(spec)
spec.loader.exec_module(fa)

touched = set()
logf = json.load(open("/home/z/my-project/scripts/refine_final_log.json"))
touched |= set(logf["A_related"].keys())
touched |= set(logf["B_titles"].keys())
pre = {r["slug"]: r for r in (json.loads(l) for l in open("/home/z/my-project/scripts/typesafe_full_audit.jsonl"))}

out = open("/home/z/my-project/scripts/typesafe_post_fix.jsonl", "w")
DIMS = fa.QUESTIONS.keys()
work = [w for w in fa.load_work() if w["slug"] in touched]
print(f"re-auditing {len(work)} touched articles...", flush=True)
for w in work:
    try:
        content = open(w["file"], encoding="utf-8").read()
        r = fa.call_api(fa.build_state(content))
        rec = {"slug": w["slug"], "answers": fa.flatten(r.get("answers", {}))}
        out.write(json.dumps(rec, ensure_ascii=False) + "\n")
        out.flush()
    except Exception as e:
        print("ERR", w["slug"], e, flush=True)

out.close()
# comparison
rows = []
for line in open("/home/z/my-project/scripts/typesafe_post_fix.jsonl"):
    r = json.loads(line)
    if r["slug"] not in pre:
        continue
    deltas = {d: r["answers"][d]["idx"] - pre[r["slug"]]["answers"][d]["idx"] for d in DIMS}
    comp_pre = sum(pre[r["slug"]]["answers"][d]["idx"] for d in DIMS) / 4
    comp_post = sum(pre[r["slug"]]["answers"][d]["idx"] for d in DIMS) / 4 + sum(deltas.values()) / 4
    rows.append({"slug": r["slug"], "pre": comp_pre, "post": comp_post,
                 "delta": comp_post - comp_pre, **deltas})

rows.sort(key=lambda x: -x["delta"])
n_imp = sum(1 for r in rows if r["delta"] > 0.05)
n_same = sum(1 for r in rows if abs(r["delta"]) <= 0.05)
n_dec = sum(1 for r in rows if r["delta"] < -0.05)
print(f"\nimproved: {n_imp} | unchanged: {n_same} | declined: {n_dec}")
print("\nTop 12 improvements:")
for r in rows[:12]:
    print(f"  {r['slug'][:48]:<50} {r['pre']:.2f} -> {r['post']:.2f} ({r['delta']:+.2f})")
if rows:
    avg = sum(r["delta"] for r in rows) / len(rows)
    print(f"\nmean delta across {len(rows)} re-audited: {avg:+.3f}")
json.dump(rows, open("/home/z/my-project/scripts/typesafe_delta.json", "w"), indent=1)
