#!/usr/bin/env python3
"""agents_v2.eval.run_eval — A/B evaluation harness (owner spec Step 5).

  A = improved pipeline  (VERBATIM #450 logic copied into eval/pipeline_a.py)
  B = agents_v2          (agents.py orchestrator system)
on the SAME topics, judged by the SAME deterministic gates (gates_local).

Runs INSIDE GitHub Actions only (workflow agents-v2-eval.yml, mode=eval,
eval_mode=smoke|full). Artifacts only — nothing is published.

Fixed decision rule — REVISED by the owner 2026-10-02 (fair 3-attempt
redesign; the original single-shot rule is superseded — see
docs/agents_v2_design.md §11 for the modification and its reason):
  adopt B only if  success_within_3_attempts(B) >= success_within_3_attempts(A)
              AND  unsupported_claims(B) <= 0.60 × unsupported_claims(A)
              AND  cost_per_successful_article(B) <= 8 × cost_per_successful_article(A)
  otherwise: keep A; the research agent may stay as an optional tool.

Fair-attempt design (owner decision 2, 2026-10-02):
  * EVERY arm gets the SAME 3 independent attempts per topic; each attempt
    starts FROM SCRATCH; the loop STOPS at the first ALL-GATES-PASS article
    (no gate softened, no "near-miss" accepted, no best-of-N cherry-picking).
  * Per attempt and per arm we record: success/failure, which attempt,
    calls / tokens / USD (including FAILED attempts' real consumption).
  * Decision metrics: first-attempt success rate, success-within-3 rate,
    average attempts, total cost per successful article.

Owner decisions 2026-10-02 (after smoke run 36953360333 failed):
  * NO dispatch before a full local dry-run of BOTH arms with a mock
    provider and a simulated SearXNG — enshrined as CI tests in
    test_agents_v2_eval.py (TestImportSmoke / TestDryRun) so CI catches
    NameError/ImportError classes BEFORE any dispatch.
  * metering wraps the provider boundary so EVERY arm-A call is counted
    exactly once (direct call, call_json internals, find_working_model
    probe), with restore-in-finally so wrappers never stack across topics.
  * per-topic unexpected exceptions are RECORDED (stop_reason) instead of
    killing the one-shot full run; results.json is always written.
  * claim-audit counters per arm (owner decision 4): numeric / ranking-
    superlative claims, sourced against the harness's own SERP reference
    rows (identical corpus for both arms), unsupported; per-article
    claims.json artifacts carry the full unsupported-claims lists.
"""
from __future__ import annotations

import argparse
import hashlib
import json
import random
import sys
import time
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent.parent.parent))

from agents_v2.agents import ArticleCaps, Journal, run_article  # noqa: E402
from agents_v2.eval import pipeline_a  # noqa: E402
from agents_v2.eval.claims import claim_audit, unsupported_claims  # noqa: E402
from agents_v2.eval.pipeline_a import run_a  # noqa: E402
from agents_v2.gates_local import run_gates  # noqa: E402
from agents_v2.publisher import write_artifacts  # noqa: E402

TOPICS = json.loads(
    (Path(__file__).resolve().parent / "topics.json").read_text())["topics"]

# Owner decision 2 (2026-10-02): BOTH arms get the SAME maximum number of
# independent attempts per topic; each attempt starts from scratch; the
# loop stops at the first ALL-gates-pass article (no softening anywhere).
ATTEMPTS = 3


def _load_prices() -> dict:
    try:
        from config import CLEANAPIS_CATALOG
        return dict(CLEANAPIS_CATALOG)
    except Exception:  # noqa: BLE001
        return {}


PRICES = _load_prices()


class _CapHit(Exception):
    pass


def _wrap_a_call_with_metering(max_calls: int, max_usd: float):
    """Metering wrapper at the provider boundary for arm A.

    ONE choke point counts EVERY provider call exactly once:
      * pipeline_a direct `call(...)`            (article / meta / repairs),
      * `call_json(...)` internals              (competitor + strategy JSON),
      * `find_working_model`'s connectivity probe.
    call_json resolves `call` in llm_router's module globals at call time,
    so patching llm_router.call + pipeline_a.call covers all three paths
    without double counting (call_json is NOT rewrapped). Tokens are
    ESTIMATED at ~4 chars/token (disclosed); USD floor uses the input-side
    price keyed by the RESOLVED model id (alias -> catalog id) — the alias
    itself has no catalog price.
    """
    import llm_router
    state = {"calls": 0, "in_chars": 0, "out_chars": 0,
             "model": "", "resolved": ""}
    orig = llm_router.call

    def counted(system, user, model_name=None, *args, **kw):
        if state["calls"] >= max_calls:
            raise _CapHit(f"arm A call cap {max_calls} reached")
        state["calls"] += 1
        state["in_chars"] += len(system or "") + len(user or "")
        if model_name:
            state["model"] = model_name
            if not state["resolved"]:
                _prov, mid = llm_router.MODELS.get(model_name,
                                                   ("", "")) or ("", "")
                state["resolved"] = mid or model_name
        out = orig(system, user, model_name, *args, **kw)
        state["out_chars"] += len(out) if isinstance(out, str) else 800
        if _a_usd_floor(state) >= max_usd:
            raise _CapHit(f"arm A USD floor cap {max_usd} reached")
        return out

    return counted, state, orig


def _a_usd_floor(state: dict) -> float:
    price = PRICES.get(state.get("resolved") or state.get("model") or "", 0)
    return (state["in_chars"] / 4) / 1e6 * price


def _eval_a(topic: str, out_dir: Path, max_calls: int, max_usd: float,
            reference: str = "", attempt: int = 1) -> dict:
    """ONE independent arm-A attempt (starts from scratch; fresh metering
    state). Writes artifacts to <out>/armA/attempt<n>/. Failed attempts
    keep their REAL consumption (owner decision: partial usage counts)."""
    import llm_router
    counted, state, orig = _wrap_a_call_with_metering(max_calls, max_usd)
    llm_router.call = counted
    pipeline_a.call = counted
    t0 = time.monotonic()
    try:
        res = run_a(topic, articles_written=0)
        ok, gates, meta, body = True, res["gates"], res["meta"], res["body"]
        title, stop = res["title"], res["stats"]["stop_reason"]
    except (_CapHit, RuntimeError) as e:
        ok, gates, meta, body, title, stop = False, None, "", "", "", f"stopped: {e}"
    except Exception as e:  # noqa: BLE001 — record the failure, keep the
        # run alive; the error travels verbatim in stop_reason
        # and results.json (loud, per-attempt — NOT silent degradation).
        ok, gates, meta, body, title, stop = (
            False, None, "", "", "", f"error: {type(e).__name__}: {e}")
    finally:
        llm_router.call = orig
        pipeline_a.call = orig
    wall = round(time.monotonic() - t0, 1)
    adir = out_dir / "armA" / f"attempt{attempt}"
    adir.mkdir(parents=True, exist_ok=True)
    if body:
        (adir / "candidate.md").write_text(
            f"---\ntitle: {json.dumps(title, ensure_ascii=False)}\n"
            f"meta_description: {json.dumps(meta, ensure_ascii=False)}\n"
            f"agent_system: pipeline_a_450_copy\nattempt: {attempt}\n"
            f"status: CANDIDATE_ARTIFACT_NOT_PUBLISHED\n"
            f"---\n\n{body}\n", encoding="utf-8")
    audit = claim_audit(body, reference) if body else None
    if audit:
        (adir / "claims.json").write_text(
            json.dumps(audit, indent=2, ensure_ascii=False))
    metrics = {
        "attempt": attempt,
        "gates_pass": bool(gates and gates.get("pass")),
        "gates_failed": list(gates["failed"]) if gates else ["no_article"],
        "words": gates["words"] if gates else 0,
        "unsupported_claims": len(unsupported_claims(body)) if body else -1,
        "claims_total": audit["total_claims"] if audit else -1,
        "claims_numeric": audit["numeric_claims"] if audit else -1,
        "claims_ranking_or_superlative": (
            audit["ranking_or_superlative_claims"] if audit else -1),
        "claims_sourced": audit["sourced"] if audit else -1,
        "llm_calls": state["calls"],
        "tokens_estimated": (state["in_chars"] + state["out_chars"]) // 4,
        "tokens_basis": "estimated ~4 chars/token (disclosed)",
        "usd_floor": round(_a_usd_floor(state), 4),
        "wall_seconds": wall,
        "model": state.get("model", ""),
        "model_resolved": state.get("resolved", ""),
        "stop_reason": stop,
    }
    (adir / "metrics.json").write_text(
        json.dumps(metrics, indent=2, ensure_ascii=False))
    return metrics


def _eval_b(topic: str, out_dir: Path, caps: ArticleCaps,
            reference: str = "", attempt: int = 1) -> dict:
    """ONE independent arm-B attempt (fresh Journal + ledger = from
    scratch). Writes to <out>/armB/attempt<n>/. The journal is ALWAYS
    dumped (even on failure) so partial token usage is auditable.
    run_article now returns partial stats on error (agents.py fix) —
    failed attempts' consumption is counted, never zeroed."""
    journal = Journal()
    t0 = time.monotonic()
    err = ""
    try:
        res = run_article(topic, caps=caps, journal=journal)
    except Exception as e:  # noqa: BLE001 — belt & braces: run_article now
        # records-and-returns internally; this keeps the runner alive if a
        # truly unexpected error escapes (e.g. KeyboardInterrupt-ish frames).
        res, err = {}, f"error: {type(e).__name__}: {e}"
    body = res.get("body", "")
    gates = res.get("gates")
    stats = res.get("stats", {})
    bdir = out_dir / "armB" / f"attempt{attempt}"
    bdir.mkdir(parents=True, exist_ok=True)
    if body:
        write_artifacts(bdir, res, journal=journal)
    audit = claim_audit(body, reference) if body else None
    if audit:
        (bdir / "claims.json").write_text(
            json.dumps(audit, indent=2, ensure_ascii=False))
    metrics = {
        "attempt": attempt,
        "gates_pass": bool(gates and gates.get("pass")),
        "gates_failed": list(gates["failed"]) if gates else ["no_article"],
        "words": gates["words"] if gates else 0,
        "unsupported_claims": len(unsupported_claims(body)) if body else -1,
        "claims_total": audit["total_claims"] if audit else -1,
        "claims_numeric": audit["numeric_claims"] if audit else -1,
        "claims_ranking_or_superlative": (
            audit["ranking_or_superlative_claims"] if audit else -1),
        "claims_sourced": audit["sourced"] if audit else -1,
        "llm_calls": stats.get("steps", 0),
        "tokens_estimated": (stats.get("input_tokens", 0)
                             + stats.get("output_tokens", 0)),
        "tokens_basis": "provider usage + ~4 chars/token fallback",
        "usd_floor": stats.get("usd_floor", 0.0),
        "wall_seconds": round(time.monotonic() - t0, 1),
        "model": "per-role models.json (WRITER/CRITIC announced in journal)",
        "stop_reason": res.get("stop_reason", "") or err,
        "repairs": stats.get("repairs", 0),
    }
    (bdir / "metrics.json").write_text(
        json.dumps(metrics, indent=2, ensure_ascii=False))
    # ALWAYS dump the journal (failure included): per-call token rows make
    # partial consumption auditable after the fact (owner decision 4).
    (bdir / "journal.jsonl").write_text(
        "\n".join(journal.lines) + ("\n" if journal.lines else ""),
        encoding="utf-8")
    return metrics


def _run_arm(fn, topic: str, tdir: Path, attempts: int, **kw) -> dict:
    """Owner decision 2 (2026-10-02): fair attempt loop — the SAME number of
    independent attempts for BOTH arms, each from scratch, STOP at the first
    article that passes ALL gates (no gate softened, no near-miss accepted,
    no best-of-N picking). Cost of FAILED attempts is part of the arm's
    cost (it is real provider consumption)."""
    tries = []
    for n in range(1, attempts + 1):
        m = fn(topic, tdir, attempt=n, **kw)
        tries.append(m)
        print(f"    attempt {n}/{attempts}: "
              f"gates={'PASS' if m['gates_pass'] else 'FAIL'} "
              f"words={m['words']} calls={m['llm_calls']} "
              f"usd={m['usd_floor']} stop={m['stop_reason'][:80]}", flush=True)
        if m["gates_pass"]:
            break
    success = tries[-1]["gates_pass"]
    return {
        "attempts": tries,
        "attempts_used": len(tries),
        "success": success,
        "first_attempt_success": tries[0]["gates_pass"],
        "article_attempt": (len(tries) if success else None),
        "total_llm_calls": sum(t["llm_calls"] for t in tries),
        "total_tokens_estimated": sum(t["tokens_estimated"] for t in tries),
        "total_usd_floor": round(sum(t["usd_floor"] for t in tries), 4),
    }


def _winning_attempt_metrics(arm: dict) -> dict | None:
    """Per-attempt metrics of the article that passed all gates (the one
    counted for claims), or None when the arm failed the topic."""
    n = arm.get("article_attempt")
    return arm["attempts"][n - 1] if n else None


def build_decision(results: list, attempts: int) -> dict:
    """REVISED decision rule (owner, 2026-10-02) — pure function so tests
    pin it. Modifications vs the original single-shot rule are documented
    in docs/agents_v2_design.md §11:
      - gates_pass(B) >= gates_pass(A)  →  success-within-3 rate(B) >= A
      - claims(B) <= 0.60*claims(A)     →  unchanged threshold, now applied
        to UNSUPPORTED claims of the SUCCESSFUL articles only (a failed
        topic produces no article and contributes 0 claims; failure is
        already penalized by the success-rate condition)
      - cost(B) <= 8*cost(A)            →  cost per SUCCESSFUL article
        (total arm cost incl. failed attempts / #successful articles)
    Premise guard kept and strengthened: the rule is evaluated ONLY when
    BOTH arms produced >=1 successful article (undefined ratios otherwise).
    Thresholds 0.60 / 8.0 are byte-identical to the owner's original rule."""
    n_topics = len(results)
    a_succ = sum(1 for r in results if r["A"]["success"])
    b_succ = sum(1 for r in results if r["B"]["success"])
    a_first = sum(1 for r in results if r["A"]["first_attempt_success"])
    b_first = sum(1 for r in results if r["B"]["first_attempt_success"])
    a_att = sum(r["A"]["attempts_used"] for r in results) / (n_topics or 1)
    b_att = sum(r["B"]["attempts_used"] for r in results) / (n_topics or 1)
    a_cost = sum(r["A"]["total_usd_floor"] for r in results)
    b_cost = sum(r["B"]["total_usd_floor"] for r in results)
    # claims are counted on the SUCCESSFUL article of each topic only
    a_unsup = sum((_winning_attempt_metrics(r["A"]) or {}).get(
        "unsupported_claims", 0) or 0 for r in results)
    b_unsup = sum((_winning_attempt_metrics(r["B"]) or {}).get(
        "unsupported_claims", 0) or 0 for r in results)
    a_cps = (a_cost / a_succ) if a_succ else None
    b_cps = (b_cost / b_succ) if b_succ else None
    premise_ok = a_succ > 0 and b_succ > 0
    claims_ratio = (b_unsup / a_unsup) if a_unsup else (
        0.0 if b_unsup == 0 else 9.9)
    cost_ratio = ((b_cps / a_cps) if a_cps
                  else (0.0 if (b_cps or 0) == 0 else 9.9))
    adopt = ((b_succ >= a_succ) and (claims_ratio <= 0.60)
             and (cost_ratio <= 8.0))
    unmet = ", ".join(
        f"arm {x}: 0 successful articles"
        for x, n in (("A", a_succ), ("B", b_succ)) if n == 0)
    return {
        "rule": "adopt B iff success_within_3_attempts(B)>=success_within_3_attempts(A) "
                "AND unsupported_claims(B)<=0.60*unsupported_claims(A) "
                "AND cost_per_successful_article(B)<=8*cost_per_successful_article(A)",
        "attempts_per_arm_per_topic": attempts,
        "premise": ("both arms produced >=1 successful article" if premise_ok else
                    f"NOT MET ({unmet}) — rule not applicable on empty/partial "
                    "data; adopt_B=null"),
        "topics": n_topics,
        "successes_A": a_succ, "successes_B": b_succ,
        "success_rate_A": round(a_succ / n_topics, 3) if n_topics else 0.0,
        "success_rate_B": round(b_succ / n_topics, 3) if n_topics else 0.0,
        "first_attempt_success_A": a_first,
        "first_attempt_success_B": b_first,
        "first_attempt_rate_A": round(a_first / n_topics, 3) if n_topics else 0.0,
        "first_attempt_rate_B": round(b_first / n_topics, 3) if n_topics else 0.0,
        "avg_attempts_A": round(a_att, 2),
        "avg_attempts_B": round(b_att, 2),
        "unsupported_claims_A": a_unsup, "unsupported_claims_B": b_unsup,
        "claims_ratio": round(claims_ratio, 3),
        "total_usd_floor_A": round(a_cost, 4),
        "total_usd_floor_B": round(b_cost, 4),
        "cost_per_successful_article_A": (round(a_cps, 4) if a_cps is not None else None),
        "cost_per_successful_article_B": (round(b_cps, 4) if b_cps is not None else None),
        "cost_ratio": round(cost_ratio, 3),
        "adopt_B": (adopt if premise_ok else None),
        "recommendation": (
            None if not premise_ok else
            ("ADOPT agents_v2 (B)" if adopt else
             "KEEP A (improved pipeline); research agent may remain "
             "an optional tool")),
    }


def _blind_pair(topic: str, body_a: str, body_b: str, idx: int,
                blind_dir: Path, key_lines: list[str]):
    """Write an UNLABELED pair; the key is a sha256 fingerprint only.

    Order is derived deterministically from sha256(topic + salt) so the
    mapping can be recovered later by re-deriving it — the artifact itself
    never reveals which text came from which arm."""
    salt = "agents-v2-blind-pair-v1"
    first_is_a = int(hashlib.sha256(f"{topic}{salt}".encode()).hexdigest(), 16) % 2 == 0
    texts = [body_a, body_b] if first_is_a else [body_b, body_a]
    mapping = f"pair{idx}: first={('A' if first_is_a else 'B')}, second={('B' if first_is_a else 'A')}"
    key_lines.append(mapping)
    (blind_dir / f"pair_{idx:02d}.md").write_text(
        f"# Blind pair {idx:02d} — topic: {topic}\n\n"
        f"## Candidate 1\n\n{texts[0]}\n\n---\n\n## Candidate 2\n\n{texts[1]}\n",
        encoding="utf-8")


def main() -> int:
    ap = argparse.ArgumentParser()
    ap.add_argument("--mode", choices=["smoke", "full"], required=True)
    ap.add_argument("--max-calls", type=int, default=600)
    ap.add_argument("--max-cost-usd", type=float, default=5.0)
    ap.add_argument("--out", default="/tmp/agents_v2_eval/eval")
    args = ap.parse_args()

    topics = TOPICS[:1] if args.mode == "smoke" else list(TOPICS)
    out_dir = Path(args.out)
    out_dir.mkdir(parents=True, exist_ok=True)
    blind_dir = out_dir / "blind"
    blind_dir.mkdir(parents=True, exist_ok=True)

    attempts = ATTEMPTS  # owner decision 2: 3 fair independent attempts
    caps = ArticleCaps(
        max_steps=max(16, args.max_calls // (len(topics) * 2 * attempts)),
        max_tokens=400_000,
        max_usd_floor=args.max_cost_usd / len(topics))
    # arm A per-ATTEMPT caps: its half of the run cap divided across the
    # 3 attempts (the loop stops early on success, so the total stays ≤ cap)
    a_calls = max(24, (args.max_calls // 2) // attempts)
    a_usd = (args.max_cost_usd / 2) / attempts
    print(f"eval mode={args.mode} topics={len(topics)} "
          f"attempts_per_arm={attempts} | caps per attempt (arm A): "
          f"calls={a_calls} usd={a_usd:.4f} | caps per topic (arm B): "
          f"steps={caps.max_steps} usd_floor={caps.max_usd_floor} "
          f"| run caps: calls={args.max_calls} usd={args.max_cost_usd}",
          flush=True)

    results, key_lines = [], []
    for i, topic in enumerate(topics):
        print(f"\n=== topic {i + 1}/{len(topics)}: {topic} ===", flush=True)
        tdir = out_dir / f"topic_{i:02d}"
        tdir.mkdir(parents=True, exist_ok=True)
        # Owner decision 4: ONE harness-level SERP reference fetch per topic,
        # identical corpus for BOTH arms' claim audits (no model calls).
        ref_rows = pipeline_a._fetch_serp(topic)
        reference = "\n".join(
            f"{r['title']} {r['url']} {r['snippet']}" for r in ref_rows)
        print(f"  claim-audit reference rows: {len(ref_rows)}"
              + ("" if ref_rows else " (SearXNG unreachable — audits rely "
                                     "on link/hedge only, DISCLOSED)"), flush=True)
        arm_a = _run_arm(_eval_a, topic, tdir, attempts,
                         max_calls=a_calls, max_usd=a_usd,
                         reference=reference)
        wa = _winning_attempt_metrics(arm_a)
        print(f"[A] success={arm_a['success']} attempts={arm_a['attempts_used']} "
              f"claims={wa['unsupported_claims'] if wa else '-'} "
              f"calls={arm_a['total_llm_calls']} "
              f"usd={arm_a['total_usd_floor']}", flush=True)
        arm_b = _run_arm(_eval_b, topic, tdir, attempts, caps=caps,
                         reference=reference)
        wb = _winning_attempt_metrics(arm_b)
        print(f"[B] success={arm_b['success']} attempts={arm_b['attempts_used']} "
              f"claims={wb['unsupported_claims'] if wb else '-'} "
              f"calls={arm_b['total_llm_calls']} "
              f"usd={arm_b['total_usd_floor']}", flush=True)
        results.append({"topic": topic, "reference_results": len(ref_rows),
                        "A": arm_a, "B": arm_b})
        if wa and wb:
            ca = tdir / "armA" / f"attempt{arm_a['article_attempt']}" / "candidate.md"
            cb = tdir / "armB" / f"attempt{arm_b['article_attempt']}" / "candidate.md"
            _blind_pair(topic, ca.read_text(), cb.read_text(), i, blind_dir,
                        key_lines)

    # REVISED decision rule (owner 2026-10-02) — see build_decision +
    # docs/agents_v2_design.md §11; premise guard KEPT (smoke 36990401835).
    decision = build_decision(results, attempts)
    (out_dir / "results.json").write_text(
        # NOTE: no flush kwarg — Path.write_text takes none (fourth latent
        # bug caught by the mandated local dry-run; run 7 never got here).
        json.dumps({"mode": args.mode,
                    "attempts_per_arm_per_topic": attempts,
                    "metrics_definitions": {
                        "success": "ALL gates pass (no softening, no near-miss)",
                        "success_rate": "topics with >=1 success / topics",
                        "first_attempt_rate": "topics won on attempt 1 / topics",
                        "avg_attempts": "mean attempts_used over topics (3 = all failed)",
                        "cost_per_successful_article": "total arm USD (incl. failed attempts) / successes",
                        "unsupported_claims": "counted on each topic's successful article only"},
                    "per_topic": results, "decision": decision,
                    "claim_audit": {
                        "basis": ("sourced = link OR first-hand hedge OR "
                                  "factual token in harness SERP reference; "
                                  "unsupported_claims (decision-rule feed) "
                                  "uses the pre-registered link/hedge "
                                  "definition, unchanged"),
                        "reference_fetch": "pipeline_a._fetch_serp(topic), 1 per topic, both arms"},
                    "models_disclosure": {
                        "A": results[0]["A"]["attempts"][0]["model"] if results else "",
                        "B": "role-routed per models.json; echoed ids in journal"}},
                   indent=2, ensure_ascii=False))
    mapping_text = "\n".join(key_lines)
    (blind_dir / "key.txt").write_text(
        "sha256 fingerprint of the blind mapping (the mapping itself is NOT "
        "stored here; recover by re-deriving sha256(topic+'agents-v2-blind-pair-v1') "
        "parity per pair):\n"
        + hashlib.sha256(mapping_text.encode()).hexdigest() + "\n"
        + "\nfingerprint of each single pair line:\n"
        + "\n".join(hashlib.sha256(l.encode()).hexdigest() for l in key_lines) + "\n",
        encoding="utf-8")
    print("\n## Decision (fixed rule, computed after results)\n", flush=True)
    print(json.dumps(decision, indent=2), flush=True)
    return 0


if __name__ == "__main__":
    sys.exit(main())
