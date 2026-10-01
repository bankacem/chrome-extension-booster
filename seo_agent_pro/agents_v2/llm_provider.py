"""agents_v2.llm_provider — role-routed chat interface over cleanapis.com/v1.

Reuses the proven cleanapis transport from seo_agent_pro/llm_router.py
(do NOT reinvent): same base URL, same secret/env name, same Cloudflare
User-Agent workaround, same documented error envelope:

    HTTP 401 → bad/missing key                → FATAL (no retry)
    HTTP 402 → out of tokens (plan exhausted) → FATAL (no retry)
    HTTP 429 / 5xx                            → exponential backoff, ≤3 attempts

Adds what agents_v2 needs on top:
  * role-based routing via agents_v2/models.json (ORCHESTRATOR / WORKER / CRITIC / FAST)
  * tool calling via the OpenAI-compatible wire format (same endpoint)
  * per-run accounting (UsageLedger) with hard caps on calls and tokens
  * stop_reason + the model id ECHOED BY THE PROVIDER (no claims beyond it)

SECURITY INVARIANTS (owner rules — fixed):
  * the key enters ONLY via env (CLEANAPIS_KEY ← GitHub secret CLEANAPIS in Actions)
  * the key is never printed, never logged, never embedded in exceptions
"""
from __future__ import annotations

import json
import os
import threading
import time
import urllib.error
import urllib.request
from dataclasses import dataclass, field
from pathlib import Path

MODELS_JSON_PATH = Path(__file__).resolve().parent / "models.json"
RETRYABLE_HTTP_CODES = {429, 500, 502, 503, 504}
MAX_ATTEMPTS = 3            # exponential backoff limit — owner rule (ب1)
BASE_DELAY_SECONDS = 5.0    # same base delay as llm_router
REQUEST_TIMEOUT_SECONDS = 300
EMPTY_CONTENT_TOKEN_CEILING = 8000  # doubled-budget retry ceiling (router lesson)


# ──────────────────────────────────────────────────────────────
#  Errors
# ──────────────────────────────────────────────────────────────

class ProviderFatal(Exception):
    """401/402 or missing key — stop everything, tell the owner clearly."""


class BudgetExceeded(Exception):
    """A hard cap from models.json (or the run) was hit."""


class _Retryable(Exception):
    def __init__(self, code: int, retry_after: float | None):
        super().__init__(f"retryable HTTP {code}")
        self.code = code
        self.retry_after = retry_after


# ──────────────────────────────────────────────────────────────
#  Result types
# ──────────────────────────────────────────────────────────────

@dataclass
class ToolCall:
    id: str
    name: str
    arguments: dict


@dataclass
class LLMResult:
    text: str
    tool_calls: list[ToolCall]
    usage: dict                 # {"input_tokens": int, "output_tokens": int, "estimated": bool}
    stop_reason: str            # provider finish_reason, verbatim
    model: str                  # model id ECHOED BY THE PROVIDER (body["model"])
    role: str
    latency_seconds: float


@dataclass
class UsageEntry:
    role: str
    model: str
    input_tokens: int
    output_tokens: int
    ok: bool
    latency_seconds: float
    error: str = ""


class UsageLedger:
    """Thread-safe per-run accounting. Enforces models.json caps + run caps."""

    def __init__(self, max_calls: int | None = None, max_total_tokens: int | None = None):
        self._lock = threading.Lock()
        self.entries: list[UsageEntry] = []
        self.max_calls = max_calls
        self.max_total_tokens = max_total_tokens

    def reserve_call(self) -> None:
        with self._lock:
            if self.max_calls is not None and len(self.entries) >= self.max_calls:
                raise BudgetExceeded(
                    f"hard cap reached: {self.max_calls} model calls (stopping before waste)")
            # placeholder so concurrent workers cannot overshoot the cap
            self.entries.append(UsageEntry("", "", 0, 0, False, 0.0, "reserved"))

    def add(self, entry: UsageEntry) -> None:
        with self._lock:
            for i, e in enumerate(self.entries):
                if e.error == "reserved" and e.role == "":
                    self.entries[i] = entry
                    break
            else:
                self.entries.append(entry)
            if self.max_total_tokens is not None:
                total = sum(e.input_tokens + e.output_tokens for e in self.entries)
                if total >= self.max_total_tokens:
                    raise BudgetExceeded(
                        f"hard cap reached: {total} tokens >= {self.max_total_tokens}")

    @property
    def calls(self) -> int:
        return len(self.entries)

    @property
    def total_tokens(self) -> int:
        return sum(e.input_tokens + e.output_tokens for e in self.entries)


# ──────────────────────────────────────────────────────────────
#  Config / routing
# ──────────────────────────────────────────────────────────────

def load_config(path: Path | None = None) -> dict:
    with open(path or MODELS_JSON_PATH, encoding="utf-8") as fh:
        return json.load(fh)


def resolve_model(role: str, cfg: dict | None = None) -> tuple[str, dict]:
    """role (ORCHESTRATOR/WORKER/CRITIC/FAST) -> (model_id, role_config)."""
    cfg = cfg or load_config()
    roles = cfg.get("roles", {})
    if role not in roles:
        raise ProviderFatal(f"unknown role {role!r} — not in models.json roles")
    rc = roles[role]
    model = rc.get("model")
    if not model:
        raise ProviderFatal(f"role {role!r} has no model set in models.json")
    if rc.get("must_differ_from"):
        other = roles.get(rc["must_differ_from"], {}).get("model")
        if other and other == model:
            raise ProviderFatal(
                f"CRITIC/WATERGATE violation: {role} must differ from "
                f"{rc['must_differ_from']} ({other})")
    return model, rc


def _api_key() -> str:
    key = os.getenv("CLEANAPIS_KEY", "").strip()
    if not key:
        raise ProviderFatal(
            "CLEANAPIS_KEY missing — the key must come from GitHub Secrets "
            "(CLEANAPIS) injected as env inside Actions; it is never stored "
            "or asked for locally.")
    return key


def _headers(key: str) -> dict:
    # Cloudflare in front of cleanapis.com blocks the default urllib UA
    # (Error 1010) — same workaround as llm_router._call_cleanapis.
    # NOTE: the Authorization value must NEVER be logged or repr()'d.
    return {
        "Authorization": f"Bearer {key}",
        "Content-Type": "application/json",
        "User-Agent": ("Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 "
                       "(KHTML, like Gecko) Chrome/126.0 Safari/537.36"),
        "Accept": "application/json",
    }


def _post(url: str, payload: dict, timeout: int) -> dict:
    """Single HTTP POST. Raises _Retryable / ProviderFatal. Never logs headers."""
    key = _api_key()
    req = urllib.request.Request(url, json.dumps(payload).encode(), _headers(key))
    try:
        with urllib.request.urlopen(req, timeout=timeout) as resp:
            raw = resp.read().decode("utf-8")
    except urllib.error.HTTPError as e:
        retry_after = None
        if e.code == 429:
            ra = e.headers.get("Retry-After") if e.headers else None
            try:
                retry_after = float(ra) if ra else None
            except (TypeError, ValueError):
                retry_after = None
        if e.code == 401:
            raise ProviderFatal(
                "cleanapis 401 — bad or missing key. Fix the CLEANAPIS secret "
                "(GitHub → Settings → Secrets), do NOT retry.") from None
        if e.code == 402:
            raise ProviderFatal(
                "cleanapis 402 — out of tokens (plan exhausted). Top up at "
                "cleanapis.com dashboard; do NOT retry.") from None
        if e.code in RETRYABLE_HTTP_CODES:
            raise _Retryable(e.code, retry_after) from None
        raise ProviderFatal(f"cleanapis HTTP {e.code} — unexpected, stopping.") from None
    except urllib.error.URLError as e:
        # network-level (DNS/timeout) — treated as retryable
        raise _Retryable(599, None) from None
    try:
        return json.loads(raw)
    except json.JSONDecodeError:
        # truncated/broken body (gateway hiccups) — retryable, then fatal
        raise _Retryable(598, None) from None


_STOP_REASONS_OK = {"stop", "tool_calls", "function_call"}


def _parse_tool_calls(message: dict) -> list[ToolCall]:
    out: list[ToolCall] = []
    for tc in message.get("tool_calls") or []:
        fn = tc.get("function", {})
        raw = fn.get("arguments", "{}")
        try:
            args = json.loads(raw) if isinstance(raw, str) else dict(raw)
        except (json.JSONDecodeError, TypeError):
            args = {"_unparsed": raw}
        out.append(ToolCall(id=tc.get("id", ""), name=fn.get("name", ""), arguments=args))
    return out


def _estimate_tokens(payload: dict, text: str) -> tuple[int, int]:
    """~4 chars/token heuristic, used ONLY when the provider omits usage."""
    in_chars = sum(len(m.get("content", "") or "") for m in payload.get("messages", []))
    return max(1, in_chars // 4), max(1, len(text) // 4)


def chat(role: str,
         system: str,
         messages: list[dict],
         tools: list[dict] | None = None,
         max_tokens: int = 1024,
         ledger: UsageLedger | None = None,
         timeout: int = REQUEST_TIMEOUT_SECONDS,
         model: str | None = None) -> LLMResult:
    """One agent turn. Returns text and/or tool calls + usage + stop reason.

    messages: OpenAI format [{"role": "user"|"assistant"|"tool", "content": str,
    ...}] — the system prompt is passed separately and always first.
    `model` overrides the role routing (used by the model-fit harness to test
    each candidate; production callers should rely on the role only).
    """
    if model is None:
        model, _rc = resolve_model(role)
    url = os.getenv("CLEANAPIS_BASE_URL", "https://cleanapis.com/v1").rstrip("/") + "/chat/completions"

    convo = [{"role": "system", "content": system}] + list(messages)
    payload: dict = {"model": model, "max_tokens": max_tokens, "messages": convo}
    if tools:
        payload["tools"] = tools
        payload["tool_choice"] = "auto"

    if ledger is not None:
        ledger.reserve_call()

    start = time.monotonic()
    attempt = 0
    delay = BASE_DELAY_SECONDS
    last_err = ""
    while True:
        attempt += 1
        try:
            body = _post(url, payload, timeout)
            break
        except _Retryable as e:
            last_err = f"HTTP {e.code}"
            if attempt >= MAX_ATTEMPTS:
                raise ProviderFatal(
                    f"cleanapis {last_err} persisted after {MAX_ATTEMPTS} attempts "
                    f"(exponential backoff) — giving up on this call.") from None
            time.sleep(e.retry_after if e.retry_after else delay)
            delay *= 2

    latency = time.monotonic() - start
    choice = (body.get("choices") or [{}])[0]
    message = choice.get("message", {}) or {}
    text = message.get("content") or ""
    tool_calls = _parse_tool_calls(message)
    stop_reason = choice.get("finish_reason", "unknown")
    echoed_model = body.get("model", model)

    usage_in = usage_out = 0
    estimated = False
    u = body.get("usage") or {}
    if u.get("prompt_tokens") is not None:
        usage_in, usage_out = int(u.get("prompt_tokens", 0)), int(u.get("completion_tokens", 0))
    else:
        usage_in, usage_out = _estimate_tokens(payload, text)
        estimated = True

    # Router lesson: reasoning-style models can spend the whole budget on
    # reasoning and return EMPTY content with finish_reason="length" —
    # retry once internally with a doubled budget before failing.
    if not text.strip() and not tool_calls and stop_reason == "length" \
            and max_tokens < EMPTY_CONTENT_TOKEN_CEILING:
        payload["max_tokens"] = min(max_tokens * 2, EMPTY_CONTENT_TOKEN_CEILING)
        body = _post(url, payload, timeout)
        choice = (body.get("choices") or [{}])[0]
        message = choice.get("message", {}) or {}
        text = message.get("content") or ""
        tool_calls = _parse_tool_calls(message)
        stop_reason = choice.get("finish_reason", stop_reason)
        u2 = body.get("usage") or {}
        if u2.get("prompt_tokens") is not None:
            # honest accounting: BOTH attempts hit the provider
            usage_in += int(u2.get("prompt_tokens", 0))
            usage_out += int(u2.get("completion_tokens", 0))
            estimated = False

    if ledger is not None:
        ledger.add(UsageEntry(role=role, model=echoed_model, input_tokens=usage_in,
                              output_tokens=usage_out, ok=True,
                              latency_seconds=latency))

    return LLMResult(text=text, tool_calls=tool_calls,
                     usage={"input_tokens": usage_in, "output_tokens": usage_out,
                            "estimated": estimated},
                     stop_reason=stop_reason, model=echoed_model, role=role,
                     latency_seconds=latency)
