# Zoom Chrome Extension Guide — Inline Visual Update

## Scope

This update adds two meaningful, article-specific inline screenshots to the already published Zoom Chrome Extension guide. The existing hero image is unchanged. No article body claims, metadata, index, Sitemap, or publication status were changed.

## Search and editorial decision

The visuals support two high-friction actions already described in the article: installing Zoom Scheduler from the official Chrome Web Store and adding a Zoom meeting inside Google Calendar. They are placed immediately after the relevant instructions so readers can confirm the interface without interrupting the workflow.

The images are not generic stock art and are not reused across another article. The captions identify them as official Chrome Web Store media; they do not claim that ExtensionTo personally tested the interface.

## Asset inventory

| Asset | Format variants | Placement | Source |
|---|---|---|---|
| `zoom-scheduler-add-to-chrome-official` | WebP + AVIF | After installation steps | [Zoom Scheduler listing in the Chrome Web Store](https://chromewebstore.google.com/detail/zoom-chrome-extension/kgjfgplpablkjnlkjmjdecgdpfankdle?hl=en-US) |
| `zoom-scheduler-google-calendar-official` | WebP + AVIF | After Google Calendar scheduling steps | [Zoom Scheduler listing in the Chrome Web Store](https://chromewebstore.google.com/detail/zoom-chrome-extension/kgjfgplpablkjnlkjmjdecgdpfankdle?hl=en-US) |

The WebP dimensions are 893×768 and 1280×800 respectively. AVIF siblings are included for the project’s responsive image handling. The optimized assets are force-added during commit because the repository intentionally ignores generated `.webp` and `.avif` files by default.

## Validation record

- Inline Markdown references: 2, unique.
- Alt text: present and descriptive for both images.
- Captions: 2, each identifies the relevant official source or media context.
- Rendered HTML: both references became `<img>` elements in `dist/blog/zoom-chrome-extension-guide/index.html` with non-empty `alt` attributes.
- `npm run build`: passed; 755 English article pages prerendered.
- `npm run typecheck`: passed.
- `npm run test:performance`: passed.
- `npm run test:seo`: passed; 787 Sitemap URLs and 755 English articles.
- `npm run test:links`: passed; 8,039 links scanned, 0 redirect links, 6 documented exceptions.
- `git diff --check`: passed.
- Index and Sitemap files: no diff in this media branch.

## Release boundary

This branch is a content/media update only. It does not publish or request Google indexing. After review and merge, the normal deployment can be checked for HTTP 200 and the two image URLs; Google Search Console remains the authoritative source for any later indexing evidence.

## References

1. [Zoom Scheduler — Chrome Web Store](https://chromewebstore.google.com/detail/zoom-chrome-extension/kgjfgplpablkjnlkjmjdecgdpfankdle?hl=en-US)
2. [Zoom Support: Zoom Scheduler Overview](https://support.zoom.com/hc/en/article?id=zm_kb&sysparm_article=KB0060514)
