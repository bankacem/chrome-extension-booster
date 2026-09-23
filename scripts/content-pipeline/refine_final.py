#!/usr/bin/env python3
"""Phase 3 targeted fixes driven by the full TypeSafe audit:
  A. 'Related Guides' blocks for the 60 weakest-internal-linking on-site articles
     (relevance via token-overlap scoring; links validated against sitemap slugs).
  B. Title + intro upgrades for the 20 worst search-intent articles
     (hand-written in title_intro_upgrades.json; replaces the SEO-spam intros
     that carried off-topic links).
Bumps updated_at on every changed file. Log -> scripts/refine_final_log.json
"""
import datetime
import json
import math
import re
from pathlib import Path

BASE = Path("/home/z/my-project/repo-booster")
NOW = datetime.datetime.now(datetime.timezone.utc).strftime("%Y-%m-%dT%H:%M:%S.000+00:00")
ANCHOR_RE = re.compile(
    r"^## .*(Frequently Asked|FAQ|Final Verdict|Conclusion|Verdict|Pro Tips|Key Takeaways).*$",
    re.M | re.I,
)
STOP = set("""chrome extension extensions guide best for the a an in to of on how your you and with free top
review vs comparison 2026 tips complete ultimate definitive comprehensive step by tutorial using""".split())
INTROS = [
    "These guides from our library cover adjacent ground — pick the one that matches your next step:",
    "If this raised follow-up questions, these related guides go deeper on the neighbouring topics:",
    "Readers who used this guide also found these walkthroughs useful:",
    "Keep going with these hand-picked guides from the same series of topics:",
]

audit = {a["slug"]: a for a in json.load(open("/home/z/my-project/scripts/audit_all.json"))["articles"]}
clean = json.load(open("/home/z/my-project/scripts/typesafe_clean.json"))
onsite = [r for r in clean if r["on_site"]]
fix_lists = json.load(open("/home/z/my-project/scripts/fix_lists.json"))
upgrades = json.load(open("/home/z/my-project/scripts/title_intro_upgrades.json"))

# slug -> title map + token sets
slug_title, tokens = {}, {}
for r in onsite:
    p = BASE / r["file"]
    c = open(p, encoding="utf-8").read()
    fm = c.split("---")[1] if c.startswith("---") else ""
    m = re.search(r'^title:\s*["\']?(.+?)["\']?\s*$', fm, re.M) or re.search(
        r'^seo_title:\s*["\']?(.+?)["\']?\s*$', fm, re.M)
    t = (m.group(1) if m else r["slug"]).strip()
    slug_title[r["slug"]] = t
    words = set(w for w in re.split(r"[-\s]+", f"{r['slug']} {t}".lower()) if w.isalpha() and w not in STOP)
    tokens[r["slug"]] = words


def relevant(slugs, target, k=3, existing=None):
    a = tokens.get(target, set())
    scored = []
    for s in slugs:
        if s == target or (existing and s in existing):
            continue
        b = tokens.get(s, set())
        ov = len(a & b)
        if ov:
            scored.append((ov / math.sqrt(max(len(a), 1) * max(len(b), 1)), s))
    scored.sort(reverse=True)
    return [s for _, s in scored[:k]] if scored else []


def insert_before_anchor(body, block):
    m = ANCHOR_RE.search(body)
    return body[: m.start()] + block + body[m.start():] if m else body.rstrip("\n") + "\n\n" + block


def bump(raw):
    if re.search(r"^updated_at:", raw, re.M):
        return re.sub(r"^updated_at:.*$", f"updated_at: '{NOW}'", raw, count=1, flags=re.M)
    return raw


log = {"A_related": {}, "B_titles": {}, "stats": {}}
all_slugs = [r["slug"] for r in onsite]

# ---------------- Phase A ----------------
done_a = 0
for slug in fix_lists["related_guides_targets"]:
    meta = audit.get(slug)
    if not meta or meta.get("blog_links", 0) >= 6:
        continue
    p = BASE / meta["file"]
    raw = open(p, encoding="utf-8").read()
    mfm = re.match(r"^---\n(.*?)\n---\n", raw, re.S)
    if not mfm:
        continue
    body = raw[mfm.end():]
    if "Related Guides" in body or "{#related-guides}" in body:
        continue
    existing = set(re.findall(r"\]\(/blog/([^)#\s]+)", body))
    picks = relevant(all_slugs, slug, 3, existing)
    if not picks:
        continue
    h = int(datetime.datetime.now().timestamp()) % len(INTROS)  # stable-ish variety
    seed = sum(ord(ch) for ch in slug) % len(INTROS)
    lines = ["## Related Guides {#related-guides}", "", INTROS[seed], ""]
    for s in picks:
        lines.append(f"- [{slug_title[s]}](/blog/{s})")
    lines.append("")
    body = insert_before_anchor(body, "\n".join(lines))
    raw = bump(raw[: mfm.end()] + body)
    open(p, "w", encoding="utf-8").write(raw)
    log["A_related"][slug] = picks
    done_a += 1
log["stats"]["related_added"] = done_a

# ---------------- Phase B ----------------
done_b = 0
for slug, up in upgrades.items():
    meta = audit.get(slug) or next((r for r in clean if r["slug"] == slug), None)
    if not meta:
        continue
    p = BASE / meta["file"]
    raw = open(p, encoding="utf-8").read()
    mfm = re.match(r"^---\n(.*?)\n---\n", raw, re.S)
    if not mfm:
        continue
    fm, body = mfm.group(1), raw[mfm.end():]
    orig = raw
    title = up["title"].replace('"', '\\"')
    if re.search(r"^title:", fm, re.M):
        fm = re.sub(r"^title:.*$", f'title: "{title}"', fm, count=1, flags=re.M)
    else:
        fm += f'\ntitle: "{title}"'
    seo = up.get("seo_title", "").replace('"', '\\"')
    if seo:
        if re.search(r"^seo_title:", fm, re.M):
            fm = re.sub(r"^seo_title:.*$", f'seo_title: "{seo}"', fm, count=1, flags=re.M)
        else:
            fm = re.sub(r"(^title:.*$)", rf"\1\nseo_title: \"{seo}\"", fm, count=1, flags=re.M)
    # replace first real paragraph block in body
    blocks = re.split(r"\n\n+", body)
    for i, blk in enumerate(blocks[:15]):
        s = blk.strip()
        if not s or s.startswith(("<img", ">", "#", "|", "```", "![", "-", "1.", "📌")):
            continue
        blocks[i] = up["intro"]
        body = "\n\n".join(blocks)
        break
    raw = f"---\n{fm}\n---\n{body}"
    if raw != orig:
        raw = bump(raw)
        open(p, "w", encoding="utf-8").write(raw)
        log["B_titles"][slug] = {"title": up["title"], "intro_words": len(up["intro"].split())}
        done_b += 1
log["stats"]["titles_upgraded"] = done_b

json.dump(log, open("/home/z/my-project/scripts/refine_final_log.json", "w"), indent=1)
print(json.dumps(log["stats"], indent=1))
print("related picks sample:")
for k, v in list(log["A_related"].items())[:6]:
    print(f"  {k[:40]:<42} -> {[s[:34] for s in v]}")
