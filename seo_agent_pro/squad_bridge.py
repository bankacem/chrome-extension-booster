"""
Squad Bridge — connects seo_agent_pro to the 209-agent professional squad.

The squad registry (agents/registry.json) defines the real production team:
  leadership   orchestrator, project-binder, memory-curator, learning-scribe,
               style-keeper, quality-auditor, redirect-steward, ab-title-tester,
               analytics-reader
  content ops  trend-scout, keyword-strategist, serp-analyst, brief-architect,
               writer, editor, seo-optimizer, link-strategist, image-director,
               fact-checker, qa-gatekeeper, publisher   (×6 niches each)
  7 squads ×16 translators/loc-qa/cultural-editors/... for ar, fr, es, pt, ...

This module makes those named agents (AG001..AG209) executable INSIDE
seo_agent_pro: pick an agent by role+squad, get its charter + skills as the
system prompt, and inject the shared team memory (style guide + production
learnings) so every run benefits from what previous runs learned.

Usage:
    from squad_bridge import Squad
    sq = Squad()
    writer = sq.pick('writer', squad='productivity')
    system = sq.system_prompt(writer)          # charter + memory + style
    out = sq.llm(system, user, stage='writer') # cleanapis-first, z-ai fallback
"""

import json
import os
import subprocess
import sys
from pathlib import Path

_HERE = Path(__file__).resolve().parent
REGISTRY = "/home/z/my-project/agents/registry.json"
BRIDGE_MJS = "/home/z/my-project/agents/llm_bridge.mjs"

ROLE_FALLBACK = {
    # role -> squad used when the niche squad has no free agent of that role
    "research": "serp-analyst",
    "brief": "brief-architect",
    "write": "writer",
    "links": "link-strategist",
    "fact": "fact-checker",
    "qa": "qa-gatekeeper",
    "seo": "seo-optimizer",
    "publish": "publisher",
}


class Squad:
    def __init__(self, registry_path: str = REGISTRY):
        with open(registry_path, encoding="utf-8") as fh:
            reg = json.load(fh)
        self.agents = reg.get("agents", [])
        self.style = self._json("/home/z/my-project/agents/memory/style_guide.json") or {}
        self.learnings = self._json("/home/z/my-project/agents/memory/learnings.json") or {}

    @staticmethod
    def _json(path):
        try:
            with open(path, encoding="utf-8") as fh:
                return json.load(fh)
        except (OSError, json.JSONDecodeError):
            return {}

    def pick(self, role: str, squad: str | None = None):
        """Pick a named agent (deterministic per role+squad, not random, so
        runs are reproducible and the log always names the same specialist
        for the same job)."""
        cands = [a for a in self.agents if a.get("role") == role]
        if squad:
            pref = [a for a in cands if a.get("squad") == squad]
            cands = pref or cands
        if not cands:
            raise KeyError(f"no agent with role={role!r} in registry")
        return cands[0]

    # ---- shared memory → system prompt --------------------------------
    def memory_block(self) -> str:
        lessons = [
            f"- {l.get('lesson')}"
            for l in (self.learnings.get("lessons") or [])
            if l.get("severity") in ("critical", "high")
        ]
        style = self.style or {}
        parts = ["SHARED TEAM MEMORY (from previous production runs — obey):"]
        parts += lessons[:18] or ["- (no lessons recorded yet)"]
        if style.get("voice"):
            parts.append(f"STYLE CONTRACT:\n- {style['voice']}")
        if style.get("eeat_requirements"):
            parts.append("- " + " | ".join(style["eeat_requirements"][:5]))
        return "\n".join(parts)

    def system_prompt(self, agent: dict, project_block: str = "") -> str:
        head = (
            f"You are {agent['id']}, the {agent['role']} "
            f"({agent.get('squad', 'core')} squad). {agent.get('charter', '')}"
        )
        skills = agent.get("skills") or []
        if skills:
            head += "\nSkills: " + "; ".join(skills[:6])
        return f"{head}\n{self.memory_block()}{project_block}".strip()

    # ---- LLM through the unified bridge (cleanapis-first) --------------
    def llm(self, system: str, user: str, stage: str = "writer",
            max_tokens: int = 8192, timeout: int = 660) -> str:
        req = json.dumps({
            "system": system, "user": user,
            "stage": stage, "max_tokens": max_tokens, "retries": 2,
        })
        proc = subprocess.run(
            ["node", BRIDGE_MJS], input=req, capture_output=True,
            text=True, timeout=timeout,
        )
        try:
            out = json.loads(proc.stdout or "{}")
        except json.JSONDecodeError:
            raise RuntimeError(f"llm_bridge bad stdout: {proc.stdout[:200]} / {proc.stderr[:200]}")
        if not out.get("ok"):
            raise RuntimeError(f"llm_bridge failed: {out.get('error', proc.stderr[:200])}")
        return out["content"]


if __name__ == "__main__":
    sq = Squad()
    print(f"squad loaded: {len(sq.agents)} agents")
    for role in ("serp-analyst", "brief-architect", "writer", "link-strategist",
                 "fact-checker", "qa-gatekeeper", "seo-optimizer", "publisher"):
        a = sq.pick(role)
        print(f"  {role:18s} → {a['id']} [{a.get('squad', '-')}]")
    a = sq.pick("writer")
    sp = sq.system_prompt(a)
    print(f"\nwriter system prompt ({len(sp)} chars):\n{sp[:400]}...")
