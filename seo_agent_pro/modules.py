"""
SEO Agent Pro — Core pipeline modules.
Each module is a pure function: takes inputs, calls the LLM, returns data.
"""

import json
import time

from llm_router import call, call_json, c


# ──────────────────────────────────────────────────────────────
#  Helpers
# ──────────────────────────────────────────────────────────────

def _step(label: str) -> None:
    print(f"\n{c('cyan', '▸')} {c('bold', label)}")

def _ok(msg: str) -> None:
    print(c("green", f"  ✓ {msg}"))

def _info(msg: str) -> None:
    print(c("dim", f"  · {msg}"))


# ──────────────────────────────────────────────────────────────
#  Module 1 — Competitor Analysis
# ──────────────────────────────────────────────────────────────

def analyze_competitors(keyword: str, model: str, lang: str = "en") -> dict:
    _step(f"Competitor Analysis  →  \"{keyword}\"")

    system = (
        f"You are a senior SEO analyst specializing in {lang} content. "
        "Based on your knowledge of web content patterns, "
        "analyze what the top-ranking pages for a given keyword typically look like."
    )
    user = f"""Analyze the competitive landscape for the keyword: "{keyword}"

Return a JSON object:
{{
  "common_sections":    ["list of H2/H3 headings found in top results"],
  "missing_gaps":       ["topics competitors rarely cover"],
  "content_length_avg": "estimated average word count",
  "seo_patterns":       ["structural or formatting patterns used"],
  "weaknesses":         ["what most articles do poorly"],
  "why_they_rank":      "main reason top results rank (depth/authority/UX/etc)"
}}"""

    result = call_json(system, user, model)

    _ok(f"Common sections: {len(result.get('common_sections', []))}")
    _ok(f"Content gaps: {len(result.get('missing_gaps', []))}")
    _ok(f"Avg length: {result.get('content_length_avg', '?')} words")
    for gap in result.get("missing_gaps", [])[:3]:
        _info(f"Gap → {gap}")

    return result


# ──────────────────────────────────────────────────────────────
#  Module 2 — Strategy Decision
# ──────────────────────────────────────────────────────────────

def decide_strategy(keyword: str, competitor_data: dict, articles_written: int, model: str, lang: str = "en") -> dict:
    _step("Strategy Decision Engine")

    system = (
        "You are an SEO content strategist. "
        "Given competitor analysis, decide the optimal content strategy."
    )
    user = f"""Keyword: "{keyword}"

Competitor data:
{json.dumps(competitor_data, indent=2)}

Articles already in memory: {articles_written}

Decide and return JSON:
{{
  "ideal_length":       0,
  "required_sections":  ["list of H2 headings to include"],
  "must_have_elements": ["table|FAQ|statistics|comparison|checklist|..."],
  "unique_angle":       "what makes this article stand out",
  "strategy":           "aggressive or strategic",
  "reasoning":          "one-sentence explanation"
}}"""

    result = call_json(system, user, model)

    _ok(f"Strategy: {result.get('strategy', '?').upper()}")
    _ok(f"Target length: {result.get('ideal_length', '?')} words")
    _ok(f"Unique angle: {result.get('unique_angle', '?')}")
    _info(result.get("reasoning", ""))

    return result


# ──────────────────────────────────────────────────────────────
#  Module 3 — Article Writer
# ──────────────────────────────────────────────────────────────

def write_article(keyword: str, strategy: dict, model: str, lang: str = "en") -> str:
    length   = strategy.get("ideal_length", 1500)
    sections = strategy.get("required_sections", [])
    angle    = strategy.get("unique_angle", "")
    elements = strategy.get("must_have_elements", [])

    _step(f"Writing Article  —  {length} words")

    lang_instruction = f"Write in clear, engaging {lang}. Never sound robotic."
    if lang == "ar":
        lang_instruction = "Write in professional, engaging Arabic (Modern Standard Arabic). Use a natural flow and avoid literal translations from English."

    system = (
        f"You are a professional SEO content writer. "
        f"{lang_instruction} "
        "Prioritize Information Gain — include unique insights not found elsewhere."
    )
    user = f"""Write a complete, high-ranking SEO article for: "{keyword}" in {lang}

Specifications:
- Target length:    {length} words
- Unique angle:     {angle}
- Required H2s:     {', '.join(sections) if sections else 'choose the best structure'}
- Must include:     {', '.join(elements) if elements else 'decide based on topic'}

Structure:
# [H1 — includes primary keyword, compelling and clear]

[Strong hook introduction — 3 paragraphs, establish the problem and promise]

## [H2]
### [H3 if needed]
[Content with real data, examples, actionable advice]

[Repeat for all sections]

[Comparison table if applicable]

## Frequently Asked Questions
**Q: ...**
A: ...

## Conclusion
[Summary + clear call to action]

Rules:
- Keyword in first 100 words naturally
- Keyword density 1–2%, natural placement
- Real or realistic statistics and data
- Human, conversational tone
- Add Information Gain: insights competitors missed"""

    print(c("dim", "  " + "─" * 56))
    article    = call(system, user, model, stream=True)
    word_count = len(article.split())
    print(c("dim", "  " + "─" * 56))
    _ok(f"Article complete — {word_count} words")

    return article


# ──────────────────────────────────────────────────────────────
#  Module 4 — CTR Optimizer
# ──────────────────────────────────────────────────────────────

def optimize_ctr(keyword: str, article_snippet: str, model: str, lang: str = "en") -> dict:
    _step("CTR Optimization  —  Title & Meta Description")

    system = "You are a search CTR specialist. Write titles and descriptions that maximize click-through rate."
    user   = f"""Keyword: "{keyword}"

Article opening (first 600 chars):
{article_snippet[:600]}

Generate 3 options each. Return JSON:
{{
  "titles": ["max 60 chars each"],
  "descriptions": ["max 155 chars each"],
  "recommended_title": "",
  "recommended_description": ""
}}

Rules for titles:
- Include the keyword
- Use numbers when natural
- Power words: Proven, Complete, Best, Guide, Step-by-Step
- Trigger curiosity without clickbait

Rules for descriptions:
- Include keyword naturally
- State the value clearly
- End with a soft call to action"""

    result = call_json(system, user, model)

    _ok(f"Title:       {result.get('recommended_title', '')}")
    _ok(f"Description: {result.get('recommended_description', '')}")

    return result


# ──────────────────────────────────────────────────────────────
#  Module 5 — Keyword Cluster Builder  (V3)
# ──────────────────────────────────────────────────────────────

def build_cluster(keyword: str, niche: str, model: str, lang: str = "en") -> dict:
    _step(f"Keyword Cluster Map  —  Niche: {niche or 'auto-detect'}")

    system = "You are a keyword architecture expert. Build comprehensive topic clusters for SEO authority."
    user   = f"""Build a complete keyword cluster for: "{keyword}"
Niche: {niche or 'detect from keyword'}

Return JSON:
{{
  "pillar": {{
    "keyword":    "main keyword",
    "intent":     "informational|commercial|navigational",
    "word_count": 0,
    "title":      "suggested H1 title"
  }},
  "clusters": [
    {{
      "keyword":          "",
      "type":             "informational|commercial|navigational",
      "priority":         "high|medium|low",
      "estimated_volume": "high|medium|low",
      "title":            "suggested article title"
    }}
  ],
  "long_tail":           ["list of long-tail keyword variants"],
  "internal_link_map": {{
    "pillar_to_clusters": ["cluster keywords to link from pillar"],
    "cluster_to_cluster": ["cross-linking suggestions"]
  }},
  "quick_wins":          ["low-competition, high-intent keywords"],
  "authority_path":      "recommended publishing order summary"
}}"""

    result = call_json(system, user, model)

    total  = len(result.get("clusters", []))
    high   = [x for x in result.get("clusters", []) if x.get("priority") == "high"]

    _ok(f"Pillar:       {result.get('pillar', {}).get('keyword', '')}")
    _ok(f"Clusters:     {total} topics")
    _ok(f"High priority: {len(high)}")
    _ok(f"Long-tail:    {len(result.get('long_tail', []))}")
    _ok(f"Quick wins:   {len(result.get('quick_wins', []))}")
    for item in high[:3]:
        _info(f"[HIGH] {item.get('keyword', '')}  ({item.get('type', '')})")

    return result


# ──────────────────────────────────────────────────────────────
#  Module 6 — Content Calendar  (V3)
# ──────────────────────────────────────────────────────────────

def build_calendar(keyword: str, niche: str, months: int, model: str, lang: str = "en") -> list:
    _step(f"Content Calendar  —  {months} months")

    system = "You are a strategic content planner. Build data-driven publishing calendars for SEO growth."
    user   = f"""Build a {months}-month content calendar.
Niche: {niche or 'detect from keyword'}
Seed keyword: {keyword}
Publishing frequency: 3 articles/week

Structure per month:
- Week 1:   Pillar article (2000+ words)
- Week 2–3: Cluster articles (1000–1500 words)
- Week 4:   Long-tail + FAQ articles (800+ words)

Return a JSON array (one object per article):
[
  {{
    "month":      1,
    "week":       1,
    "title":      "",
    "keyword":    "",
    "type":       "pillar|cluster|long-tail",
    "word_count": 0,
    "intent":     "informational|commercial|navigational",
    "priority":   "P1|P2|P3",
    "links_to":   ["keywords this article should link to"]
  }}
]"""

    result = call_json(system, user, model)

    if isinstance(result, list):
        pillar     = sum(1 for a in result if a.get("type") == "pillar")
        commercial = sum(1 for a in result if a.get("intent") == "commercial")
        _ok(f"Total articles:   {len(result)}")
        _ok(f"Pillar articles:  {pillar}")
        _ok(f"Commercial intent: {commercial}")
        for item in result[:3]:
            _info(f"Month {item.get('month')} / Week {item.get('week')}: {item.get('title', '')[:55]}")

    return result if isinstance(result, list) else []


# ──────────────────────────────────────────────────────────────
#  Module 7 — Topical Authority Score  (V3)
# ──────────────────────────────────────────────────────────────

def score_authority(niche: str, articles_written: list, model: str, lang: str = "en") -> dict:
    _step("Topical Authority Score")

    titles = [a.get("keyword", "") for a in articles_written[-20:]]

    system = "You are an SEO authority analyst. Assess topical coverage and provide actionable gaps."
    user   = f"""Niche: "{niche}"
Articles written so far:
{json.dumps(titles, indent=2)}

Assess topical authority and return JSON:
{{
  "authority_score": 0,
  "coverage_pct":    "0%",
  "strong_areas":    ["topics well covered"],
  "weak_areas":      ["topics needing more content"],
  "next_3_articles": ["most impactful articles to write next"],
  "estimated_weeks_to_authority": 0
}}"""

    result = call_json(system, user, model)

    _ok(f"Authority score:  {result.get('authority_score', 0)} / 100")
    _ok(f"Coverage:         {result.get('coverage_pct', '0%')}")
    _ok(f"ETA to authority: {result.get('estimated_weeks_to_authority', '?')} weeks")
    for a in result.get("next_3_articles", [])[:3]:
        _info(f"Write next → {a}")

    return result
