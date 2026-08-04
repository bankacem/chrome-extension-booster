"""
test_agentrouter.py — model discovery for agentrouter.org, run via GitHub
Actions workflow (same pattern proven out for Bluesminds).
"""
import json
import os
import time
import urllib.request
import urllib.error

API_KEY = os.environ.get("AGENTROUTER_KEY", "")
if not API_KEY:
    print("Set the AGENTROUTER_KEY environment variable first.")
    raise SystemExit(1)
BASE_URL = "https://agentrouter.org"

HEADERS = {
    "Authorization": f"Bearer {API_KEY}",
    "Content-Type": "application/json",
    "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 "
                  "(KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
    "Accept": "application/json",
}

PRIORITY_MODELS = [
    "gpt-4o",
    "gpt-4o-mini",
    "gpt-4.1",
    "gpt-5",
    "claude-3-5-sonnet",
    "claude-3-5-sonnet-20241022",
    "claude-sonnet-4",
    "claude-sonnet-4-5",
    "gemini-1.5-pro",
    "gemini-1.5-flash",
    "gemini-2.0-flash",
    "gemini-2.5-flash",
    "deepseek-chat",
    "deepseek-r1",
    "deepseek-v3",
    "mistralai/mistral-large",
    "meta/llama-3.1-70b-instruct",
    "meta/llama-3.1-8b-instruct",
    "llama-3.1-70b-versatile",
    "qwen-max",
    "grok-2",
    "grok-beta",
]

REQUEST_DELAY_SECONDS = 4


CANDIDATE_BASE_URLS = [
    "https://agentrouter.org",
    "https://agentrouter.org/api",
]


def try_list_models(base_url: str):
    url = f"{base_url}/v1/models" if not base_url.endswith("/v1") else f"{base_url}/models"
    print(f"--- Trying {url} ---")
    req = urllib.request.Request(url, headers=HEADERS)
    try:
        with urllib.request.urlopen(req, timeout=15) as resp:
            print(f"  HTTP status: {resp.status}")
            print(f"  Final URL (after any redirects): {resp.geturl()}")
            print(f"  Content-Type: {resp.headers.get('Content-Type')}")
            raw = resp.read().decode("utf-8", errors="replace")
            print(f"  Body length: {len(raw)} chars")
            print(f"  Body preview: {raw[:300]!r}")
            if not raw.strip():
                return None, None
            body = json.loads(raw)
            ids = [m.get("id") for m in body.get("data", []) if m.get("id")]
            print(f"  SUCCESS - {len(ids)} models. First 20:")
            for mid in ids[:20]:
                print(f"    - {mid}")
            return base_url, ids
    except urllib.error.HTTPError as e:
        raw = e.read().decode("utf-8", errors="replace")
        print(f"  HTTP {e.code}: {e.reason} - body: {raw[:300]!r}")
    except Exception as e:
        print(f"  Failed: {e}")
    return None, None


def try_chat_completion(base_url: str, model_id: str):
    url = f"{base_url}/v1/chat/completions" if not base_url.endswith("/v1") else f"{base_url}/chat/completions"
    payload = {
        "model": model_id,
        "max_tokens": 30,
        "messages": [{"role": "user", "content": "Say hello in exactly 3 words."}],
    }
    req = urllib.request.Request(
        url, json.dumps(payload).encode("utf-8"), HEADERS, method="POST"
    )
    try:
        with urllib.request.urlopen(req, timeout=25) as resp:
            raw = resp.read().decode("utf-8")
            if not raw.strip():
                print(f"  [FAIL] '{model_id}': empty response body")
                return False
            body = json.loads(raw)
            try:
                content = body["choices"][0]["message"]["content"]
            except Exception:
                content = body
            print(f"  [OK] '{model_id}' WORKS -> {content}")
            return True
    except urllib.error.HTTPError as e:
        err_body = e.read().decode("utf-8", errors="replace")[:200]
        print(f"  [FAIL] '{model_id}': HTTP {e.code} - {err_body}")
    except Exception as e:
        print(f"  [FAIL] '{model_id}': {e}")
    return False


def main():
    print("=" * 60)
    print("STEP 1: Finding the correct base URL")
    print("=" * 60)

    working_base_url = None
    discovered_models = []
    for base_url in CANDIDATE_BASE_URLS:
        result_base, ids = try_list_models(base_url)
        if result_base:
            working_base_url = result_base
            discovered_models = ids or []
            break

    if not working_base_url:
        print()
        print("None of the candidate base URLs returned a valid /v1/models response.")
        print("Trying chat completions directly against each candidate as a last resort...")
        for base_url in CANDIDATE_BASE_URLS:
            print(f"--- Trying chat completion at {base_url} ---")
            if try_chat_completion(base_url, "gpt-4o"):
                working_base_url = base_url
                break

    if not working_base_url:
        print()
        print("=" * 60)
        print("SUMMARY: Could not find a working base URL at all.")
        print("=" * 60)
        return

    print()
    print("=" * 60)
    print(f"STEP 2: Testing priority models against {working_base_url}")
    print("=" * 60)

    to_test = [m for m in PRIORITY_MODELS if not discovered_models or m in discovered_models]
    if not to_test:
        to_test = PRIORITY_MODELS

    working = []
    for i, model_id in enumerate(to_test):
        if i > 0:
            time.sleep(REQUEST_DELAY_SECONDS)
        if try_chat_completion(working_base_url, model_id):
            working.append(model_id)

    print()
    print("=" * 60)
    print("SUMMARY")
    print("=" * 60)
    print(f"Working base URL: {working_base_url}")
    print(f"Working model(s): {working}")


if __name__ == "__main__":
    main()
