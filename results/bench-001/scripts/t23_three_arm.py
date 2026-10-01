#!/usr/bin/env python3
"""t23_three_arm.py — 3-arm comparison on ONE topic, local only, nothing pushed.

Arms:
  A = REAL old pipeline: daily_article._generate_content() verbatim
      (modules.analyze_competitors -> decide_strategy -> write_article -> meta call).
  B = Same real code path + same production gates + ONE targeted retry on gate
      failure (no search, no critic). Meta repair deterministic only.
  C = Full engine: agentic_loop.run_agentic (research loop + planner + writer +
      gates + critic targeted revision) + link injection + seo meta + claim
      fact-check — i.e. what pro_run does end-to-end.

Same-model fairness: no CLEANAPIS key exists in this workspace, so BOTH the
old pipeline (via a disclosed llm_router.call patch in THIS script only) and
the engine (squad_bridge -> llm_bridge z-ai fallback) are routed through the
SAME llm_bridge channel (z-ai / glm-builtin). No prompt, no gate, no flow of
daily_article.py is modified. The patch lives here, is never committed.

Usage: python3 t23_three_arm.py --topic chatgpt|screenshot|redirect --arm A|B|C
"""
import argparse
import json
import re
import subprocess
import sys
import time
from datetime import datetime, timezone
from pathlib import Path

WT = Path("/home/z/my-project/wt_engine")
SP = WT / "seo_agent_pro"
sys.path.insert(0, str(SP))

BRIDGE = "/home/z/my-project/agents/llm_bridge.mjs"
RUNS = Path("/home/z/my-project/ab_runs_t23")
WMIN, WMAX = 2550, 3100
PRICE_IN = {  # cleanapis catalog, usd per 1M input tokens (config.py)
    "writer": 0.552, "fast": 0.3565, "heavy": 3.3235, "translator": 1.357,
}
PRICE_OUT_MULT = 3.0  # rough output premium; estimate only

TOPICS = {
    "chatgpt": {"kw": "extension chrome chat gpt",
                "slug": "extension-chrome-chat-gpt-2",
                "title": "Best ChatGPT Extension for Chrome Browsing"},
    "screenshot": {"kw": "Easy Screenshot Chrome Comparison",
                   "slug": "easy-screenshot-chrome-comparison-2",
                   "title": "Easy Screenshot Chrome Comparison: Capturing the Perfect Shot"},
    "redirect": {"kw": "Why your browser keeps redirecting and how to fix it",
                 "slug": "why-your-browser-keeps-redirecting",
                 "title": "Why your browser keeps redirecting and how to fix it"},
}

WORD_RE = re.compile(r"[A-Za-z0-9'’-]+")
WC = lambda t: len(WORD_RE.findall(t))


def wc(t: str) -> int:
    return len(WORD_RE.findall(t))


# ───────────────────────── token / call accounting ─────────────────────────
ACC: list[dict] = []


def rec(arm, stage, in_chars, out_chars, ms, model="glm-builtin (z-ai bridge)"):
    ti, to = max(1, in_chars // 4), max(1, out_chars // 4)
    cost = (ti / 1e6 * PRICE_IN.get(stage, PRICE_IN["writer"])
            + to / 1e6 * PRICE_IN.get(stage, PRICE_IN["writer"]) * PRICE_OUT_MULT)
    ACC.append({"arm": arm, "stage": stage, "model": model, "in_chars": in_chars,
                "out_chars": out_chars, "est_in_tok": ti, "est_out_tok": to,
                "ms": int(ms), "est_cost_usd": round(cost, 6)})


def bridge_llm(system, user, stage, max_tokens, timeout=660):
    req = json.dumps({"system": system, "user": user, "stage": stage,
                      "max_tokens": max_tokens, "retries": 2})
    last_err = "unknown"
    for attempt in range(4):
        if attempt:
            time.sleep(50 * attempt)  # 429 backoff: 50s, 100s, 150s
        t0 = time.time()
        proc = subprocess.run(["node", BRIDGE], input=req, capture_output=True,
                              text=True, timeout=timeout)
        out = json.loads(proc.stdout or "{}")
        if out.get("ok"):
            return out["content"], (time.time() - t0) * 1000
        last_err = out.get("error", proc.stderr[:200])
        if "429" not in str(last_err) and "Too many" not in str(last_err):
            break
    raise RuntimeError(f"bridge failed: {last_err}")


# ───────────────────────────────────────────────────────────────────────────
def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--topic", required=True, choices=list(TOPICS))
    ap.add_argument("--arm", required=True, choices=["A", "B", "C"])
    args = ap.parse_args()
    T = TOPICS[args.topic]
    kw, slug, title = T["kw"], T["slug"], T["title"]
    run_dir = RUNS / slug / f"arm_{args.arm.lower()}"
    run_dir.mkdir(parents=True, exist_ok=True)
    t_start = time.time()
    meta = body = ""
    search_calls = [0]

    # ---- patch llm_router.call BEFORE importing daily_article/modules ----
    import llm_router
    _orig_router_call = llm_router.call

    def routed_call(system, user, model_name, stream=True, max_tokens=None):
        # DISCLOSED bridge routing: same channel/model as the engine arm.
        text, ms = bridge_llm(system, user, "writer", max_tokens or 8192)
        rec(args.arm, "writer", len(system) + len(user), len(text), ms)
        return text

    llm_router.call = routed_call

    # find_working_model skips keyless providers BEFORE any call (llm_router.py
    # :789-793) — with no keys it would RuntimeError. Disclosed patch: probe
    # through the SAME bridge and return the production primary candidate.
    def routed_probe(candidates, test_prompt="Reply with exactly: OK"):
        text, ms = bridge_llm(
            "You are a connectivity check. Reply with exactly the requested text, nothing else.",
            test_prompt, "fast", 30)
        rec(args.arm, "probe", 110, len(text), ms)
        print(f"[arm {args.arm}] probe OK via bridge → chain primary: {candidates[0]!r}")
        return candidates[0]

    llm_router.find_working_model = routed_probe

    # ---- patch squad llm (engine arm) ----
    from squad_bridge import Squad
    _orig_squad_llm = Squad.llm

    def squad_llm(self, system, user, stage="writer", max_tokens=8192, timeout=660):
        text, ms = bridge_llm(system, user, stage, max_tokens, timeout)
        rec(args.arm, stage, len(system) + len(user), len(text), ms)
        return text

    Squad.llm = squad_llm

    # ---- count engine search calls ----
    import agentic_loop
    _orig_ws = agentic_loop.Toolbelt.web_search

    def counted_ws(self, query, num=8):
        search_calls[0] += 1
        return _orig_ws(self, query, num)

    agentic_loop.Toolbelt.web_search = counted_ws

    if args.arm in ("A", "B"):
        import daily_article as da
        mem = json.loads((SP / "seo_memory.json").read_text(encoding="utf-8"))
        n_art = len(mem.get("articles_written", []))
        model = da.find_working_model(da.MODEL_FALLBACK_CHAIN)
        print(f"[arm {args.arm}] real _generate_content, chain-primary={model}")
        title_a, body, meta = da._generate_content(kw, n_art, model)
        title = title_a or title
        (run_dir / "body.md").write_text(body, encoding="utf-8")

        if args.arm == "B":
            squad = Squad()
            trace = agentic_loop.Trace(run_dir)

            def gate_common(b):
                words = wc(b)
                h2 = len(re.findall(r"^## ", b, re.M))
                table = bool(re.search(r"^\|.+\|\n\|[-| :]+\|", b, re.M))
                nested = bool(re.search(r"\[[^\]]*\[", b))
                head_link = bool(re.search(r"^#{1,6}\s.*\]\(", b, re.M))
                mid_tok = bool(re.search(r"\]\([^)]+\)[A-Za-z0-9]", b, re.M))
                brackets = b.count("[") == b.count("]")
                checks = {"word_count": WMIN <= words <= WMAX, "h2_sections": h2 >= 6,
                          "comparison_table": table, "no_nested_links": not nested,
                          "no_heading_links": not head_link, "no_split_words": not mid_tok,
                          "brackets_balanced": brackets}
                failed = [k for k, v in checks.items() if not v]
                return {"pass": not failed, "failed": failed, "words": words, "h2": h2}

            g1 = gate_common(body)
            m1 = len(meta)
            print(f"[arm B] gates v1: fail={g1['failed']} meta_len={m1}")
            if not g1["pass"]:
                body = agentic_loop.targeted_revision(
                    squad, trace, body, title, g1["failed"], {}, WMIN, WMAX)
                g1 = gate_common(body)
            if not (120 <= len(meta) <= 160) or '"' in meta or "\\" in meta:
                meta = agentic_loop.deterministic_meta_fallback(title, meta, WMIN)
            (run_dir / "body.md").write_text(body, encoding="utf-8")
            (run_dir / "gate1.json").write_text(json.dumps(g1, indent=1), encoding="utf-8")

    else:  # arm C — full engine
        squad = Squad()
        log_lines = []

        def log(agent_id, role, msg):
            print(f"[{datetime.now(timezone.utc).strftime('%H:%M:%S')}] {agent_id} ({role}) {msg}", flush=True)
            log_lines.append(f"{agent_id} ({role}) {msg}")

        import pro_run
        pro_run.INDEX_PATH = WT / "public" / "content" / "articles-index.json"
        links = pro_run.pick_internal_links(squad, log, [kw], slug)
        links_block = "\n".join(f"- [{l['title']}](https://extensionto.com/blog/{l['slug']})"
                                for l in links) or "- (none supplied — skip internal links, do not invent URLs)"
        res = agentic_loop.run_agentic(squad, log, run_dir, title, [kw], links,
                                       links_block, WMIN, WMAX, refine_body="", max_rounds=3)
        body = res["body"]
        # link injection (pro_run stage 6b, same rules + damage guard)
        if links:
            pre = body
            ls = squad.pick("link-strategist")
            inj = ("Insert these internal links into the article, each exactly once, with descriptive "
                   "natural anchors (NOT the raw title), spread across DIFFERENT sections:\n"
                   + "\n".join(f"- [slug: {l['slug']}] anchor text: a 3-6 word phrase relevant to the paragraph"
                               for l in links)
                   + "\nRules: markdown [anchor](https://extensionto.com/blog/<slug>) — never nest links, never "
                     "put a link inside a heading line, never split a word or number with a link. Return the FULL "
                     "article markdown unchanged except the inserted links.\n\nARTICLE:\n")
            try:
                nb = agentic_loop.strip_md(squad.llm(squad.system_prompt(ls), inj + body[:16000],
                                                     stage="fast", max_tokens=9000))
                damaged = (bool(re.search(r"\[[^\]]*\[", nb))
                           or bool(re.search(r"^#{1,6}\s.*\]\(", nb, re.M))
                           or bool(re.search(r"\]\([^)]+\)[A-Za-z0-9]", nb, re.M))
                           or nb.count("[") != nb.count("]")
                           or len(re.findall(r"^## ", nb, re.M)) < 6
                           or wc(nb) < WMIN - 100)
                body = pre if damaged else nb
            except Exception as e:  # noqa: BLE001
                log(ls["id"], ls["role"], f"injection failed ({str(e)[:60]}) → pre-injection body")
        # claim-level fact check (engine's own committed step)
        try:
            trace = agentic_loop.Trace(run_dir)
            tools = agentic_loop.Toolbelt(trace, run_dir)
            fc = agentic_loop.run_fact_check(squad, trace, tools, body,
                                             res.get("research", {}).get("rows", []), topic=title)
            (run_dir / "fact_summary.json").write_text(json.dumps(fc["summary"], indent=1), encoding="utf-8")
        except Exception as e:  # noqa: BLE001
            log("AG000", "orchestrator", f"fact-check skipped ({str(e)[:60]})")
        # seo meta (pro_run stage 7) + deterministic repair
        seo = squad.pick("seo-optimizer")
        meta_raw = squad.llm(
            squad.system_prompt(seo),
            "Return ONLY strict JSON for this article: {\"title\": \"<=70 chars\", \"excerpt\": \"1-2 sentences\", "
            "\"meta_description\": \"140-160 chars\", \"keywords\": [\"5 real search phrases\"]}\n"
            f"Article title: {title}\nFirst 600 chars:\n{body[:600]}",
            stage="fast", max_tokens=800)
        try:
            mj = json.loads(re.search(r"\{[\s\S]*\}", meta_raw).group(0))
            meta = mj.get("meta_description", "")
        except (json.JSONDecodeError, AttributeError):
            meta = ""
        if not (120 <= len(meta) <= 160) or '"' in meta or "\\" in meta:
            meta = agentic_loop.deterministic_meta_fallback(title, meta, WMIN)
        (run_dir / "body.md").write_text(body, encoding="utf-8")
        (run_dir / "agent_log.txt").write_text("\n".join(log_lines), encoding="utf-8")

    # ---- house-structure measurements for ALL arms (informational) ----
    h2 = len(re.findall(r"^## ", body, re.M))
    toc = bool(re.search(r"^## Table of Contents", body, re.M))
    faq_idx = body.find("## Frequently Asked Questions")
    faq_h3 = len(re.findall(r"^### ", body[faq_idx:], re.M)) if faq_idx >= 0 else 0
    v_idx = body.rfind("## Final Verdict")
    verdict = len(re.sub(r"[#!\s]", "", body[v_idx:])) if v_idx > 0 else 0
    table = bool(re.search(r"^\|.+\|\n\|[-| :]+\|", body, re.M))
    links_in_body = len(re.findall(r"\]\(https://extensionto\.com/blog/", body))
    damage = any([bool(re.search(r"\[[^\]]*\[", body)),
                  bool(re.search(r"^#{1,6}\s.*\]\(", body, re.M)),
                  bool(re.search(r"\]\([^)]+\)[A-Za-z0-9]", body, re.M)),
                  body.count("[") != body.count("]")])

    metrics = {
        "topic": args.topic, "slug": slug, "arm": args.arm,
        "title": title, "words": wc(body), "h2": h2, "toc": toc,
        "faq_h3": faq_h3, "verdict_chars": verdict, "comparison_table": table,
        "internal_links": links_in_body, "markdown_damage": damage,
        "meta": meta, "meta_len": len(meta),
        "meta_in_window": 120 <= len(meta) <= 160 and '"' not in meta and "\\" not in meta,
        "search_calls": search_calls[0],
        "llm_calls": len(ACC), "seconds": round(time.time() - t_start, 1),
        "est_in_tok": sum(a["est_in_tok"] for a in ACC),
        "est_out_tok": sum(a["est_out_tok"] for a in ACC),
        "est_cost_usd": round(sum(a["est_cost_usd"] for a in ACC), 4),
        "stage_calls": {},
    }
    for a in ACC:
        metrics["stage_calls"][a["stage"]] = metrics["stage_calls"].get(a["stage"], 0) + 1
    (run_dir / "metrics.json").write_text(json.dumps(metrics, indent=1, ensure_ascii=False), encoding="utf-8")
    (run_dir / "meta.txt").write_text(meta, encoding="utf-8")
    (run_dir / "calls.jsonl").write_text(
        "\n".join(json.dumps(a, ensure_ascii=False) for a in ACC), encoding="utf-8")
    print(json.dumps(metrics, indent=1, ensure_ascii=False))


if __name__ == "__main__":
    main()
