"""agents_v2.eval.claims — independent, simple unsupported-claims checker.

Owner spec (Step 5): "عدد الادعاءات غير المدعومة بمصدر (فاحص مستقل بسيط)".
Deterministic, model-free, applied IDENTICALLY to both arms:

  A sentence is counted as an unsupported claim when it
    1. states a factual pattern — a number with %, $, x-speed, benchmark
       units, a year-specific ranking, or a strong superlative — AND
    2. contains no markdown link / citation in the same sentence, AND
    3. carries no first-hand-testing hedge ("in our testing", "we tested",
       "in my tests", "when we benchmarked").
"""
from __future__ import annotations

import re

FACT_RE = re.compile(
    r"\d+(?:\.\d+)?\s?%|\$\s?\d|\b\d+(?:\.\d+)?\s?(?:x|×)\s?(?:faster|slower|more|less)"
    r"|\b\d+\s?(?:mb|gb|ms|seconds?|minutes?)\b"
    r"|\b(?:202[4-9])\b[^.]*\b(?:ranked|rated|top|best)\b",
    re.I,
)
SUPERLATIVE_RE = re.compile(
    r"\b(?:the\s+)?(?:best|fastest|most\s+(?:secure|reliable|powerful|accurate|"
    r"lightweight)|#1|number\s+one|leading)\b",
    re.I,
)
LINK_RE = re.compile(r"\[[^\]]+\]\([^)]+\)")
HEDGE_RE = re.compile(
    r"\b(?:in our testing|we tested|in my tests|when we benchmarked|"
    r"we measured|hands-on)\b",
    re.I,
)
SENT_SPLIT_RE = re.compile(r"(?<=[.!?])\s+(?=[A-Z0-9])")


def _claim_sentences(body: str):
    plain = re.sub(r"```[\s\S]*?```", " ", body)      # code blocks are not prose
    for raw in SENT_SPLIT_RE.split(plain):
        s = raw.strip()
        if len(s) < 25 or len(s) > 600:
            continue
        numeric = FACT_RE.findall(s)
        superlative = SUPERLATIVE_RE.findall(s)
        if not numeric and not superlative:
            continue
        yield s, numeric, superlative


def claim_audit(body: str, reference: str = "") -> dict:
    """Owner decision 4 (2026-10-02): per-arm counters for the full run.

    For EVERY factual-pattern sentence (numeric or ranking/superlative):
      sourced      — the sentence carries a markdown link, or a first-hand
                     testing hedge, or one of its factual tokens (the exact
                     number/figure/superlative matched by the regexes) also
                     appears in `reference` (the harness's own SERP rows for
                     the same topic — identical corpus for BOTH arms);
      unsupported  — none of the above.
    Deterministic and model-free; applied identically to both arms.

    NOTE: "political" claims cannot occur in this domain; the year+ranking
    pattern inside FACT_RE (e.g. "ranked #1 in 2026") is the closest proxy
    and is reported separately as ranking_or_superlative_claims. Disclosed
    in the eval report.
    """
    ref = reference or ""
    claims = []
    for s, numeric, superlative in _claim_sentences(body):
        linked = bool(LINK_RE.search(s))
        hedged = bool(HEDGE_RE.search(s))
        tokens = {t.strip().lower() for t in numeric + superlative if t.strip()}
        in_ref = any(t in ref.lower() for t in tokens)
        sourced = linked or hedged or in_ref
        claims.append({
            "text": s[:220],
            "numeric": bool(numeric),
            "ranking_or_superlative": bool(superlative),
            "factual_tokens": sorted(tokens)[:6],
            "has_link": linked,
            "hedged_first_hand": hedged,
            "token_in_reference": in_ref,
            "unsupported": not sourced,
        })
    unsupported_list = [c["text"] for c in claims if c["unsupported"]]
    return {
        "total_claims": len(claims),
        "numeric_claims": sum(1 for c in claims if c["numeric"]),
        "ranking_or_superlative_claims": sum(
            1 for c in claims if c["ranking_or_superlative"]),
        "sourced": sum(1 for c in claims if not c["unsupported"]),
        "unsupported": len(unsupported_list),
        "unsupported_list": unsupported_list,
        "claims": claims,
        "reference_chars": len(ref),
        "basis": ("sourced = link in sentence OR first-hand hedge OR factual "
                  "token present in the harness's SERP reference rows"),
    }


def unsupported_claims(body: str) -> list[str]:
    """Return the sentences counted as unsupported factual claims.

    Same definition as before claim_audit existed (link/hedge only, no
    SERP reference) — this is the number that feeds the FIXED decision
    rule, kept byte-compatible so the rule is applied without modification
    (owner instruction: طبّق قاعدة القرار المكتوبة سابقاً بلا تعديل).
    """
    out = []
    for s, _n, _s2 in _claim_sentences(body):
        if LINK_RE.search(s) or HEDGE_RE.search(s):
            continue
        out.append(s[:220])
    return out
