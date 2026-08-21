"""
Learning & Memory Agent — persistence layer.

Three tiers, from simplest to richest, on purpose — no external services
(no Pinecone/Weaviate account, no Search Console/SerpAPI key exist for this
project yet), so this has to work standalone:

1. cycle_log.json   — the source of truth. One JSON object per pipeline run
                       (keyword, model used, evaluator score, issues found,
                       whether it was published). Plain JSON, diffable,
                       git-friendly — no binary blobs committed to the repo.

2. lessons.md       — human-readable, accumulating rules. Whenever the
                       Evaluator finds an issue that isn't already covered by
                       an existing lesson, the Learning Agent appends a new
                       one here. This file is injected verbatim into the
                       Content and Optimizer agents' system prompts on every
                       future run — so a mistake made once becomes an
                       explicit instruction from then on. This IS the
                       self-improving loop; it just doesn't need a vector DB
                       to work.

3. Chroma (ephemeral, in-memory) — built fresh at the start of each run from
                       cycle_log.json, not persisted to disk. Used by the
                       Research Agent to semantically retrieve past cycles
                       relevant to the current keyword ("have we written
                       about something like this before, and what did the
                       critic say about it?"). Rebuilding from JSON every run
                       instead of persisting a Chroma DB directory keeps the
                       repo free of binary database files while still giving
                       real semantic retrieval during each run.
"""

from __future__ import annotations

import json
from pathlib import Path
from datetime import datetime, timezone

MEMORY_DIR = Path(__file__).resolve().parent / "memory"
CYCLE_LOG_PATH = MEMORY_DIR / "cycle_log.json"
LESSONS_PATH = MEMORY_DIR / "lessons.md"

MEMORY_DIR.mkdir(exist_ok=True)


# ──────────────────────────────────────────────────────────────
#  Tier 1 — cycle log
# ──────────────────────────────────────────────────────────────

def load_cycle_log() -> list[dict]:
    if not CYCLE_LOG_PATH.exists():
        return []
    try:
        return json.loads(CYCLE_LOG_PATH.read_text(encoding="utf-8"))
    except json.JSONDecodeError:
        return []


def append_cycle(record: dict) -> None:
    log = load_cycle_log()
    record = dict(record)
    record["recorded_at"] = datetime.now(timezone.utc).isoformat()
    log.append(record)
    CYCLE_LOG_PATH.write_text(json.dumps(log, indent=2, ensure_ascii=False), encoding="utf-8")


def articles_written_count() -> int:
    return sum(1 for r in load_cycle_log() if r.get("final_status") == "published")


def previous_cycles_for_keyword(keyword: str, limit: int = 5) -> list[dict]:
    """Return prior runs for the same keyword in chronological order."""
    wanted = keyword.strip().casefold()
    matches = [r for r in load_cycle_log() if str(r.get("keyword", "")).strip().casefold() == wanted]
    return matches[-limit:]


# ──────────────────────────────────────────────────────────────
#  Tier 2 — accumulating lessons file
# ──────────────────────────────────────────────────────────────

DEFAULT_LESSONS = """\
# Accumulated lessons

Auto-updated by the Learning Agent whenever the Evaluator finds a new class
of issue. These rules are injected into the Content and Optimizer agents'
prompts on every run. Do not delete entries by hand without checking
cycle_log.json — they exist because a real published article violated them.

- Every internal or external link MUST resolve to a real, existing URL. If
  you don't know a real internal article to link to, write the sentence
  without a link rather than inventing a "#" placeholder — a dead link on a
  published page is worse than no link.
- Never write an image with a placeholder src like "image-url-placeholder"
  or similar. If you don't have a real image URL, don't include an image at
  all.
- The full <title> tag is `{seo_title or title} | ExtensionTo` and MUST stay
  at or under 60 characters total (46 for the title itself). If the natural
  title is longer, write a shorter seo_title — don't just leave it unset.
"""


def load_lessons() -> str:
    if not LESSONS_PATH.exists():
        LESSONS_PATH.write_text(DEFAULT_LESSONS, encoding="utf-8")
    return LESSONS_PATH.read_text(encoding="utf-8")


def add_positive_pattern_if_new(pattern_text: str) -> bool:
    """
    Sibling to add_lesson_if_new(), but for POSITIVE patterns extracted from
    demonstrations (see record_demonstration() below) rather than failures
    the Evaluator caught. Kept in the same lessons.md file, under its own
    heading, so content.py's existing "load the whole file into the system
    prompt" logic picks these up automatically — no separate wiring needed
    for demonstrations to start influencing future agent runs.
    """
    current = load_lessons()
    if "## Patterns that work well" not in current:
        with open(LESSONS_PATH, "a", encoding="utf-8") as f:
            f.write(
                "\n## Patterns that work well (from real published demonstrations)\n\n"
                "Extracted from articles that scored well and were published — either by "
                "the agent pipeline itself, or by a human/Claude writing a demonstration "
                "article the pipeline currently can't reliably produce end-to-end yet. "
                "Positive guidance, not hard rules — follow the spirit, not necessarily "
                "the letter.\n\n"
            )
        current = load_lessons()

    normalized_existing = {
        line.strip().lower().lstrip("- ")
        for line in current.splitlines()
        if line.strip().startswith("-")
    }
    normalized_new = pattern_text.strip().lower().lstrip("- ")
    if not normalized_new or normalized_new in normalized_existing:
        return False
    with open(LESSONS_PATH, "a", encoding="utf-8") as f:
        f.write(f"- {pattern_text.strip()}\n")
    return True


def record_demonstration(
    keyword: str,
    category: str,
    score: int,
    notes: str,
    positive_patterns: list[str],
) -> list[str]:
    """
    Ingest a manually-written ("Claude standing in for the pipeline")
    published article into long-term memory, so it feeds back into future
    AUTOMATED runs — this is the actual answer to "can the agents learn from
    the independent work you (Claude) do outside the pipeline": yes, by
    calling this after publishing a demonstration article.

    - Adds a cycle_log.json entry (source: model="claude-manual-standin",
      same convention already in use) so relevant_past_cycles() can surface
      it to the Research Agent for related future keywords.
    - Adds each positive_pattern to lessons.md's positive-patterns section,
      which content.py already loads wholesale into its system prompt — so
      the very next agent run, automated or not, sees these patterns.

    Returns the list of patterns that were actually new (for logging).
    """
    append_cycle({
        "keyword": keyword,
        "model": "claude-manual-standin",
        "revision_count": 0,
        "score": score,
        "approved": True,
        "deterministic_issues": [],
        "llm_issues": [],
        "category": category,
        "final_status": "published",
        "notes": notes,
    })
    added = [p for p in positive_patterns if add_positive_pattern_if_new(p)]
    return added


def add_lesson_if_new(lesson_text: str) -> bool:
    """Append a new lesson line if its normalized text isn't already present
    (crude but effective dedup — good enough for a slowly-growing rule list
    that a human will occasionally read and prune)."""
    current = load_lessons()
    normalized_existing = {
        line.strip().lower().lstrip("- ")
        for line in current.splitlines()
        if line.strip().startswith("-")
    }
    normalized_new = lesson_text.strip().lower().lstrip("- ")
    if not normalized_new or normalized_new in normalized_existing:
        return False
    with open(LESSONS_PATH, "a", encoding="utf-8") as f:
        f.write(f"- {lesson_text.strip()}\n")
    return True


# ──────────────────────────────────────────────────────────────
#  Tier 3 — ephemeral semantic retrieval over the cycle log
# ──────────────────────────────────────────────────────────────

def relevant_past_cycles(keyword: str, n: int = 3) -> list[dict]:
    """
    Semantic search over past cycles for ones related to `keyword`. Builds a
    throwaway in-memory Chroma collection from cycle_log.json on every call
    — cheap at this scale (dozens to low hundreds of records), and avoids
    committing a binary vector-DB directory to a content repo. Falls back to
    an empty list (not an exception) if chromadb isn't installed or the log
    is empty, so this is always safe to call from the Research Agent.
    """
    log = load_cycle_log()
    if not log:
        return []

    try:
        import chromadb
    except ImportError:
        # No chromadb in this environment (e.g. requirements.txt not yet
        # updated in the runner) — degrade to "no relevant past cycles"
        # rather than crashing the whole pipeline over an optional feature.
        return []

    client = chromadb.EphemeralClient()
    collection = client.get_or_create_collection("seo_agent_cycles")

    docs, ids, metadatas = [], [], []
    for i, rec in enumerate(log):
        text = f"{rec.get('keyword','')} — issues: {'; '.join(rec.get('deterministic_issues', []) + rec.get('llm_issues', []))}"
        docs.append(text)
        ids.append(str(i))
        metadatas.append({
            "keyword": rec.get("keyword", ""),
            "score": rec.get("score", 0),
            "final_status": rec.get("final_status", ""),
        })

    collection.add(documents=docs, ids=ids, metadatas=metadatas)
    results = collection.query(query_texts=[keyword], n_results=min(n, len(docs)))

    out = []
    for i, doc_id in enumerate(results.get("ids", [[]])[0]):
        idx = int(doc_id)
        out.append(log[idx])
    return out
