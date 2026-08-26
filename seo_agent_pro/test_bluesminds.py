"""
test_bluesminds.py — model discovery, run via GitHub Actions workflow.
Tests priority (capable) models with delays to avoid rate limiting.
"""
import json
import os
import time
import urllib.request
import urllib.error

API_KEY = os.environ.get("BLUESMINDS_KEY", "")
if not API_KEY and __name__ == "__main__":
    print("Set the BLUESMINDS_KEY environment variable first.")
    raise SystemExit(1)
BASE_URL = "https://api.bluesminds.com"

HEADERS = {
    "Authorization": f"Bearer {API_KEY}",
    "Content-Type": "application/json",
}

PRIORITY_MODELS = [
    "gpt-4o",
    "gpt-4o-mini",
    "gpt-4.1",
    "gpt-5",
    "claude-3-5-sonnet",
    "claude-3-5-sonnet-20241022",
    "claude-sonnet-4",
    "gemini-1.5-pro",
    "gemini-1.5-flash",
    "gemini-2.0-flash",
    "deepseek-chat",
    "deepseek-r1",
    "mistralai/mistral-large",
    "meta/llama-3.1-70b-instruct",
    "meta/llama-3.1-8b-instruct",
    "qwen/qwen3.5-397b-a17b",
    "z-ai/glm5",
]

REQUEST_DELAY_SECONDS = 4


def try_list_models():
    print("=" * 60)
    print("STEP 1: Trying GET /v1/models ...")
    print("=" * 60)
    url = f"{BASE_URL}/v1/models"
    req = urllib.request.Request(url, headers=HEADERS)
    try:
        with urllib.request.urlopen(req, timeout=15) as resp:
            body = json.loads(resp.read().decode("utf-8"))
            ids = [m.get("id") for m in body.get("data", []) if m.get("id")]
            print(f"SUCCESS - {len(ids)} models available. Full list:")
            for mid in ids:
                print(f"  - {mid}")
            return ids
    except urllib.error.HTTPError as e:
        print(f"HTTP {e.code}: {e.reason}")
        print(e.read().decode("utf-8", errors="replace")[:1000])
    except Exception as e:
        print(f"Failed: {e}")
    return []


def try_chat_completion(model_id: str):
    url = f"{BASE_URL}/v1/chat/completions"
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
            body = json.loads(resp.read().decode("utf-8"))
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
    all_models = try_list_models()

    print()
    print("=" * 60)
    print("STEP 2: Testing priority models (with delay to respect rate limits)")
    print("=" * 60)

    to_test = [m for m in PRIORITY_MODELS if not all_models or m in all_models]
    if not to_test:
        to_test = PRIORITY_MODELS

    working = []
    for i, model_id in enumerate(to_test):
        if i > 0:
            time.sleep(REQUEST_DELAY_SECONDS)
        if try_chat_completion(model_id):
            working.append(model_id)

    print()
    print("=" * 60)
    print("SUMMARY")
    print("=" * 60)
    print(f"Working model(s): {working}")


if __name__ == "__main__":
    main()
