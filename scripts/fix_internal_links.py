import os
import re

ARTICLES_DIR = 'public/content/articles'

REPLACEMENTS = {
    "/blog/ad-blocker-extension-to-chrome-2": "/blog/best-ad-blocker-extension-chrome-block-trackers-2026",
    "/blog/best-annotated-screenshot-chrome-5": "/blog/best-annotated-screenshot-chrome-extensions-2026",
    "/blog/chrome-popup-blocker-partial": "/blog/poper-blocker-review-best-popup-blocker-chrome-2026",
    "/blog/how-to-speed-up-chrome-partial": "/blog/how-to-fix-chrome-high-memory-usage-2026-complete-guide",
    "/blog/privacy-badger-chrome-partial": "/blog/best-chrome-privacy-extensions-2026-complete-guide",
    "/blog/unlock-a-clutter-free-browsing-experience-the-power-of-a-poper-blocker-popup-blocker": "/blog/poper-blocker-review-best-popup-blocker-chrome-2026",
    "/blog/unlock-the-power-of-visual-content-a-comprehensive-guide-to-chrome-screenshot-a": "/blog/chrome-screenshot-addons-guide-annotating-editing",
    "/blog/unlocking-the-power-of-chrome-capture-tools-2025-a-comprehensive-guide-tools-2025-a": "/blog/chrome-capture-tools-2025-troubleshooting-guide",
    "/blog/unlock-the-power-of-visual-content-a-compunlock-the-power-of-visual-content-a-comprehensive-guide-to-chrome-screenshot-a": "/blog/chrome-screenshot-addons-guide-annotating-editing",
    "/blog/unlocking-the-power-of-chrome-captureunlocking-the-power-of-chrome-capture-tools-2025-a-comprehensive-guide-tools-2025-a": "/blog/chrome-capture-tools-2025-troubleshooting-guide"
}

def walk_dir(directory):
    for root, dirs, files in os.walk(directory):
        for file in files:
            if file.endswith('.md'):
                yield os.path.join(root, file)

def fix_internal_links():
    print("Fixing internal links in Markdown files...")
    count = 0
    for file_path in walk_dir(ARTICLES_DIR):
        with open(file_path, 'r', encoding='utf-8') as f:
            content = f.read()

        original_content = content
        for old, new in REPLACEMENTS.items():
            content = content.replace(f'href="{old}"', f'href="{new}"')
            content = content.replace(f'href=\'{old}\'', f'href=\'{new}\'')
            content = content.replace(f'href={old}', f'href={new}') # unlikely but just in case

        if content != original_content:
            with open(file_path, 'w', encoding='utf-8') as f:
                f.write(content)
            count += 1
            # print(f"Fixed links in: {file_path}")

    print(f"Finished. Updated links in {count} files.")

if __name__ == "__main__":
    fix_internal_links()
