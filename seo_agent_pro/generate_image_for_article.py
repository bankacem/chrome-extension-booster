"""
One-off helper: generate a real featured image for an ALREADY-PUBLISHED
article via image_agent.py, then patch both the article's frontmatter and
articles-index.json to point at it.

Usage: python3 seo_agent_pro/generate_image_for_article.py <slug>

Exists because image_agent.py only runs automatically inside the 7-agent
graph for newly-generated, approved articles — this lets us backfill a
real image for an article that was published outside that flow (e.g. the
manually-verified test article), or regenerate one for any existing slug
on demand. Runs from GitHub Actions (real network access to the Gemini
API), not from a sandboxed environment that can't reach Google's domains.
"""

from __future__ import annotations

import json
import re
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))
sys.path.insert(0, str(Path(__file__).resolve().parent / "agentic"))
sys.path.insert(0, str(Path(__file__).resolve().parent / "agentic" / "agents"))

ROOT = Path(__file__).resolve().parents[1]
INDEX_FILE = ROOT / "public" / "content" / "articles-index.json"


def find_article_file(slug: str) -> Path | None:
    articles_dir = ROOT / "public" / "content" / "articles"
    for p in articles_dir.rglob(f"{slug}.md"):
        return p
    return None


def main():
    if len(sys.argv) < 2:
        print("Usage: python3 generate_image_for_article.py <slug>")
        sys.exit(1)
    slug = sys.argv[1]

    md_path = find_article_file(slug)
    if not md_path:
        print(f"❌ No article file found for slug: {slug}")
        sys.exit(1)

    content = md_path.read_text(encoding="utf-8")
    title_match = re.search(r'^title:\s*"([^"]+)"', content, re.MULTILINE)
    category_match = re.search(r'^category:\s*(.+)$', content, re.MULTILINE)
    title = title_match.group(1) if title_match else slug.replace("-", " ").title()
    category = category_match.group(1).strip() if category_match else ""

    print(f"Generating image for: {title!r} (category: {category!r})")

    import image_agent
    result = image_agent.run({"title": title, "category": category, "slug": slug})

    image_path = result.get("featured_image_path")
    if not image_path:
        print("⚠ Image generation did not produce a result (see log above) — nothing to update.")
        sys.exit(0)  # not a hard failure — this is an optional enhancement

    # Patch the article's frontmatter
    new_content = re.sub(
        r'^featured_image:\s*.+$',
        f'featured_image: {image_path}',
        content,
        count=1,
        flags=re.MULTILINE,
    )
    md_path.write_text(new_content, encoding="utf-8")
    print(f"✅ Updated {md_path.relative_to(ROOT)}")

    # Patch articles-index.json too, if present there
    if INDEX_FILE.exists():
        data = json.loads(INDEX_FILE.read_text(encoding="utf-8"))
        arr = data if isinstance(data, list) else data.get("articles", [])
        updated = False
        for a in arr:
            if a.get("slug") == slug:
                a["featured_image"] = image_path
                a["image_url"] = image_path
                updated = True
        if updated:
            INDEX_FILE.write_text(
                json.dumps(data, indent=2, ensure_ascii=False), encoding="utf-8"
            )
            print(f"✅ Updated articles-index.json entry for {slug}")

    print(f"DONE: {image_path}")


if __name__ == "__main__":
    main()
