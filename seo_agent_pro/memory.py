"""
Memory System — Persistent learning across runs.
Stores article history, cluster maps, authority scores, and patterns.
"""

import json
from datetime import datetime
from pathlib import Path

from config import SETTINGS
from llm_router import c

# Anchored to this file's directory (not the process cwd) so it always
# resolves to seo_agent_pro/seo_memory.json — whether the script is invoked
# as `python3 daily_article.py` or `python3 seo_agent_pro/daily_article.py`
# from the repo root (as the GitHub Actions workflow does).
MEMORY_PATH = Path(__file__).resolve().parent / SETTINGS["memory_file"]

# Mandatory protocol for every future article request.  The workflow must
# fetch and inspect live competitors before drafting, then turn verified gaps
# into the article structure without inventing facts or copying language.
ADAPTIVE_SEO_PROTOCOL = {
    "name": "Live Gap Analysis Protocol",
    "version": "1.0",
    "required_before_drafting": [
        "Fetch the full content of the first three or four relevant organic results.",
        "Exclude the target site, ads, duplicate domains, generic directories, and search snippets as evidence.",
        "Teardown each source for missing technical information, superficial treatment, privacy/security omissions, outdated architecture, and UX gaps.",
        "Extract three pillars: information gap, technical depth gap, and user intent gap.",
        "Design headings, checklists, or comparison tables that directly close all three gaps.",
    ],
    "truthfulness_guardrails": [
        "Treat titles, snippets, feature claims, ratings, prices, and competitor copy as hypotheses until verified on the source page.",
        "Never claim a live competitor analysis when the source fetch failed; record the actual source and leave gap requirements unselected.",
        "Never copy competitor wording or invent product, privacy, performance, or pricing facts.",
        "Cite official primary documentation for technical claims and label device/version-specific observations.",
    ],
    "minimum_article_requirements": [
        "Use accurate Manifest V3 and extension service-worker terminology.",
        "Include actionable setup, permissions, network, storage, and accessibility checks when relevant.",
        "Keep SEO title under 60 characters, avoid placeholder links/images, and require human review before publication.",
    ],
    "performance_learning_gate": [
        "Do not promote positive or negative lessons without at least 500 impressions in comparable windows.",
        "Compare page performance with the site's overall baseline before recording a lesson or pattern.",
    ],
    "self_reflection": "Yes. This session confirmed that the information gap, technical depth gap, and user intent gap are complementary: the first finds omitted evidence, the second converts it into accurate implementation checks, and the third turns those checks into a decision workflow. For every future article, complete the live fetch and teardown first, record the three pillars, and make the outline visibly close each one with verified facts, tables, or reproducible tests.",
    "session_lessons": [
        "Feature lists and a tested label do not prove privacy, performance, or reproducibility.",
        "A current Chrome guide must use Manifest V3 service-worker terminology, not assume a permanent background page.",
        "A local model artifact, a missing artifact, or an empty Network panel is a signal—not conclusive proof of inference location.",
        "Network captures and storage evidence must be redacted before sharing.",
    ],
}


def load() -> dict:
    if MEMORY_PATH.exists():
        try:
            return json.loads(MEMORY_PATH.read_text(encoding="utf-8"))
        except json.JSONDecodeError:
            pass

    return {
        "articles_written":      [],
        "clusters":              {},
        "authority_scores":      {},
        "successful_patterns":   [],
        "keywords_done":         [],
        "total_runs":            0,
        "created_at":            datetime.now().isoformat(),
    }


def save(mem: dict) -> None:
    mem["updated_at"] = datetime.now().isoformat()
    MEMORY_PATH.write_text(json.dumps(mem, ensure_ascii=False, indent=2), encoding="utf-8")


def save_protocols(mem: dict) -> None:
    """Persist the mandatory workflow so future runs cannot skip live gap analysis."""
    mem["operating_protocols"] = {
        "adaptive_seo": ADAPTIVE_SEO_PROTOCOL,
        "last_confirmed": datetime.now().isoformat(),
    }
    save(mem)


def record_article(mem: dict, keyword: str, article: str, model: str) -> None:
    mem["total_runs"] += 1
    mem["keywords_done"].append(keyword)
    mem["articles_written"].append({
        "keyword":    keyword,
        "model":      model,
        "word_count": len(article.split()),
        "date":       datetime.now().isoformat(),
    })
    save(mem)
    print(c("green", f"  ✓ Memory updated — total articles: {len(mem['articles_written'])}"))


def record_cluster(mem: dict, keyword: str, cluster: dict) -> None:
    mem["clusters"][keyword] = cluster
    save(mem)


def record_authority(mem: dict, niche: str, score: dict) -> None:
    mem["authority_scores"][niche] = {
        "score": score.get("authority_score", 0),
        "date":  datetime.now().isoformat(),
        "data":  score,
    }
    save(mem)


def print_stats(mem: dict) -> None:
    articles = mem.get("articles_written", [])
    clusters = mem.get("clusters", {})

    print(f"""
  {c('bold', 'Memory Stats')}
  ─────────────────────────────
  Total runs:      {mem.get('total_runs', 0)}
  Articles:        {len(articles)}
  Clusters mapped: {len(clusters)}
  Niches tracked:  {len(mem.get('authority_scores', {}))}
""")

    if articles:
        print(c("dim", "  Recent articles:"))
        for a in articles[-5:]:
            print(c("dim", f"    · {a['keyword'][:45]:<45}  {a['word_count']} words  [{a['model']}]"))
