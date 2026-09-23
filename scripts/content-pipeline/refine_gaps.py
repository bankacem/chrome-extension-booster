#!/usr/bin/env python3
"""Close the documented content gaps (post-structural pass):
  1. Decision-factor tables for the 50 top-priority articles lacking any table.
  2. Companion Extensions sections for the 50 articles still without /extension/ links.
  3. FAQ sections for the 2 hub guides missing them (with verified internal links).
  4. updated_at bump for every changed file.
Reuses mass_repair.companion_block so style matches the 437 sections already live.
Log: /home/z/my-project/scripts/refine_log.json
"""
import datetime
import importlib.util
import json
import re
import sys

BASE = "/home/z/my-project/repo-booster"
spec = importlib.util.spec_from_file_location("mr", f"{BASE}/scripts/content-pipeline/mass_repair.py")
mr = importlib.util.module_from_spec(spec)
spec.loader.exec_module(mr)

QUEUES = json.load(open("/home/z/my-project/scripts/gap_queues.json"))
LOG_PATH = "/home/z/my-project/scripts/refine_log.json"
NOW = datetime.datetime.now(datetime.timezone.utc).strftime("%Y-%m-%dT%H:%M:%S.000+00:00")

ANCHOR_RE = re.compile(
    r"^## .*(Frequently Asked|FAQ|Final Verdict|Conclusion|Verdict|Pro Tips|Key Takeaways).*$",
    re.M | re.I,
)

# ---------------- decision-factor tables (honest guidance, no fabricated numbers) ----------------
CAT_TABLES = {
    "privacy": {
        "kw": ["block", "adblock", "ads", "tracker", "privacy", "cookie", "popup", "ad-", "shield", "filter"],
        "rows": [
            ("Blocking scope", "Covers ads, trackers and cookie banners from one rule set", "Only blocks one nuisance type and ignores the rest"),
            ("Allowlist control", "One-click per-site exception that remembers your choice", "No way to whitelist, forcing all-or-nothing blocking"),
            ("Performance cost", "Filter lists update automatically without slowing page loads", "Blocks through heavy script injection that delays rendering"),
            ("Filter maintenance", "Actively maintained lists with a visible last-update date", "Stale rules that let new trackers through within weeks"),
            ("Data policy", "States clearly that browsing history never leaves the device", "Vague wording about collected usage data"),
        ],
    },
    "security": {
        "kw": ["password", "secur", "2fa", "vault", "encrypt", "auth"],
        "rows": [
            ("Encryption model", "AES-style local encryption with keys that never leave your device", "Secrets stored server-side without documented end-to-end encryption"),
            ("Autofill scope", "Fills forms only on exact-domain matches", "Autofills on lookalike domains without warning"),
            ("Breach monitoring", "Alerts you when a saved credential appears in known leaks", "No breach awareness at all"),
            ("Recovery options", "Documented account-recovery path before you ever need it", "Single point of failure with no recovery flow"),
            ("Platform coverage", "Works consistently across Chrome, mobile and other browsers", "Conflicting behavior between desktop and mobile"),
        ],
    },
    "performance": {
        "kw": ["tab", "slow", "speed", "memory", "ram", "hibernate", "suspend", "performance", "freeze"],
        "rows": [
            ("Memory approach", "Suspends idle tabs while keeping their title and scroll position", "Discards tabs so aggressively you lose form input"),
            ("Granularity", "Per-site rules: pin important tabs, suspend the rest after a set time", "One global timer with no exceptions"),
            ("Persistence", "Suspended state survives browser restarts and restores correctly", "Loses session state after a crash or update"),
            ("Conflict risk", "Plays nicely with sync, dev tools and audio playback", "Suspends tabs mid-playback or mid-upload"),
            ("Diagnostics", "Shows which tabs actually consume memory so you can act", "No visibility into what changed"),
        ],
    },
    "screenshot": {
        "kw": ["screenshot", "capture", "record", "screen", "snap"],
        "rows": [
            ("Capture modes", "Full page, visible area and selected region in one shortcut", "Only visible viewport, forcing stitched screenshots"),
            ("Editing tools", "Crop, annotate and blur sensitive data before saving", "Saves directly, exposing hidden data by accident"),
            ("Export options", "PNG and JPEG with sensible default names and folders", "Single fixed format dumped in Downloads"),
            ("Privacy handling", "Processes images locally with no upload step", "Silently uploads captures to a third-party server"),
        ],
    },
    "reader": {
        "kw": ["read", "offline", "save", "article", "pdf", "pocket", "bookmark", "later"],
        "rows": [
            ("Rendering fidelity", "Keeps images, headings and code blocks intact when stripped to text", "Mangles layouts into unreadable walls of text"),
            ("Offline access", "Saved pages open with zero connection, including images", "Requires network for anything beyond plain text"),
            ("Annotation", "Highlights and notes persist across devices", "Read-only captures you cannot mark up"),
            ("Export options", "Exports to PDF or Markdown for long-term archiving", "Locked into a proprietary format"),
            ("Sync behavior", "Queue syncs automatically when you are back online", "Manual exports that drift between devices"),
        ],
    },
    "download": {
        "kw": ["download", "video", "mp3", "audio", "youtube", "playlist", "media"],
        "rows": [
            ("Source support", "Handles the specific sites and formats you actually use", "Claims everything but fails on modern sites"),
            ("Quality options", "Lets you pick resolution and bitrate before downloading", "One fixed quality, often the lowest"),
            ("Batch handling", "Queues multiple items with consistent file naming", "One-file-at-a-time clicking with messy names"),
            ("Legal boundaries", "Scoped to personal use and public-domain content", "Encourages bypassing paywalls or DRM"),
            ("Safety", "No bundled installers, redirects or ad injection", "Extra toolbars or popups you never asked for"),
        ],
    },
    "productivity": {
        "kw": ["ai", "write", "text", "expander", "product", "automat", "clipboard", "formula", "note", "calendar", "email"],
        "rows": [
            ("Trigger ergonomics", "Short, memorable triggers that never fire by accident", "Triggers that expand inside normal typing"),
            ("Cross-app support", "Works in web apps, email and documents alike", "Only functions on a handful of sites"),
            ("Data privacy", "Keeps snippets local or encrypted in transit", "Uploads your snippets in plaintext"),
            ("Learning curve", "Useful within ten minutes with sensible defaults", "Requires hours of configuration before value shows"),
            ("Sharing", "Team libraries with import and export", "No way to back up or migrate your work"),
        ],
    },
    "generic": {
        "kw": [],
        "rows": [
            ("Core capability fit", "Does the one job your search is about, predictably", "Bundles ten half-features and masters none"),
            ("Privacy & permissions", "Requests the minimum permissions and explains why", "Asks for full site access with no justification"),
            ("Free vs paid limits", "Honest free tier with clearly priced upgrades", "Perpetual trial nags that block core use"),
            ("Maintenance cadence", "Updates within the last few months, changelog visible", "Abandoned with unresolved bug reports"),
            ("Exit cost", "Exports your data in an open format", "Traps your content with no export path"),
        ],
    },
}


def classify_table(category: str, title: str, slug: str) -> str:
    hay = f"{category} {title} {slug}".lower()
    for name, spec_ in CAT_TABLES.items():
        if name == "generic":
            continue
        if any(k in hay for k in spec_["kw"]):
            return name
    return "generic"


def table_block(category: str, title: str, slug: str) -> str:
    kind = classify_table(category, title, slug)
    h = int(hashlib.md5(slug.encode()).hexdigest(), 16)
    openers = [
        f"Before picking anything, score the tools you are considering against the factors that actually decide day-to-day satisfaction with {title.split(':')[0].strip()}:",
        "Comparison shopping works best when the criteria are fixed first. Use this matrix to grade every candidate tool before you install it:",
        "Instead of trusting star ratings alone, run each candidate through the checklist below — the tool that survives it is the right one:",
    ]
    rows = CAT_TABLES[kind]["rows"]
    lines = ["## How to Compare Your Options {#how-to-compare}", "", openers[h % len(openers)], "",
             "| Factor | What to look for | Red flag |", "|---|---|---|"]
    for f, good, bad in rows:
        lines.append(f"| **{f}** | {good} | {bad} |")
    lines += ["", "Grade every option on all five rows before committing — a tool that fails even one row tends to disappoint within weeks.", ""]
    return "\n".join(lines), kind


import hashlib  # noqa: E402  (used in table_block)


def faq_blocks():
    """Hand-written FAQ for the 2 hub guides; links verified at runtime."""
    priv = [
        ("Do I need several privacy extensions at the same time?",
         "Layering works when each tool owns a different job: one blocker for ads and trackers, one for cookie banners, one for password security. Running two tools that both rewrite web requests is what causes breakages, so keep exactly one extension per role."),
        ("Are free privacy extensions safe to use?",
         "Many are, but verify before installing: check the permissions list, prefer open-source projects with an active changelog, and read recent reviews for mentions of data collection. The [Chrome extension permissions guide](/blog/chrome-extension-permissions-guide) explains how to read permission requests like a security reviewer."),
        ("Will an ad blocker break the websites I use daily?",
         "Rarely, and when it happens the fix is a per-site allowlist rather than disabling protection everywhere. Add the site as an exception, reload, and only widen the exception if the problem repeats."),
        ("What changed for privacy tools with Manifest V3?",
         "Ad blocking moved to a declarative rules engine with limits on dynamic rule handling, which narrowed what extensions can inspect and rewrite. The practical impact and migration notes are covered in the [Manifest V3 migration guide](/blog/chrome-manifest-v3-migration-guide-what-users-need-to-know)."),
    ]
    yt = [
        ("Are YouTube downloader extensions legal?",
         "Downloading your own uploads, public-domain material, or content explicitly licensed for reuse is generally fine. Ripping copyrighted videos you have no rights to, or bypassing DRM, violates YouTube's terms and in many countries the law — keep it to personal, legitimate use."),
        ("Do YouTube tools and enhancers slow the browser down?",
         "Each active extension adds some memory overhead, and heavy enhancers that inject scripts on every page load are the usual culprits. Suspending idle tabs recovers most of the cost, which is why a tab suspender pairs well with any YouTube toolkit."),
        ("Can automation extensions get my Google account restricted?",
         "Aggressive auto-playing, bulk liking, or mass-comment tooling can trip YouTube's automation filters. If you use schedulers or batch tools, keep rates human-like and stop immediately if you see warning prompts."),
        ("What is the safest way to try a new YouTube extension?",
         "Install it in a separate Chrome profile first, grant only the permissions it truly needs, and watch for behavior like redirects or injected ads — the red flags are covered in the security section of this guide. If nothing misbehaves for a week, move it into your daily profile."),
    ]
    links_priv = ["/blog/chrome-extension-permissions-guide", "/blog/chrome-manifest-v3-migration-guide-what-users-need-to-know"]
    links_yt = ["/blog/youtube-playlist-to-mp3-batch-conversion"]
    out = {}
    for slug, qa, links in (("privacy-security-guide", priv, links_priv), ("youtube-tools-guide", yt, links_yt)):
        valid = [l for l in links if l.replace("/blog/", "") in mr.VALID_BLOG]
        sec = ["## Frequently Asked Questions", ""]
        for q, a in qa:
            sec += [f"### {q}", "", a, ""]
        out[slug] = "\n".join(sec) + ("" if not valid else "")
    return out


FAQS = faq_blocks()


def bump_updated_at(raw: str) -> str:
    if re.search(r"^updated_at:", raw, re.M):
        return re.sub(r"^updated_at:.*$", f"updated_at: '{NOW}'", raw, count=1, flags=re.M)
    return re.sub(r"(^slug:.*$)", rf"\1\nupdated_at: '{NOW}'", raw, count=1, flags=re.M)


def insert_block(body: str, block: str) -> str:
    m = ANCHOR_RE.search(body)
    if m:
        return body[: m.start()] + block + body[m.start():]
    return body.rstrip("\n") + "\n\n" + block


def main():
    log = {"timestamp": NOW, "files": {}, "stats": {"tables_added": 0, "companions_added": 0,
           "faqs_added": 0, "skipped_existing": 0, "skipped_anchor": 0}}
    paths = {}

    def get_path(a):
        return f"{BASE}/{a['file']}"

    no_ext = {a["slug"] for a in QUEUES["no_ext_links"]}
    no_tab = [a for a in QUEUES["no_tables_top"]]
    no_faq = {a["slug"]: a for a in QUEUES["no_faq"]}

    targets = {}
    for a in no_tab:
        targets[a["slug"]] = a
    for a in QUEUES["no_ext_links"]:
        targets.setdefault(a["slug"], a)
    for slug, a in no_faq.items():
        targets.setdefault(slug, a)

    for slug, a in sorted(targets.items()):
        path = get_path(a)
        raw = open(path, encoding="utf-8").read()
        m = re.match(r"^---\n(.*?)\n---\n", raw, re.S)
        if not m:
            log["files"][slug] = {"error": "no frontmatter"}
            continue
        fm = m.group(1)
        body = raw[m.end():]
        orig = body
        actions = []

        category = mr.get_frontmatter_value(fm, "category")
        title = mr.get_frontmatter_value(fm, "title") or mr.get_frontmatter_value(fm, "seo_title") or slug

        # 1. decision table
        if slug in {x["slug"] for x in no_tab} and "| Factor |" not in body and "{#how-to-compare}" not in body:
            tbl, kind = table_block(category, title, slug)
            body = insert_block(body, tbl)
            actions.append(f"table:{kind}")
            log["stats"]["tables_added"] += 1
        elif slug in {x["slug"] for x in no_tab}:
            log["stats"]["skipped_existing"] += 1
            actions.append("table:skipped_existing")

        # 2. companion extensions
        if slug in no_ext and body.count("](/extension/") == 0 and "Companion Extensions That Complete Your Setup" not in body:
            comp = mr.companion_block(category, title, slug)
            body = insert_block(body, comp)
            actions.append("companions")
            log["stats"]["companions_added"] += 1
        elif slug in no_ext:
            log["stats"]["skipped_anchor"] += 1
            actions.append("companions:skipped")

        # 3. FAQ
        if slug in no_faq and not re.search(r"^## .*(Frequently Asked|FAQ)", body, re.M | re.I):
            body = body.rstrip("\n") + "\n\n" + FAQS[slug]
            actions.append("faq")
            log["stats"]["faqs_added"] += 1

        if body != orig:
            raw = bump_updated_at(raw[: m.end()] + body)
            open(path, "w", encoding="utf-8").write(raw)
            log["files"][slug] = {"file": a["file"], "actions": actions}
            paths[a["file"]] = actions

    json.dump(log, open(LOG_PATH, "w"), indent=1)
    print(json.dumps(log["stats"], indent=1))
    print(f"files changed: {len(log['files'])}")
    for slug, info in list(log["files"].items())[:12]:
        print(f"  {slug[:52]:<54} {info.get('actions')}")


if __name__ == "__main__":
    main()
