"""
agentic_loop.py — Anthropic-style agentic engine for seo_agent_pro.

Replaces the fixed linear pipeline + blind whole-draft regeneration with the
agentic patterns Anthropic advocates ("Building effective agents"):

  1. ReAct research loop   the serp-analyst becomes an AGENT that decides
                           which searches to run, observes results, and
                           iterates until it has competitor gaps + entities.
  2. Explicit planning     a planner agent emits a structured plan artifact
                           (outline + word budgets + entity/keyword map)
                           BEFORE any drafting token is spent.
  3. Tool use              every stage can call real tools (web_search,
                           count_words, gate_check) and sees observations.
  4. Critic rubric loop    a critic scores the draft on a structured rubric
                           and returns ACTIONABLE feedback; revision is
                           TARGETED at failing dimensions only, not a
                           blind full rewrite.
  5. Reflection → memory   after each run the reflector writes back at most
                           one durable lesson into the shared team memory.
  6. Full transparency     every thought/action/observation lands in
                           trace.jsonl ("show the agent's work").

Everything routes through squad_bridge (named agents, shared memory,
cleanapis-first LLM bridge with z-ai fallback) — no new provider code.
"""

from __future__ import annotations

import json
import re
import subprocess
import time
from datetime import datetime, timezone
from pathlib import Path

WORD_RE = re.compile(r"[A-Za-z0-9'’-]+")
SEARCH_CACHE = Path("/tmp/agentic_search_cache.json")


def wc(text: str) -> int:
    return len(WORD_RE.findall(text))


def now() -> str:
    return datetime.now(timezone.utc).strftime("%H:%M:%S")


class Trace:
    """Append-only JSONL trace: every thought, action, observation."""

    def __init__(self, run_dir: Path):
        self.path = run_dir / "trace.jsonl"
        self.events: list[dict] = []

    def add(self, agent: str, phase: str, **kw):
        ev = {"ts": now(), "agent": agent, "phase": phase, **kw}
        self.events.append(ev)
        with open(self.path, "a", encoding="utf-8") as fh:
            fh.write(json.dumps(ev, ensure_ascii=False) + "\n")

    def print(self, agent: str, msg: str):
        print(f"[{now()}] {agent} {msg}", flush=True)


# ────────────────────────────────────────────────────────────────
#  Tools — real executable capabilities agents decide to call
# ────────────────────────────────────────────────────────────────

class Toolbelt:
    def __init__(self, trace: Trace, run_dir: Path):
        self.trace = trace
        self.run_dir = run_dir
        self.calls: list[dict] = []

    def web_search(self, query: str, num: int = 8) -> list[dict]:
        """Live SERP probe via the z-ai CLI (same channel as production)."""
        cache = {}
        if SEARCH_CACHE.exists():
            try:
                cache = json.loads(SEARCH_CACHE.read_text(encoding="utf-8"))
            except json.JSONDecodeError:
                cache = {}
        if query in cache:
            return cache[query]
        rows: list[dict] = []
        try:
            subprocess.run(
                ["z-ai", "function", "-n", "web_search",
                 "-a", json.dumps({"query": query, "num": num}), "-o", "/tmp/agentic_serp.json"],
                capture_output=True, text=True, timeout=90)
            data = json.loads(Path("/tmp/agentic_serp.json").read_text(encoding="utf-8"))
            for r in data if isinstance(data, list) else []:
                if r.get("url"):
                    rows.append({"title": r.get("name", ""), "host": r.get("host_name", ""),
                                 "url": r.get("url", ""), "snippet": (r.get("snippet") or "")[:240]})
        except Exception:  # noqa: BLE001 — search failure is an observation, not a crash
            rows = []
        cache[query] = rows
        SEARCH_CACHE.write_text(json.dumps(cache, ensure_ascii=False), encoding="utf-8")
        return rows

    def count_words(self, text: str) -> int:
        return wc(text)

    def gate_check(self, text: str, wmin: int, wmax: int) -> dict:
        """Deterministic structural gate — the same semantics as qa_gate."""
        words = wc(text)
        h2 = len(re.findall(r"^## ", text, re.M))
        toc = bool(re.search(r"^## Table of Contents", text, re.M))
        faq_idx = text.find("## Frequently Asked Questions")
        faq_h3 = len(re.findall(r"^### ", text[faq_idx:], re.M)) if faq_idx >= 0 else 0
        v_idx = text.rfind("## Final Verdict")
        verdict = len(re.sub(r"[#!\s]", "", text[v_idx:])) if v_idx > 0 else 0
        nested = bool(re.search(r"\[[^\]]*\[", text))
        head_link = bool(re.search(r"^#{1,6}\s.*\]\(", text, re.M))
        mid_tok = bool(re.search(r"\]\([^)]+\)[A-Za-z0-9]", text, re.M))
        brackets = text.count("[") == text.count("]")
        table = bool(re.search(r"^\|.+\|\n\|[-| :]+\|", text, re.M))
        checks = {
            "word_count": wmin <= words <= wmax, "toc": toc, "faq8": faq_h3 >= 6,
            "verdict": verdict > 120, "h2_sections": h2 >= 6, "comparison_table": table,
            "no_nested_links": not nested, "no_heading_links": not head_link,
            "no_split_words": not mid_tok, "brackets_balanced": brackets,
        }
        return {"words": words, "h2": h2, "faq_h3": faq_h3, "verdict_chars": verdict,
                "checks": checks, "pass": all(checks.values()),
                "failed": [k for k, v in checks.items() if not v]}


# ────────────────────────────────────────────────────────────────
#  JSON helpers — robust extraction of STRICT-JSON answers
# ────────────────────────────────────────────────────────────────

def parse_json(text: str) -> dict | list | None:
    t = text.strip()
    t = re.sub(r"^```(?:json)?\s*|\s*```$", "", t)
    try:
        return json.loads(t)
    except json.JSONDecodeError:
        pass
    m = re.search(r"\{[\s\S]*\}", t) or re.search(r"\[[\s\S]*\]", t)
    if m:
        try:
            return json.loads(m.group(0))
        except json.JSONDecodeError:
            return None
    return None


def strip_md(text: str) -> str:
    text = re.sub(r"^```(?:markdown)?\s*\n?", "", text)
    text = re.sub(r"\n?```\s*$", "", text)
    return re.sub(r"^#\s+.+\n", "", text)


def deterministic_meta_fallback(topic: str, meta: str, wmin: int) -> str:
    """Trim/repair a meta_description to the 120-160 SEO window without an LLM."""
    s = " ".join((meta or "").replace("\n", " ").split()).strip()
    if len(s) < 120:
        s = f"Hands-on {topic} guide: tested steps, honest trade-offs and the settings that actually matter."
        s = " ".join(s.split())
    if len(s) > 160:
        s = s[:160]
        cut = max(s.rfind(". "), s.rfind(", "), s.rfind(" "))
        if cut >= 120:
            s = s[:cut]
        s = s.rstrip(",;:. ").strip()
        if len(s) < 120:
            s = (s + ". Complete hands-on guide.")[:160].strip()
    return s


# ────────────────────────────────────────────────────────────────
#  Memory retrieval — top-K relevant lessons, not the whole dump
# ────────────────────────────────────────────────────────────────

def relevant_lessons(squad, context: str, k: int = 8) -> list[str]:
    ctx_words = {w for w in WORD_RE.findall(context.lower()) if len(w) > 3}
    scored = []
    for l in squad.learnings.get("lessons", []):
        words = set(WORD_RE.findall(str(l.get("lesson", "")).lower()))
        tags = set(WORD_RE.findall(str(l.get("tags", "")).lower())) if l.get("tags") else set()
        score = len(ctx_words & (words | tags))
        weight = {"critical": 3, "high": 2}.get(l.get("severity"), 1)
        scored.append((score + weight, l))
    scored.sort(key=lambda x: -x[0])
    return [l.get("lesson") for _, l in scored[:k] if l.get("lesson")]


# ────────────────────────────────────────────────────────────────
#  Phase 1 — ReAct research agent (serp-analyst with tools)
# ────────────────────────────────────────────────────────────────

RESEARCH_SYSTEM = """You are a SERP research agent. You have ONE tool:
  web_search {"query": "...", "num": 8} — live web search.

Decide which searches give the best competitive intelligence for the article
task (the seed query is given; vary it: add "guide", "2026", "best", problem
phrasings). After each search you see the results as an observation.

Respond STRICTLY as JSON, one of:
  {"thought": "...", "action": {"tool": "web_search", "args": {"query": "...", "num": 8}}}
  {"thought": "...", "action": {"tool": "finish", "args": {}}}
No markdown, no commentary outside the JSON."""


def run_research(squad, trace: Trace, tools: Toolbelt, topic: str, keywords: list[str],
                 max_turns: int = 4) -> dict:
    """Returns {'rows': [...], 'gaps': [...], 'entities': [...], 'faq_questions': [...]}."""
    agent = squad.pick("serp-analyst")
    sys_p = squad.system_prompt(agent) + "\n\n" + RESEARCH_SYSTEM
    transcript: list[str] = []
    all_rows: dict[str, dict] = {}
    transcript.append(f"TASK: {topic} | KEYWORDS: {', '.join(keywords[:6])} | "
                      f"Run up to {max_turns} searches, then finish.")
    turns = 0
    while turns < max_turns:
        turns += 1
        out = squad.llm(sys_p, "\n\n".join(transcript) + "\n\nYour next move (STRICT JSON only):",
                        stage="fast", max_tokens=700)
        dec = parse_json(out)
        if not isinstance(dec, dict) or "action" not in dec:
            transcript.append(f"OBSERVATION: your last reply was not valid tool JSON ({out[:80]!r}). "
                              "Reply with the STRICT JSON format.")
            trace.add(agent["id"], "research", note=f"parse miss on turn {turns}")
            continue
        thought = str(dec.get("thought", ""))[:300]
        act = dec["action"]
        tool, args = act.get("tool"), act.get("args") or {}
        trace.add(agent["id"], "research", thought=thought, action=tool, args=args)
        transcript.append(f"YOU: {json.dumps(dec, ensure_ascii=False)[:400]}")
        if tool == "finish":
            break
        if tool == "web_search":
            rows = tools.web_search(str(args.get("query", topic))[:200],
                                    int(args.get("num", 8) or 8))
            for r in rows:
                all_rows[r["url"]] = r
            obs = json.dumps([{"title": r["title"], "host": r["host"], "snippet": r["snippet"]}
                              for r in rows], ensure_ascii=False)
        else:
            obs = f"unknown tool {tool!r}; available: web_search, finish"
        trace.add(agent["id"], "research", observation=f"{len(all_rows)} rows total")
        transcript.append(f"OBSERVATION: {obs[:3800]}")
    # distill: gaps/entities/FAQ from the collected rows
    rows = list(all_rows.values())[:12]
    distill = squad.llm(
        squad.system_prompt(squad.pick("brief-architect")),
        "From these live SERP results, extract STRICT JSON: {\"gaps\": [3-5 things competitors "
        "cover weakly or miss], \"entities\": [8-14 concrete tool/product/feature names worth "
        "covering], \"faq_questions\": [6-8 real user questions implied by the SERP]}\n"
        "TOPIC: " + topic + "\nSERP ROWS:\n" + json.dumps(rows, ensure_ascii=False)[:6000],
        stage="fast", max_tokens=1400)
    d = parse_json(distill) or {}
    result = {"rows": rows,
              "gaps": d.get("gaps") or [], "entities": d.get("entities") or [],
              "faq_questions": d.get("faq_questions") or []}
    (tools.run_dir / "research.json").write_text(json.dumps(result, indent=1, ensure_ascii=False),
                                                 encoding="utf-8")
    trace.add(agent["id"], "research", result={"rows": len(rows), "gaps": len(result["gaps"]),
                                               "entities": len(result["entities"])})
    return result


# ────────────────────────────────────────────────────────────────
#  Phase 2 — Planner: explicit plan artifact before drafting
# ────────────────────────────────────────────────────────────────

def run_planner(squad, trace: Trace, topic: str, keywords: list[str], research: dict,
                links: list[dict], wmin: int, wmax: int) -> dict:
    agent = squad.pick("brief-architect")
    plan_prompt = f"""Build the writing plan for a {wmin}-{wmax} word definitive guide: "{topic}".

RESEARCH: gaps={json.dumps(research.get('gaps', []), ensure_ascii=False)}
entities={json.dumps(research.get('entities', [])[:14], ensure_ascii=False)}

Return STRICT JSON:
{{"angle": "one-sentence unique angle that beats the SERP",
 "outline": [8-10 objects {{"h2": "section title", "words": 250-450, "points": [2-4 concrete points],
              "keywords": [0-2 keywords placed here]}}],
 "entities_to_cover": [6-12 from research],
 "faq_questions": [8 questions],
 "link_plan": [objects {{"slug": "...", "where": "section h2", "anchor": "3-6 word phrase"}}],
 "risks": [1-3 things that could make this draft fail its gates]}}
Rules: first outline item must plan the opening (primary keyword in first 100 words), include one
"Table of Contents" item, one comparison-table section, "Pro Tips and Key Takeaways",
"Frequently Asked Questions", "Final Verdict" (with ExtensionTo CTA)."""
    raw = squad.llm(squad.system_prompt(agent), plan_prompt, stage="heavy", max_tokens=2600)
    plan = parse_json(raw) or {}
    if not plan.get("outline"):
        plan = {"angle": f"Hands-on, trade-off-honest guide to {topic}",
                "outline": [], "entities_to_cover": research.get("entities", [])[:10],
                "faq_questions": research.get("faq_questions", [])[:8], "link_plan": [], "risks": []}
        trace.add(agent["id"], "plan", note="planner JSON missing outline → safe fallback plan")
    plan["link_plan"] = plan.get("link_plan") or [
        {"slug": l["slug"], "where": "(any fitting section)", "anchor": "(natural 3-6 word phrase)"}
        for l in links]
    (trace.path.parent / "plan.json").write_text(json.dumps(plan, indent=1, ensure_ascii=False),
                                                 encoding="utf-8")
    trace.add(agent["id"], "plan", sections=len(plan["outline"]), angle=str(plan.get("angle"))[:120])
    return plan


# ────────────────────────────────────────────────────────────────
#  Phase 3 — Writer: plan-driven drafting (single strong pass)
# ────────────────────────────────────────────────────────────────

def run_writer(squad, trace: Trace, topic: str, keywords: list[str], plan: dict,
               research: dict, links_block: str, wmin: int, wmax: int,
               refine_body: str = "") -> str:
    agent = squad.pick("writer")
    outline_txt = "\n".join(
        f"- {o.get('h2', '?')} (~{o.get('words', 300)}w): {'; '.join(o.get('points', [])[:3])}"
        for o in plan.get("outline", []))
    intel_txt = "\n".join(f"- {r['title']} ({r['host']}): {r['snippet']}"
                          for r in research.get("rows", [])[:8]) or "- (no rows)"
    mode = (f"REFINE this existing article into a definitive {wmin}-{wmax} word guide.\n"
            f"Keep its proven structure and every factual point; expand thin sections with "
            f"practical step-by-step detail; refresh to current-year context.\n\n"
            f"EXISTING ARTICLE:\n{refine_body[:13000]}\n\n") if refine_body else ""
    prompt = f"""{mode}Write the article: "{topic}"  (target {wmin + 200} words, hard max {wmax}).

PLANNED ANGLE: {plan.get('angle', '')}
PLANNED OUTLINE (follow it, keep headings verbatim where given):
{outline_txt or '(planner produced no outline — use the default structure below)'}

ENTITIES TO COVER: {', '.join(str(e) for e in plan.get('entities_to_cover', [])[:12])}
COMPETITOR GAPS TO EXPLOIT: {'; '.join(str(g) for g in research.get('gaps', [])[:5])}

SERP INTEL:
{intel_txt}

REQUIRED STRUCTURE: "## Table of Contents" after the opening; 8-10 "## " sections (each heading
ends with {{#anchor-slug}}); at least one comparison markdown table (3+ rows, real named tools);
"## Pro Tips and Key Takeaways"; "## Frequently Asked Questions" with exactly 8 "### " questions;
"## Final Verdict" with one natural ExtensionTo CTA sentence.

INTERNAL LINKS (use ALL, descriptive anchors, never in headings):
{links_block}
EXTERNAL LINKS: 3-5 to developer.chrome.com / support.google.com / chromium.org / en.wikipedia.org only.

STYLE: concrete steps, honest trade-offs, first-person testing voice where credible, zero fluff.
Output ONLY the markdown body (no H1, no frontmatter, no code fence)."""
    lessons = relevant_lessons(squad, topic + " " + " ".join(keywords))
    sys_p = squad.system_prompt(agent) + "\n\nTOP RELEVANT LESSONS:\n" + "\n".join(
        f"- {l}" for l in lessons)
    t0 = time.time()
    body = strip_md(squad.llm(sys_p, prompt, stage="writer", max_tokens=9000))
    trace.add(agent["id"], "write", words=wc(body), seconds=round(time.time() - t0, 1))
    return body


# ────────────────────────────────────────────────────────────────
#  Phase 4 — Critic: structured rubric + TARGETED revision loop
# ────────────────────────────────────────────────────────────────

CRITIC_SYSTEM = """You are the quality critic for a production SEO article.
Score the draft on this rubric, each 0-10:
 depth (practical detail beyond SERP competitors), specificity (real names, numbers, steps),
 accuracy_signals (calibrated claims, honest trade-offs, no invented lab results),
 flow (opening hook, section transitions, ending strength),
 keyword_integration (primary keyword in opening; secondary in headings; zero stuffing).
Return STRICT JSON: {"scores": {"depth": n, "specificity": n, "accuracy_signals": n,
 "flow": n, "keyword_integration": n}, "feedback": [{"dimension": "...", "problem": "...",
 "fix": "one concrete instruction"}], "verdict": "approve" | "revise"}
Approve only if every score >= 7 and no HIGH-impact problem remains. Max 5 feedback items."""


def run_critic(squad, trace: Trace, body: str, topic: str, keywords: list[str]) -> dict:
    agent = squad.pick("editor") if any(a.get("role") == "editor" for a in squad.agents) \
        else squad.pick("qa-gatekeeper")
    raw = squad.llm(
        squad.system_prompt(agent) + "\n\n" + CRITIC_SYSTEM,
        f"TOPIC: {topic}\nKEYWORDS: {', '.join(keywords[:6])}\n\nDRAFT:\n{body[:15000]}",
        stage="heavy", max_tokens=1600)
    parsed = parse_json(raw) or {}
    scores = parsed.get("scores") or {}
    fb = parsed.get("feedback") or []
    # POLICY ENFORCEMENT: the critic's own rubric says "approve only if every
    # score >= 7". LLM verdicts were observed contradicting their own scores
    # (all >= 7 but verdict=revise), so the rule is enforced in code — in BOTH
    # directions (a 6 with verdict=approve is still a revise).
    verdict = "approve" if (scores and min(scores.values()) >= 7) else "revise"
    avg = round(sum(scores.values()) / len(scores), 1) if scores else 0.0
    trace.add(agent["id"], "critique", avg=avg, verdict=verdict,
              llm_verdict=parsed.get("verdict"),
              feedback=[f.get("dimension") for f in fb])
    return {"scores": scores, "avg": avg, "feedback": fb, "verdict": verdict,
            "agent": agent["id"]}


def compress_pass(squad, trace: Trace, body: str, wmin: int, wmax: int) -> str:
    """Strategy switch: when ONLY the length gate fails and quality is already
    approved by the critic, run a PURE compression call — no critic feedback
    mixed in (mixing add-type fixes with cut instructions was proven to stall
    compression in round history)."""
    agent = squad.pick("editor") if any(a.get("role") == "editor" for a in squad.agents) \
        else squad.pick("writer")
    t0 = time.time()
    out = strip_md(squad.llm(
        squad.system_prompt(agent),
        f"Compress this article from {wc(body)} words to {wmin}-{wmax} words (target "
        f"{wmax - 150}).\nSTRICT RULES:\n"
        f"- Keep EVERY '## ' heading and its anchor suffix.\n"
        f"- Keep the comparison table and every row.\n"
        f"- Keep EXACTLY 8 '### ' questions in 'Frequently Asked Questions'.\n"
        f"- Keep 'Final Verdict' and its CTA.\n"
        f"- Cut ONLY prose redundancy: trim paragraphs to core sentences, drop 1 of every 3 "
        f"bullets in long lists, delete restatements.\n"
        f"- Do NOT add anything new.\n"
        f"Output ONLY the compressed markdown body.\n\nARTICLE:\n{body[:15000]}",
        stage="writer", max_tokens=9000))
    trace.add(agent["id"], "compress", words=wc(out), seconds=round(time.time() - t0, 1))
    return out


def targeted_revision(squad, trace: Trace, body: str, topic: str, gate_fail: list[str],
                      critic: dict, wmin: int, wmax: int) -> str:
    """Revision targeted ONLY at what failed — never a blind full rewrite."""
    agent = squad.pick("editor") if any(a.get("role") == "editor" for a in squad.agents) \
        else squad.pick("writer")
    fixes = []
    if "word_count" in gate_fail:
        words = wc(body)
        fixes.append(f"WORD COUNT: draft is {words} words — expand thin sections with deeper "
                     f"step-by-step detail and fuller FAQ answers to hit {wmin}-{wmax}."
                     if words < wmin else
                     f"WORD COUNT: draft is {words} words — compress to {wmin}-{wmax}, keep all sections.")
    if "faq8" in gate_fail:
        fixes.append("FAQ: 'Frequently Asked Questions' must contain exactly 8 '### ' questions.")
    if "toc" in gate_fail:
        fixes.append("Add a '## Table of Contents' section right after the opening.")
    if "verdict" in gate_fail:
        fixes.append("'## Final Verdict' is too thin — write a 120+ char recommendation with an ExtensionTo CTA.")
    if "h2_sections" in gate_fail:
        fixes.append("Use real '## ' H2 headings (6+ sections; H3 only inside FAQ).")
    if "comparison_table" in gate_fail:
        fixes.append("Add one comparison markdown table with 3+ rows of real named tools.")
    if "brackets_balanced" in gate_fail or "no_nested_links" in gate_fail or "no_split_words" in gate_fail:
        fixes.append("Markdown link damage detected (nested/heading/split links or unbalanced "
                     "brackets) — repair the broken [anchor](url) instances.")
    fixes += [f"{f.get('dimension')}: {f.get('problem')} → {f.get('fix')}"
              for f in critic.get("feedback", [])[:5]]
    over_limit = wc(body) > wmax
    if over_limit:
        excess = wc(body) - (wmax - 150)
        ratio = round(100 * excess / max(wc(body), 1))
        fixes.insert(0, f"LENGTH IS A HARD GATE: the draft is {wc(body)} words and MUST come down "
                     f"to {wmin}-{wmax}. Required cut: ~{excess} words (~{max(ratio, 10)}% of the "
                     f"body). Reduce EVERY section proportionally by ~{max(ratio, 10)}%: trim each "
                     f"paragraph to its core sentences, drop 1 of every 3 bullets in long lists, "
                     f"delete sentences that restate earlier points. KEEP every '## ' heading, the "
                     f"comparison table, 8 FAQ questions and the Final Verdict. Do NOT add new "
                     f"content. Target {wmax - 150} words.")
    sys_p = squad.system_prompt(agent)
    t0 = time.time()
    constraint = (f"\n\nHARD CONSTRAINT: final length must be <= {wmax} words. If any fix below "
                  f"conflicts with this budget, skip that fix — length wins."
                  if over_limit else f"\nKeep word count within {wmin}-{wmax}.")
    new_body = strip_md(squad.llm(
        sys_p,
        f"Revise this article ({topic}). Apply ONLY these fixes and keep everything else "
        f"as-is (do not rewrite approved parts, do not change heading anchors):\n"
        + "\n".join(f"- {x}" for x in fixes)
        + f"{constraint}\nOutput ONLY the full revised markdown body.\n\n"
          f"CURRENT DRAFT:\n{body[:14000]}",
        stage="writer", max_tokens=9000))
    trace.add(agent["id"], "revise", fixes=len(fixes), words=wc(new_body),
              seconds=round(time.time() - t0, 1))
    return new_body


# ────────────────────────────────────────────────────────────────
#  Phase 5 — Reflector: one durable lesson back to shared memory
# ────────────────────────────────────────────────────────────────

def run_reflector(squad, trace: Trace, run_dir: Path, story: str) -> dict | None:
    """story = compact narrative of what went wrong and what fixed it."""
    agent = squad.pick("learning-scribe") if any(a.get("role") == "learning-scribe"
                                                 for a in squad.agents) else None
    sys_p = squad.system_prompt(agent) if agent else "You are the learning scribe."
    raw = squad.llm(
        sys_p,
        "From this production run story, extract AT MOST ONE durable, reusable lesson. "
        "Return STRICT JSON: {\"severity\": \"critical|high|medium\", \"lesson\": \"one specific "
        "actionable sentence with the concrete regex/number/gate involved\", \"tags\": \"comma,separated\"} "
        "or {\"skip\": true} if nothing durable.\n\nSTORY:\n" + story[:3000],
        stage="fast", max_tokens=400)
    out = parse_json(raw) or {}
    if not out or out.get("skip") or not out.get("lesson"):
        trace.add("AG008", "reflect", note="no durable lesson")
        return None
    lesson = {"id": "", "severity": out.get("severity", "medium"),
              "lesson": str(out["lesson"])[:400], "tags": out.get("tags", ""),
              "date": datetime.now(timezone.utc).strftime("%Y-%m-%d")}
    mem_path = Path("/home/z/my-project/agents/memory/learnings.json")
    try:
        mem = json.loads(mem_path.read_text(encoding="utf-8"))
        words = set(WORD_RE.findall(lesson["lesson"].lower()))
        dup = any(len(words & set(WORD_RE.findall(str(l.get("lesson", "")).lower())))
                  / max(len(words | set(WORD_RE.findall(str(l.get("lesson", "")).lower()))), 1) > 0.55
                  for l in mem.get("lessons", []))
        if dup:
            trace.add("AG008", "reflect", note="duplicate lesson — skipped")
            return None
        lesson["id"] = f"L{len(mem.get('lessons', [])) + 1:03d}"
        mem.setdefault("lessons", []).append(lesson)
        mem["updated"] = lesson["date"]
        mem_path.write_text(json.dumps(mem, indent=1, ensure_ascii=False), encoding="utf-8")
        trace.add("AG008", "reflect", lesson=lesson["id"], severity=lesson["severity"])
        return lesson
    except (OSError, json.JSONDecodeError):
        return None


# ────────────────────────────────────────────────────────────────
#  Orchestrator — the agentic engine (called by pro_run --engine agentic)
# ────────────────────────────────────────────────────────────────

def run_agentic(squad, log, run_dir: Path, topic: str, keywords: list[str],
                links: list[dict], links_block: str, wmin: int, wmax: int,
                refine_body: str = "", max_rounds: int = 3) -> dict:
    """Full Anthropic-style loop. Returns {body, gates, rubric_history, research, plan, meta_inputs}."""
    trace = Trace(run_dir)
    tools = Toolbelt(trace, run_dir)
    log("AG000", "orchestrator", f"engine=agentic — trace at {trace.path.name}")

    research = run_research(squad, trace, tools, topic, keywords)
    log("AG000", "orchestrator",
        f"research done: {len(research['rows'])} SERP rows, {len(research['gaps'])} gaps, "
        f"{len(research['entities'])} entities")
    plan = run_planner(squad, trace, topic, keywords, research, links, wmin, wmax)
    log("AG000", "orchestrator", f"plan: {len(plan['outline'])} sections — {str(plan.get('angle'))[:80]}")

    body = run_writer(squad, trace, topic, keywords, plan, research, links_block,
                      wmin, wmax, refine_body)
    log("AG000", "orchestrator", f"draft v1: {wc(body)} words")

    rubric_history = []
    ok, detail, critic = False, "", {}
    for rnd in range(1, max_rounds + 1):
        gates = tools.gate_check(body, wmin, wmax)
        critic = run_critic(squad, trace, body, topic, keywords)
        rubric_history.append({"round": rnd, "words": gates["words"], "gates_pass": gates["pass"],
                               "gate_failed": gates["failed"], "critic_avg": critic["avg"],
                               "critic_verdict": critic["verdict"]})
        log("AG000", "orchestrator",
            f"round {rnd}: gates={'PASS' if gates['pass'] else 'FAIL:' + ','.join(gates['failed'])} "
            f"critic_avg={critic['avg']} ({critic['verdict']})")
        if gates["pass"] and critic["verdict"] == "approve":
            ok = True
            break
        body = targeted_revision(squad, trace, body, topic, gates["failed"], critic, wmin, wmax)
        log("AG000", "orchestrator", f"targeted revision applied → {wc(body)} words")

    final_gates = tools.gate_check(body, wmin, wmax)
    (run_dir / "rubric_history.json").write_text(json.dumps(rubric_history, indent=1), encoding="utf-8")
    if not ok:
        story = (f"Article '{topic}' failed gates {final_gates['failed']} after {max_rounds} rounds; "
                 f"last critic avg {critic.get('avg')}. Feedback was: "
                 f"{json.dumps([f.get('fix') for f in critic.get('feedback', [])])[:600]}")
        run_reflector(squad, trace, run_dir, story)
    return {"body": body, "trace": trace, "research": research, "plan": plan,
            "rubric_history": rubric_history, "gates": final_gates, "qa_pass": ok}


# ────────────────────────────────────────────────────────────────
#  Phase 6 — Claim-level fact check: extract → verify against search
#  results → "uncertain" whenever no source exists (code-enforced).
# ────────────────────────────────────────────────────────────────

_MONTHS = ("January|February|March|April|May|June|July|August|September|"
           "October|November|December")

# Deterministic claim extraction patterns (no LLM tokens spent here).
CLAIM_PATTERNS: list[tuple[str, re.Pattern]] = [
    ("percentage", re.compile(r"\b\d+(?:\.\d+)?\s?%(?:\s*(?:of|off)\b[^.!?\n]{0,80})?", re.I)),
    ("date", re.compile(rf"\b(?:{_MONTHS})\s+20\d{{2}}\b")),
    ("year_ref", re.compile(r"\b(?:in|since|by|as of|until)\s+20[12]\d\b", re.I)),
    ("version", re.compile(r"\b(?:Chrome(?:ium)?|Manifest)\s+V?\d+(?:\.\d+)+\b", re.I)),
    ("policy_name", re.compile(
        r"\b(?:Chrome Web Store [A-Za-z ]{0,40}?(?:policies?|policy|program|terms|requirements)|"
        r"Developer (?:Program )?Policies|Developer Terms of Service|Best Practices|"
        r"Manifest V3|Manifest V2|privacy policy|misleading or unexpected behavior|"
        r"minimal functionality)\b", re.I)),
    ("numeric_claim", re.compile(
        r"\b\d+(?:\.\d+)?\s?(?:days?|business days?|hours?|minutes?|weeks?|months?|"
        r"reviews?|extensions?|users?|characters?|MB|GB|requests?|attempts?)\b"
        r"(?:\s+(?:to|for|per|before|after|within|or)\b[^.!?\n]{0,60})?", re.I)),
    ("process_claim", re.compile(
        r"\b(?:you (?:must|need to|have to|are required to)|Google (?:requires|may|will)|"
        r"the (?:review|appeal) (?:process|team) [^.!?\n]{5,90})\b", re.I)),
]

CLAIM_BUDGET = 14          # cap per article
FACTSEARCH_BUDGET = 6      # max fresh searches for uncovered claims

_QUERY_STOP = re.compile(
    r"\b(?:you|must|need|have|the|and|for|with|that|this|are|your|can|will|from|"
    r"typically|handled|among|available|professionally|clearly|patient|smooth)\b", re.I)


def claim_query(claim: str, topic: str) -> str:
    """Turn a claim string into a usable search query: keep the claim's
    distinctive tokens and anchor them with the article topic so terse claims
    like '5 business days' or 'you must' become answerable queries."""
    tokens = [t for t in _QUERY_STOP.sub(" ", claim).split() if len(t) > 2]
    topic_tokens = [t for t in topic.split() if len(t) > 2][:5]
    q = " ".join(dict.fromkeys(topic_tokens + tokens))
    return q[:160]


def extract_claims(body: str) -> list[dict]:
    """Deterministic claim extraction — numbers, dates, policy names, process claims."""
    claims: dict[str, dict] = {}
    for ctype, rx in CLAIM_PATTERNS:
        for m in rx.finditer(body):
            text = " ".join(m.group(0).split())
            if len(text) < 4:
                continue
            key = text.lower()
            if key not in claims:
                claims[key] = {"claim": text, "type": ctype}
            # keep sentence context once per claim (helps the verifier)
            if "context" not in claims[key]:
                s = body.rfind(".", 0, m.start())
                e = body.find(".", m.end())
                claims[key]["context"] = " ".join(
                    body[s + 1 if s >= 0 else 0:e + 1 if e > 0 else m.end()].split())[:220]
    out = sorted(claims.values(), key=lambda c: (c["type"] != "policy_name",
                                                 c["type"] != "numeric_claim", c["claim"]))
    return out[:CLAIM_BUDGET]


FACTCHECK_SYSTEM = """You are a strict claim verifier. You get indexed CLAIMS from an
article and SEARCH RESULT ROWS (title/host/url/snippet). For EACH claim index return
a verdict:
- "supported": a row's snippet/title explicitly backs the claim → set source_url to that
  exact row URL and quote the supporting words in source_quote (<= 25 words).
- "refuted": a row explicitly contradicts it → source_url + what it says.
- "uncertain": no row actually verifies it. Do NOT guess, do NOT invent URLs.
Return STRICT JSON: {"verdicts": [{"i": <claim index>, "verdict":
"supported|refuted|uncertain", "source_url": "exact url from rows or empty",
"source_quote": "<=25 words or empty", "note": "<=15 words"}]}
One verdict object per claim index, same order, no extra keys."""


def _rows_subset(rows: list[dict], limit: int = 10) -> str:
    return json.dumps([{"title": r.get("title", ""), "host": r.get("host", ""),
                        "url": r.get("url", ""), "snippet": r.get("snippet", "")}
                       for r in rows][:limit], ensure_ascii=False)


def _norm_url(u: str) -> str:
    """Lenient URL identity: strip trailing slash and tracking params so an
    exact-citation check does not fail on cosmetic differences."""
    u = (u or "").split("#", 1)[0]
    u = u.split("?", 1)[0] if "utm_" in u else u
    return u.rstrip("/")


def _adjudicate(squad, claims: list[dict], rows: list[dict], label: str) -> dict:
    """Verification call(s) for a batch of claims against a set of rows.
    Claims are sent INDEXED and matched back by index — matching by echoed
    claim text broke when the verifier truncated long claim strings."""
    out: dict[str, dict] = {}
    allowed = {_norm_url(r.get("url", "")) for r in rows if r.get("url")}
    for chunk_start in range(0, len(claims), 8):
        chunk = claims[chunk_start:chunk_start + 8]
        raw = squad.llm(
            squad.system_prompt(squad.pick("fact-checker")) + "\n\n" + FACTCHECK_SYSTEM,
            "CLAIMS:\n" + json.dumps([{"i": i + 1, "claim": c["claim"]}
                                      for i, c in enumerate(chunk)], ensure_ascii=False)
            + "\n\nSEARCH RESULT ROWS:\n" + _rows_subset(rows),
            stage="heavy", max_tokens=2400)
        parsed = parse_json(raw) or {}
        verdicts = parsed.get("verdicts", []) if isinstance(parsed, dict) else []
        for pos, v in enumerate(verdicts):
            # primary match by index; positional fallback for a verifier that
            # echoes objects without "i"
            idx = v.get("i") if isinstance(v.get("i"), int) and 1 <= v["i"] <= len(chunk) \
                else pos + 1
            if idx - 1 >= len(chunk):
                continue
            c = chunk[idx - 1]
            url = str(v.get("source_url", "")).strip()
            verdict = str(v.get("verdict", "uncertain"))
            # CODE-ENFORCED: a "supported/refuted" verdict without a REAL source
            # URL from the supplied rows is downgraded to uncertain. The
            # verifier cannot upgrade a claim by inventing a citation.
            if verdict in ("supported", "refuted") and _norm_url(url) not in allowed:
                verdict, url = "uncertain", ""
            out[c["claim"].lower()] = {
                "claim": c["claim"], "verdict": verdict, "source_url": url,
                "source_quote": str(v.get("source_quote", ""))[:160],
                "note": str(v.get("note", ""))[:120], "stage": label}
    return out


def run_fact_check(squad, trace: Trace, tools: Toolbelt, body: str,
                   research_rows: list[dict] | None = None, topic: str = "") -> dict:
    """Extract factual/policy claims, verify each against search-result rows,
    downgrade anything without a real source to 'uncertain'. Saves
    fact_check_claims.json in the run dir."""
    agent = squad.pick("fact-checker")
    claims = extract_claims(body)
    rows = list(research_rows or [])
    trace.add(agent["id"], "factcheck", extracted=len(claims), rows=len(rows))
    results: dict[str, dict] = {}

    # Pass 1 — verify against rows we already collected during research
    if claims and rows:
        results.update(_adjudicate(squad, claims, rows, "research-rows"))

    # Pass 2 — targeted fresh searches ONLY for claims still unresolved
    unresolved = [c for c in claims if c["claim"].lower() not in results
                  or results[c["claim"].lower()]["verdict"] == "uncertain"]
    searches = 0
    fresh_rows: dict[str, list[dict]] = {}
    for c in unresolved:
        if searches >= FACTSEARCH_BUDGET:
            break
        searches += 1
        got = tools.web_search(claim_query(c["claim"], topic or c.get("context", "")), num=6)
        fresh_rows[c["claim"].lower()] = got
        trace.add(agent["id"], "factcheck", action="web_search",
                  query=claim_query(c["claim"], topic)[:120], observation=f"{len(got)} rows")
    # adjudicate in groups of 3 claims; verification rows = the UNION of those
    # claims' own fresh rows (10-row cap) so per-claim sources survive batching
    unresolved_with_rows = [c for c in unresolved if fresh_rows.get(c["claim"].lower())]
    for g in range(0, len(unresolved_with_rows), 3):
        batch = unresolved_with_rows[g:g + 3]
        batch_rows: list[dict] = []
        seen: set[str] = set()
        for c in batch:
            for r in fresh_rows[c["claim"].lower()]:
                if r.get("url") and r["url"] not in seen:
                    seen.add(r["url"])
                    batch_rows.append(r)
        results.update(_adjudicate(squad, batch, batch_rows, "fresh-search"))

    final = []
    for c in claims:
        r = results.get(c["claim"].lower(), {})
        final.append({"claim": c["claim"], "type": c["type"], "context": c.get("context", ""),
                      "verdict": r.get("verdict", "uncertain"), "source_url": r.get("source_url", ""),
                      "source_quote": r.get("source_quote", ""), "note": r.get("note", "")})
    summary = {"total": len(final),
               "supported": sum(1 for f in final if f["verdict"] == "supported"),
               "refuted": sum(1 for f in final if f["verdict"] == "refuted"),
               "uncertain": sum(1 for f in final if f["verdict"] == "uncertain"),
               "fresh_searches": searches}
    (tools.run_dir / "fact_check_claims.json").write_text(
        json.dumps({"summary": summary, "claims": final}, indent=1, ensure_ascii=False),
        encoding="utf-8")
    trace.add(agent["id"], "factcheck", result=summary)
    return {"summary": summary, "claims": final}
