#!/usr/bin/env python3
"""Analyze the full-corpus TypeSafe audit: distributions, worst offenders,
benchmarks vs the 5 flagship articles, and a fix list."""
import json
from collections import Counter

OUT = "/home/z/my-project/scripts/typesafe_full_audit.jsonl"
DIMS = ["search_intent_match", "actionable_value", "internal_linking_quality", "readability"]

recs = [json.loads(l) for l in open(OUT)]
words = {a["slug"]: a["words"] for a in json.load(open("/home/z/my-project/scripts/audit_all.json"))["articles"]}
for r in recs:
    r["words"] = words.get(r["slug"], 0)
    idxs = [r["answers"][d]["idx"] for d in DIMS if d in r["answers"]]
    r["composite"] = sum(idxs) / len(idxs) if idxs else None

recs = [r for r in recs if r["composite"] is not None]


def bucket(v):
    return "weak" if v < 0.67 else ("average" if v < 1.33 else "excellent")


print(f"n={len(recs)}  |  scale: 0=weak, 1=average, 2=excellent (continuous)")
print(f"composite mean: {sum(r['composite'] for r in recs)/len(recs):.2f}")
for d in DIMS:
    m = sum(r["answers"][d]["idx"] for r in recs) / len(recs)
    c = Counter(bucket(r["answers"][d]["idx"]) for r in recs)
    print(f"  {d:<26} mean={m:.2f}  weak={c['weak']:>3} avg={c['average']:>3} exc={c['excellent']:>3}")

c = Counter(bucket(r["composite"]) for r in recs)
print(f"composite buckets: weak={c['weak']} avg={c['average']} exc={c['excellent']}")

# word-count correlation
buckets = [(0, 800), (800, 1500), (1500, 3000), (3000, 10**9)]
print("\ncomposite by word bucket:")
for lo, hi in buckets:
    grp = [r for r in recs if lo <= r["words"] < hi]
    if grp:
        print(f"  {lo:>5}-{hi if hi < 10**8 else '∞':>5}w  n={len(grp):>3}  mean={sum(r['composite'] for r in grp)/len(grp):.2f}")

print("\n=== 5 flagship benchmark ===")
flag = ["text-expander-chrome-extensions", "mute-noisy-tabs-chrome", "website-blocker-focus-chrome",
        "history-search-chrome-extensions", "calendar-chrome-extensions"]
for r in recs:
    if r["slug"] in flag:
        print(f"  {r['slug'][:44]:<46} comp={r['composite']:.2f}  {r['words']}w")

worst = sorted(recs, key=lambda r: (r["composite"], -r["ord"]))[:40]
print("\n=== WORST 40 (composite asc; ties -> higher sitemap priority first) ===")
for r in worst:
    dims = " ".join(f"{d.split('_')[0][:4]}={r['answers'][d]['idx']:.1f}" for d in DIMS)
    print(f"  {r['slug'][:50]:<52} comp={r['composite']:.2f} ord={r['ord']:<4} {r['words']:>5}w  {dims}")

# dimension-specific lists for targeted fixes
print("\n=== dimension-specific weak counts (idx<0.67) ===")
for d in DIMS:
    n = sum(1 for r in recs if r["answers"][d]["idx"] < 0.67)
    print(f"  {d:<26} {n}")

json.dump([{"slug": r["slug"], "file": r["file"], "ord": r["ord"], "words": r["words"],
            "composite": r["composite"], **{d: r["answers"][d]["idx"] for d in DIMS}} for r in recs],
          open("/home/z/my-project/scripts/typesafe_analysis.json", "w"), indent=1)
print("\nsaved -> scripts/typesafe_analysis.json")
