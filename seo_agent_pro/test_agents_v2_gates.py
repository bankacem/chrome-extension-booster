"""Unit tests for the fabrication/honesty gates (agents_v2/gates).

Owner brief 2026-10-03 item 3: one unit test per pattern and per legitimate
exception (documented quote with a source). No model calls — pure regex.

Run:  python -m unittest seo_agent_pro.test_agents_v2_gates -v
"""
import re
import unittest

from seo_agent_pro.agents_v2.gates import (
    S1_PATTERNS, S2_PATTERNS, S1_PROPOSED_PATTERNS, fabrication_gate,
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
    "fence_html":        "```html\n<script type=\"application/ld+json\">\n{\"@context\":\"https://schema.org\"}\n</script>\n```",
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


class TestS3Narrowed(unittest.TestCase):
    """Owner brief 2026-10-04 item 4: S3 flags ONLY strong accusations against
    a named product. Generic triggers (shares/harvest/leak/data-min/malware/
    settled/fined/court-ruled/class-action/scam/injected/tracked-users and the
    bare verb 'sued') no longer flag — precision is judged on the flagged set."""

    # -- strong triggers still flag (no link nearby) --
    def test_sells_data_flags(self):
        body = "Honey sells your data to partners without asking."
        self.assertIn("S3", fabrication_gate(body)["failed_severities"])

    def test_selling_users_flags(self):
        body = "Hola VPN has been selling users' bandwidth to strangers."
        self.assertIn("S3", fabrication_gate(body)["failed_severities"])

    def test_spyware_flags(self):
        body = "That toolbar is basically spyware for your browser."
        r = fabrication_gate(body)
        # 'toolbar' is not in PRODUCTS; use a named product to trigger S3
        self.assertNotIn("S3", r["failed_severities"])
        body2 = "Avast was called spyware by several reviewers."
        self.assertIn("S3", fabrication_gate(body2)["failed_severities"])

    def test_data_breach_flags(self):
        body = "LastPass suffered a data breach that exposed customer vaults."
        self.assertIn("S3", fabrication_gate(body)["failed_severities"])

    def test_hacked_flags(self):
        body = "The Grammarly account was hacked in the incident."
        self.assertIn("S3", fabrication_gate(body)["failed_severities"])

    def test_lawsuit_flags(self):
        body = "The Great Suspender faced a lawsuit over malicious updates."
        self.assertIn("S3", fabrication_gate(body)["failed_severities"])

    def test_caught_no_longer_flags(self):
        # Owner brief 2026-10-04 S3 item 2: 'caught' removed from triggers.
        body = "Honey was caught rewriting affiliate cookies at checkout."
        self.assertNotIn("S3", fabrication_gate(body)["failed_severities"])

    # -- generic triggers no longer flag --
    def test_shared_no_longer_flags(self):
        body = "Ghostery shares anonymized telemetry with partners by default."
        self.assertNotIn("S3", fabrication_gate(body)["failed_severities"])

    def test_harvests_no_longer_flags(self):
        body = "AdBlock harvests page content to match ads, critics say."
        self.assertNotIn("S3", fabrication_gate(body)["failed_severities"])

    def test_leaked_no_longer_flags(self):
        body = "LastPass leaked metadata in the past, according to reports."
        self.assertNotIn("S3", fabrication_gate(body)["failed_severities"])

    def test_malware_scam_sued_fined_court_no_longer_flag(self):
        for sentence in ("Norton bundled malware-like popups last year.",
                         "Some call this extension a scam.",
                         "McAfee was sued over its refund policy.",
                         "Avast was fined by the regulator.",
                         "Kaspersky: a court ruled on the ban."):
            self.assertNotIn("S3", fabrication_gate(sentence)["failed_severities"],
                             msg=sentence)

    def test_injected_and_tracked_users_no_longer_flag(self):
        body = ("Honey injected codes into checkout pages and tracked users "
                "across sites.")
        self.assertNotIn("S3", fabrication_gate(body)["failed_severities"])


class TestS1ProposedNotWired(unittest.TestCase):
    """Owner brief 2026-10-04 item 3 (DRAFT PR): the proposed S1 extension
    patterns must (a) match their intended phrasings and (b) NOT change
    fabrication_gate behavior — they are unwired pending the owner's FP
    sample review."""

    PROBES = {
        "in_my_our_testing":   "In my testing, the pop-up blocker never slipped.",
        "during_after_testing": "During our testing the fan never spun up.",
        "my_our_tests":        "My tests covered 50 sites over two weeks.",
        "i_verbs":             "I measured a 22% drop in RAM usage.",
        "i_found_that":        "I found that dark mode uses less battery.",
        "in_testing_comma":    "In testing, three candidates failed outright.",
    }

    def test_each_proposed_pattern_matches(self):
        import re as _re
        by_name = dict(S1_PROPOSED_PATTERNS)
        self.assertEqual(set(by_name), set(self.PROBES))
        for name, text in self.PROBES.items():
            self.assertTrue(_re.search(by_name[name], text, _re.I), msg=name)

    def test_proposed_patterns_are_not_in_active_gate(self):
        active = {name for name, _ in S1_PATTERNS}
        for name, _ in S1_PROPOSED_PATTERNS:
            self.assertNotIn(name, active)

    def test_gate_ignores_proposed_phrasings(self):
        proposed = {name for name, _ in S1_PROPOSED_PATTERNS}
        for text in self.PROBES.values():
            r = fabrication_gate(text)
            # no hit may ever be attributed to a proposed (unwired) pattern;
            # active patterns may legitimately fire on the same sentence
            self.assertFalse(any(h["pattern"] in proposed for h in r["S1"]),
                             msg=text)


class TestS3Negation(unittest.TestCase):
    """Owner brief 2026-10-04 S3 item 2: negated sentences are disclaimers,
    NOT accusations — they must not flag. The Ghostery sentence is the
    owner's own acceptance test."""

    def test_ghostery_privacy_policy_not_flagged(self):
        body = ("Ghostery's privacy policy states they do not track or sell "
                "user data.")
        r = fabrication_gate(body)
        self.assertNotIn("S3", r["failed_severities"])
        self.assertEqual(r["S3"], [])

    def test_does_not_sell_not_flagged(self):
        body = "Hola VPN says it does not sell data to third parties."
        self.assertNotIn("S3", fabrication_gate(body)["failed_severities"])

    def test_not_spyware_not_flagged(self):
        body = "Avast is not spyware, according to the vendor's own policy."
        self.assertNotIn("S3", fabrication_gate(body)["failed_severities"])

    def test_never_been_hacked_not_flagged(self):
        body = "LastPass has never been hacked, the company claims."
        self.assertNotIn("S3", fabrication_gate(body)["failed_severities"])

    # -- control: dropping the negation restores the flag --
    def test_same_claim_without_negation_still_flags(self):
        body = "Ghostery sells user data to advertising partners."
        self.assertIn("S3", fabrication_gate(body)["failed_severities"])

    def test_negation_in_other_clause_still_flags(self):
        # negation sits behind a clause boundary (comma) — accusation stands
        body = ("Although the company says it does not harvest clicks, "
                "Honey sells your data to partners.")
        r = fabrication_gate(body)
        self.assertIn("S3", r["failed_severities"])
        self.assertEqual(r["S3"][0]["product"], "Honey")


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


class TestS2RefinedRules(unittest.TestCase):
    """Evidence-calibrated S2 rules (owner brief 2026-10-04; triage §ه):
    blocks/brackets/example.com only flag on REAL leakage, not on legit
    teaching examples or markdown links. S1 untouched."""

    # -- placeholder brackets: flagged only when NOT a markdown link --
    def test_screenshot_placeholder_flagged(self):
        r = fabrication_gate("[Screenshot Placeholder: popup blocker blocking an ad]")
        self.assertIn("screenshot_brk", [h["pattern"] for h in r["S2"]])

    def test_gif_placeholder_flagged(self):
        r = fabrication_gate("[GIF Placeholder: 30-second recording of lockdown mode]")
        self.assertIn("gif_brk", [h["pattern"] for h in r["S2"]])

    def test_screenshot_markdown_link_clean(self):
        body = ("For more tools see our [Screenshot Tool Chrome 2025](/blog/"
                "screenshot-tool-chrome-2025-8) guide — it covers capture flows.")
        self.assertFalse([h for h in fabrication_gate(body)["S2"]
                          if h["pattern"] == "screenshot_brk"])

    def test_gif_markdown_link_clean(self):
        body = "Watch the [GIF walkthrough of session restore](/blog/session-buddy-guide) first."
        self.assertFalse([h for h in fabrication_gate(body)["S2"]
                          if h["pattern"] == "gif_brk"])

    # -- example.com: URL-anchored only --
    def test_bare_example_com_url_flagged(self):
        r = fabrication_gate('<img src="https://example.com/badges/privacy-gold.svg">')
        self.assertIn("example_com", [h["pattern"] for h in r["S2"]])

    def test_www_example_com_url_flagged(self):
        r = fabrication_gate("Point the manifest at //www.example.com/service-worker.js.")
        self.assertIn("example_com", [h["pattern"] for h in r["S2"]])

    def test_subdomain_prose_example_com_clean(self):
        body = ("Chrome enterprise policies ship samples such as "
                "adserver-example.com and intranet.example.com for allowlists; "
                "the RFC reserves example.org too.")
        self.assertFalse([h for h in fabrication_gate(body)["S2"]
                          if h["pattern"] == "example_com"])

    # -- fenced blocks: flagged only when carrying pipeline leakage markers --
    def test_legit_manifest_json_block_clean(self):
        body = ('```json\n{\n  "manifest_version": 3,\n  "name": "Demo",\n'
                '  "permissions": ["storage"],\n  "host_permissions": ["https://*/*"]\n}\n```')
        self.assertFalse([h for h in fabrication_gate(body)["S2"]
                          if h["pattern"].startswith("fence_")])

    def test_legit_offscreen_html_block_clean(self):
        body = ('```html\n<!DOCTYPE html>\n<button id="poll">poll</button>\n'
                '<script src="offscreen.js"></script>\n```')
        self.assertFalse([h for h in fabrication_gate(body)["S2"]
                          if h["pattern"].startswith("fence_")])

    def test_fenced_json_with_meta_keys_flagged(self):
        body = '```json\n{"meta_description": "best adblock 2026", "seo_title": "x"}\n```'
        self.assertIn("fence_json", [h["pattern"] for h in fabrication_gate(body)["S2"]])

    def test_fenced_html_with_ldjson_flagged(self):
        body = ('```html\n<script type="application/ld+json">'
                '{"@context":"https://schema.org"}</script>\n```')
        self.assertIn("fence_html", [h["pattern"] for h in fabrication_gate(body)["S2"]])

    def test_fenced_block_with_leak_instruction_flagged(self):
        body = '```html\n<!-- Hook: open with a stat about RAM -->\n<p>intro</p>\n```'
        self.assertIn("fence_html", [h["pattern"] for h in fabrication_gate(body)["S2"]])

    def test_unclosed_fenced_json_with_context_flagged(self):
        # conservative: an unclosed fence leaks to EOF; if it carries a marker
        # anywhere after it, flag it.
        body = '```json\n{"@context": "https://schema.org", "@type": "Article"}\n'
        self.assertIn("fence_json", [h["pattern"] for h in fabrication_gate(body)["S2"]])

    def test_blockquote_with_link_excuses_example_com(self):
        body = ("> The vendor's docs illustrate it with https://example.com/quote "
                "(see [policy](https://example.org/policy)).")
        self.assertFalse([h for h in fabrication_gate(body)["S2"]
                          if h["pattern"] == "example_com"])

    # -- real-leak evidence: run #40 pulled article's fenced JSON-LD block --
    def test_run40_fenced_ldjson_leak_still_flagged(self):
        leak = ('```json\n{\n  "@context": "https://schema.org",\n'
                '  "@type": "Article",\n  "headline": "Chrome Extensions for Students '
                'Studying Online",\n  "description": "The best Chrome extensions for '
                'students studying online",\n  "author": {"@type": "Person"}\n}\n```')
        r = fabrication_gate(leak)
        self.assertFalse(r["pass"], "run #40 fenced JSON-LD leak must fail the gate")


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
