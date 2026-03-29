import os
import re
import yaml

ARTICLES_DIR = 'public/content/articles'

CLUSTERS = {
    'RAM': {
        'pillar': '/blog/chrome-ram-guide',
        'keywords': ['ram', 'memory', 'tabs', 'suspender', 'speed up chrome', 'high usage'],
        'slugs': ['chrome-ram-guide']
    },
    'ADBLOCK': {
        'pillar': '/blog/adblock-android-guide',
        'keywords': ['adblock', 'ad block', 'android chrome adblock', 'ad blocker android'],
        'slugs': ['adblock-android-guide']
    },
    'SCREENSHOT': {
        'pillar': '/blog/chrome-screenshot-guide',
        'keywords': ['screenshot', 'capture', 'screen grab', 'full page screenshot'],
        'slugs': ['chrome-screenshot-guide']
    },
    'YOUTUBE': {
        'pillar': '/blog/youtube-tools-guide',
        'keywords': ['youtube', 'mp3 downloader', 'video downloader', 'youtube tools'],
        'slugs': ['youtube-tools-guide']
    },
    'PRIVACY': {
        'pillar': '/blog/privacy-security-guide',
        'keywords': ['privacy', 'security', 'ghostery', 'privacy badger', 'password manager', 'tracking'],
        'slugs': ['privacy-security-guide']
    }
}

def walk_dir(directory):
    for root, dirs, files in os.walk(directory):
        for file in files:
            if file.endswith('.md'):
                yield os.path.join(root, file)

def canonical_tags():
    print("Running Script 3: Canonical Tags...")
    count = 0
    for file_path in walk_dir(ARTICLES_DIR):
        with open(file_path, 'r', encoding='utf-8') as f:
            content = f.read()

        match = re.match(r'^---\n(.*?)\n---\n(.*)$', content, re.DOTALL)
        if not match: continue

        frontmatter_raw = match.group(1)
        body = match.group(2)

        try:
            metadata = yaml.safe_load(frontmatter_raw)
            if not metadata: continue

            slug = metadata.get('slug', '')
            title = metadata.get('title', '').lower()

            target_pillar = None

            for key, config in CLUSTERS.items():
                # Don't point a pillar to itself
                if slug == config['pillar'].split('/')[-1]:
                    continue

                # Check keywords or exact slug match
                if any(kw in title or kw in slug for kw in config['keywords']):
                    target_pillar = config['pillar']
                    break

            if target_pillar:
                metadata['canonicalPath'] = target_pillar
                new_frontmatter = yaml.dump(metadata, sort_keys=False, allow_unicode=True)
                new_content = f"---\n{new_frontmatter}---\n{body}"
                with open(file_path, 'w', encoding='utf-8') as f:
                    f.write(new_content)
                count += 1
            else:
                # Remove canonicalPath if not in a cluster to default to self
                if 'canonicalPath' in metadata:
                    del metadata['canonicalPath']
                    new_frontmatter = yaml.dump(metadata, sort_keys=False, allow_unicode=True)
                    new_content = f"---\n{new_frontmatter}---\n{body}"
                    with open(file_path, 'w', encoding='utf-8') as f:
                        f.write(new_content)

        except Exception as e:
            print(f"Error processing {file_path}: {e}")

    print(f"Finished. Applied {count} canonical tags.")

if __name__ == "__main__":
    canonical_tags()
