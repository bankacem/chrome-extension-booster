import os
import re
import yaml

ARTICLES_DIR = 'public/content/articles'

def walk_dir(directory):
    for root, dirs, files in os.walk(directory):
        for file in files:
            if file.endswith('.md'):
                yield os.path.join(root, file)

def fix_title(title):
    if not title: return title
    # Fix CompUnlock and fragments
    fixed = title.replace('CompUnlock', 'Comprehensive')
    fixed = fixed.replace('CompGuide', 'Comprehensive Guide')
    fixed = fixed.replace('CompTitle: ', '')

    # Fix redundant Title: prefixes
    fixed = re.sub(r'^Title:\s*', '', fixed, flags=re.IGNORECASE)

    # Logic to fix repeated fragments like "Title: A Title: B" -> "Title: B"
    if ':' in fixed:
        parts = fixed.split(':')
        unique_parts = []
        for p in parts:
            p = p.strip()
            if p and p not in unique_parts:
                unique_parts.append(p)
        fixed = ': '.join(unique_parts)

    return fixed

def clean_titles():
    print("Running Script 1: Cleaning Titles...")
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

            original_title = metadata.get('title', '')
            new_title = fix_title(original_title)

            if original_title != new_title:
                metadata['title'] = new_title
                new_frontmatter = yaml.dump(metadata, sort_keys=False, allow_unicode=True)
                new_content = f"---\n{new_frontmatter}---\n{body}"
                with open(file_path, 'w', encoding='utf-8') as f:
                    f.write(new_content)
                count += 1
        except Exception as e:
            print(f"Error processing {file_path}: {e}")

    print(f"Finished. Fixed {count} titles.")

if __name__ == "__main__":
    clean_titles()
