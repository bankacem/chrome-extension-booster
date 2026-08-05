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

DEFAULT_CATEGORY = "Productivity & Tools"
DEFAULT_FEATURED_IMAGE = "/og-image.png"
SUFFIX = " | ExtensionTo"
TARGET_TITLE_LEN = 60 - len(SUFFIX)  # 46 - same budget used across the site


# ──────────────────────────────────────────────────────────────
#  Keyword queue
# ──────────────────────────────────────────────────────────────

def load_queue() -> list:
    if not QUEUE_PATH.exists():
        return []
    lines = QUEUE_PATH.read_text(encoding="utf-8").splitlines()
    return [ln.strip() for ln in lines if ln.strip() and not ln.strip().startswith("#")]


def load_state() -> dict:
    if STATE_PATH.exists():
        return json.loads(STATE_PATH.read_text(encoding="utf-8"))
    return {"used_keywords": []}


def save_state(state: dict) -> None:
    STATE_PATH.write_text(json.dumps(state, indent=2, ensure_ascii=False), encoding="utf-8")


def pick_next_keyword() -> str:
    queue = load_queue()
    state = load_state()
    used = set(state.get("used_keywords", []))
    for kw in queue:
        if kw not in used:
            return kw
    raise SystemExit(
        "Keyword queue exhausted - add more lines to seo_agent_pro/keyword_queue.txt"
    )


def mark_keyword_used(keyword: str) -> None:
    state = load_state()
    state.setdefault("used_keywords", []).append(keyword)
    save_state(state)


# ──────────────────────────────────────────────────────────────
#  Formatting helpers (mirrors scripts/audit-long-titles.ts logic)
# ──────────────────────────────────────────────────────────────

FILLER_PHRASE_RE = re.compile(
    r"\b(the ultimate guide|a comprehensive guide|the complete guide|a step-by-step guide)\b",
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
    cleaned = re.sub(r"([:\-\u2013\u2014])\s*(to|for|on)\s+", r"\1 ", cleaned, flags=re.IGNORECASE)
    cleaned = re.sub(r"^\s*(to|for|on)\s+", "", cleaned, flags=re.IGNORECASE)
    cleaned = re.sub(r"\s*[:\-\u2013\u2014]\s*$", "", cleaned)
    cleaned = re.sub(r"\s{2,}", " ", cleaned).strip()
    if 6 <= len(cleaned) <= TARGET_TITLE_LEN:
        return cleaned[0].upper() + cleaned[1:]

    # Still too long after the light cleanup above. Rather than silently
    # giving up (the previous behavior — this is exactly what produced an
    # 86-char <title> tag for the accessibility article: cleanup couldn't
    # get it under budget, so seo_title was left unset and the site fell
    # back to the full uncut title + " | ExtensionTo"). Two more attempts,
    # in order, before finally giving up:
    #
    # 1. Titles are usually "Main Keyword Phrase: Subtitle" — the part
    #    before the first colon/dash is normally the actual keyword target
    #    and reads fine standalone. Use it if it fits the budget.
    head = re.split(r"[:\u2013\u2014]|(?<!\w)-(?!\w)", cleaned, maxsplit=1)[0].strip()
    if 6 <= len(head) <= TARGET_TITLE_LEN:
        return head[0].upper() + head[1:]

    # 2. Hard word-boundary truncation — cut at the last whitespace that
    #    still fits, never mid-word.
    if len(cleaned) > TARGET_TITLE_LEN:
        truncated = cleaned[:TARGET_TITLE_LEN].rsplit(" ", 1)[0].strip()
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
    ).strip().strip('"')

    return title, body, meta_description


def main():
    keyword = pick_next_keyword()

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
        f"category: {DEFAULT_CATEGORY}",
        f"tags:{yaml_list([])}",
        f"keywords:{yaml_list([keyword])}",
        "author: Admin",
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
