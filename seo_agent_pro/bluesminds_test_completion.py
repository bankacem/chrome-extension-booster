#!/usr/bin/env python3
"""
Quick test: send a small chat completion request to Bluesminds.
Configure BLUESMINDS_KEY in env and set MODEL_ID below to a valid model id
returned by the /keys endpoint (or the provider's docs).
"""

import os
import urllib.request
import json

key = os.getenv("BLUESMINDS_KEY")
if not key:
    print("Set BLUESMINDS_KEY environment variable first.")
    raise SystemExit(1)

MODEL_ID = os.getenv("BLUESMINDS_MODEL", "gpt-3")  # replace with actual model id
url = "https://api.bluesminds.com/v1/chat/completions"  # confirm with provider
headers = {"Authorization": f"Bearer {key}", "Content-Type": "application/json"}

payload = {
    "model": MODEL_ID,
    "messages": [
        {"role": "system", "content": "You are a helpful assistant."},
        {"role": "user", "content": "Write a short professional paragraph describing the chrome-extension-booster project in Arabic."}
    ],
    "max_tokens": 200,
    "temperature": 0.7,
}

req = urllib.request.Request(url, data=json.dumps(payload).encode(), headers=headers)
try:
    with urllib.request.urlopen(req, timeout=30) as resp:
        body = resp.read().decode('utf-8')
        parsed = json.loads(body)
        print(json.dumps(parsed, ensure_ascii=False, indent=2))
except urllib.error.HTTPError as e:
    body = e.read().decode('utf-8', errors='replace')
    print(f"HTTP Error {e.code}: {e.reason}")
    print(body)
except Exception as e:
    print("Error:", e)
