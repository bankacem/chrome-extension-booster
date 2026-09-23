#!/usr/bin/env python3
"""Pass 2: residual structural fixes.

- glued/duplicated TOC entries (missing newline + duplicate lines)
- TOC entries that contain a nested markdown link  -> plain text entry
- [[A](URL)Rest](/blog/Y) mixed nesting            -> [A Rest](/blog/Y)
- [[A](/blog/X)](/undefined)                       -> [A](/blog/X)
- stray closing bracket after link: ](URL)]        -> ](URL)
Reports leftover issues at the end.
"""
import glob
import json
import re

BASE = "/home/z/my-project/repo-booster"
SITEMAP = "/home/z/my-project/scripts/extensionto_sitemap.xml"
_sitemap = open(SITEMAP).read()
LIVE_BLOG = {
    u.replace("https://extensionto.com/blog/", "")
    for u in re.findall(r"<loc>(https://extensionto\.com/blog/[^<]+)</loc>", _sitemap)
    if not any(x in u for x in ["/fr/", "/es/", "/pt/", "/ar/"])
}
LOCAL_SLUGS = set()
for f in glob.glob(f"{BASE}/public/content/articles/**/*.md", recursive=True):
    try:
        c = open(f, encoding="utf-8", errors="ignore").read()
    except Exception:
        continue
    m = re.search(r"^slug:\s*['\"]?([^'\"\n]+)", c, re.M)
    if m:
        LOCAL_SLUGS.add(m.group(1).strip())
VALID = LIVE_BLOG | LOCAL_SLUGS

RE_MIXED = re.compile(
    r"\[\[([^\]\n]+)\]\((https?://[^)\s]+|/(?:blog|extension)/[^)\s]+)\)([^\]\n]*)\]\(([^)\s]+)(?:\s+\"[^\"]*\")?\)"
)
RE_UNDEFINED = re.compile(r"\[\[([^\]\n]+)\]\(([^)\s]+)\)\]\(/undefined\)")
RE_TRAILING = re.compile(r"(\]\((?:https?://|/blog/)[^)\s]+\))\](?=[\s.,])")
RE_TOCSPLIT = re.compile(r"(\]\(#[a-zA-Z0-9\-]+\))-\s*(\[[^\n]*)")


def strip_inner_links(anchor_text: str) -> str:
    """Remove markdown link markup inside anchor text, keep visible words."""
    return re.sub(r"\[([^\]]+)\]\([^)]*\)", r"\1", anchor_text)


def fix_toc_block(body: str):
    changed = 0
    m = re.search(r"^## Table of Contents\s*$", body, re.M)
    if not m:
        return body, 0
    start = m.end()
    # TOC = contiguous lines starting with "- [" possibly glued; ends at blank-line followed by ## or non-list
    end_m = re.search(r"\n(?=\s*[^-\s]|\n## )", body[start:])
    end = start + (end_m.start() if end_m else 0)
    toc = body[start:end]

    # 1. split glued entries
    toc2, n_glue = RE_TOCSPLIT.subn(r"\1\n- \2", toc)
    # 2. clean nested links inside entries
    def clean_entry(e):
        return re.sub(
            r"-\s*\[\[(?:([^\]]+)\]\([^)]*\))([^\]]*)\]\((#[^)\s]+)\)",
            lambda mm: f"- [{strip_inner_links(mm.group(1) + mm.group(2))}]({mm.group(3)})",
            e,
        )
    toc3 = re.sub(
        r"-\s*\[\[[^\n]*\]\(#[^)\s]+\)",
        lambda mm: clean_entry(mm.group(0)),
        toc2,
    )
    # 3. dedup by href
    seen = set()
    out_lines = []
    for line in toc3.split("\n"):
        hm = re.match(r"^\s*- \[[^\]]*\]\((#[^)\s]+)\)", line)
        if hm:
            href = hm.group(1).strip()
            if href in seen:
                changed += 1
                continue
            seen.add(href)
        if line.strip():
            out_lines.append(line)
    toc_final = "\n".join(out_lines).rstrip() + "\n"
    changed += n_glue
    return body[:start] + toc_final + body[end:], changed


def main():
    stats = {"toc_fixed": 0, "mixed_nested": 0, "undefined": 0, "trailing": 0, "files": 0}
    residual = []
    files = glob.glob(f"{BASE}/public/content/articles/**/*.md", recursive=True)
    for path in sorted(files):
        try:
            raw = open(path, encoding="utf-8").read()
        except Exception:
            continue
        if not raw.startswith("---"):
            continue
        body_m = re.match(r"^---\n.*?\n---\n", raw, re.S)
        if not body_m:
            continue
        body = raw[body_m.end():]
        orig = body

        def sub_mixed(mo):
            a, url1, rest, url2 = mo.group(1), mo.group(2), mo.group(3), mo.group(4)
            text = a + rest
            if url2.startswith("/blog/") and url2.replace("/blog/", "").rstrip("/") in VALID:
                stats["mixed_nested"] += 1
                return f"[{strip_inner_links(text)}]({url2})"
            if url1.startswith("/blog/") and url1.replace("/blog/", "").rstrip("/") in VALID:
                stats["mixed_nested"] += 1
                return f"[{strip_inner_links(text)}]({url1})"
            if url1.startswith("http"):
                stats["mixed_nested"] += 1
                return f"[{strip_inner_links(text)}]({url1})"
            stats["mixed_nested"] += 1
            return strip_inner_links(text)

        body = RE_MIXED.sub(sub_mixed, body)
        body, n_und = RE_UNDEFINED.subn(lambda mo: f"[{mo.group(1)}]({mo.group(2)})", body)
        stats["undefined"] += n_und
        body, n_tr = RE_TRAILING.subn(r"\1", body)
        stats["trailing"] += n_tr
        body, n_toc = fix_toc_block(body)
        stats["toc_fixed"] += n_toc

        if body != orig:
            open(path, "w", encoding="utf-8").write(raw[: body_m.end()] + body)
            stats["files"] += 1
        # residual check
        if "[[" in body:
            residual.append({"file": path.split("/")[-1], "type": "nested_brackets"})

    print("=== PASS 2 REPORT ===")
    for k, v in stats.items():
        print(f"  {k:<18} {v}")
    print(f"\nResidual nested-bracket files: {len(residual)}")
    json.dump(residual, open("/home/z/my-project/scripts/residual_pass2.json", "w"), indent=1)
    for r in residual[:20]:
        print("  ", r["file"])


if __name__ == "__main__":
    main()
