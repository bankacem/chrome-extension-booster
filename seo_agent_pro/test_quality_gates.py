import os
import sys
import unittest
from pathlib import Path
from unittest.mock import patch

sys.path.insert(0, str(Path(__file__).resolve().parent))
from agentic.agents.evaluator import _deterministic_checks
from agentic.agents.strategy import _official_source_hints


class QualityGateTests(unittest.TestCase):
    def base_state(self, body: str) -> dict:
        return {
            "title": "Chrome Extension Permissions Guide",
            "seo_title": "Chrome Extension Permissions Guide",
            "meta_description": "Learn how to review Chrome extension permissions, limit access, and protect your browsing data with practical safety checks.",
            "category": "Security & Privacy",
            "body": body,
            "word_count": 1200,
            "strategy": {"ideal_length": 1400, "required_sections": [], "must_have_elements": []},
            "competitor_source": "searxng_top_five_external",
            "competitor_count": 5,
        }

    def test_malformed_heading_is_rejected(self) -> None:
        state = self.base_state("## - [Introduction](#introduction)\nUseful text.")
        self.assertTrue(any("list marker" in issue for issue in _deterministic_checks(state)))

    def test_checklist_requires_task_boxes(self) -> None:
        state = self.base_state("## Checklist\nReview the permissions carefully.")
        state["strategy"]["must_have_elements"] = ["checklist"]
        self.assertTrue(any("task boxes" in issue for issue in _deterministic_checks(state)))

    def test_live_research_gate_rejects_estimate(self) -> None:
        state = self.base_state("## Introduction\nUseful text.")
        state["competitor_source"] = "llm_estimate"
        state["competitor_count"] = 0
        with patch.dict(os.environ, {"SEO_AGENT_REQUIRE_LIVE_RESEARCH": "1"}):
            self.assertTrue(any("live competitor research" in issue for issue in _deterministic_checks(state)))

    def test_sensitive_exact_quantity_requires_source_url(self) -> None:
        state = self.base_state("## Storage permissions\nThis API allows 100 KB of data.")
        state["strategy"]["source_requirements"] = []
        self.assertTrue(any("exact technical quantity" in issue for issue in _deterministic_checks(state)))

    def test_storage_keyword_gets_official_source_hint(self) -> None:
        hints = _official_source_hints("Chrome extension storage quota debugging guide")
        self.assertIn("https://developer.chrome.com/docs/extensions/reference/api/storage", hints)

    def test_permission_keyword_gets_official_source_hint(self) -> None:
        hints = _official_source_hints("Chrome extension permissions guide")
        self.assertIn("https://developer.chrome.com/docs/extensions/develop/concepts/declare-permissions", hints)

    def test_storage_quota_trap_is_rejected(self) -> None:
        state = self.base_state("## Storage permissions\nSync allows 100 KB per item.")
        state["strategy"]["source_requirements"] = ["https://developer.chrome.com/docs/extensions/reference/api/storage"]
        self.assertTrue(any("likely inaccurate Chrome storage claim" in issue for issue in _deterministic_checks(state)))

    def test_obsolete_local_default_and_write_limit_are_rejected(self) -> None:
        state = self.base_state("## Storage quota\nlocal is 5MB by default and sync permits a maximum of 20 writes per minute.")
        self.assertTrue(any("obsolete default quota" in issue for issue in _deterministic_checks(state)))
        self.assertTrue(any("unsupported per-minute" in issue for issue in _deterministic_checks(state)))

    def test_table_row_prefixed_as_heading_is_rejected(self) -> None:
        state = self.base_state("## | Area | Limit |\n|---|---|\n| local | documented |\n")
        self.assertTrue(any("table row incorrectly" in issue for issue in _deterministic_checks(state)))

    def test_sensitive_exact_quantity_can_use_supplied_source(self) -> None:
        state = self.base_state("## Storage permissions\nThe documented storage quota is 10 MB.\nSources: https://developer.chrome.com/docs/extensions/reference/api/storage")
        state["strategy"]["source_requirements"] = ["https://developer.chrome.com/docs/extensions/reference/api/storage"]
        self.assertFalse(any("exact technical quantity" in issue for issue in _deterministic_checks(state)))


if __name__ == "__main__":
    unittest.main()
