import os
import re
import yaml
import json
import shutil

ARTICLES_DIR = 'public/content/articles'
OPTIMIZED_JSON = 'optimized_articles.json'

CLUSTERS = {
    'RAM': {
        'pillar': '/blog/how-to-fix-chrome-high-memory-usage-2026-complete-guide',
        'keywords': ['ram', 'memory', 'tabs', 'suspender', 'speed up chrome', 'high usage'],
        'slugs': ['how-to-fix-chrome-high-memory-usage-2026-complete-guide']
    },
    'ADBLOCK': {
        'pillar': '/blog/adblock-chrome-android-complete-guide-2026',
        'keywords': ['adblock', 'ad block', 'android chrome adblock', 'ad blocker android'],
        'slugs': ['adblock-chrome-android-complete-guide-2026']
    },
    'SCREENSHOT': {
        'pillar': '/blog/best-chrome-screenshot-extensions-2026-complete-guide',
        'keywords': ['screenshot', 'capture', 'screen grab', 'full page screenshot'],
        'slugs': ['best-chrome-screenshot-extensions-2026-complete-guide']
    },
    'YOUTUBE': {
        'pillar': '/blog/best-youtube-downloader-chrome-extension-2026',
        'keywords': ['youtube', 'mp3 downloader', 'video downloader', 'youtube tools'],
        'slugs': ['best-youtube-downloader-chrome-extension-2026']
    },
    'PRIVACY': {
        'pillar': '/blog/best-chrome-privacy-extensions-2026-complete-guide',
        'keywords': ['privacy', 'security', 'ghostery', 'privacy badger', 'password manager', 'tracking'],
        'slugs': ['best-chrome-privacy-extensions-2026-complete-guide']
    }
}

GENERIC_EXCERPT = "Discover the future of browser extensions with our curated, high-performance directory."

FALLBACK_EXCERPTS = [
    "Boost your daily productivity with these essential browser tools. Master advanced features and streamline your digital workflow for maximum efficiency.",
    "Discover expert tips for customizing your browsing experience. Learn how to integrate powerful addons that save you time and improve your focus.",
    "Get the most out of your web browser with our professional tool overview. We cover installation, configuration, and pro-tips for power users today.",
    "Improve your online efficiency with our curated list of must-have extensions. From research tools to task managers, enhance your browsing experience."
]

SLUG_MIGRATIONS = {
    "unlock-a-clutter-free-browsing-experience-the-power-of-a-poper-blocker-popup-blocker": "poper-blocker-review-best-popup-blocker-chrome-2026",
    "ad-blocker-extension-to-chrome-2": "best-ad-blocker-extension-chrome-block-trackers-2026",
    "unlock-the-power-of-visual-content-a-compunlock-the-power-of-visual-content-a-comprehensive-guide-to-chrome-screenshot-a": "chrome-screenshot-addons-guide-annotating-editing",
    "unlocking-the-power-of-chrome-captureunlocking-the-power-of-chrome-capture-tools-2025-a-comprehensive-guide-tools-2025-a": "chrome-capture-tools-2025-troubleshooting-guide",
    "best-annotated-screenshot-chrome-5": "best-annotated-screenshot-chrome-extensions-2026"
}

def get_partition_path(slug):
    s = slug.lower()
    c1 = s[0] if s else '_'
    c2 = s[1] if len(s) > 1 else '_'
    c3 = s[2] if len(s) > 2 else '_'
    return os.path.join(ARTICLES_DIR, c1, c2, c3, f"{slug}.md")

def walk_dir(directory):
    for root, dirs, files in os.walk(directory):
        for file in files:
            if file.endswith('.md'):
                yield os.path.join(root, file)

def master_fix():
    print("Running Script 4: Master Fix...")

    # Load optimized data
    optimized_map = {}
    if os.path.exists(OPTIMIZED_JSON):
        with open(OPTIMIZED_JSON, 'r') as f:
            data = json.load(f)
            for item in data:
                optimized_map[item['originalSlug']] = item

    fallback_idx = 0
    canonical_count = 0
    excerpt_count = 0
    title_count = 0
    migration_count = 0

    for file_path in list(walk_dir(ARTICLES_DIR)):
        with open(file_path, 'r', encoding='utf-8') as f:
            content = f.read()

        match = re.match(r'^---([\s\S]*?)---([\s\S]*)$', content)
        if not match: continue

        frontmatter_raw = match.group(1)
        body = match.group(2)

        try:
            metadata = yaml.safe_load(frontmatter_raw)
            if not metadata: continue

            slug = metadata.get('slug', '')
            title = metadata.get('title', '')
            excerpt = metadata.get('excerpt', '')

            modified = False

            # 1. Fix "CaptureUnlocking" and similar broken titles
            if "CaptureUnlocking" in title or "CompUnlock" in title:
                new_title = title.replace("CaptureUnlocking", "Capture: Unlocking")
                new_title = new_title.replace("CompUnlock", "Comprehensive: Unlocking")
                # Remove repeated fragments
                parts = [p.strip() for p in new_title.split(':')]
                unique_parts = []
                for p in parts:
                    if p and p not in unique_parts:
                        unique_parts.append(p)
                metadata['title'] = ': '.join(unique_parts)
                title_count += 1
                modified = True

            # 2. Replace generic excerpt
            if excerpt and excerpt.strip() == GENERIC_EXCERPT:
                new_excerpt = ""
                if slug in optimized_map:
                    new_excerpt = optimized_map[slug]['metaDescription']
                else:
                    new_excerpt = FALLBACK_EXCERPTS[fallback_idx % len(FALLBACK_EXCERPTS)]
                    fallback_idx += 1

                metadata['excerpt'] = new_excerpt
                metadata['meta_description'] = new_excerpt
                excerpt_count += 1
                modified = True

            # 3. Inject canonicalPath if missing
            if not metadata.get('canonicalPath'):
                target_pillar = None
                title_lower = title.lower()
                slug_lower = slug.lower()

                for key, config in CLUSTERS.items():
                    if slug == config['pillar'].split('/')[-1]:
                        target_pillar = config['pillar']
                        break
                    if any(kw in title_lower or kw in slug_lower for kw in config['keywords']):
                        target_pillar = config['pillar']
                        break

                if target_pillar:
                    metadata['canonicalPath'] = target_pillar
                    canonical_count += 1
                    modified = True

            # 4. Handle slug migrations
            if slug in SLUG_MIGRATIONS:
                new_slug = SLUG_MIGRATIONS[slug]
                metadata['slug'] = new_slug
                new_path = get_partition_path(new_slug)
                os.makedirs(os.path.dirname(new_path), exist_ok=True)

                # Write to new path
                new_frontmatter = yaml.dump(metadata, sort_keys=False, allow_unicode=True)
                new_content = f"---\n{new_frontmatter}---\n{body}"
                with open(new_path, 'w', encoding='utf-8') as f:
                    f.write(new_content)

                # Remove old file
                os.remove(file_path)
                migration_count += 1
                print(f"Migrated: {slug} -> {new_slug}")
                continue # Skip the normal write back

            if modified:
                new_frontmatter = yaml.dump(metadata, sort_keys=False, allow_unicode=True)
                new_content = f"---\n{new_frontmatter}---\n{body}"
                with open(file_path, 'w', encoding='utf-8') as f:
                    f.write(new_content)

        except Exception as e:
            print(f"Error processing {file_path}: {e}")

    print(f"Finished.")
    print(f"- Fixed {title_count} titles.")
    print(f"- Updated {excerpt_count} generic excerpts.")
    print(f"- Applied {canonical_count} canonical tags.")
    print(f"- Migrated {migration_count} slugs.")

if __name__ == "__main__":
    master_fix()
