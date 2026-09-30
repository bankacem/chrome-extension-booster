#!/usr/bin/env python3
"""
Phase 0 feasibility probe (dry-run, READ-ONLY, no publishing).

Question: does the cleanapis model used for writing (deepseek-v4-pro-0813)
support OpenAI-style tool calling reliably enough to host a real agent loop?

Tests per model (default 3 models x 10 attempts each):
  A) tools/function calling with tool_choice="auto":
     success = finish_reason yields tool_calls whose JSON args match the
     declared schema ({"query": string} required).
  B) strict-JSON action step (the verified-JSON fallback loop primitive):
     success = parsable JSON object with required keys action/args/query.

Honesty rules:
  - NO retries inside an attempt: raw reliability is what we measure.
  - Every failure is classified, not swallowed:
    http_error / no_tool_calls (prose instead of call) / bad_args / bad_json /
    bad_schema / budget_exhausted (reasoning ate max_tokens) / empty.
  - Small max_tokens (250) to keep cost negligible.

Output: JSON summary to stdout + probe_results.json next to this script.
Requires env CLEANAPIS_KEY. Never prints the key.
"""
import json
import os
import time
import urllib.error
import urllib.request
from pathlib import Path

BASE = os.getenv("CLEANAPIS_BASE_URL", "https://cleanapis.com/v1").rstrip("/")
KEY = os.environ["CLEANAPIS_KEY"]
MODELS = [m.strip() for m in os.getenv(
    "PROBE_MODELS",
    "deepseek-v4-pro-0813,gpt-5.6-luna,glm-5.3").split(",") if m.strip()]
ATTEMPTS = int(os.getenv("PROBE_ATTEMPTS", "10"))
MAX_TOKENS = 250
CALL_TIMEOUT = 60
UA = ("Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 "
      "(KHTML, like Gecko) Chrome/126.0 Safari/537.36")  # Cloudflare 1010 fix

TOOLS = [{
    "type": "function",
    "function": {
        "name": "search_competitors",
        "description": "Search the web for articles competing for an SEO keyword.",
        "parameters": {
            "type": "object",
            "properties": {
                "query": {"type": "string", "description": "The search query"},
                "num_results": {"type": "integer", "minimum": 1, "maximum": 10},
            },
            "required": ["query"],
        },
    },
}]
TOOL_PROMPT = ("You are researching the keyword 'best chrome extensions'. "
               "You must call the search_competitors tool exactly once to "
               "gather competitor data before answering.")
JSON_SYSTEM = ('Reply with ONLY a JSON object, no markdown, no prose, '
               'exactly: {"action": "search", "args": '
               '{"query": "<the user topic>", "num_results": 5}}')
JSON_USER = "Topic: best chrome extensions for students"


def call(model: str, messages: list, tools=None) -> dict:
    body = {"model": model, "max_tokens": MAX_TOKENS, "stream": False,
            "messages": messages}
    if tools:
        body["tools"] = tools
        body["tool_choice"] = "auto"
    req = urllib.request.Request(
        f"{BASE}/chat/completions", json.dumps(body).encode(),
        {"Authorization": f"Bearer {KEY}", "Content-Type": "application/json",
         "User-Agent": UA, "Accept": "application/json"})
    t0 = time.time()
    try:
        with urllib.request.urlopen(req, timeout=CALL_TIMEOUT) as r:
            data = json.loads(r.read().decode())
        return {"ok": True, "ms": int((time.time() - t0) * 1000), "resp": data}
    except urllib.error.HTTPError as e:
        detail = e.read().decode("utf-8", "replace")[:160]
        return {"ok": False, "ms": int((time.time() - t0) * 1000),
                "err": f"HTTP_{e.code}"}
    except Exception as e:
        return {"ok": False, "ms": int((time.time() - t0) * 1000),
                "err": type(e).__name__}


def classify_tool(resp) -> str:
    ch = (resp.get("choices") or [{}])[0]
    msg = ch.get("message") or {}
    tcs = msg.get("tool_calls") or []
    if tcs:
        try:
            args = json.loads(tcs[0]["function"].get("arguments") or "{}")
            if isinstance(args, dict) and args.get("query"):
                return "ok"
            return "bad_args"
        except Exception:
            return "bad_args"
    if (msg.get("content") or "").strip():
        return "no_tool_calls"  # answered in prose instead of calling
    if ch.get("finish_reason") == "length":
        return "budget_exhausted"
    return f"other:{ch.get('finish_reason')}"


def classify_json(resp) -> str:
    ch = (resp.get("choices") or [{}])[0]
    content = ((ch.get("message") or {}).get("content") or "").strip()
    if not content:
        return "budget_exhausted" if ch.get("finish_reason") == "length" else "empty"
    if content.startswith("```"):  # strip accidental fences
        content = content.strip("`").removeprefix("json").strip()
    try:
        obj = json.loads(content)
        if (isinstance(obj, dict) and obj.get("action") == "search"
                and isinstance(obj.get("args"), dict)
                and obj["args"].get("query")):
            return "ok"
        return "bad_schema"
    except Exception:
        return "bad_json"


def run_block(model: str, kind: str) -> tuple:
    counts, lat = {}, []
    for i in range(ATTEMPTS):
        if kind == "tool":
            r = call(model, [{"role": "user", "content": TOOL_PROMPT}], TOOLS)
            verdict = classify_tool(r["resp"]) if r["ok"] else r["err"]
        else:
            r = call(model, [{"role": "system", "content": JSON_SYSTEM},
                             {"role": "user", "content": JSON_USER}])
            verdict = classify_json(r["resp"]) if r["ok"] else r["err"]
        counts[verdict] = counts.get(verdict, 0) + 1
        if r["ok"]:
            lat.append(r["ms"])
        print(f"  [{model}] {kind}#{i + 1}: {verdict} ({r['ms']}ms)", flush=True)
    med = sorted(lat)[len(lat) // 2] if lat else None
    return counts, med


def main():
    results = {}
    for model in MODELS:
        print(f"== probing {model} ==", flush=True)
        tool_counts, tool_med = run_block(model, "tool")
        json_counts, json_med = run_block(model, "json")
        results[model] = {
            "attempts_per_test": ATTEMPTS,
            "tool_calling": {"ok": tool_counts.get("ok", 0),
                             "detail": tool_counts, "median_ms": tool_med},
            "json_loop": {"ok": json_counts.get("ok", 0),
                          "detail": json_counts, "median_ms": json_med},
        }
    out = {"ran_at": time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime()),
           "base_url": BASE, "results": results}
    out_path = Path(__file__).parent / "probe_results.json"
    out_path.write_text(json.dumps(out, indent=2, ensure_ascii=False))
    print(json.dumps({m: {"tool_ok": v["tool_calling"]["ok"],
                          "json_ok": v["json_loop"]["ok"]}
                      for m, v in results.items()}, indent=2))
    print(f"saved: {out_path}")


if __name__ == "__main__":
    main()
