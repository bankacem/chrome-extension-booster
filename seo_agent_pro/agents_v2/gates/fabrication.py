"""Fabrication / honesty gates — deterministic, no model calls.

Owner brief 2026-10-03, item 3 ("بوابات الصدق والنظافة").

FP REFINEMENT (owner brief 2026-10-04, item 3; evidence: docs/audit-triage.md §ه):
Three S2 line patterns were too blunt against the published corpus and are now
structural, evidence-calibrated checks — S1 is untouched:

  fence_html / fence_json — a ```html/```json block is flagged ONLY when its
    content carries pipeline leakage: application/ld+json, schema.org @context,
    frontmatter/meta keys (seo_title, meta_description, …), or leaked
    instruction lines (Hook:, use in article, Alt text example, Placeholder).
    Legit teaching examples (manifest.json, Chrome policies, offscreen docs)
    are NOT flagged. Evidence: 34 of 35 published blocks were legit (~97% FP).

  screenshot_brk / gif_brk — "[Screenshot …" / "[GIF …" is flagged ONLY when it
    is NOT a markdown link (no "]( … )" after the bracket text). Evidence: all
    45 published matches were legit internal links written as
    "[Screenshot Tool …](/blog/…)" (100% FP); the one real placeholder lived
    in the pulled run #41 article.

  example_com — flagged ONLY as a URL-anchored domain ("https://example.com",
    "//example.com", "//www.example.com"). Prose subdomains like
    "adserver-example.com" / "intranet.example.com" in Chrome-policy examples
    are NOT flagged.

Three severities, mirroring the published inventory (docs/audit-fabrication.md,
PR #476) pattern-for-pattern so the audit and the gate can never drift:

  S1 — fabrication: invented first-hand/lab testing, device benchmarks,
       fake authors & credentials, fake testimonials/surveys.
  S2 — leak & damage: prompt/UI leakage (Hook:, placeholders, example.com),
       raw HTML/JSON-LD rendered as text, duplicated sections, ragged tables.
  S3 — unsourced sensitive claims: an accusation attributed to a NAMED
       product (data selling/sharing, breach, lawsuit, court ruling) with no
       source link in the same or an adjacent sentence.

Gate rule: the article FAILS if ANY S1 or S2 pattern matches, or if ANY S3
accusation lacks an adjacent source link.

Documented exception (the only one): a sentence inside a blockquote
("> ...") that itself carries a source link is treated as a cited quotation,
not as first-hand fabrication. This is deliberately conservative — the link
must be in the quoted sentence itself. The refined S2 scanners honor the same
exception: an excused blockquote line is never flagged.

Public API:
    fabrication_gate(body: str) -> dict
    SEVERITIES / S1_PATTERNS / S2_PATTERNS / S3 config (introspectable)
"""
import re
from typing import Dict, List, Tuple

# ─────────────────────────────────────────────────────────────
# S1 — invented testing / fake authors / fake social proof
# ─────────────────────────────────────────────────────────────
S1_PATTERNS: List[Tuple[str, str]] = [
    ("we_tested",        r"\bwe (?:have |'ve )?tested\b"),
    ("i_tested",         r"\bI (?:have |'ve )?tested\b"),
    ("our_lab",          r"\bour (?:lab|laboratory)\b"),
    ("lab_tested",       r"\b(?:we |)lab[- ]tested\b"),
    ("hands_on",         r"\bhands[- ]on (?:tested?|testing|review(?:ed)?)\b"),
    ("n_day_test",       r"\bour \d+[- ]day test\b"),
    ("purchased_plans",  r"\bpurchased (?:every|all) (?:plan|tier)s?\b"),
    ("har_files",        r"\bHAR files?\b"),
    ("we_benchmarked",   r"\bwe (?:benchmarked|measured)\b"),
    ("our_benchmarks",   r"\bour (?:benchmarks?|benchmark data|test (?:rig|setup|machine|environment)|testing)\b"),
    ("n_tab_test",       r"\bour \d+[ +-]?(?:tab|site|extension|app)[- ]?(?:test|workload|experiment)\b"),
    ("device_test",      r"\b(?:tested|benchmarked|measured)\b[^.\n]{0,80}?\bon (?:a|the) ?(?:202\d )?(?:MacBook|ThinkPad|Chromebook|Acer (?:Aspire|Chromebook|Spin)|Dell XPS|XPS \d|HP (?:Pavilion|Spectre|EliteBook)|Lenovo|Asus|Surface)\b"),
    ("device_test_rev",  r"\b(?:MacBook (?:Air|Pro)|ThinkPad|Chromebook|Acer (?:Aspire|Chromebook|Spin)|Dell XPS|XPS \d+|HP (?:Pavilion|Spectre)|Surface)\b[^.\n]{0,80}?\b(?:tested|benchmarked|measured|we ran)\b"),
    ("chrome_ver_test",  r"\bChrome (?:version )?\d{3}\b[^.\n]{0,60}?\b(?:tested|benchmark|clean profile)\b"),
    ("ms_degree",        r"\bM\.S\."),
    ("phd",              r"\bPh\.D\."),
    ("cissp",            r"\bCISSP\b"),
    ("certified",        r"\bCertified\b"),
    ("subscribers",      r"\b\d{2,}[KkMm]?\+?\s*subscribers\b"),
    ("newsletter",       r"\bnewsletter subscribers\b"),
    ("written_tested",   r"\bWritten (?:&|and) Tested By\b"),
    ("written_by_tested",r"\bWritten by\b[^.\n]{0,80}\bTested by\b"),
    ("case_study",       r"Case Study\s*[-–—]"),
    ("student_testim",   r"Student Testimonial"),
    ("survey_n",         r"survey\s*\(\s*n\s*="),
    ("survey_of_n",      r"\bsurvey of\s+\d+"),
]

# ─────────────────────────────────────────────────────────────
# S2 — prompt/UI leakage and structural damage
# ─────────────────────────────────────────────────────────────
# Simple S2 line patterns. The five evidence-calibrated checks below
# (screenshot_brk, gif_brk, example_com, fence_html, fence_json) are NOT here —
# they run as dedicated structural scanners (see fabrication_gate).
S2_PATTERNS: List[Tuple[str, str]] = [
    ("placeholder",      r"\bPlaceholder\b"),
    ("hook_label",       r"\bHook:"),
    ("use_in_article",   r"\buse in article\b"),
    ("alt_text_example", r"Alt text example"),
    ("ldjson_script",    r"<script[^>]*application/ld\+json"),
    ("ldjson_context",   r'"@context"\s*:\s*"https?://schema\.org"'),
]

# ── refined: placeholder brackets ─────────────────────────────────────────
# "[Screenshot …]" / "[GIF …]" flagged only when NOT a markdown link, i.e.
# there is no "]( … )" right after the closing bracket of the link text.
PLACEHOLDER_LINK_RE = re.compile(r"\[(Screenshot|GIF)[^\]]*\](?!\()")

# ── refined: example.com — URL-anchored only ─────────────────────────────
EXAMPLE_COM_URL_RE = re.compile(r"(?:https?:)?//(?:www\.)?example\.com\b")

# ── refined: fenced ```html / ```json blocks ────────────────────────────
# A fenced block is leakage ONLY if it carries one of these pipeline markers:
FENCE_LEAK_MARKERS: List[Tuple[str, str]] = [
    ("ld+json",       r"application/ld\+json"),
    ("schema_context", r'"@context"'),
    ("schema_org",    r"schema\.org"),
    ("meta_keys",     r"\b(?:seo_title|seo_description|meta_description|meta_keywords|"
                      r"meta_title|published_at|canonicalPath|focus_keyword)\b"),
    ("leak_lines",    r"\bHook:|\buse in article\b|Alt text example|\bPlaceholder\b"),
]

DUP_FAQ = re.compile(r"^## Frequently Asked Questions", re.M)
DUP_VERDICT = re.compile(r"^## Final Verdict", re.M)

# ─────────────────────────────────────────────────────────────
# S3 — named-product accusation without an adjacent source link
# ─────────────────────────────────────────────────────────────
PRODUCTS: List[str] = [
    "BlockSite", "AdBlock Plus", "Adblock Plus", "AdBlock", "uBlock Origin", "uBlock",
    "Ghostery", "Honey", "Avast", "AVG", "Norton", "McAfee", "Kaspersky", "Malwarebytes",
    "The Great Suspender", "Hola VPN", "HolaVPN", "Hola", "Touch VPN", "ZenMate",
    "TunnelBear", "Windscribe", "Private Internet Access", "ExpressVPN", "NordVPN",
    "CyberGhost", "PureVPN", "IPVanish", "HideMyAss", "Dashlane", "LastPass",
    "CCleaner", "Stands Fair AdBlocker", "Fair AdBlocker", "Video DownloadHelper",
    "TubeBuddy", "TBuddy", "vidIQ", "Social Blade", "Grammarly", "Momentum",
]
S3_TRIGGER = re.compile(
    # Owner brief 2026-10-04 item 4 — S3 narrowed to STRONG accusations only.
    # A named product is flagged ONLY when the sentence accuses it of one of:
    #   sells/sold/selling  + (data | users | bandwidth)   [≤2 words between]
    #   spyware | data breach(es/d) | hacked | lawsuit(s) | caught
    # Generic triggers removed (evidence: docs/audit-triage.md — shares/
    # harvest/leak/data-min/malware/settled/fined/court-ruled/class-action/
    # scam/injected/tracked-users produced unjudgable matches on published
    # prose). Precision is now measured on the FLAGGED set.
    r"\b((?:sells?|sold|selling)\s+(?:\w+\s+){0,2}(?:data|users|bandwidth)|"
    r"spyware|data\s+breach(?:e[sd]|s)?|hacked|lawsuits?|"
    r"caught)\b", re.I)
S3_PRODUCT = re.compile(r"\b(" + "|".join(re.escape(p) for p in PRODUCTS) + r")\b")
LINK_RE = re.compile(r"\]\((?:https?:)?/[^)]*\)|https?://[^\s)>\"']+")
SENT_SPLIT = re.compile(r"(?<=[.!?])\s+(?=[A-Z0-9\"'*\[])")
SEVERITIES = ("S1", "S2", "S3")


def _sentences(line: str) -> List[str]:
    return SENT_SPLIT.split(line)


def _has_link(sent: str) -> bool:
    return bool(LINK_RE.search(sent))


def _excused(line: str) -> bool:
    """The ONLY documented exception: a blockquote sentence that itself
    carries a source link — i.e. a cited quotation, not first-hand claims.
    A blockquote WITHOUT a link is still flagged."""
    stripped = line.lstrip()
    return stripped.startswith(">") and bool(_has_link(stripped))


def _scan_s3(body: str) -> List[Dict[str, str]]:
    hits: List[Dict[str, str]] = []
    for line in body.splitlines():
        if line.lstrip().startswith(("#", "|", "```")) or len(line) > 600:
            continue
        if _excused(line):
            continue
        sents = _sentences(line)
        for i, s in enumerate(sents):
            pm, tm = S3_PRODUCT.search(s), S3_TRIGGER.search(s)
            if not pm or not tm:
                continue
            neighbours = [sents[j] for j in (i - 1, i, i + 1) if 0 <= j < len(sents)]
            if any(_has_link(x) for x in neighbours):
                continue
            hits.append({"product": pm.group(1), "trigger": tm.group(1),
                         "sentence": re.sub(r"\s+", " ", s).strip()[:240]})
    return hits


def _ragged_tables(body: str) -> int:
    lines = body.splitlines()
    bad = 0
    i = 0
    while i < len(lines):
        if lines[i].lstrip().startswith("|") and i + 1 < len(lines) \
                and re.match(r"^\s*\|[-| :]+\|\s*$", lines[i + 1]):
            width = lines[i].count("|")
            j = i + 2
            while j < len(lines) and lines[j].lstrip().startswith("|"):
                if lines[j].count("|") != width:
                    bad += 1
                    break
                j += 1
            i = j
        else:
            i += 1
    return bad


def _dup_sections(body: str) -> List[str]:
    dups = []
    n_faq = len(DUP_FAQ.findall(body))
    n_verdict = len(DUP_VERDICT.findall(body))
    if n_faq > 1:
        dups.append(f"## Frequently Asked Questions appears {n_faq}x")
    if n_verdict > 1:
        dups.append(f"## Final Verdict appears {n_verdict}x")
    return dups


def fabrication_gate(body: str) -> Dict:
    """Evaluate all honesty/cleanliness gates. Pure code — no model calls.

    Returns {pass, failed_severities, S1, S2, S3} where each Sx is a list of
    {pattern, samples(≤3)} / {product, trigger, sentence} entries."""
    s1_hits, s2_hits = [], []
    for name, rx in S1_PATTERNS:
        # Fabrication phrasing is flagged regardless of sentence position
        # (mid-sentence "we tested" vs leading "We tested"), so S1 compiles
        # case-insensitively — EXCEPT "certified": the fake-bio signal is the
        # Capitalized credential word; lowercase "certified extensions" is
        # normal store terminology.
        flags = re.IGNORECASE if name != "certified" else 0
        for line in body.splitlines():
            m = re.search(rx, line, flags)
            if m:
                s1_hits.append({"pattern": name, "match": m.group(0)[:80],
                                "line": re.sub(r"\s+", " ", line).strip()[:200]})
                break  # one sample line per pattern is enough for the report
    s1_hits = [{"pattern": h["pattern"], "sample": h["line"]} for h in s1_hits]

    for name, rx in S2_PATTERNS:
        for line in body.splitlines():
            if re.search(rx, line) and not _excused(line):
                s2_hits.append({"pattern": name,
                                "sample": re.sub(r"\s+", " ", line).strip()[:200]})
                break

    # ── refined S2 scanners (evidence-calibrated; see module docstring) ──
    lines = body.splitlines()
    for name in ("screenshot_brk", "gif_brk"):
        for line in lines:
            if _excused(line):
                continue
            m = PLACEHOLDER_LINK_RE.search(line)
            if m and (name == "screenshot_brk") == (m.group(1) == "Screenshot"):
                s2_hits.append({"pattern": name,
                                "sample": re.sub(r"\s+", " ", line).strip()[:200]})
                break
    for line in lines:
        if _excused(line):
            continue
        if EXAMPLE_COM_URL_RE.search(line):
            s2_hits.append({"pattern": "example_com",
                            "sample": re.sub(r"\s+", " ", line).strip()[:200]})
            break
    for tag, name in (("html", "fence_html"), ("json", "fence_json")):
        rx = re.compile(r"```" + tag + r"\s*\n(.*?)(?:\n```|\Z)", re.S)
        for block in rx.findall(body):
            marker = next((lbl for lbl, mrx in FENCE_LEAK_MARKERS
                           if re.search(mrx, block)), None)
            if marker:
                first = next((l for l in block.splitlines() if l.strip()), "")
                s2_hits.append({"pattern": name,
                                "sample": f"[fenced {tag} block — leak marker: {marker}] "
                                          + re.sub(r"\s+", " ", first).strip()[:160]})
                break

    for d in _dup_sections(body):
        s2_hits.append({"pattern": "dup_section", "sample": d})
    rag = _ragged_tables(body)
    if rag:
        s2_hits.append({"pattern": "ragged_table",
                        "sample": f"{rag} table(s) with inconsistent cell counts"})

    s3_hits = _scan_s3(body)

    failed = []
    if s1_hits:
        failed.append("S1")
    if s2_hits:
        failed.append("S2")
    if s3_hits:
        failed.append("S3")
    return {"pass": not failed, "failed_severities": failed,
            "S1": s1_hits, "S2": s2_hits, "S3": s3_hits}
