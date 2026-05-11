#!/usr/bin/env python3
"""Fix all articles with featured_image: null by assigning category-based or body-extracted images."""

import os, re, json

FALLBACK_IMAGES = {
    "Screenshots & Screen Capture": "https://images.unsplash.com/photo-1607706189992-eae578626c86?auto=format&fit=crop&q=80&w=1200",
    "Redirect & Navigation": "https://images.unsplash.com/photo-1518770660439-4636190af475?auto=format&fit=crop&q=80&w=1200",
    "Performance & Memory": "https://images.unsplash.com/photo-1461749280684-dccba630e2f6?auto=format&fit=crop&q=80&w=1200",
    "Appearance & Themes": "https://images.unsplash.com/photo-1550439062-609e1531270e?auto=format&fit=crop&q=80&w=1200",
    "Productivity & Tools": "https://images.unsplash.com/photo-1484480974693-6ca0a78fb36b?auto=format&fit=crop&q=80&w=1200",
    "Security & Privacy": "https://images.unsplash.com/photo-1555949963-aa79dcee981c?auto=format&fit=crop&q=80&w=1200",
}
DEFAULT_IMG = "https://images.unsplash.com/photo-1607706189992-eae578626c86?auto=format&fit=crop&q=80&w=1200"


def get_first_body_image(body):
    patterns = [
        r'<img[^>]+src=["\']([^"\'>\s]+)["\']',
        r'!\[.*?\]\((https?://[^\)]+)\)',
        r'(https://blogger\.googleusercontent\.com/[^\s"\'<>]+)',
        r'(https://images\.unsplash\.com/[^\s"\'<>]+)',
    ]
    for p in patterns:
        for m in re.finditer(p, body, re.IGNORECASE):
            url = m.group(1)
            if 'chromewebstore' not in url:
                return url.strip()
    return None


fixed = 0
skipped = 0
index_updates = {}

for root, dirs, files in os.walk('public/content/articles'):
    for f in files:
        if not f.endswith('.md'):
            continue

        path = os.path.join(root, f)
        content = open(path, encoding='utf-8').read()

        # Must have featured_image: null to proceed
        if 'featured_image: null' not in content:
            skipped += 1
            continue

        # Split frontmatter and body
        parts = content.split('---', 2)
        if len(parts) < 3:
            skipped += 1
            continue

        frontmatter = parts[1]
        body = parts[2]

        # Get category
        cat_match = re.search(r'^category:\s*(.+)$', frontmatter, re.MULTILINE)
        category = cat_match.group(1).strip().strip('"\'') if cat_match else ''

        # Find image
        image_url = get_first_body_image(body)
        if not image_url:
            image_url = FALLBACK_IMAGES.get(category, DEFAULT_IMG)

        # Replace featured_image: null using simple string replacement
        new_frontmatter = frontmatter.replace(
            'featured_image: null',
            f'featured_image: "{image_url}"'
        )

        # Also fix image_url: null if present
        new_frontmatter = new_frontmatter.replace(
            'image_url: null',
            f'image_url: "{image_url}"'
        )

        new_content = f'---{new_frontmatter}---{body}'
        open(path, 'w', encoding='utf-8').write(new_content)

        slug = f.replace('.md', '')
        index_updates[slug] = image_url
        fixed += 1
        print(f'FIXED: {path}')

# Update articles-index.json
index_path = 'public/content/articles-index.json'
if os.path.exists(index_path):
    with open(index_path, encoding='utf-8') as f:
        index = json.load(f)

    for article in index:
        slug = article.get('slug', '')
        if slug in index_updates:
            article['image_url'] = index_updates[slug]
            article['featured_image'] = index_updates[slug]
        for file_slug, url in index_updates.items():
            if slug.startswith(file_slug) or file_slug in slug:
                article['image_url'] = url
                article['featured_image'] = url

    with open(index_path, 'w', encoding='utf-8') as f:
        json.dump(index, f, ensure_ascii=False, indent=2)

print(f'\nDone! Fixed: {fixed}, Skipped: {skipped}')
