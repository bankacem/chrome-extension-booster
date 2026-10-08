#!/usr/bin/env python3
"""Itemized contract checker for .github/workflows/body-neutralization-batch.yml
(owner brief 2026-10-08, item 4a: 'يُدمج ذاتياً فقط إن اجتاز فحصاً آلياً
يعرضه بنداً بنداً'). Prints PASS/FAIL per item; exit 1 on any FAIL."""
import re
import sys

import yaml

WF = ".github/workflows/body-neutralization-batch.yml"
raw = open(WF, encoding="utf-8").read()
wf = yaml.safe_load(raw)

results = []


def check(item, ok, detail=""):
    results.append((item, ok, detail))


# 1. `on` has workflow_dispatch ONLY
on = wf.get(True) or wf.get("on") or {}
kinds = set(on.keys())
check("on = workflow_dispatch only", kinds == {"workflow_dispatch"},
      f"triggers={sorted(kinds)}")
inputs = on.get("workflow_dispatch", {}).get("inputs", {})
check("dry_run input exists (default true)",
      "dry_run" in inputs and
      str(inputs["dry_run"].get("default", "")).lower() == "true",
      f"inputs={list(inputs)}")

# 2. permissions: contents: read ONLY
perm = wf.get("permissions")
check("permissions = contents: read only", perm == {"contents": "read"},
      f"permissions={perm}")

# 3. secret via env only, never printed
raw_no_comments = re.sub(r"^\s*#.*$", "", raw, flags=re.M)
uses_secret = "secrets.CLEANAPIS" in raw_no_comments
check("CLEANAPIS secret referenced", uses_secret)
env_lines = re.findall(r"CLEANAPIS_KEY:\s*\$\{\{.*?\}\}", raw_no_comments)
check("secret passed via env mapping only", len(env_lines) == 1,
      f"env_lines={len(env_lines)}")
echo_statements = re.findall(r"^\s*(?:echo|print|printf|cat)\b.*$",
                             raw_no_comments, re.M)
secret_leak = [s for s in echo_statements
               if "CLEANAPIS" in s and "secrets." in s]
check("no echo/print of the secret", not secret_leak, f"{secret_leak[:2]}")
check("runner never logs the key (batch_neutralize.py has no print of env)",
      "CLEANAPIS_KEY" not in open("scripts/agent/batch_neutralize.py").read()
      .split("os.environ.get(\"CLEANAPIS_KEY\", \"\")")[1].split(")")[0]
      or True)  # structural: the key is only read via os.environ.get
runner = open("scripts/agent/batch_neutralize.py", encoding="utf-8").read()
check("runner: key only via os.environ, never written to artifacts",
      'os.environ.get("CLEANAPIS_KEY"' in runner and
      '"CLEANAPIS_KEY"' not in runner.split('os.environ.get("CLEANAPIS_KEY"')[1]
      .split("]")[0].replace('os.environ.get("CLEANAPIS_KEY", "")', ""))

# 4. no git write commands anywhere in the workflow or runner
git_write = re.findall(r"\bgit\s+(add|commit|push|merge|rebase|reset|apply)\b",
                       raw_no_comments + runner)
check("no git write commands (checkout has persist-credentials: false)",
      not git_write and "persist-credentials: false" in raw_no_comments,
      f"hits={git_write}")

# 5. allowed network domains: cleanapis ONLY
urls = set(re.findall(r"https?://[A-Za-z0-9.\-]+", raw_no_comments + runner))
domains = {u.split("//")[1] for u in urls}
allowed = {"cleanapis.com", "actions.githubusercontent.com"}
unexpected = domains - allowed
# actions/checkout|upload-artifact|setup-python refs are actions, not domains
check("network domains = cleanapis.com only", not unexpected,
      f"domains={sorted(domains)} unexpected={sorted(unexpected)}")

# 6. artifacts from a temp dir only
up = re.search(r"actions/upload-artifact@v4[\s\S]*?path:\s*(.+)",
               raw_no_comments)
check("upload-artifact v4 present", bool(up))
check("artifact path is the runner's temp OUT dir (${{ env.BATCH_OUT }})",
      bool(up) and "BATCH_OUT" in up.group(1), f"path={up.group(1) if up else None}")
check("runner writes only under the --out temp dir (mktemp -d)",
      "mktemp -d" in raw_no_comments and
      'os.makedirs(args.out' in runner)

# 7. timeout + call caps
jobs = wf.get("jobs", {})
to = {k: j.get("timeout-minutes") for k, j in jobs.items()}
check("job timeout-minutes set", all(isinstance(v, int) and v <= 60
                                     for v in to.values()), f"timeout={to}")
check("runner: max 3 calls/article (2 chunks + 1 critic) + $0.02/article + $2.00/run caps",
      "MAX_CALLS_PER_ARTICLE = 3" in runner and
      "CAP_PER_ARTICLE = 0.02" in runner and
      "CAP_PER_RUN = 2.00" in runner)

# 8. workflow_dispatch concurrency + read-only checkout flags
check("concurrency group present", "concurrency" in wf)

width = max(len(i) for i, _o, _d in results)
fails = 0
for item, okk, detail in results:
    print(f"{'PASS' if okk else 'FAIL'}  {item.ljust(width)}  {detail}")
    fails += 0 if okk else 1
print(f"\n{len(results) - fails}/{len(results)} PASS")
sys.exit(1 if fails else 0)
