"""Body neutralization gate — deterministic before/after diff guard.

Owner brief 2026-10-05 (item 2): when a body is neutralized (test narrative
removed or generalized), the gate compares the BEFORE and AFTER bodies and
FAILS if any of the following happens:

  1. a number / percentage / version appears that is not in the original;
  2. a new proper noun (mid-sentence capitalized word) appears that is not
     in the ORIGINAL PARAGRAPH it replaces;
  3. a new link appears;
  4. any heading, image, table row, or FAQ question changed
     (headings may change ONLY through explicit allowed renames — e.g. the
     owner-approved "How We Tested" -> "About this guide" conversion);
  5. any paragraph that is NOT marked as editable changed;
  6. the body lost more than `word_drop_limit_pct` percent of its words;
  7. the fabrication gates (S1/S2/S3) gain NEW hits on the result
     (hits(after) must stay within hits(before) — pre-existing hits on
     lines the editor cannot touch, like FAQ question headings, are
     reported in stats but do not fail the gate).

Pure code — no model calls. The gate only sees BODY text (frontmatter is
stripped by the caller).
"""
from collections import Counter
from difflib import SequenceMatcher
import re
from typing import Collection, Dict, List, Sequence, Tuple

# ── extraction helpers ────────────────────────────────────────────────────

_NUM_RE = re.compile(r"\d[\d,]*(?:\.\d+)*")
_PCT_RE = re.compile(r"\d[\d,]*(?:\.\d+)*\s?%")
_WORD_RE = re.compile(r"[A-Za-z0-9']+")
_LINK_RE = re.compile(r"\]\(([^)\s]+)\)|https?://[^\s)>\"']+|<img[^>]+src=[\"']([^\"']+)")
_IMG_RE = re.compile(r"!\[[^\]]*\]\([^)]*\)|<img[^>]*>", re.I)
_HEADING_RE = re.compile(r"^#{1,6}\s")
_FAQ_SECTION_RE = re.compile(r"faq|frequently\s+asked", re.I)
_FAQ_QUESTION_RE = re.compile(r"^\s*(?:[-*]\s*)?\**question\**\s*:", re.I)
# Proper-noun candidate: a MID-SENTENCE internal-capital token (ExtensionTo,
# Sarah, YouTube) — NOT an all-caps acronym (RAM, PC, API) and never "I".
# Deterministic interpretation of "new capitalized words": in English every
# sentence starts with a capital, so sentence-initial tokens are ordinary
# prose and are skipped; a fabricated entity is still caught whenever it
# recurs mid-sentence (surnames, second mentions, "X Labs" patterns).
_CAMEL_RE = re.compile(r"\b[A-Z][a-z0-9''&.\-]*[A-Z][a-z0-9]*\b")
_TITLE_RE = re.compile(r"\b[A-Z][a-z][a-z0-9''&.\-]*")
_SENTENCE_BOUNDARY = re.compile(r"[.!?]\s*$")
_TOKEN_SPLIT = re.compile(r"(\s+)")
_TOKEN_TRIM = ".,;:!?()[]{}\"'`*"
# Replacement-list bullet: "- **Name** sentence" (owner brief 2026-10-07:
# NIT-heavy tables may become a short bold-name + body-sentence list).
_BULLET_RE = re.compile(r"^\s*[-*]\s+\*\*(.+?)\*\*\s*(.*)$", re.S)
_LINKMD_RE = re.compile(r"\[([^\]]+)\]\([^)]*\)")


def _blocks(body: str) -> List[str]:
    """Markdown blocks: runs of consecutive non-empty lines."""
    out: List[str] = []
    cur: List[str] = []
    for line in body.splitlines():
        if line.strip():
            cur.append(line)
        elif cur:
            out.append("\n".join(cur))
            cur = []
    if cur:
        out.append("\n".join(cur))
    return out


def _numbers(text: str) -> Counter:
    toks = [t.replace(",", "") for t in _NUM_RE.findall(text)]
    return Counter(toks)


def _versions(text: str) -> Counter:
    return Counter(t for t in _NUM_RE.findall(text) if "." in t)


def _percents(text: str) -> Counter:
    return Counter(t.replace(",", "").replace(" ", "") for t in _PCT_RE.findall(text))


def _proper_nouns(block: str) -> Counter:
    """Mid-sentence internal-capital tokens of ONE block (paragraph)."""
    found: List[str] = []
    lines = block.splitlines()
    for li, line in enumerate(lines):
        if _HEADING_RE.match(line) or line.lstrip().startswith("|"):
            continue
        pos = 0
        for raw in _TOKEN_SPLIT.split(line):
            pos += len(raw)
            if not raw or raw.isspace():
                continue
            prefix = line[: pos - len(raw)]
            # strip markdown emphasis/quote chars before testing the boundary
            # so "...price.** Running" still reads as a sentence start
            prefix_clean = prefix.rstrip("*_~`#> ")
            line_initial = prefix.strip() == ""
            sentence_initial = line_initial or bool(
                _SENTENCE_BOUNDARY.search(prefix_clean))
            core = raw.strip(_TOKEN_TRIM)
            if sentence_initial or not core or core == "I":
                continue
            # possessives: "uBlock Origin's" counts as "uBlock Origin"
            core = re.sub(r"['\u2019]s$", "", core, flags=re.I)
            if not core:
                continue
            if _CAMEL_RE.fullmatch(core) or _TITLE_RE.fullmatch(core):
                found.append(core)
    return Counter(found)


def _links(text: str) -> Counter:
    return Counter(m.group(1) or m.group(2) or m.group(0)
                   for m in _LINK_RE.finditer(text))


def _heading_lines(body: str) -> List[str]:
    return [l for l in body.splitlines() if _HEADING_RE.match(l)]


def _faq_questions(body: str) -> List[str]:
    """Question lines inside body FAQ sections (frontmatter FAQ is out of
    scope — the gate only sees body text)."""
    lines_out: List[str] = []
    in_faq = False
    for line in body.splitlines():
        if _HEADING_RE.match(line):
            in_faq = bool(_FAQ_SECTION_RE.search(line))
            continue
        if in_faq:
            s = line.strip()
            if _FAQ_QUESTION_RE.match(line) or re.match(r"^\*\*.+\*\*:?$", s):
                lines_out.append(s)
    return lines_out


# ── marked-table comparison (owner brief 2026-10-06 item 2) ──────────────

def _line_block_indices(body: str) -> List[int]:
    """Block index for every line (empty lines -> -1), mirroring _blocks."""
    out: List[int] = []
    idx = -1
    seen_any = False
    for line in body.splitlines():
        if line.strip():
            if not seen_any:
                idx += 1
                seen_any = True
            out.append(idx)
        else:
            seen_any = False
            out.append(-1)
    return out


def _tables(body: str) -> List[Tuple[int, List[str]]]:
    """(block_index, [header, separator, *data rows]) per contiguous table."""
    out: List[Tuple[int, List[str]]] = []
    lines = body.splitlines()
    lb = _line_block_indices(body)
    i = 0
    while i < len(lines):
        if lines[i].lstrip().startswith("|") and i + 1 < len(lines) \
                and re.match(r"^\s*\|[-| :]+\|\s*$", lines[i + 1]):
            blk = lb[i]
            j = i + 2
            while j < len(lines) and lines[j].lstrip().startswith("|") \
                    and lb[j] == blk:
                j += 1
            out.append((blk, lines[i:j]))
            i = j
        else:
            i += 1
    return out


def _split_row(line: str) -> List[str]:
    s = line.strip()
    if s.startswith("|"):
        s = s[1:]
    if s.endswith("|"):
        s = s[:-1]
    return [c.strip() for c in s.split("|")]


def _standalone_pipe_lines(body: str) -> List[str]:
    """Pipe-starting lines NOT part of a detected (headered) table — e.g.
    a lone pipe line or a header without a separator row. These must never
    change, with or without the marked-table license."""
    detected: set = set()
    for _, rows in _tables(body):
        detected.update(rows)
    return [l for l in body.splitlines()
            if l.lstrip().startswith("|") and l not in detected]


def _cell_edit_violations(
    k: int,
    b_blk: int,
    b_rows: List[str],
    a_rows: List[str],
    allow_cells: set,
) -> List[Dict[str, str]]:
    """Old narrow-license per-row checks for ONE marked table pair."""
    out: List[Dict[str, str]] = []
    if len(b_rows) != len(a_rows):
        out.append({
            "check": "table_row_changed",
            "detail": f"marked table #{k} row count changed "
                      f"({len(b_rows)} -> {len(a_rows)})",
        })
        return out
    if b_rows[0] != a_rows[0] or b_rows[1] != a_rows[1]:
        out.append({
            "check": "table_row_changed",
            "detail": f"marked table #{k} header/separator row changed",
        })
        return out
    for bi, (brow, arow) in enumerate(zip(b_rows[2:], a_rows[2:])):
        bc, ac = _split_row(brow), _split_row(arow)
        if len(bc) != len(ac) or brow.count("|") != arow.count("|"):
            out.append({
                "check": "table_row_changed",
                "detail": f"marked table #{k} data row {bi + 1}: "
                          f"column count changed",
            })
            break
        if bc[0] != ac[0]:
            out.append({
                "check": "table_row_changed",
                "detail": f"marked table #{k} data row {bi + 1}: "
                          f"first column changed: {bc[0][:40]!r}",
            })
            break
        bad = [c for b_cell, c in zip(bc[1:], ac[1:])
               if b_cell != c and c.replace("**", "").strip()
               not in allow_cells]
        if bad:
            out.append({
                "check": "table_row_changed",
                "detail": f"marked table #{k} data row {bi + 1}: cell(s) "
                          f"{[b[:30] for b in bad[:3]]} not in accepted strings",
            })
            break
    return out


def _norm_label(s: str) -> str:
    """Normalize a product label: strip markdown links to their text."""
    return _LINKMD_RE.sub(r"\1", s).strip()


def _verify_table_replacement(
    before_body: str,
    b_rows: List[str],
    bullets: List[str],
    violations: List[Dict[str, str]],
    label: str,
) -> None:
    """Verify a declared table -> short-list replacement (owner brief
    2026-10-07). Every bullet must be '**Name** sentence' where Name is a
    byte-identical product label OF THE REPLACED TABLE (a first-column data
    cell, or a header product column for column-mode tables) and the sentence
    is a verbatim substring of the ORIGINAL body — no new facts. The list
    must cover every product of the table exactly once (row mode: first
    column; column mode: header product cells)."""
    header = _split_row(b_rows[0])
    data = [_split_row(r) for r in b_rows[2:]]
    first_col = [r[0] for r in data if r and r[0]]
    col_names = [c for c in header[1:] if c]
    allowed_first = set(_norm_label(c) for c in first_col)
    allowed_header = set(_norm_label(c) for c in col_names)
    names: List[str] = []
    for bl in bullets:
        m = _BULLET_RE.match(bl)
        if not m:
            violations.append({
                "check": "table_replacement_invalid",
                "detail": f"{label}: bullet is not '**Name** sentence' format: "
                          f"{bl[:60]!r}",
            })
            continue
        name_raw, rest = m.group(1).strip(), m.group(2).strip()
        name_norm = _norm_label(name_raw)
        if name_norm not in allowed_first and name_norm not in allowed_header:
            violations.append({
                "check": "table_replacement_invalid",
                "detail": f"{label}: bold name {name_norm[:40]!r} is not a "
                          f"product label of the replaced table",
            })
        if rest[:1] in ("—", "-"):
            rest = rest.lstrip("—- ").strip()
        if not rest:
            violations.append({
                "check": "table_replacement_invalid",
                "detail": f"{label}: bullet has no sentence after the bold name",
            })
        elif (name_norm + " " + rest) not in before_body \
                and rest not in before_body:
            violations.append({
                "check": "table_replacement_invalid",
                "detail": f"{label}: sentence {rest[:70]!r} is not a verbatim "
                          f"part of the original body (no new facts allowed)",
            })
        names.append(name_norm)
    if not names:
        return
    if set(names) <= allowed_first and first_col:
        if len(names) != len(first_col) or len(set(names)) != len(first_col):
            violations.append({
                "check": "table_replacement_invalid",
                "detail": f"{label}: row-mode list covers "
                          f"{len(set(names))} of {len(first_col)} products",
            })
    elif set(names) <= allowed_header and col_names:
        if len(names) != len(col_names) or len(set(names)) != len(col_names):
            violations.append({
                "check": "table_replacement_invalid",
                "detail": f"{label}: column-mode list covers "
                          f"{len(set(names))} of {len(col_names)} products",
            })
    else:
        violations.append({
            "check": "table_replacement_invalid",
            "detail": f"{label}: bullet names mix row/column labels or match "
                      f"neither the first column nor the header products",
        })


def _compare_tables(
    before_body: str,
    after_body: str,
    marked_set: set,
    allow_marked_table_edits: bool,
    allow_cells: set,
    replacement_blocks: frozenset = frozenset(),
) -> List[Dict[str, str]]:
    """Structural table check with optional narrow licenses.

    Default semantics unchanged: the before/after table-line sequences must
    be equal. With allow_marked_table_edits=True, a table whose block is
    marked may swap DATA-cell text for accepted strings — header/separator
    byte-identical, row/column count and order fixed, first column
    byte-identical, every other changed cell's new text in allow_cells.
    A table whose block is in replacement_blocks (owner-brief 2026-10-07
    list replacement, verified separately) may be absent from the result.
    """
    tb, ta = _tables(before_body), _tables(after_body)
    # standalone pipe lines (not part of a detected table) must never change
    standalone_b = _standalone_pipe_lines(before_body)
    standalone_a = _standalone_pipe_lines(after_body)
    if standalone_b != standalone_a:
        diff = next(((x, y) for x, y in zip(standalone_b, standalone_a)
                     if x != y), (standalone_b[0] if standalone_b else "",
                                  "<missing>"))
        return [{
            "check": "table_row_changed",
            "detail": f"pipe line outside a recognized table changed: {diff[0][:60]!r}",
        }]
    if [rows for _, rows in tb] == [rows for _, rows in ta]:
        return []
    violations: List[Dict[str, str]] = []
    # pool accounting: unchanged tables match by full row sequence; marked
    # cell-edits match by (header, separator); declared replacements vanish.
    ta_by_rows: Dict[tuple, List[int]] = {}
    ta_by_head: Dict[tuple, List[int]] = {}
    for j, (_, a_rows) in enumerate(ta):
        ta_by_rows.setdefault(tuple(a_rows), []).append(j)
        if len(a_rows) >= 2:
            ta_by_head.setdefault((a_rows[0], a_rows[1]), []).append(j)
    for k, (b_blk, b_rows) in enumerate(tb):
        key = tuple(b_rows)
        if ta_by_rows.get(key):
            j = ta_by_rows[key].pop(0)
            if len(a_rows_list := ta[j][1]) >= 2:
                head_key = (a_rows_list[0], a_rows_list[1])
                if j in ta_by_head.get(head_key, []):
                    ta_by_head[head_key].remove(j)
            continue
        if b_blk in replacement_blocks:
            continue
        head_key = (b_rows[0], b_rows[1]) if len(b_rows) >= 2 else None
        cand = ta_by_head.get(head_key, []) if head_key else []
        if allow_marked_table_edits and b_blk in marked_set and not cand:
            # header may itself have changed: fall back to the remaining
            # after-table with the same row count (nearest to the old
            # index-zip pairing) so the per-row checks report precisely
            remaining = sorted(j for idxs in ta_by_rows.values() for j in idxs)
            same_len = [j for j in remaining
                        if len(ta[j][1]) == len(b_rows)]
            if same_len:
                cand = [same_len[0]]
        if allow_marked_table_edits and b_blk in marked_set and cand:
            j = cand.pop(0)
            ta_by_rows[tuple(ta[j][1])].remove(j)
            violations.extend(_cell_edit_violations(
                k, b_blk, b_rows, ta[j][1], allow_cells))
            continue
        diff = next(((x, y) for x, y in zip(b_rows, (ta[cand[0]][1] if cand
                                                     else b_rows)) if x != y),
                    (b_rows[0] if b_rows else "", "<missing>"))
        violations.append({
            "check": "table_row_changed",
            "detail": f"table #{k} (block {b_blk}, marked={b_blk in marked_set}) "
                      f"rows differ or were removed without a declared "
                      f"replacement; first change: {diff[0][:60]!r}",
        })
    leftover = [j for pool in ta_by_rows.values() for j in pool]
    if leftover:
        violations.append({
            "check": "table_row_changed",
            "detail": f"{len(leftover)} table(s) in the result do not exist in "
                      f"the original (new/edited tables are forbidden)",
        })
    return violations


# ── the gate ──────────────────────────────────────────────────────────────

def body_neutralization_gate(
    before_body: str,
    after_body: str,
    marked: Collection[int],
    *,
    allowed_heading_renames: Collection[Tuple[str, str]] = (),
    allow_proper_nouns: Collection[str] = (),
    allowed_new_paragraphs: int = None,
    allowed_new_paragraph_texts: Collection[str] = (),
    allow_marked_table_edits: bool = False,
    allowed_table_cell_values: Collection[str] = ("Not independently tested",),
    allowed_table_replacements: Collection[Dict] = (),
    word_drop_limit_pct: float = 45.0,
) -> Dict:
    """Compare a neutralized body against its original.

    marked = indices of BEFORE paragraphs (see _blocks) the editor was
    allowed to rewrite or delete. Every other paragraph must survive
    byte-identical. allowed_heading_renames = exact heading-block pairs
    (old, new) the owner explicitly permitted.

    allowed_new_paragraphs = OPTIONAL cap on after-paragraphs that are not
    byte-equal to any before paragraph (None = disabled — the owner's seven
    conditions do not include a paragraph-count limit; the cap exists for
    callers that want to bound additions, e.g. only the disclosure block).

    allowed_new_paragraph_texts = exact-match whitelist (whole block, after
    strip) for inserted paragraphs — e.g. the table-figure disclaimer line.
    Whitelisted inserts are skipped by the proper-noun scan and excluded
    from the allowed_new_paragraphs count.

    allow_marked_table_edits + allowed_table_cell_values (owner brief
    2026-10-06 item 2, implementing the design in docs/tables-plan.md):
    when True, a table whose containing block is marked may have its DATA
    CELLS rewritten, but ONLY under ALL of these conditions:
      * header row (line 1) and separator row (line 2) byte-identical;
      * row count, column count and row ORDER unchanged;
      * first-column cells (feature/product labels) byte-identical;
      * every changed cell's new text (stripped, emphasis removed) is in
        allowed_table_cell_values (default: {"Not independently tested"})
        — the owner's “accepted strings only” rule;
    Tables whose block is NOT marked stay forbidden entirely, flag or not.

    allowed_table_replacements (owner brief 2026-10-07): a MARKED table
    whose data cells are >50% "Not independently tested" may be replaced by
    a SHORT LIST — each bullet "**Product** sentence", the bold name taken
    byte-identically from the replaced table (first column, or header
    product columns for column-mode tables) and the sentence a verbatim
    substring of the original body (no new facts). The license is an exact
    declaration: [{"block": <before block index>, "bullets": [lines]}].
    The gate re-verifies every declaration (name ∈ table labels, sentence
    ∈ original body, full product coverage) and that the result contains
    the declared list block byte-identically and nothing else in its place.
    """
    violations: List[Dict[str, str]] = []
    ab, abx = _blocks(before_body), _blocks(after_body)
    marked_set = set(int(i) for i in marked)
    allow_pn = set(allow_proper_nouns)
    allow_renames = list(allowed_heading_renames)
    allow_para_texts = set(t.strip() for t in allowed_new_paragraph_texts)
    allow_cells = set(v.strip() for v in allowed_table_cell_values)
    # declared table -> short-list replacements (owner brief 2026-10-07)
    tb_all = _tables(before_body)
    tb_by_block = {}
    for blk, rows in tb_all:
        tb_by_block.setdefault(blk, rows)
    repl_specs: List[Tuple[int, List[str]]] = []
    repl_blocks: set = set()
    for spec in (allowed_table_replacements or ()):
        b = int(spec["block"])
        bullets = [l for l in spec["bullets"]]
        if b not in marked_set:
            violations.append({
                "check": "table_replacement_invalid",
                "detail": f"declared replacement block {b} is not marked",
            })
        if b in repl_blocks:
            violations.append({
                "check": "table_replacement_invalid",
                "detail": f"duplicate replacement declaration for block {b}",
            })
            continue
        repl_blocks.add(b)
        repl_specs.append((b, bullets))
        rows = tb_by_block.get(b)
        if rows is None:
            violations.append({
                "check": "table_replacement_invalid",
                "detail": f"declared replacement block {b} contains no table "
                          f"in the original",
            })
        else:
            # the marked block must be EXACTLY the table lines (a replacement
            # silently drops everything else in the block)
            if b < len(ab) and "\n".join(rows) != ab[b]:
                violations.append({
                    "check": "table_replacement_invalid",
                    "detail": f"declared replacement block {b} contains "
                              f"non-table lines besides the table",
                })
            _verify_table_replacement(
                before_body, rows, bullets, violations, f"table (block {b})")
        want = "\n".join(bullets)
        if want not in abx:
            violations.append({
                "check": "table_replacement_invalid",
                "detail": f"declared replacement list for block {b} is not "
                          f"present byte-identically in the result",
            })
    declared_after_blocks = set("\n".join(bullets) for _, bullets in repl_specs)
    sm = SequenceMatcher(a=ab, b=abx, autojunk=False)
    ops = sm.get_opcodes()

    inserted = 0
    rewritten = 0
    deleted = 0
    allowed_inserts = 0

    # per-op bookkeeping for paragraph-level proper nouns and structure
    equal_after = 0
    for tag, i1, i2, j1, j2 in ops:
        before_chunk, after_chunk = ab[i1:i2], abx[j1:j2]
        if tag == "equal":
            equal_after += j2 - j1
            continue
        touched = list(range(i1, i2))
        unmarked = [i for i in touched if i not in marked_set]
        if tag in ("replace", "delete") and unmarked:
            violations.append({
                "check": "unmarked_paragraph_changed",
                "detail": f"before paragraph index(es) {unmarked} changed but were not marked",
            })
        if tag == "delete":
            deleted += i2 - i1
        elif tag == "replace":
            rewritten += max(i2 - i1, j2 - j1)
        elif tag == "insert":
            inserted += j2 - j1
            allowed_inserts += sum(
                1 for a in abx[j1:j2] if a.strip() in allow_para_texts)

    # after-paragraphs with no byte-equal before counterpart are NEW blocks
    # (rewrites + inserts). Whitelisted inserts (e.g. the table disclaimer
    # line) are excluded; only the remainder counts against the cap.
    inserted = len(abx) - equal_after - allowed_inserts
    if allowed_new_paragraphs is not None and inserted > allowed_new_paragraphs:
        violations.append({
            "check": "insert_limit_exceeded",
            "detail": f"{inserted} new/rewritten after-paragraphs, allowed {allowed_new_paragraphs}",
        })

    # 1) numbers / percentages / versions — new TOKENS anywhere in the
    #    result (set semantics: a repeated mention of an existing number is
    #    not a new number).
    nb, na = _numbers(before_body), _numbers(after_body)
    new_nums = set(na) - set(nb)
    if new_nums:
        violations.append({
            "check": "number_new",
            "detail": f"new number token(s): {sorted(set(new_nums))[:8]}",
        })
    npb, npa = _percents(before_body), _percents(after_body)
    new_pcts = set(npa) - set(npb)
    if new_pcts:
        violations.append({
            "check": "percent_new",
            "detail": f"new percentage(s): {sorted(set(new_pcts))[:8]}",
        })
    vb, va = _versions(before_body), _versions(after_body)
    new_vs = set(va) - set(vb)
    if new_vs:
        violations.append({
            "check": "version_new",
            "detail": f"new version token(s): {sorted(set(new_vs))[:8]}",
        })

    # 2) proper nouns — paragraph-level on paired/rewritten blocks.
    #    Whole blocks matching allowed_new_paragraph_texts are skipped
    #    (e.g. the fixed disclaimer line under an edited table).
    for tag, i1, i2, j1, j2 in ops:
        if tag == "equal":
            continue
        b_chunk, a_chunk = ab[i1:i2], abx[j1:j2]
        if tag == "delete":
            continue
        if tag == "insert" and a_chunk and \
                all(a.strip() in allow_para_texts for a in a_chunk):
            continue
        if tag == "replace" and len(b_chunk) == len(a_chunk):
            for bp, ap in zip(b_chunk, a_chunk):
                if ap.strip() in declared_after_blocks:
                    continue  # declared list: every word verified verbatim
                extra = (set(_proper_nouns(ap)) - set(_proper_nouns(bp))
                         - set(allow_pn))
                if extra:
                    violations.append({
                        "check": "proper_noun_new",
                        "detail": f"new proper noun(s) {sorted(set(extra))[:6]} "
                                  f"not in the original paragraph: "
                                  f"{bp.splitlines()[0][:80]!r}",
                    })
        else:
            # insert / unequal replace — op-level comparison
            before_pn = set()
            for b in b_chunk:
                before_pn |= set(_proper_nouns(b))
            for a in a_chunk:
                if a.strip() in declared_after_blocks:
                    continue  # declared list: every word verified verbatim
                extra = set(_proper_nouns(a)) - before_pn - set(allow_pn)
                if extra:
                    violations.append({
                        "check": "proper_noun_new",
                        "detail": f"new proper noun(s) {sorted(set(extra))[:6]} "
                                  f"in inserted/new block {a.splitlines()[0][:80]!r}",
                    })

    # 3) new links (a renamed heading's internal anchor is allowed — the
    #    TOC entry has to follow the owner-mandated rename)
    lb, la = _links(before_body), _links(after_body)
    allowed_targets = set()
    for _old_h, new_h in allow_renames:
        m = re.search(r"\{#([^}]+)\}", new_h)
        if m:
            allowed_targets.add("#" + m.group(1))
    new_links = {t for t in set(la) - set(lb) if t not in allowed_targets}
    if new_links:
        violations.append({
            "check": "link_new",
            "detail": f"new link target(s): {sorted(set(new_links))[:6]}",
        })

    # 4) structure: heading LINES (with explicit renames), images, table
    #    rows, FAQ. Lines (not blocks): TOC blocks often merge a bullet list
    #    with the next heading, so block-level comparison would misreport.
    hb, ha = _heading_lines(before_body), _heading_lines(after_body)
    cb, ca = Counter(hb), Counter(ha)
    for old, new in allow_renames:
        if cb.get(old, 0) > 0 and ca.get(new, 0) > 0:
            cb[old] -= 1
            ca[new] -= 1
        else:
            violations.append({
                "check": "heading_changed",
                "detail": f"allowed rename source/target not found: {old!r} -> {new!r}",
            })
    leftover = sum((cb - ca).values()) + sum((ca - cb).values())
    if leftover:
        violations.append({
            "check": "heading_changed",
            "detail": f"{leftover} heading line(s) changed outside the allowed renames",
        })
    if sorted(_IMG_RE.findall(before_body)) != sorted(_IMG_RE.findall(after_body)):
        violations.append({
            "check": "image_changed",
            "detail": "image set/markup differs from the original",
        })
    rb = [l for l in before_body.splitlines() if l.lstrip().startswith("|")]
    ra = [l for l in after_body.splitlines() if l.lstrip().startswith("|")]
    table_violations = _compare_tables(
        before_body, after_body, marked_set, allow_marked_table_edits,
        allow_cells, frozenset(repl_blocks))
    violations.extend(table_violations)

    if _faq_questions(before_body) != _faq_questions(after_body):
        violations.append({
            "check": "faq_question_changed",
            "detail": "FAQ question lines differ from the original",
        })

    # 6) word-drop limit
    wb = len(_WORD_RE.findall(before_body))
    wa = len(_WORD_RE.findall(after_body))
    drop_pct = 100.0 * (wb - wa) / wb if wb else 0.0
    if drop_pct > word_drop_limit_pct:
        violations.append({
            "check": "word_drop_exceeded",
            "detail": f"body lost {drop_pct:.1f}% of its words (limit {word_drop_limit_pct}%)",
        })

    # 7) fabrication gates on the result (S1/S2/S3). The neutralization must
    # not INTRODUCE gate hits: hits(after) must be a subset of hits(before).
    # Pre-existing hits on lines the editor is forbidden to touch (e.g. FAQ
    # question headings like "Can I use ...?" matching the first-person
    # patterns) stay visible in stats but do not fail the gate.
    from .fabrication import fabrication_gate
    gb, ga = fabrication_gate(before_body), fabrication_gate(after_body)

    def _hitset(g):
        out = set()
        for sev in ("S1", "S2", "S3"):
            for h in g.get(sev, []):
                out.add((sev, str(h.get("pattern") or h.get("trigger")),
                         (h.get("match") or h.get("sample") or h.get("sentence") or "")[:80]))
        return out

    new_hits = _hitset(ga) - _hitset(gb)
    if new_hits:
        violations.append({
            "check": "gates_failed_S1S2S3",
            "detail": f"new gate hit(s) on the result: {sorted(new_hits)[:4]}",
        })

    # 8) unattributed claims (owner brief 2026-10-06 item 1, layer-1 of
    #    docs/unattributed-gate-plan.md): the result must not INTRODUCE an
    #    entity-attributed quantity without a source link, nor a measurement
    #    cell under a measurement column, that was not there before.
    from .unattributed import new_unattributed_hits
    ua_new = new_unattributed_hits(before_body, after_body)
    if ua_new:
        violations.append({
            "check": "unattributed_new",
            "detail": f"new unattributed hit(s) on the result: {sorted(ua_new)[:4]}",
        })

    return {
        "pass": not violations,
        "violations": violations,
        "stats": {
            "before_words": wb,
            "after_words": wa,
            "word_drop_pct": round(drop_pct, 1),
            "tables_replaced": len(repl_specs),
            "before_paragraphs": len(ab),
            "after_paragraphs": len(abx),
            "marked": sorted(marked_set),
            "rewritten": rewritten,
            "deleted": deleted,
            "inserted": inserted,
            "remaining_gate_hits": len(_hitset(ga)),
            "remaining_unattributed_hits": len(
                new_unattributed_hits("", after_body)),
        },
    }
