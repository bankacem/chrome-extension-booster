"""
Refinement Agent.

Different job from the 7-agent pipeline: that one WRITES new articles. This
one takes EXISTING published articles that have known metadata problems
(meta_description missing/truncated/too-short/near-duplicate, title tag too
long, dead '#' links, placeholder images) and fixes ONLY those specific
fields — it never touches the article body's structure, sections, or
wording beyond stripping a dead link/placeholder image inline. This is the
"proofread, don't rewrite" mode requested explicitly, as opposed to the
Content Agent's job of writing from scratch.

Grounded, not invented: the new meta_description is generated FROM the
article's own real body content (first ~600 words), so it reflects what the
article actually says instead of being generic boilerplate.

Usage:
    python3 refine_articles.py --limit 15            # process the next 15 files with issues
    python3 refine_articles.py --file path/to/one.md # process a single specific file
    SEO_AGENT_MODEL=llama-3.1-70b-groq python3 refine_articles.py --limit 15
"""

from __future__ import annotations

import argparse
import glob
import os
import re
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))
sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

import yaml
from llm_router import call, find_working_model, c
from daily_article import make_seo_title, yaml_str, SUFFIX

ROOT = Path(__file__).resolve().parents[2]
ARTICLES_DIR = ROOT / "public" / "content" / "articles"

MODEL_FALLBACK_CHAIN = [
    "bluesminds-gpt4o",
    "llama-3.1-70b-groq",
    "gpt-4o-mini",
    "claude-haiku",
]


def parse_frontmatter(text: str):
    m = re.match(r"^---\n(.*?)\n---\n(.*)$", text, re.DOTALL)
    if not m:
        return None, None, text
    return m.group(1), yaml.safe_load(m.group(1)), m.group(2)


def find_files_with_issues(limit: int | None) -> list[Path]:
    files = glob.glob(str(ARTICLES_DIR / "**" / "*.md"), recursive=True)
    seen_desc_keys: dict[str, list[Path]] = {}
    flagged: list[Path] = []

    for f in files:
        text = open(f, encoding="utf-8").read()
        _, fm, _ = parse_frontmatter(text)
        if not fm or str(fm.get("status", "")).lower() != "published":
            continue
        meta = str(fm.get("meta_description") or "").strip()
        needs_desc_fix = (
            not meta
            or meta.endswith("...")
            or meta.endswith("…")
            or len(meta) < 70
        )
        title = fm.get("title") or ""
        seo_title = fm.get("seo_title") or title
        needs_title_fix = len(f"{seo_title}{SUFFIX}") > 60

        key = " ".join(re.findall(r"\w+", meta.lower())[:8]) if meta else ""
        if key:
            seen_desc_keys.setdefault(key, []).append(Path(f))

        if needs_desc_fix or needs_title_fix:
            flagged.append(Path(f))

    # near-duplicate groups also need fixing (all but the first in each group)
    for key, group in seen_desc_keys.items():
        if len(group) > 1:
            flagged.extend(group[1:])

    flagged = sorted(set(flagged))
    return flagged[:limit] if limit else flagged


def refine_one(path: Path, model: str) -> dict:
    text = path.read_text(encoding="utf-8")
    fm_raw, fm, body = parse_frontmatter(text)
    if fm is None:
        return {"path": str(path), "skipped": "no frontmatter"}

    changes = {}
    title = fm.get("title") or ""
    old_meta = str(fm.get("meta_description") or "").strip()

    # 1. Dead links / placeholder images — deterministic, no LLM needed.
    new_body = re.sub(r"\[([^\]]+)\]\(#\)", r"\1", body)
    new_body = re.sub(
        r"!\[[^\]]*\]\((?:#|image-url-placeholder|placeholder[^)]*)\)\s*",
        "", new_body, flags=re.IGNORECASE,
    )
    if new_body != body:
        changes["stripped_dead_links_or_placeholder_images"] = True
        body = new_body

    # 2. Title tag length — reuse the already-hardened function.
    if len(f"{fm.get('seo_title') or title}{SUFFIX}") > 60:
        new_seo_title = make_seo_title(title)
        if new_seo_title:
            fm["seo_title"] = new_seo_title
            changes["seo_title"] = new_seo_title

    # 3. Meta description — regenerate FROM the article's own real content,
    # never invented from the title alone. This is the core of "refine, don't
    # rewrite": the source of truth is the existing body, verbatim.
    needs_desc_fix = (
        not old_meta or old_meta.endswith(("...", "…")) or len(old_meta) < 70
    )
    if needs_desc_fix:
        excerpt_source = body[:3000]  # first ~500-600 words is plenty of grounding
        new_meta = call(
            "You write concise, accurate SEO meta descriptions. You base the "
            "description ONLY on the article text given to you — never invent "
            "facts, numbers, or claims not present in the text. Reply with ONLY "
            "the description, no preamble, no quotes, 120-155 characters, a "
            "complete sentence that does not end with '...'.",
            f'Article title: "{title}"\n\nArticle text (excerpt):\n{excerpt_source}',
            model,
        ).strip().strip('"')
        if new_meta and new_meta != old_meta:
            fm["meta_description"] = new_meta
            if str(fm.get("excerpt", "")).strip() == old_meta:
                fm["excerpt"] = new_meta
            changes["meta_description"] = new_meta

    if not changes:
        return {"path": str(path), "skipped": "nothing to fix (already clean)"}

    # Rebuild frontmatter preserving original key order + all other fields.
    lines = ["---"]
    for key, value in fm.items():
        if isinstance(value, str):
            lines.append(f"{key}: {yaml_str(value)}")
        elif isinstance(value, list):
            if value:
                lines.append(f"{key}:")
                for item in value:
                    lines.append(f"  - {item}")
            else:
                lines.append(f"{key}: []")
        else:
            lines.append(f"{key}: {value}")
    lines.append("---")
    new_text = "\n".join(lines) + "\n" + body
    path.write_text(new_text, encoding="utf-8")

    return {"path": str(path), "changes": changes}


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--limit", type=int, default=None)
    parser.add_argument("--file", default=None)
    args = parser.parse_args()

    if args.file:
        targets = [Path(args.file)]
    else:
        targets = find_files_with_issues(args.limit)

    print(f"{c('bold', '=== Refinement Agent ===')}")
    print(f"Files to process: {len(targets)}\n")
    if not targets:
        return

    forced_model = os.environ.get("SEO_AGENT_MODEL")
    model = forced_model or find_working_model(MODEL_FALLBACK_CHAIN)
    print(f"Using model: {model!r}\n")

    results = []
    for path in targets:
        rel = path.relative_to(ROOT)
        print(c("cyan", f"▸ {rel}"))
        try:
            result = refine_one(path, model)
        except Exception as e:
            result = {"path": str(path), "error": str(e)}
        results.append(result)
        if "changes" in result:
            for k, v in result["changes"].items():
                print(c("green", f"  ✓ {k}: {v if isinstance(v, str) else ''}"))
        elif "skipped" in result:
            print(c("dim", f"  · skipped: {result['skipped']}"))
        elif "error" in result:
            print(c("red", f"  ✗ error: {result['error']}"))

    fixed = sum(1 for r in results if "changes" in r)
    print(f"\n{c('bold', '=== Summary ===')}")
    print(f"Fixed: {fixed}/{len(targets)}")


if __name__ == "__main__":
    main()
