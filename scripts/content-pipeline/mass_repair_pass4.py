#!/usr/bin/env python3
"""Pass 4: outer-link-wrapping-inner-link cases like
   [Text [Inner](/blog/X) Rest](/blog/Y)
Resolution: prefer valid outer URL; else valid inner URL; else plain text.
Special-case digit citations: [1 [2](u1)](u2) style -> separate clean links.
"""
import glob
import re

BASE = "/home/z/my-project/repo-booster"
SITEMAP = "/home/z/my-project/scripts/extensionto_sitemap.xml"
_s = open(SITEMAP).read()
LIVE_BLOG = {
    u.replace("https://extensionto.com/blog/", "")
    for u in re.findall(r"<loc>(https://extensionto\.com/blog/[^<]+)</loc>", _s)
    if not any(x in u for x in ["/fr/", "/es/", "/pt/", "/ar/"])
}
LOCAL = set()
for f in glob.glob(f"{BASE}/public/content/articles/**/*.md", recursive=True):
    try:
        c = open(f, encoding="utf-8", errors="ignore").read()
    except Exception:
        continue
    m = re.search(r"^slug:\s*['\"]?([^'\"\n]+)", c, re.M)
    if m:
        LOCAL.add(m.group(1).strip())
VALID = LIVE_BLOG | LOCAL

RE_OUTER_WRAP = re.compile(
    r"(?<!!)\[([^\]\n]*\[[^\]\n]*\]\([^)\s]+\)[^\]\n]*)\]\(([^)\s]+)(?:\s+\"[^\"]*\")?\)"
)
RE_INNER_URL = re.compile(r"\[([^\]]*)\]\(([^)\s]+)\)")


def clean(text: str) -> str:
    return RE_INNER_URL.sub(r"\1", text).replace("  ", " ").strip()


def is_valid(url: str) -> bool:
    if url.startswith("http"):
        return True
    if url.startswith("/blog/"):
        return url.replace("/blog/", "").rstrip("/") in VALID
    return False


def main():
    files_fixed = 0
    total = 0
    residual = 0
    for path in sorted(glob.glob(f"{BASE}/public/content/articles/**/*.md", recursive=True)):
        try:
            c = open(path, encoding="utf-8", errors="ignore").read()
        except Exception:
            continue

        def rebuild(mo):
            anchor, outer = mo.group(1), mo.group(2)
            inner_m = RE_INNER_URL.search(anchor)
            inner = inner_m.group(2) if inner_m else ""
            text = clean(anchor)
            # digit citations "1 2" -> keep separate links when both urls valid
            if re.fullmatch(r"\d+(\s+\d+)*", text) and inner:
                parts = []
                nums = text.split()
                urls = [outer, inner]
                for nnum, u in zip(nums, urls):
                    if is_valid(u):
                        parts.append(f"[{nnum}]({u})")
                if parts:
                    return " ".join(parts)
            if is_valid(outer):
                return f"[{text}]({outer})"
            if inner and is_valid(inner):
                return f"[{text}]({inner})"
            return text

        new = RE_OUTER_WRAP.sub(rebuild, c)
        if new != c:
            open(path, "w", encoding="utf-8").write(new)
            files_fixed += 1
            total += len(RE_OUTER_WRAP.findall(c))
        if RE_OUTER_WRAP.search(new):
            residual += 1

    print(f"pass4: {total} links repaired across {files_fixed} files; residual files: {residual}")


if __name__ == "__main__":
    main()
