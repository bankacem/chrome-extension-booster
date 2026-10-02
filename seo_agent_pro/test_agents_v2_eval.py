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
        from agents_v2 import agents as v2agents
        fake_router = FakeRouterCall()
        fake_chat = FakeChat()
        orig_router, orig_default = llm_router.call, v2agents._default_chat

        # patch ABOVE the profile→role mapping (arm B's single provider
        # choke point is agents._default_chat → llm_provider.chat): the fake
        # dispatches on agent PROFILE names, which _default_chat receives.
        def _fake_default(role, system, messages, max_tokens, ledger,
                          model=None):
            return fake_chat(role, system, messages, max_tokens, ledger,
                             model=model)

        llm_router.call = fake_router
        v2agents._default_chat = _fake_default
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
                self.assertEqual(results["attempts_per_arm_per_topic"], 3)
                rec = results["per_topic"][0]
                a, b = rec["A"], rec["B"]
                # fair 3-attempt loop: first attempt passes → used = 1
                self.assertTrue(a["success"], a["attempts"][0]["stop_reason"])
                self.assertTrue(b["success"], b["attempts"][0]["stop_reason"])
                self.assertEqual(a["attempts_used"], 1)
                self.assertEqual(b["attempts_used"], 1)
                self.assertTrue(a["first_attempt_success"])
                self.assertTrue(a["article_attempt"] == 1)
                # honest metering: probe + 2×call_json + article + meta = 5
                self.assertEqual(a["attempts"][0]["llm_calls"], 5,
                                 "every arm-A provider call counted exactly "
                                 "once (no double counting, no misses)")
                self.assertEqual(a["total_llm_calls"], 5)
                # owner decision 4 counters present for BOTH arms
                for arm in (a, b):
                    att = arm["attempts"][0]
                    self.assertGreaterEqual(att["claims_total"], 0)
                    self.assertGreaterEqual(att["claims_numeric"], 0)
                    self.assertGreaterEqual(att["claims_sourced"], 0)
                    self.assertGreaterEqual(att["unsupported_claims"], 0)
                self.assertGreaterEqual(rec["reference_results"], 3)
                # publisher artifacts exist, non-empty, both arms (per attempt)
                for arm_d in ("armA", "armB"):
                    for f in ("candidate.md", "metrics.json", "claims.json"):
                        p = out / "topic_00" / arm_d / "attempt1" / f
                        self.assertGreater(p.stat().st_size, 0, str(p))
                self.assertFalse(json.loads(
                    (out / "topic_00" / "armB" / "attempt1" / "report.json")
                    .read_text())["published"])
                # arm B journal always dumped (partial-usage audit trail)
                self.assertGreater(
                    (out / "topic_00" / "armB" / "attempt1" / "journal.jsonl")
                    .stat().st_size, 0)
                # blind pair + fingerprint (owner decision 3)
                blind = out / "blind"
                self.assertGreater((blind / "pair_00.md").stat().st_size, 0)
                self.assertIn("Candidate 1", (blind / "pair_00.md").read_text())
                key = (blind / "key.txt").read_text()
                self.assertGreater(len(key.strip()), 64)
                self.assertNotIn("first=A", key)  # mapping NOT stored
                # decision rule (REVISED 2026-10-02; premise guard kept)
                dec = results["decision"]
                self.assertEqual(dec["premise"],
                                 "both arms produced >=1 successful article")
                self.assertEqual(dec["successes_A"], 1)
                self.assertEqual(dec["successes_B"], 1)
                self.assertIsInstance(dec["adopt_B"], bool)
                self.assertEqual(
                    dec["rule"],
                    "adopt B iff success_within_3_attempts(B)>="
                    "success_within_3_attempts(A) AND unsupported_claims(B)"
                    "<=0.60*unsupported_claims(A) AND "
                    "cost_per_successful_article(B)<=8*"
                    "cost_per_successful_article(A)")
        finally:
            llm_router.call = orig_router
            v2agents._default_chat = orig_default

    def test_decision_guard_null_when_arm_produces_no_article(self):
        """Smoke run 36990401835 emitted adopt_B=true on ZERO data (both
        arms stopped at a provider 502). The premise guard must make the
        rule NOT applicable when either arm produced no article — the
        thresholds stay untouched. Here arm A's connectivity probe fails
        for every candidate (the 502 pattern), arm B succeeds: the runner
        must complete, record A's stop_reason, and yield adopt_B=null."""
        self._set_env(SEARXNG_URL=self._sx.url,
                      SEARXNG_BASE_URL=self._sx.url)
        import llm_router
        from agents_v2 import agents as v2agents

        def _dead_probe(candidates, test_prompt="Reply with exactly: OK"):
            raise RuntimeError(
                f"No working model found among candidates: {candidates}\n"
                "  - probe: HTTP Error 502: Bad Gateway (simulated outage)")

        fake_router = FakeRouterCall()
        fake_chat = FakeChat()
        orig_router, orig_default = llm_router.call, v2agents._default_chat
        orig_fwm = pipeline_a.find_working_model

        def _fake_default(role, system, messages, max_tokens, ledger,
                          model=None):
            return fake_chat(role, system, messages, max_tokens, ledger,
                             model=model)

        llm_router.call = fake_router
        v2agents._default_chat = _fake_default
        pipeline_a.find_working_model = _dead_probe
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
                rec = results["per_topic"][0]
                # arm A: all 3 fair attempts ran and failed; reason recorded
                self.assertEqual(rec["A"]["attempts_used"], 3)
                self.assertFalse(rec["A"]["success"])
                self.assertIsNone(rec["A"]["article_attempt"])
                for att in rec["A"]["attempts"]:
                    self.assertEqual(att["words"], 0)
                    self.assertIn("No working model", att["stop_reason"])
                # arm B: real article on attempt 1
                self.assertTrue(rec["B"]["success"])
                self.assertEqual(rec["B"]["attempts_used"], 1)
                self.assertGreater(rec["B"]["attempts"][0]["words"], 0)
                dec = results["decision"]
                self.assertEqual(dec["successes_A"], 0)
                self.assertEqual(dec["successes_B"], 1)
                self.assertIn("NOT MET", dec["premise"])
                self.assertIn("arm A: 0 successful articles", dec["premise"])
                self.assertIsNone(dec["adopt_B"])
                self.assertIsNone(dec["recommendation"])
                # thresholds/rule string = the REVISED owner rule (2026-10-02)
                self.assertEqual(
                    dec["rule"],
                    "adopt B iff success_within_3_attempts(B)>="
                    "success_within_3_attempts(A) AND unsupported_claims(B)"
                    "<=0.60*unsupported_claims(A) AND "
                    "cost_per_successful_article(B)<=8*"
                    "cost_per_successful_article(A)")
        finally:
            llm_router.call = orig_router
            v2agents._default_chat = orig_default
            pipeline_a.find_working_model = orig_fwm


class TestSmokeRun15Regressions(unittest.TestCase):
    """Smoke run 36998949240 (first run where cleanapis actually responded):
    arm B died on `unknown role 'WRITER'` (profile names passed as provider
    roles) and arm A died on `no usable content` (empty-retry cap 8000 is
    BELOW the article call's own max_tokens 8192 — the 'doubled' retry
    shrank the budget). Neither is reachable through the mock-provider
    dry-run (FakeChat replaces _default_chat / llm_router.call), so these
    tests pin the two seams directly."""

    def test_profile_to_role_mapping_covers_all_profiles(self):
        from agents_v2.agents import PROFILES, _PROFILE_TO_ROLE
        from agents_v2 import llm_provider
        roles = llm_provider.load_config()["roles"]
        for name in PROFILES:
            self.assertIn(name, _PROFILE_TO_ROLE,
                          f"profile {name!r} missing from _PROFILE_TO_ROLE")
            self.assertIn(_PROFILE_TO_ROLE[name], roles,
                          f"profile {name!r} maps to unknown role")
        self.assertNotEqual(
            roles[_PROFILE_TO_ROLE["CRITIC"]]["model"],
            roles[_PROFILE_TO_ROLE["WRITER"]]["model"],
            "critic must run a different model than the writer")

    def test_default_chat_routes_profiles_to_provider_roles(self):
        from agents_v2 import agents, llm_provider
        seen = []

        def fake_chat(role, system, messages, tools=None, max_tokens=1,
                      ledger=None, model=None):
            seen.append(role)

            class R:
                pass
            r = R()
            r.usage = {"input_tokens": 1, "output_tokens": 1,
                       "estimated": False}
            r.stop_reason = "stop"
            r.model = model or "fake-model"
            r.latency_seconds = 0.001
            r.text = "{}"
            return r

        orig = llm_provider.chat
        llm_provider.chat = fake_chat
        try:
            for profile, expected in (("WRITER", "WORKER"),
                                      ("RESEARCHER", "WORKER"),
                                      ("ORCHESTRATOR", "ORCHESTRATOR"),
                                      ("CRITIC", "CRITIC")):
                agents._default_chat(profile, "s", [{"role": "user",
                                                     "content": "x"}],
                                     16, ledger=None)
                self.assertEqual(seen[-1], expected)
        finally:
            llm_provider.chat = orig

    def test_cleanapis_empty_retry_never_shrinks_budget(self):
        import urllib.error as ue
        import llm_router

        payloads = []

        class _Resp:
            def __enter__(self):
                return self

            def __exit__(self, *a):
                return False

            def read(self):
                # attempt 1: empty content (reasoning drained the budget);
                # attempt 2: usable content
                return json.dumps({"choices": [{"message": {"content":
                    "" if len(payloads) == 1 else "OK"}}]}).encode()

        def fake_urlopen(req, timeout=0):
            payloads.append(json.loads(req.data.decode()))
            return _Resp()

        orig_urlopen = llm_router.urllib.request.urlopen
        llm_router.urllib.request.urlopen = fake_urlopen
        try:
            out = llm_router._call_cleanapis(
                "deepseek-v4-pro-0813", "sys", "user",
                stream=False, max_tokens=8192)
            self.assertEqual(out, "OK")
            self.assertEqual(payloads[0]["max_tokens"], 8192)
            # THE regression: retry must RAISE the budget (16384), and never
            # shrink below the original request (run 15 bug: 8000 < 8192)
            self.assertEqual(payloads[1]["max_tokens"], 16384)
            self.assertGreaterEqual(payloads[1]["max_tokens"],
                                    payloads[0]["max_tokens"])
        finally:
            llm_router.urllib.request.urlopen = orig_urlopen

    def test_article_write_requests_reasoning_headroom(self):
        # arm A's article call must not repeat run 15's 8192 ceiling; the
        # word ceiling is enforced by gates (2550-3100), not by max_tokens.
        import inspect
        from agents_v2.eval import pipeline_a
        src = inspect.getsource(pipeline_a)
        self.assertIn("max_tokens=16384", src,
                      "article write must request 16384 reasoning headroom")
        self.assertNotIn("max_tokens=min(8192", src)


class TestSmokeRun16Regressions(unittest.TestCase):
    """Smoke run 37003663375 (first run where BOTH arms got real replies):
    arm A — stream=True returned EMPTY content twice even at 16384 tokens
    (cleanapis buffers the reasoning phase; gateway idle-cuts the silent
    stream). Verified live: same model returns 1389 words non-streamed in
    ~30s. Arm B — orchestrator max_tokens=500 truncated claude-sonnet-5's
    JSON mid-object (live probe: 439 completion tokens, non-deterministic)."""

    def test_long_generation_calls_are_non_stream(self):
        import inspect
        from agents_v2.eval import pipeline_a
        src = inspect.getsource(pipeline_a)
        # article write + section regen must not use the silently-cut stream
        self.assertIn("stream=False,\n                      max_tokens=16384", src)
        self.assertNotIn("stream=True,", src,
                         "no call may pass stream=True against cleanapis "
                         "(silent reasoning phase → gateway cut)")

    def test_json_call_sites_have_parse_headroom(self):
        import inspect
        from agents_v2 import agents
        src = inspect.getsource(agents)
        self.assertIn("1500, ledger, journal, \"plan\")", src,
                      "orchestrator JSON needs >500 headroom")
        self.assertIn("1500, ledger, journal, \"research_notes\"", src)
        self.assertIn("2000, ledger, journal, \"critique\"", src)


class TestSmokeRun17Regressions(unittest.TestCase):
    """Smoke run 37007468686: arm B lost a FULL draft (every prior call OK)
    because the writer's meta_description came back 161+ chars against the
    strict schema maxLength=160. Arm A lost a FINISHED article (metering
    ~11k tokens incl. the article) to a small 200-token meta call whose
    empty-content ValueError was not caught by run_a's meta loop."""

    def test_writer_meta_schema_lenient_and_code_clamp(self):
        from agents_v2.agents import PROFILES, _clamp_meta
        meta_schema = (PROFILES["WRITER"]["output_schema"]["properties"]
                       ["meta_description"])
        self.assertGreaterEqual(meta_schema["maxLength"], 400,
                                "capture schema must not reject 161+ chars")
        long_meta = ("Best tab manager chrome extension guide with tested RAM "
                     "control, suspend rules, instant search and sync — hands "
                     "on verdict with clear recommendations for every user.")
        self.assertGreater(len(long_meta), 160)
        clamped = _clamp_meta(long_meta)
        self.assertLessEqual(len(clamped), 160)
        self.assertFalse(clamped.endswith((" ", ",", ";", ":", "-")))
        self.assertEqual(_clamp_meta("short but fine meta description here"),
                         "short but fine meta description here")

    def test_cleanapis_empty_retry_has_third_attempt(self):
        import llm_router
        payloads = []

        class _Resp:
            def __enter__(self):
                return self

            def __exit__(self, *a):
                return False

            def read(self):
                n = len(payloads)
                content = "" if n < 3 else "OK"
                return json.dumps({"choices": [{"message": {
                    "content": content}}]}).encode()

        def fake_urlopen(req, timeout=0):
            payloads.append(json.loads(req.data.decode()))
            return _Resp()

        orig = llm_router.urllib.request.urlopen
        llm_router.urllib.request.urlopen = fake_urlopen
        try:
            out = llm_router._call_cleanapis(
                "deepseek-v4-pro-0813", "sys", "user",
                stream=False, max_tokens=200)
            self.assertEqual(out, "OK")
            self.assertEqual(len(payloads), 3, "third attempt must exist")
            self.assertEqual([p["max_tokens"] for p in payloads],
                             [200, 400, 800])
        finally:
            llm_router.urllib.request.urlopen = orig

    def test_run_a_meta_and_regen_tolerate_empty_content(self):
        import inspect
        from agents_v2.eval import pipeline_a
        src = inspect.getsource(pipeline_a)
        self.assertGreaterEqual(src.count("except ValueError"), 3,
                                "meta loop, _regen and repair-meta call sites "
                                "must handle empty-content ValueError")


class TestSmokeRun18Regressions(unittest.TestCase):
    """Smoke run #18 (37013258655): arm A WROTE the article (14 calls, 18.3k
    tokens) and lost it at 3176 words vs the 3100 ceiling after 2 repairs —
    the regen model cannot count words. Arm B lost calls to non-
    deterministic prose replies (no JSON at all)."""

    def test_trim_to_word_ceiling_drops_content_sentences_only(self):
        from agents_v2.eval.pipeline_a import _trim_to_word_ceiling
        filler = ("This tested paragraph explains the memory impact numbers "
                  "with concrete figures and practical steps for users. ")
        body = ("# Guide\n\nIntro text.\n\n"
                "## Long Content Section\n\n" + filler * 195 + "\n\n"
                "## Frequently Asked Questions\n\n### Q1?\nA: Answer one.\n\n"
                "## Final Verdict\n\n" + filler * 5)
        over = len(body.split())
        self.assertGreater(over, 3100)
        out, trimmed = _trim_to_word_ceiling(body, 3100)
        self.assertLessEqual(len(out.split()), 3100)
        self.assertGreater(trimmed, 0)
        # gated structural pieces untouched
        self.assertIn("## Frequently Asked Questions", out)
        self.assertIn("## Final Verdict", out)
        self.assertIn("### Q1?", out)

    def test_trim_caps_at_max_sentences(self):
        from agents_v2.eval.pipeline_a import _trim_to_word_ceiling
        filler = ("Sentence with enough words to matter for counting here. ")
        body = "## Content\n\n" + filler * 400 + "\n"  # far over any ceiling
        out, trimmed = _trim_to_word_ceiling(body, 100, max_sentences=5)
        self.assertEqual(trimmed, 5)
        self.assertGreater(len(out.split()), 100)  # cap respected, still over

    def test_trim_default_has_no_15_sentence_cap(self):
        """Smoke #22: arm A attempt 2 finished 53 words over the ceiling and
        was DISCARDED because the old 15-sentence cap (short sentences!) made
        the deterministic trim ineffective. Default must trim until under the
        ceiling (explicit caps still honored)."""
        from agents_v2.eval.pipeline_a import _trim_to_word_ceiling
        short = "Two word detail. "          # 3 tokens/sentence, old-killer
        body = ("## Big Content Section\n\n" + short * 1200 + "\n\n"
                "## Frequently Asked Questions\n\n### Q?\nA: x\n\n"
                "## Final Verdict\n\nVerdict stays here untouched.")
        self.assertGreater(len(body.split()), 3100)
        out, trimmed = _trim_to_word_ceiling(body, 3100)
        self.assertLessEqual(len(out.split()), 3100)
        self.assertGreater(trimmed, 15,
                           "must exceed the old cap — that is the fix")
        self.assertIn("## Frequently Asked Questions", out)  # structural intact
        self.assertIn("Verdict stays here untouched.", out)

    def test_ask_retries_once_on_unparseable_reply(self):
        import json as _json
        from agents_v2.agents import Journal, PROFILES, _ask
        from agents_v2.schemas import SchemaError
        replies = ["I cannot produce JSON for this request, sorry.",
                   _json.dumps({"key_points": ["a", "b", "c"],
                                "sources": [{"url": "https://x.dev/docs/a",
                                             "note": "official"}]})]
        seen = []

        def chat_fn(profile, system, messages, max_tokens, ledger, model=None):
            seen.append(profile)
            text = replies.pop(0)

            class R:
                pass
            r = R()
            r.usage = {"input_tokens": 10, "output_tokens": 10,
                       "estimated": False}
            r.stop_reason = "stop"
            r.model = model or "fake"
            r.latency_seconds = 0.001
            r.text = text
            return r

        prof = PROFILES["RESEARCHER"]
        system = prof["description"]
        messages = [{"role": "user", "content": "x"}]
        data = _ask(chat_fn, "RESEARCHER", "", messages, 900, None,
                    Journal(), "research_notes")
        self.assertEqual(data["key_points"], ["a", "b", "c"])
        self.assertEqual(len(seen), 2, "exactly one retry after prose reply")
        # and two prose replies must still raise (owner: schema-invalid twice)
        replies2 = ["nope", "still no json"]
        seen.clear()

        def chat_fn2(profile, system, messages, max_tokens, ledger,
                     model=None):
            seen.append(profile)

            class R:
                pass
            r = R()
            r.usage = {"input_tokens": 10, "output_tokens": 10,
                       "estimated": False}
            r.stop_reason = "stop"
            r.model = "fake"
            r.latency_seconds = 0.001
            r.text = replies2.pop(0)
            return r

        with self.assertRaises((ValueError, SchemaError)):
            _ask(chat_fn2, "RESEARCHER", "", messages, 900, None,
                 Journal(), "research_notes")
        self.assertEqual(len(seen), 2)


class TestFairAttemptsAndCostAccounting(unittest.TestCase):
    """Owner decisions 2 + 4 (2026-10-02): fair 3-attempt loop for BOTH
    arms (stop at first all-gates-pass article, no softening) and PARTIAL
    usage accounting — a failed attempt's real provider consumption must
    be counted, never zeroed (the $0.05-vs-$1.23 accounting contradiction)."""

    def setUp(self):
        os.environ["CLEANAPIS_KEY"] = "dummy-test-key-never-real"
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

    def test_attempt_loop_stops_at_first_success_and_costs_accumulate(self):
        self._set_env(SEARXNG_URL=self._sx.url)
        # attempt 1: article + both regens come back WITHOUT the FAQ section
        # → gates fail after 2 targeted repairs (real provider calls spent);
        # attempt 2: FakeRouterCall falls back to the good article → PASS.
        # Attempt 3 must NEVER run.
        fake = FakeRouterCall(write_returns=[
            _article_without_faq(), _article_without_faq(),
            _article_without_faq()])
        import llm_router
        orig = llm_router.call
        llm_router.call = fake
        pipeline_a.call = fake
        self.addCleanup(setattr, llm_router, "call", orig)
        self.addCleanup(setattr, pipeline_a, "call", orig)
        from agents_v2.eval import run_eval
        with tempfile.TemporaryDirectory() as td:
            tdir = Path(td)
            arm = run_eval._run_arm(
                run_eval._eval_a, "best tab manager chrome extension", tdir,
                run_eval.ATTEMPTS, max_calls=40, max_usd=1.0, reference="")
            self.assertEqual(arm["attempts_used"], 2,
                             "stop at first success — attempt 3 must not run")
            self.assertFalse(arm["attempts"][0]["gates_pass"])
            self.assertIn("gates still failing",
                          arm["attempts"][0]["stop_reason"])
            self.assertTrue(arm["attempts"][1]["gates_pass"])
            self.assertTrue(arm["success"])
            self.assertFalse(arm["first_attempt_success"])
            self.assertEqual(arm["article_attempt"], 2)
            # FAILED attempt cost counts (owner decision 4)
            self.assertEqual(arm["total_llm_calls"],
                             arm["attempts"][0]["llm_calls"]
                             + arm["attempts"][1]["llm_calls"])
            self.assertGreater(arm["attempts"][0]["llm_calls"], 0)
            self.assertGreater(arm["total_usd_floor"], 0)
            self.assertEqual(arm["total_usd_floor"], round(
                arm["attempts"][0]["usd_floor"]
                + arm["attempts"][1]["usd_floor"], 4))
            # per-attempt artifacts: failed attempt keeps metrics, no body
            self.assertGreater((tdir / "armA" / "attempt1" / "metrics.json")
                               .stat().st_size, 0)
            self.assertFalse((tdir / "armA" / "attempt1" / "candidate.md")
                             .exists())
            self.assertGreater((tdir / "armA" / "attempt2" / "candidate.md")
                               .stat().st_size, 0)

    def test_arm_b_partial_usage_counted_on_error(self):
        """THE owner-ordered fix: arm B crashes mid-run AFTER real provider
        calls (plan succeeded, researcher call dies) — its partial usage
        must appear in metrics (previously 0 calls / $0 / tokens lost)."""
        self._set_env(SEARXNG_URL=self._sx.url,
                      SEARXNG_BASE_URL=self._sx.url)
        from agents_v2 import agents as v2agents
        from agents_v2.eval import run_eval

        calls = {"n": 0}

        def fake_default(profile, system, messages, max_tokens, ledger,
                         model=None):
            calls["n"] += 1
            if calls["n"] == 1:  # orchestrator plan succeeds (real usage)
                return FakeChat()(profile, system, messages, max_tokens,
                                  ledger, model=model)
            raise RuntimeError("boom: provider died mid-run (simulated)")

        orig = v2agents._default_chat
        v2agents._default_chat = fake_default
        self.addCleanup(setattr, v2agents, "_default_chat", orig)
        with tempfile.TemporaryDirectory() as td:
            tdir = Path(td)
            caps = v2agents.ArticleCaps(max_steps=16, max_tokens=400_000,
                                        max_usd_floor=1.0)
            m = run_eval._eval_b("best tab manager chrome extension", tdir,
                                 caps, reference="", attempt=1)
            self.assertFalse(m["gates_pass"])
            self.assertTrue(m["stop_reason"].startswith(
                "error: RuntimeError"), m["stop_reason"])
            # THE fix: partial consumption counted, not zeroed
            self.assertGreaterEqual(m["llm_calls"], 2,
                                    "plan + reserved researcher call counted")
            self.assertGreater(m["tokens_estimated"], 0,
                               "plan call's tokens must survive the error")
            # journal always dumped → per-call usage auditable after the fact
            self.assertGreater((tdir / "armB" / "attempt1" / "journal.jsonl")
                               .stat().st_size, 0)
            self.assertGreater((tdir / "armB" / "attempt1" / "metrics.json")
                               .stat().st_size, 0)

    # ── revised decision rule (pure unit, no provider) ──────────────────
    @staticmethod
    def _arm(succ_attempt, unsup, usd_total):
        # attempts_used mirrors the real loop: stops at first success,
        # otherwise burns all 3 fair attempts
        used = succ_attempt if succ_attempt else 3
        attempts = []
        for n in range(1, used + 1):
            attempts.append({
                "attempt": n, "gates_pass": n == succ_attempt,
                "words": 2800 if n == succ_attempt else 0,
                "unsupported_claims": unsup if n == succ_attempt else -1,
                "llm_calls": 5,
                "usd_floor": round(usd_total / used, 4)})
        return {"attempts": attempts, "attempts_used": used,
                "success": succ_attempt is not None,
                "first_attempt_success": succ_attempt == 1,
                "article_attempt": succ_attempt,
                "total_usd_floor": usd_total}

    def _results(self, a_specs, b_specs):
        out = []
        for (sa, ua, ca), (sb, ub, cb) in zip(a_specs, b_specs):
            out.append({"topic": "t", "reference_results": 8,
                        "A": self._arm(sa, ua, ca),
                        "B": self._arm(sb, ub, cb)})
        return out

    def test_decision_rule_revised_conditions(self):
        from agents_v2.eval import run_eval
        R = run_eval.build_decision
        # A wins topics 1 (att1) + 2 (att2), loses 3; B wins 1 + 2 on att1.
        # unsup: A 3+3=6, B 1+1=2 → ratio 0.333 ≤ 0.60;
        # cost/success: A $1.0/2=0.5, B $2.0/2=1.0 → ratio 2 ≤ 8 → ADOPT B.
        res = self._results([(1, 3, 0.5), (2, 3, 0.5), (None, 0, 0.0)],
                            [(1, 1, 1.0), (1, 1, 1.0), (None, 0, 0.0)])
        d = R(res, 3)
        self.assertTrue(d["adopt_B"])
        self.assertEqual(d["successes_A"], 2)
        self.assertEqual(d["successes_B"], 2)
        self.assertEqual(d["success_rate_A"], 0.667)
        self.assertEqual(d["first_attempt_rate_B"], 0.667)
        self.assertEqual(d["avg_attempts_A"], 2.0)
        self.assertEqual(d["avg_attempts_B"], 1.67)
        self.assertEqual(d["unsupported_claims_A"], 6)
        self.assertEqual(d["unsupported_claims_B"], 2)
        self.assertEqual(d["cost_per_successful_article_A"], 0.5)
        self.assertEqual(d["cost_per_successful_article_B"], 1.0)
        self.assertEqual(d["recommendation"], "ADOPT agents_v2 (B)")
        # same successes but B's unsupported claims NOT ≥40% lower → KEEP A
        res = self._results([(1, 3, 0.5), (2, 3, 0.5), (None, 0, 0.0)],
                            [(1, 4, 1.0), (1, 4, 1.0), (None, 0, 0.0)])
        d = R(res, 3)
        self.assertFalse(d["adopt_B"])
        self.assertEqual(d["recommendation"],
                         "KEEP A (improved pipeline); research agent may "
                         "remain an optional tool")
        # B wins FEWER topics than A → success condition fails alone
        res = self._results([(1, 5, 0.5), (1, 5, 0.5), (None, 0, 0.0)],
                            [(1, 0, 1.0), (None, 0, 0.0), (None, 0, 0.0)])
        d = R(res, 3)
        self.assertFalse(d["adopt_B"])
        # cost per successful article > 8× → KEEP A even when all else passes
        res = self._results([(1, 5, 0.5), (1, 5, 0.5), (None, 0, 0.0)],
                            [(1, 0, 4.5), (1, 0, 4.5), (None, 0, 0.0)])
        d = R(res, 3)
        self.assertFalse(d["adopt_B"])
        self.assertEqual(d["cost_ratio"], 9.0)
        # premise guard: A produced 0 successful articles → null decision
        res = self._results([(None, 0, 0.0), (None, 0, 0.0), (None, 0, 0.0)],
                            [(1, 0, 1.0), (None, 0, 0.0), (None, 0, 0.0)])
        d = R(res, 3)
        self.assertIsNone(d["adopt_B"])
        self.assertIsNone(d["recommendation"])
        self.assertIn("arm A: 0 successful articles", d["premise"])


class TestSmokeRun20Regressions(unittest.TestCase):
    """Smoke #20 (37034661195): arm B failed all 3 attempts on truncated
    full-article JSON (repair/write cut at exactly 8000 output tokens,
    stop_reason="length") AND the runner crashed in build_decision with
    TypeError (None/float) when arm B had 0 successes — results.json was
    never written. Two fixes: 16384 headroom on the 3 WRITER call sites
    (same class as #465/#466; arm A already uses 16384 successfully) and
    None-safe cost_ratio reporting."""

    def test_full_article_call_sites_have_16384_headroom(self):
        import inspect
        from agents_v2 import agents
        src = inspect.getsource(agents)
        # the ONLY full-article call left is write_full (16384 headroom);
        # repairs are section-scoped (6000, WRITER_SECTIONS) per design §4
        self.assertIn('16384, ledger, journal, "write_full")', src,
                      "write_full must request 16384-token headroom")
        self.assertIn('6000, ledger, journal, f"repair_{attempt}")', src,
                      "section repairs are small, scoped replies")
        self.assertIn('6000, ledger, journal, "critic_fix")', src)
        self.assertNotIn('8000, ledger, journal', src,
                         "no call site may stay at the 8000 killer")

    def test_decision_no_crash_when_arm_b_has_zero_successes(self):
        """The exact #20 crash: arm A succeeded, arm B failed 3/3 →
        cost_per_successful_article_B is None. build_decision must REPORT
        cost_ratio=None (undefined), keep adopt_B null via the premise
        guard, and never raise."""
        from agents_v2.eval import run_eval

        def arm(succ_attempt, unsup, usd_total):
            used = succ_attempt if succ_attempt else 3
            attempts = [{"attempt": n, "gates_pass": n == succ_attempt,
                         "words": 2800 if n == succ_attempt else 0,
                         "unsupported_claims":
                             unsup if n == succ_attempt else -1,
                         "llm_calls": 10,
                         "usd_floor": round(usd_total / used, 4)}
                        for n in range(1, used + 1)]
            return {"attempts": attempts, "attempts_used": used,
                    "success": succ_attempt is not None,
                    "first_attempt_success": succ_attempt == 1,
                    "article_attempt": succ_attempt,
                    "total_usd_floor": usd_total}

        results = [
            {"topic": "t", "reference_results": 8,
             "A": arm(1, 4, 0.0043), "B": arm(None, 0, 0.0436)}]
        d = run_eval.build_decision(results, 3)  # must NOT raise
        self.assertIsNone(d["adopt_B"])
        self.assertIsNone(d["recommendation"])
        self.assertIsNone(d["cost_ratio"])
        self.assertIsNone(d["cost_per_successful_article_B"])
        self.assertEqual(d["cost_per_successful_article_A"], 0.0043)
        self.assertEqual(d["total_usd_floor_B"], 0.0436,
                         "arm B's real partial spend must be reported")
        self.assertIn("arm B: 0 successful articles", d["premise"])
        # symmetric case: A has zero successes (previously covered by the
        # a_cps=None path, kept pinned)
        results = [{"topic": "t", "reference_results": 8,
                    "A": arm(None, 0, 0.0043), "B": arm(1, 4, 0.0436)}]
        d = run_eval.build_decision(results, 3)
        self.assertIsNone(d["adopt_B"])
        self.assertIsNone(d["cost_ratio"])


class TestSmokeRun21Regressions(unittest.TestCase):
    """Smoke #21 (37041655684): arm B failed all 3 attempts in repair_1 —
    the repair call used the FULL-article WRITER schema, so the model
    re-emitted the whole article as 9-16k tokens of JSON (truncated at
    16384 once, malformed-JSON 'Expecting value' otherwise). The owner's
    design §4 (and arm A's repair_section) prescribes SECTION-scoped
    repairs spliced back deterministically. This pins that shape."""

    def test_splice_sections_replaces_and_appends(self):
        from agents_v2.agents import _splice_sections
        body = ("Intro.\n\n## Top Picks\n\nOLD PICKS.\n\n"
                "## Frequently Asked Questions\n\n### Old?\nOld answer.\n\n"
                "## Final Verdict\n\nThe verdict text.")
        new_faq = ("## Frequently Asked Questions\n\n"
                   "### Q1?\nAnswer one with tested detail here.\n\n"
                   "### Q2?\nAnswer two with tested detail here.")
        out, n = _splice_sections(body, [
            {"heading": "Frequently Asked Questions", "markdown": new_faq}])
        self.assertEqual(n, 1)
        self.assertIn("### Q1?", out)
        self.assertNotIn("### Old?", out)
        self.assertIn("OLD PICKS.", out)          # untouched section
        self.assertIn("## Final Verdict", out)    # preserved terminator
        idx_faq = out.find("## Frequently Asked Questions")
        idx_verdict = out.find("## Final Verdict")
        self.assertLess(idx_faq, idx_verdict)
        # unknown heading → appended at the end (counted)
        out2, n2 = _splice_sections("## A\n\nAlpha.", [
            {"heading": "New Section", "markdown": "## New Section\n\nBeta."}])
        self.assertEqual(n2, 1)
        self.assertTrue(out2.rstrip().endswith("Beta."))
        # heading without '#' prefix is normalized
        out3, n3 = _splice_sections("## A\n\nAlpha.\n\n## B\n\nBravo.", [
            {"heading": "B", "markdown": "Fresh bravo content that is long "
                                         "enough for the schema checks."}])
        self.assertEqual(n3, 1)
        self.assertIn("## B\n\nFresh bravo", out3)

    def test_arm_b_repair_path_uses_section_scoped_reply(self):
        """Full arm-B flow where the draft fails faq8 and a WRITER_SECTIONS
        reply fixes it — the repair reply must NOT need the full-article
        schema (the smoke-#21 killer), and the splice must pass gates."""
        from agents_v2.agents import run_article, ArticleCaps
        raw = _article_with_h1()
        i = raw.find("## Frequently Asked Questions")
        j = raw.find("## Final Verdict")
        self.assertGreater(i, 0)
        self.assertGreater(j, i)
        bad_faq = ("## Frequently Asked Questions\n\n"
                   + "\n\n".join(f"### Only {k}?\nShort."
                                 for k in (1, 2, 3)))
        draft_body = raw[:i] + bad_faq + "\n\n" + raw[j:]
        fc = FakeChat(
            draft={"title": "Best Tab Manager Chrome Extension — Tested",
                   "meta_description": _META,
                   "body_markdown": draft_body},
            section_repairs=[{"sections": [
                {"heading": "Frequently Asked Questions",
                 "markdown": _faq_section()}]}])
        res = run_article("topic x", caps=ArticleCaps(max_steps=20),
                          chat_fn=fc, search_fn=_fake_search_proxy(),
                          fetch_fn=_fake_fetch_proxy())
        self.assertTrue(res["ok"], res["stop_reason"])
        self.assertEqual(res["stats"]["repairs"], 1)
        # the repair call profile is WRITER_SECTIONS, never full-article WRITER
        self.assertIn(("WRITER_SECTIONS", None), fc.calls)
        self.assertEqual(sum(1 for c in fc.calls if c[0] == "WRITER"), 1,
                         "exactly one full-article write; repairs are sections")
        # spliced FAQ present, verdict preserved
        self.assertIn("### Question 1?", res["body"])
        self.assertIn("## Final Verdict", res["body"])


def _fake_search_proxy():
    from test_agents_v2_agents import _fake_search
    return _fake_search


def _fake_fetch_proxy():
    from test_agents_v2_agents import _fake_fetch
    return _fake_fetch


class TestSmokeRun23Regressions(unittest.TestCase):
    """Smoke #23 (37056764493): WRITER_SECTIONS replies were SMALL and clean
    (3-4k tokens, stop_reason=stop) yet EVERY one failed with
    'Expecting value: line 1 column 2 (char 1)' — the model answered with
    RAW MARKDOWN (no JSON at all): extract_json's bracket scan hits the
    first markdown link '[text](url)' → candidate '[text]' → exactly this
    error. write_full replies ALWAYS parse because their user prompt ends
    with an explicit 'Produce JSON:' instruction. Fix: the same explicit
    instruction on repair/critic_fix prompts (arm-B fix 3/3 — final)."""

    def test_repair_prompts_demand_json_output(self):
        import inspect
        from agents_v2 import agents
        src = inspect.getsource(agents)
        self.assertEqual(src.count("Produce JSON: sections"), 2,
                         "repair AND critic_fix prompts must both demand "
                         "JSON output (write_full already does)")
        self.assertEqual(src.count("never raw markdown"), 2)


if __name__ == "__main__":
    unittest.main(verbosity=2)
