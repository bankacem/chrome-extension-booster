"""Unattributed-claim scanners — deterministic, no model calls.

Owner brief 2026-10-06, item 1 ("بوابة v2"): two NEW detection families
beyond the first-person S1 patterns:

  (1) attribution_number — a sentence attributes a quantity to a named
      organization ("According to Google, Chrome uses 30% more memory ...")
      while carrying NO source link in the same sentence. The number may be
      a percentage or a unit-attached measurement. This is exactly the
      "claims N%" family flagged in docs/pilot-review-1.md (c) and the
      "نسبة إلى جهة" pattern of the brief.

  (2) unattributed_table_cell — a markdown table cell carries a number with
      a measurement unit (MB, GB, KB, ms, s, %, x/fps) or a numeric range
      ("30-40"), and the COLUMN HEADER of that cell indicates a measurement
      (Memory, Speed, Effectiveness, Savings, Block, Battery, RAM, CPU).
      This is the "جدول قياس غير منسوب" pattern of the brief — the same
      invented-benchmark shape documented in docs/tables-plan.md.

Declared exclusions (both scanners, same discipline as
docs/unattributed-gate-plan.md §4):
  * versions ("138.0.2") and dates are NOT quantities — excluded to keep
    precision; a version attributed without a link is a documented blind
    spot, extendable later with the same structure;
  * bare counts without a unit or percent sign ("According to Google, 50
    developers ...") do NOT match — only unit-attached quantities and
    percentages count as "رقم أو نسبة" here;
  * blockquote sentences that carry a source link are excused (the same
    documented exception as fabrication.py).

Scan only — nothing here rewrites text. body_neutralization_gate() consumes
these scanners so a neutralized body cannot INTRODUCE new hits of either
family (subset semantics, identical to the S1/S2/S3 check).

Public API:
    scan_attribution_numbers(body: str) -> list[dict]
    scan_unattributed_table_cells(body: str) -> list[dict]
    unattributed_gate(body: str) -> dict
    ATTRIBUTION_ENTITIES / MEASURE_UNITS / MEASURE_HEADER_RE (introspectable)
"""
import re
from typing import Dict, List

# ── entity list for "According to <entity>" ─────────────────────────────
# Curated vendor/organization names seen in extension-copy claims; the
# pattern is intentionally an explicit list so provenance is auditable.
# Add names here — never widen to a generic capitalized-word match.
ATTRIBUTION_ENTITIES: List[str] = [
    "Google", "Mozilla", "Chrome", "Chromium", "Firefox", "Microsoft",
    "Apple", "Safari", "Opera", "Brave", "Vivaldi", "Samsung", "Edge",
    "Avast", "AVG", "Norton", "McAfee", "Kaspersky", "Bitdefender",
    "Malwarebytes", "Ghostery", "AdBlock", "Adblock Plus", "uBlock",
    "ExpressVPN", "NordVPN", "Surfshark", "Comodo", "Symantec",
    "Trend Micro", "ESET", "Webroot", "Check Point", "Cloudflare",
]
_ACCORDING_TO = re.compile(
    r"\baccording\s+to\s+(?:the\s+)?(?:official\s+)?(?:"
    + "|".join(re.escape(e) for e in ATTRIBUTION_ENTITIES) + r")\b",
    re.I)
# Quantities: percentage, unit-attached number, "N times"/"Nx".
_QTY = re.compile(
    r"\b\d[\d,]*(?:\.\d+)?\s?(?:%|percent\b|MB|GB|KB|ms|milliseconds?|"
    r"seconds?|s\b|minutes?|hours?|days?|fps|x\b|times\b|points?\b)",
    re.I)
# Version-like tokens are NOT quantities (declared exclusion).
_VERSION = re.compile(r"\b\d+(?:\.\d+)+\b")
_LINK = re.compile(r"\]\((?:https?:)?/[^)]*\)|https?://[^\s)>\"']+")
SENT_SPLIT = re.compile(r"(?<=[.!?])\s+(?=[A-Z0-9\"'*\[])")

# ── measurement tables ───────────────────────────────────────────────────
# A table cell counts as a measurement value only under a column whose
# HEADER (first row) indicates a measured dimension (owner's list).
MEASURE_HEADER_RE = re.compile(
    r"memory|speed|effectiveness|savings|block|battery|ram|cpu", re.I)
# Number+unit inside a cell (MB, GB, KB, ms, seconds, s, %, fps, x).
_CELL_QTY = re.compile(
    r"\d[\d,]*(?:\.\d+)?\s?(?:%|MB|GB|KB|ms|s\b|fps|x\b|"
    r"seconds?|minutes?|hours?)", re.I)
# Numeric range inside a cell: "30-40", "60–80%", "15 to 25", "2.5-3 GB".
_CELL_RANGE = re.compile(
    r"\d[\d,]*(?:\.\d+)?\s?[A-Za-z%]{0,4}\s?(?:[-–—]|to)\s*\d[\d,]*"
    r"(?:\.\d+)?\s?[A-Za-z%]{0,4}", re.I)
_ROW_SPLIT = re.compile(r"\s*\|\s*")
_BQ_LINK_EXCUSE = re.compile(r"^\s*>")


def _has_link(text: str) -> bool:
    return bool(_LINK.search(text))


def _is_version_only(sentence: str) -> bool:
    """Every numeric token in the sentence is dotted version-like."""
    nums = re.findall(r"\b\d[\d,]*(?:\.\d+)*\b", sentence)
    return bool(nums) and all("." in n for n in nums)


def scan_attribution_numbers(body: str) -> List[Dict[str, str]]:
    """Sentences attributing a quantity to a named entity without a
    same-sentence source link. Pure regex — no model calls."""
    hits: List[Dict[str, str]] = []
    for line in body.splitlines():
        if line.lstrip().startswith(("#", "|", "```")) or len(line) > 600:
            continue
        if _BQ_LINK_EXCUSE.match(line) and _has_link(line):
            continue  # cited quotation exception (same as fabrication.py)
        for sent in SENT_SPLIT.split(line):
            am = _ACCORDING_TO.search(sent)
            if not am:
                continue
            if _has_link(sent):
                continue  # source link in the same sentence → attributed
            if _is_version_only(sent):
                continue  # declared exclusion: versions/dates only
            if not _QTY.search(sent):
                continue  # no quantity → nothing to attribute
            hits.append({
                "entity": re.sub(r"^according\s+to\s+(?:the\s+)?"
                                 r"(?:official\s+)?", "", am.group(0),
                                 flags=re.I),
                "quantity": _QTY.search(sent).group(0).strip(),
                "sentence": re.sub(r"\s+", " ", sent).strip()[:240],
            })
    return hits


def _table_rows(line: str) -> List[str]:
    s = line.strip()
    if s.startswith("|"):
        s = s[1:]
    if s.endswith("|"):
        s = s[:-1]
    return _ROW_SPLIT.split(s)


def scan_unattributed_table_cells(body: str) -> List[Dict[str, str]]:
    """Cells with unit-attached numbers or numeric ranges under
    measurement-indicating column headers. Pure regex — no model calls."""
    hits: List[Dict[str, str]] = []
    lines = body.splitlines()
    i = 0
    while i < len(lines):
        line = lines[i]
        if not line.lstrip().startswith("|") or i + 1 >= len(lines) \
                or not re.match(r"^\s*\|[-| :]+\|\s*$", lines[i + 1]):
            i += 1
            continue
        headers = _table_rows(line)
        j = i + 2
        while j < len(lines) and lines[j].lstrip().startswith("|"):
            cells = _table_rows(lines[j])
            if len(cells) == len(headers):
                for col in range(1, len(cells)):
                    if not MEASURE_HEADER_RE.search(headers[col]):
                        continue
                    cell = cells[col].strip().replace("**", "")
                    if _CELL_QTY.search(cell) or _CELL_RANGE.search(cell):
                        hits.append({
                            "header": headers[col].strip(),
                            "row_label": cells[0].strip(),
                            "cell": cell[:60],
                            "line": re.sub(r"\s+", " ", lines[j]).strip()[:200],
                        })
            j += 1
        i = j
    return hits


def unattributed_gate(body: str) -> Dict:
    """Evaluate both unattributed-claim families on one body.

    Returns {pass, attribution_numbers, unattributed_table_cells} — pass is
    False when either list is non-empty."""
    att = scan_attribution_numbers(body)
    tbl = scan_unattributed_table_cells(body)
    return {
        "pass": not att and not tbl,
        "attribution_numbers": att,
        "unattributed_table_cells": tbl,
    }


def _hitset(body: str):
    """Set-semantics signature used by body_neutralization_gate."""
    out = set()
    for h in scan_attribution_numbers(body):
        out.add(("attribution_number", h["sentence"][:80]))
    for h in scan_unattributed_table_cells(body):
        out.add(("table_cell", h["line"][:80]))
    return out


def new_unattributed_hits(before_body: str, after_body: str):
    """Hits present in AFTER but not in BEFORE (subset semantics)."""
    return _hitset(after_body) - _hitset(before_body)
