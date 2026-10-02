#!/usr/bin/env python3
"""agents_v2 eval harness import/structure tests (no network, no key).

Owner decision 2026-10-02: BEFORE any workflow dispatch, the WHOLE runner
must cross every path — import → execution → publisher — locally with a
mock provider and a simulated SearXNG, without NameError/ImportError.
That dry-run lives here (inside the existing CI test suite) as
TestImportSmoke + TestDryRun, so CI catches this bug class pre-dispatch.
(Evidence: smoke run 36953360333 crashed on a name the import check could
not see — `call_json` used by verbatim #450 code but never imported.)
"""
import ast
import builtins
import contextlib
import importlib
import io
import json
import os
import sys
import tempfile
import threading
import unittest
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))

from test_agents_v2_agents import FakeChat, _good_article_body  # noqa: E402

from agents_v2 import eval as _eval_pkg  # noqa: E402,F401  (package import)
from agents_v2.eval import pipeline_a, run_eval  # noqa: E402


class TestEvalHarness(unittest.TestCase):
    def test_pipeline_a_imports_and_exposes_run_a(self):
        # imports llm_router chain (no network at import time)
        from agents_v2.eval import pipeline_a
        self.assertTrue(callable(pipeline_a.run_a))
        self.assertTrue(callable(pipeline_a.repair_section))
        self.assertTrue(callable(pipeline_a.write_article))

    def test_run_eval_imports_and_topics_are_ten(self):
        from agents_v2.eval import run_eval
        self.assertEqual(len(run_eval.TOPICS), 10)
        self.assertEqual(len(set(run_eval.TOPICS)), 10,
                         "the 10 topics must be distinct (same set for both arms)")

    def test_topics_file_matches_spec(self):
        p = Path(__file__).resolve().parent / "agents_v2" / "eval" / "topics.json"
        data = json.loads(p.read_text())
        self.assertIn("_note", data)
        self.assertEqual(len(data["topics"]), 10)

    def test_gates_local_matches_450_window(self):
        from agents_v2.gates_local import FAQ_MIN_QUESTIONS, WORD_MAX, WORD_MIN
        self.assertEqual((WORD_MIN, WORD_MAX), (2550, 3100))
        self.assertEqual(FAQ_MIN_QUESTIONS, 8)


# ── owner decision 1: import smoke for the WHOLE runner ─────────────────────
_ALLOWED_GLOBALS = set(dir(builtins)) | {
    "__name__", "__file__", "__doc__", "__package__", "__spec__",
    "__debug__", "__builtins__", "__future__", "__class__", "__qualname__",
    "self", "cls",
}


def _bound_names(tree) -> set:
    """Every name bound anywhere in `tree` (conservative: Store/Del, imports,
    args, global/nonlocal, except-as, comprehension targets, walrus, and
    def/class names — which are NOT Name-Store nodes in the AST)."""
    bound = set()
    for node in ast.walk(tree):
        if isinstance(node, ast.Name) and isinstance(node.ctx, (ast.Store, ast.Del)):
            bound.add(node.id)
        elif isinstance(node, (ast.FunctionDef, ast.AsyncFunctionDef,
                               ast.ClassDef)):
            bound.add(node.name)
        elif isinstance(node, (ast.Import, ast.ImportFrom)):
            for a in node.names:
                bound.add((a.asname or a.name).split(".")[0])
        elif isinstance(node, ast.arg):
            bound.add(node.arg)
        elif isinstance(node, (ast.Global, ast.Nonlocal)):
            bound.update(node.names)
        elif isinstance(node, ast.ExceptHandler) and node.name:
            bound.add(node.name)
    return bound


class TestImportSmoke(unittest.TestCase):
    """Catches the smoke-36953360333 bug class BEFORE any dispatch: a name
    referenced by runner code but never bound anywhere in its module
    (e.g. `call_json` used without import) is a guaranteed NameError the
    first time that code path runs in production."""

    ALL_MODULES = (
        "agents_v2.llm_provider", "agents_v2.tools", "agents_v2.schemas",
        "agents_v2.gates_local", "agents_v2.publisher", "agents_v2.agents",
        "agents_v2.model_fit", "agents_v2.eval", "agents_v2.eval.claims",
        "agents_v2.eval.pipeline_a", "agents_v2.eval.run_eval",
    )

    def test_every_runner_module_imports(self):
        for m in self.ALL_MODULES:
            importlib.import_module(m)

    def test_no_unresolved_names_in_runner_modules(self):
        root = Path(__file__).resolve().parent / "agents_v2"
        bad = []
        for py in sorted(root.rglob("*.py")):
            tree = ast.parse(py.read_text(encoding="utf-8"), filename=str(py))
            module_bound = _bound_names(tree) | _ALLOWED_GLOBALS
            for fn in ast.walk(tree):
                if not isinstance(fn, (ast.FunctionDef, ast.AsyncFunctionDef)):
                    continue
                local = _bound_names(fn)
                for sub in ast.walk(fn):
                    if (isinstance(sub, ast.Name)
                            and isinstance(sub.ctx, ast.Load)
                            and sub.id not in local
                            and sub.id not in module_bound):
                        bad.append(f"{py.name}:{sub.lineno} name {sub.id!r} "
                                   f"in {fn.name}()")
        self.assertEqual(bad, [],
                         "unresolved names → guaranteed NameError at runtime:\n"
                         + "\n".join(bad))


# ── owner decision 1: FULL local dry-run, both arms, mock provider + ─────────
# ── simulated SearXNG, every path import → execution → publisher ─────────────
class _FakeSearXNG:
    """Simulated SearXNG over REAL localhost HTTP (same shape as the CI
    service container): /search?format=json returns rows; any other path
    returns a small HTML page (so fetch_page's allowlisted hosts resolve)."""

    def __init__(self):
        outer = self

        class H(BaseHTTPRequestHandler):
            def do_GET(self):
                if "/search" in self.path:
                    body = json.dumps({"results": [
                        {"title": "Best tab managers compared",
                         "url": "https://developer.chrome.com/docs/tabs",
                         "content": "The 2026 ranked top tab managers save "
                                    "40% RAM with suspension rules."},
                        {"title": "Tab suspension guide",
                         "url": "https://developer.mozilla.org/docs/tabs",
                         "content": "Chrome can suspend tabs after 2 hours."},
                        {"title": "Tab manager",
                         "url": "https://en.wikipedia.org/wiki/Tab_manager",
                         "content": "A tab manager is a browser extension."},
                    ]}).encode()
                else:
                    body = (b"<html><body><h1>Docs</h1><p>Real page content "
                            b"about tab managers.</p></body></html>")
                self.send_response(200)
                self.send_header("Content-Type",
                                 "application/json" if b"{" == body[:1]
                                 else "text/html")
                self.send_header("Content-Length", str(len(body)))
                self.end_headers()
                self.wfile.write(body)

            def log_message(self, *a):  # silence test output
                pass

        self._srv = ThreadingHTTPServer(("127.0.0.1", 0), H)
        self.url = f"http://127.0.0.1:{self._srv.server_address[1]}"
        self._thread = threading.Thread(target=self._srv.serve_forever,
                                        daemon=True)

    def __enter__(self):
        self._thread.start()
        return self

    def __exit__(self, *exc):
        self._srv.shutdown()
        self._srv.server_close()
        return False


_META = ("Best tab manager chrome extension guide with RAM control, "
         "suspend rules, instant tab search and sync, tested hands-on "
         "with a clear final verdict.")
assert 120 <= len(_META) <= 160 and '"' not in _META


def _article_with_h1() -> str:
    return "# Best Tab Manager Chrome Extension — Tested Guide\n\n" \
           + _good_article_body()


def _article_without_faq() -> str:
    """Gated article with the FAQ section removed → fails exactly faq8."""
    raw = _article_with_h1()
    i = raw.find("## Frequently Asked Questions")
    j = raw.find("## Final Verdict")
    assert 0 < i < j
    return raw[:i] + raw[j:]


def _faq_section() -> str:
    return ("## Frequently Asked Questions\n\n" + "\n\n".join(
        f"### Question {i}?\nA: Honest answer with tested specifics and a "
        f"concrete example you can follow today."
        for i in range(1, 9)))


class FakeRouterCall:
    """Stands in for llm_router.call — arm A's provider boundary. Branches on
    the system prompt exactly like the real call graph: connectivity probe,
    call_json (competitor vs strategy), meta, section regen, article."""

    def __init__(self, write_returns=None):
        self.calls = []
        self.write_returns = list(write_returns or [])

    def __call__(self, system, user, model_name=None, *args, **kw):
        self.calls.append((system, user, model_name))
        if "connectivity check" in system:
            return "OK"
        if "Return only valid JSON" in system:  # call_json internals
            if user.lstrip().startswith(("Live SERP rows",
                                         "Analyze the competitive landscape")):
                return json.dumps({
                    "common_sections": ["Introduction", "Top Picks",
                                        "Comparison", "Installation",
                                        "FAQ", "Verdict"],
                    "missing_gaps": ["memory impact numbers"],
                    "content_length_avg": "2800",
                    "seo_patterns": ["tables", "FAQ"],
                    "weaknesses": ["thin intros"],
                    "why_they_rank": "depth"})
            return json.dumps({
                "ideal_length": 2700,
                "required_sections": ["Why It Matters", "Top Picks",
                                      "Comparison", "Installation Tips",
                                      "Privacy Notes", "Performance"],
                "section_budgets": [],
                "must_have_elements": ["table", "FAQ"],
                "unique_angle": "tested RAM numbers",
                "strategy": "strategic",
                "reasoning": "balanced depth"})
        if "meta descriptions" in system:
            return _META
        if "rewrite ONE section" in system:
            return (_faq_section() if not self.write_returns
                    else self.write_returns.pop(0))
        # article write (stream=True)
        return (_article_with_h1() if not self.write_returns
                else self.write_returns.pop(0))


class TestDryRun(unittest.TestCase):
    """The owner-mandated pre-dispatch dry-run, permanent in CI:
    mock provider + simulated SearXNG, both arms, full path to publisher."""

    def _patch_a_provider(self, fake):
        """Patch arm A's provider boundary EXACTLY like run_eval._eval_a's
        metering wrapper does: llm_router.call (probe + call_json internals)
        AND pipeline_a.call (direct article/meta/repair calls) — the direct
        reference in pipeline_a's namespace is a separate binding."""
        import llm_router
        orig = llm_router.call
        llm_router.call = fake
        pipeline_a.call = fake
        self.addCleanup(setattr, llm_router, "call", orig)
        self.addCleanup(setattr, pipeline_a, "call", orig)

    def setUp(self):
        os.environ["CLEANAPIS_KEY"] = "dummy-test-key-never-real"
        # llm_router.API_KEYS is built at import time (cached) — the env var
        # above is not enough when another test module imported llm_router
        # first. Patch the router's key table directly (never a real key).
        import llm_router
        self._orig_keys = dict(llm_router.API_KEYS)
        llm_router.API_KEYS["cleanapis"] = "dummy-test-key-never-real"
        self.addCleanup(llm_router.API_KEYS.update,
                        {k: "" for k in llm_router.API_KEYS})
        self.addCleanup(llm_router.API_KEYS.update, self._orig_keys)
        self._sx = _FakeSearXNG()
        self._sx.__enter__()
        self.addCleanup(self._sx.__exit__, None, None, None)

    def _set_env(self, **kv):
        for k, v in kv.items():
            os.environ[k] = v
            self.addCleanup(os.environ.pop, k, None)

    def test_fetch_serp_reads_both_env_vars(self):
        # the smoke-36953360333 bug: arm A read only SEARXNG_URL while the
        # workflow exports SEARXNG_BASE_URL → connection refused on :8888
        self._set_env(SEARXNG_BASE_URL=self._sx.url)
        os.environ.pop("SEARXNG_URL", None)
        rows = pipeline_a._fetch_serp("best tab manager chrome extension")
        self.assertGreaterEqual(len(rows), 3)
        self.assertIn("url", rows[0])
        # explicit override still wins (historical var)
        self._set_env(SEARXNG_URL=self._sx.url)
        rows = pipeline_a._fetch_serp("probe")
        self.assertGreaterEqual(len(rows), 3)

    def test_dry_run_arm_a_happy_path_all_provider_branches(self):
        self._set_env(SEARXNG_URL=self._sx.url,
                      SEARXNG_BASE_URL=self._sx.url)
        fake = FakeRouterCall()
        self._patch_a_provider(fake)
        res = pipeline_a.run_a("best tab manager chrome extension",
                               articles_written=0)
        self.assertTrue(res["ok"], res["stats"].get("stop_reason"))
        self.assertTrue(res["gates"]["pass"])
        self.assertGreaterEqual(res["gates"]["words"], 2550)
        systems = [c[0] for c in fake.calls]
        self.assertTrue(any("connectivity check" in s for s in systems),
                        "find_working_model probe must be crossed")
        self.assertTrue(any("Return only valid JSON" in s for s in systems),
                        "call_json path (competitor+strategy) must be crossed")
        self.assertTrue(any("meta descriptions" in s for s in systems))
        # call_json internals actually routed through the fake
        self.assertTrue(res["gates"]["h2"] >= 6)

    def test_dry_run_arm_a_repair_path_reaches_gates_local(self):
        # crosses repair_section (the `import gates as G` ModuleNotFoundError
        # class) → deterministic fixes → one targeted regen call → PASS
        self._set_env(SEARXNG_URL=self._sx.url)
        fake = FakeRouterCall(
            write_returns=[_article_without_faq(), _faq_section()])
        self._patch_a_provider(fake)
        res = pipeline_a.run_a("best tab manager chrome extension",
                               articles_written=0)
        self.assertTrue(res["ok"], res["stats"].get("stop_reason"))
        self.assertEqual(res["stats"]["repairs"], 1)
        systems = [c[0] for c in fake.calls]
        self.assertTrue(any("rewrite ONE section" in s for s in systems),
                        "targeted repair call must be crossed")

    def test_dry_run_run_eval_main_end_to_end_both_arms(self):
        """THE dry-run: run_eval.main() in-process — imports, harness SERP
        reference fetch, metering, arm A (probe+JSON+write+meta), arm B
        (orchestrator→researchers→writer→gates→critic), publisher artifacts,
        blind pair + fingerprint, decision rule. Zero network beyond the
        simulated SearXNG."""
        self._set_env(SEARXNG_URL=self._sx.url,
                      SEARXNG_BASE_URL=self._sx.url)
        import llm_router
        from agents_v2 import llm_provider
        fake_router = FakeRouterCall()
        fake_chat = FakeChat()
        orig_router, orig_chat = llm_router.call, llm_provider.chat

        def _chat(role, system, messages, tools=None, max_tokens=1024,
                  ledger=None, model=None):
            return fake_chat(role, system, messages, max_tokens, ledger,
                             model=model)

        llm_router.call = fake_router
        llm_provider.chat = _chat
        try:
            with tempfile.TemporaryDirectory() as td:
                sys.argv = ["run_eval.py", "--mode", "smoke",
                            "--max-calls", "60", "--max-cost-usd", "2",
                            "--out", td]
                buf = io.StringIO()
                with contextlib.redirect_stdout(buf):
                    rc = run_eval.main()
                self.assertEqual(rc, 0, buf.getvalue()[-2000:])
                out = Path(td)
                results = json.loads((out / "results.json").read_text())
                self.assertEqual(len(results["per_topic"]), 1)
                rec = results["per_topic"][0]
                a, b = rec["A"], rec["B"]
                self.assertTrue(a["gates_pass"], a["stop_reason"])
                self.assertTrue(b["gates_pass"], b["stop_reason"])
                # honest metering: probe + 2×call_json + article + meta = 5
                self.assertEqual(a["llm_calls"], 5,
                                 "every arm-A provider call counted exactly "
                                 "once (no double counting, no misses)")
                # owner decision 4 counters present for BOTH arms
                for arm in (a, b):
                    self.assertGreaterEqual(arm["claims_total"], 0)
                    self.assertGreaterEqual(arm["claims_numeric"], 0)
                    self.assertGreaterEqual(arm["claims_sourced"], 0)
                    self.assertGreaterEqual(arm["unsupported_claims"], 0)
                self.assertGreaterEqual(rec["reference_results"], 3)
                # publisher artifacts exist, non-empty, both arms
                for arm_d in ("armA", "armB"):
                    for f in ("candidate.md", "metrics.json", "claims.json"):
                        p = out / f"topic_00" / arm_d / f
                        self.assertGreater(p.stat().st_size, 0, str(p))
                self.assertFalse(json.loads(
                    (out / "topic_00" / "armB" / "report.json").read_text()
                )["published"])
                # blind pair + fingerprint (owner decision 3)
                blind = out / "blind"
                self.assertGreater((blind / "pair_00.md").stat().st_size, 0)
                self.assertIn("Candidate 1", (blind / "pair_00.md").read_text())
                key = (blind / "key.txt").read_text()
                self.assertGreater(len(key.strip()), 64)
                self.assertNotIn("first=A", key)  # mapping NOT stored
        finally:
            llm_router.call, llm_provider.chat = orig_router, orig_chat


if __name__ == "__main__":
    unittest.main(verbosity=2)
