# bench-002 execution status — 2026-10-01T10:11:53Z

Completed runs (metrics.json present):
  - extension-chrome-chat-gpt-2/imp/metrics.json

## Channel incident log (z-ai builtin channel, both arms share it)
- 08:45-08:56Z  IMP pilots on chatgpt topic: healthy (2 runs, second one gates PASS 2779w).
- 09:06-09:11Z  ENGINE chatgpt run: full agentic loop executed (research 11 rows, plan,
                3 critic rounds) — killed by the 560s tool timeout during fact-check; runner
                bug (re/_re) also surfaced here. Fixed.
- 09:12Z+       z-ai channel began returning 429 "Too many requests" on EVERY call
                (internal zai#1 and zai#2 both). Silent retries made it look like a hang.
- 09:22-09:45Z  three ENGINE attempts: every bridge attempt 429 (heartbeat logs added).
- 09:53Z, 10:00Z, 10:10Z  probes after 5-20 min of TOTAL silence: still 429.
  Probe evidence: scripts/t24_probe.py output, saved in this folder as probe_log.jsonl.

Root cause: builtin z-ai channel quota exhausted (cumulative morning bench-001 session +
today's runs). No CLEANAPIS key exists locally, so there is no alternate channel — this is
exactly the dependency the owner's CI plan (decision #5) removes by running the comparison
in GitHub Actions with the CLEANAPIS secret on the production model.

Resume: `python3 scripts/t24_bench.py --slug <slug> --arm imp|engine` is resume-safe
(skips completed metrics.json). Queue: see scripts/t24_topics.json + 3 bench-001 slugs.
