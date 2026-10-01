#!/usr/bin/env python3
"""agents_v2 eval harness import/structure tests (no network, no key)."""
import json
import sys
import unittest
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))


class TestEvalHarness(unittest.TestCase):
    def test_pipeline_a_imports_and_exposes_run_a(self):
        # imports llm_router chain (no network at import time)
        from agents_v2.eval import pipeline_a
        self.assertTrue(callable(pipeline_a.run_a))
        self.assertTrue(callable(pipeline_a.repair_section))
        self.assertTrue(callable(pipeline_a.write_article))

    def test_run_eval_imports_and_topics_are_ten(self):
        from agents_v2.eval import run_eval
        self.assertEqual(len(run_eval.TOPICS), 10)
        self.assertEqual(len(set(run_eval.TOPICS)), 10,
                         "the 10 topics must be distinct (same set for both arms)")

    def test_topics_file_matches_spec(self):
        p = Path(__file__).resolve().parent / "agents_v2" / "eval" / "topics.json"
        data = json.loads(p.read_text())
        self.assertIn("_note", data)
        self.assertEqual(len(data["topics"]), 10)

    def test_gates_local_matches_450_window(self):
        from agents_v2.gates_local import FAQ_MIN_QUESTIONS, WORD_MAX, WORD_MIN
        self.assertEqual((WORD_MIN, WORD_MAX), (2550, 3100))
        self.assertEqual(FAQ_MIN_QUESTIONS, 8)


if __name__ == "__main__":
    unittest.main(verbosity=2)
