"""Fabrication / honesty gates — deterministic, no model calls.

Owner brief 2026-10-03, item 3 ("بوابات الصدق والنظافة").

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
must be in the quoted sentence itself.

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
S2_PATTERNS: List[Tuple[str, str]] = [
    ("placeholder",      r"\bPlaceholder\b"),
    ("screenshot_brk",   r"\[Screenshot"),
    ("gif_brk",          r"\[GIF"),
    ("example_com",      r"example\.com"),
    ("hook_label",       r"\bHook:"),
    ("use_in_article",   r"\buse in article\b"),
    ("alt_text_example", r"Alt text example"),
    ("fence_html",       r"```html"),
    ("fence_json",       r"```json"),
    ("ldjson_script",    r"<script[^>]*application/ld\+json"),
    ("ldjson_context",   r'"@context"\s*:\s*"https?://schema\.org"'),
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
    r"\b(sells?|sold|selling|shares?|shared|sharing|harvest\w*|leak\w*|data[- ]min\w*|"
    r"breach\w*|hack\w*|malware|spyware|lawsuit|sued|settle[dms]?|fine[d]?|"
    r"court (?:ruled|ordered|found)|class[- ]action|scam|injected|tracked users)\b", re.I)
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
