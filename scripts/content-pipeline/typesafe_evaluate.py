#!/usr/bin/env python3
"""Evaluate ExtensionTo articles via TypeSafe API (jev-latest model)."""
import json
import re
import sys
import time
import urllib.request

API = "https://api.typesafe.ai/v1/systemone"
KEY = "apikey_22996aa371737af45468751d797a462abac_9a46d2da6b11142ecc2c68a5a2383a5e02d2ca2022092ff5cf4b52554d6e29f5"
MODEL = "jev-latest"

FILES = {
    "text-expander-chrome-extensions": "/home/z/my-project/repo-booster/public/content/articles/t/e/x/text-expander-chrome-extensions.md",
    "mute-noisy-tabs-chrome": "/home/z/my-project/repo-booster/public/content/articles/m/u/t/mute-noisy-tabs-chrome.md",
    "website-blocker-focus-chrome": "/home/z/my-project/repo-booster/public/content/articles/w/e/b/website-blocker-focus-chrome.md",
    "history-search-chrome-extensions": "/home/z/my-project/repo-booster/public/content/articles/h/i/s/history-search-chrome-extensions.md",
    "calendar-chrome-extensions": "/home/z/my-project/repo-booster/public/content/articles/c/a/l/calendar-chrome-extensions.md",
}


def strip_frontmatter(content: str) -> str:
    return re.sub(r"^---\n.*?\n---\n", "", content, flags=re.S)


def build_state(content: str, meta: str, max_chars: int = 26000) -> str:
    """Evidence-based excerpt: frontmatter + intro + tables + FAQ + verdict."""
    body = strip_frontmatter(content)
    # Find table sections
    tables = []
    lines = body.split("\n")
    for i, ln in enumerate(lines):
        if ln.startswith("|") and i + 1 < len(lines) and set(lines[i + 1].replace("|", "").strip()) <= set("-: "):
            start = max(0, i - 4)  # include preceding heading context
            end = min(len(lines), i + 14)
            tables.append("\n".join(lines[start:end]))
    table_text = "\n\n[TABLE EXCERPT]\n".join(tables[:3]) if tables else "[NO TABLES FOUND]"
    intro = body[:4500]
    tail = body[-4500:]
    state = f"{meta}\n\n[INTRO]\n{intro}\n\n[TABLES]{table_text}\n\n[TAIL incl FAQ+Verdict]\n{tail}"
    return state[:max_chars]


def evaluate(slug: str, content: str) -> dict:
    meta = content.split("---")[1] if content.startswith("---") else ""
    questions = {
        # E-E-A-T / credibility
        "first_person_experience": {
            "instructions": "Does this article clearly show personal first-hand testing experience (e.g. 'I tested', 'in my testing')?",
            "type": "noul",
        },
        # SEO completeness
        "has_faq": {
            "instructions": "Does the article include a Frequently Asked Questions (FAQ) section?",
            "type": "noul",
        },
        "has_comparison_table": {
            "instructions": "Does the article include at least one comparison table with measurable metrics?",
            "type": "noul",
        },
        "meta_quality": {
            "instructions": "Is the meta description compelling, specific, and under 160 characters?",
            "type": "score",
            "criteria": ["weak: generic or keyword-stuffed", "average: partially useful", "excellent: compelling, specific, correct length"],
        },
        "title_strength": {
            "instructions": "Is the SEO title click-worthy while naturally including the main keyword?",
            "type": "score",
            "criteria": ["weak", "average", "highly clickable with keyword"],
        },
        # Search intent vs competitors
        "search_intent_match": {
            "instructions": "Would this article fully satisfy a searcher looking for recommendations and setup steps for this browser extension category?",
            "type": "score",
            "criteria": ["weak", "average", "fully satisfying"],
        },
        "actionable_value": {
            "instructions": "Does the article give concrete, actionable steps and specific numbers rather than generic advice?",
            "type": "score",
            "criteria": ["generic advice", "partially actionable", "concrete steps with numbers"],
        },
        # Competitive gaps
        "internal_linking_quality": {
            "instructions": "Is the internal linking strong and contextually relevant?",
            "type": "score",
            "criteria": ["weak: few or irrelevant links", "average", "strong: many relevant contextual links"],
        },
        "competitor_weakness_covered": {
            "instructions": "Does the article explicitly name and compare against at least 2-3 competing tools with their weaknesses?",
            "type": "noul",
        },
        "readability": {
            "instructions": "Is the writing engaging, non-robotic, and easy to scan with clear structure?",
            "type": "score",
            "criteria": ["1 - weak", "5 - average", "10 - excellent"],
        },
    }
    payload = json.dumps(
        {"model": MODEL, "state": build_state(content, meta), "questions": questions}
    ).encode()
    req = urllib.request.Request(
        API,
        data=payload,
        headers={
            "Authorization": f"Bearer {KEY}",
            "Content-Type": "application/json",
        },
        method="POST",
    )
    with urllib.request.urlopen(req, timeout=120) as resp:
        return json.loads(resp.read())


def main():
    slug_filter = sys.argv[1] if len(sys.argv) > 1 else None
    results = {}
    for slug, path in FILES.items():
        if slug_filter and slug_filter not in slug:
            continue
        content = open(path, encoding="utf-8").read()
        try:
            r = evaluate(slug, content)
            results[slug] = r
            answers = r.get("answers", {})
            print(f"\n===== {slug} (model {r.get('model')}) =====")
            for name, ans in answers.items():
                if ans.get("type") == "noul":
                    yn = "YES" if ans.get("noul", 0) > 0.5 else "NO"
                    print(f"  {name:<30} {yn} ({ans.get('noul')})")
                elif ans.get("type") == "choice":
                    print(f"  {name:<30} {ans.get('choice')} ({ans.get('confidence')})")
                else:
                    probs = ans.get("probabilities", {})
                    top = max(probs.items(), key=lambda x: x[1])[0] if probs else "?"
                    print(f"  {name:<30} {top} (score-idx {ans.get('score')})")
        except Exception as e:
            print(f"ERROR {slug}: {e}")
            results[slug] = {"error": str(e)}
        time.sleep(1)
    out = "/home/z/my-project/scripts/typesafe_before.json"
    try:
        existing = json.load(open(out))
    except Exception:
        existing = {}
    existing.update(results)
    json.dump(existing, open(out, "w"), ensure_ascii=False, indent=1)
    print("\nSaved to", out)


if __name__ == "__main__":
    main()
