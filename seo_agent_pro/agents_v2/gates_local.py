"""agents_v2.gates_local — deterministic gates, FINAL judge for agents_v2.

READ-ONLY COPY of seo_agent_pro/gates.py from PR #450 branch
(feat/old-line-hardening @ 671708235d), made per the owner's explicit
authorization ("انسخ منطقها من فرع #450 قراءةً فقط داخل agents_v2، ولا تدمج #450").
Nothing here is imported by any production path; PR #450 itself remains unmerged.
"""
import os
import re

WORD_MIN = int(os.environ.get("SEO_WORD_MIN", "2550"))
WORD_MAX = int(os.environ.get("SEO_WORD_MAX", "3100"))
FAQ_MIN_QUESTIONS = int(os.environ.get("SEO_FAQ_MIN", "8"))

WORD_RE = re.compile(r"[A-Za-z0-9'’-]+")


def wc(text: str) -> int:
    """Site-consistent word counter (same tokenizer as bench-001 metrics)."""
    return len(WORD_RE.findall(text))


def run_gates(body: str, meta: str, wmin: int | None = None,
              wmax: int | None = None) -> dict:
    """Evaluate ALL deterministic gates. Returns
    {pass, failed[], checks{}, words, h2, faq_h3, verdict_chars}."""
    wmin = WORD_MIN if wmin is None else wmin
    wmax = WORD_MAX if wmax is None else wmax

    words = wc(body)
    h2 = len(re.findall(r"^## ", body, re.M))
    toc = bool(re.search(r"^## Table of Contents", body, re.M))
    faq_idx = body.find("## Frequently Asked Questions")
    faq_h3 = len(re.findall(r"^### ", body[faq_idx:], re.M)) if faq_idx >= 0 else 0
    v_idx = body.rfind("## Final Verdict")
    verdict_chars = len(re.sub(r"[#!\s]", "", body[v_idx:])) if v_idx > 0 else 0
    table = bool(re.search(r"^\|.+\|\n\|[-| :]+\|", body, re.M))
    nested = bool(re.search(r"\[[^\]]*\[", body))
    head_link = bool(re.search(r"^#{1,6}\s.*\]\(", body, re.M))
    mid_tok = bool(re.search(r"\]\([^)]+\)[A-Za-z0-9]", body, re.M))
    brackets = body.count("[") == body.count("]")
    meta_ok = (bool(meta) and 120 <= len(meta) <= 160
               and '"' not in meta and "\\" not in meta)

    checks = {
        "word_count": wmin <= words <= wmax,
        "h2_sections": h2 >= 6,
        "toc": toc,
        "faq8": faq_h3 >= FAQ_MIN_QUESTIONS,
        "final_verdict": v_idx > 0 and verdict_chars > 120,
        "comparison_table": table,
        "meta_window": meta_ok,
        "no_nested_links": not nested,
        "no_heading_links": not head_link,
        "no_split_words": not mid_tok,
        "brackets_balanced": brackets,
    }
    failed = [k for k, v in checks.items() if not v]
    return {"pass": not failed, "failed": failed, "checks": checks,
            "words": words, "h2": h2, "faq_h3": faq_h3,
            "verdict_chars": verdict_chars}


# ──────────────────────────────────────────────────────────────
#  Deterministic repairs (free — no LLM call)
# ──────────────────────────────────────────────────────────────

_LINK_RE = re.compile(r"\[([^\]]*)\]\(([^)]*)\)")


def _strip_links(line: str) -> str:
    return _LINK_RE.sub(r"\1", line)


def repair_damage(body: str) -> str:
    """Deterministic markdown-damage fixes. Returns the repaired body.

    Order matters and each pass is idempotent:
      1. links inside headings  → keep the anchor text, drop the link
      2. links splitting a word ([par](url)tial → partial)
      3. nested links → unwrap the INNERMOST link, keep its text
      4. empty bracket pairs → drop
    Anything still unbalanced afterwards is left for the targeted
    regeneration call (bracket surgery on real prose is not safe in code).
    """
    # 1. heading links
    lines = body.split("\n")
    for i, ln in enumerate(lines):
        if re.match(r"^#{1,6}\s", ln) and "](" in ln:
            lines[i] = _strip_links(ln)
    body = "\n".join(lines)

    # 2. split words: a link immediately followed by a letter/digit
    body = _LINK_RE.sub(lambda m: m.group(1) if re.match(r"[A-Za-z0-9]", m.string[m.end():m.end() + 1] or " ") else m.group(0), body)

    # 3. nested links: unwrap innermost until none remain
    prev = None
    while prev != body and re.search(r"\[[^\]]*\[", body):
        prev = body
        body = re.sub(r"\[([^\]\[]*)\]\([^)]*\)", r"\1", body, count=1)

    # 4. empty pairs
    body = body.replace("[]", "")

    return body


def rebuild_toc(body: str) -> str:
    """Deterministically rebuild the ToC from the ACTUAL H2 headings and
    insert it right before the first section (house style: after opening)."""
    h2s = [h.strip() for h in re.findall(r"^## (.+)$", body, re.M)
           if h.strip().lower() != "table of contents"]
    items = []
    for h in h2s:
        anchor = re.sub(r"[^a-z0-9\s-]", "", h.lower()).strip().replace(" ", "-")
        items.append(f"- [{h}](#{anchor})")
    toc = "## Table of Contents\n\n" + "\n".join(items) + "\n\n"

    # remove any existing ToC section
    body = re.sub(r"^## Table of Contents\n[\s\S]*?(?=\n## )", "", body,
                  count=1, flags=re.M)
    m = re.search(r"^## ", body, flags=re.M)
    if m:
        return body[:m.start()] + toc + body[m.start():]
    return body + "\n\n" + toc
