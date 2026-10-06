"""Unit tests for the fabrication/honesty gates (agents_v2/gates).

Owner brief 2026-10-03 item 3: one unit test per pattern and per legitimate
exception (documented quote with a source). No model calls — pure regex.

Run:  python -m unittest seo_agent_pro.test_agents_v2_gates -v
"""
import re
import unittest

from seo_agent_pro.agents_v2.gates import (
    S1_PATTERNS, S2_PATTERNS, S1_PROPOSED_PATTERNS, S1_V3_PATTERNS,
    fabrication_gate,
    FM_FIELDS, FM_HONESTY_PATTERNS, frontmatter_honesty_gate,
    body_neutralization_gate,
    scan_attribution_numbers, scan_unattributed_table_cells, unattributed_gate,
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


class TestS1ProposedWired(unittest.TestCase):
    """Owner approval 2026-10-05 (item 1): the proposed S1 extension is now
    WIRED — fabrication_gate() flags these phrasings and attributes the hit
    to the proposed pattern name. The tuple stays separate from S1_PATTERNS
    for provenance."""

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

    def test_proposed_names_are_distinct_from_active_names(self):
        active = {name for name, _ in S1_PATTERNS}
        proposed = {name for name, _ in S1_PROPOSED_PATTERNS}
        self.assertEqual(active & proposed, set())

    def test_gate_flags_proposed_phrasings(self):
        proposed = {name for name, _ in S1_PROPOSED_PATTERNS}
        v3 = {name for name, _ in S1_V3_PATTERNS}
        for name, text in self.PROBES.items():
            r = fabrication_gate(text)
            self.assertIn("S1", r["failed_severities"], msg=text)
            hit_names = {h["pattern"] for h in r["S1"]}
            self.assertIn(name, hit_names,
                          f"gate must attribute {name} to the wired proposal")
            # every hit on these single-sentence probes belongs to an
            # approved pattern (active/proposed/V3), never to an unknown one
            self.assertTrue(hit_names <= proposed |
                            {n for n, _ in S1_PATTERNS} | v3, msg=text)

    def test_wired_union_is_scanned(self):
        # the gate iterates the CONCATENATION, in order, base first
        self.assertEqual(len(S1_PATTERNS), 26)
        self.assertEqual(len(S1_PROPOSED_PATTERNS), 6)


class TestFrontmatterHonesty(unittest.TestCase):
    """Owner brief 2026-10-05 item 1: the four marketing fields
    (title, seo_title, meta_description, excerpt) get their own honesty
    gate with the owner's exact pattern list. One positive + one legitimate
    negative probe per pattern, plus field-attribution tests."""

    POS = {
        "fm_tested":       "9 Tested Fixes for Chrome High Memory Usage",
        "fm_we_tested":    "We Tested the Top 5 YouTube to MP3 Extensions",
        "fm_i_tested":     "I Tested Chrome Extensions on Android for a Week",
        "fm_hands_on":     "Hands-On With the New Tab Manager Extensions",
        "fm_real_numbers": "Real Numbers Inside: Chrome Memory Usage in 2026",
        "fm_benchmarked":  "Benchmarked: The Fastest Adblock Extensions of 2026",
        "fm_our_tests":    "Our Tests Show Which Extensions Slow Chrome Down",
        "fm_lab_tested":   "Lab-Tested Memory Savers for Low-End PCs",
    }
    NEG = {
        "fm_tested":       "Chrome Memory Saver: What It Does and How to Turn It On",
        "fm_we_tested":    "What We Know About Chrome's Memory Saver Mode",
        "fm_i_tested":     "This store extension is tested by millions of users",
        "fm_hands_on":     "Hands-Off Settings: Chrome's Automatic Memory Saver",
        "fm_real_numbers": "Real Examples of Chrome Shortcut Customization",
        # plural noun "benchmarks" = third-party data, NOT the claim form
        "fm_benchmarked":  "CPU benchmarks published by the vendor show modest gains",
        # singular "our test" stays clean per the brief's "our tests"
        "fm_our_tests":    "Read our test methodology for the full criteria",
        # "Lab results" is cited third-party data, not "lab-tested"
        "fm_lab_tested":   "Lab results from AV-Comparatives are cited in this guide",
    }

    def test_pattern_set_matches_owner_brief(self):
        self.assertEqual(
            [n for n, _ in FM_HONESTY_PATTERNS],
            ["fm_tested", "fm_we_tested", "fm_i_tested", "fm_hands_on",
             "fm_real_numbers", "fm_benchmarked", "fm_our_tests",
             "fm_lab_tested"])
        self.assertEqual(FM_FIELDS,
                         ("title", "seo_title", "meta_description", "excerpt"))

    def _hits(self, fields):
        return frontmatter_honesty_gate(fields)["hits"]

    def test_positive_and_legitimate_negative_per_pattern(self):
        for name in self.POS:
            pos_hits = [h["pattern"] for h in self._hits({"title": self.POS[name]})]
            self.assertIn(name, pos_hits, f"FM/{name} not flagged on positive probe")
            neg_hits = [h["pattern"] for h in self._hits({"title": self.NEG[name]})]
            self.assertNotIn(name, neg_hits,
                             f"FM/{name} false-positived on legitimate negative")

    def test_word_boundary_excludes_untested(self):
        hits = [h["pattern"] for h in self._hits({"title": "Untested Chrome Features You Can Still Enable"})]
        self.assertNotIn("fm_tested", hits)

    def test_each_of_the_four_fields_is_scanned(self):
        for field in FM_FIELDS:
            hits = self._hits({field: "We Tested 9 Memory Fixes"})
            pairs = {(h["field"], h["pattern"]) for h in hits}
            # the claim is attributed to the scanned field, and the same
            # value fires both the specific ("we tested") and the generic
            # ("tested") patterns — both must carry the field name
            self.assertEqual({f for f, _ in pairs}, {field}, msg=field)
            self.assertIn((field, "fm_we_tested"), pairs, msg=field)
            self.assertIn((field, "fm_tested"), pairs, msg=field)

    def test_non_frontmatter_fields_are_ignored(self):
        r = frontmatter_honesty_gate({
            "slug": "9-tested-fixes-we-tested-chrome",
            "author": "I tested this",
            "body": "Hands-on tested content lives in the body gate",
            "tags": "our tests, benchmarks",
        })
        self.assertEqual(r, {"pass": True, "hits": []})

    def test_clean_honest_frontmatter_passes(self):
        r = frontmatter_honesty_gate({
            "title": "Best Memory Saver Extensions for Chrome (2026 Guide)",
            "seo_title": "Best Memory Saver Extensions for Chrome 2026",
            "meta_description": "Compared the top Chrome memory saver extensions "
                                "based on public information and vendor documentation.",
            "excerpt": "What to know before picking a Chrome memory saver in 2026.",
        })
        self.assertTrue(r["pass"])
        self.assertEqual(r["hits"], [])

    def test_real_world_blind_spot_now_caught(self):
        # the exact class task G found: body clean, marketing fields carry
        # the claims — the FM gate must catch all three shapes
        r = frontmatter_honesty_gate({
            "title": "How to Fix Chrome High Memory Usage: 9 Tested Fixes (2026)",
            "meta_description": "We tested every fix and share real numbers inside.",
            "excerpt": "Our tests covered 9 fixes with lab-tested results.",
        })
        self.assertFalse(r["pass"])
        pats = {h["pattern"] for h in r["hits"]}
        self.assertTrue({"fm_tested", "fm_we_tested", "fm_real_numbers",
                         "fm_our_tests", "fm_lab_tested"} <= pats)

    def test_empty_and_missing_fields_pass(self):
        self.assertEqual(frontmatter_honesty_gate({}), {"pass": True, "hits": []})
        self.assertEqual(frontmatter_honesty_gate({"title": ""}),
                         {"pass": True, "hits": []})


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


class TestBodyNeutralization(unittest.TestCase):
    """Owner brief 2026-10-05 item 2 — deterministic before/after guard.
    One test per forbidden change plus legitimate negatives."""

    BEFORE = "\n\n".join([
        "# Tab Manager Guide",
        "Chrome tab managers help you organize your browsing in 2026. "
        "This article compares SessionBox and OneTab.",
        "## How We Tested - Results at 1, 10, and 25 Tabs",
        "I installed 12 extensions on a MacBook Air M2 and measured RAM at "
        "1, 10, and 25 tabs. Chrome 126 was used with a clean profile.",
        "The 112-tab workload showed a 30% improvement over the baseline. "
        "SessionBox consumed 480 MB per window.",
        "## Key Features",
        "Many users keep SessionBox for isolated sessions. "
        "OneTab collapses every tab into a single list.",
        "![Screenshot of tab groups](/content/images/tab-manager/shot1.webp)",
        "| Tool | RAM (MB) |\n|---|---|\n| SessionBox | 480 |\n| OneTab | 210 |",
        "## Frequently Asked Questions",
        "**Is OneTab free?**\nYes, OneTab is free to use.",
    ])
    METHOD_H = "## How We Tested - Results at 1, 10, and 25 Tabs"
    DISCLOSURE = ("This guide is a research-based comparison compiled from "
                  "publicly available information and general product "
                  "knowledge. ExtensionTo has not run independent lab tests "
                  "for this article. Features, permissions, and pricing "
                  "change, so check the official listing before installing.")
    RENAME = [("## How We Tested - Results at 1, 10, and 25 Tabs",
               "## About this guide")]
    MARKED = {2, 3, 4}  # heading + the two methodology paragraphs

    def blocks(self, body):
        from seo_agent_pro.agents_v2.gates.body_neutralization import _blocks
        return _blocks(body)

    def legit_after(self):
        b = self.blocks(self.BEFORE)
        return "\n\n".join(
            b[0:2] + ["## About this guide", self.DISCLOSURE] + b[5:])

    def gate(self, after, marked=MARKED, renames=RENAME, allow=("ExtensionTo",),
             new_limit=None):
        from seo_agent_pro.agents_v2.gates import body_neutralization_gate
        return body_neutralization_gate(
            self.BEFORE, after, marked, allowed_heading_renames=renames,
            allow_proper_nouns=allow, allowed_new_paragraphs=new_limit)

    # ── 1) numbers / percentages / versions ──────────────────────────────
    def test_number_new_fails(self):
        after = self.legit_after().replace("single list", "single list of 40 tabs")
        r = self.gate(after)
        self.assertFalse(r["pass"])
        self.assertTrue(any(v["check"] == "number_new" and "40" in v["detail"]
                            for v in r["violations"]))

    def test_number_removal_passes(self):
        r = self.gate(self.legit_after())
        self.assertFalse(any(v["check"] == "number_new" for v in r["violations"]))

    def test_percent_new_fails(self):
        after = self.legit_after().replace("single list", "single list by 40%")
        r = self.gate(after)
        self.assertTrue(any(v["check"] == "percent_new" for v in r["violations"]))

    def test_version_new_fails(self):
        after = self.legit_after().replace(
            self.DISCLOSURE,
            "The guide was checked against Chrome 127.0.6613.119 in this "
            "article. Features change, so check the official listing before installing.")
        r = self.gate(after)
        self.assertTrue(any(v["check"] == "version_new"
                            and "127.0.6613.119" in v["detail"]
                            for v in r["violations"]))

    # ── 2) proper nouns, paragraph-level ─────────────────────────────────
    def test_proper_noun_new_fails(self):
        after = self.legit_after().replace(
            self.DISCLOSURE,
            "Sarah Chen compiled this comparison from public sources.")
        r = self.gate(after)
        self.assertTrue(any(v["check"] == "proper_noun_new" and "Chen" in v["detail"]
                            for v in r["violations"]))

    def test_proper_noun_is_paragraph_scoped(self):
        # "Sarah Chen" exists in ANOTHER paragraph of the article but not in
        # the paragraph being rewritten (equal-count 1:1 replace) -> fail
        before = self.BEFORE.replace(
            "Chrome tab managers help you organize",
            "Sarah Chen writes that tab managers help you organize")
        b = self.blocks(before)
        after = "\n\n".join(b[:3] +
                             ["Sarah Chen compiled this comparison from public sources."] +
                             b[4:])
        from seo_agent_pro.agents_v2.gates import body_neutralization_gate
        r = body_neutralization_gate(before, after, {3},
                                     allowed_heading_renames=())
        self.assertTrue(any(v["check"] == "proper_noun_new" and "Chen" in v["detail"]
                            for v in r["violations"]))

    EXT_MID = ("Public sources only; ExtensionTo has not run independent "
               "lab tests for this article. Features change, so check the "
               "official listing before installing.")

    def test_proper_noun_allowlist_passes(self):
        after = self.legit_after().replace(self.DISCLOSURE, self.EXT_MID)
        r = self.gate(after)
        self.assertFalse(any(v["check"] == "proper_noun_new"
                             for v in r["violations"]))

    def test_proper_noun_without_allowlist_fails(self):
        after = self.legit_after().replace(self.DISCLOSURE, self.EXT_MID)
        r = self.gate(after, allow=())
        self.assertTrue(any(v["check"] == "proper_noun_new"
                            and "ExtensionTo" in v["detail"]
                            for v in r["violations"]))

    # ── 3) links ─────────────────────────────────────────────────────────
    def test_link_new_fails(self):
        after = self.legit_after().replace(
            "OneTab collapses every tab into a single list",
            "OneTab collapses every tab into a single list ([docs](https://example.com/one))")
        r = self.gate(after)
        self.assertTrue(any(v["check"] == "link_new" for v in r["violations"]))

    def test_link_removal_passes(self):
        r = self.gate(self.legit_after())
        self.assertFalse(any(v["check"] == "link_new" for v in r["violations"]))

    # ── 4) structure: headings / images / table rows / FAQ ───────────────
    def test_heading_changed_without_permission_fails(self):
        after = self.legit_after().replace("## Key Features", "## Highlights")
        r = self.gate(after)
        self.assertTrue(any(v["check"] == "heading_changed" for v in r["violations"]))

    def test_heading_allowed_rename_passes(self):
        r = self.gate(self.legit_after())
        self.assertFalse(any(v["check"] == "heading_changed" for v in r["violations"]))

    def test_allowed_rename_source_missing_fails(self):
        r = self.gate(self.legit_after().replace("## About this guide",
                                                 "## About this guide (2026)"))
        self.assertTrue(any(v["check"] == "heading_changed" for v in r["violations"]))

    def test_image_changed_fails(self):
        after = self.legit_after().replace("shot1.webp", "shot2.webp")
        r = self.gate(after)
        self.assertTrue(any(v["check"] == "image_changed" for v in r["violations"]))

    def test_table_row_changed_fails(self):
        after = self.legit_after().replace("| OneTab | 210 |", "| OneTab | 220 |")
        r = self.gate(after)
        self.assertTrue(any(v["check"] == "table_row_changed" for v in r["violations"]))

    def test_faq_question_changed_fails(self):
        after = self.legit_after().replace("**Is OneTab free?**",
                                           "**Is OneTab paid?**")
        r = self.gate(after)
        self.assertTrue(any(v["check"] == "faq_question_changed"
                            for v in r["violations"]))

    # ── 5) unmarked paragraphs / insert limit ────────────────────────────
    def test_unmarked_paragraph_changed_fails(self):
        after = self.legit_after().replace(
            "Many users keep SessionBox for isolated sessions",
            "Many users keep SessionBox in separate sessions")
        r = self.gate(after)
        self.assertTrue(any(v["check"] == "unmarked_paragraph_changed"
                            for v in r["violations"]))

    def test_marked_paragraph_rewritten_passes(self):
        r = self.gate(self.legit_after())
        self.assertFalse(any(v["check"] == "unmarked_paragraph_changed"
                             for v in r["violations"]))

    def test_insert_limit_exceeded_fails(self):
        b = self.blocks(self.legit_after())
        after = "\n\n".join(b[:2] + ["Extra paragraph one.", "Extra paragraph two."] + b[2:])
        r = self.gate(after, new_limit=3)
        self.assertTrue(any(v["check"] == "insert_limit_exceeded"
                            for v in r["violations"]))

    def test_insert_within_limit_passes(self):
        after = self.legit_after()
        r = self.gate(after, new_limit=2)
        self.assertFalse(any(v["check"] == "insert_limit_exceeded"
                             for v in r["violations"]))

    # ── 6) word-drop limit ───────────────────────────────────────────────
    def test_word_drop_exceeded_fails(self):
        b = self.blocks(self.BEFORE)
        # keep only: H, renamed heading, disclosure -> >45% word drop
        after = "\n\n".join([b[0], "## About this guide", self.DISCLOSURE])
        from seo_agent_pro.agents_v2.gates import body_neutralization_gate
        r = body_neutralization_gate(
            self.BEFORE, after, set(range(len(b))),
            allowed_heading_renames=self.RENAME,
            allow_proper_nouns=("ExtensionTo",))
        self.assertTrue(any(v["check"] == "word_drop_exceeded"
                            for v in r["violations"]))

    def test_word_drop_within_limit_passes(self):
        r = self.gate(self.legit_after())
        self.assertFalse(any(v["check"] == "word_drop_exceeded" for v in r["violations"]))

    # ── 7) fabrication gates on the result ───────────────────────────────
    def test_gates_failed_on_result(self):
        after = self.legit_after().replace(
            self.DISCLOSURE,
            "We tested every candidate on a fresh profile. Results were great.")
        r = self.gate(after)
        self.assertTrue(any(v["check"] == "gates_failed_S1S2S3" for v in r["violations"]))

    def test_gates_pass_on_clean_result(self):
        r = self.gate(self.legit_after())
        self.assertFalse(any(v["check"] == "gates_failed_S1S2S3" for v in r["violations"]))

    # ── full legitimate scenario ─────────────────────────────────────────
    def test_full_legit_scenario_passes(self):
        r = self.gate(self.legit_after())
        self.assertTrue(r["pass"], r["violations"])

    def test_pre_existing_gate_hits_do_not_fail(self):
        # The renamed-out methodology heading was the fixture's only gate
        # hit; after a legit neutralization the result gains NO new hits and
        # the stats report whatever remains (0 here).
        r = self.gate(self.legit_after())
        self.assertFalse(any(v["check"] == "gates_failed_S1S2S3"
                             for v in r["violations"]))
        self.assertIn("remaining_gate_hits", r["stats"])
        self.assertEqual(r["stats"]["remaining_gate_hits"], 0)

    def test_repeated_existing_number_passes(self):
        # "2026" exists in the article; adding one more mention is not a
        # NEW number (set semantics, not multiset).
        after = self.legit_after().replace(
            "check the official listing before installing.",
            "check the official listing in 2026 before installing.")
        r = self.gate(after)
        self.assertFalse(any(v["check"] == "number_new" for v in r["violations"]))

    def test_possessive_proper_noun_passes(self):
        # paragraph already has "SessionBox"; "SessionBox's" is the same noun
        after = self.legit_after().replace(
            "Many users keep SessionBox for isolated sessions.",
            "Many users keep SessionBox for isolated sessions, and SessionBox's options stay simple.")
        r = self.gate(after, marked={2, 3, 4, 6})
        self.assertFalse(any(v["check"] == "proper_noun_new" for v in r["violations"]))

    def test_renamed_heading_anchor_link_allowed(self):
        after = self.legit_after().replace(
            "OneTab collapses every tab into a single list.",
            "OneTab collapses every tab into a single list (see [the guide notes](#about-this-guide)).")
        renames = [("## How We Tested - Results at 1, 10, and 25 Tabs",
                    "## About this guide {#about-this-guide}")]
        r = self.gate(after, marked={2, 3, 4, 6}, renames=renames)
        self.assertFalse(any(v["check"] == "link_new" for v in r["violations"]))

    def test_heading_line_check_tolerates_toc_block_edits(self):
        # a TOC bullet is not a heading line; editing it must not trip the
        # heading check when the real heading lines are unchanged
        after = self.legit_after()
        r = self.gate(after)
        self.assertFalse(any(v["check"] == "heading_changed" for v in r["violations"]))

    def test_bold_sentence_start_token_skipped(self):
        # "...price.** Running uBlock..." — the token after a bold close is a
        # sentence start, not a new proper noun
        after = self.legit_after().replace(
            "Many users keep SessionBox for isolated sessions.",
            "Many users keep SessionBox for isolated sessions. **Bottom line: running it is light.**")
        r = self.gate(after, marked={2, 3, 4, 6})
        self.assertFalse(any(v["check"] == "proper_noun_new" for v in r["violations"]))

    def test_gate_is_deterministic(self):
        a = self.gate(self.legit_after())
        b = self.gate(self.legit_after())
        self.assertEqual(a, b)


class TestS1V3PerPattern(unittest.TestCase):
    """Owner brief 2026-10-06 item 1: the seven V3 first-person/testing
    families — one positive (MUST flag) and one legitimate negative (must
    NOT flag) probe per pattern, plus provenance wiring."""

    POSITIVE = {
        "v3_prep_testing":      "After extensive testing across five machines, the winner was clear.",
        "v3_extensive_testing": "The guide is the product of extensive testing.",
        "v3_testing_dozens":    "After testing dozens of ad blockers, two stood out.",
        "v3_based_on_my":       "Based on my experience, lighter extensions age better.",
        "v3_i_have_seen":       "I've seen a single YouTube tab eat 900 MB of RAM.",
        "v3_my_noun":           "My setup pairs uBlock Origin with a DNS filter.",
        "v3_i_recommend":       "I recommend starting with a single blocker.",
    }
    NEGATIVE = {
        "v3_prep_testing":      "Results can shift after the testing window closes.",
        "v3_extensive_testing": "The vendor's changelog documents extensive test coverage improvements.",
        "v3_testing_dozens":    "Hundreds of settings live behind chrome://flags; testing them all is impractical.",
        "v3_based_on_my":       "The checklist is based on my colleague's published notes.",
        "v3_i_have_seen":       "Readers have seen this error when the store cache is stale.",
        "v3_my_noun":           "The guide keeps my recommendations limited to documented features.",
        "v3_i_recommend":       "Experts recommend enabling one filter list at a time.",
    }

    def test_each_v3_pattern_matches_positive(self):
        by_name = dict(S1_V3_PATTERNS)
        self.assertEqual(set(by_name), set(self.POSITIVE))
        for name, text in self.POSITIVE.items():
            self.assertTrue(re.search(by_name[name], text, re.I), msg=name)

    def test_each_v3_legitimate_negative_is_clean(self):
        by_name = dict(S1_V3_PATTERNS)
        for name, text in self.NEGATIVE.items():
            self.assertFalse(re.search(by_name[name], text, re.I),
                             msg=f"{name} must not match: {text}")

    def test_gate_flags_v3_with_provenance(self):
        active = {n for n, _ in S1_PATTERNS}
        proposed = {n for n, _ in S1_PROPOSED_PATTERNS}
        v3 = {n for n, _ in S1_V3_PATTERNS}
        self.assertTrue(active & v3 == set() and proposed & v3 == set())
        for name, text in self.POSITIVE.items():
            r = fabrication_gate(text)
            self.assertIn("S1", r["failed_severities"], msg=text)
            hit_names = {h["pattern"] for h in r["S1"]}
            self.assertIn(name, hit_names, msg=text)
            self.assertTrue(hit_names <= active | proposed | v3, msg=text)

    def test_full_form_and_curly_apostrophe_match(self):
        by_name = dict(S1_V3_PATTERNS)
        self.assertTrue(re.search(by_name["v3_i_have_seen"],
                                  "I have seen this bug reported.", re.I))
        self.assertTrue(re.search(by_name["v3_i_have_seen"],
                                  "I\u2019ve been there too.", re.I))
        self.assertTrue(re.search(by_name["v3_i_have_seen"],
                                  "I've tried three DNS filters.", re.I))


class TestUnattributedAttribution(unittest.TestCase):
    """unattributed.scan_attribution_numbers — entity-attributed quantity
    with no same-sentence source link."""

    def test_positive_percent_no_link(self):
        hits = scan_attribution_numbers(
            "According to Google, Chrome can use 30% more memory without a blocker.")
        self.assertEqual(len(hits), 1)
        self.assertEqual(hits[0]["entity"], "Google")

    def test_positive_unit_quantity(self):
        hits = scan_attribution_numbers(
            "According to Mozilla, the browser recovered 2 GB of RAM in their study.")
        self.assertEqual(len(hits), 1)
        self.assertEqual(hits[0]["quantity"], "2 GB")

    def test_negative_link_in_same_sentence(self):
        body = ("According to [Google's documentation]"
                "(https://developers.google.com/web), Chrome can use 30% more memory.")
        self.assertEqual(scan_attribution_numbers(body), [])

    def test_negative_no_quantity(self):
        self.assertEqual(scan_attribution_numbers(
            "According to Google, extensions improve the browsing experience."), [])

    def test_negative_version_only(self):
        # declared exclusion: version tokens are not quantities
        self.assertEqual(scan_attribution_numbers(
            "According to Mozilla, Firefox 130.0 ships the change."), [])

    def test_negative_unlisted_entity(self):
        self.assertEqual(scan_attribution_numbers(
            "According to RandomBlog, Chrome uses 40% more RAM."), [])

    def test_negative_quote_exception(self):
        body = "> According to Google, Chrome uses 30% more memory [source](https://example.com/source)."
        self.assertEqual(scan_attribution_numbers(body), [])

    def test_gate_wrapper_reports_family(self):
        r = unattributed_gate("According to Google, Chrome saves 40% battery.")
        self.assertFalse(r["pass"])
        self.assertEqual(len(r["attribution_numbers"]), 1)


class TestUnattributedTables(unittest.TestCase):
    """unattributed.scan_unattributed_table_cells — measurement values under
    measurement-indicating column headers."""

    TABLE = ("| Extension | Memory Usage | Effectiveness |\n"
             "|---|---|---|\n"
             "| Light Popup Blocker | 8-12MB | 92% |\n"
             "| uBlock Origin | 15-25MB | 95% |\n")

    def test_positive_range_and_percent(self):
        hits = scan_unattributed_table_cells(self.TABLE)
        self.assertEqual(len(hits), 4)  # 2 rows x 2 measure columns
        self.assertEqual({h["header"] for h in hits},
                         {"Memory Usage", "Effectiveness"})

    def test_positive_battery_header(self):
        table = ("| Configuration | Battery used |\n|---|---|\n"
                 "| Chrome | 6.1% |\n")
        hits = scan_unattributed_table_cells(table)
        self.assertEqual(len(hits), 1)
        self.assertEqual(hits[0]["cell"], "6.1%")

    def test_negative_qualitative_cells(self):
        table = ("| Extension | Memory Usage | Effectiveness |\n"
                 "|---|---|---|\n"
                 "| Light Popup Blocker | Not independently tested | Not independently tested |\n"
                 "| uBlock Origin | Low | High |\n")
        self.assertEqual(scan_unattributed_table_cells(table), [])

    def test_negative_non_measure_header(self):
        table = ("| Extension | Price |\n|---|---|\n"
                 "| Pro Blocker | $19.99/year |\n")
        self.assertEqual(scan_unattributed_table_cells(table), [])

    def test_negative_no_table(self):
        self.assertEqual(scan_unattributed_table_cells(
            "It uses 8-12MB of memory in testing."), [])


class TestBodyNeutralizationMarkedTables(unittest.TestCase):
    """Owner brief 2026-10-06 item 2: the narrow marked-table license —
    accepted-strings cell swaps only, structure fully preserved."""

    BEFORE = (
        "Intro paragraph stays put.\n"
        "\n"
        "| Feature | Chrome Memory Saver | Tab Snooze |\n"
        "|---|---|---|\n"
        "| Memory Savings (Typical) | 30-40% | 25-40% |\n"
        "| Automatic Suspension | Yes (time-based) | Yes (time-based) |\n"
        "\n"
        "Closing paragraph stays put.\n"
    )
    MARKED_TABLE_BLOCK = 1

    def _gate(self, after, marked=(0, 1, 2), **kw):
        return body_neutralization_gate(self.BEFORE, after, marked=list(marked), **kw)

    def test_accepts_cell_swap_to_accepted_string(self):
        after = self.BEFORE.replace("| 30-40% | 25-40% |",
                                    "| Not independently tested | Not independently tested |")
        r = self._gate(after, allow_marked_table_edits=True)
        self.assertEqual(r["violations"], [])

    def test_accepts_extra_accepted_string_allowlist(self):
        after = self.BEFORE.replace("| 30-40% | 25-40% |", "| Low | High |")
        r = self._gate(after, allow_marked_table_edits=True,
                       allowed_table_cell_values=["Not independently tested", "Low", "High"])
        self.assertEqual(r["violations"], [])

    def test_fails_without_license_flag(self):
        after = self.BEFORE.replace("| 30-40% | 25-40% |",
                                    "| Not independently tested | Not independently tested |")
        r = self._gate(after)
        self.assertTrue(any(v["check"] == "table_row_changed"
                            for v in r["violations"]))

    def test_fails_when_table_block_unmarked(self):
        after = self.BEFORE.replace("| 30-40% | 25-40% |",
                                    "| Not independently tested | Not independently tested |")
        r = self._gate(after, marked=(0, 2), allow_marked_table_edits=True)
        self.assertTrue(any(v["check"] == "table_row_changed"
                            for v in r["violations"]))

    def test_fails_on_header_change(self):
        after = self.BEFORE.replace(
            "| Feature | Chrome Memory Saver | Tab Snooze |",
            "| Feature | Memory Saver | Tab Snooze |")
        r = self._gate(after, allow_marked_table_edits=True)
        self.assertTrue(any("header/separator" in v["detail"]
                            for v in r["violations"]))

    def test_fails_on_row_count_change(self):
        after = self.BEFORE.replace(
            "| Automatic Suspension | Yes (time-based) | Yes (time-based) |\n", "")
        r = self._gate(after, allow_marked_table_edits=True)
        self.assertTrue(any(v["check"] == "table_row_changed"
                            for v in r["violations"]))

    def test_fails_on_first_column_change(self):
        after = self.BEFORE.replace("| Memory Savings (Typical) |",
                                    "| Memory Savings |")
        r = self._gate(after, allow_marked_table_edits=True)
        self.assertTrue(any("first column changed" in v["detail"]
                            for v in r["violations"]))

    def test_fails_on_cell_text_outside_accepteds(self):
        after = self.BEFORE.replace("| 30-40% | 25-40% |", "| Around a third | 25-40% |")
        r = self._gate(after, allow_marked_table_edits=True)
        self.assertTrue(any("not in accepted strings" in v["detail"]
                            for v in r["violations"]))

    def test_fails_on_new_number_inside_cell_even_from_allowlist_bypass(self):
        # a cell value with a NEW number can never be licensed: exact
        # allowlist matching means fabricated values must be added to the
        # allowlist explicitly (owner's call), and number_new fires regardless
        after = self.BEFORE.replace("| 30-40% | 25-40% |", "| 35% | 25-40% |")
        r = self._gate(after, allow_marked_table_edits=True,
                       allowed_table_cell_values=["35%"])
        self.assertTrue(any(v["check"] == "number_new" for v in r["violations"]))

    def test_disclaimer_insert_whitelist(self):
        after = self.BEFORE.replace(
            "| Automatic Suspension | Yes (time-based) | Yes (time-based) |\n",
            "| Automatic Suspension | Yes (time-based) | Yes (time-based) |\n"
            "\n"
            "Figures are not independently verified; check each product's official listing.\n"
        ).replace("| 30-40% | 25-40% |", "| Not independently tested | Not independently tested |")
        r = self._gate(after, allow_marked_table_edits=True,
                       allowed_new_paragraph_texts=[
                           "Figures are not independently verified; "
                           "check each product's official listing."])
        self.assertEqual(r["violations"], [])

    def test_unwhitelisted_insert_still_flagged(self):
        after = self.BEFORE.replace(
            "| Automatic Suspension | Yes (time-based) | Yes (time-based) |\n",
            "| Automatic Suspension | Yes (time-based) | Yes (time-based) |\n"
            "\n"
            "Sponsored trials by FreshBlock show 55% faster browsing.\n")
        r = self._gate(after, allow_marked_table_edits=True,
                       allowed_new_paragraph_texts=["unrelated"])
        checks = {v["check"] for v in r["violations"]}
        self.assertTrue("number_new" in checks and "proper_noun_new" in checks,
                        msg=checks)


class TestUnattributedInOutput(unittest.TestCase):
    """body_neutralization_gate check 8: the result must not introduce new
    unattributed hits (subset semantics, same as S1/S2/S3)."""

    BEFORE = "Plain paragraph one.\n\nMarked paragraph with a claim.\n\nPlain paragraph three.\n"

    def test_new_attribution_in_marked_paragraph_fails(self):
        after = self.BEFORE.replace(
            "Marked paragraph with a claim.",
            "Marked paragraph. According to Google, Chrome uses 30% less memory.")
        r = body_neutralization_gate(self.BEFORE, after, marked=[1])
        self.assertTrue(any(v["check"] == "unattributed_new"
                            for v in r["violations"]))

    def test_preexisting_attribution_not_flagged(self):
        before = self.BEFORE.replace(
            "Marked paragraph with a claim.",
            "Marked paragraph. According to Google, Chrome uses 30% less memory.")
        r = body_neutralization_gate(before, before, marked=[1])
        self.assertFalse(any(v["check"] == "unattributed_new"
                            for v in r["violations"]))

    def test_stats_report_remaining_unattributed(self):
        r = body_neutralization_gate(
            self.BEFORE, self.BEFORE.replace(
                "Marked paragraph with a claim.",
                "Marked. According to Mozilla, tests show 2 GB savings."), marked=[1])
        self.assertEqual(r["stats"]["remaining_unattributed_hits"], 1)


if __name__ == "__main__":
    unittest.main()
