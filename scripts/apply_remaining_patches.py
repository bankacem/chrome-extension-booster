import json
import os

def apply_remaining_patches():
    # Per instructions, start from the file saved after Part 1
    input_file = "extensionto-backup-PATCHED.json"
    output_file = "extensionto-backup-FINAL-SEO-FIXED.json"

    # We apply Part 2, 3, and 4
    patch_files = [
        "patches-part2.json",
        "patches-part3.json",
        "patches-part4.json"
    ]

    if not os.path.exists(input_file):
        print(f"Error: Input file {input_file} not found.")
        return

    print(f"Loading base data from {input_file}...")
    with open(input_file, 'r', encoding='utf-8') as f:
        data = json.load(f)

    articles = data.get('articles', [])
    article_map = {article['id']: article for article in articles}

    # Count of matches in Part 1 (already applied)
    # Since I don't have the logs, I'll re-verify it here against the input_file
    print("Verifying Part 1 application...")
    with open("patches-part1.json", 'r', encoding='utf-8') as f:
        p1_data = json.load(f)
    p1_matches = 0
    for p in p1_data.get('patches', []):
        aid = p['id']
        if aid in article_map:
            # Check if title matches (indicates it was likely applied)
            if 'title' in p and article_map[aid].get('title') == p['title']:
                p1_matches += 1
    print(f"Part 1 matches found in base: {p1_matches}")

    total_new_matches = 0

    for patch_file in patch_files:
        if not os.path.exists(patch_file):
            print(f"Warning: Patch file {patch_file} not found. Skipping.")
            continue

        print(f"Processing {patch_file}...")
        with open(patch_file, 'r', encoding='utf-8') as f:
            patch_data = json.load(f)

        patches = patch_data.get('patches', [])
        current_part_matches = 0
        for patch in patches:
            article_id = patch.get('id')

            if article_id in article_map:
                article = article_map[article_id]
                current_part_matches += 1
                total_new_matches += 1

                if 'title' in patch:
                    article['title'] = patch['title']
                if 'meta_description' in patch:
                    article['meta_description'] = patch['meta_description']
                if 'tags' in patch:
                    article['tags'] = patch['tags']

        print(f"Matches in {patch_file}: {current_part_matches}")

    total_patched = p1_matches + total_new_matches
    print(f"Final summary: Total articles patched across all 4 parts: {total_patched}")

    print(f"Saving final data to {output_file}...")
    with open(output_file, 'w', encoding='utf-8') as f:
        json.dump(data, f, indent=2, ensure_ascii=False)

    print("Done!")

if __name__ == "__main__":
    apply_remaining_patches()
