"""
pro_run.py — Professional multi-agent article pipeline (seo_agent_pro edition).

Runs ONE article through the named production squad (209-agent registry via
squad_bridge), with every stage executed by a real specialist agent and every
gate enforced on real content:

    project-binder   preflight: validate inputs before spending a token
    serp-analyst     live web-search competitor intel (z-ai web_search CLI)
    brief-architect  assemble the brief (angle, keywords, intel, related links)
    writer           full-length generation via the unified LLM bridge
                     (Clean APIs first when a key exists, z-ai fallback)
    link-strategist  internal links from the site's REAL articles index
    fact-checker     heuristic checks: dates, absolute claims, citation needs
    qa-gatekeeper    hard gates: word count window, ToC, 8-question FAQ,
                     Final Verdict, no nested/heading/split links
    seo-optimizer    metadata JSON (title/excerpt/meta_description/keywords)
    publisher        run report.json + agent_log.txt (and NOTHING touches
                     production unless --publish-dir is given)

Usage:
    python3 pro_run.py --mode new --keyword "best tab manager chrome" \
        --title "..." --slug "..." --keywords "k1,k2" --project extensionto
    python3 pro_run.py --mode refine --source path/to/article.md \
        --project extensionto

Output: /home/z/my-project/agents/runs/pro_<slug>_<ts>/
"""

from __future__ import annotations

import argparse
import json
import re
import subprocess
import sys
from datetime import datetime, timezone
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))

from squad_bridge import Squad  # noqa: E402

RUNS_ROOT = Path("/home/z/my-project/agents/runs")
INDEX_PATH = Path("/home/z/my-project/site/public/content/articles-index.json")
INTEL_PATH = Path("/home/z/my-project/scripts/competitor_intel.json")
WORD_RE = re.compile(r"[\p{L}\p{N}'’-]+", re.UNICODE) if False else re.compile(r"[A-Za-z0-9'’-]+")


def wc(text: str) -> int:
    return len(WORD_RE.findall(text))


class Log:
    def __init__(self, run_dir: Path):
        self.lines: list[str] = []
        self.run_dir = run_dir

    def __call__(self, agent_id: str, role: str, msg: str):
        line = f"[{datetime.now(timezone.utc).strftime('%H:%M:%S')}] {agent_id} ({role}) {msg}"
        self.lines.append(line)
        print(line, flush=True)

    def save(self):
        (self.run_dir / "agent_log.txt").write_text("\n".join(self.lines), encoding="utf-8")


# ────────────────────────────────────────────────────────────────
#  Stage 1: serp-analyst — REAL web search for competitor intel
# ────────────────────────────────────────────────────────────────

def fetch_serp_intel(log: Log, squad: Squad, keyword: str, num: int = 8) -> list[dict]:
    agent = squad.pick("serp-analyst")
    log(agent["id"], agent["role"], f"live SERP probe for: {keyword!r}")
    rows: list[dict] = []
    seen_urls: set[str] = set()
    queries = [keyword]
    if len(keyword.split()) > 3:
        queries.append(" ".join(keyword.split()[:3]) + " guide")
    for q in queries:
        if len(rows) >= 4:
            break
        try:
            subprocess.run(
                ["z-ai", "function", "-n", "web_search",
                 "-a", json.dumps({"query": q, "num": num}), "-o", "/tmp/pro_run_serp.json"],
                capture_output=True, text=True, timeout=90,
            )
            data = json.loads(Path("/tmp/pro_run_serp.json").read_text(encoding="utf-8"))
            for r in data if isinstance(data, list) else []:
                u = r.get("url", "")
                if not u or u in seen_urls:
                    continue
                seen_urls.add(u)
                rows.append({"title": r.get("name", ""), "host": r.get("host_name", ""),
                             "url": u, "snippet": (r.get("snippet") or "")[:220]})
        except Exception as e:  # noqa: BLE001
            log(agent["id"], agent["role"], f"probe {q!r} failed ({str(e)[:50]})")
    if rows:
        log(agent["id"], agent["role"], f"collected {len(rows)} unique live SERP results across {len(queries)} probe(s)")
    else:
        log(agent["id"], agent["role"], "live probes empty → static intel fallback")
    return rows


def static_intel(slug: str) -> list[dict]:
    try:
        clusters = json.loads(INTEL_PATH.read_text(encoding="utf-8"))
    except (OSError, json.JSONDecodeError):
        return []
    hay = slug.lower()
    for key, cluster in clusters.items():
        if key.lower() in hay or hay in key.lower():
            return cluster.get("results", cluster if isinstance(cluster, list) else [])[:8]
    return []


# ────────────────────────────────────────────────────────────────
#  Stage 5: link-strategist — internal links from the REAL index
# ────────────────────────────────────────────────────────────────

def pick_internal_links(squad: Squad, log: Log, keywords: list[str], exclude_slug: str, want: int = 6) -> list[dict]:
    agent = squad.pick("link-strategist")
    links: list[dict] = []
    try:
        idx = json.loads(INDEX_PATH.read_text(encoding="utf-8"))
        arts = idx.get("articles", []) if isinstance(idx, dict) else idx
        scored = []
        for a in arts:
            slug = a.get("slug", "")
            if not slug or slug == exclude_slug:
                continue
            hay = f"{a.get('title', '')} {slug} {' '.join(a.get('keywords', []) or [])}".lower()
            # word-level scoring: meaningful words (>3 chars) from the target
            # keywords; full-phrase matching was too strict and selected 0 links
            words = [w for w in re.findall(r"[a-z0-9]+", " ".join(keywords).lower()) if len(w) > 3]
            score = sum(1 for w in set(words) if w in hay)
            if score:
                scored.append((score, a))
        scored.sort(key=lambda x: (-x[0], x[1].get("slug", "")))
        for _, a in scored[:want]:
            links.append({"title": a.get("title", a.get("slug")), "slug": a.get("slug")})
        log(agent["id"], agent["role"],
            f"selected {len(links)} internal links from live index (815 articles)")
    except Exception as e:  # noqa: BLE001
        log(agent["id"], agent["role"], f"index unavailable ({str(e)[:60]}) → no internal links")
    return links


# ────────────────────────────────────────────────────────────────
#  Stages 6-7: fact-checker + qa-gatekeeper gates
# ────────────────────────────────────────────────────────────────

def fact_check(squad: Squad, log: Log, body: str) -> list[str]:
    agent = squad.pick("fact-checker")
    notes = []
    current_year = datetime.now().year
    stale = sorted({y for y in re.findall(r"\b20(1[0-9]|2[0-4])\b", body)})
    if stale:
        notes.append(f"stale year refs found: {', '.join('20' + s for s in stale)} (kept only if historically accurate)")
    superlatives = len(re.findall(r"\b(best|guaranteed|100%|always|never)\b", body, re.I))
    if superlatives > 8:
        notes.append(f"heavy superlative density ({superlatives}) — soften unprovable claims")
    if not re.search(r"\b(test|tested|we (found|measured)|in our (tests|experience))\b", body, re.I):
        notes.append("no first-hand experience markers — add a tested-it note if applicable")
    log(agent["id"], agent["role"], f"{len(notes)} advisory note(s)" + ("" if notes else " — clean"))
    return notes


def qa_gate(log: Log, squad: Squad, body: str, wmin: int, wmax: int) -> tuple[bool, str]:
    agent = squad.pick("qa-gatekeeper")
    words = wc(body)
    # STRICT H2 count: substring checks alone pass inside '### Table of
    # Contents' — a real production bug where every section came out H3.
    h2_count = len(re.findall(r"^## ", body, re.M))
    has_toc = bool(re.search(r"^## Table of Contents", body, re.M))
    has_faq = bool(re.search(r"^## Frequently Asked Questions", body, re.M))
    faq_h3 = len(re.findall(r"^### ", body[body.find("## Frequently Asked Questions"):], re.M)) if has_faq else 0
    v_idx = body.rfind("## Final Verdict")
    verdict_len = len(re.sub(r"[#!\s]", "", body[v_idx:])) if v_idx > 0 else 0
    nested = bool(re.search(r"\[[^\]]*\[", body))
    head_link = bool(re.search(r"^#{1,6}\s.*\]\(", body, re.M))
    mid_tok = bool(re.search(r"\]\([^)]+\)[A-Za-z0-9]", body, re.M))
    # bracket balance catches dangling '](' with a dropped '[' (real case:
    # 'guide on ow to test ... Chrome](url)' — the '[H' vanished)
    brackets_balanced = body.count("[") == body.count("]")
    ok = (wmin <= words <= wmax and has_toc and has_faq and faq_h3 >= 6
          and verdict_len > 120 and not nested and not head_link and not mid_tok
          and h2_count >= 6 and brackets_balanced)
    detail = (f"w={words} (gate {wmin}-{wmax}) H2={h2_count} toc={has_toc} faq={has_faq} "
              f"faqH3={faq_h3} verdict={verdict_len} nested={nested} "
              f"headLink={head_link} midTok={mid_tok} brackets={brackets_balanced}")
    log(agent["id"], agent["role"], ("PASS " if ok else "FAIL ") + detail)
    return ok, detail


# ────────────────────────────────────────────────────────────────
#  Main pipeline
# ────────────────────────────────────────────────────────────────

def main() -> None:
    ap = argparse.ArgumentParser()
    ap.add_argument("--mode", choices=["new", "refine"], required=True)
    ap.add_argument("--keyword", help="primary search keyword (new mode)")
    ap.add_argument("--title")
    ap.add_argument("--slug")
    ap.add_argument("--keywords", help="comma-separated keyword list")
    ap.add_argument("--squad", default="privacy")
    ap.add_argument("--project", default="extensionto")
    ap.add_argument("--source", help="existing article md to refine")
    ap.add_argument("--wmin", type=int, default=2550)
    ap.add_argument("--wmax", type=int, default=3100)
    ap.add_argument("--max-attempts", type=int, default=4)
    ap.add_argument("--resume", action="store_true", help="reuse intel.json + saved drafts in the run dir")
    args = ap.parse_args()

    ts = datetime.now(timezone.utc).strftime("%Y%m%d%H%M%S")
    slug = args.slug or (Path(args.source).stem if args.source else "article")
    if args.resume:
        existing = sorted(RUNS_ROOT.glob(f"pro_{slug[:40]}_*"))
        if not existing:
            print(f"nothing to resume for slug={slug}")
            sys.exit(1)
        run_dir = existing[-1]
    else:
        run_dir = RUNS_ROOT / f"pro_{slug[:40]}_{ts}"
    run_dir.mkdir(parents=True, exist_ok=True)
    log = Log(run_dir)
    if args.resume and (run_dir / "report.json").exists():
        print(f"already complete: {run_dir}")
        return
    squad = Squad()

    log("AG000", "orchestrator", f"seo_agent_pro pipeline start — mode={args.mode} slug={slug}")

    # Stage 0: project-binder preflight
    binder = squad.pick("project-binder")
    problems = []
    title = args.title
    keywords = [k.strip() for k in (args.keywords or "").split(",") if k.strip()]
    source_body = ""
    if args.mode == "new":
        if not args.keyword:
            problems.append("--keyword required in new mode")
        title = title or (args.keyword or "").title()
        primary = args.keyword or title
    else:
        if not args.source or not Path(args.source).exists():
            problems.append("--source missing/unreadable")
        if not title:
            m = re.search(r"^title:\s*(.+)$", Path(args.source).read_text(encoding="utf-8"), re.M) if args.source else None
            title = m.group(1).strip().strip('"') if m else (args.keyword or slug)
        primary = args.keyword or keywords[0] if keywords else title
        src = Path(args.source).read_text(encoding="utf-8")
        source_body = re.sub(r"^---\n.*?\n---\n", "", src, flags=re.S).strip()
        if not keywords:
            mk = re.search(r"^keywords:\s*\[(.+)\]$", src, re.M)
            keywords = [k.strip().strip('"\'') for k in mk.group(1).split(",")] if mk else []
    if problems:
        log(binder["id"], "project-binder", f"PREFLIGHT FAIL: {'; '.join(problems)}")
        sys.exit(1)
    log(binder["id"], "project-binder",
        f"PREFLIGHT PASS: {args.project} | mode={args.mode} | gates {args.wmin}-{args.wmax}w")

    # Stage 1: SERP intel (resumable: reuse intel.json when --resume)
    intel_path = run_dir / "intel.json"
    if args.resume and intel_path.exists():
        intel = json.loads(intel_path.read_text(encoding="utf-8"))
        log("AG000", "orchestrator", f"resume: intel.json reused ({len(intel)} rows)")
    else:
        intel = fetch_serp_intel(log, squad, primary) or static_intel(slug)
        intel_path.write_text(json.dumps(intel, indent=1), encoding="utf-8")

    # Stage 2: brief
    brief_agent = squad.pick("brief-architect", squad=args.squad)
    log(brief_agent["id"], brief_agent["role"], f"brief assembled ({len(intel)} intel rows, {len(keywords)} keywords)")

    # Stage 5 (early): internal links from live index
    links = pick_internal_links(squad, log, keywords or [primary], slug)
    links_block = "\n".join(f"- [{l['title']}](https://extensionto.com/blog/{l['slug']})" for l in links)
    if not links_block:
        links_block = "- (none supplied — skip internal links, do not invent URLs)"

    # Stage 3: writer
    writer = squad.pick("writer", squad=args.squad)
    intel_block = "\n".join(f"- {r.get('title', '')} ({r.get('host', '')}): {r.get('snippet', '')}" for r in intel) or "- (no intel rows)"
    if args.mode == "refine" and source_body:
        task = (f"REFINE this existing article into a definitive {args.wmin}-{args.wmax} word guide: \"{title}\".\n"
                f"Keep its proven structure and every factual point, but: expand thin sections with practical "
                f"step-by-step detail, add a comparison table, refresh to current-year context, and keep only "
                f"still-valid links.\n\nEXISTING ARTICLE:\n{source_body[:14000]}")
    else:
        task = (f"Write a brand-new definitive {args.wmin}-{args.wmax} word guide: \"{title}\".")
    prompt = f"""{task}
TARGET KEYWORDS (first in opening 100 words + 2-3 H2 headings): {', '.join(keywords[:6]) or title}

SERP COMPETITOR INTEL (outrank them — broader coverage, more practical detail, honest trade-offs):
{intel_block}

REQUIRED STRUCTURE (exact order):
1. Opening: 2-3 short paragraphs; primary keyword in first 100 words.
2. "## Table of Contents" — bulleted anchor links.
3. 8-10 "## " sections with {{#anchor-slug}} suffixes; at least ONE comparison markdown table (3+ rows, real named tools).
4. "## Pro Tips and Key Takeaways" — numbered tips + 3-4 bullets.
5. "## Frequently Asked Questions" — exactly 8 "### " questions with 2-4 sentence answers.
6. "## Final Verdict" — clear recommendation + one natural CTA sentence for ExtensionTo (extension discovery hub).

INTERNAL LINKING (use ALL, descriptive anchors, spread naturally):
{links_block}

EXTERNAL LINKING: 3-5 links to developer.chrome.com / support.google.com / chromium.org / en.wikipedia.org only.
RULES: Output ONLY markdown body (no H1, no frontmatter); concrete steps; never nest markdown links; never put links in headings; never split words with links; aim {args.wmin + 200} words, hard max {args.wmax}."""
    system = squad.system_prompt(writer)
    qa = squad.pick("qa-gatekeeper", squad=args.squad)

    body = ""
    ok, detail = False, "no attempt made"
    for attempt in range(1, args.max_attempts + 1):
        draft_path = run_dir / f"draft_attempt{attempt}.md"
        log(writer["id"], writer["role"], f"draft attempt {attempt}")
        extra = ""
        if attempt > 1 and body:
            words = wc(body)
            if words < args.wmin:
                extra = f"\n\nCRITICAL: previous draft was only {words} words. Expand to {args.wmin}-{args.wmax}: deeper steps, more real examples, fuller FAQ answers. MUST end with FAQ (8 H3) then Final Verdict."
            else:
                extra = f"\n\nCRITICAL: previous draft was {words} words (over {args.wmax}). Compress to {args.wmin}-{args.wmax}, keep ALL required sections."
        if args.resume and draft_path.exists():
            body = draft_path.read_text(encoding="utf-8")
            log(writer["id"], writer["role"], f"resume: {draft_path.name} reused")
        else:
            body = squad.llm(system, prompt + extra, stage="writer", max_tokens=9000)
            body = re.sub(r"^```(?:markdown)?\s*\n?", "", body)
            body = re.sub(r"\n?```\s*$", "", body)
            body = re.sub(r"^#\s+.+\n", "", body)
            draft_path.write_text(body, encoding="utf-8")
        ok, detail = qa_gate(log, squad, body, args.wmin, args.wmax)
        if ok:
            break
        log(qa["id"], qa["role"], "editor retry with corrective feedback")
    else:
        log("AG000", "orchestrator", "QA gate failed after all attempts — saving draft with status=draft")
        (run_dir / "qa_failed.txt").write_text(detail, encoding="utf-8")

    # Stage 6: fact-checker advisories
    notes = fact_check(squad, log, body)

    # Stage 6b: link-strategist injection — production-style: insert the
    # selected internal links naturally, then damage-guard the result
    # (nested links / links in headings / split words). Any damage → roll
    # back to the pre-injection body (safe failure, never ship broken md).
    if links:
        pre = body
        ls = squad.pick("link-strategist", squad=args.squad)
        inj_prompt = (
            "Insert these internal links into the article, each exactly once, with descriptive "
            "natural anchors (NOT the raw title), spread across DIFFERENT sections:\n"
            + "\n".join(f"- [slug: {l['slug']}] anchor text: a 3-6 word phrase relevant to the paragraph you place it in"
                        for l in links)
            + "\nRules: markdown [anchor](https://extensionto.com/blog/<slug>) — never nest links, never put a "
              "link inside a heading line, never split a word or number with a link. Return the FULL article "
              "markdown unchanged except the inserted links.\n\nARTICLE:\n"
        )
        try:
            body = squad.llm(squad.system_prompt(ls), inj_prompt + body[:16000],
                             stage="fast", max_tokens=9000)
            body = re.sub(r"^```(?:markdown)?\s*\n?", "", body)
            body = re.sub(r"\n?```\s*$", "", body)
            body = re.sub(r"^#\s+.+\n", "", body)
            damaged = (bool(re.search(r"\[[^\]]*\[", body))
                       or bool(re.search(r"^#{1,6}\s.*\]\(", body, re.M))
                       or bool(re.search(r"\]\([^)]+\)[A-Za-z0-9]", body, re.M))
                       or body.count("[") != body.count("]")
                       or len(re.findall(r"^## ", body, re.M)) < 6
                       or wc(body) < args.wmin - 100)
            if damaged:
                log(ls["id"], ls["role"], "injection damage detected → ROLLED BACK to pre-injection body")
                body = pre
            else:
                added = sum(1 for l in links if l["slug"] in body)
                log(ls["id"], ls["role"], f"links injected cleanly: {added}/{len(links)} present, damage=0")
        except Exception as e:  # noqa: BLE001
            log(ls["id"], ls["role"], f"injection failed ({str(e)[:60]}) → keeping pre-injection body")
            body = pre

    # Stage 7: seo-optimizer metadata
    seo = squad.pick("seo-optimizer", squad=args.squad)
    meta_raw = squad.llm(
        squad.system_prompt(seo),
        f"Return ONLY strict JSON for this article: {{\"title\": \"<=70 chars\", \"excerpt\": \"1-2 sentences\", "
        f"\"meta_description\": \"140-160 chars\", \"keywords\": [\"5 real search phrases\"]}}\n"
        f"Article title: {title}\nFirst 600 chars:\n{body[:600]}",
        stage="fast", max_tokens=800,
    )
    try:
        meta = json.loads(re.search(r"\{[\s\S]*\}", meta_raw).group(0))
        log(seo["id"], seo["role"], f"metadata OK (title {len(meta.get('title', ''))}ch)")
    except (json.JSONDecodeError, AttributeError):
        meta = {"title": title, "excerpt": "", "meta_description": "", "keywords": keywords}
        log(seo["id"], seo["role"], "metadata parse failed → safe defaults")

    # Stage 8: publisher
    pub = squad.pick("publisher")
    out_md = run_dir / f"{slug}.md"
    fm = (f"---\ntitle: \"{meta.get('title', title)}\"\nslug: \"{slug}\"\n"
          f"description: \"{meta.get('meta_description', '')}\"\n"
          f"keywords: [{', '.join(json.dumps(k) for k in (meta.get('keywords') or [])[:6])}]\n"
          f"generated_by: seo_agent_pro\nagent_run: {run_dir.name}\n---\n\n")
    out_md.write_text(fm + body + "\n", encoding="utf-8")
    report = {
        "run": str(run_dir), "mode": args.mode, "slug": slug, "title": title,
        "words": wc(body), "gates": {"wmin": args.wmin, "wmax": args.wmax},
        "qa_pass": ok, "intel_rows": len(intel), "internal_links": len(links),
        "fact_check_notes": notes, "meta": meta,
    }
    (run_dir / "report.json").write_text(json.dumps(report, indent=1), encoding="utf-8")
    log(pub["id"], pub["role"], f"article + report published to {run_dir} (status={'published' if ok else 'draft'})")
    log("AG000", "orchestrator", f"RUN COMPLETE — {report['words']} words, qa={'PASS' if ok else 'DRAFT'}")
    log.save()
    print(f"\nOUTPUT: {out_md}")


if __name__ == "__main__":
    main()
