import json
import sys
import tempfile
import unittest
from pathlib import Path
from unittest.mock import patch

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT))
sys.path.insert(0, str(ROOT / "seo_agent_pro"))

import performance_learning


class PerformanceLearningTests(unittest.TestCase):
    def test_requires_two_comparable_windows_and_site_control(self) -> None:
        prior = [{
            "performance": {
                "impressions": 600,
                "ctr": 0.02,
                "average_position": 12,
                "source": "google_search_console_search_analytics",
            },
            "site_baseline": {
                "impressions": 700,
                "ctr": 0.02,
                "average_position": 15,
            },
        }]
        current = {"impressions": 650, "ctr": 0.04, "average_position": 11}
        baseline = {"impressions": 700, "ctr": 0.025, "average_position": 15}
        lessons = performance_learning._propose_evidence_lessons(prior, current, baseline)
        self.assertTrue(lessons)
        self.assertIn("not proof of causality", lessons[0])

        low_impression = dict(current, impressions=499)
        self.assertEqual(
            performance_learning._propose_evidence_lessons(prior, low_impression, baseline),
            [],
        )

    def test_run_persists_page_metadata_without_publishing(self) -> None:
        with tempfile.TemporaryDirectory() as tmp:
            index_path = Path(tmp) / "articles-index.json"
            log_path = Path(tmp) / "performance_log.json"
            index_path.write_text(json.dumps([{
                "slug": "demo-article",
                "title": "Demo article",
                "keywords": ["demo keyword"],
                "category": "Tools",
                "published_at": "2026-08-01",
                "status": "published",
            }]), encoding="utf-8")
            with patch.object(performance_learning, "INDEX_PATH", index_path), \
                 patch.object(performance_learning, "PERFORMANCE_LOG_PATH", log_path), \
                 patch.object(performance_learning, "fetch_page_performance", return_value={
                     "source": "google_search_console_search_analytics",
                     "impressions": 12,
                     "clicks": 1,
                     "ctr": 0.08,
                     "average_position": 9,
                 }), \
                 patch.object(performance_learning, "fetch_site_performance", return_value={
                     "source": "google_search_console_site_baseline",
                     "impressions": 20,
                     "clicks": 2,
                     "ctr": 0.1,
                     "average_position": 8,
                 }), \
                 patch.object(performance_learning, "inspect_url", return_value={"status": "unavailable"}):
                result = performance_learning.run(limit=1)

            self.assertEqual(result["pages_checked"], 1)
            record = json.loads(log_path.read_text(encoding="utf-8"))[0]
            self.assertEqual(record["schema_version"], 1)
            self.assertEqual(record["keyword"], "demo keyword")
            self.assertEqual(record["published_at"], "2026-08-01")
            self.assertEqual(record["inspection"]["status"], "unavailable")
            self.assertEqual(result["lessons_added"], [])


if __name__ == "__main__":
    unittest.main()
