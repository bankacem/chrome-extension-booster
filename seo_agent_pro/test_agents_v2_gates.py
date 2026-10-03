"""Unit tests for the fabrication/honesty gates (agents_v2/gates).

Owner brief 2026-10-03 item 3: one unit test per pattern and per legitimate
exception (documented quote with a source). No model calls — pure regex.

Run:  python -m unittest seo_agent_pro.test_agents_v2_gates -v
"""
import re
import unittest

from seo_agent_pro.agents_v2.gates import (
    S1_PATTERNS, S2_PATTERNS, fabrication_gate,
)

# Per-pattern positive probes: each MUST be flagged.
S1_POSITIVE = {
    "we_tested":         "We tested every extension on a fresh profile for two weeks.",
    "i_tested":          "I tested call quality over three connection types.",
    "our_lab":           "Our lab ran each candidate under identical load.",
    "lab_tested":        "We lab-tested 10 leading tab managers with a real workload.",
    "hands_on":          "This is a hands-on tested guide with screenshots.",
    "n_day_test":        "Our 14-day test of 27 extensions produced these numbers.",
    "purchased_plans":   "We purchased every plan tier to compare billing.",
    "har_files":         "We captured HAR files to verify each network call.",
    "we_benchmarked":    "We benchmarked memory use across all candidates.",
    "our_benchmarks":    "According to our benchmarks, startup time dropped 30%.",
    "n_tab_test":        "Our 112-tab workload shows native grouping is slower.",
    "device_test":       "We measured boot impact on a MacBook Air M2 and a Chromebook.",
    "device_test_rev":   "The MacBook Pro M2 was tested with 40 extensions installed.",
    "chrome_ver_test":   "Everything ran on Chrome 126 with a clean profile.",
    "ms_degree":         "Written by Sarah Chen, M.S., a senior security analyst.",
    "phd":               "Reviewed by Alex Chen, Ph.D., HCI researcher.",
    "cissp":             "Our reviewer holds the CISSP certification.",
    "certified":         "She is a Certified Information Privacy Professional.",
    "subscribers":       "He writes a newsletter with 42k subscribers.",
    "newsletter":        "Join our newsletter subscribers list for updates.",
    "written_tested":    "Written & Tested By: The Browser Toolbox Team.",
    "written_by_tested": "Written by Jane Doe — Tested by the Gadflow Labs team.",
    "case_study":        "Case Study – Alex (Computer Science, 3rd year).",
    "student_testim":    "> Student Testimonial: switching cut my RAM use in half.",
    "survey_n":          "In our survey (n = 312), 68% reported better focus.",
    "survey_of_n":       "A survey of 1,024 students found tab overload common.",
}
S1_NEGATIVE = {
    "we_tested":         "The vendor ships a tested installer through the store.",
    "i_tested":          "Paste the link you tested into the address bar.",
    "our_lab":           "Google publishes lab results for Core Web Vitals.",
    "lab_tested":        "Antivirus engines rely on signature databases updated daily.",
    "hands_on":          "Keep your hands on the keyboard to use shortcuts.",
    "n_day_test":        "A 30-day trial lets you evaluate features.",
    "purchased_plans":   "Compare purchased plans on the pricing page of each vendor.",
    "har_files":         "The Network panel can export request logs for debugging.",
    "we_benchmarked":    "Third parties benchmarked the browser engine publicly.",
    "our_benchmarks":    "The tool shows benchmarks published by the vendor.",
    "n_tab_test":        "A 100-tab window can be restored from history.",
    "device_test":       "Chromebooks are designed for browser-first workflows.",
    "device_test_rev":   "The MacBook Air ships with macOS utilities.",
    "chrome_ver_test":   "Chrome 126 added new CSS features this cycle.",
    "ms_degree":         "Use MS Edge or another Chromium browser.",
    "phd":               "The study cites doctoral research on attention.",
    "cissp":             "Security certifications are administered by independent bodies.",
    "certified":         "The store lists certified extensions for enterprises.",
    "subscribers":       "Channels with many subscribers post browser tips.",
    "newsletter":        "Subscribe to the newsletter for weekly updates.",
    "written_tested":    "The changelog was written and reviewed by maintainers.",
    "written_by_tested": "This guide was written by our editors with care.",
    "case_study":        "Read the case study from the vendor website for context.",
    "student_testim":    "The vendor page features feedback from verified buyers.",
    "survey_n":          "The vendor published its survey methodology publicly.",
    "survey_of_n":       "The poll is a survey of opinions, not data.",
}
S2_POSITIVE = {
    "placeholder":       "### [Original Screenshot Placeholder: Chrome Task Manager]",
    "screenshot_brk":    "[Screenshot Placeholder: popup blocker blocking an ad]",
    "gif_brk":           "[GIF Placeholder: 30-second recording of lockdown mode]",
    "example_com":       '<img src="https://example.com/badges/privacy-gold.svg">',
    "hook_label":        "**Hook:** Every semester, thousands of students scramble.",
    "use_in_article":    "**Privacy Badge Icons** (use in article where each rating appears):",
    "alt_text_example":  "Alt text example for GIF: a timer extension counting down.",
    "fence_html":        "```html\n<div class=\"card\">raw leaked block</div>\n```",
    "fence_json":        "```json\n{\"@context\":\"https://schema.org\"}\n```",
    "ldjson_script":     '<script type="application/ld+json">{"@type":"FAQPage"}</script>',
    "ldjson_context":    '{"@context": "https://schema.org", "@type": "Product"}',
}
S2_NEGATIVE = {
    "placeholder":       "The Nginx config uses server_name as a placeholder value.",
    "screenshot_brk":    "Take a screenshot with the built-in capture tool.",
    "gif_brk":           "Convert the clip to a GIF before sharing.",
    "example_com":       "The docs use example.org domains for illustration.",
    "hook_label":        "Use the WebRequest hook to observe headers.",
    "use_in_article":    "Quotation marks used in article titles are typographic.",
    "alt_text_example":  "Good alt text describes the image action briefly.",
    "fence_html":        "```css\ncard { border: 1px; }\n```",
    "fence_json":        "```yaml\nlevel: info\n```",
    "ldjson_script":     "The store page embeds structured data served by the vendor.",
    "ldjson_context":    'Semantic markup uses "@type" nodes for products.',
}


def _mk_s1(name, rx, pos, neg):
    def t(self):
        r = fabrication_gate(pos)
        self.assertIn(name, [h["pattern"] for h in r["S1"]],
                      f"S1/{name} not flagged on positive probe")
        r2 = fabrication_gate(neg)
        self.assertNotIn(name, [h["pattern"] for h in r2["S1"]],
                         f"S1/{name} false-positived on negative probe")
    return t


def _mk_s2(name, rx, pos, neg):
    def t(self):
        r = fabrication_gate(pos)
        self.assertIn(name, [h["pattern"] for h in r["S2"]],
                      f"S2/{name} not flagged on positive probe")
        r2 = fabrication_gate(neg)
        self.assertNotIn(name, [h["pattern"] for h in r2["S2"]],
                         f"S2/{name} false-positived on negative probe")
    return t


class TestS1PerPattern(unittest.TestCase):
    pass


for _n, (_name, _rx) in enumerate(S1_PATTERNS):
    setattr(TestS1PerPattern, f"test_s1_{_name}",
            _mk_s1(_name, _rx, S1_POSITIVE[_name], S1_NEGATIVE[_name]))


class TestS2PerPattern(unittest.TestCase):
    pass


for _n, (_name, _rx) in enumerate(S2_PATTERNS):
    setattr(TestS2PerPattern, f"test_s2_{_name}",
            _mk_s2(_name, _rx, S2_POSITIVE[_name], S2_NEGATIVE[_name]))


class TestS2Structural(unittest.TestCase):
    def test_dup_faq_section_flagged(self):
        body = "## Frequently Asked Questions\n\nx\n\n## Frequently Asked Questions\n\ny"
        self.assertIn("dup_section", [h["pattern"] for h in fabrication_gate(body)["S2"]])

    def test_dup_final_verdict_flagged(self):
        body = "## Final Verdict\n\nx\n\n## Final Verdict\n\ny"
        self.assertIn("dup_section", [h["pattern"] for h in fabrication_gate(body)["S2"]])

    def test_single_sections_clean(self):
        body = "## Frequently Asked Questions\n\nx\n\n## Final Verdict\n\ny"
        self.assertFalse([h for h in fabrication_gate(body)["S2"]
                          if h["pattern"] == "dup_section"])

    def test_ragged_table_flagged(self):
        body = ("| A | B |\n|---|---|\n| 1 | 2 |\n| 3 | 4 | extra |")
        self.assertIn("ragged_table", [h["pattern"] for h in fabrication_gate(body)["S2"]])

    def test_consistent_table_clean(self):
        body = "| A | B |\n|---|---|\n| 1 | 2 |\n| 3 | 4 |"
        self.assertFalse(fabrication_gate(body)["S2"])


class TestS3(unittest.TestCase):
    def test_accusation_without_link_fails(self):
        body = ("Avast sells your data to third parties through Jumpshot. "
                "That program was shut down years ago.")
        r = fabrication_gate(body)
        self.assertIn("S3", r["failed_severities"])
        self.assertEqual(r["S3"][0]["product"], "Avast")

    def test_link_in_same_sentence_passes(self):
        body = ("Avast [was reported](https://www.pcworld.com/article/3181973/"
                "avast-extends-jumpshot-data-collection.html) to share browsing data "
                "with Jumpshot, which it later shut down.")
        self.assertNotIn("S3", fabrication_gate(body)["failed_severities"])

    def test_link_in_adjacent_sentence_passes(self):
        body = ("Avast shared browsing data with its Jumpshot subsidiary. "
                "This was reported by PCWorld in 2020 (https://www.pcworld.com/article/3181973).")
        self.assertNotIn("S3", fabrication_gate(body)["failed_severities"])

    def test_trigger_without_named_product_ignored(self):
        body = "Some extensions may share usage data with analytics providers."
        self.assertNotIn("S3", fabrication_gate(body)["failed_severities"])

    def test_named_product_without_trigger_ignored(self):
        body = "Avast offers a free tier and a paid tier with support."
        self.assertNotIn("S3", fabrication_gate(body)["failed_severities"])


class TestDocumentedExceptions(unittest.TestCase):
    """The single legitimate exception: a blockquote sentence carrying its
    own source link (a documented, cited quotation)."""

    def test_blockquote_with_link_excused(self):
        body = ("> Avast sold browsing data through Jumpshot "
                "(https://www.pcworld.com/article/3181973/).")
        r = fabrication_gate(body)
        self.assertNotIn("S3", r["failed_severities"])

    def test_blockquote_without_link_not_excused(self):
        body = "> Avast sold browsing data through Jumpshot."
        self.assertIn("S3", fabrication_gate(body)["failed_severities"])

    def test_blockquote_with_link_excuses_s2_line_leakage(self):
        body = '> Image caption (use in article): see [source](https://example.org/policy).'
        self.assertFalse([h for h in fabrication_gate(body)["S2"]
                          if h["pattern"] == "use_in_article"])

    def test_non_quote_with_link_still_fails_s1(self):
        body = "We tested 10 extensions (see [our methodology](https://example.org/method))."
        r = fabrication_gate(body)
        self.assertIn("we_tested", [h["pattern"] for h in r["S1"]])


class TestGateVerdictSemantics(unittest.TestCase):
    def test_clean_body_passes(self):
        body = ("## Introduction\n\nChrome extensions add features to the browser. "
                "Pick tools from the official store and review the permissions. "
                "## Final Verdict\n\nChoose the smallest set of extensions that serves you.")
        r = fabrication_gate(body)
        self.assertTrue(r["pass"], r)

    def test_any_s1_or_s2_or_s3_fails_gate(self):
        for probe in ("We tested five blockers.", "[Screenshot Placeholder]",
                      "Honey sells your data."):
            self.assertFalse(fabrication_gate(probe)["pass"], probe)


class TestRealArticles(unittest.TestCase):
    """Evidence tests: the two live articles must fail the gate."""
    FOCUS = ("*Hands-On Note:* Lowest footprint we tested. … "
             "I’ve tested over 60 productivity tools for my newsletter Deep Focus Lab (42k subscribers).")
    STUDENTS = ("**Hook:**\nEvery semester, thousands of students scramble…\n"
                "**Case Study – Alex (Computer Science, 3rd year)**\n"
                "> **Student Testimonial:** “Switching to OneTab + StayFocusd cut my Chrome RAM use…”\n"
                '**Privacy Badge:** <img src="https://example.com/badges/privacy-gold.svg">')

    def test_run41_focus_article_fails(self):
        r = fabrication_gate(self.FOCUS)
        self.assertFalse(r["pass"])
        self.assertIn("S1", r["failed_severities"])

    def test_run40_students_article_fails(self):
        r = fabrication_gate(self.STUDENTS)
        self.assertFalse(r["pass"])
        for sev in ("S1", "S2"):
            self.assertIn(sev, r["failed_severities"])

    def test_80_sites_claim_fails(self):
        body = ("We tested autofill on over 80 live sites across banking, ecommerce, "
                "SaaS, social, and government portals.")
        r = fabrication_gate(body)
        self.assertIn("we_tested", [h["pattern"] for h in r["S1"]])


if __name__ == "__main__":
    unittest.main()
