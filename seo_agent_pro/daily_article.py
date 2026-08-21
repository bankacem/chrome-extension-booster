#!/usr/bin/env python3
"""
daily_article.py

Generates ONE new article per run, using the confirmed-working Bluesminds
gpt-4o model, and writes it directly into the site's content structure in
the exact frontmatter format public/content/articles-index.json expects
(see scripts/sync-articles.ts for the authoritative schema).

Designed to be run by .github/workflows/daily-article.yml on a daily
schedule. Does NOT push or open a PR itself - that's the workflow's job,
so this script stays a pure "generate one article" step that's easy to
test locally too.

Usage:
    python3 seo_agent_pro/daily_article.py
"""
import json
import os
import re
import subprocess
import sys
import uuid
from datetime import datetime, timezone
from pathlib import Path

sys.path.insert(0, os.path.dirname(__file__))

import modules as agent  # noqa: E402
import memory  # noqa: E402
from llm_router import call, find_working_model  # noqa: E402

ROOT = Path(__file__).resolve().parent.parent
QUEUE_PATH = Path(__file__).parent / "keyword_queue.txt"
STATE_PATH = Path(__file__).parent / "daily_article_state.json"
ARTICLES_DIR = ROOT / "public" / "content" / "articles"
# Tried in this order until one actually responds. agentrouter.org is kept
# first in case its WAF stops blocking GitHub Actions IPs later, but during
# diagnosis it returned an Alibaba Cloud WAF block page (HTML, not JSON) for
# every candidate URL — so groq/openrouter are the ones actually expected to
# work today. Override the whole chain with SEO_AGENT_MODEL=<name> to force
# a single specific model instead of probing.
MODEL_FALLBACK_CHAIN = [
    "agentrouter-gpt-4o",
    "bluesminds-gpt4o",
    "llama-3.1-70b-groq",
    "gpt-4o-mini",
    "claude-haiku",
]

# Fallback ONLY - used when a keyword_queue.txt line doesn't pin an explicit
# category via "keyword | Category". Real taxonomy in use across the site
# (see public/content/articles/**/*.md `category:` field): Productivity &
# Tools, Chrome Extensions, Security & Privacy, Performance & Memory,
# Media & Downloads, Appearance & Themes, AI Tools, Social Media Tools,
# Ad Blockers, Screenshots & Screen Capture, Redirect & Navigation.
DEFAULT_CATEGORY = "Productivity & Tools"
DEFAULT_FEATURED_IMAGE = "/og-image.png"
SUFFIX = " | ExtensionTo"
TARGET_TITLE_LEN = 60 - len(SUFFIX)  # 46 - same budget used across the site


# ──────────────────────────────────────────────────────────────
#  Keyword queue
# ──────────────────────────────────────────────────────────────

def load_queue() -> list:
    """Each line is either just a keyword, or 'keyword | Category' to pin
    an explicit category (must match one used elsewhere on the site - see
    the comment above DEFAULT_CATEGORY). Falls back to DEFAULT_CATEGORY
    only when no category is given, instead of always using it."""
    if not QUEUE_PATH.exists():
        return []
    lines = QUEUE_PATH.read_text(encoding="utf-8").splitlines()
    entries = []
    for ln in lines:
        ln = ln.strip()
        if not ln or ln.startswith("#"):
            continue
        if "|" in ln:
            kw, _, cat = ln.partition("|")
            entries.append((kw.strip(), cat.strip() or DEFAULT_CATEGORY))
        else:
            entries.append((ln, DEFAULT_CATEGORY))
    return entries


def load_state() -> dict:
    if STATE_PATH.exists():
        return json.loads(STATE_PATH.read_text(encoding="utf-8"))
    return {"used_keywords": []}


def save_state(state: dict) -> None:
    STATE_PATH.write_text(json.dumps(state, indent=2, ensure_ascii=False), encoding="utf-8")


def _infer_category(keyword: str) -> str:
    """Lightweight heuristic categorizer for keywords sourced from GSC,
    which don't come with a pre-assigned category the way keyword_queue.txt
    lines do. Falls back to a safe default — getting the category slightly
    wrong is much cheaper than skipping a real, evidenced keyword."""
    kw = keyword.lower()
    buckets = {
        "Performance & Memory": ["memory", "ram", "speed", "slow", "performance", "cache"],
        "Security & Privacy": ["privacy", "security", "vpn", "block", "password", "track"],
        "Productivity & Tools": ["productivity", "workflow", "tab", "notes", "translat"],
        "Ad Blockers": ["ad block", "adblock", "popup", "pop-up"],
    }
    for category, words in buckets.items():
        if any(w in kw for w in words):
            return category
    return "Chrome Extensions"


_KEYWORD_GENERIC_WORDS = {
    "how", "to", "a", "an", "the", "for", "of", "in", "on", "and", "or",
    "what", "is", "guide", "chrome", "extension", "extensions", "your",
    "you", "with", "vs", "2026", "2025", "best", "top",
}


def _content_words(text: str) -> set[str]:
    words = re.findall(r"[a-zA-Z0-9]+", text.lower())
    return {w for w in words if w not in _KEYWORD_GENERIC_WORDS and len(w) > 2}


def _is_topically_duplicate(keyword: str, index_path: Path = None) -> str | None:
    """Returns the slug of an existing published article this keyword
    would duplicate the intent of, or None if it's genuinely distinct.

    Cheap content-word-overlap check — not semantic/AI, just enough to
    catch the obvious case: pick_next_keyword() only ever checked whether
    the exact keyword STRING was used before, with no check against what's
    already published. First real run hit this directly: 'how to speed up
    a slow chrome browser' would have duplicated an existing article
    titled 'Speed Up Slow Chrome in 2026: 10 Fixes That Actually Work'
    almost word-for-word in intent.
    """
    index_path = index_path or (ROOT / "public" / "content" / "articles-index.json")
    if not index_path.exists():
        return None
    try:
        with open(index_path, encoding="utf-8") as f:
            data = json.load(f)
    except Exception:
        return None
    arr = data if isinstance(data, list) else data.get("articles", [])

    kw_words = _content_words(keyword)
    if len(kw_words) == 0:
        return None
    if len(kw_words) == 1:
        # A single content word only over-triggers when that word is a
        # generic domain term (e.g. "privacy" alone would match too much).
        # A single LONG/specific word (e.g. "freelancers") is actually a
        # strong, precise signal on its own — missed exactly this case:
        # 'best chrome extensions for freelancers' vs an existing 'Best
        # Chrome Extensions for Freelancers' article, skipped because the
        # old 3-word minimum excluded it entirely. Require the word be
        # reasonably specific (7+ chars) rather than requiring a word count
        # that a real duplicate can trivially fall under.
        word = next(iter(kw_words))
        if len(word) < 7:
            return None
        for a in arr:
            if word in _content_words(a.get("title", "")):
                return a.get("slug", "")
        return None
    if len(kw_words) == 2:
        # Two generic domain words (e.g. "online privacy") legitimately
        # overlap 100% with narrower single-product titles without being
        # duplicate intent — not enough signal on its own either way.
        return None

    for a in arr:
        title = a.get("title", "")
        title_words = _content_words(title)
        if not title_words:
            continue
        overlap = kw_words & title_words
        if len(overlap) / len(kw_words) >= 0.6:
            return a.get("slug", "")
    return None


def pick_next_keyword() -> tuple[str, str]:
    """Returns (keyword, category).

    Prefers a real, evidenced keyword opportunity from Google Search
    Console (queries the site already gets impressions for but ranks
    poorly on) over the hand-written queue — real search demand beats a
    guess. Falls back to keyword_queue.txt if GSC is unavailable/
    unconfigured/errors, or has nothing new to offer, so this never
    blocks a run. Skips any candidate that would duplicate an existing
    published article's intent rather than returning it blindly.
    """
    state = load_state()
    used = set(state.get("used_keywords", []))

    try:
        import gsc_client
        for opp in gsc_client.fetch_opportunity_keywords():
            kw = opp["query"].strip().lower()
            if kw and kw not in used:
                dup = _is_topically_duplicate(kw)
                if dup:
                    print(f"[Keyword] Skipping GSC opportunity {kw!r} — duplicates existing article: {dup}")
                    continue
                print(
                    f"[Keyword] Using real GSC opportunity: {kw!r} "
                    f"({opp['impressions']} impressions, position {opp['position']})"
                )
                return kw, _infer_category(kw)
    except Exception as e:
        print(f"[Keyword] GSC lookup unavailable ({e}) — falling back to keyword_queue.txt")

    queue = load_queue()
    for kw, category in queue:
        if kw in used:
            continue
        dup = _is_topically_duplicate(kw)
        if dup:
            print(f"[Keyword] Skipping queue keyword {kw!r} — duplicates existing article: {dup}")
            continue
        return kw, category
    raise SystemExit(
        "Keyword queue exhausted - add more lines to seo_agent_pro/keyword_queue.txt"
    )


def mark_keyword_used(keyword: str) -> None:
    state = load_state()
    state.setdefault("used_keywords", []).append(keyword)
    save_state(state)
    _commit_state_to_main_immediately(keyword)


def _commit_state_to_main_immediately(keyword: str) -> None:
    """Push the used_keywords update directly to main right now, decoupled
    from the article's own feature-branch PR that comes later in the
    workflow.

    Root cause this fixes: daily_article.py runs on main, but the actual
    article + its updated copy of daily_article_state.json only get
    committed to a NEW feature branch in a later workflow step — so the
    "keyword used" fact was trapped on that branch until its PR got
    reviewed and merged. Confirmed happening for real: two separate
    'best chrome extensions for email productivity' PRs, a day apart,
    neither one ever merged, so main's daily_article_state.json still
    showed the keyword as unused both times pick_next_keyword() ran.

    This is intentionally a tiny, isolated commit pushed the moment a
    keyword is chosen — before any expensive generation work — so the
    fact "this keyword was attempted" survives on main regardless of
    whether the subsequent article generation, evaluation, or PR review
    ever succeeds.
    """
    try:
        subprocess.run(["git", "add", str(STATE_PATH)], check=True, cwd=ROOT)
        result = subprocess.run(
            ["git", "commit", "-m", f"chore: mark keyword used - {keyword!r}"],
            cwd=ROOT, capture_output=True, text=True,
        )
        if result.returncode != 0:
            if "nothing to commit" in (result.stdout + result.stderr):
                return
            print(f"[Keyword] Note: state commit failed (non-fatal): {result.stderr.strip()}")
            return
        push = subprocess.run(
            ["git", "push", "origin", "HEAD:main"],
            cwd=ROOT, capture_output=True, text=True,
        )
        if push.returncode != 0:
            print(f"[Keyword] Note: state push failed (non-fatal, will retry via the normal PR flow): {push.stderr.strip()}")
        else:
            print(f"[Keyword] Marked {keyword!r} used directly on main.")
    except Exception as e:
        # Never let bookkeeping failure block the actual article run.
        print(f"[Keyword] Note: could not push state immediately (non-fatal): {e}")


# ──────────────────────────────────────────────────────────────
#  Content cleanup
# ──────────────────────────────────────────────────────────────

# The model occasionally writes a markdown image reference for a screenshot
# it can't actually produce (e.g. "![Screenshot of X](image-url-placeholder)").
# This is not a real image path, so publishing it verbatim renders a broken
# image on the live article. Strip any markdown image whose target is an
# obvious placeholder rather than a real path (starts with "/", "http", or a
# real relative file with an extension).
PLACEHOLDER_IMAGE_RE = re.compile(
    r"!\[[^\]]*\]\((?!/|https?://|\./)[^)]*(?:placeholder|your-image|example\.com|image-url)[^)]*\)\s*\n?",
    re.IGNORECASE,
)


def strip_placeholder_images(body: str) -> str:
    return PLACEHOLDER_IMAGE_RE.sub("", body)


# ──────────────────────────────────────────────────────────────
#  Formatting helpers (mirrors scripts/audit-long-titles.ts logic)
# ──────────────────────────────────────────────────────────────

# Generalized on purpose: hardcoding exact article+adjective pairs (e.g. only
# "the complete guide" but not "a complete guide") is exactly what produced
# the truncated seo_title "How to Clear Chrome Cache and Cookies: A" for the
# 2026-08-05 cache/cookies article — the filler wasn't stripped because "a
# complete guide" wasn't one of the hardcoded pairs, so the code fell through
# to hard word-boundary truncation and cut right after the dangling "A".
# Matching any (the|a|an) + adjective + guide combination closes that whole
# class of bug instead of patching one missed phrase at a time.
FILLER_PHRASE_RE = re.compile(
    r"\b(the|an?)\s+(ultimate|comprehensive|complete|full|definitive|"
    r"step-by-step|in-depth|detailed|essential)\s+guide\b",
    re.IGNORECASE,
)


def slugify(text: str) -> str:
    text = text.lower()
    text = re.sub(r"[^a-z0-9\s-]", "", text)
    text = re.sub(r"\s+", "-", text.strip())
    text = re.sub(r"-+", "-", text)
    return text.strip("-")


def make_seo_title(title: str) -> str | None:
    if len(title) <= TARGET_TITLE_LEN:
        return None  # not needed - full title already fits
    cleaned = FILLER_PHRASE_RE.sub("", title)
    cleaned = re.sub(r"([:\-\u2013\u2014])\s*(to|for|on|with|and)\s+", r"\1 ", cleaned, flags=re.IGNORECASE)
    cleaned = re.sub(r"^\s*(to|for|on|with|and)\s+", "", cleaned, flags=re.IGNORECASE)
    cleaned = re.sub(r"\s*[:\-\u2013\u2014]\s*$", "", cleaned)
    cleaned = re.sub(r"\s{2,}", " ", cleaned).strip()
    # Also drop a dangling connector word left stranded at the very end
    # (e.g. "...Cookies: with" after filler removal) — a title should never
    # end mid-phrase on a preposition/conjunction.
    cleaned = re.sub(
        r"[:\-\u2013\u2014]?\s*\b(to|for|on|with|and|a|an|the)\s*$",
        "",
        cleaned,
        flags=re.IGNORECASE,
    ).strip()
    if 6 <= len(cleaned) <= TARGET_TITLE_LEN:
        return cleaned[0].upper() + cleaned[1:]

    # Still too long after the light cleanup above. Rather than silently
    # giving up (the previous behavior — this is exactly what produced an
    # 86-char <title> tag for the accessibility article: cleanup couldn't
    # get it under budget, so seo_title was left unset and the site fell
    # back to the full uncut title + " | ExtensionTo"), hard-truncate at
    # the last word boundary that fits, never mid-word.
    #
    # NOTE: an earlier version of this fallback also tried "take the part
    # before the first colon/dash" first, on the theory that titles are
    # usually "Keyword Phrase: Subtitle". That was proven wrong here: for
    # "Unlocking the Power of Chrome: A Comprehensive Guide to Store
    # Extension Chrome" it returned "Unlocking the Power of Chrome",
    # dropping "Store Extension Chrome" - the actual product name - which
    # is the exact keyword-loss failure mode already found and removed
    # from scripts/audit-messy-slugs.ts and scripts/audit-long-titles.ts
    # for the same reason. Word-boundary truncation of the full cleaned
    # string doesn't privilege one side over the other, so it can't
    # reproduce that specific failure.
    if len(cleaned) > TARGET_TITLE_LEN:
        truncated = cleaned[:TARGET_TITLE_LEN].rsplit(" ", 1)[0].strip()
        truncated = re.sub(r"[:\-\u2013\u2014,]+$", "", truncated).strip()
        # Same stranded-connector guard as above, applied after hard
        # truncation too — truncation can just as easily land on "with"/"a".
        truncated = re.sub(
            r"[:\-\u2013\u2014]?\s*\b(to|for|on|with|and|a|an|the)\s*$",
            "",
            truncated,
            flags=re.IGNORECASE,
        ).strip()
        if 6 <= len(truncated) <= TARGET_TITLE_LEN:
            return truncated[0].upper() + truncated[1:]

    return None  # genuinely couldn't produce a safe short title (e.g. one giant word)


def partitioned_path(slug: str) -> Path:
    s = slug
    c1 = s[0] if len(s) > 0 else "_"
    c2 = s[1] if len(s) > 1 else "_"
    c3 = s[2] if len(s) > 2 else "_"
    return ARTICLES_DIR / c1 / c2 / c3 / f"{s}.md"


def yaml_str(value: str) -> str:
    escaped = value.replace("\\", "\\\\").replace('"', '\\"')
    return f'"{escaped}"'


def yaml_list(items: list) -> str:
    if not items:
        return " []"
    return "\n" + "\n".join(f"  - {item}" for item in items)


# ──────────────────────────────────────────────────────────────
#  Main pipeline
# ──────────────────────────────────────────────────────────────

def _generate_content(keyword: str, articles_written: int, model: str) -> tuple[str, str, str]:
    """Run the actual generation pipeline against one specific model. Raises
    on any failure — the caller decides whether to fall back to the next
    candidate model or give up."""
    competitor_data = agent.analyze_competitors(keyword, model)
    strategy = agent.decide_strategy(keyword, competitor_data, articles_written, model)
    raw_article = agent.write_article(keyword, strategy, model)

    # Extract H1 as the title; everything after it is the body.
    lines = raw_article.strip().splitlines()
    title = keyword
    body_start = 0
    for i, line in enumerate(lines):
        if line.strip().startswith("# "):
            title = line.strip()[2:].strip()
            body_start = i + 1
            break
    body = "\n".join(lines[body_start:]).strip()

    # Short meta description via a focused, cheap follow-up call.
    meta_description = call(
        "You write concise SEO meta descriptions. Reply with ONLY the description text, "
        "no preamble, no quotes, 140-160 characters.",
        f'Write a meta description for an article targeting the keyword "{keyword}". '
        f"Article title: {title}",
        model,
        max_tokens=200,
    ).strip().strip('"')

    return title, body, meta_description


def main():
    keyword, category = pick_next_keyword()

    # Load real persistent memory instead of a throwaway empty dict — this is
    # what lets the strategy engine know how many articles already exist and
    # steer the model away from repeating the same generic opening/angle.
    mem = memory.load()
    articles_written = len(mem.get("articles_written", []))

    forced_model = os.environ.get("SEO_AGENT_MODEL")
    if forced_model:
        candidates = [forced_model]
        print(f"Using forced model: {forced_model!r} (SEO_AGENT_MODEL set, no fallback)")
    else:
        candidates = list(MODEL_FALLBACK_CHAIN)

    # A model can pass the cheap connectivity probe in find_working_model()
    # and still fail mid-pipeline on a long call (this happened for real
    # during diagnosis: bluesminds-gpt4o answered a one-word probe fine, then
    # hit HTTP 500 on the ~2000-word article-writing call). So retry the
    # WHOLE pipeline against the next candidate instead of aborting the run
    # the first time that happens, up until every candidate is exhausted.
    MODEL = None
    title = body = meta_description = None
    remaining = list(candidates)
    pipeline_errors: list[str] = []

    while remaining:
        try:
            probe_model = find_working_model(remaining)
        except RuntimeError as e:
            pipeline_errors.append(str(e))
            break

        print(f"Attempting full generation with model: {probe_model!r}")
        try:
            title, body, meta_description = _generate_content(keyword, articles_written, probe_model)
            MODEL = probe_model
            break
        except SystemExit:
            pipeline_errors.append(f"{probe_model}: exited after exhausting retries mid-pipeline")
        except Exception as e:
            pipeline_errors.append(f"{probe_model}: failed mid-pipeline: {e}")

        print(f"  ✗ {probe_model} failed mid-pipeline — trying the next candidate model...")
        remaining = [m for m in remaining if m != probe_model]

    if MODEL is None:
        detail = "\n".join(f"  - {e}" for e in pipeline_errors)
        raise RuntimeError(f"All candidate models failed to generate an article.\n{detail}")

    print(f"Generating article for keyword: {keyword!r} (model={MODEL})")

    body = strip_placeholder_images(body)

    slug = slugify(title)
    seo_title = make_seo_title(title)
    word_count = len(body.split())
    read_time = max(1, round(word_count / 200))

    frontmatter_lines = ["---"]
    if seo_title:
        frontmatter_lines.append(f"seo_title: {yaml_str(seo_title)}")
    frontmatter_lines += [
        f"id: {uuid.uuid4()}",
        f"title: {yaml_str(title)}",
        f"slug: {slug}",
        # sync-articles.ts skips (silently excludes from the index AND
        # sitemap) any article whose frontmatter status != "published".
        # This field was missing entirely before, so every article this
        # script generated was written to disk successfully but never
        # showed up in articles-index.json, sitemap.xml, or the /blog
        # listing — the run looked 100% green with no error anywhere.
        "status: published",
        f"excerpt: {yaml_str(meta_description)}",
        f"meta_description: {yaml_str(meta_description)}",
        f"featured_image: {DEFAULT_FEATURED_IMAGE}",
        f"category: {category}",
        f"tags:{yaml_list([])}",
        f"keywords:{yaml_list([keyword])}",
        "author: Miccart Phen",
        f"published_at: {datetime.now(timezone.utc).strftime('%Y-%m-%d')}",
        f"read_time: {read_time}",
        "---",
        "",
    ]

    full_content = "\n".join(frontmatter_lines) + body + "\n"

    out_path = partitioned_path(slug)
    out_path.parent.mkdir(parents=True, exist_ok=True)
    if out_path.exists():
        print(f"WARNING: {out_path} already exists - not overwriting. Skipping.")
        raise SystemExit(1)
    out_path.write_text(full_content, encoding="utf-8")

    mark_keyword_used(keyword)

    # Persist this run so the NEXT run knows the real article count and can
    # keep steering away from angles/openings already used.
    memory.record_article(mem, keyword, body, MODEL)

    print(f"Wrote: {out_path.relative_to(ROOT)}")
    print(f"Title: {title}")
    print(f"Slug: {slug}")
    print(f"Word count: {word_count}")

    # Emit machine-readable info for the workflow to use in the PR body.
    gh_output = os.environ.get("GITHUB_OUTPUT")
    if gh_output:
        with open(gh_output, "a", encoding="utf-8") as f:
            f.write(f"article_title={title}\n")
            f.write(f"article_slug={slug}\n")
            f.write(f"article_keyword={keyword}\n")
            f.write(f"article_path={out_path.relative_to(ROOT)}\n")


if __name__ == "__main__":
    main()
