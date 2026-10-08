#!/usr/bin/env python3
"""Body-neutralization batch runner (owner brief 2026-10-08, item 4a).

Deterministic around the model, per docs/scale-plan.md:
  1. per article: mark paragraphs with gate hits (S1/S2/S3 + attribution +
     unattributed table cells). Table blocks are REPORTED, never sent.
  2. deterministic pre-step: delete full H3 sections of products on
     UNVERIFIED_PRODUCTS (verified by unverified_product_removal_gate).
  3. ONE WORKER call (deepseek-v4-pro-0813) rewrites the marked prose
     paragraphs only — JSON schema {index, new_text}; rules: no new
     numbers/names/links, no experience claims, editorial voice.
  4. guard: body_neutralization_gate over the model result; one CRITIC retry
     (glm-5.3) naming the violations; second failure -> article EXCLUDED.
  5. artifacts only: report.json + diffs.patch + cost.json under OUT_DIR.

Caps: max 2 model calls/article, $0.02/article, $2.00/run (input-price
floor; output prices are unpublished). dry_run mode: zero calls, zero cost.

The API key is read from env CLEANAPIS_KEY only. It is never printed,
logged, or written to any artifact.
"""
import argparse
import difflib
import json
import os
import re
import sys
import time
import urllib.request

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__)))))
from seo_agent_pro.agents_v2.gates.body_neutralization import (  # noqa: E402
    body_neutralization_gate, unverified_product_removal_gate,
    _blocks, UNVERIFIED_PRODUCTS,
)
from seo_agent_pro.agents_v2.gates.fabrication import fabrication_gate  # noqa: E402
from seo_agent_pro.agents_v2.gates.unattributed import (  # noqa: E402
    scan_attribution_numbers, scan_unattributed_table_cells,
)

BASE = os.environ.get("CLEANAPIS_BASE_URL", "https://cleanapis.com/v1")
WORKER = os.environ.get("CLEANAPIS_MODEL_WRITER", "deepseek-v4-pro-0813")
CRITIC = os.environ.get("CLEANAPIS_MODEL_CRITIC", "glm-5.3")
INPUT_PRICE = {"deepseek-v4-pro-0813": 0.552, "glm-5.3": 1.357}  # $/1M in
CAP_PER_ARTICLE = 0.02
CAP_PER_RUN = 2.00
MAX_CALLS_PER_ARTICLE = 6
CALL_TIMEOUT = 120

RULES = """Edit the numbered paragraphs of a Chrome-extension article via
find/replace operations (so untouched text stays byte-identical).
Rules (an automated gate fails violations):
1. Remove first-person testing/anecdotes ("I tested", "we ran benchmarks",
   "in my lab") — either delete the sentence or restate it neutrally.
2. NO new numbers, percentages, prices, versions, product names, or links.
3. Keep every existing fact that is not a first-person claim.
4. Editorial, neutral voice. No experience or expertise claims.
Output STRICT JSON — no preamble, no markdown fences:
{"edits": [{"index": <paragraph int>,
            "find": "<EXACT substring copied from that paragraph>",
            "replace": "<replacement text, or empty string to delete>"}]}
Each "find" MUST be copied byte-exactly from the source paragraph (it is
matched and replaced once). Omit paragraphs that need no change. Keep each
"replace" about as long as the text it replaces."""

SYSTEM = "You are a careful copy editor. Output JSON only."


def fm_split(text):
    m = re.match(r"^---\n.*?\n---\n", text, re.S)
    return (text[m.end():], text[:m.end()]) if m else (text, "")


def call_model(model, user_msg, cost_state, article_id):
    """One chat call. Returns (content, usage). Enforces caps."""
    if cost_state["calls_per_article"].get(article_id, 0) >= MAX_CALLS_PER_ARTICLE:
        raise RuntimeError("call_cap_article")
    est = cost_state["usd_est_run"]
    if est >= CAP_PER_RUN:
        raise RuntimeError("budget_cap_run")
    key = os.environ.get("CLEANAPIS_KEY", "")
    if not key:
        raise RuntimeError("missing CLEANAPIS_KEY")
    body = json.dumps({
        "model": model, "max_tokens": 2000, "stream": False,
        "messages": [{"role": "system", "content": SYSTEM},
                     {"role": "user", "content": user_msg}],
    }).encode()
    req = urllib.request.Request(
        f"{BASE}/chat/completions", data=body, method="POST",
        headers={"Authorization": f"Bearer {key}",
                 "Content-Type": "application/json",
                 "User-Agent": "Mozilla/5.0 (X11; Linux x86_64) "
                               "AppleWebKit/537.36 Chrome/126.0 Safari/537.36",
                 "Accept": "application/json"})
    t0 = time.time()
    with urllib.request.urlopen(req, timeout=CALL_TIMEOUT) as r:
        data = json.load(r)
    usage = data.get("usage", {})
    finish = data["choices"][0].get("finish_reason", "")
    pin = usage.get("prompt_tokens", 0)
    pout = usage.get("completion_tokens", 0)
    cost_state["usd_est_run"] += pin / 1e6 * INPUT_PRICE.get(model, 1.0)
    cost_state["usd_input_only_run"] += pin / 1e6 * INPUT_PRICE.get(model, 1.0)
    cost_state["tokens_in"] += pin
    cost_state["tokens_out"] += pout
    cost_state["calls_per_article"][article_id] = \
        cost_state["calls_per_article"].get(article_id, 0) + 1
    cost_state["calls_total"] += 1
    content = data["choices"][0]["message"]["content"]
    return content, {"model": model, "prompt_tokens": pin,
                     "completion_tokens": pout,
                     "finish_reason": finish,
                     "latency_s": round(time.time() - t0, 1)}


def parse_edits(content, idx_to_text):
    """Parse the find/replace schema; verify every 'find' occurs in its
    source paragraph. Salvages complete edit objects from truncated output.
    Returns {index: [(find, replace), ...]}."""
    cleaned = re.sub(r"^```(?:json)?\s*|\s*```$", "", content.strip(),
                     flags=re.M)
    obj = None
    m = re.search(r"\{[\s\S]*\}", cleaned)
    if m:
        try:
            obj = json.loads(m.group(0))
        except json.JSONDecodeError:
            obj = None
    raw_edits = []
    if obj is not None and isinstance(obj.get("edits"), list):
        raw_edits = obj["edits"]
    else:
        # truncated-JSON salvage: recover complete edit objects only
        raw_edits = []
        for mm in re.finditer(
                r'\{\s*"index"\s*:\s*(\d+)\s*,\s*"find"\s*:\s*'
                r'"((?:[^"\\]|\\.)*)"\s*,\s*"replace"\s*:\s*'
                r'"((?:[^"\\]|\\.)*)"\s*\}', cleaned):
            try:
                raw_edits.append({"index": int(mm.group(1)),
                                  "find": json.loads(f'"{mm.group(2)}"'),
                                  "replace": json.loads(f'"{mm.group(3)}"')})
            except json.JSONDecodeError:
                continue
    edits = {}
    errors = []
    for e in raw_edits:
        try:
            i = int(e["index"])
        except (KeyError, TypeError, ValueError):
            continue
        if i not in idx_to_text:
            continue
        find = str(e.get("find", ""))
        rep = str(e.get("replace", ""))
        if not find or find not in idx_to_text[i]:
            errors.append(f"find-not-in-source idx={i}: {find[:40]!r}")
            continue
        edits.setdefault(i, []).append((find, rep))
    if not edits:
        raise ValueError("no valid edits; " + "; ".join(errors[:3]))
    return edits


def block_line_ranges(lines):
    """Line-index ranges of blocks — mirrors gates._blocks grouping exactly
    (consecutive non-blank lines)."""
    ranges, cur = [], []
    for i, l in enumerate(lines):
        if l.strip():
            cur.append(i)
        elif cur:
            ranges.append((cur[0], cur[-1] + 1))
            cur = []
    if cur:
        ranges.append((cur[0], cur[-1] + 1))
    return ranges


def surgical_replace(body_lines, ranges, new_texts):
    """Replace ONLY the marked blocks' lines; every other byte stays."""
    out = list(body_lines)
    for k, txt in new_texts.items():
        s_, e_ = ranges[k]
        out[s_:e_] = txt.split("\n")
    return "\n".join(out)


def chunk_marked(indices, blocks, budget=1500):
    """Greedy chunks of paragraph indices by output-token estimate."""
    chunks, cur, est = [], [], 0
    for i in indices:
        t = int(len(re.findall(r"[A-Za-z0-9']+", blocks[i])) * 1.75) + 30
        if cur and est + t > budget:
            chunks.append(cur)
            cur, est = [], 0
        cur.append(i)
        est += t
    if cur:
        chunks.append(cur)
    return chunks


def marked_paragraphs(body):
    """(marked_prose_indices, table_hits, blocks) — gate-driven."""
    blocks = _blocks(body)
    marked = set()
    tables = []
    g = fabrication_gate(body)
    for sev in ("S1", "S2", "S3"):
        for h in g.get(sev, []):
            frag = (h.get("match") or h.get("sample") or h.get("sentence") or "")
            if not frag:
                continue
            for i, b in enumerate(blocks):
                if frag[:60] in b:
                    marked.add(i)
    for h in scan_attribution_numbers(body):
        frag = str(h.get("sentence") or h.get("match") or "")[:60]
        if not frag:
            continue
        for i, b in enumerate(blocks):
            if frag in b:
                marked.add(i)
    for h in scan_unattributed_table_cells(body):
        tables.append(h)
        frag = str(h.get("cell") or h.get("row") or "")[:40]
        if not frag:
            continue
        for i, b in enumerate(blocks):
            if frag in b:
                marked.add(i)  # tables: marked for REPORTING, not for model
    prose = sorted(i for i in marked
                   if not blocks[i].lstrip().startswith("|"))
    return prose, tables, blocks


def strip_unverified_sections(body):
    """Deterministic deletion of unverified-product H3 sections."""
    lines = body.split("\n")
    owned = set()
    open_lvl = None
    for i, l in enumerate(lines):
        m = re.match(r"^(#{1,6})\s+(.*)$", l)
        low = re.sub(r"[*_`~]", "", l).lower()
        hit = any(re.search(r"\b" + re.escape(p.lower()) + r"\b", low)
                  for p in UNVERIFIED_PRODUCTS)
        if m:
            lvl = len(m.group(1))
            if open_lvl is not None and lvl <= open_lvl:
                open_lvl = None
            if open_lvl is None and hit:
                open_lvl = lvl
        if open_lvl is not None or hit:
            owned.add(i)
    if not owned:
        return body, []
    out = [l for i, l in enumerate(lines) if i not in owned]
    removed = sorted({re.sub(r"[*_`~]", "", lines[i]).strip()
                      for i in owned if re.match(r"^#{1,6}\s", lines[i])})
    return "\n".join(out), removed


def process_article(rel_path, dry_run, cost_state):
    full = os.path.join("public/content", rel_path)
    original = open(full, encoding="utf-8").read()
    body0, fm = fm_split(original)
    rec = {"article": rel_path, "model_calls": [], "tables_reported": []}

    # step 1: mark
    prose_idx, tables, blocks0 = marked_paragraphs(body0)
    rec["marked_prose_paragraphs"] = prose_idx
    rec["tables_reported"] = tables

    # step 2: deterministic unverified-section deletion
    body1, removed = strip_unverified_sections(body0)
    rec["unverified_sections_removed"] = removed
    if removed:
        g1 = unverified_product_removal_gate(body0, body1)
        rec["gate_section_removal"] = {
            "pass": g1["pass"], "violations": g1["violations"][:5],
            "stats": g1["stats"]}
        if not g1["pass"]:
            rec["status"] = "excluded_section_gate"
            return rec
    else:
        rec["gate_section_removal"] = {"pass": True, "violations": [],
                                       "stats": {}}

    if removed:
        prose_idx, tables, blocks1 = marked_paragraphs(body1)
        rec["marked_prose_paragraphs"] = prose_idx
    else:
        blocks1 = blocks0

    if not prose_idx:
        rec["status"] = "nothing_marked"
        rec["after_body"] = body1
        return rec

    # step 3: model rewrite in chunks that fit the provider's 2048-token
    # output cap (empirically enforced even when more is requested)
    body_lines = body1.split("\n")
    ranges = block_line_ranges(body_lines)
    idx_to_text = {i: blocks1[i] for i in prose_idx}
    chunks = chunk_marked(prose_idx, blocks1, budget=1000)
    if len(chunks) > 4:
        rec["status"] = "excluded_too_many_paragraphs"
        rec["after_body"] = body1
        return rec

    new_texts = {}
    gate = None
    for attempt in range(len(chunks) + 1):
        if attempt < len(chunks):
            chunk = chunks[attempt]
            model = WORKER
            user_msg = f"{RULES}\n\nPARAGRAPHS:\n" + "\n\n".join(
                f"[{i}] {blocks1[i]}" for i in chunk)
        else:
            # one CRITIC retry over the same payload after a gate failure
            model = CRITIC
            vj = json.dumps((gate or {}).get("violations", [])[:8],
                            ensure_ascii=False)
            user_msg = (f"{RULES}\n\nYour previous edit set FAILED this "
                        f"gate: {vj}\nFix ONLY these violations.\n\n"
                        f"PARAGRAPHS:\n" + "\n\n".join(
                            f"[{i}] {blocks1[i]}" for i in prose_idx))
        if dry_run:
            rec["status"] = "dry_run"
            rec["after_body"] = body1
            return rec
        try:
            content, usage = call_model(model, user_msg, cost_state,
                                        rec["article"])
            usage["raw_head"] = content[:400]
            rec["model_calls"].append(usage)
            part = parse_edits(content, idx_to_text)
            for i, ops in part.items():
                cur = new_texts.get(i, blocks1[i])
                for find, rep in ops:
                    cur = cur.replace(find, rep, 1)
                new_texts[i] = cur
        except Exception as e:  # noqa: BLE001 — never leak the key
            rec["model_calls"].append({"model": model, "error": str(e)[:160]})
            if attempt < len(chunks):
                continue  # try remaining chunks; final verdict after loop
            rec["status"] = "excluded_model_error"
            rec["after_body"] = body1
            return rec
        if attempt < len(chunks) - 1:
            continue  # more chunks to fetch before gating
        # all chunks applied — gate
        cand = surgical_replace(body_lines, ranges, new_texts)
        gate = body_neutralization_gate(
            body1, cand, marked=sorted(set(prose_idx) | set(new_texts)),
            word_drop_limit_pct=45.0)
        if gate["pass"]:
            rec["status"] = "ok"
            rec["gate"] = {"pass": True, "violations": [],
                           "stats": gate["stats"]}
            rec["after_body"] = cand
            return rec
        rec.setdefault("gate_attempts", []).append(
            {"model": model, "pass": False,
             "violations": gate["violations"][:8]})
    rec["status"] = "excluded_gate"
    rec["after_body"] = body1
    return rec


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--batch", required=True)
    ap.add_argument("--out", required=True)
    ap.add_argument("--dry-run", action="store_true")
    args = ap.parse_args()

    os.makedirs(args.out, exist_ok=True)  # temp dir for artifacts only
    batch = json.load(open(args.batch))
    cost_state = {"tokens_in": 0, "tokens_out": 0, "calls_total": 0,
                  "usd_est_run": 0.0, "usd_input_only_run": 0.0,
                  "calls_per_article": {}}
    records = []
    for a in batch["articles"]:
        rec = process_article(a["path"], args.dry_run, cost_state)
        records.append(rec)
        print(f"[{rec.get('status', '?')}] {a['slug']} "
              f"(calls={len(rec['model_calls'])})", flush=True)

    patch_lines = []
    for rec in records:
        full = os.path.join("public/content", rec["article"])
        before = open(full, encoding="utf-8").read()
        after = rec.get("after_body") or before
        if after != before:
            patch_lines.extend(list(difflib.unified_diff(
                before.splitlines(), after.splitlines(),
                fromfile=f"a/{rec['article']}", tofile=f"b/{rec['article']}",
                lineterm="")) + [""])
        rec["before_body"] = None  # keep the artifact lean; patch carries it
        rec["words_after"] = len(re.findall(r"[A-Za-z0-9']+",
                                            fm_split(after)[0]))
    with open(os.path.join(args.out, "diffs.patch"), "w",
              encoding="utf-8") as f:
        f.write("\n".join(patch_lines))
    json.dump({"batch_id": batch.get("batch_id"), "dry_run": args.dry_run,
               "articles": records,
               "cost": {k: v for k, v in cost_state.items()
                        if k != "calls_per_article"},
               "calls_per_article": cost_state["calls_per_article"],
               "caps": {"per_article_usd": CAP_PER_ARTICLE,
                        "per_run_usd": CAP_PER_RUN,
                        "max_calls_per_article": MAX_CALLS_PER_ARTICLE}},
              open(os.path.join(args.out, "report.json"), "w",
                   encoding="utf-8"), ensure_ascii=False, indent=1)
    json.dump({"tokens_in": cost_state["tokens_in"],
               "tokens_out": cost_state["tokens_out"],
               "calls_total": cost_state["calls_total"],
               "usd_input_only": round(cost_state["usd_input_only_run"], 6),
               "pricing_note": "output prices unpublished — input-price "
                               "floor only",
               "caps": {"per_article_usd": CAP_PER_ARTICLE,
                        "per_run_usd": CAP_PER_RUN}},
              open(os.path.join(args.out, "cost.json"), "w",
                   encoding="utf-8"), indent=1)
    ok = sum(1 for r in records if r.get("status") == "ok")
    print(f"DONE ok={ok} excluded={len(records) - ok} "
          f"calls={cost_state['calls_total']} "
          f"usd_input_only={cost_state['usd_input_only_run']:.5f}")


if __name__ == "__main__":
    main()
