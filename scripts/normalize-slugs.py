#!/usr/bin/env python3
"""
SEO URL Normalization Engine — ExtensionTo
Removes AI hash suffixes from 234 article slugs.
Applies 301 redirects, updates all internal links, renames files.
"""

import json, re, os, shutil, sys
from pathlib import Path

ROOT       = Path(__file__).parent.parent
ARTICLES   = ROOT / "artifacts/extensionto/public/content/articles"
INDEX_PATH = ROOT / "artifacts/extensionto/public/content/articles-index.json"
VERCEL_JSON= ROOT / "artifacts/extensionto/vercel.json"
GEN_SITEMAP= ROOT / "artifacts/extensionto/scripts/generate-sitemap.mjs"
RMAP_PATH  = ROOT / "artifacts/extensionto/public/redirect-map.json"

# Hash pattern: ends with -m[letter][9 alphanumeric]  (11-char hash)
HASH_RE = re.compile(r'-m[a-z][a-z0-9]{8,10}$')

# ── Helpers ──────────────────────────────────────────────────────────────────

def normalize(slug):
    s = slug.lower()
    s = re.sub(r'[^a-z0-9]', '-', s)
    s = re.sub(r'-+', '-', s)
    return s.strip('-')

def partition_path(slug):
    s = normalize(slug)
    c1 = s[0] if len(s) > 0 else '_'
    c2 = s[1] if len(s) > 1 else '_'
    c3 = s[2] if len(s) > 2 else '_'
    return ARTICLES / c1 / c2 / c3 / f"{s}.md"

def read_article(slug):
    p = partition_path(slug)
    if not p.exists():
        return None
    return p.read_text(encoding='utf-8')

def write_article(slug, content):
    p = partition_path(slug)
    p.parent.mkdir(parents=True, exist_ok=True)
    p.write_text(content, encoding='utf-8')

def delete_article(slug):
    p = partition_path(slug)
    if p.exists():
        p.unlink()

# ── Build slug mapping ────────────────────────────────────────────────────────

index = json.loads(INDEX_PATH.read_text())
all_current_slugs = {e['slug'] for e in index}

# First pass: collect all clean targets to detect conflicts
clean_to_originals = {}
for e in index:
    slug = e['slug']
    m = HASH_RE.search(slug)
    if m:
        clean = slug[:m.start()]
        clean_to_originals.setdefault(clean, []).append(slug)

# Build final mapping: old_slug -> new_slug
slug_map = {}  # old -> new
for clean, originals in clean_to_originals.items():
    if len(originals) == 1:
        slug_map[originals[0]] = clean
    else:
        # Conflict: assign clean to first, clean-2 to second, etc.
        slug_map[originals[0]] = clean
        for i, orig in enumerate(originals[1:], start=2):
            slug_map[orig] = f"{clean}-{i}"

print(f"Total articles: {len(index)}")
print(f"Articles with hash suffixes: {len(slug_map)}")
print(f"Conflicts resolved: {sum(1 for clean, origs in clean_to_originals.items() if len(origs) > 1)}")

# ── Step 1: Rename files + update frontmatter ─────────────────────────────────

print("\n[Step 1] Renaming files and updating frontmatter...")
files_renamed = 0
files_not_found = []

for old_slug, new_slug in slug_map.items():
    content = read_article(old_slug)
    if content is None:
        files_not_found.append(old_slug)
        continue

    # Update slug in frontmatter (YAML block)
    # Handle both inline and block scalar formats
    content = re.sub(
        r'^(slug:\s*)([\'"]?)' + re.escape(old_slug) + r'\2(\s*$)',
        f'slug: {new_slug}',
        content,
        flags=re.MULTILINE
    )

    # Update canonicalPath if it points to old slug
    content = re.sub(
        r'^(canonicalPath:\s*[\'"]?)/blog/' + re.escape(old_slug) + r'([\'"]?\s*$)',
        f'canonicalPath: /blog/{new_slug}',
        content,
        flags=re.MULTILINE
    )

    # Write to new path first
    write_article(new_slug, content)

    # Delete old path (only if different)
    old_path = partition_path(old_slug)
    new_path = partition_path(new_slug)
    if old_path != new_path and old_path.exists():
        old_path.unlink()

    files_renamed += 1

print(f"  Renamed: {files_renamed}")
print(f"  Not found on disk: {len(files_not_found)}")
if files_not_found:
    for s in files_not_found[:5]:
        print(f"    - {s}")

# ── Step 2: Update all internal links across all articles ─────────────────────

print("\n[Step 2] Updating all internal links...")
links_updated = 0
articles_updated = 0

# Find ALL markdown files on disk
all_md_files = list(ARTICLES.rglob("*.md"))

for md_file in all_md_files:
    content = md_file.read_text(encoding='utf-8')
    original = content

    for old_slug, new_slug in slug_map.items():
        # HTML links: href="/blog/old-slug"
        content = content.replace(f'href="/blog/{old_slug}"', f'href="/blog/{new_slug}"')
        content = content.replace(f"href='/blog/{old_slug}'", f"href='/blog/{new_slug}'")
        # Markdown links: [text](/blog/old-slug)
        content = content.replace(f'](/blog/{old_slug})', f'](/blog/{new_slug})')
        content = content.replace(f'](/blog/{old_slug} ', f'](/blog/{new_slug} ')
        # Internal link titles (canonical references)
        content = content.replace(f'/blog/{old_slug}#', f'/blog/{new_slug}#')

    if content != original:
        md_file.write_text(content, encoding='utf-8')
        articles_updated += 1
        # Count links changed (approximate)
        for old_slug in slug_map:
            if old_slug in original and old_slug not in content:
                links_updated += 1

print(f"  Articles with updated links: {articles_updated}")
print(f"  Link replacements (approx): {links_updated}")

# ── Step 3: Update articles-index.json ────────────────────────────────────────

print("\n[Step 3] Updating articles-index.json...")
new_index = []
for entry in index:
    old_slug = entry['slug']
    if old_slug in slug_map:
        new_slug = slug_map[old_slug]
        entry = dict(entry)
        entry['slug'] = new_slug
        # Update canonicalPath
        old_cp = entry.get('canonicalPath', '')
        if old_cp == f'/blog/{old_slug}':
            entry['canonicalPath'] = f'/blog/{new_slug}'
        # Update filePath
        old_fp = entry.get('filePath', '')
        if old_slug in old_fp:
            s = normalize(new_slug)
            entry['filePath'] = f"/content/articles/{s[0]}/{s[1]}/{s[2]}/{s}.md"
    new_index.append(entry)

INDEX_PATH.write_text(json.dumps(new_index, indent=2, ensure_ascii=False))
print(f"  Index updated: {len(new_index)} entries")

# ── Step 4: Update vercel.json with 301 redirects ─────────────────────────────

print("\n[Step 4] Updating vercel.json with 301 redirects...")
vercel = json.loads(VERCEL_JSON.read_text())

# Remove any existing redirect entries for these slugs
existing_redirects = vercel.get('redirects', [])
new_redirects = []

# Only add redirects where old != new
for old_slug, new_slug in sorted(slug_map.items()):
    if old_slug != new_slug:
        new_redirects.append({
            "source": f"/blog/{old_slug}",
            "destination": f"/blog/{new_slug}",
            "permanent": True
        })

# Merge with existing (deduplicate by source)
existing_sources = {r['source'] for r in new_redirects}
for r in existing_redirects:
    if r.get('source') not in existing_sources:
        new_redirects.append(r)

vercel['redirects'] = new_redirects
# Ensure redirects come before rewrites
if 'rewrites' in vercel:
    rewrites = vercel.pop('rewrites')
    vercel['rewrites'] = rewrites

VERCEL_JSON.write_text(json.dumps(vercel, indent=2))
print(f"  301 redirects written: {len(new_redirects)}")

# ── Step 5: Update redirect-map.json ─────────────────────────────────────────

print("\n[Step 5] Updating redirect-map.json...")
rmap = {
    "version": "2.0",
    "generated": "2026-05-14",
    "description": "301 redirect map for AI hash slug normalization. Maps legacy hashed URLs to clean canonical URLs.",
    "redirects": {}
}
for old_slug, new_slug in sorted(slug_map.items()):
    rmap["redirects"][f"/blog/{old_slug}"] = f"/blog/{new_slug}"

RMAP_PATH.write_text(json.dumps(rmap, indent=2))
print(f"  redirect-map.json updated: {len(rmap['redirects'])} entries")

# ── Step 6: Update PILLAR_SLUGS in generate-sitemap.mjs ──────────────────────

print("\n[Step 6] Updating PILLAR_SLUGS in generate-sitemap.mjs...")
sitemap_script = GEN_SITEMAP.read_text()
for old_slug, new_slug in slug_map.items():
    sitemap_script = sitemap_script.replace(f'"{old_slug}"', f'"{new_slug}"')
    sitemap_script = sitemap_script.replace(f"'{old_slug}'", f"'{new_slug}'")
GEN_SITEMAP.write_text(sitemap_script)
print("  generate-sitemap.mjs updated")

# ── Step 7: Update cluster maps and SEO report files ─────────────────────────

print("\n[Step 7] Updating workspace markdown files with new slugs...")
workspace_md_files = [
    ROOT / "CLUSTER_MAP.md",
    ROOT / "CLUSTER_STATUS.md",
    ROOT / "LINKING_STATUS.md",
    ROOT / "FINAL_SEO_REPORT.md",
    ROOT / "CHANGELOG.md",
    ROOT / "INTERNAL_LINKING_REPORT.md",
    ROOT / "SEO_AUDIT_REPORT.md",
    ROOT / "SITEMAP_ANALYSIS.md",
]
for md_path in workspace_md_files:
    if not md_path.exists():
        continue
    content = md_path.read_text(encoding='utf-8')
    original = content
    for old_slug, new_slug in slug_map.items():
        content = content.replace(old_slug, new_slug)
    if content != original:
        md_path.write_text(content, encoding='utf-8')

print("  Workspace markdown files updated")

# ── Summary ───────────────────────────────────────────────────────────────────

print("\n" + "="*60)
print("NORMALIZATION COMPLETE")
print(f"  Slugs normalized:  {len(slug_map)}")
print(f"  Files renamed:     {files_renamed}")
print(f"  Files not found:   {len(files_not_found)}")
print(f"  Articles updated:  {articles_updated}")
print(f"  Redirects created: {len(new_redirects)}")
print("="*60)

# Write summary for reporting
summary = {
    "total_normalized": len(slug_map),
    "files_renamed": files_renamed,
    "files_not_found": len(files_not_found),
    "articles_with_updated_links": articles_updated,
    "redirects_created": len(new_redirects),
    "slug_map": slug_map,
    "not_found": files_not_found,
}
(ROOT / "scripts/normalization-summary.json").write_text(json.dumps(summary, indent=2))
print("\nSummary written to scripts/normalization-summary.json")
