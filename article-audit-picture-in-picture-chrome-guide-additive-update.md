# Additive update audit: Picture-in-Picture Chrome

## Scope and preservation rule

This is an additive update to the already published `picture-in-picture-chrome-guide`. The existing introduction, built-in workflow, official Google extension section, Document Picture-in-Picture explanation, general troubleshooting, privacy guidance, FAQ, checklist, and references remain in place. No existing correct section is removed. Only the frontmatter gains a matching FAQ data set for the site’s generated FAQPage schema, and wording is minimally clarified where a platform or flag could otherwise be overstated.

## Search intent

The primary intent remains `pip chrome`: a Chrome user wants to start Picture-in-Picture and fix it when it does not appear or closes. The additions extend the same intent rather than creating a second “best extensions” page: a jump menu, platform shortcut matrix, site-specific diagnosis, experimental Chrome Flags, screenshot briefs, and copy-ready JSON-LD.

## Competitive gaps used

A current competitor comparison focuses on extension feature breadth such as subtitles, AI translation, danmaku, and enhanced controls. It does not provide the same platform-neutral decision path from Chrome’s built-in control to the official Google extension, nor a careful distinction between standard video PiP and Document PiP. The update uses that gap by adding practical diagnosis, permission/DRM boundaries, and official Chrome sources without copying competitor recommendations, ratings, wording, or feature claims.

## Planned additions

The article will gain an anchor-linked contents block, five descriptive screenshot placeholders, a keyboard table for Windows, macOS, Linux, and ChromeOS, site-specific subsections for YouTube, Netflix/DRM streams, Twitch, and Zoom Web, an experimental Flags section for the two current Chrome Auto-PiP flags, a warning that video-conferencing Auto-PiP depends on eligible web-app support and user permission rather than a universal switch, and copy-ready HowTo and FAQPage JSON-LD code blocks.

## Technical decisions

The keyboard table will not invent a universal built-in Chrome PiP hotkey. It will show menu/media-control workflows for built-in PiP and the Google extension’s documented `Alt + P` on Windows/Linux/ChromeOS where available and `Option + P` on macOS, with a link to `chrome://extensions/shortcuts` for conflicts. The flags section will distinguish `auto-picture-in-picture-for-video-playback` from the newer browser-initiated flag and will identify both as experimental. The FAQ frontmatter will match visible FAQ questions so the site generator emits one valid FAQPage schema; the HowTo JSON-LD will remain a copy-ready code example because the current generator has no HowTo frontmatter support. No raw executable HowTo script will be placed in the page body, avoiding duplicate or misleading structured data.

## Acceptance criteria

The original article content remains present. All new factual claims use official Chrome, Chrome Web Store, or platform support references and cautious language. The final generated HTML stays below the project’s 30 KB article limit, contains one Article, one BreadcrumbList, and at most one generated FAQPage, and passes build, typecheck, performance, SEO, links, and diff checks. No Google ranking or indexing result will be claimed without Search Console data.
