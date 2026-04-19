import json
import os

patch_files = ["patches-part1.json", "patches-part2.json", "patches-part3.json", "patches-part4.json"]
all_patch_ids = []
for pf in patch_files:
    if os.path.exists(pf):
        with open(pf, 'r') as f:
            data = json.load(f)
            ids = [p['id'] for p in data.get('patches', [])]
            print(f"{pf}: {len(ids)} patches")
            all_patch_ids.extend(ids)

print(f"Total patch entries: {len(all_patch_ids)}")
print(f"Unique patch IDs: {len(set(all_patch_ids))}")

backup_file = "extensionto-backup-2026-03-07 (1).json"
if os.path.exists(backup_file):
    with open(backup_file, 'r') as f:
        backup_data = json.load(f)
        backup_ids = set(a['id'] for a in backup_data.get('articles', []))
        print(f"Backup articles: {len(backup_ids)}")

        matches = [id for id in all_patch_ids if id in backup_ids]
        print(f"Matches found: {len(matches)}")
        unique_matches = set(matches)
        print(f"Unique articles matched: {len(unique_matches)}")

        missing = set(all_patch_ids) - backup_ids
        print(f"Patch IDs missing in backup: {len(missing)}")
