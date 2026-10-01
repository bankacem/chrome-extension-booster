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


def unsupported_claims(body: str) -> list[str]:
    """Return the sentences counted as unsupported factual claims."""
    plain = re.sub(r"```[\s\S]*?```", " ", body)      # code blocks are not prose
    out = []
    for raw in SENT_SPLIT_RE.split(plain):
        s = raw.strip()
        if len(s) < 25 or len(s) > 600:
            continue
        factual = bool(FACT_RE.search(s)) or bool(SUPERLATIVE_RE.search(s))
        if not factual:
            continue
        if LINK_RE.search(s):
            continue
        if HEDGE_RE.search(s):
            continue
        out.append(s[:220])
    return out
