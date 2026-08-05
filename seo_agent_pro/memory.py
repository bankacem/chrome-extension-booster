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
