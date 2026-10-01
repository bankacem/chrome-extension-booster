#!/usr/bin/env python3
"""Local smoke test for the old-line hardening (owner decisions 3a-3d).

NO network, NO key: llm_router is stubbed BEFORE modules.py is imported
(same disclosed-patch pattern as bench-001's t23_three_arm.py).

Run: python3 seo_agent_pro/test_gates_smoke.py
"""
import os
import re
import sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

# ── stub llm_router BEFORE importing modules ──────────────────────────────
CALLS = {"n": 0, "max_tokens": []}


def fake_call(system, user, model_name, stream=True, max_tokens=None):
    CALLS["n"] += 1
    CALLS["max_tokens"].append(max_tokens)
    return "## Stubbed Section\n\nRewritten content that satisfies the spec."


def fake_call_json(system, user, model_name, max_tokens=1500):
    CALLS["n"] += 1
    return {"ideal_length": 9000,  # deliberately out of window
            "required_sections": ["How It Works", "Comparison",
                                  "Frequently Asked Questions", "Final Verdict"],
            "must_have_elements": ["table"], "unique_angle": "x",
            "strategy": "aggressive", "reasoning": "r",
            "section_budgets": []}


import llm_router  # noqa: E402
llm_router.call = fake_call
llm_router.call_json = fake_call_json
llm_router.find_working_model = lambda candidates, test_prompt="OK": candidates[0]

import gates  # noqa: E402
import modules  # noqa: E402

FAILURES = []


def check(name, cond, detail=""):
    print(f"  [{'PASS' if cond else 'FAIL'}] {name}" + (f" — {detail}" if detail else ""))
    if not cond:
        FAILURES.append(name)


print("== 1. gates.run_gates detection ==")
good = ("## Table of Contents\n\n- [A](#a)\n\n" + "".join(
    f"## Section {i}\n\n" + ("word " * 420) + "\n\n" for i in range(6))
    + "## Comparison\n\n| a | b |\n|---|---|\n| 1 | 2 |\n\n"
    + "## Frequently Asked Questions\n\n" + "".join(
        f"### Q{i}?\n\nAnswer {i} with a couple of sentences here.\n\n" for i in range(1, 9))
    + "## Final Verdict\n\n" + ("verdict " * 40))
meta_ok = "x" * 140
g = gates.run_gates(good, meta_ok)
check("all-pass on synthetic good body", g["pass"], f"failed={g['failed']}")
g2 = gates.run_gates("## One\n\nshort", "")
check("detects failures on bad body",
      not g2["pass"] and {"word_count", "h2_sections", "toc", "faq8",
                          "final_verdict", "comparison_table",
                          "meta_window"} <= set(g2["failed"]),
      f"failed={g2['failed']}")

print("== 2. deterministic damage repair ==")
bad = "## [Linked Heading](https://x.com)\n\n[par](https://y.com)tial text\n\n[outer [inner](https://z.com) text](https://w.com)\n"
fixed = gates.repair_damage(bad)
check("heading link stripped", not re.search(r"^#{1,6}\s.*\]\(", fixed, re.M), fixed.splitlines()[0])
check("split word rejoined", "partial text" in fixed)
check("nested link unwrapped", not re.search(r"\[[^\]]*\[", fixed))
check("no link-split remains", not re.search(r"\]\([^)]+\)[A-Za-z0-9]", fixed))

print("== 3. deterministic ToC rebuild ==")
body = "# T\n\nintro.\n\n## Alpha\n\ntext\n\n## Beta\n\ntext\n"
t = gates.rebuild_toc(body)
check("toc inserted before first H2",
      t.index("## Table of Contents") < t.index("## Alpha")
      and "## Table of Contents" in t, "")
check("toc lists real headings", "[Alpha](#alpha)" in t and "[Beta](#beta)" in t)

print("== 4. decide_strategy clamp + budgets ==")
os.environ["SEO_WORD_MIN"] = "2550"
os.environ["SEO_WORD_MAX"] = "3100"
import importlib  # noqa: E402
importlib.reload(gates)
strategy = modules.decide_strategy("kw", {}, 10, "stub")
check("ideal_length clamped to window",
      strategy["ideal_length"] == 3100, f"got {strategy['ideal_length']}")
budgets = strategy.get("section_budgets", [])
bt = sum(b["words"] for b in budgets)
check("section budgets exist and sum ≈ target",
      len(budgets) == 4 and 0.8 * 3100 <= bt <= 1.2 * 3100, f"sum={bt}")
faq_b = next(b for b in budgets if "frequently asked" in b["heading"].lower())
check("FAQ gets the 12% share", faq_b["words"] == int(3100 * 0.12), f"{faq_b['words']}")

print("== 5. analyze_competitors SERP fallback (dead endpoint, disclosed) ==")
os.environ["SEARXNG_URL"] = "http://127.0.0.1:1"
res = modules.analyze_competitors("kw", "stub")
check("falls back to model-knowledge without crashing", isinstance(res, dict) and res.get("strategy") == "aggressive")

print("== 6. repair_section targeted fixes ==")
overflow = ("## Big\n\n" + "word " * 4000 + "\n\n## Frequently Asked Questions\n\n"
            + "".join(f"### Q{i}?\n\nA {i}.\n\n" for i in range(1, 9))
            + "\n## Final Verdict\n\n" + "v " * 150)
before = gates.wc(overflow)
b2, m2 = modules.repair_section("kw", strategy, overflow, meta_ok, ["word_count"], "stub")
check("overflow repair shrinks the article", gates.wc(b2) < before,
      f"{before} -> {gates.wc(b2)} (calls={CALLS['n']})")
check("repair did NOT touch FAQ", b2.count("### Q") >= 8)

b3, m3 = modules.repair_section("kw", strategy, good, "short", ["meta_window"], "stub")
check("meta repair leaves body intact", b3 == good)

print("== 7. max_tokens ceiling wired into write_article ==")
check("write_article caps max_tokens ≤ 8192 and from window",
      all(mt is None or mt <= 8192 for mt in CALLS["max_tokens"]))

print()
if FAILURES:
    print("SMOKE FAILED:", FAILURES)
    sys.exit(1)
print("SMOKE OK — all checks passed")
