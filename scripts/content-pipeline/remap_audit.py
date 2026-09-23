#!/usr/bin/env python3
"""Re-map audit records with a corrected slug regex; separate on-site vs
off-site (not in sitemap) articles; build targeted fix lists."""
import json
import re
from pathlib import Path

BASE = "/home/z/my-project/repo-booster"
DIMS = ["search_intent_match", "actionable_value", "internal_linking_quality", "readability"]

sm = open(f"{BASE}/public/sitemap.xml").read()
order = {}
for i, b in enumerate(re.findall(r"<url>(.*?)</url>", sm, re.S)):
    loc = re.search(r"<loc>([^<]+)</loc>", b)
    if loc and "/blog/" in loc.group(1) and not any(x in loc.group(1) for x in ["/fr/", "/es/", "/pt/", "/ar/"]):
        order[loc.group(1).split("/blog/")[1]] = i

recs = [json.loads(l) for l in open("/home/z/my-project/scripts/typesafe_full_audit.jsonl")]
words_by_file = {a["file"]: a["words"] for a in json.load(open("/home/z/my-project/scripts/audit_all.json"))["articles"]}

clean = []
for r in recs:
    slug = r["slug"].strip().strip('"\'')
    on_site = slug in order
    clean.append({**r, "slug": slug, "on_site": on_site,
                  "ord2": order.get(slug, 10 ** 6),
                  "words": words_by_file.get(r["file"], 0)})

onsite = [r for r in clean if r["on_site"]]
offsite = [r for r in clean if not r["on_site"]]
print(f"total={len(clean)}  on_site={len(onsite)}  off_site={len(offsite)}")
print("off-site sample:", [r["slug"][:40] for r in offsite[:8]])

for r in clean:
    idxs = [r["answers"][d]["idx"] for d in DIMS]
    r["composite"] = sum(idxs) / len(idxs)

Path("/home/z/my-project/scripts/typesafe_clean.json").write_text(json.dumps(clean, indent=1))

onsite_sorted = sorted(onsite, key=lambda r: (r["composite"], r["ord2"]))
print("\n=== WORST 25 ON-SITE (real SEO exposure) ===")
for r in onsite_sorted[:25]:
    dims = " ".join(f"{d.split('_')[0][:4]}={r['answers'][d]['idx']:.1f}" for d in DIMS)
    print(f"  {r['slug'][:52]:<54} comp={r['composite']:.2f} ord={r['ord2']:<4} {r['words']:>5}w  {dims}")

# fix lists
linking_weak = sorted([r for r in onsite if r["answers"]["internal_linking_quality"]["idx"] < 0.67],
                      key=lambda r: r["ord2"])
intent_weak = sorted([r for r in onsite if r["answers"]["search_intent_match"]["idx"] < 0.5],
                     key=lambda r: (r["composite"], r["ord2"]))
fix_lists = {
    "related_guides_targets": [r["slug"] for r in linking_weak[:60]],
    "title_intro_upgrade": [r["slug"] for r in intent_weak[:20]],
}
Path("/home/z/my-project/scripts/fix_lists.json").write_text(json.dumps(fix_lists, indent=1))
print(f"\nrelated_guides_targets (linking<0.67): {len(linking_weak)} -> taking 60")
print(f"title_intro_upgrade (intent<0.5 worst): {len(intent_weak)} -> taking 20")
print("title_intro_upgrade list:", fix_lists["title_intro_upgrade"])
