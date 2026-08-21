"""
CLI entrypoint for the 7-agent pipeline (Phase 1 of the design doc).

Usage:
    python3 agentic/run.py                    # pick next keyword from the queue
    python3 agentic/run.py --keyword "..."    # force a specific keyword
    SEO_AGENT_MODEL=llama-3.1-70b-groq python3 agentic/run.py   # force one model, skip fallback probing

This does NOT replace daily_article.py — that script still exists and still
works as the simple, no-evaluator pipeline. This is the opt-in richer
pipeline: research → strategy → content → optimize → evaluate → (revise)*
→ learning, with a real reject path (writes status: draft instead of
status: published — reusing the exact frontmatter field sync-articles.ts
already checks, so a rejected article never silently reaches the live site,
and a human can review it and flip the field by hand).
"""

from __future__ import annotations

import argparse
import os
import sys
import uuid
from datetime import datetime, timezone
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))
sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

from llm_router import find_working_model, c
from graph import build_graph
from agentic import memory_store

import daily_article as legacy  # reuse slugify / yaml_str / yaml_list / partitioned_path / queue helpers

MODEL_FALLBACK_CHAIN = [
    "agentrouter-gpt-4o",
    "bluesminds-gpt4o",
    "llama-3.1-70b-groq",
    "gpt-4o-mini",
    "claude-haiku",
]

ROOT = Path(__file__).resolve().parents[2]
ARTICLES_DIR = ROOT / "public" / "content" / "articles"
MAX_REVISIONS = int(os.environ.get("SEO_AGENT_MAX_REVISIONS", "2"))


def write_article_file(final_state: dict) -> Path:
    keyword = final_state["keyword"]
    title = final_state["title"]
    body = final_state["body"]
    seo_title = final_state.get("seo_title")
    meta_description = final_state.get("meta_description", "")
    category = final_state.get("category") or "Productivity & Tools"
    status = "published" if final_state.get("final_status") == "published" else "draft"

    slug = legacy.slugify(title)
    word_count = len(body.split())
    read_time = max(1, round(word_count / 200))

    frontmatter_lines = ["---"]
    if seo_title:
        frontmatter_lines.append(f"seo_title: {legacy.yaml_str(seo_title)}")
    frontmatter_lines += [
        f"id: {uuid.uuid4()}",
        f"title: {legacy.yaml_str(title)}",
        f"slug: {slug}",
        f"status: {status}",
        f"excerpt: {legacy.yaml_str(meta_description)}",
        f"meta_description: {legacy.yaml_str(meta_description)}",
        f"featured_image: {final_state.get('featured_image_path') or legacy.DEFAULT_FEATURED_IMAGE}",
        f"category: {category}",
        f"tags:{legacy.yaml_list([])}",
        f"keywords:{legacy.yaml_list([keyword])}",
        "author: Miccart Phen",
        f"published_at: {datetime.now(timezone.utc).strftime('%Y-%m-%d')}",
        f"read_time: {read_time}",
        "---",
        "",
    ]

    content = "\n".join(frontmatter_lines) + body + "\n"
    out_path = legacy.partitioned_path(slug)
    out_path.parent.mkdir(parents=True, exist_ok=True)
    out_path.write_text(content, encoding="utf-8")
    return out_path


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--keyword", default=None)
    parser.add_argument("--niche", default="")
    args = parser.parse_args()

    if args.keyword:
        keyword, category = args.keyword, ""
    else:
        # pick_next_keyword() always returns (keyword, category) — a bare
        # `args.keyword or legacy.pick_next_keyword()` used to assign the
        # whole tuple to `keyword` whenever no --keyword was passed, which
        # only ever worked by accident because every prior successful run
        # happened to pass --keyword explicitly. First unattended run (no
        # --keyword) hit this for real: "can only concatenate str (not
        # tuple) to str" mid-pipeline.
        keyword, category = legacy.pick_next_keyword()
    articles_written = memory_store.articles_written_count()

    forced_model = os.environ.get("SEO_AGENT_MODEL")
    candidates = [forced_model] if forced_model else list(MODEL_FALLBACK_CHAIN)
    if forced_model:
        print(f"Using forced model: {forced_model!r} (SEO_AGENT_MODEL set, no fallback)")

    print(f"\n{c('bold', '=== SEO Agent Pro — Multi-Agent Pipeline ===')}")
    print(f"Keyword: {keyword!r} | Articles in memory: {articles_written}\n")

    graph = build_graph()

    # Same lesson learned in daily_article.py: a model can pass the cheap
    # connectivity probe and still die mid-pipeline on a long/late call (this
    # happened for real: bluesminds-gpt4o wrote the whole article fine, then
    # hit HTTP 500/504 specifically on the LAST optimizer call). So retry the
    # WHOLE graph against the next candidate on any failure, instead of
    # crashing the run — up until every candidate is exhausted.
    final_state = None
    remaining = list(candidates)
    pipeline_errors: list[str] = []

    while remaining:
        try:
            probe_model = find_working_model(remaining)
        except RuntimeError as e:
            pipeline_errors.append(str(e))
            break

        print(f"Attempting full pipeline with model: {probe_model!r}\n")
        initial_state = {
            "keyword": keyword,
            "category": category,
            "niche": args.niche,
            "articles_written": articles_written,
            "model_chain": candidates,
            "active_model": probe_model,
            "revision_count": 0,
            "max_revisions": MAX_REVISIONS,
        }
        try:
            final_state = graph.invoke(initial_state)
            break
        except SystemExit:
            pipeline_errors.append(f"{probe_model}: exited after exhausting retries mid-pipeline")
        except Exception as e:
            pipeline_errors.append(f"{probe_model}: failed mid-pipeline: {e}")

        print(f"\n  ✗ {probe_model} failed mid-pipeline — trying the next candidate model...\n")
        remaining = [m for m in remaining if m != probe_model]

    if final_state is None:
        detail = "\n".join(f"  - {e}" for e in pipeline_errors)
        raise RuntimeError(f"All candidate models failed to complete the pipeline.\n{detail}")

    status = final_state.get("final_status", "failed")
    # Always mark the keyword used, regardless of final status — not just
    # on "published". The original intent of only marking on success was
    # to let a rejected keyword retry with a fresh angle the next day, but
    # the real effect: a rejected/draft PR sits open awaiting human review,
    # and the next day's run has no way to know that keyword is already
    # "in flight", so it generates ANOTHER attempt at the exact same topic
    # — confirmed happening for real (two separate 'online course students'
    # PRs, #259 and #263, three days apart, neither aware of the other).
    # A human can always deliberately remove a keyword from used_keywords
    # to force a genuine retry after closing/rejecting its PR.
    legacy.mark_keyword_used(keyword)

    out_path = write_article_file(final_state)
    rel = out_path.relative_to(ROOT)

    print(f"\n{c('bold', '=== Result ===')}")
    print(f"Status: {status}")
    print(f"File:   {rel}")
    if status == "needs_human_review":
        print(c("yellow",
                "This article was written with status: draft — it will NOT appear on the "
                "live site (sync-articles.ts excludes non-published articles) until a human "
                "reviews evaluation.notes in cycle_log.json and flips status to 'published' by hand."))

    # Modern GITHUB_OUTPUT file (the old `::set-output::` echo syntax is
    # deprecated/disabled on GitHub-hosted runners) — mirrors daily_article.py's
    # contract so the same workflow YAML pattern (steps.gen.outputs.*) works.
    gh_output = os.environ.get("GITHUB_OUTPUT")
    if gh_output:
        with open(gh_output, "a", encoding="utf-8") as f:
            f.write(f"status={status}\n")
            f.write(f"article_title={final_state.get('title','')}\n")
            f.write(f"article_slug={legacy.slugify(final_state.get('title',''))}\n")
            f.write(f"article_keyword={keyword}\n")
            f.write(f"article_path={rel}\n")


if __name__ == "__main__":
    main()
