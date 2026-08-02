"""
test_bluesminds.py

Standalone discovery script — run this yourself on any machine with normal
internet access (your own computer, a VPS, Claude Code, etc.). It has zero
dependencies beyond Python's standard library.

It will:
  1. Try to list available models from api.bluesminds.com (common
     OpenAI-compatible endpoint: GET /v1/models).
  2. Try a tiny real chat completion against a handful of common model-name
     guesses, so we know which ones this key can actually use.

Run it with:
    python3 test_bluesminds.py

Then paste me the full output and I'll wire the working model(s) directly
into seo_agent_pro/config.py and llm_router.py.
"""
import json
import os
import urllib.request
import urllib.error

API_KEY = os.environ.get("BLUESMINDS_KEY", "")
if not API_KEY:
    print("Set the BLUESMINDS_KEY environment variable first.")
    raise SystemExit(1)
BASE_URL = "https://api.bluesminds.com"

HEADERS = {
    "Authorization": f"Bearer {API_KEY}",
    "Content-Type": "application/json",
}

# Common model name guesses to try if /v1/models doesn't return a usable list.
CANDIDATE_MODELS = [
    "gpt-4o-mini",
    "gpt-4o",
    "gpt-3.5-turbo",
    "claude-3-5-sonnet",
    "claude-3-5-sonnet-20241022",
    "gemini-1.5-flash",
    "gemini-pro",
    "llama-3.1-70b",
    "llama-3.3-70b",
    "mixtral-8x7b",
    "deepseek-chat",
]


def try_list_models():
    print("=" * 60)
    print("STEP 1: Trying GET /v1/models ...")
    print("=" * 60)
    url = f"{BASE_URL}/v1/models"
    req = urllib.request.Request(url, headers=HEADERS)
    try:
        with urllib.request.urlopen(req, timeout=15) as resp:
            body = json.loads(resp.read().decode("utf-8"))
            print("SUCCESS. Raw response:")
            print(json.dumps(body, indent=2)[:3000])
            return body
    except urllib.error.HTTPError as e:
        print(f"HTTP {e.code}: {e.reason}")
        print(e.read().decode("utf-8", errors="replace")[:1000])
    except Exception as e:
        print(f"Failed: {e}")
    return None


def try_chat_completion(model_id: str):
    url = f"{BASE_URL}/v1/chat/completions"
    payload = {
        "model": model_id,
        "max_tokens": 20,
        "messages": [{"role": "user", "content": "Say hello in exactly 3 words."}],
    }
    req = urllib.request.Request(
        url, json.dumps(payload).encode("utf-8"), HEADERS, method="POST"
    )
    try:
        with urllib.request.urlopen(req, timeout=20) as resp:
            body = json.loads(resp.read().decode("utf-8"))
            content = None
            try:
                content = body["choices"][0]["message"]["content"]
            except Exception:
                content = body
            print(f"  ✅ '{model_id}' WORKS -> {content}")
            return True
    except urllib.error.HTTPError as e:
        err_body = e.read().decode("utf-8", errors="replace")[:200]
        print(f"  ❌ '{model_id}' failed: HTTP {e.code} - {err_body}")
    except Exception as e:
        print(f"  ❌ '{model_id}' failed: {e}")
    return False


def main():
    models_response = try_list_models()

    print()
    print("=" * 60)
    print("STEP 2: Testing individual model IDs with a real request")
    print("=" * 60)

    model_ids_to_test = list(CANDIDATE_MODELS)

    # If /v1/models returned a usable list, test those instead/first.
    if isinstance(models_response, dict) and "data" in models_response:
        listed = [m.get("id") for m in models_response["data"] if m.get("id")]
        if listed:
            print(f"Found {len(listed)} models from /v1/models - testing those first.")
            model_ids_to_test = listed[:15] + CANDIDATE_MODELS

    working = []
    for model_id in model_ids_to_test:
        if try_chat_completion(model_id):
            working.append(model_id)

    print()
    print("=" * 60)
    print("SUMMARY")
    print("=" * 60)
    if working:
        print(f"Working model(s): {working}")
    else:
        print("No model worked. Double check the API key and base URL.")


if __name__ == "__main__":
    main()
