#!/usr/bin/env python3
"""Mass professional repair of all published EN articles.

Phase A (all 839 articles) — objective link repairs:
  1. nested URL brackets:  [X](/blog/P1[T](/blog/FULL)P2)  -> [X](/blog/P1FULLP2)
  2. nested anchor links:  [[In](/blog/X)Rest](/blog/Y)    -> [In](/blog/X)
  3. dangling contractions:[A](/blog/X)'t                  -> [A't](/blog/X)
  4. dead blog/extension links -> keep anchor text, drop link

Phase B (quality-bar articles, >=1500 words, >=5 H2, no /extension/ links):
  add category-aware "Companion Extensions" section with rotated wording.

Every fix validates against live sitemap slugs + local slugs. Full report printed.
"""
import glob
import hashlib
import json
import re

BASE = "/home/z/my-project/repo-booster"
SITEMAP = "/home/z/my-project/scripts/extensionto_sitemap.xml"

# ---------- valid slug sets ----------
_sitemap = open(SITEMAP).read()
LIVE_BLOG = {
    u.replace("https://extensionto.com/blog/", "")
    for u in re.findall(r"<loc>(https://extensionto\.com/blog/[^<]+)</loc>", _sitemap)
    if not any(x in u for x in ["/fr/", "/es/", "/pt/", "/ar/"])
}
LIVE_EXT = {
    u.replace("https://extensionto.com/extension/", "")
    for u in re.findall(r"<loc>(https://extensionto\.com/extension/[^<]+)</loc>", _sitemap)
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
VALID_BLOG = LIVE_BLOG | LOCAL_SLUGS
VALID_EXT = LIVE_EXT

# ---------- Phase A repairers ----------
RE_NESTED_URL = re.compile(
    r"\]\(/blog/([a-zA-Z0-9\-]*)\[[^\]\n]*\]\(/blog/([a-zA-Z0-9\-]+)\)([a-zA-Z0-9\-]*)\)"
)


def fix_nested_url_brackets(text: str):
    changed = 0

    def rebuild(m):
        nonlocal changed
        p1, full, p2 = m.groups()
        for cand in (p1 + full + p2, full):
            if cand in VALID_BLOG:
                changed += 1
                return f"](/blog/{cand})"
        changed += 1
        return f"](/blog/{full})"  # best guess; will be caught by dead-link pass if invalid

    return RE_NESTED_URL.sub(rebuild, text), changed


RE_NESTED_ANCHOR = re.compile(
    r"\[\[([^\]\n]+)\]\((/blog/[^)\s]+)(?:\s+\"[^\"]*\")?\)[^\]\n]*\]\((/blog/[^)\s]+)(?:\s+\"[^\"]*\")?\)"
)


def fix_nested_anchor(text: str):
    changed = 0

    def rebuild(m):
        nonlocal changed
        inner_anchor, inner_url, outer_url = m.groups()
        inner_slug = inner_url.replace("/blog/", "")
        outer_slug = outer_url.replace("/blog/", "")
        for slug in (inner_slug, outer_slug):
            if slug in VALID_BLOG:
                changed += 1
                return f"[{inner_anchor}](/blog/{slug})"
        changed += 1
        return inner_anchor  # drop broken links, keep text

    return RE_NESTED_ANCHOR.sub(rebuild, text), changed


RE_DANGLING = re.compile(
    r"\[([^\]\n]+)\]\((/blog/[^)\s]+)(?:\s+\"[^\"]*\")?\)([a-z']{1,4})(?=[\s,.:;!?])"
)


def fix_dangling(text: str):
    changed = 0

    def rebuild(m):
        nonlocal changed
        anchor, url, dang = m.groups()
        changed += 1
        return f"[{anchor}{dang}]({url})"

    return RE_DANGLING.sub(rebuild, text), changed


RE_LINK = re.compile(r"\[([^\]\n]+)\]\((/blog/|/extension/)([^)\s]+)(?:\s+\"[^\"]*\")?\)")


def fix_dead_links(text: str):
    changed = 0

    def rebuild(m):
        nonlocal changed
        anchor, prefix, slug = m.groups()
        slug = slug.rstrip("/")
        valid = (slug in VALID_BLOG) if prefix == "/blog/" else (slug in VALID_EXT)
        if valid:
            return m.group(0)
        changed += 1
        return anchor  # unlink dead target, keep text

    return RE_LINK.sub(rebuild, text), changed


# ---------- Phase B: companion sections ----------
CAT_SETS = {
    "privacy": ["Redirect Shield", "Light Popup Blocker", "Cookie Banner Blocker", "SecuraKey Pro"],
    "performance": ["ProTab Suspender", "Light Popup Blocker", "Offline Reader Pro", "Auto Dark Mode Switcher"],
    "productivity": ["ProTab Suspender", "Quick Screenshot Lite", "Cookie Banner Blocker", "Light Popup Blocker"],
    "media": ["Quick Screenshot Lite", "Offline Reader Pro", "Light Popup Blocker", "ProTab Suspender"],
    "ai": ["Quick Screenshot Lite", "ProTab Suspender", "Cookie Banner Blocker", "Offline Reader Pro"],
    "redirect": ["Redirect Shield", "Light Popup Blocker", "ProTab Suspender", "Quick Screenshot Lite"],
    "appearance": ["Auto Dark Mode Switcher", "Offline Reader Pro", "Cookie Banner Blocker", "ProTab Suspender"],
    "generic": ["ProTab Suspender", "Quick Screenshot Lite", "Cookie Banner Blocker", "Offline Reader Pro"],
}
EXT_URL = {
    "Quick Screenshot Lite": "quick-screenshot-lite",
    "Light Popup Blocker": "light-popup-blocker",
    "Redirect Shield": "redirect-shield",
    "ProTab Suspender": "protab-suspender",
    "Offline Reader Pro": "offline-reader-pro",
    "SecuraKey Pro": "securakey-pro",
    "Cookie Banner Blocker": "cookie-banner-blocker",
    "Auto Dark Mode Switcher": "auto-dark-mode-switcher",
    "Formula Builder Pro": "formula-builder-pro",
}
EXT_DESC = {
    "Quick Screenshot Lite": "captures clean screenshots in two clicks so you can save or share exactly what you are looking at without juggling menus",
    "Light Popup Blocker": "keeps pop-ups and interstitials out of the way, which protects both your focus and your click accuracy",
    "Redirect Shield": "stops sneaky redirect chains before they load, saving you from junk pages and fake buttons",
    "ProTab Suspender": "puts idle tabs to sleep to free memory, keeping long browsing sessions smooth on any machine",
    "Offline Reader Pro": "saves articles as clean readable copies you can open later without ads, videos, or a connection",
    "SecuraKey Pro": "manages strong, unique passwords per site so the accounts behind your daily browsing stay protected",
    "Cookie Banner Blocker": "auto-dismisses consent walls so unfamiliar sites open straight to their content",
    "Auto Dark Mode Switcher": "switches every site to dark mode on a schedule, easier on the eyes during evening sessions",
    "Formula Builder Pro": "builds spreadsheet formulas from plain-language prompts, handy when your work crosses into Sheets or Excel",
}
CAT_RULES = [
    (("security", "privacy", "ad block", "vpn", "password", "antitrack", "ghostery", "blocker"), "privacy"),
    (("performance", "memory", "ram", "speed", "slow", "battery", "freeze", "crash"), "performance"),
    (("redirect", "navigation", "search engine", "homepage"), "redirect"),
    (("screenshot", "media", "download", "video", "youtube", "photo", "image"), "media"),
    (("ai", "chatgpt", "gemini", "summar"), "ai"),
    (("appearance", "theme", "dark mode", "font", "reader mode"), "appearance"),
    (("productivity", "workflow", "tool", "extension", "guide", "chrome"), "productivity"),
]


def classify(category: str, title: str, slug: str) -> str:
    hay = f"{category} {title} {slug}".lower()
    for keys, setname in CAT_RULES:
        if any(k in hay for k in keys):
            return setname
    return "generic"


INTRO_VARIANTS = [
    "A good {topic} setup is rarely one extension working alone. These are the four lightweight companions from our own catalog that pair naturally with the workflow described in this guide:",
    "If this guide solved one problem for you, the right companion extensions can solve the rest. Four picks from our catalog that fit this workflow:",
    "Over months of testing, a pattern keeps repeating: the best results come from pairing one focused tool with a few quiet helpers. These four from our catalog complete the setup described above:",
]
CLOSING_VARIANTS = [
    "Each one does a single job well, and together they remove the small frictions that add up across a browsing day.",
    "Install only what matches a real need in your day — that is exactly how we test and recommend them.",
    "All four are lightweight, free to try, and tested by our editorial team before recommending them here.",
]


def companion_block(category: str, title: str, slug: str) -> str:
    setname = classify(category, title, slug)
    names = CAT_SETS[setname]
    h = int(hashlib.md5(slug.encode()).hexdigest(), 16)
    intro = INTRO_VARIANTS[h % len(INTRO_VARIANTS)]
    closing = CLOSING_VARIANTS[h % len(CLOSING_VARIANTS)]
    lines = [f"## Companion Extensions That Complete Your Setup", "", intro, ""]
    for n in names:
        lines.append(f"- [{n}](/extension/{EXT_URL[n]}) — {EXT_DESC[n]}.")
    lines += ["", closing, ""]
    return "\n".join(lines)


def get_frontmatter_value(fm: str, key: str) -> str:
    m = re.search(rf'^{key}:\s*["\']?(.+?)["\']?\s*$', fm, re.M)
    return m.group(1).strip() if m else ""


def main():
    stats = {
        "files_scanned": 0, "files_modified_a": 0, "files_modified_b": 0,
        "nested_url": 0, "nested_anchor": 0, "dangling": 0, "dead_links": 0,
        "companions_added": 0, "companions_skipped_no_anchor": 0,
    }
    remaining_problems = []
    files = glob.glob(f"{BASE}/public/content/articles/**/*.md", recursive=True)
    for path in sorted(files):
        try:
            raw = open(path, encoding="utf-8").read()
        except Exception:
            continue
        m = re.match(r"^---\n(.*?)\n---\n", raw, re.S)
        if not m:
            continue
        fm = m.group(1)
        if re.search(r"^status:\s*['\"]?(\w+)", fm, re.M).group(1) != "published":
            continue
        stats["files_scanned"] += 1
        body = raw[m.end():]
        orig = body

        # Phase A
        body, n1 = fix_nested_url_brackets(body)
        body, n2 = fix_nested_anchor(body)
        body, n3 = fix_dangling(body)
        body, n4 = fix_dead_links(body)
        stats["nested_url"] += n1
        stats["nested_anchor"] += n2
        stats["dangling"] += n3
        stats["dead_links"] += n4

        # Phase B
        words = len(body.split())
        h2 = len(re.findall(r"^## ", body, re.M))
        already = body.count("](/extension/")
        if words >= 1500 and h2 >= 5 and already == 0 and "Companion Extensions That Complete Your Setup" not in body:
            category = get_frontmatter_value(fm, "category")
            title = get_frontmatter_value(fm, "title") or get_frontmatter_value(fm, "seo_title")
            slug = get_frontmatter_value(fm, "slug")
            block = companion_block(category, title, slug)
            # insert before FAQ / Conclusion / Verdict / Pro Tips, else append
            anchor_m = re.search(r"^## .*(Frequently Asked|FAQ|Final Verdict|Conclusion|Pro Tips|Key Takeaways).*$", body, re.M | re.I)
            if anchor_m:
                body = body[: anchor_m.start()] + block + body[anchor_m.start():]
                stats["companions_added"] += 1
            else:
                stats["companions_skipped_no_anchor"] += 1
        if body != orig:
            open(path, "w", encoding="utf-8").write(raw[: m.end()] + body)
            if body != "".join([orig]):
                pass
        if n1 + n2 + n3 + n4:
            stats["files_modified_a"] += 1
        if body != orig and not (n1 + n2 + n3 + n4):
            stats["files_modified_b"] += 1

        # residual problem scan
        residual = []
        if "[[" in body:
            residual.append("nested_brackets")
        if re.search(r"\]\((/blog/|/extension/)[^)]*\)[a-z']{1,4}(?=[\s,.:;!?])", body):
            residual.append("dangling")
        for mm in re.finditer(r"\]\(/blog/([^)\s]+)", body):
            if mm.group(1).rstrip("/") not in VALID_BLOG:
                residual.append("dead:" + mm.group(1)[:40])
                break
        if residual:
            remaining_problems.append({"file": path.split("/")[-1], "issues": residual})

    print("=== MASS REPAIR REPORT ===")
    for k, v in stats.items():
        print(f"  {k:<30} {v}")
    json.dump(remaining_problems, open("/home/z/my-project/scripts/residual_issues.json", "w"), indent=1)
    print(f"\nResidual problems: {len(remaining_problems)} (saved to residual_issues.json)")
    for r in remaining_problems[:15]:
        print("  ", r)


if __name__ == "__main__":
    main()
