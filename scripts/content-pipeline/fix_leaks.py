#!/usr/bin/env python3
"""Surgical fixes for template leaks and awkward openers:
  1. "A good {topic} setup ..." -> "A good extension setup ..." (163 files, leaked
     from the mass_repair INTRO_VARIANTS template used last session + this one).
  2. Table opener "...day-to-day satisfaction with <raw article title>:" -> clean
     seeded variant (12 files where a question/listicle title broke the sentence).
Bumps updated_at on changed files. Log printed to stdout.
"""
import datetime
import glob
import hashlib
import json
import re

BASE = "/home/z/my-project/repo-booster"
NOW = datetime.datetime.now(datetime.timezone.utc).strftime("%Y-%m-%dT%H:%M:%S.000+00:00")

LEAK = "A good {topic} setup is rarely one extension working alone."
FIX = "A good extension setup is rarely one extension working alone."

OPENER_RE = re.compile(r"that actually decide day-to-day satisfaction with [^:\n]+:")
OPENER_VARIANTS = [
    "that actually decide day-to-day satisfaction:",
    "that actually decide whether a tool earns a permanent slot in your toolbar:",
    "that actually decide long-term satisfaction:",
]


def bump(raw: str) -> str:
    if re.search(r"^updated_at:", raw, re.M):
        return re.sub(r"^updated_at:.*$", f"updated_at: '{NOW}'", raw, count=1, flags=re.M)
    return raw


def main():
    stats = {"topic_leak_fixed": 0, "opener_fixed": 0, "files": 0}
    changed = []
    for path in glob.glob(f"{BASE}/public/content/articles/**/*.md", recursive=True):
        raw = open(path, encoding="utf-8").read()
        orig = raw
        slug = path.split("/")[-1][:-3]
        if LEAK in raw:
            raw = raw.replace(LEAK, FIX)
            stats["topic_leak_fixed"] += 1
        m = OPENER_RE.search(raw)
        if m:
            h = int(hashlib.md5(slug.encode()).hexdigest(), 16)
            raw = OPENER_RE.sub(OPENER_VARIANTS[h % len(OPENER_VARIANTS)], raw)
            stats["opener_fixed"] += 1
        if raw != orig:
            raw = bump(raw)
            open(path, "w", encoding="utf-8").write(raw)
            stats["files"] += 1
            changed.append(path.replace(BASE + "/", ""))
    print(json.dumps(stats, indent=1))
    for c in changed[:8]:
        print(" ", c)
    json.dump({"timestamp": NOW, "stats": stats, "changed": changed},
              open("/home/z/my-project/scripts/fix_leaks_log.json", "w"), indent=1)


if __name__ == "__main__":
    main()
