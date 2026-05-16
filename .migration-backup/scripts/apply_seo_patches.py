import json
import os

def apply_patches():
    backup_file = "extensionto-backup-2026-03-07 (1).json"
    output_file = "extensionto-backup-PATCHED.json"
    patch_files = [
        "patches-part1.json",
        "patches-part2.json",
        "patches-part3.json",
        "patches-part4.json"
    ]

    if not os.path.exists(backup_file):
        print(f"Error: Backup file {backup_file} not found.")
        return

    print(f"Loading backup from {backup_file}...")
    with open(backup_file, 'r', encoding='utf-8') as f:
        data = json.load(f)

    articles = data.get('articles', [])
    # Create a lookup map for faster access
    article_map = {article['id']: article for article in articles}

    total_patches_processed = 0
    total_matches_found = 0

    for patch_file in patch_files:
        if not os.path.exists(patch_file):
            print(f"Warning: Patch file {patch_file} not found. Skipping.")
            continue

        print(f"Processing {patch_file}...")
        with open(patch_file, 'r', encoding='utf-8') as f:
            patch_data = json.load(f)

        patches = patch_data.get('patches', [])
        for patch in patches:
            total_patches_processed += 1
            article_id = patch.get('id')

            if article_id in article_map:
                article = article_map[article_id]
                total_matches_found += 1

                if 'title' in patch:
                    article['title'] = patch['title']
                if 'meta_description' in patch:
                    article['meta_description'] = patch['meta_description']
                if 'tags' in patch:
                    article['tags'] = patch['tags']
            # else:
            #     print(f"Note: ID {article_id} not found in backup.")

    print(f"Applied patches. Total processed: {total_patches_processed}, Matches found and updated: {total_matches_found}")

    print(f"Saving patched data to {output_file}...")
    with open(output_file, 'w', encoding='utf-8') as f:
        json.dump(data, f, indent=2, ensure_ascii=False)

    print("Done!")

if __name__ == "__main__":
    apply_patches()
