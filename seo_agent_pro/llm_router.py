"""
LLM Router — Handles Anthropic, OpenRouter, Groq, and Bluesminds (experimental).
"""

import anthropic
import urllib.request
import urllib.error
import json
import sys
import time

from config import API_KEYS, MODELS, SETTINGS


# ──────────────────────────────────────────────────────────────
#  Terminal colors
# ──────────────────────────────────────────��───────────────────

class Color:
    PURPLE = "\033[35m"
    GREEN  = "\033[32m"
    BLUE   = "\033[34m"
    YELLOW = "\033[33m"
    CYAN   = "\033[36m"
    RED    = "\033[31m"
    BOLD   = "\033[1m"
    DIM    = "\033[2m"
    RESET  = "\033[0m"

def c(color: str, text: str) -> str:
    return f"{getattr(Color, color.upper(), '')}{text}{Color.RESET}"


# ──────────────────────────────────────────────────────────────
#  Validation
# ──────────────────────────────────────────────────────────────

def validate_config(model_name: str) -> tuple[str, str]:
    """Returns (provider, model_id) or exits with a clear error."""
    if model_name not in MODELS:
        available = "\n  ".join(MODELS.keys())
        print(c("red", f"\n  ✗ Unknown model: '{model_name}'"))
        print(c("dim", f"\n  Available models:\n  {available}"))
        sys.exit(1)

    provider, model_id = MODELS[model_name]
    key = API_KEYS.get(provider, "")

    if not key:
        print(c("red", f"\n  ✗ Missing API key for provider: {provider}"))
        print(c("dim", f"  → Open config.py and set API_KEYS[\"{provider}\"] or set the environment variable."))
        sys.exit(1)

    return provider, model_id


# ──────────────────────────────────────────────────────────────
#  Anthropic
# ──────────────────────────────────────────────────────────────

def _call_anthropic(model_id: str, system: str, user: str, stream: bool) -> str:
    client = anthropic.Anthropic(api_key=API_KEYS["anthropic"])
    full   = ""

    if stream:
        with client.messages.stream(
            model=model_id,
            max_tokens=SETTINGS["max_tokens"],
            system=system,
            messages=[{"role": "user", "content": user}],
        ) as s:
            for chunk in s.text_stream:
                print(chunk, end="", flush=True)
                full += chunk
        print()
    else:
        msg  = client.messages.create(
            model=model_id,
            max_tokens=SETTINGS["max_tokens"],
            system=system,
            messages=[{"role": "user", "content": user}],
        )
        full = msg.content[0].text

    return full


# ──────────────────────────────────────────────────────────────
#  OpenRouter  (OpenAI-compatible REST)
# ──────────────────────────────────────────────────────────────

def _call_openrouter(model_id: str, system: str, user: str, stream: bool) -> str:
    url     = "https://openrouter.ai/api/v1/chat/completions"
    headers = {
        "Authorization":  f"Bearer {API_KEYS['openrouter']}",
        "Content-Type":   "application/json",
        "HTTP-Referer":   "https://github.com/seo-agent-pro",
        "X-Title":        "SEO Agent Pro",
    }
    payload = {
        "model":      model_id,
        "max_tokens": SETTINGS["max_tokens"],
        "stream":     stream,
        "messages": [
            {"role": "system", "content": system},
            {"role": "user",   "content": user},
        ],
    }

    req  = urllib.request.Request(url, json.dumps(payload).encode(), headers)
    full = ""

    with urllib.request.urlopen(req) as resp:
        if stream:
            for raw_line in resp:
                line = raw_line.decode("utf-8").strip()
                if not line.startswith("data:"):
                    continue
                data = line[5:].strip()
                if data == "[DONE]":
                    break
                try:
                    obj   = json.loads(data)
                    delta = obj["choices"][0]["delta"].get("content", "")
                    if delta:
                        print(delta, end="", flush=True)
                        full += delta
                except (json.JSONDecodeError, KeyError):
                    continue
            print()
        else:
            body = json.loads(resp.read().decode("utf-8"))
            full = body["choices"][0]["message"]["content"]

    return full


# ──────────────────────────────────────────────────────────────
#  Groq  (OpenAI-compatible REST — no streaming via urllib)
# ──────────────────────────────────────────────────────────────

def _call_groq(model_id: str, system: str, user: str, stream: bool) -> str:
    url     = "https://api.groq.com/openai/v1/chat/completions"
    headers = {
        "Authorization": f"Bearer {API_KEYS['groq']}",
        "Content-Type":  "application/json",
    }
    payload = {
        "model":      model_id,
        "max_tokens": SETTINGS["max_tokens"],
        "stream":     stream,
        "messages": [
            {"role": "system", "content": system},
            {"role": "user",   "content": user},
        ],
    }

    req  = urllib.request.Request(url, json.dumps(payload).encode(), headers)
    full = ""

    with urllib.request.urlopen(req) as resp:
        if stream:
            for raw_line in resp:
                line = raw_line.decode("utf-8").strip()
                if not line.startswith("data:"):
                    continue
                data = line[5:].strip()
                if data == "[DONE]":
                    break
                try:
                    obj   = json.loads(data)
                    delta = obj["choices"][0]["delta"].get("content", "")
                    if delta:
                        print(delta, end="", flush=True)
                        full += delta
                except (json.JSONDecodeError, KeyError):
                    continue
            print()
        else:
            body = json.loads(resp.read().decode("utf-8"))
            full = body["choices"][0]["message"]["content"]

    return full


# ──────────────────────────────────────────────────────────────
#  Bluesminds (experimental) — uses the user's provided API
#  NOTE: The exact endpoints and response format may differ. Adjust url
#  and parsing according to Bluesminds API docs.
# ──────────────────────────────────────────────────────────────

def _call_bluesminds(model_id: str, system: str, user: str, stream: bool) -> str:
    url     = "https://api.bluesminds.com/v1/chat/completions"  # Confirm with Bluesminds docs
    headers = {
        "Authorization": f"Bearer {API_KEYS['bluesminds']}",
        "Content-Type":  "application/json",
    }
    payload = {
        "model":      model_id,
        "max_tokens": SETTINGS["max_tokens"],
        "stream":     stream,
        "messages": [
            {"role": "system", "content": system},
            {"role": "user",   "content": user},
        ],
    }

    req  = urllib.request.Request(url, json.dumps(payload).encode(), headers)
    full = ""

    with urllib.request.urlopen(req) as resp:
        if stream:
            for raw_line in resp:
                line = raw_line.decode("utf-8").strip()
                if not line.startswith("data:"):
                    continue
                data = line[5:].strip()
                if data == "[DONE]":
                    break
                try:
                    obj   = json.loads(data)
                    # Attempt OpenAI-like delta format
                    delta = obj["choices"][0].get("delta", {}).get("content", "")
                    if not delta:
                        # Fallback to message.content
                        delta = obj["choices"][0].get("message", {}).get("content", "")
                    if delta:
                        print(delta, end="", flush=True)
                        full += delta
                except (json.JSONDecodeError, KeyError):
                    continue
            print()
        else:
            body = json.loads(resp.read().decode("utf-8"))
            # Attempt to parse OpenAI-compatible response
            try:
                full = body["choices"][0]["message"]["content"]
            except Exception:
                # As a fallback, dump entire body as string
                full = json.dumps(body)

    return full


# ──────────────────────────────────────────────────────────────
#  Agentrouter.org — OpenAI-compatible proxy, validated in test_agentrouter.py
#  NOTE: confirm the base URL still resolves for your account (run
#  test_agentrouter.py) before depending on this in production. Unlike
#  Bluesminds this one was actually reachable during diagnosis, but the base
#  URL and exact model IDs an account has access to can change.
# ──────────────────────────────────────────────────────────────

def _call_agentrouter(model_id: str, system: str, user: str, stream: bool) -> str:
    headers = {
        "Authorization": f"Bearer {API_KEYS['agentrouter']}",
        "Content-Type":  "application/json",
        "Accept":        "application/json",
        "User-Agent":    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 "
                         "(KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
    }
    payload = {
        "model":      model_id,
        "max_tokens": SETTINGS["max_tokens"],
        "stream":     stream,
        "messages": [
            {"role": "system", "content": system},
            {"role": "user",   "content": user},
        ],
    }
    body_bytes = json.dumps(payload).encode()

    # test_agentrouter.py found the API could live at either of these — try
    # the root first, fall back to /api if it doesn't return real JSON. This
    # was NOT observed working during diagnosis (see comment above), so both
    # candidates are attempted before giving up.
    candidate_urls = [
        "https://agentrouter.org/v1/chat/completions",
        "https://agentrouter.org/api/v1/chat/completions",
    ]

    last_error: Exception | None = None
    for url in candidate_urls:
        req  = urllib.request.Request(url, body_bytes, headers)
        full = ""
        try:
            with urllib.request.urlopen(req, timeout=60) as resp:
                if stream:
                    for raw_line in resp:
                        line = raw_line.decode("utf-8").strip()
                        if not line.startswith("data:"):
                            continue
                        data = line[5:].strip()
                        if data == "[DONE]":
                            break
                        try:
                            obj   = json.loads(data)
                            delta = obj["choices"][0].get("delta", {}).get("content", "")
                            if delta:
                                print(delta, end="", flush=True)
                                full += delta
                        except (json.JSONDecodeError, KeyError):
                            continue
                    print()
                else:
                    raw = resp.read().decode("utf-8")
                    if not raw.strip():
                        raise ValueError(f"{url} returned an empty response body (HTTP 200)")
                    try:
                        parsed = json.loads(raw)
                    except json.JSONDecodeError as e:
                        # Surface what was actually returned (often an HTML
                        # error/login page rather than JSON) instead of a
                        # bare parser error with no way to diagnose it from
                        # the Actions log.
                        raise ValueError(
                            f"{url} did not return valid JSON (HTTP {resp.status}, "
                            f"Content-Type: {resp.headers.get('Content-Type')}). "
                            f"First 300 chars of body: {raw[:300]!r}"
                        ) from e
                    full = parsed["choices"][0]["message"]["content"]
            return full
        except (ValueError, urllib.error.HTTPError) as e:
            last_error = e
            print(c("dim", f"  ⚠ {url} failed ({e}); trying next candidate URL..."))
            continue

    raise ValueError(
        f"agentrouter.org: none of the candidate base URLs worked. Last error: {last_error}"
    )


# ──────────────────────────────────────────────────────────────
#  Public API
# ──────────────────────────────────────────────────────────────

RETRYABLE_HTTP_CODES = {429, 500, 502, 503, 504}
MAX_RETRIES = 3
RETRY_BASE_DELAY_SECONDS = 5


def call(
    system: str,
    user:   str,
    model_name: str,
    stream: bool = True,
) -> str:
    """
    Route a prompt to the correct provider and return the response text.
    Automatically retries on transient server errors (rate limits, gateway
    timeouts) instead of crashing the whole pipeline on the first blip.
    """
    provider, model_id = validate_config(model_name)

    print(c("dim", f"  ↳ {provider} / {model_id}"))

    last_error = None
    for attempt in range(1, MAX_RETRIES + 1):
        try:
            if provider == "anthropic":
                return _call_anthropic(model_id, system, user, stream)
            elif provider == "openrouter":
                return _call_openrouter(model_id, system, user, stream)
            elif provider == "groq":
                return _call_groq(model_id, system, user, stream)
            elif provider == "bluesminds":
                return _call_bluesminds(model_id, system, user, stream)
            elif provider == "agentrouter":
                return _call_agentrouter(model_id, system, user, stream)
            else:
                print(c("red", f"  ✗ Unknown provider: {provider}"))
                sys.exit(1)

        except urllib.error.HTTPError as e:
            body = e.read().decode("utf-8", errors="replace")
            last_error = e
            if e.code in RETRYABLE_HTTP_CODES and attempt < MAX_RETRIES:
                delay = RETRY_BASE_DELAY_SECONDS * attempt
                print(c("dim", f"  ⚠ HTTP {e.code} (attempt {attempt}/{MAX_RETRIES}) - retrying in {delay}s..."))
                time.sleep(delay)
                continue
            print(c("red", f"\n  ✗ HTTP {e.code}: {e.reason}"))
            print(c("dim", f"  {body[:300]}"))
            sys.exit(1)

        except Exception as e:
            print(c("red", f"\n  ✗ Error calling {provider}: {e}"))
            raise

    # Exhausted retries
    print(c("red", f"\n  ✗ Gave up after {MAX_RETRIES} attempts: {last_error}"))
    sys.exit(1)


def call_json(system: str, user: str, model_name: str) -> dict | list:
    """Call the model and parse the response as JSON."""
    import re

    system_j = system + "\n\nIMPORTANT: Return only valid JSON — no prose, no markdown fences."
    raw      = call(system_j, user, model_name, stream=False)
    raw      = re.sub(r"```(?:json)?", "", raw).strip()

    try:
        return json.loads(raw)
    except json.JSONDecodeError:
        match = re.search(r"[\[{][\s\S]*[\]}]", raw)
        if match:
            return json.loads(match.group())
        raise ValueError(f"Could not parse JSON:\n{raw[:400]}")


def find_working_model(candidates: list[str], test_prompt: str = "Reply with exactly: OK") -> str:
    """
    Try each model in `candidates`, in order, with a tiny cheap test call.
    Returns the name of the first one that responds successfully. Skips (does
    not even attempt) any candidate whose provider has no API key configured,
    so a missing secret doesn't waste a network round-trip. Raises
    RuntimeError if none of them work — with every individual failure reason
    included so the cause is visible in one place instead of buried per-call.
    """
    failures: list[str] = []

    for model_name in candidates:
        if model_name not in MODELS:
            failures.append(f"{model_name}: not a known model in MODELS")
            continue

        provider, _ = MODELS[model_name]
        if not API_KEYS.get(provider, ""):
            failures.append(f"{model_name}: no API key set for provider '{provider}' — skipped")
            continue

        print(c("dim", f"  ↳ probing {model_name}..."))
        try:
            reply = call(
                "You are a connectivity check. Reply with exactly the requested text, nothing else.",
                test_prompt,
                model_name,
                stream=False,
            )
            print(c("green", f"  ✓ {model_name} works — reply: {reply.strip()[:60]!r}"))
            return model_name
        except SystemExit:
            # validate_config()/call()'s own exhausted-retries path calls
            # sys.exit(1); treat that as "this candidate failed" rather than
            # killing the whole probing loop.
            failures.append(f"{model_name}: exited after exhausting retries")
            continue
        except Exception as e:
            failures.append(f"{model_name}: {e}")
            continue

    detail = "\n".join(f"  - {f}" for f in failures)
    raise RuntimeError(
        f"No working model found among candidates: {candidates}\n{detail}"
    )


def list_models() -> None:
    """Print all available models grouped by provider."""
    providers: dict[str, list[str]] = {}
    for name, (prov, mid) in MODELS.items():
        providers.setdefault(prov, []).append((name, mid))

    for prov, entries in providers.items():
        key    = API_KEYS.get(prov, "")
        status = c("green", "● key set") if key else c("red", "○ no key")
        print(f"\n  {c('bold', prov.upper())}  {status}")
        for name, mid in entries:
            print(c("dim", f"    {name:<28} {mid}"))
