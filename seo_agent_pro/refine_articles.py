"""
refine_articles.py — batch entry point for the Refine Agent
(agentic/agents/refine.py). Run via .github/workflows/refine-articles.yml
on a schedule, or manually:

    python3 seo_agent_pro/refine_articles.py --batch 20
    python3 seo_agent_pro/refine_articles.py --batch 5 --model claude-haiku

Tracks which articles have already been reviewed in refine_state.json (same
plain-JSON, git-diffable convention as daily_article_state.json /
agentic/memory/cycle_log.json elsewhere in this project) so every run works
through NEW ground instead of re-reviewing the same articles, and so the
whole ~750-article backlog gets covered gradually over many runs instead of
needing one enormous one-shot pass.

Deliberately conservative about what it touches:
  - Only rewrites specific frontmatter fields / exact-substring body patches
    the model proposed IN RESPONSE TO a specific detected issue (see
    refine.py) - never a full-body rewrite.
  - Writes changes to disk but does NOT commit/push/open a PR itself - the
    workflow does that, exactly like every other pipeline here, so a human
    reviews the diff before it reaches main.
"""
from __future__ import annotations

import argparse
import json
import sys
from datetime import datetime, timezone
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(Path(__file__).resolve().parent))
sys.path.insert(0, str(Path(__file__).resolve().parent / "agentic"))

from llm_router import find_working_model, c
from agentic.agents import refine

INDEX_FILE = ROOT / "public" / "content" / "articles-index.json"
STATE_FILE = Path(__file__).resolve().parent / "refine_state.json"

# Keep this in sync with daily_article.py's own fallback chain rather than
# importing it directly, to avoid coupling the two entry points' model
# choices together - refine work is cheaper/lower-stakes per call than a
# full article, so a smaller/cheaper model first is a deliberate choice.
DEFAULT_CANDIDATES = [
    "claude-haiku", "claude-sonnet-4-5",
    "agentrouter-claude-sonnet-4-5", "agentrouter-gpt-4o",
    "groq-llama-3.1-70b", "openrouter-gpt-4o-mini",
]


def load_state() -> dict:
    if STATE_FILE.exists():
        return json.loads(STATE_FILE.read_text(encoding="utf-8"))
    return {"reviewed": {}}  # slug -> {"reviewed_at": ..., "status": ...}


def save_state(state: dict) -> None:
    STATE_FILE.write_text(json.dumps(state, indent=2, ensure_ascii=False), encoding="utf-8")


def pick_batch(state: dict, batch_size: int) -> list[dict]:
    if not INDEX_FILE.exists():
        raise SystemExit(f"Index file not found: {INDEX_FILE}")
    index = json.loads(INDEX_FILE.read_text(encoding="utf-8"))
    reviewed = state.get("reviewed", {})
    # Oldest-published-first among never-reviewed articles, so the backlog
    # is worked through in a predictable, resumable order.
    candidates = [a for a in index if a.get("slug") not in reviewed]
    candidates.sort(key=lambda a: a.get("published_at", ""))
    return candidates[:batch_size]


def write_article(path: Path, new_frontmatter: dict, new_body: str) -> None:
    lines = ["---"]
    for key, val in new_frontmatter.items():
        if isinstance(val, str) and (len(val) > 80 or "\n" in val):
            lines.append(f"{key}: >-")
            # simple re-wrap at ~78 chars on word boundaries
            words, cur = val.split(), ""
            for w in words:
                if len(cur) + len(w) + 1 > 78:
                    lines.append(f"  {cur}")
                    cur = w
                else:
                    cur = f"{cur} {w}".strip()
            if cur:
                lines.append(f"  {cur}")
        else:
            lines.append(f"{key}: {val}")
    lines.append("---")
    lines.append("")
    lines.append(new_body)
    path.write_text("\n".join(lines), encoding="utf-8")


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--batch", type=int, default=20)
    parser.add_argument("--model", default=None)
    args = parser.parse_args()

    candidates = [args.model] if args.model else DEFAULT_CANDIDATES
    model = find_working_model(candidates)
    print(f"Using model: {c('bold', model)}")

    state = load_state()
    batch = pick_batch(state, args.batch)
    print(f"Batch: {len(batch)} article(s) (never reviewed before)")

    if not batch:
        print(c("green", "Nothing left to review - the entire backlog has been covered. "
                          "(Delete refine_state.json, or specific slugs from it, to re-review.)"))
        return

    fixed_count = clean_count = skipped_count = unfixed_count = 0
    changed_paths = []

    for entry in batch:
        slug = entry.get("slug")
        rel_path = entry.get("file_path") or entry.get("path")
        if not rel_path:
            # Fall back to the same b/e/s/ partitioning convention used
            # everywhere else in this project if the index doesn't carry
            # an explicit path for this entry.
            s = slug or ""
            rel_path = f"public/content/articles/{s[:1]}/{s[1:2]}/{s[2:3]}/{s}.md"
        article_path = ROOT / rel_path

        if not article_path.exists():
            print(c("red", f"✗ {slug}: indexed but file missing on disk - skipping (separate known issue, not this agent's job)"))
            skipped_count += 1
            state["reviewed"][slug] = {
                "reviewed_at": datetime.now(timezone.utc).isoformat(),
                "status": "file_missing",
            }
            continue

        result = refine.refine_one(article_path, model)
        status = result["status"]
        state["reviewed"][slug] = {
            "reviewed_at": datetime.now(timezone.utc).isoformat(),
            "status": status,
            "issues": result.get("issues", []),
        }

        if status == "fixed":
            write_article(article_path, result["new_frontmatter"], result["new_body"])
            changed_paths.append(str(article_path.relative_to(ROOT)))
            fixed_count += 1
        elif status == "clean":
            clean_count += 1
        elif status == "unfixed":
            unfixed_count += 1
        else:
            skipped_count += 1

    save_state(state)

    print(f"\n{c('bold', 'Summary')}: {fixed_count} fixed, {clean_count} already clean, "
          f"{unfixed_count} flagged for human review, {skipped_count} skipped")

    # Emit machine-readable info for the workflow's PR body.
    import os
    gh_output = os.environ.get("GITHUB_OUTPUT")
    if gh_output:
        with open(gh_output, "a", encoding="utf-8") as f:
            f.write(f"fixed_count={fixed_count}\n")
            f.write(f"clean_count={clean_count}\n")
            f.write(f"unfixed_count={unfixed_count}\n")
            f.write(f"has_changes={'true' if changed_paths else 'false'}\n")


if __name__ == "__main__":
    main()
