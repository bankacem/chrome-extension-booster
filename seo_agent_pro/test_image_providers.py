"""
test_image_providers.py — checks whether agentrouter.org or api.bluesminds.com
expose an image-generation model, and if so, actually generates one test
image to prove it works end-to-end. Run via GitHub Actions (both domains
are unreachable from the sandbox this pipeline is otherwise developed in).
"""
import base64
import json
import os
import urllib.error
import urllib.request

AGENTROUTER_KEY = os.environ.get("AGENTROUTER_KEY", "")
BLUESMINDS_KEY = os.environ.get("BLUESMINDS_KEY", "")

HEADERS_BASE = {
    "Content-Type": "application/json",
    "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 "
                  "(KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
    "Accept": "application/json",
}

IMAGE_MODEL_HINTS = [
    "dall-e", "dalle", "image", "imagen", "flux", "sdxl",
    "stable-diffusion", "stability", "midjourney",
]

PROVIDERS = [
    {"name": "agentrouter", "base": "https://agentrouter.org", "key": AGENTROUTER_KEY},
    {"name": "bluesminds", "base": "https://api.bluesminds.com", "key": BLUESMINDS_KEY},
]


def get(url, headers, timeout=20):
    req = urllib.request.Request(url, headers=headers)
    try:
        with urllib.request.urlopen(req, timeout=timeout) as resp:
            return resp.status, json.loads(resp.read().decode("utf-8"))
    except urllib.error.HTTPError as e:
        return e.code, e.read().decode("utf-8", errors="replace")[:500]
    except Exception as e:
        return None, str(e)


def post(url, headers, body, timeout=60):
    req = urllib.request.Request(
        url, data=json.dumps(body).encode("utf-8"), headers=headers, method="POST"
    )
    try:
        with urllib.request.urlopen(req, timeout=timeout) as resp:
            return resp.status, json.loads(resp.read().decode("utf-8"))
    except urllib.error.HTTPError as e:
        return e.code, e.read().decode("utf-8", errors="replace")[:800]
    except Exception as e:
        return None, str(e)


for provider in PROVIDERS:
    print(f"\n{'='*60}\nProvider: {provider['name']}\n{'='*60}")
    if not provider["key"]:
        print("  No API key set for this provider — skipping.")
        continue

    headers = {**HEADERS_BASE, "Authorization": f"Bearer {provider['key']}"}

    status, data = get(f"{provider['base']}/v1/models", headers)
    print(f"  GET /v1/models -> status {status}")
    if not isinstance(data, dict) or "data" not in data:
        print(f"  Unexpected response: {str(data)[:300]}")
        continue

    model_ids = [m.get("id", "") for m in data["data"]]
    print(f"  Total models found: {len(model_ids)}")

    image_models = [m for m in model_ids if any(h in m.lower() for h in IMAGE_MODEL_HINTS)]
    print(f"  Image-related models: {image_models[:20]}")

    if not image_models:
        print("  No image-generation model found for this provider.")
        continue

    # Try the first candidate against the standard OpenAI-compatible
    # /v1/images/generations endpoint.
    test_model = image_models[0]
    print(f"\n  Testing image generation with model: {test_model}")
    status, result = post(
        f"{provider['base']}/v1/images/generations",
        headers,
        {
            "model": test_model,
            "prompt": "A clean, modern, flat-design blog header illustration about "
                      "Chrome browser extensions for remote work, blue and white "
                      "color palette, no text, 16:9",
            "n": 1,
            "size": "1024x1024",
        },
    )
    print(f"  POST /v1/images/generations -> status {status}")

    if isinstance(result, dict) and result.get("data"):
        item = result["data"][0]
        if item.get("url"):
            print(f"  ✅ SUCCESS — image URL: {item['url']}")
        elif item.get("b64_json"):
            out_path = "/tmp/test_generated_image.png"
            with open(out_path, "wb") as f:
                f.write(base64.b64decode(item["b64_json"]))
            print(f"  ✅ SUCCESS — base64 image decoded and saved to {out_path}")
        else:
            print(f"  Response had 'data' but no url/b64_json: {item}")
    else:
        print(f"  Failed or unexpected shape: {str(result)[:500]}")

print("\nDone.")
