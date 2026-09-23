#!/usr/bin/env python3
"""TypeSafe deep evaluation on a stratified sample of articles.

Stratification: by word-count bucket (3000+/1500-2999/800-1499) x top categories,
plus the 2 articles missing FAQ and the 50 missing /extension/ links (subset).
Leaves results in scripts/typesafe_sample.json.
"""
import glob
import json
import random
import re
import sys
import time

sys.path.insert(0, "/home/z/my-project/scripts")
import importlib.util

spec = importlib.util.spec_from_file_location("ts", "/home/z/my-project/scripts/typesafe_evaluate.py")
ts = importlib.util.module_from_spec(spec)
spec.loader.exec_module(ts)

BASE = "/home/z/my-project/repo-booster"
audit = json.load(open("/home/z/my-project/scripts/audit_all.json"))
arts = [a for a in audit["articles"] if a.get("slug")]

random.seed(42)


def pick(bucket_fn, n):
    pool = [a for a in arts if bucket_fn(a)]
    return random.sample(pool, min(n, len(pool)))


sample = []
# long flagship articles (most likely to rank)
sample += pick(lambda a: a.get("words", 0) >= 3000, 8)
# mid-length
sample += pick(lambda a: 1500 <= a.get("words", 0) < 3000, 6)
# shorter content (expansion candidates)
sample += pick(lambda a: 800 <= a.get("words", 0) < 1500, 4)
# no-extension-link articles still remaining
no_ext = [a for a in arts if a.get("ext_links", 0) == 0 and a.get("words", 0) >= 1500]
sample += random.sample(no_ext, min(2, len(no_ext)))
# dedup by slug
seen = set()
sample = [a for a in sample if not (a["slug"] in seen or seen.add(a["slug"]))]

print(f"Sample size: {len(sample)}")
results = {}
for a in sample:
    slug = a["slug"]
    path = f"{BASE}/{a['file']}"
    content = open(path, encoding="utf-8").read()
    try:
        r = ts.evaluate(slug, content)
        answers = r.get("answers", {})
        flat = {}
        for name, ans in answers.items():
            if ans.get("type") == "noul":
                flat[name] = {"yes": ans.get("noul", 0) > 0.5, "p": ans.get("noul")}
            elif ans.get("type") == "choice":
                flat[name] = {"choice": ans.get("choice")}
            else:
                probs = ans.get("probabilities", {})
                top = max(probs.items(), key=lambda x: x[1])[0] if probs else "?"
                flat[name] = {"level": top, "idx": ans.get("score")}
        results[slug] = {
            "words": a.get("words"),
            "file": a["file"],
            "eval": flat,
        }
        il = flat["internal_linking_quality"]
        av = flat["actionable_value"]
        print(f"  {slug[:44]:<46} {a['words']:>5}w | linking={il['level']:<9} actionable={av['level']}")
    except Exception as e:
        results[slug] = {"error": str(e), "file": a["file"]}
        print(f"  {slug[:44]:<46} ERROR {e}")
    time.sleep(1)

json.dump(results, open("/home/z/my-project/scripts/typesafe_sample.json", "w"), indent=1)
print("saved -> scripts/typesafe_sample.json")
