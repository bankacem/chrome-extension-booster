"""Regression tests for the scheduled-release status regex.

Background: the selection regex in .github/workflows/release-scheduled-drafts.yml
was written as r'^status:\\s*draft\\s*$' (double-escaped inside a raw string),
which matches a literal backslash + 's' and therefore NEVER matched
'status: draft'. Scheduled auto-release was dead since 2026-08-23 while every
release after that date was manual (workflow_dispatch).

Run: python3 -m unittest tests.test_release_status_regex -v
"""

from __future__ import annotations

import re
import unittest
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
WORKFLOW = ROOT / ".github" / "workflows" / "release-scheduled-drafts.yml"


def _selection_regex_source() -> str:
    """Extract the literal regex source used against article_text, re.M."""
    src = WORKFLOW.read_text()
    matches = re.findall(r"re\.search\(r'(\^[^']*)',\s*article_text,\s*re\.M\)", src)
    assert matches, "selection regex not found in workflow source"
    return matches[0]


class ReleaseStatusRegexTests(unittest.TestCase):
    def test_regex_matches_plain_draft_status(self) -> None:
        pattern = re.compile(_selection_regex_source(), re.M)
        text = "---\ntitle: T\nstatus: draft\nslug: x\n---\nbody\n"
        self.assertTrue(pattern.search(text))

    def test_regex_rejects_published_status(self) -> None:
        pattern = re.compile(_selection_regex_source(), re.M)
        text = "---\ntitle: T\nstatus: published\nslug: x\n---\nbody\n"
        self.assertIsNone(pattern.search(text))

    def test_regex_is_line_anchored_multiline(self) -> None:
        pattern = re.compile(_selection_regex_source(), re.M)
        text = "---\nstatus: draft\ntagline: status: drafted\n---\n"
        self.assertTrue(pattern.search(text))
        self.assertIsNone(pattern.search("xstatus: draftx\n"))
        self.assertTrue(pattern.search("status:draft\n"))  # \s* allows zero spaces
        self.assertTrue(pattern.search("status: draft   \n"))

    def test_workflow_source_has_no_double_escaped_whitespace_class(self) -> None:
        """Guard against the historical r'\\s' double-escape regression."""
        src = WORKFLOW.read_text()
        for line in src.splitlines():
            if "article_text, re.M" in line:
                self.assertNotIn("\\\\s", line, f"double-escaped regex regression: {line.strip()}")

    def test_status_flip_replacement_targets_same_shape(self) -> None:
        """The release flip (line ~142) uses single escapes; keep them aligned."""
        src = WORKFLOW.read_text()
        self.assertIn("re.sub(r'^status:\\s*draft\\s*$', 'status: published'", src)
        self.assertNotIn("r'^status:\\\\s*draft\\\\s*$'", src)


if __name__ == "__main__":
    unittest.main()
