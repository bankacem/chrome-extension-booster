#!/usr/bin/env python3
"""
Simple test script to list what the Bluesminds /keys endpoint returns.
This script reads BLUESMINDS_KEY from the environment variable.
"""

import os
import urllib.request
import json

key = os.getenv("BLUESMINDS_KEY")
if not key:
    print("Set BLUESMINDS_KEY environment variable first.")
    raise SystemExit(1)

url = "https://api.bluesminds.com/keys"
req = urllib.request.Request(url, headers={"Authorization": f"Bearer {key}"})

try:
    with urllib.request.urlopen(req, timeout=15) as resp:
        body = resp.read().decode("utf-8")
        parsed = json.loads(body)
        print(json.dumps(parsed, ensure_ascii=False, indent=2))
except urllib.error.HTTPError as e:
    body = e.read().decode('utf-8', errors='replace')
    print(f"HTTP Error {e.code}: {e.reason}")
    print(body)
except Exception as e:
    print("Error:", e)
