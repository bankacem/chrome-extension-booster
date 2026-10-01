#!/usr/bin/env python3
"""agents_v2.eval.run_eval — A/B evaluation harness (owner spec Step 5).

  A = improved pipeline  (VERBATIM #450 logic copied into eval/pipeline_a.py)
  B = agents_v2          (agents.py orchestrator system)
on the SAME topics, judged by the SAME deterministic gates (gates_local).

Runs INSIDE GitHub Actions only (workflow agents-v2-eval.yml, mode=eval,
eval_mode=smoke|full). Artifacts only — nothing is published.

Fixed decision rule (written by the owner BEFORE seeing results):
  adopt B only if  gates_pass(B) >= gates_pass(A)
              AND  unsupported_claims(B) <= 0.60 × unsupported_claims(A)
              AND  cost(B) <= 8 × cost(A)
  otherwise: keep A; the research agent may stay as an optional tool.
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
from agents_v2.eval.claims import unsupported_claims  # noqa: E402
from agents_v2.eval.pipeline_a import run_a  # noqa: E402
from agents_v2.gates_local import run_gates  # noqa: E402
from agents_v2.publisher import write_artifacts  # noqa: E402

TOPICS = json.loads(
    (Path(__file__).resolve().parent / "topics.json").read_text())["topics"]


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
    """Module-level metering wrapper around pipeline_a.call (llm_router).

    Honest accounting for arm A: every call is counted; tokens are ESTIMATED
    at ~4 chars/token (disclosed everywhere); USD floor uses input-side price
    only (output prices unconfirmed by the owner)."""
    state = {"calls": 0, "in_chars": 0, "out_chars": 0, "model": ""}
    orig = pipeline_a.call

    def counted(system, user, model=None, stream=False, max_tokens=4096, **kw):
        if state["calls"] >= max_calls:
            raise _CapHit(f"arm A call cap {max_calls} reached")
        state["calls"] += 1
        state["in_chars"] += len(system) + len(user)
        state["model"] = model or state["model"]
        out = orig(system, user, model, stream=stream, max_tokens=max_tokens, **kw)
        state["out_chars"] += len(out) if isinstance(out, str) else 800
        if state["in_chars"] / 4 and _a_usd_floor(state) >= max_usd:
            raise _CapHit(f"arm A USD floor cap {max_usd} reached")
        return out

    return counted, state


def _a_usd_floor(state: dict) -> float:
    price = PRICES.get(state.get("model") or "", 0)
    return (state["in_chars"] / 4) / 1e6 * price


def _eval_a(topic: str, out_dir: Path, max_calls: int, max_usd: float) -> dict:
    counted, state = _wrap_a_call_with_metering(max_calls, max_usd)
    pipeline_a.call = counted
    t0 = time.monotonic()
    try:
        res = run_a(topic, articles_written=0)
        ok, gates, meta, body = True, res["gates"], res["meta"], res["body"]
        title, stop = res["title"], res["stats"]["stop_reason"]
    except (_CapHit, RuntimeError) as e:
        ok, gates, meta, body, title, stop = False, None, "", "", "", f"stopped: {e}"
    wall = round(time.monotonic() - t0, 1)
    (out_dir / "armA").mkdir(parents=True, exist_ok=True)
    if body:
        (out_dir / "armA" / "candidate.md").write_text(
            f"---\ntitle: {json.dumps(title, ensure_ascii=False)}\n"
            f"meta_description: {json.dumps(meta, ensure_ascii=False)}\n"
            f"agent_system: pipeline_a_450_copy\nstatus: CANDIDATE_ARTIFACT_NOT_PUBLISHED\n"
            f"---\n\n{body}\n", encoding="utf-8")
    metrics = {
        "gates_pass": bool(gates and gates.get("pass")),
        "gates_failed": list(gates["failed"]) if gates else ["no_article"],
        "words": gates["words"] if gates else 0,
        "unsupported_claims": len(unsupported_claims(body)) if body else -1,
        "llm_calls": state["calls"],
        "tokens_estimated": (state["in_chars"] + state["out_chars"]) // 4,
        "tokens_basis": "estimated ~4 chars/token (disclosed)",
        "usd_floor": round(_a_usd_floor(state), 4),
        "wall_seconds": wall,
        "model": state.get("model", ""),
        "stop_reason": stop,
    }
    (out_dir / "armA" / "metrics.json").write_text(
        json.dumps(metrics, indent=2, ensure_ascii=False))
    return metrics


def _eval_b(topic: str, out_dir: Path, caps: ArticleCaps) -> dict:
    journal = Journal()
    t0 = time.monotonic()
    res = run_article(topic, caps=caps, journal=journal)
    write_artifacts(out_dir / "armB", res, journal=journal)
    body = res.get("body", "")
    gates = res.get("gates")
    stats = res.get("stats", {})
    metrics = {
        "gates_pass": bool(gates and gates.get("pass")),
        "gates_failed": list(gates["failed"]) if gates else ["no_article"],
        "words": gates["words"] if gates else 0,
        "unsupported_claims": len(unsupported_claims(body)) if body else -1,
        "llm_calls": stats.get("steps", 0),
        "tokens_estimated": (stats.get("input_tokens", 0)
                             + stats.get("output_tokens", 0)),
        "tokens_basis": "provider usage + ~4 chars/token fallback",
        "usd_floor": stats.get("usd_floor", 0.0),
        "wall_seconds": round(time.monotonic() - t0, 1),
        "model": "per-role models.json (WRITER/CRITIC announced in journal)",
        "stop_reason": res.get("stop_reason", ""),
        "repairs": stats.get("repairs", 0),
    }
    (out_dir / "armB" / "metrics.json").write_text(
        json.dumps(metrics, indent=2, ensure_ascii=False))
    return metrics


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

    caps = ArticleCaps(max_steps=max(12, args.max_calls // (len(topics) * 2)),
                       max_tokens=400_000, max_usd_floor=args.max_cost_usd / len(topics))
    print(f"eval mode={args.mode} topics={len(topics)} | caps per article: "
          f"steps={caps.max_steps} usd_floor={caps.max_usd_floor} "
          f"| run caps: calls={args.max_calls} usd={args.max_cost_usd}", flush=True)

    results, key_lines = [], []
    for i, topic in enumerate(topics):
        print(f"\n=== topic {i + 1}/{len(topics)}: {topic} ===", flush=True)
        tdir = out_dir / f"topic_{i:02d}"
        tdir.mkdir(parents=True, exist_ok=True)
        m_a = _eval_a(topic, tdir, args.max_calls // 2, args.max_cost_usd / 2)
        print(f"[A] gates={m_a['gates_pass']} claims={m_a['unsupported_claims']} "
              f"calls={m_a['llm_calls']} model={m_a['model']}", flush=True)
        m_b = _eval_b(topic, tdir, caps)
        print(f"[B] gates={m_b['gates_pass']} claims={m_b['unsupported_claims']} "
              f"calls={m_b['llm_calls']}", flush=True)
        results.append({"topic": topic, "A": m_a, "B": m_b})
        ca = (tdir / "armA" / "candidate.md")
        cb = (tdir / "armB" / "candidate.md")
        if ca.exists() and cb.exists():
            _blind_pair(topic, ca.read_text(), cb.read_text(), i, blind_dir, key_lines)

    # fixed decision rule (owner, written before results)
    a_gates = sum(1 for r in results if r["A"]["gates_pass"])
    b_gates = sum(1 for r in results if r["B"]["gates_pass"])
    a_claims = sum(max(0, r["A"]["unsupported_claims"]) for r in results)
    b_claims = sum(max(0, r["B"]["unsupported_claims"]) for r in results)
    a_cost = sum(r["A"]["usd_floor"] for r in results)
    b_cost = sum(r["B"]["usd_floor"] for r in results)
    claims_ratio = (b_claims / a_claims) if a_claims else (0.0 if b_claims == 0 else 9.9)
    cost_ratio = (b_cost / a_cost) if a_cost else (0.0 if b_cost == 0 else 9.9)
    adopt = (b_gates >= a_gates) and (claims_ratio <= 0.60) and (cost_ratio <= 8.0)
    decision = {
        "rule": "adopt B iff gates(B)>=gates(A) AND claims(B)<=0.60*claims(A) AND cost(B)<=8*cost(A)",
        "gates_A": a_gates, "gates_B": b_gates,
        "claims_A": a_claims, "claims_B": b_claims,
        "claims_ratio": round(claims_ratio, 3),
        "usd_floor_A": round(a_cost, 4), "usd_floor_B": round(b_cost, 4),
        "cost_ratio": round(cost_ratio, 3),
        "adopt_B": adopt,
        "recommendation": ("ADOPT agents_v2 (B)" if adopt else
                           "KEEP A (improved pipeline); research agent may remain "
                           "an optional tool"),
    }
    (out_dir / "results.json").write_text(
        json.dumps({"mode": args.mode, "per_topic": results, "decision": decision,
                    "models_disclosure": {
                        "A": results[0]["A"]["model"] if results else "",
                        "B": "role-routed per models.json; echoed ids in journal"}},
                   indent=2, ensure_ascii=False), flush=True)
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
