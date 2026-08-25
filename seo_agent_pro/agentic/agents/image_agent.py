"""
Image Agent — generates a real featured image for approved articles using
Google's Imagen 3 (via the Gemini API), instead of shipping every article
with the site's generic /og-image.png placeholder.

Deliberately runs AFTER finalize_approved, not for every draft — no point
spending image-generation budget on articles that get rejected and rewritten.

Failure handling is intentionally generous: image generation is a nice-to-
have, not a blocker. ANY failure (missing/invalid API key, network error,
unexpected response shape, model name that's since changed) must fall back
to the default placeholder and let the pipeline finish normally — it must
never be the reason a whole article run fails.

NOTE ON THE API ENDPOINT: this targets the Imagen 3 REST endpoint as
documented at the time this file was written. Google's model names and
endpoints do change — if this starts failing consistently, check
https://ai.google.dev/gemini-api/docs/imagen for the current model id
and update IMAGEN_MODEL below. A wrong model name will just make every
call fail closed (fallback image), not crash anything.
"""

from __future__ import annotations

import base64
import json
import sys
import urllib.error
import urllib.request
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[2]))
from config import API_KEYS
from llm_router import c

ROOT = Path(__file__).resolve().parents[3]
IMAGES_DIR = ROOT / "public" / "content" / "images"

IMAGEN_MODEL = "imagen-3.0-generate-002"
IMAGEN_URL = (
    f"https://generativelanguage.googleapis.com/v1beta/models/"
    f"{IMAGEN_MODEL}:predict"
)
TIMEOUT_SECONDS = 45


def _step(label: str) -> None:
    print(f"\n{c('cyan', '▸')} {c('bold', 'Image Agent — ' + label)}")


def _build_prompt(title: str, category: str) -> str:
    return (
        f"A clean, modern, professional blog header illustration for an "
        f"article titled \"{title}\" in the category \"{category}\", about "
        f"Chrome browser extensions. Flat design, tech blog aesthetic, "
        f"no text or letters in the image, no logos of real companies, "
        f"16:9 composition, blue and white color palette."
    )


def _call_imagen(prompt: str, api_key: str) -> bytes | None:
    body = json.dumps({
        "instances": [{"prompt": prompt}],
        "parameters": {"sampleCount": 1, "aspectRatio": "16:9"},
    }).encode("utf-8")

    req = urllib.request.Request(
        IMAGEN_URL,
        data=body,
        method="POST",
        headers={
            "Content-Type": "application/json",
            "x-goog-api-key": api_key,
        },
    )
    try:
        with urllib.request.urlopen(req, timeout=TIMEOUT_SECONDS) as resp:
            data = json.loads(resp.read().decode("utf-8"))
    except urllib.error.HTTPError as e:
        detail = e.read().decode("utf-8", errors="replace")[:300]
        print(c("yellow", f"  ⚠ Imagen HTTP {e.code}: {detail}"))
        return None
    except Exception as e:
        print(c("yellow", f"  ⚠ Imagen request failed: {e}"))
        return None

    predictions = data.get("predictions") or []
    if not predictions or "bytesBase64Encoded" not in predictions[0]:
        print(c("yellow", f"  ⚠ Unexpected Imagen response shape: {list(data.keys())}"))
        return None

    try:
        return base64.b64decode(predictions[0]["bytesBase64Encoded"])
    except Exception as e:
        print(c("yellow", f"  ⚠ Failed to decode image data: {e}"))
        return None


def run(state: dict) -> dict:
    _step("Generating featured image")

    api_key = API_KEYS.get("gemini", "")
    if not api_key:
        print(c("yellow", "  ⚠ No GEMINI_KEY set — keeping default placeholder image."))
        return {}
    if not api_key.startswith("AIzaSy"):
        print(c("yellow",
                 "  ⚠ GEMINI_KEY doesn't look like a real AI Studio API key "
                 "(should start with 'AIzaSy') — it may be an OAuth access "
                 "token instead, which expires within an hour. Skipping "
                 "image generation, keeping default placeholder."))
        return {}

    title = state.get("title", "")
    category = state.get("category", "")
    slug = state.get("slug") or ""
    if not slug:
        # Mirror the same slugify logic run.py uses, imported lazily to
        # avoid a circular import at module load time.
        import daily_article as legacy  # noqa: E402
        slug = legacy.slugify(title)

    prompt = _build_prompt(title, category)
    image_bytes = _call_imagen(prompt, api_key)

    if image_bytes is None:
        print(c("yellow", "  ⚠ Falling back to default placeholder image."))
        return {}

    IMAGES_DIR.mkdir(parents=True, exist_ok=True)
    out_path = IMAGES_DIR / f"{slug}.jpg"
    try:
        out_path.write_bytes(image_bytes)
    except Exception as e:
        print(c("yellow", f"  ⚠ Failed to save generated image: {e} — falling back to default."))
        return {}

    web_path = f"/content/images/{slug}.jpg"
    print(c("green", f"  ✓ Generated and saved featured image: {web_path}"))
    return {"featured_image_path": web_path}
