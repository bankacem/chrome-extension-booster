"""
test_agentrouter_anthropic.py — tests agentrouter.org via the OTHER
integration path they document (ANTHROPIC_BASE_URL), using the real
`anthropic` Python SDK exactly as their own docs instruct for Claude Code.
This is a distinct, legitimate, documented integration path — not a retry
of the generic OpenAI-compatible endpoint that's already confirmed blocked.
"""
import os
import sys

API_KEY = os.environ.get("AGENTROUTER_KEY", "")
if not API_KEY:
    print("Set the AGENTROUTER_KEY environment variable first.")
    sys.exit(1)

import anthropic

client = anthropic.Anthropic(
    api_key=API_KEY,
    base_url="https://agentrouter.org",
)

MODELS_TO_TRY = [
    "claude-sonnet-4-5-20250929",
    "claude-sonnet-4-5",
    "claude-3-5-sonnet-20241022",
]

for model in MODELS_TO_TRY:
    print(f"\n--- Trying model: {model} ---")
    try:
        resp = client.messages.create(
            model=model,
            max_tokens=50,
            messages=[{"role": "user", "content": "Reply with exactly: OK"}],
        )
        text = "".join(b.text for b in resp.content if hasattr(b, "text"))
        print(f"  SUCCESS: {text!r}")
        print(f"  usage: {resp.usage}")
    except anthropic.APIStatusError as e:
        print(f"  API status error: {e.status_code} - {str(e)[:300]}")
    except anthropic.APIConnectionError as e:
        print(f"  Connection error: {e}")
    except Exception as e:
        print(f"  Unexpected error ({type(e).__name__}): {str(e)[:300]}")

print("\nDone.")
