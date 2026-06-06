import os
import re
import yaml

ARTICLES_DIR = 'public/content/articles'

def walk_dir(directory):
    for root, dirs, files in os.walk(directory):
        for file in files:
            if file.endswith('.md'):
                yield os.path.join(root, file)

def extract_meta(body):
    # Remove HTML tags for extraction
    clean_body = re.sub(r'<[^>]+>', '', body)
    # Remove markdown headers
    clean_body = re.sub(r'#+\s+.*', '', clean_body)
    # Split into sentences
    sentences = re.split(r'(?<=[.!?])\s+', clean_body.strip())
    # Take first 2 sentences
    meta = ' '.join(sentences[:2])
    # Cleanup
    meta = meta.replace('\n', ' ').strip()
    # Truncate if too long, ensure it's ~155 chars
    if len(meta) > 160:
        meta = meta[:157] + "..."
    return meta

def unique_metas():
    print("Running Script 2: Unique Meta Descriptions...")
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

            new_meta = extract_meta(body)
            if not new_meta or len(new_meta) < 20:
                new_meta = f"Comprehensive guide about {metadata.get('title', 'this topic')}. Learn how to optimize your browser today."

            metadata['meta_description'] = new_meta
            metadata['excerpt'] = new_meta # Keep excerpt in sync

            new_frontmatter = yaml.dump(metadata, sort_keys=False, allow_unicode=True)
            new_content = f"---\n{new_frontmatter}---\n{body}"
            with open(file_path, 'w', encoding='utf-8') as f:
                f.write(new_content)
            count += 1
        except Exception as e:
            print(f"Error processing {file_path}: {e}")

    print(f"Finished. Updated {count} meta descriptions.")

if __name__ == "__main__":
    unique_metas()
