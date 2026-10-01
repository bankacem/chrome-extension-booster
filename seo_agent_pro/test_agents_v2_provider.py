#!/usr/bin/env python3
"""Unit tests for agents_v2.llm_provider — FAKE transport only (no network,
no key needed). Runs under `python3 -m unittest discover -s seo_agent_pro`
and CI (seo-quality.yml) without any external dependency.
"""
import json
import os
import sys
import unittest
from pathlib import Path
from unittest import mock

sys.path.insert(0, str(Path(__file__).resolve().parent))

from agents_v2 import llm_provider as lp  # noqa: E402


def _fake_response(body: dict):
    import io
    return io.BytesIO(json.dumps(body).encode())


BODY_OK = {
    "model": "fake-model-x",
    "choices": [{"finish_reason": "stop",
                 "message": {"role": "assistant", "content": "hello"}}],
    "usage": {"prompt_tokens": 11, "completion_tokens": 7},
}

BODY_TOOL = {
    "model": "fake-model-x",
    "choices": [{"finish_reason": "tool_calls",
                 "message": {"role": "assistant", "content": None,
                             "tool_calls": [{"id": "c1", "type": "function",
                                             "function": {"name": "get_weather",
                                                          "arguments": '{"city": "Paris"}'}}]}}],
    "usage": {"prompt_tokens": 20, "completion_tokens": 9},
}


class Base(unittest.TestCase):
    def setUp(self):
        os.environ["CLEANAPIS_KEY"] = "dummy-test-key-never-real"
        # never sleep in tests
        self._sleep = mock.patch.object(lp.time, "sleep", lambda *_: None)
        self._sleep.start()
        self.addCleanup(self._sleep.stop)


class TestRouting(Base):
    def test_role_resolution(self):
        model, rc = lp.resolve_model("ORCHESTRATOR")
        self.assertTrue(model)
        self.assertIn("candidates", rc)

    def test_critic_must_differ_from_worker(self):
        cfg = lp.load_config()
        critic = cfg["roles"]["CRITIC"]["model"]
        worker = cfg["roles"]["WORKER"]["model"]
        self.assertNotEqual(critic, worker,
                            "CRITIC must use a different model than WORKER (owner rule)")

    def test_unknown_role_fails(self):
        with self.assertRaises(lp.ProviderFatal):
            lp.resolve_model("DOES_NOT_EXIST")

    def test_missing_key_is_fatal_without_retry(self):
        os.environ.pop("CLEANAPIS_KEY", None)
        with self.assertRaises(lp.ProviderFatal) as ctx:
            lp.chat("FAST", "sys", [{"role": "user", "content": "hi"}])
        self.assertNotIn("Bearer", str(ctx.exception))


class TestChat(Base):
    def test_text_roundtrip_and_usage(self):
        with mock.patch.object(lp, "_post", return_value=BODY_OK):
            r = lp.chat("FAST", "sys", [{"role": "user", "content": "hi"}])
        self.assertEqual(r.text, "hello")
        self.assertEqual(r.stop_reason, "stop")
        self.assertEqual(r.usage, {"input_tokens": 11, "output_tokens": 7, "estimated": False})
        self.assertEqual(r.model, "fake-model-x")

    def test_model_override_beats_role(self):
        with mock.patch.object(lp, "_post", return_value=BODY_OK) as mp:
            r = lp.chat("FAST", "sys", [{"role": "user", "content": "hi"}], model="candidate-9")
        self.assertEqual(mp.call_args[0][1]["model"], "candidate-9")
        self.assertEqual(r.role, "FAST")

    def test_tool_call_parsing(self):
        with mock.patch.object(lp, "_post", return_value=BODY_TOOL):
            r = lp.chat("WORKER", "sys", [{"role": "user", "content": "weather?"}])
        self.assertEqual(len(r.tool_calls), 1)
        self.assertEqual(r.tool_calls[0].name, "get_weather")
        self.assertEqual(r.tool_calls[0].arguments, {"city": "Paris"})
        self.assertEqual(r.stop_reason, "tool_calls")

    def test_retry_on_5xx_then_success(self):
        calls = {"n": 0}

        def flaky(url, payload, timeout):
            calls["n"] += 1
            if calls["n"] == 1:
                raise lp._Retryable(503, None)
            return BODY_OK

        with mock.patch.object(lp, "_post", side_effect=flaky):
            r = lp.chat("FAST", "sys", [{"role": "user", "content": "hi"}])
        self.assertEqual(r.text, "hello")
        self.assertEqual(calls["n"], 2)

    def test_gives_up_after_3_attempts(self):
        calls = {"n": 0}

        def always(url, payload, timeout):
            calls["n"] += 1
            raise lp._Retryable(500, None)

        with mock.patch.object(lp, "_post", side_effect=always):
            with self.assertRaises(lp.ProviderFatal):
                lp.chat("FAST", "sys", [{"role": "user", "content": "hi"}])
        self.assertEqual(calls["n"], lp.MAX_ATTEMPTS)

    def test_401_and_402_are_fatal_no_retry(self):
        for code in (401, 402):
            def fail(url, payload, timeout, _c=code):
                raise lp.ProviderFatal(f"cleanapis HTTP {_c}")
            with mock.patch.object(lp, "_post", side_effect=fail):
                with self.assertRaises(lp.ProviderFatal) as ctx:
                    lp.chat("FAST", "sys", [{"role": "user", "content": "hi"}])
            msg = str(ctx.exception)
            self.assertNotIn("Bearer", msg)
            self.assertNotIn(os.environ.get("CLEANAPIS_KEY", ""), msg)


class TestLedger(Base):
    def test_call_cap_enforced_before_spend(self):
        led = lp.UsageLedger(max_calls=2)
        with mock.patch.object(lp, "_post", return_value=BODY_OK):
            lp.chat("FAST", "s", [{"role": "user", "content": "1"}], ledger=led)
            lp.chat("FAST", "s", [{"role": "user", "content": "2"}], ledger=led)
            with self.assertRaises(lp.BudgetExceeded):
                lp.chat("FAST", "s", [{"role": "user", "content": "3"}], ledger=led)
        self.assertEqual(led.calls, 2)

    def test_token_cap_enforced(self):
        led = lp.UsageLedger(max_total_tokens=10)
        with mock.patch.object(lp, "_post", return_value=BODY_OK):
            with self.assertRaises(lp.BudgetExceeded):
                lp.chat("FAST", "s", [{"role": "user", "content": "hi"}], ledger=led)

    def test_missing_usage_is_estimated_and_flagged(self):
        body = {k: v for k, v in BODY_OK.items() if k != "usage"}
        with mock.patch.object(lp, "_post", return_value=body):
            r = lp.chat("FAST", "s", [{"role": "user", "content": "hi"}])
        self.assertTrue(r.usage["estimated"])


class TestNoKeyLeak(Base):
    def test_exception_messages_never_contain_key(self):
        os.environ["CLEANAPIS_KEY"] = "super-secret-value-xyz"
        try:
            lp.chat("FAST", "s", [{"role": "user", "content": "hi"}])
        except lp.ProviderFatal as e:
            self.assertNotIn("super-secret-value-xyz", str(e))


if __name__ == "__main__":
    unittest.main(verbosity=2)
