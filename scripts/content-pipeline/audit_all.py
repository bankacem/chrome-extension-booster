#!/usr/bin/env python3
"""Full audit of all published English articles in the repo.

Objective checks per article (no LLM needed):
- malformed internal links: nested [[, dangling contractions after links
- dead internal links: /blog/ or /extension/ slug that does not exist
  (checked against local files AND live sitemap)
- structure: words, H2 count, tables, FAQ, verdict, /extension/ links,
  external links, meta description length
Outputs: /home/z/my-project/scripts/audit_all.json + console summary.
"""
import glob
import json
import re

BASE = "/home/z/my-project/repo-booster"
SITEMAP = "/home/z/my-project/scripts/extensionto_sitemap.xml"

# --- build set of live slugs from sitemap
sitemap_content = open(SITEMAP).read()
live_slugs = set()
for u in re.findall(r"<loc>(https://extensionto\.com/blog/[^<]+)</loc>", sitemap_content):
    if not any(x in u for x in ["/fr/", "/es/", "/pt/", "/ar/"]):
        live_slugs.add(u.replace("https://extensionto.com/blog/", ""))
live_ext_slugs = set(
    u.replace("https://extensionto.com/extension/", "")
    for u in re.findall(r"<loc>(https://extensionto\.com/extension/[^<]+)</loc>", sitemap_content)
)

# --- build set of local slugs
local_slugs = set()
for f in glob.glob(f"{BASE}/public/content/articles/**/*.md", recursive=True):
    c = open(f, encoding="utf-8", errors="ignore").read()
    m = re.search(r"^slug:\s*['\"]?([^'\"\n]+)", c, re.M)
    if m:
        local_slugs.add(m.group(1).strip())

VALID = live_slugs | local_slugs
VALID_EXT = live_ext_slugs | {
    s.strip() for s in [
        "quick-screenshot-lite", "auto-dark-mode-switcher", "redirect-shield",
        "protab-suspender", "light-popup-blocker", "formula-builder-pro",
        "securakey-pro", "offline-reader-pro", "cookie-banner-blocker",
    ]
}

COMPANIONS = [
    "Quick Screenshot Lite", "Light Popup Blocker", "Redirect Shield",
    "ProTab Suspender", "Offline Reader Pro", "SecuraKey Pro",
    "Cookie Banner Blocker", "Auto Dark Mode Switcher", "Formula Builder Pro",
]


def audit_article(path: str) -> dict:
    c = open(path, encoding="utf-8", errors="ignore").read()
    fm = c.split("---")[1] if c.startswith("---") else ""
    slug_m = re.search(r"^slug:\s*['\"]?([^'\"\n]+)", fm, re.M)
    status_m = re.search(r"^status:\s*['\"]?(\w+)", fm, re.M)
    meta_m = re.search(r'^meta_description:\s*>-\s*\n\s*(.+)', fm, re.M) or re.search(
        r'^meta_description:\s*["\']?(.+?)["\']?$', fm, re.M
    )
    meta_len = len(meta_m.group(1).strip()) if meta_m else 0
    body = re.sub(r"^---\n.*?\n---\n", "", c, flags=re.S, count=1)

    issues = []
    # nested double brackets
    if "[[" in body:
        issues.append("nested_brackets")
    # malformed anchors (a '[' inside anchor text)
    if re.search(r"\[[^\]\n]*\[[^\]\n]*\]\([^\)]*\)", body):
        issues.append("malformed_anchor")
    # dangling contraction right after a link: ](...)t followed by space
    if re.search(r"\]\((/blog/[^)]+)\)([a-z']{1,4})(?=[\s,.:;])", body):
        issues.append("dangling_anchor")
    # dead links (strip markdown title attribute: /slug "Title" -> slug)
    dead = []
    for m in re.finditer(r"\]\(/blog/([^)#\s]+)(?:\s+\"[^\"]*\")?", body):
        slug = m.group(1).rstrip("/").strip()
        if slug and slug not in VALID:
            dead.append(slug)
    for m in re.finditer(r"\]\(/extension/([^)#\s]+)(?:\s+\"[^\"]*\")?", body):
        slug = m.group(1).rstrip("/").strip()
        if slug and slug not in VALID_EXT:
            dead.append("ext:" + slug)
    if dead:
        issues.append("dead_links")
    # structure
    words = len(body.split())
    h2 = len(re.findall(r"^## ", body, re.M))
    tables = len(re.findall(r"^\|-", body, re.M))
    has_faq = bool(re.search(r"## .*(Frequently Asked|FAQ)", body, re.I))
    has_verdict = bool(re.search(r"[Vv]erdict|[Cc]onclusion", body))
    ext_links = len(re.findall(r"\]\(/extension/", body))
    blog_links = len(re.findall(r"\]\(/blog/", body))
    external = len(re.findall(r"\]\(https?://(?!extensionto\.com)", body))
    comp_mentioned = sum(1 for x in COMPANIONS if x in c)
    short_meta = meta_len == 0 or meta_len > 165 or meta_len < 70

    return {
        "file": path.replace(BASE + "/", ""),
        "slug": slug_m.group(1).strip() if slug_m else "",
        "status": status_m.group(1) if status_m else "",
        "words": words,
        "h2": h2,
        "tables": tables,
        "has_faq": has_faq,
        "has_verdict": has_verdict,
        "ext_links": ext_links,
        "blog_links": blog_links,
        "external": external,
        "companion_mentions": comp_mentioned,
        "meta_len": meta_len,
        "meta_len_bad": short_meta,
        "dead_links": sorted(set(dead)),
        "issues": issues,
    }


def main():
    results = []
    files = glob.glob(f"{BASE}/public/content/articles/**/*.md", recursive=True)
    for f in files:
        try:
            r = audit_article(f)
            if r["status"] == "published":
                results.append(r)
        except Exception as e:
            results.append({"file": f.replace(BASE + "/", ""), "error": str(e)})

    n = len(results)
    with_issues = [r for r in results if r.get("issues")]
    dead_total = sum(len(r.get("dead_links", [])) for r in results)
    no_ext_links = [r for r in results if r.get("ext_links", 0) == 0]
    no_faq = [r for r in results if not r.get("has_faq")]
    no_tables = [r for r in results if r.get("tables", 0) == 0]
    short = [r for r in results if r.get("words", 0) < 1500]
    bad_meta = [r for r in results if r.get("meta_len_bad")]

    summary = {
        "total_published": n,
        "with_issues": len(with_issues),
        "dead_link_instances": dead_total,
        "missing_ext_links": len(no_ext_links),
        "missing_faq": len(no_faq),
        "missing_tables": len(no_tables),
        "under_1500_words": len(short),
        "bad_meta_len": len(bad_meta),
    }
    json.dump({"summary": summary, "articles": results}, open("/home/z/my-project/scripts/audit_all.json", "w"), indent=1)

    print("=== FULL AUDIT SUMMARY ===")
    for k, v in summary.items():
        print(f"  {k:<24} {v}")
    print()
    print("=== Issue type breakdown ===")
    from collections import Counter
    ic = Counter(i for r in with_issues for i in r["issues"])
    for k, v in ic.most_common():
        print(f"  {k:<20} {v}")
    print()
    print("=== Top 10 worst dead-link offenders ===")
    for r in sorted(results, key=lambda x: -len(x.get("dead_links", [])))[:10]:
        if r.get("dead_links"):
            print(f"  {r['slug'][:45]:<47} {len(r['dead_links'])} dead: {r['dead_links'][:3]}")


if __name__ == "__main__":
    main()
