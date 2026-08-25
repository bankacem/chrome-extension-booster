from __future__ import annotations

import json
import sys
import tempfile
import unittest
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT))
sys.path.insert(0, str(ROOT / "seo_agent_pro"))

from agentic import memory_store, web_search
from agentic.agents import learning


class AdaptiveLearningTests(unittest.TestCase):
    def test_selects_three_external_unique_competitors(self) -> None:
        results = [
            {"title": "ExtensionTo self", "url": "https://extensionto.com/blog/self", "snippet": ""},
            {"title": "Competitor A", "url": "https://a.example.com/guide", "snippet": ""},
            {"title": "Competitor A duplicate", "url": "https://a.example.com/other", "snippet": ""},
            {"title": "Competitor B", "url": "https://b.example.com/guide", "snippet": ""},
            {"title": "Competitor C", "url": "https://c.example.com/guide", "snippet": ""},
        ]
        selected = web_search._select_external_top_three(results)
        self.assertEqual([r["title"] for r in selected], ["Competitor A", "Competitor B", "Competitor C"])

    def test_structure_parser_ignores_script_and_extracts_headings(self) -> None:
        parser = web_search._StructureParser()
        parser.feed(
            "<html><head><title>Real title</title><script><h2>Do not use</h2></script>"
            "<meta name='description' content='A real description'></head>"
            "<body><h1>Main heading</h1><h2>Useful section</h2><p>Visible words.</p></body></html>"
        )
        self.assertEqual(parser.title, "Real title")
        self.assertEqual(parser.h1s, ["Main heading"])
        self.assertEqual(parser.h2s, ["Useful section"])
        self.assertNotIn("Do not use", parser.h2s)
        self.assertEqual(parser.meta_description, "A real description")

    def test_learning_records_score_delta_and_positive_patterns(self) -> None:
        with tempfile.TemporaryDirectory() as tmp:
            old_cycle_path = memory_store.CYCLE_LOG_PATH
            old_lessons_path = memory_store.LESSONS_PATH
            try:
                memory_store.CYCLE_LOG_PATH = Path(tmp) / "cycle_log.json"
                memory_store.LESSONS_PATH = Path(tmp) / "lessons.md"
                memory_store.CYCLE_LOG_PATH.write_text(
                    json.dumps([{"keyword": "test keyword", "score": 72, "final_status": "published"}]),
                    encoding="utf-8",
                )
                result = learning.run(
                    {
                        "keyword": "test keyword",
                        "active_model": "test-model",
                        "revision_count": 1,
                        "evaluation": {"approved": True, "score": 86, "deterministic_issues": [], "llm_issues": []},
                        "final_status": "published",
                        "competitor_source": "searxng_top_three_external",
                        "competitor_count": 3,
                        "competitor_urls": ["https://a.example", "https://b.example", "https://c.example"],
                        "internal_links_used": ["/blog/related"],
                        "gaps_added_titles": ["A useful missing section"],
                        "word_count": 1400,
                        "gsc_evidence": {
                            "eligible": True,
                            "impressions": 650,
                            "ctr_delta_vs_baseline": 0.012,
                            "position_stable": True,
                        },
                    }
                )
                records = json.loads(memory_store.CYCLE_LOG_PATH.read_text(encoding="utf-8"))
                self.assertEqual(records[-1]["score_delta_from_previous_same_keyword"], 14)
                self.assertEqual(records[-1]["competitor_count"], 3)
                self.assertTrue(result["positive_patterns_applied"])
            finally:
                memory_store.CYCLE_LOG_PATH = old_cycle_path
                memory_store.LESSONS_PATH = old_lessons_path

    def test_learning_gate_blocks_lessons_without_gsc_evidence(self) -> None:
        with tempfile.TemporaryDirectory() as tmp:
            old_cycle_path = memory_store.CYCLE_LOG_PATH
            old_lessons_path = memory_store.LESSONS_PATH
            try:
                memory_store.CYCLE_LOG_PATH = Path(tmp) / "cycle_log.json"
                memory_store.LESSONS_PATH = Path(tmp) / "lessons.md"
                result = learning.run(
                    {
                        "keyword": "ungated keyword",
                        "active_model": "test-model",
                        "revision_count": 0,
                        "evaluation": {
                            "approved": False,
                            "score": 40,
                            "deterministic_issues": ["placeholder link found"],
                            "llm_issues": [],
                        },
                        "final_status": "needs_human_review",
                        "gsc_evidence": {},
                    }
                )
                self.assertEqual(result["lessons_applied"], [])
                self.assertEqual(result["positive_patterns_applied"], [])
                record = json.loads(memory_store.CYCLE_LOG_PATH.read_text(encoding="utf-8"))[-1]
                self.assertFalse(record["gsc_learning_eligible"])
            finally:
                memory_store.CYCLE_LOG_PATH = old_cycle_path
                memory_store.LESSONS_PATH = old_lessons_path


if __name__ == "__main__":
    unittest.main()
