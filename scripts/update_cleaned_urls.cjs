const fs = require('fs');

const cleanedUrls = JSON.parse(fs.readFileSync('scripts/cleaned-urls.json', 'utf-8'));

const REPLACEMENTS = {
    "https://extensionto.com/blog/ad-blocker-extension-to-chrome-2": "https://extensionto.com/blog/best-ad-blocker-extension-chrome-block-trackers-2026",
    "https://extensionto.com/blog/best-annotated-screenshot-chrome-5": "https://extensionto.com/blog/best-annotated-screenshot-chrome-extensions-2026",
    "https://extensionto.com/blog/chrome-popup-blocker-partial": "https://extensionto.com/blog/poper-blocker-review-best-popup-blocker-chrome-2026",
    "https://extensionto.com/blog/how-to-speed-up-chrome-partial": "https://extensionto.com/blog/how-to-fix-chrome-high-memory-usage-2026-complete-guide",
    "https://extensionto.com/blog/privacy-badger-chrome-partial": "https://extensionto.com/blog/best-chrome-privacy-extensions-2026-complete-guide",
    "https://extensionto.com/blog/unlock-a-clutter-free-browsing-experience-the-power-of-a-poper-blocker-popup-blocker": "https://extensionto.com/blog/poper-blocker-review-best-popup-blocker-chrome-2026",
    "https://extensionto.com/blog/unlock-the-power-of-visual-content-a-comprehensive-guide-to-chrome-screenshot-a": "https://extensionto.com/blog/chrome-screenshot-addons-guide-annotating-editing",
    "https://extensionto.com/blog/unlocking-the-power-of-chrome-capture-tools-2025-a-comprehensive-guide-tools-2025-a": "https://extensionto.com/blog/chrome-capture-tools-2025-troubleshooting-guide"
};

const updatedUrls = cleanedUrls.map(url => {
    return REPLACEMENTS[url] || url;
});

// Deduplicate
const uniqueUrls = [...new Set(updatedUrls)];

fs.writeFileSync('scripts/cleaned-urls.json', JSON.stringify(uniqueUrls, null, 2));
console.log('Updated scripts/cleaned-urls.json with migrated slugs.');
