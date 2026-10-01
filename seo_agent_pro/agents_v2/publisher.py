"""agents_v2.publisher — writes the candidate article as ARTIFACT files only.

Owner spec: "ناشر كود يكتب المقال المرشّح كملف artifact فقط (لا commit ولا PR
ولا نشر)". This module NEVER touches git, never writes into the repository
content folders, and is not reachable from any production path.
"""
from __future__ import annotations

import json
from pathlib import Path

FORBIDDEN_PREFIXES = ("/home/z/my-project/site/public", "public/content",
                      "public/sitemap")


def write_artifacts(out_dir: Path, result: dict, journal: "object | None" = None) -> dict:
    """Write candidate.md + report.json (+ journal.jsonl) under out_dir."""
    out = Path(out_dir)
    resolved = str(out.resolve())
    for pref in FORBIDDEN_PREFIXES:
        if resolved.startswith(pref):
            raise PermissionError(f"publisher denied: {resolved} is a content folder")
    out.mkdir(parents=True, exist_ok=True)

    (out / "candidate.md").write_text(
        f"---\ntitle: {json.dumps(result.get('title', ''), ensure_ascii=False)}\n"
        f"meta_description: {json.dumps(result.get('meta', ''), ensure_ascii=False)}\n"
        f"agent_system: agents_v2\nstatus: CANDIDATE_ARTIFACT_NOT_PUBLISHED\n---\n\n"
        f"{result.get('body', '')}\n", encoding="utf-8")

    report = {
        "ok": result.get("ok", False),
        "stop_reason": result.get("stop_reason", ""),
        "gates": result.get("gates"),
        "stats": result.get("stats", {}),
        "system": "agents_v2",
        "published": False,
        "note": "artifact only — no commit, no PR, no deploy (owner rule)",
    }
    (out / "report.json").write_text(json.dumps(report, indent=2, ensure_ascii=False),
                                     encoding="utf-8")
    if journal is not None:
        journal.dump(out / "journal.jsonl")
    return {"candidate": str(out / "candidate.md"),
            "report": str(out / "report.json"),
            "journal": str(out / "journal.jsonl") if journal is not None else None}
